"""
Serializadores para el módulo de Compras, Clientes, Proveedores y Facturas - Proyecto Alpha (FYAG SpA).

Implementa las siguientes especificaciones técnicas y de negocio:
- HU-07: Gestión de cartera de proveedores y validación de RUT chileno con algoritmo Módulo 11.
- HU-08 / CP-04: Recepción de facturas de compra con cálculo sucesivo de hasta 3 descuentos comerciales
  sobre el valor bruto, aplicación de IVA (19%) y actualización atómica del inventario en bodega.
"""

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from .models import Cliente, Proveedor, Factura, DetalleFactura
from catalogo_inventario.models import Articulo
from cardex_auditoria.models import TipoMovimiento, MovimientoArticulo
from usuarios_rbac.validators import validar_rut, validar_texto


class ClienteSerializer(serializers.ModelSerializer):
    """
    Serializador para Clientes. Valida unicidad y formato de RUT tanto para la empresa como para el representante.
    """
    class Meta:
        model = Cliente
        fields = '__all__'

    def validate_rut(self, value):
        """Valida formato y dígito verificador del RUT del cliente."""
        rut_normalizado = validar_rut(value)
        qs = Cliente.objects.filter(rut=rut_normalizado)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un cliente registrado con este RUT.")
        return rut_normalizado

    def validate_rut_representante(self, value):
        """Valida formato y dígito verificador del RUT del representante legal."""
        return validar_rut(value)

    def validate_razon_social(self, value):
        """Sanitiza el texto de la razón social."""
        return validar_texto(value)


class ProveedorSerializer(serializers.ModelSerializer):
    """
    Serializador para Proveedores comerciales de refrigeración y climatización.
    """
    class Meta:
        model = Proveedor
        fields = '__all__'

    def validate_rut(self, value):
        """Valida y normaliza el RUT del proveedor con módulo 11."""
        rut_normalizado = validar_rut(value)
        qs = Proveedor.objects.filter(rut=rut_normalizado)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un proveedor registrado con este RUT.")
        return rut_normalizado

    def validate_razon_social(self, value):
        """Sanitiza el texto de la razón social."""
        return validar_texto(value)


class DetalleFacturaSerializer(serializers.ModelSerializer):
    """
    Serializador para las líneas de detalle de artículos incluidos en una factura de compra.
    """
    articulo_nombre = serializers.CharField(source='id_articulo.nombre', read_only=True)

    class Meta:
        model = DetalleFactura
        fields = ['id_detalle_factura', 'id_articulo', 'articulo_nombre', 'cantidad', 'precio_unitario']

    def validate_cantidad(self, value):
        """Asegura que la cantidad comprada sea un entero positivo mayor a cero."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("La cantidad ingresada debe ser mayor a cero.")
        return value

    def validate_precio_unitario(self, value):
        """Asegura que el precio unitario pactado no sea negativo."""
        if value is not None and value < 0:
            raise serializers.ValidationError("El precio unitario no puede ser negativo.")
        return value


class FacturaSerializer(serializers.ModelSerializer):
    """
    Serializador para recepción de Facturas de Compra (HU-08 / CP-04).
    
    Cálculo de Descuentos Comerciales Sucesivos:
    - Recibe 3 porcentajes opcionales de descuento: d1, d2, d3.
    - Fórmula en cascada:
        Bruto = suma(cantidad * precio_unitario)
        Paso 1 = Bruto * (1 - d1/100)
        Paso 2 = Paso 1 * (1 - d2/100)
        Neto   = Paso 2 * (1 - d3/100)
        IVA    = round(Neto * 0.19)
        Total  = Neto + IVA
    
    Efectos Colaterales Atómicos:
    1. Registra la cabecera `Factura` y sus líneas en `DetalleFactura`.
    2. Incrementa el `stock_disponible` de cada artículo recepcionado.
    3. Registra una 'Entrada' en el Cardex inalterable con motivo referenciado (FAC-xxx).
    """
    proveedor_nombre = serializers.CharField(source='id_proveedor.razon_social', read_only=True)
    proveedor_rut = serializers.CharField(source='id_proveedor.rut', read_only=True)
    detalles = DetalleFacturaSerializer(many=True)
    fecha_ingreso = serializers.DateField(required=False, default=timezone.localdate)
    descuento_1 = serializers.FloatField(write_only=True, required=False, default=0, min_value=0, max_value=99)
    descuento_2 = serializers.FloatField(write_only=True, required=False, default=0, min_value=0, max_value=99)
    descuento_3 = serializers.FloatField(write_only=True, required=False, default=0, min_value=0, max_value=99)

    class Meta:
        model = Factura
        fields = [
            'id_factura', 'numero_documento', 'fecha_ingreso', 'id_proveedor',
            'proveedor_nombre', 'proveedor_rut', 'observaciones', 'total',
            'descuento_1', 'descuento_2', 'descuento_3', 'detalles'
        ]
        read_only_fields = ['total']

    def validate_numero_documento(self, value):
        """Valida que el folio tributario de la factura sea un entero positivo."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("El número de documento debe ser positivo.")
        return value

    def validate_observaciones(self, value):
        """Sanitiza las observaciones o glosas de la factura."""
        if value:
            return validar_texto(value)
        return value

    def validate_detalles(self, value):
        """Valida que la factura contenga al menos una línea de detalle."""
        if not value:
            raise serializers.ValidationError("Debe incluir al menos un artículo en el detalle de la factura.")
        return value

    def create(self, validated_data):
        """
        Crea la factura aplicando descuentos sucesivos, actualizando inventario y registrando Cardex.
        """
        detalles_data = validated_data.pop('detalles')
        d1 = validated_data.pop('descuento_1', 0)
        d2 = validated_data.pop('descuento_2', 0)
        d3 = validated_data.pop('descuento_3', 0)

        # Cálculo de descuentos comerciales sucesivos (HU-08 / CP-04)
        bruto = sum(item['cantidad'] * item['precio_unitario'] for item in detalles_data)
        paso1 = bruto * (1 - d1 / 100.0)
        paso2 = paso1 * (1 - d2 / 100.0)
        neto = round(paso2 * (1 - d3 / 100.0))
        iva = round(neto * 0.19)
        total = neto + iva

        request = self.context.get('request')
        usuario = request.user if request and request.user.is_authenticated else None

        with transaction.atomic():
            factura = Factura.objects.create(total=total, **validated_data)
            tipo_entrada, _ = TipoMovimiento.objects.get_or_create(nombre='Entrada')

            for item in detalles_data:
                articulo_ref = item['id_articulo']
                cantidad = item['cantidad']
                precio_unitario = item['precio_unitario']

                # Bloqueo pesimista para actualización de stock en bodega
                articulo = Articulo.objects.select_for_update().get(pk=articulo_ref.pk)
                DetalleFactura.objects.create(
                    id_articulo=articulo,
                    id_factura=factura,
                    cantidad=cantidad,
                    precio_unitario=precio_unitario,
                )

                # Incremento de stock físico disponible
                articulo.stock_disponible += cantidad
                articulo.save(update_fields=['stock_disponible'])

                # Registro en Cardex Append-Only
                if usuario:
                    MovimientoArticulo.objects.create(
                        id_articulo=articulo,
                        id_usuario=usuario,
                        id_tipo_movimiento=tipo_entrada,
                        id_obra=None,
                        cantidad=cantidad,
                        motivo=f"(FAC-{factura.numero_documento}) Recepción factura proveedor {factura.id_proveedor.razon_social}",
                    )

        return factura
