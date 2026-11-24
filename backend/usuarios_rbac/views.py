import logging
from django.core.cache import cache
from django.db.models.deletion import ProtectedError
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Usuario, Rol
from .serializers import UsuarioSerializer, RolSerializer, LoginSerializer
from .permissions import PermisoUsuarios, obtener_ip
from cardex_auditoria.models import MovimientoArticulo, TipoMovimiento


# Registro donde se anotan los intentos fallidos de inicio de sesión y bloqueos por seguridad.
registro_seguridad = logging.getLogger('auditoria_alpha')

# Traduce los códigos internos de cada cargo a nombres claros para el historial.
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
        # Convierte los valores de forma segura para evitar errores si llegan vacíos o nulos.
        correo = str(request.data.get('correo_electronico') or '').strip()
        password = str(request.data.get('password') or '')
        llave_bloqueo = f"login_lock_{ip}"
        llave_intentos = f"login_fails_{ip}"

        # 1. Revisa si el equipo ya se encuentra bloqueado temporalmente.
        if cache.get(llave_bloqueo):
            registro_seguridad.warning(f"ACCESO BLOQUEADO (429) | Correo: {correo} | IP: {ip}")
            return Response(
                {
                    "detail": "El acceso está bloqueado temporalmente por varios intentos fallidos. Por favor, espere 10 minutos para volver a intentar.",
                    "codigo_error": "cuenta_bloqueada"
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # 2. Si el equipo ya acumuló 5 intentos fallidos, activa el bloqueo de 10 minutos.
        intentos_previos = cache.get(llave_intentos, 0)
        if intentos_previos >= 5:
            cache.set(llave_bloqueo, True, timeout=600)
            cache.delete(llave_intentos)
            registro_seguridad.warning(f"BLOQUEO POR INTENTOS FALLIDOS (429) | Correo: {correo} | IP: {ip}")
            return Response(
                {
                    "detail": "Superó los 5 intentos permitidos. Por seguridad, el acceso desde este equipo se bloqueó por 10 minutos.",
                    "codigo_error": "cuenta_bloqueada"
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # 3. Verifica que se hayan completado ambos campos antes de consultar la base de datos.
        if not correo or not password:
            return Response(
                {
                    "detail": "Por favor, escriba su correo electrónico y su contraseña para ingresar.",
                    "codigo_error": "campos_incompletos"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. Comprueba en conjunto que el correo exista, la cuenta esté activa y la clave coincida.
        usuario_obj = Usuario.objects.filter(correo_electronico__iexact=correo).first()
        if not usuario_obj or not usuario_obj.check_password(password) or not usuario_obj.is_active:
            nuevos_intentos = intentos_previos + 1
            cache.set(llave_intentos, nuevos_intentos, timeout=60)
            registro_seguridad.warning(
                f"INTENTO FALLIDO (401) | Intento {nuevos_intentos}/5 | Correo: {correo} | IP: {ip}"
            )
            return Response(
                {
                    "detail": "El correo electrónico o la contraseña no son correctos. Por favor, revíselos e intente nuevamente.",
                    "codigo_error": "credenciales_invalidas"
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        # 5. Si las credenciales son válidas, genera los tokens de sesión y limpia el contador de fallos.
        serializer = self.get_serializer(data={
            'correo_electronico': usuario_obj.correo_electronico,
            'password': password
        })
        serializer.is_valid(raise_exception=True)

        cache.delete(llave_intentos)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


# Permite consultar, crear, editar y eliminar cuentas de trabajadores, dejando registro en el historial.
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.select_related('id_rol').all().order_by('id_usuario')
    serializer_class = UsuarioSerializer
    permission_classes = [PermisoUsuarios]

    # Al crear un trabajador nuevo, anota su nombre, RUT y cargo en el historial general.
    def perform_create(self, serializer):
        nuevo_usuario = serializer.save()
        cargo_legible = NOMBRES_CARGOS.get(nuevo_usuario.id_rol.nombre, nuevo_usuario.id_rol.nombre)
        detalle = (
            f"Nuevo trabajador registrado: {nuevo_usuario.nombre} "
            f"(RUT: {nuevo_usuario.rut}) con cargo {cargo_legible}"
        )
        registrar_accion(self.request.user, 'Registro de Usuario', detalle)

    # Al modificar un trabajador, compara los datos anteriores con los nuevos para anotar qué cambió.
    def perform_update(self, serializer):
        instancia_previa = self.get_object()
        nombre_previo = instancia_previa.nombre
        rut_previo = instancia_previa.rut
        rol_previo = instancia_previa.id_rol.nombre
        correo_previo = instancia_previa.correo_electronico
        telefono_previo = instancia_previa.telefono
        activo_previo = instancia_previa.is_active

        usuario_actualizado = serializer.save()

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
        if str(self.request.data.get('password') or '').strip():
            cambios.append("contraseña actualizada")

        resumen_cambios = ", ".join(cambios) if cambios else "actualización de ficha"
        detalle = f"Datos modificados de {usuario_actualizado.nombre} ({usuario_actualizado.rut}): {resumen_cambios}"
        registrar_accion(self.request.user, 'Modificación de Usuario', detalle)

    # Controla la eliminación de un trabajador de forma segura.
    def destroy(self, request, *args, **kwargs):
        instancia = self.get_object()

        if instancia.pk == request.user.pk:
            return Response(
                {"detail": "No puede eliminar su propia cuenta mientras tiene la sesión abierta."},
                status=status.HTTP_400_BAD_REQUEST
            )

        nombre_borrado = instancia.nombre
        rut_borrado = instancia.rut
        cargo_borrado = NOMBRES_CARGOS.get(instancia.id_rol.nombre, instancia.id_rol.nombre)

        try:
            self.perform_destroy(instancia)
        except ProtectedError:
            return Response(
                {
                    "detail": (
                        "No se puede eliminar este trabajador porque ya tiene movimientos registrados "
                        "en el historial o está asignado a obras. En su lugar, edite su ficha y cambie su estado a Inactivo."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        detalle = f"Cuenta eliminada: {nombre_borrado} (RUT: {rut_borrado}) con cargo {cargo_borrado}"
        registrar_accion(request.user, 'Eliminación de Usuario', detalle)
        return Response(status=status.HTTP_204_NO_CONTENT)


# Entrega la lista de cargos disponibles para los formularios de personal.
class RolViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RolSerializer
    permission_classes = [PermisoUsuarios]

    def get_queryset(self):
        queryset = Rol.objects.all().order_by('id_rol')
        if self.request.user.id_rol.nombre == Rol.SOPORTE_TI:
            return queryset.exclude(nombre=Rol.ADMIN)
        return queryset
