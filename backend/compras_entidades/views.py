from datetime import date
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.response import Response

from .models import Cliente, Proveedor, Factura, DetalleFactura
from .serializers import ClienteSerializer, ProveedorSerializer, FacturaSerializer
from usuarios_rbac.permissions import PermisoClientesProveedores, PermisoHistorial
from catalogo_inventario.models import Articulo
from cardex_auditoria.models import MovimientoArticulo, TipoMovimiento

# Guarda en el historial general las acciones realizadas en el módulo comercial.
def registrar_accion_comercial(usuario_autor, tipo_accion, detalle_motivo, articulo=None, cantidad=1):
    if not usuario_autor or not usuario_autor.is_authenticated:
        return
    tipo_obj, _ = TipoMovimiento.objects.get_or_create(nombre=tipo_accion)
    MovimientoArticulo.objects.create(
        id_articulo=articulo,
        id_usuario=usuario_autor,
        id_tipo_movimiento=tipo_obj,
        id_obra=None,
        cantidad=cantidad,
        motivo=detalle_motivo
    )

# Administración de fichas de clientes mandantes.
class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all().order_by('razon_social')
    serializer_class = ClienteSerializer
    permission_classes = [PermisoClientesProveedores]

    def perform_create(self, serializer):
        nuevo_cliente = serializer.save()
        detalle = f"Nuevo cliente registrado: {nuevo_cliente.razon_social} (RUT: {nuevo_cliente.rut})"
        registrar_accion_comercial(self.request.user, 'Registro de Cliente', detalle)

    def perform_update(self, serializer):
        cliente_actualizado = serializer.save()
        detalle = f"Ficha de cliente actualizada: {cliente_actualizado.razon_social} (RUT: {cliente_actualizado.rut})"
        registrar_accion_comercial(self.request.user, 'Modificación de Cliente', detalle)

# Administración de fichas de proveedores.
class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all().order_by('razon_social')
    serializer_class = ProveedorSerializer
    permission_classes = [PermisoClientesProveedores]

    def perform_create(self, serializer):
        nuevo_proveedor = serializer.save()
        detalle = f"Nuevo proveedor registrado: {nuevo_proveedor.razon_social} (RUT: {nuevo_proveedor.rut})"
        registrar_accion_comercial(self.request.user, 'Registro de Proveedor', detalle)

    def perform_update(self, serializer):
        proveedor_actualizado = serializer.save()
        detalle = f"Ficha de proveedor actualizada: {proveedor_actualizado.razon_social} (RUT: {proveedor_actualizado.rut})"
        registrar_accion_comercial(self.request.user, 'Modificación de Proveedor', detalle)

# Registro y consulta de facturas de compra recibidas en bodega.
class FacturaViewSet(viewsets.ModelViewSet):
    queryset = Factura.objects.select_related('id_proveedor').prefetch_related('detalles__id_articulo').all().order_by('-fecha_ingreso', '-id_factura')
    serializer_class = FacturaSerializer
    permission_classes = [PermisoHistorial]
    http_method_names = ['get', 'post', 'head', 'options']

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        datos = request.data
        id_proveedor = datos.get('id_proveedor')
        numero_documento = datos.get('numero_documento')
        id_articulo = datos.get('id_articulo')
        cantidad = int(datos.get('cantidad', 0))
        precio_unitario = int(datos.get('precio_unitario', 0))
        total = int(datos.get('total', 0))
        observaciones = datos.get('observaciones', '')

        if not id_proveedor or not numero_documento or not id_articulo or cantidad <= 0:
            return Response(
                {"detail": "Complete el proveedor, número de factura, material y una cantidad mayor a cero."},
                status=status.HTTP_400_BAD_REQUEST
            )

        proveedor = Proveedor.objects.filter(pk=id_proveedor).first()
        if not proveedor:
            return Response({"detail": "El proveedor seleccionado no existe."}, status=status.HTTP_400_BAD_REQUEST)

        # Bloquea temporalmente la fila del artículo mientras se suma el stock.
        articulo = Articulo.objects.select_for_update().filter(pk=id_articulo).first()
        if not articulo:
            return Response({"detail": "El material seleccionado no existe en el catálogo."}, status=status.HTTP_400_BAD_REQUEST)

        factura = Factura.objects.create(
            numero_documento=int(str(numero_documento).replace('FAC-', '').strip() or 0),
            fecha_ingreso=datos.get('fecha_ingreso') or date.today(),
            id_proveedor=proveedor,
            observaciones=observaciones,
            total=total
        )

        DetalleFactura.objects.create(
            id_factura=factura,
            id_articulo=articulo,
            cantidad=cantidad,
            precio_unitario=precio_unitario
        )

        # Suma las unidades recibidas al stock disponible del material.
        articulo.stock_disponible += cantidad
        if precio_unitario > 0:
            articulo.precio = precio_unitario
        articulo.save()

        motivo_historial = (
            observaciones
            or f"Recepción Factura FAC-{factura.numero_documento} ({proveedor.razon_social})"
        )
        registrar_accion_comercial(
            request.user,
            'Entrada',
            motivo_historial,
            articulo=articulo,
            cantidad=cantidad
        )

        serializer = self.get_serializer(factura)
        return Response(serializer.data, status=status.HTTP_201_CREATED)