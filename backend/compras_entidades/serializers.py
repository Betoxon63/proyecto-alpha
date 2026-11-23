from rest_framework import serializers
from .models import Cliente, Proveedor, Factura, DetalleFactura
from usuarios_rbac.validators import validar_rut, validar_texto

# Revisa y valida los datos de las empresas clientes.
class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'

    def validate_rut(self, value):
        rut_normalizado = validar_rut(value)
        qs = Cliente.objects.filter(rut=rut_normalizado)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un cliente registrado con este RUT.")
        return rut_normalizado

    def validate_rut_representante(self, value):
        return validar_rut(value)

    def validate_razon_social(self, value):
        return validar_texto(value)

    def validate_giro_comercial(self, value):
        return validar_texto(value)

    def validate_direccion(self, value):
        return validar_texto(value)

    def validate_comuna(self, value):
        return validar_texto(value)

    def validate_ciudad(self, value):
        return validar_texto(value)

    def validate_nombre_representante(self, value):
        return validar_texto(value)

# Revisa y valida los datos de los proveedores.
class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'

    def validate_rut(self, value):
        rut_normalizado = validar_rut(value)
        qs = Proveedor.objects.filter(rut=rut_normalizado)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un proveedor registrado con este RUT.")
        return rut_normalizado

    def validate_razon_social(self, value):
        return validar_texto(value)

    def validate_direccion(self, value):
        return validar_texto(value)

    def validate_comuna(self, value):
        return validar_texto(value)

    def validate_ciudad(self, value):
        return validar_texto(value)

# Detalle de cada material incluido dentro de una factura de compra.
class DetalleFacturaSerializer(serializers.ModelSerializer):
    articulo_nombre = serializers.CharField(source='id_articulo.nombre', read_only=True)

    class Meta:
        model = DetalleFactura
        fields = ['id_detalle_factura', 'id_articulo', 'articulo_nombre', 'cantidad', 'precio_unitario', 'descuento_porcentaje']

# Datos generales de la factura recibida de un proveedor.
class FacturaSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='id_proveedor.razon_social', read_only=True)
    proveedor_rut = serializers.CharField(source='id_proveedor.rut', read_only=True)
    detalles = DetalleFacturaSerializer(many=True, read_only=True)

    class Meta:
        model = Factura
        fields = [
            'id_factura', 'numero_documento', 'fecha_ingreso',
            'id_proveedor', 'proveedor_nombre', 'proveedor_rut',
            'observaciones', 'total', 'detalles', 'imagen_respaldo'
        ]
        