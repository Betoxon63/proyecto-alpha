<<<<<<< HEAD
from django.shortcuts import render

# Create your views here.
=======
import logging
from django.core.cache import cache
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .models import Usuario, Rol
from .serializers import UsuarioSerializer, RolSerializer, CustomTokenObtainPairSerializer
from .permissions import EsAdministrador, obtener_ip

audit_logger = logging.getLogger('auditoria_alpha')


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        ip = obtener_ip(request)
        correo = request.data.get('correo_electronico', 'desconocido')
        lock_key = f"login_lock_{ip}"
        fails_key = f"login_fails_{ip}"

        # Verificar si la IP ya se encuentra bloqueada.
        if cache.get(lock_key):
            audit_logger.warning(f"LOGIN BLOQUEADO (429) | Usuario: {correo} | IP: {ip}")
            return Response(
                {"detail": "Demasiados intentos fallidos. Acceso bloqueado por 10 minutos."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        intentos_previos = cache.get(fails_key, 0)
        if intentos_previos >= 5:
            cache.set(lock_key, True, timeout=600) # Bloqueo por 10 minutos.
            cache.delete(fails_key)
            audit_logger.warning(f"BLOQUEO FUERZA BRUTA (429) | Usuario: {correo} | IP: {ip}")
            return Response(
                {"detail": "Límite de 5 intentos superado. Cuenta bloqueada por 10 minutos."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            nuevos_intentos = intentos_previos + 1
            cache.set(fails_key, nuevos_intentos, timeout=60)
            audit_logger.warning(f"LOGIN FALLIDO (401) | Intento {nuevos_intentos}/5 | Usuario: {correo} | IP: {ip}")
            return Response(
                {"detail": "Credenciales inválidas."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Login exitoso.
        cache.delete(fails_key)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.select_related('id_rol').all().order_by('id_usuario')
    serializer_class = UsuarioSerializer
    permission_classes = [EsAdministrador]

class RolViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Rol.objects.all().order_by('id_rol')
    serializer_class = RolSerializer
    permission_classes = [EsAdministrador]
>>>>>>> c655e6916b0cda5c9573a4e770885e7deb67bb33
