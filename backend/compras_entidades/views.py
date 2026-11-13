"""
Vistas y Controladores REST para el módulo de Compras, Proveedores, Clientes y Facturas - Proyecto Alpha (FYAG SpA).

Endpoints disponibles:
- /api/clientes/    : CRUD de clientes comerciales.
- /api/proveedores/ : CRUD de proveedores comerciales.
- /api/facturas/    : Consulta y recepción de facturas de compra con cálculo de descuentos y carga a Cardex.
"""

from rest_framework import viewsets
from .models import Cliente, Proveedor, Factura
from .serializers import ClienteSerializer, ProveedorSerializer, FacturaSerializer
from usuarios_rbac.permissions import PermisoClientesProveedores, PermisoFacturas


class ClienteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la administración de clientes y empresas contratantes.
    
    Protegido por `PermisoClientesProveedores` (RBAC).
    """
    queryset = Cliente.objects.all().order_by('razon_social')
    serializer_class = ClienteSerializer
    permission_classes = [PermisoClientesProveedores]


class ProveedorViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la gestión de proveedores de insumos, materiales y repuestos.
    
    Protegido por `PermisoClientesProveedores` (RBAC).
    """
    queryset = Proveedor.objects.all().order_by('razon_social')
    serializer_class = ProveedorSerializer
    permission_classes = [PermisoClientesProveedores]


class FacturaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el registro y consulta de facturas de compra (HU-08 / CP-04).
    
    Restricciones arquitectónicas:
    - Métodos permitidos: GET, POST, HEAD, OPTIONS (sin modificación directa ni borrado arbitrario).
    - Optimización ORM: Prefetch de proveedores y detalles con sus respectivos artículos.
    """
    queryset = Factura.objects.select_related('id_proveedor').prefetch_related(
        'detalles__id_articulo'
    ).all().order_by('-fecha_ingreso', '-id_factura')
    serializer_class = FacturaSerializer
    permission_classes = [PermisoFacturas]
    http_method_names = ['get', 'post', 'head', 'options']
