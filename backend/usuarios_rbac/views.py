import logging
from django.core.cache import cache
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Usuario, Rol
from .serializers import UsuarioSerializer, RolSerializer, LoginSerializer
from .permissions import PermisoUsuarios, obtener_ip
from cardex_auditoria.models import MovimientoArticulo, TipoMovimiento

# Archivo donde se anotan los avisos de seguridad.
registro_seguridad = logging.getLogger('auditoria_alpha')

NOMBRES_CARGOS = {
    'administracion': 'Administrador General',
    'soporte_ti': 'Soporte Técnico',
    'encargado_finanza': 'Encargado de Finanzas',
    'encargado_bodega': 'Encargado de Bodega',
    'supervisor_obra': 'Supervisor de Obra',
}

# Guarda en el historial cada vez que se agrega o modifica un trabajador.
def registrar_accion(usuario_autor, tipo_accion, detalle_motivo):
    if not usuario_autor or not usuario_autor.is_authenticated:
        return
    tipo_obj, _ = TipoMovimiento.objects.get_or_create(nombre=tipo_accion)
    MovimientoArticulo.objects.create(
        id_articulo=None,
        id_usuario=usuario_autor,
        id_tipo_movimiento=tipo_obj,
        id_obra=None,
        cantidad=1,
        motivo=detalle_motivo
    )

# Controla el inicio de sesión de los trabajadores.
class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        ip = obtener_ip(request)
        correo = request.data.get('correo_electronico', '').strip()
        password = request.data.get('password', '')
        llave_bloqueo = f"login_lock_{ip}"
        llave_intentos = f"login_fails_{ip}"

        # Revisa si el equipo está bloqueado temporalmente por intentos fallidos.
        if cache.get(llave_bloqueo):
            registro_seguridad.warning(f"ACCESO BLOQUEADO (429) | Correo: {correo} | IP: {ip}")
            return Response(
                {
                    "detail": "El acceso está bloqueado temporalmente por varios intentos fallidos. Por favor, espere 10 minutos para volver a intentar.",
                    "codigo_error": "cuenta_bloqueada"
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Verifica si ya llegó al límite de 5 intentos fallidos.
        intentos_previos = cache.get(llave_intentos, 0)
        if intentos_previos >= 5:
            cache.set(llave_bloqueo, True, timeout=600) # Bloquea por 10 minutos.
            cache.delete(llave_intentos)
            registro_seguridad.warning(f"BLOQUEO POR INTENTOS FALLIDOS (429) | Correo: {correo} | IP: {ip}")
            return Response(
                {
                    "detail": "Superó los 5 intentos permitidos. Por seguridad, el acceso desde este equipo se bloqueó por 10 minutos.",
                    "codigo_error": "cuenta_bloqueada"
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Comprueba que el trabajador haya escrito su correo y contraseña.
        if not correo or not password:
            return Response(
                {
                    "detail": "Por favor, escriba su correo electrónico y su contraseña para ingresar.",
                    "codigo_error": "campos_incompletos"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verifica que el correo exista, la cuenta esté activa y la contraseña coincida.
        usuario_obj = Usuario.objects.filter(correo_electronico__iexact=correo).first()
        if not usuario_obj or not usuario_obj.check_password(password) or not usuario_obj.is_active:
            nuevos_intentos = intentos_previos + 1
            cache.set(llave_intentos, nuevos_intentos, timeout=60)
            registro_seguridad.warning(f"INTENTO FALLIDO (401) | Intento {nuevos_intentos}/5 | Correo: {correo} | IP: {ip}")
            return Response(
                {
                    "detail": "El correo electrónico o la contraseña no son correctos. Por favor, revíselos e intente nuevamente.",
                    "codigo_error": "credenciales_invalidas"
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = self.get_serializer(data={
            'correo_electronico': usuario_obj.correo_electronico,
            'password': password
        })
        serializer.is_valid(raise_exception=True)

        # Si ingresó bien, se limpia el contador de intentos fallidos.
        cache.delete(llave_intentos)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)

# Permite ver, agregar, modificar y eliminar trabajadores.
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.select_related('id_rol').all().order_by('id_usuario')
    serializer_class = UsuarioSerializer
    permission_classes = [PermisoUsuarios]

    def perform_create(self, serializer):
        nuevo_usuario = serializer.save()
        cargo_legible = NOMBRES_CARGOS.get(nuevo_usuario.id_rol.nombre, nuevo_usuario.id_rol.nombre)
        detalle = (
            f"Nuevo trabajador registrado: {nuevo_usuario.nombre} "
            f"(RUT: {nuevo_usuario.rut}) con cargo {cargo_legible}"
        )
        registrar_accion(self.request.user, 'Registro de Usuario', detalle)

    def perform_update(self, serializer):
        instancia_previa = self.get_object()
        nombre_previo = instancia_previa.nombre
        rut_previo = instancia_previa.rut
        rol_previo = instancia_previa.id_rol.nombre
        correo_previo = instancia_previa.correo_electronico
        telefono_previo = instancia_previa.telefono
        activo_previo = instancia_previa.is_active

        usuario_actualizado = serializer.save()

        # Revisa qué datos se modificaron para dejarlo anotado en el historial.
        cambios = []
        if nombre_previo != usuario_actualizado.nombre:
            cambios.append(f"nombre ({nombre_previo} -> {usuario_actualizado.nombre})")
        if rut_previo != usuario_actualizado.rut:
            cambios.append(f"RUT ({rut_previo} -> {usuario_actualizado.rut})")
        if correo_previo != usuario_actualizado.correo_electronico:
            cambios.append("correo")
        if telefono_previo != usuario_actualizado.telefono:
            cambios.append("teléfono")
        if rol_previo != usuario_actualizado.id_rol.nombre:
            cargo_nuevo = NOMBRES_CARGOS.get(usuario_actualizado.id_rol.nombre, usuario_actualizado.id_rol.nombre)
            cambios.append(f"cargo a {cargo_nuevo}")
        if activo_previo != usuario_actualizado.is_active:
            estado_txt = 'Activo' if usuario_actualizado.is_active else "Inactivo"
            cambios.append(f"estado a {estado_txt}")
        if self.request.data.get('password'):
            cambios.append("contraseña actualizada")

        resumen_cambios = ", ".join(cambios) if cambios else "actualización de ficha"
        detalle = f"Datos modificados de {usuario_actualizado.nombre} ({usuario_actualizado.rut}): {resumen_cambios}"
        registrar_accion(self.request.user, 'Modificación de Usuario', detalle)

# Entrega la lista de cargos disponibles para el formulario de trabajadores.
class RolViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Rol.objects.all().order_by('id_rol')
    serializer_class = RolSerializer
    permission_classes = [PermisoUsuarios]
