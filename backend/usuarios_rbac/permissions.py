import logging
from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Rol

# Archivo donde se anotan los intentos de acceso sin permiso.
registro_seguridad = logging.getLogger('auditoria_alpha')

# Obtiene la dirección desde donde se conecta el equipo o tablet.
def obtener_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded.split(',')[0].strip() if x_forwarded else request.META.get('REMOTE_ADDR')

# Anota en el registro de seguridad cuando alguien intenta entrar a una sección sin permiso.
def registrar_denegacion(request, modulo):
    usuario = getattr(request.user, 'correo_electronico', 'Anónimo')
    rol = getattr(getattr(request.user, 'id_rol', None), 'nombre', 'Sin cargo')
    ip = obtener_ip(request)
    registro_seguridad.warning(
        f"Acceso rechazado: Trabajador={usuario}, Cargo={rol}, IP={ip}, Sección={modulo}, Acción={request.method}"
    )

# Define quién puede crear o modificar cuentas de trabajadores (Administración y Soporte Técnico).
class PermisoUsuarios(BasePermission):
    def has_permission(self, request, view):
        es_valido = bool(
            request.user
            and request.user.is_authenticated
            and request.user.id_rol.nombre in (Rol.ADMIN, Rol.SOPORTE_TI)
        )
        if not es_valido:
            registrar_denegacion(request, "Personal y Cuentas")
        return es_valido

# Define quién puede ver o modificar el catálogo de materiales de bodega.
class PermisoArticulos(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        rol = request.user.id_rol.nombre

        if rol == Rol.ADMIN:
            return True
        if rol in (Rol.BODEGA, Rol.FINANZAS) and request.method in ('GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH'):
            return True
        if rol in (Rol.SUPERVISOR, Rol.SOPORTE_TI) and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Catálogo de Bodega")
        return False

# Define quién puede consultar y anotar movimientos en el Historial General.
class PermisoHistorial(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        rol = request.user.id_rol.nombre

        # Administración, Bodega y Finanzas pueden ver y registrar movimientos.
        if rol in (Rol.ADMIN, Rol.BODEGA, Rol.FINANZAS) and request.method in ('GET', 'HEAD', 'OPTIONS', 'POST'):
            return True
        # Supervisor de Obra y Soporte Técnico solo pueden revisar el historial.
        if rol in (Rol.SUPERVISOR, Rol.SOPORTE_TI) and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Historial de Movimientos")
        return False

# Define quién puede manejar las fichas de Clientes y Proveedores.
class PermisoClientesProveedores(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        rol = request.user.id_rol.nombre

        if rol in (Rol.ADMIN, Rol.FINANZAS):
            return True
        if rol in (Rol.BODEGA, Rol.SUPERVISOR) and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Clientes y Proveedores")
        return False

# Define quién puede crear obras, asignar técnicos y cambiar sus estados.
class PermisoObras(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        rol = request.user.id_rol.nombre

        if rol in (Rol.ADMIN, Rol.SUPERVISOR):
            return True
        if rol in (Rol.BODEGA, Rol.FINANZAS) and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Gestión de Obras")
        return False
