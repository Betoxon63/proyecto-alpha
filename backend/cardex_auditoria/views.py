from rest_framework import viewsets, serializers
from .models import MovimientoArticulo
from usuarios_rbac.permissions import PermisoArticulos

# Prepara cada fila del historial para mostrarla de forma clara en la pantalla.
class MovimientoArticuloSerializer(serializers.ModelSerializer):
    id_movimiento = serializers.SerializerMethodField()
    fecha_hora = serializers.DateTimeField(source='fecha', format='%d/%m/%Y %H:%M', read_only=True)
    usuario_responsable = serializers.CharField(source='id_usuario.nombre', read_only=True)
    cargo = serializers.CharField(source='id_usuario.id_rol.nombre', read_only=True)
    articulo_nombre = serializers.SerializerMethodField()
    articulo_codigo = serializers.SerializerMethodField()
    articulo_detalle = serializers.SerializerMethodField()
    unidad_medida = serializers.SerializerMethodField()
    tipo_movimiento = serializers.CharField(source='id_tipo_movimiento.nombre', read_only=True)
    obra_destino = serializers.SerializerMethodField()
    documento_respaldo = serializers.SerializerMethodField()

    class Meta:
        model = MovimientoArticulo
        fields = [
            'id_movimiento_articulo', 'id_movimiento', 'fecha', 'fecha_hora',
            'id_articulo', 'articulo_nombre', 'articulo_codigo', 'articulo_detalle',
            'unidad_medida', 'id_usuario', 'usuario_responsable', 'cargo',
            'id_tipo_movimiento', 'tipo_movimiento', 'id_obra', 'obra_destino',
            'cantidad', 'motivo', 'documento_respaldo'
        ]

    def get_id_movimiento(self, obj):
        return f"REG-{obj.id_movimiento_articulo:05d}"

    def get_articulo_nombre(self, obj):
        if obj.id_articulo:
            return obj.id_articulo.nombre
        if obj.id_obra:
            return f"Gestión de Obras (Obra #{obj.id_obra.id_obra})"
        return "Gestión de Personal"

    def get_articulo_codigo(self, obj):
        if obj.id_articulo:
            return str(obj.id_articulo.codigo_barra)
        if obj.id_obra:
            return f"OB-{obj.id_obra.id_obra:03d}"
        return "PERSONAL"

    def get_articulo_detalle(self, obj):
        if obj.id_articulo and obj.id_articulo.id_categoria:
            return obj.id_articulo.id_categoria.nombre
        if obj.id_obra and obj.id_obra.id_tipo_servicio:
            return obj.id_obra.id_tipo_servicio.nombre
        return "Cuenta de Trabajador"

    def get_unidad_medida(self, obj):
        if obj.id_articulo and obj.id_articulo.id_unidad_medida:
            return obj.id_articulo.id_unidad_medida.nombre
        if obj.id_obra:
            return "obra"
        return "cuenta"

    def get_obra_destino(self, obj):
        if obj.id_obra and obj.id_obra.id_cliente:
            return f"Obra #{obj.id_obra.id_obra} - {obj.id_obra.id_cliente.razon_social}"
        if not obj.id_articulo:
            return "Administración / TI"
        return "Bodega Central"

    def get_documento_respaldo(self, obj):
        return obj.motivo

# Entrega el historial completo y permite agregar nuevos registros sin borrar los anteriores.
class CardexViewSet(viewsets.ModelViewSet):
    queryset = MovimientoArticulo.objects.select_related(
        'id_articulo', 'id_articulo__id_categoria', 'id_articulo__id_unidad_medida',
        'id_usuario', 'id_usuario__id_rol', 'id_tipo_movimiento', 'id_obra', 'id_obra__id_cliente'
    ).all().order_by('-fecha')
    serializer_class = MovimientoArticuloSerializer
    permission_classes = [PermisoArticulos]
    http_method_names = ['get', 'post', 'head', 'options']
