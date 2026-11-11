import logging
from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Rol

audit_logger = logging.getLogger('auditoria_alpha')


def obtener_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded.split(',')[0].strip() if x_forwarded else request.META.get('REMOTE_ADDR')

def registrar_denegacion(request, modulo):
    usuario = getattr(request.user, 'correo_electronico', 'Anónimo')
    rol = getattr(getattr(request.user, 'id_rol', None), 'nombre', 'Sin rol')
    ip = obtener_ip(request)
    audit_logger.warning(
        f"Acceso denegado: Usuario={usuario}, Rol={rol}, IP={ip}, Módulo={modulo}, Método={request.method}"
    )

class EsAdministrador(BasePermission):
    # Control total (CRUD) para el rol administración.
    def has_permission(self, request, view):
        es_valido = bool(
            request.user
            and request.user.is_authenticated
            and request.user.id_rol.nombre == Rol.ADMIN
        )
        if not es_valido:
            registrar_denegacion(request, "Usuarios y Roles")
        return es_valido

class PermisoArticulos(BasePermission):
    # Control de acceso para el módulo de artículos.
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        rol = request.user.id_rol.nombre

        if rol == Rol.ADMIN:
            return True
        if rol == Rol.BODEGA and request.method in ('GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH'):
            return True
        if rol in (Rol.FINANZAS, Rol.SUPERVISOR) and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Catálogo de Artículos")
        return False

class PermisoClientesProveedores(BasePermission):
    # Control de acceso para el módulo de clientes y proveedores.
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        rol = request.user.id_rol.nombre

        if rol in (Rol.ADMIN, Rol.FINANZAS):
            return True
        if rol == Rol.BODEGA and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Clientes / Proveedores")
        return False