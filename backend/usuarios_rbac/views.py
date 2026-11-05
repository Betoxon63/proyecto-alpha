import logging
from django.core.cache import cache
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Usuario, Rol
from .serializers import UsuarioSerializer, RolSerializer, CustomTokenObtainPairSerializer
from .permissions import EsAdministrador, obtener_ip

# Logger dedicado a eventos de seguridad/auditoría.
audit_logger = logging.getLogger('auditoria_alpha')


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        ip = obtener_ip(request)
        correo = request.data.get('correo_electronico', '').strip()
        password = request.data.get('password', '')
        lock_key = f"login_lock_{ip}"   # Existe mientras la IP esté bloqueada.
        fails_key = f"login_fails_{ip}" # Contador de fallos.

        # Verificar si la IP se encuentra bloqueada (HTTP 429).
        if cache.get(lock_key):
            audit_logger.warning(f"LOGIN BLOQUEADO (429) | Usuario: {correo} | IP: {ip}")
            return Response(
                {
                    "detail": "Acceso bloqueado temporalmente por seguridad tras múltiples intentos fallidos. Intente nuevamente en 10 minutos.",
                    "codigo_error": "cuenta_bloqueada"
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Verificar si alcanzó el límite de 5 intentos fallidos (HTTP 429).
        intentos_previos = cache.get(fails_key, 0)
        if intentos_previos >= 5:
            cache.set(lock_key, True, timeout=600) # Bloqueo por 10 minutos.
            cache.delete(fails_key)
            audit_logger.warning(f"BLOQUEO POR FUERZA BRUTA (429) | Usuario: {correo} | IP: {ip}")
            return Response(
                {
                    "detail": "Se ha superado el límite de 5 intentos fallidos. Por seguridad, el acceso desde este dispositivo ha sido bloqueado por 10 minutos.",
                    "codigo_error": "cuenta_bloqueada"
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Validar que ambos campos hayan sido enviados (HTTP 400).
        if not correo or not password:
            return Response(
                {
                    "detail": "Por favor, ingrese su correo electrónico y contraseña para continuar.",
                    "codigo_error": "campos_incompletos"
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validación de credenciales.
        usuario_obj = Usuario.objects.filter(correo_electronico__iexact=correo).first()
        if not usuario_obj or not usuario_obj.check_password(password) or not usuario_obj.is_active:
            nuevos_intentos = intentos_previos + 1
            cache.set(fails_key, nuevos_intentos, timeout=60)
            audit_logger.warning(f"LOGIN FALLIDO (401) | Intento {nuevos_intentos}/5 | Correo: {correo} | IP: {ip}")
            return Response(
                {
                    "detail": "Credenciales inválidas. Verifique su correo electrónico y contraseña.",
                    "codigo_error": "credenciales_invalidas"
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        serializer = self.get_serializer(data={'correo_electronico': usuario_obj.correo_electronico, 'password': password})
        serializer.is_valid(raise_exception=True)

        # Login exitoso.
        cache.delete(fails_key) # Limpiar contador de fallos.
        return Response(serializer.validated_data, status=status.HTTP_200_OK)

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.select_related('id_rol').all().order_by('id_usuario')
    serializer_class = UsuarioSerializer
    permission_classes = [EsAdministrador]

class RolViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Rol.objects.all().order_by('id_rol')
    serializer_class = RolSerializer
    permission_classes = [EsAdministrador]
