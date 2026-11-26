import logging
from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Rol

# Archivo donde se registran los intentos de entrada sin permiso.
registro_seguridad = logging.getLogger('auditoria_alpha')


# Obtiene la dirección IP del equipo donde se conecta el trabajador.
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


# Define quién puede ver, crear, editar o eliminar cuentas de trabajadores.
class PermisoUsuarios(BasePermission):
    # Revisa el permiso general según el cargo del trabajador.
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        rol = request.user.id_rol.nombre

        if rol == Rol.ADMIN:
            return True

        # Soporte Técnico puede ver, crear y editar cuentas, pero nunca borrarlas.
        if rol == Rol.SOPORTE_TI and request.method != 'DELETE':
            return True

        registrar_denegacion(request, "Personal y Cuentas")
        return False

    # Revisa si se puede modificar la cuenta seleccionada.
    def has_object_permission(self, request, view, obj):
        rol = request.user.id_rol.nombre

        if rol == Rol.ADMIN:
            return True

        if rol == Rol.SOPORTE_TI:
            if request.method in SAFE_METHODS:
                return True
            # Impide que Soporte Técnico edite o desactive cuentas de Administración.
            if obj.id_rol.nombre == Rol.ADMIN:
                registrar_denegacion(request, "Personal y Cuentas (Cuenta de Administración)")
                return False
            return request.method != 'DELETE'

        registrar_denegacion(request, "Personal y Cuentas")
        return False


# Controla el acceso al catálogo de materiales, categorías y unidades de bodega.
class PermisoArticulos(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        rol = request.user.id_rol.nombre

        if rol == Rol.ADMIN:
            return True
        # Bodega puede ver, crear y editar fichas, pero no borrar materiales.
        if rol == Rol.BODEGA and request.method in ('GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH'):
            return True
        # Finanzas y Supervisor solo pueden consultar el catálogo.
        if rol in (Rol.FINANZAS, Rol.SUPERVISOR) and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Catálogo de Bodega")
        return False


# Controla quién puede ver y registrar movimientos en el historial.
class PermisoHistorial(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        rol = request.user.id_rol.nombre

        # Administración y Bodega pueden consultar y anotar movimientos nuevos.
        if rol in (Rol.ADMIN, Rol.BODEGA) and request.method in ('GET', 'HEAD', 'OPTIONS', 'POST'):
            return True
        # Finanzas audita el historial y Supervisor consulta solo los despachos de sus obras.
        if rol in (Rol.FINANZAS, Rol.SUPERVISOR) and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Historial de Movimientos")
        return False


# Controla quién puede manejar las fichas de Clientes.
class PermisoClientes(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        rol = request.user.id_rol.nombre

        # Solo Administración puede eliminar clientes.
        if rol == Rol.ADMIN:
            return True
        # Finanzas puede ver, registrar y editar clientes, pero no borrarlos.
        if rol == Rol.FINANZAS and request.method in ('GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH'):
            return True
        # Bodega y Supervisor solo pueden leer clientes para verlos en las obras.
        if rol in (Rol.BODEGA, Rol.SUPERVISOR) and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Clientes")
        return False


# Controla quién puede manejar las fichas de Proveedores.
class PermisoProveedores(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        rol = request.user.id_rol.nombre

        # Solo Administración puede eliminar proveedores.
        if rol == Rol.ADMIN:
            return True
        # Finanzas puede ver, registrar y editar proveedores, pero no borrarlos.
        if rol == Rol.FINANZAS and request.method in ('GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH'):
            return True
        # Bodega solo puede consultarlos cuando registra una devolución a proveedor.
        if rol == Rol.BODEGA and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Proveedores")
        return False


# Controla el acceso a las facturas de compra.
class PermisoFacturas(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        rol = request.user.id_rol.nombre

        # Solo Administración y Finanzas pueden ver y registrar facturas.
        if rol in (Rol.ADMIN, Rol.FINANZAS) and request.method in ('GET', 'HEAD', 'OPTIONS', 'POST'):
            return True

        registrar_denegacion(request, "Facturas de Compra")
        return False


# Controla el acceso a las solicitudes de Reposición entre Bodega y Finanzas.
class PermisoSolicitudes(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        rol = request.user.id_rol.nombre

        # Administración, Bodega y Finanzas participan en el ciclo de solicitudes.
        if rol in (Rol.ADMIN, Rol.BODEGA, Rol.FINANZAS) and request.method in ('GET', 'HEAD', 'OPTIONS', 'POST'):
            return True

        registrar_denegacion(request, "Solicitudes de Reposición")
        return False


# Controla quién puede crear, ver, editar o eliminar obras.
class PermisoObras(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        rol = request.user.id_rol.nombre

        # Solo Administración puede eliminar obras.
        if rol == Rol.ADMIN:
            return True
        # El Supervisor puede ver, crear y editar sus propias obras, pero no borrarlas.
        if rol == Rol.SUPERVISOR and request.method in ('GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH'):
            return True
        # Bodega y Finanzas solo pueden consultar las obras registradas.
        if rol in (Rol.BODEGA, Rol.FINANZAS) and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Gestión de Obras")
        return False


# Controla la lista de tipos de servicio disponibles para clasificar obras.
class PermisoTiposServicio(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        rol = request.user.id_rol.nombre

        # Solo Administración puede agregar, cambiar o borrar tipos de servicio.
        if rol == Rol.ADMIN:
            return True
        if rol in (Rol.SUPERVISOR, Rol.BODEGA, Rol.FINANZAS) and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Tipos de Servicio")
        return False


# Alias temporal para mantener compatibilidad.
PermisoClientesProveedores = PermisoClientes
