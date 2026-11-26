from rest_framework import serializers
from .models import Cliente, Proveedor, Factura, DetalleFactura, SolicitudReposicion
from usuarios_rbac.models import Rol
from usuarios_rbac.validators import validar_rut, validar_texto


# Función de apoyo para validar símbolos permitidos y límites de largo en textos comerciales.
def validar_campo_comercial(valor, nombre_campo, minimo, maximo):
    texto_limpio = validar_texto(valor).strip()
    if len(texto_limpio) < minimo or len(texto_limpio) > maximo:
        raise serializers.ValidationError(
            f"El campo {nombre_campo} debe tener entre {minimo} y {maximo} caracteres."
        )
    return texto_limpio


# Revisa y valida todos los datos tributarios y de contacto de las empresas clientes.
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
        return validar_campo_comercial(value, "razón social", 3, 120)

    def validate_giro_comercial(self, value):
        return validar_campo_comercial(value, "giro comercial", 3, 120)

    def validate_direccion(self, value):
        return validar_campo_comercial(value, "dirección", 5, 150)

    def validate_region(self, value):
        return validar_campo_comercial(value, "región", 2, 80)

    def validate_comuna(self, value):
        return validar_campo_comercial(value, "comuna", 2, 80)

    def validate_ciudad(self, value):
        return validar_campo_comercial(value, "ciudad", 2, 80)

    def validate_nombre_representante(self, value):
        return validar_campo_comercial(value, "nombre del representante", 3, 80)


# Revisa y valida todos los datos tributarios y de ubicación de los proveedores.
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
        return validar_campo_comercial(value, "razón social", 3, 120)

    def validate_direccion(self, value):
        return validar_campo_comercial(value, "dirección", 5, 150)

    def validate_region(self, value):
        return validar_campo_comercial(value, "región", 2, 80)

    def validate_comuna(self, value):
        return validar_campo_comercial(value, "comuna", 2, 80)

    def validate_ciudad(self, value):
        return validar_campo_comercial(value, "ciudad", 2, 80)


# Prepara el detalle de cada material incluido dentro de una factura de compra.
class DetalleFacturaSerializer(serializers.ModelSerializer):
    articulo_nombre = serializers.CharField(source='id_articulo.nombre', read_only=True)
    articulo_codigo = serializers.IntegerField(source='id_articulo.codigo_barra', read_only=True)
    unidad_nombre = serializers.CharField(source='id_articulo.id_unidad_medida.nombre', read_only=True)

    class Meta:
        model = DetalleFactura
        fields = [
            'id_detalle_factura', 'id_articulo', 'articulo_nombre',
            'articulo_codigo', 'unidad_nombre','cantidad', 'precio_unitario'
        ]


# Prepara los datos completos de cada factura de compra junto con su proveedor y materiales.
class FacturaSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='id_proveedor.razon_social', read_only=True)
    proveedor_rut = serializers.CharField(source='id_proveedor.rut', read_only=True)
    detalles = DetalleFacturaSerializer(many=True, read_only=True)

    class Meta:
        model = Factura
        fields = [
            'id_factura', 'numero_documento', 'fecha_ingreso',
            'id_proveedor', 'proveedor_nombre', 'proveedor_rut',
            'observaciones', 'total', 'detalles'
        ]

# Prepara los datos completos de cada solicitud de reposición para mostrarla en pantalla.
class SolicitudReposicionSerializer(serializers.ModelSerializer):
    codigo_solicitud = serializers.SerializerMethodField()
    articulo_nombre = serializers.CharField(source='id_articulo.nombre', read_only=True)
    articulo_codigo = serializers.IntegerField(source='id_articulo.codigo_barra', read_only=True)
    articulo_ubicacion = serializers.CharField(source='id_articulo.ubicacion', read_only=True)
    unidad_nombre = serializers.CharField(source='id_articulo.id_unidad_medida.nombre', read_only=True)
    stock_actual = serializers.IntegerField(source='id_articulo.stock_disponible', read_only=True)
    stock_minimo = serializers.IntegerField(source='id_articulo.stock_minimo', read_only=True)
    precio_referencia = serializers.IntegerField(source='id_articulo.precio', read_only=True)
    proveedor_nombre = serializers.CharField(source='id_proveedor.razon_social', read_only=True, allow_null=True)
    factura_numero = serializers.IntegerField(source='id_factura.numero_documento', read_only=True, allow_null=True)
    factura_total = serializers.IntegerField(source='id_factura.total', read_only=True, allow_null=True)
    solicitado_por_nombre = serializers.CharField(source='solicitado_por.nombre', read_only=True)
    gestionado_por_nombre = serializers.CharField(source='gestionado_por.nombre', read_only=True, allow_null=True)
    recepcionado_por_nombre = serializers.CharField(source='recepcionado_por.nombre', read_only=True, allow_null=True)
    fecha_solicitud_fmt = serializers.DateTimeField(source='fecha_solicitud', format='%d/%m/%Y %H:%M', read_only=True)
    fecha_actualizacion_fmt = serializers.DateTimeField(source='fecha_actualizacion', format='%d/%m/%Y %H:%M', read_only=True)

    class Meta:
        model = SolicitudReposicion
        fields = [
            'id_solicitud', 'codigo_solicitud', 'id_articulo', 'articulo_nombre',
            'articulo_codigo', 'articulo_ubicacion', 'unidad_nombre',
            'stock_actual', 'stock_minimo', 'precio_referencia',
            'cantidad_solicitada', 'estado', 'observacion_bodega', 'observacion_finanzas',
            'id_proveedor', 'proveedor_nombre', 'id_factura', 'factura_numero', 'factura_total',
            'solicitado_por', 'solicitado_por_nombre',
            'gestionado_por', 'gestionado_por_nombre',
            'recepcionado_por', 'recepcionado_por_nombre',
            'fecha_solicitud', 'fecha_solicitud_fmt',
            'fecha_actualizacion', 'fecha_actualizacion_fmt',
        ]
        read_only_fields = [
            'estado', 'id_proveedor', 'id_factura',
            'solicitado_por', 'gestionado_por', 'recepcionado_por',
            'fecha_solicitud', 'fecha_actualizacion',
        ]

    # Entrega un código legible para mostrar en las tablas.
    def get_codigo_solicitud(self, obj):
        return f"SOL-{obj.id_solicitud:04d}"

    # Oculta el monto total de la factura cuando consulta Bodega.
    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            if request.user.id_rol.nombre == Rol.BODEGA:
                data.pop('factura_total', None)
        return data
        