"""
Módulo de Permisos y Control de Acceso Basado en Roles (RBAC) - Proyecto Alpha (FYAG SpA).

Define las políticas de seguridad y autorización para los módulos del sistema:
- Administración y Usuarios
- Catálogo e Inventario de Artículos (HU-01, HU-02, HU-03)
- Clientes y Proveedores
- Obras y Despachos a Terreno (HU-05, HU-09, HU-10)
- Facturas de Compra y Recepción con Descuentos (HU-08 / CP-04)
- Auditoría Cardex Inalterable Append-Only (HU-11)

Cada denegación de acceso es registrada mediante el logger de seguridad 'auditoria_alpha'
incluyendo IP de origen, usuario, rol y endpoint solicitado.
"""

import logging
from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Rol

audit_logger = logging.getLogger('auditoria_alpha')


def obtener_ip(request):
    """
    Extrae la dirección IP remota del cliente a partir de los encabezados HTTP.
    
    Soporta proxys inversos evaluando 'HTTP_X_FORWARDED_FOR' antes de 'REMOTE_ADDR'.
    """
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded.split(',')[0].strip() if x_forwarded else request.META.get('REMOTE_ADDR')


def registrar_denegacion(request, modulo):
    """
    Registra un intento de acceso no autorizado en la bitácora de auditoría de seguridad.
    
    Args:
        request: Objeto HttpRequest de Django REST Framework.
        modulo (str): Nombre descriptivo del módulo o recurso protegido.
    """
    usuario = getattr(request.user, 'correo_electronico', 'Anónimo')
    rol = getattr(getattr(request.user, 'id_rol', None), 'nombre', 'Sin rol')
    ip = obtener_ip(request)
    audit_logger.warning(
        f"Acceso denegado: Usuario={usuario}, Rol={rol}, IP={ip}, Módulo={modulo}, Método={request.method}"
    )


class EsAdministrador(BasePermission):
    """
    Permiso restrictivo para el rol Administración (ADMIN).
    
    Otorga privilegios completos de lectura, creación, modificación y eliminación
    únicamente a usuarios autenticados con rol de Administración.
    """
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
    """
    Matriz de permisos para el Catálogo de Insumos y Repuestos (HU-01, HU-02, HU-03).
    
    - ADMIN: Acceso total (CRUD).
    - BODEGA: Lectura, creación y actualización (sin eliminación directa).
    - FINANZAS / SUPERVISOR: Solo lectura (GET, HEAD, OPTIONS).
    """
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
    """
    Matriz de permisos para entidades externas (Clientes y Proveedores).
    
    - ADMIN / FINANZAS: Acceso total para gestión comercial.
    - BODEGA: Solo lectura para asociar procedencia y destinos en guías/facturas.
    """
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


class PermisoObrasDespachos(BasePermission):
    """
    Matriz de permisos para Proyectos, Faenas y Despachos a Terreno (HU-05, HU-09, HU-10).
    
    - ADMIN: Acceso total.
    - BODEGA: Emisión de despachos, creación de faenas y actualización de estados.
    - SUPERVISOR / FINANZAS: Solo lectura para monitoreo de materiales imputados.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        rol = request.user.id_rol.nombre

        if rol == Rol.ADMIN:
            return True
        if rol == Rol.BODEGA and request.method in ('GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH'):
            return True
        if rol in (Rol.SUPERVISOR, Rol.FINANZAS) and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Obras y Despachos")
        return False


class PermisoFacturas(BasePermission):
    """
    Matriz de permisos para Facturas de Compra (HU-08 / CP-04).
    
    - ADMIN / FINANZAS: Acceso total para recepción, revisión y costeo contable.
    - BODEGA: Registro y lectura de recepción de facturas e insumos asociados.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        rol = request.user.id_rol.nombre

        if rol in (Rol.ADMIN, Rol.FINANZAS):
            return True
        if rol == Rol.BODEGA and request.method in ('GET', 'HEAD', 'OPTIONS', 'POST'):
            return True

        registrar_denegacion(request, "Facturas de Compra")
        return False


class PermisoCardex(BasePermission):
    """
    Matriz de permisos para el Cardex Inalterable Append-Only (HU-11).
    
    - ADMIN / BODEGA: Consulta y creación de nuevos movimientos de inventario (GET, POST).
    - FINANZAS: Solo lectura para auditoría y valorización contable (GET).
    - SUPERVISOR: Acceso denegado (403 Forbidden).
    Nota: Las operaciones de modificación (PUT/PATCH) o eliminación (DELETE) están
    bloqueadas por diseño a nivel de ViewSet para garantizar inalterabilidad.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        rol = request.user.id_rol.nombre

        if rol in (Rol.ADMIN, Rol.BODEGA):
            return True
        if rol == Rol.FINANZAS and request.method in SAFE_METHODS:
            return True

        registrar_denegacion(request, "Auditoría de Cardex")
        return False
