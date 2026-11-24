import logging
from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Rol

# Registro de auditoría donde se anotan los intentos de acceso no autorizados.
registro_seguridad = logging.getLogger('auditoria_alpha')


# Obtiene la dirección IP desde donde se conecta el computador o la tablet.
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


# Define quién puede crear o modificar cuentas de trabajadores.
class PermisoUsuarios(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        rol = request.user.id_rol.nombre

        if rol == Rol.ADMIN:
            return True

        # Soporte Técnico puede listar, crear y editar, pero se bloquea la eliminación directa.
        if rol == Rol.SOPORTE_TI and request.method != 'DELETE':
            return True

        registrar_denegacion(request, "Personal y Cuentas")
        return False

    # Validación sobre la cuenta que se intenta modificar.
    def has_object_permission(self, request, view, obj):
        rol = request.user.id_rol.nombre

        if rol == Rol.ADMIN:
            return True

        if rol == Rol.SOPORTE_TI:
            if request.method in SAFE_METHODS:
                return True
            # Impide que Soporte Técnico modifique o desactive cuentas de Administración.
            if obj.id_rol.nombre == Rol.ADMIN:
                registrar_denegacion(request, "Personal y Cuentas (Cuenta de Administración)")
                return False
            return request.method != 'DELETE'

        registrar_denegacion(request, "Personal y Cuentas")
        return False


# Define quién puede ver o modificar el catálogo de materiales de bodega.
class PermisoArticulos(BasePermission):
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

        registrar_denegacion(request, "Catálogo de Bodega")
        return False


# Define quién puede consultar y anotar movimientos en el Historial General.
class PermisoHistorial(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        rol = request.user.id_rol.nombre

        if rol in (Rol.ADMIN, Rol.BODEGA) and request.method in ('GET', 'HEAD', 'OPTIONS', 'POST'):
            return True
        if rol in (Rol.FINANZAS, Rol.SUPERVISOR, Rol.SOPORTE_TI) and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Historial de Movimientos")
        return False


# Define quién puede manejar las fichas de Clientes.
class PermisoClientes(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        rol = request.user.id_rol.nombre

        if rol in (Rol.ADMIN, Rol.FINANZAS):
            return True
        if rol in (Rol.BODEGA, Rol.SUPERVISOR) and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Clientes")
        return False


# Define quién puede manejar las fichas de Proveedores.
class PermisoProveedores(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        rol = request.user.id_rol.nombre

        if rol in (Rol.ADMIN, Rol.FINANZAS):
            return True
        if rol == Rol.BODEGA and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Proveedores")
        return False


# Controla el acceso al módulo de Facturas de Compra.
class PermisoFacturas(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        rol = request.user.id_rol.nombre

        if rol == Rol.ADMIN:
            return True
        if rol == Rol.BODEGA and request.method in ('GET', 'HEAD', 'OPTIONS', 'POST'):
            return True
        if rol == Rol.FINANZAS and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Facturas de Compra")
        return False


# Controla el acceso al módulo de Gestión de Obras.
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


# Controla la lista paramétrica de Tipos de Servicio de las obras.
class PermisoTiposServicio(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        rol = request.user.id_rol.nombre

        if rol == Rol.ADMIN:
            return True
        if rol in (Rol.SUPERVISOR, Rol.BODEGA, Rol.FINANZAS) and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Tipos de Servicio")
        return False


# Alias temporal para mantener compatibilidad.
PermisoClientesProveedores = PermisoClientes
