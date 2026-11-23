from rest_framework import serializers
from .models import Obra, TipoServicio, DetalleObra
from catalogo_inventario.models import Articulo
from usuarios_rbac.validators import validar_texto


# Convierte los tipos de servicio para mostrarlos en los selectores.
class TipoServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoServicio
        fields = ['id_tipo_servicio', 'nombre']

    def validate_nombre(self, value):
        return validar_texto(value)

# Muestra el detalle de los materiales que se han entregado a cada obra.
class DetalleObraSerializer(serializers.ModelSerializer):
    articulo_nombre = serializers.CharField(source='id_articulo.nombre', read_only=True)
    codigo_barra = serializers.IntegerField(source='id_articulo.codigo_barra', read_only=True)
    unidad_nombre = serializers.CharField(source='id_articulo.id_unidad_medida.nombre', read_only=True)

    class Meta:
        model = DetalleObra
        fields = [
            'id_detalle_obra', 'id_articulo', 'articulo_nombre',
            'codigo_barra', 'unidad_nombre', 'id_obra', 'cantidad'
        ]

    def validate_cantidad(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("La cantidad despachada debe ser mayor a cero.")
        return value

# Prepara los datos de la obra vinculando cliente, supervisor encargado, servicio y materiales.
class ObraSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='id_obra', read_only=True)
    codigo = serializers.SerializerMethodField()
    nombre = serializers.SerializerMethodField()
    cliente_nombre = serializers.CharField(source='id_cliente.razon_social', read_only=True)
    cliente_razon_social = serializers.CharField(source='id_cliente.razon_social', read_only=True)
    cliente = serializers.CharField(source='id_cliente.razon_social', read_only=True)
    cliente_rut = serializers.CharField(source='id_cliente.rut', read_only=True)
    ubicacion = serializers.CharField(source='id_cliente.ciudad', read_only=True)
    supervisor_nombre = serializers.SerializerMethodField()
    supervisor_rut = serializers.SerializerMethodField()
    tipo_servicio_nombre = serializers.CharField(source='id_tipo_servicio.nombre', read_only=True)
    detalles = DetalleObraSerializer(many=True, read_only=True)

    class Meta:
        model = Obra
        fields = [
            'id_obra', 'id', 'codigo', 'nombre', 'fecha_inicio',
            'id_cliente', 'cliente_nombre', 'cliente_razon_social', 'cliente', 'cliente_rut',
            'ubicacion', 'id_supervisor', 'supervisor_nombre', 'supervisor_rut',
            'tecnico_asociado', 'id_tipo_servicio', 'tipo_servicio_nombre',
            'estado', 'detalles'
        ]

    def get_codigo(self, obj):
        return f"OB-{obj.id_obra:03d}"

    def get_nombre(self, obj):
        servicio = obj.id_tipo_servicio.nombre if obj.id_tipo_servicio else "Servicio"
        cliente = obj.id_cliente.razon_social if obj.id_cliente else "Cliente"
        return f"Obra #{obj.id_obra} | {servicio} ({cliente})"

    def get_supervisor_nombre(self, obj):
        if obj.id_supervisor:
            return obj.id_supervisor.nombre
        return "Sin asignar"

    def get_supervisor_rut(self, obj):
        if obj.id_supervisor:
            return obj.id_supervisor.rut
        return ""

    def validate_tecnico_asociado(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Debe indicar el nombre del técnico responsable.")
        return validar_texto(value.strip())

    # Impide que una obra pase a estado Finalizada si no tiene un técnico responsable asignado.
    def validate(self, attrs):
        estado = attrs.get('estado', getattr(self.instance, 'estado', 'En proceso'))
        tecnico = attrs.get('tecnico_asociado', getattr(self.instance, 'tecnico_asociado', ''))
        if estado == 'Finalizada' and not str(tecnico).strip():
            raise serializers.ValidationError({"tecnico_asociado": "No se puede finalizar una obra sin tener un técnico responsable asignado."})
        return attrs

# Valida los datos enviados cuando bodega despacha un material hacia una obra.
class DespachoObraInputSerializer(serializers.Serializer):
    id_articulo = serializers.PrimaryKeyRelatedField(queryset=Articulo.objects.all())
    cantidad = serializers.IntegerField(min_value=1)
    motivo = serializers.CharField(required=False, allow_blank=True, default='')
    tecnico_receptor = serializers.CharField(required=False, allow_blank=True, default='')
    documento_respaldo = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_motivo(self, value):
        return validar_texto(value)

    def validate_tecnico_receptor(self, value):
        return validar_texto(value)

    def validate_documento_respaldo(self, value):
        return validar_texto(value)