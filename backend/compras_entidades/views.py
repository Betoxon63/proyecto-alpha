"""
Controladores y ViewSets para la administración comercial de FYAG SpA:
- Clientes Mandantes (Constructoras e Inmobiliarias).
- Proveedores (Distribuidores y Ferreterías).
- Facturas y Guías de Compra (Recepción multi-producto y actualización de stock en bodega).
"""

import os
import time
import base64
from datetime import date
from django.db import transaction
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.response import Response

from .models import Cliente, Proveedor, Factura, DetalleFactura
from .serializers import ClienteSerializer, ProveedorSerializer, FacturaSerializer
from usuarios_rbac.permissions import PermisoClientesProveedores, PermisoHistorial
from catalogo_inventario.models import Articulo
from cardex_auditoria.models import MovimientoArticulo, TipoMovimiento


def registrar_accion_comercial(usuario_autor, tipo_accion, detalle_motivo, articulo=None, cantidad=1):
    """
    Función utilitaria para auditar y registrar movimientos en el Cardex / Historial general
    cuando se realizan operaciones sobre clientes, proveedores o ingreso de mercadería.
    """
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


class ClienteViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la administración de fichas de clientes mandantes.
    Permite listar, crear, modificar y eliminar clientes con auditoría automática.
    """
    queryset = Cliente.objects.all().order_by('razon_social')
    serializer_class = ClienteSerializer
    permission_classes = [PermisoClientesProveedores]

    def perform_create(self, serializer):
        """Registra un nuevo cliente y genera el registro de auditoría correspondiente."""
        nuevo_cliente = serializer.save()
        detalle = f"Nuevo cliente registrado: {nuevo_cliente.razon_social} (RUT: {nuevo_cliente.rut})"
        registrar_accion_comercial(self.request.user, 'Registro de Cliente', detalle)

    def perform_update(self, serializer):
        """Actualiza los datos de un cliente y genera el registro de auditoría."""
        cliente_actualizado = serializer.save()
        detalle = f"Ficha de cliente actualizada: {cliente_actualizado.razon_social} (RUT: {cliente_actualizado.rut})"
        registrar_accion_comercial(self.request.user, 'Modificación de Cliente', detalle)


class ProveedorViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la administración de fichas de proveedores de materiales.
    Permite gestionar empresas emisoras de facturas y guías de despacho.
    """
    queryset = Proveedor.objects.all().order_by('razon_social')
    serializer_class = ProveedorSerializer
    permission_classes = [PermisoClientesProveedores]

    def perform_create(self, serializer):
        """Registra un nuevo proveedor emisor con su respectiva auditoría."""
        nuevo_proveedor = serializer.save()
        detalle = f"Nuevo proveedor registrado: {nuevo_proveedor.razon_social} (RUT: {nuevo_proveedor.rut})"
        registrar_accion_comercial(self.request.user, 'Registro de Proveedor', detalle)

    def perform_update(self, serializer):
        """Modifica los datos del proveedor y registra la auditoría."""
        proveedor_actualizado = serializer.save()
        detalle = f"Ficha de proveedor actualizada: {proveedor_actualizado.razon_social} (RUT: {proveedor_actualizado.rut})"
        registrar_accion_comercial(self.request.user, 'Modificación de Proveedor', detalle)


class FacturaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el registro y consulta de facturas de compra recibidas en bodega.
    Soporta operaciones multi-producto (varios materiales en una sola factura o guía).
    """
    queryset = Factura.objects.select_related('id_proveedor').prefetch_related('detalles__id_articulo').all().order_by('-fecha_ingreso', '-id_factura')
    serializer_class = FacturaSerializer
    permission_classes = [PermisoHistorial]
    http_method_names = ['get', 'post', 'head', 'options']

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Registra una nueva factura de compra con múltiples ítems en una sola transacción atómica:
        1. Valida el proveedor emisor y número de documento.
        2. Procesa la lista de materiales recibidos ('detalles').
        3. Para cada material:
           - Bloquea la fila con select_for_update() para evitar condiciones de carrera concurrentes.
           - Crea la relación DetalleFactura.
           - Incrementa el stock_disponible del material en bodega.
           - Actualiza el precio unitario si corresponde.
           - Genera el movimiento de entrada en el Cardex / Historial general.
        4. Si algún ítem falla, realiza rollback completo garantizando consistencia de datos.
        """
        datos = request.data
        id_proveedor = datos.get('id_proveedor')
        numero_documento = datos.get('numero_documento')
        total = int(datos.get('total', 0))
        observaciones = datos.get('observaciones', '')

        # Soporte híbrido: lista de materiales ('detalles') o ítem único (retrocompatibilidad)
        detalles_recibidos = datos.get('detalles')
        if not detalles_recibidos:
            id_articulo = datos.get('id_articulo')
            cantidad = int(datos.get('cantidad', 0))
            precio_unitario = int(datos.get('precio_unitario', 0))
            if id_articulo and cantidad > 0:
                detalles_recibidos = [{
                    'id_articulo': id_articulo,
                    'cantidad': cantidad,
                    'precio_unitario': precio_unitario
                }]

        if not id_proveedor or not numero_documento or not detalles_recibidos:
            return Response(
                {"detail": "Complete el proveedor, número de factura y al menos un material con cantidad mayor a cero."},
                status=status.HTTP_400_BAD_REQUEST
            )

        proveedor = Proveedor.objects.filter(pk=id_proveedor).first()
        if not proveedor:
            return Response({"detail": "El proveedor seleccionado no existe."}, status=status.HTTP_400_BAD_REQUEST)

        # Creación del encabezado de la Factura
        factura = Factura.objects.create(
            numero_documento=int(str(numero_documento).replace('FAC-', '').strip() or 0),
            fecha_ingreso=datos.get('fecha_ingreso') or date.today(),
            id_proveedor=proveedor,
            observaciones=observaciones,
            total=total
        )

        # Guardado físico del respaldo escaneado en el servidor si se adjuntó una imagen
        imagen_respaldo_data = datos.get('imagen_respaldo') or datos.get('imagen_b64')
        if imagen_respaldo_data:
            try:
                if "," in str(imagen_respaldo_data):
                    imagen_respaldo_data = str(imagen_respaldo_data).split(",")[1]
                img_bytes = base64.b64decode(imagen_respaldo_data)
                
                dir_respaldos = os.path.join(settings.MEDIA_ROOT, 'facturas_respaldos')
                os.makedirs(dir_respaldos, exist_ok=True)
                
                nombre_archivo = f"respaldo_fac_{factura.numero_documento}_{int(time.time())}.jpg"
                ruta_disco = os.path.join(dir_respaldos, nombre_archivo)
                with open(ruta_disco, 'wb') as f_img:
                    f_img.write(img_bytes)
                
                factura.imagen_respaldo = f"{settings.MEDIA_URL}facturas_respaldos/{nombre_archivo}"
                factura.save(update_fields=['imagen_respaldo'])
            except Exception as e_img:
                print(f"[Aviso] No fue posible persistir la imagen de respaldo en disco: {e_img}")

        # Procesamiento iterativo de cada material recibido
        for item in detalles_recibidos:
            art_id = item.get('id_articulo')
            cant = int(item.get('cantidad', 0))
            pu = int(item.get('precio_unitario', 0))

            if not art_id or cant <= 0:
                continue

            # Bloqueo a nivel de base de datos para actualización segura de inventario
            articulo = Articulo.objects.select_for_update().filter(pk=art_id).first()
            if not articulo:
                transaction.set_rollback(True)
                return Response({"detail": f"El material con ID {art_id} no existe en el catálogo."}, status=status.HTTP_400_BAD_REQUEST)

            # Registro del detalle asociado a la factura con porcentaje de descuento por línea
            desc = int(item.get('descuento_porcentaje', 0) or 0)
            DetalleFactura.objects.create(
                id_factura=factura,
                id_articulo=articulo,
                cantidad=cant,
                precio_unitario=pu,
                descuento_porcentaje=desc
            )

            # Aumento de stock disponible en bodega y actualización del precio de compra
            articulo.stock_disponible += cant
            if pu > 0:
                articulo.precio = pu
            articulo.save()

            # Registro en Cardex / Historial general de movimientos
            motivo_historial = (
                observaciones
                or f"Recepción Factura FAC-{factura.numero_documento} ({proveedor.razon_social}) - {articulo.nombre}"
            )
            registrar_accion_comercial(
                request.user,
                'Entrada',
                motivo_historial,
                articulo=articulo,
                cantidad=cant
            )

        serializer = self.get_serializer(factura)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
