from django.db.models import Sum
from rest_framework import serializers
from .models import Obra, TipoServicio, DetalleObra
from catalogo_inventario.models import Articulo
from usuarios_rbac.models import Rol
from usuarios_rbac.validators import validar_texto


# Revisa y prepara los tipos de servicio disponibles para las obras.
class TipoServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoServicio
        fields = ['id_tipo_servicio', 'nombre']

    # Evita nombres vacíos, muy largos o repetidos.
    def validate_nombre(self, value):
        nombre_limpio = validar_texto(value).strip()
        if len(nombre_limpio) < 2 or len(nombre_limpio) > 60:
            raise serializers.ValidationError("El nombre del servicio debe tener entre 2 y 60 caracteres.")

        qs = TipoServicio.objects.filter(nombre__iexact=nombre_limpio)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un tipo de servicio con ese nombre.")
        return nombre_limpio


# Muestra el detalle de los materiales que se han entregado a cada obra.
class DetalleObraSerializer(serializers.ModelSerializer):
    articulo_nombre = serializers.CharField(source='id_articulo.nombre', read_only=True)
    codigo_barra = serializers.IntegerField(source='id_articulo.codigo_barra', read_only=True)
    unidad_nombre = serializers.CharField(source='id_articulo.id_unidad_medida.nombre', read_only=True)
    precio_unitario = serializers.IntegerField(source='id_articulo.precio', read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = DetalleObra
        fields = [
            'id_detalle_obra', 'id_articulo', 'articulo_nombre',
            'codigo_barra', 'unidad_nombre', 'id_obra', 'cantidad',
            'precio_unitario', 'subtotal'
        ]

    # Calcula el costo de la entrega.
    def get_subtotal(self, obj):
        precio = obj.id_articulo.precio if obj.id_articulo else 0
        return int(obj.cantidad or 0) * int(precio or 0)

    def validate_cantidad(self, value):
        if value is not None and (value <= 0 or value > 1000000):
            raise serializers.ValidationError("La cantidad despachada debe estar entre 1 y 1.000.000.")
        return value

# Prepara los datos de la obra vinculando cliente, supervisor, materiales y costo total.
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
    costo_total_materiales = serializers.SerializerMethodField()

    class Meta:
        model = Obra
        fields = [
            'id_obra', 'id', 'codigo', 'nombre', 'fecha_inicio',
            'id_cliente', 'cliente_nombre', 'cliente_razon_social', 'cliente', 'cliente_rut',
            'ubicacion', 'id_supervisor', 'supervisor_nombre', 'supervisor_rut',
            'tecnico_asociado', 'id_tipo_servicio', 'tipo_servicio_nombre',
            'estado', 'detalles', 'costo_total_materiales'
        ]

    # Entrega un código corto para la tabla.
    def get_codigo(self, obj):
        return f"OB-{obj.id_obra:03d}"

    # Arma un nombre claro con el servicio y el cliente
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

    # Suma el valor total de los materiales despachados.
    def get_costo_total_materiales(self, obj):
        from cardex_auditoria.models import MovimientoArticulo

        bruto = sum(
            int(d.cantidad or 0) * int(d.id_articulo.precio or 0)
            for d in obj.detalles.all()
        )
        if bruto == 0:
            return 0

        devoluciones = (
            MovimientoArticulo.objects.filter(
                id_obra=obj,
                id_tipo_movimiento__nombre='Devolución de Obra',
                id_articulo__isnull=False,
            )
            .values('id_articulo__precio')
            .annotate(total_dev=Sum('cantidad'))
        )
        monto_devuelto = sum(
            int(item['total_dev'] or 0) * int(item['id_articulo__precio'] or 0)
            for item in devoluciones
        )
        return max(0, bruto - monto_devuelto)

    # Revisa que el estado sea válido.
    def validate_estado(self, value):
        estados_validos = [Obra.EN_PROCESO, Obra.FINALIZADA, Obra.SUSPENDIDA, Obra.CANCELADA]
        if value not in estados_validos:
            raise serializers.ValidationError("El estado elegido no es válido")
        return value

    # Verifica que el supervisor asignado sea válido.
    def validate_id_supervisor(self, value):
        if value is None:
            return value
        if value.id_rol.nombre != Rol.SUPERVISOR or not value.is_active:
            raise serializers.ValidationError("Debe asignar un Supervisor de Obra activo.")
        return value

    # Comprueba que el nombre del técnico sea válido y tenga un largo razonable.
    def validate_tecnico_asociado(self, value):
        texto = validar_texto(value).strip() if value else ''
        if len(texto) < 3 or len(texto) > 80:
            raise serializers.ValidationError("El nombre del técnico responsable debe tener entre 3 y 80 caracteres.")
        return texto

    # Impide que una obra pase a estado Finalizada si no tiene un técnico responsable asignado.
    def validate(self, attrs):
        estado = attrs.get('estado', getattr(self.instance, 'estado', Obra.EN_PROCESO))
        tecnico = attrs.get('tecnico_asociado', getattr(self.instance, 'tecnico_asociado', ''))
        if estado == Obra.FINALIZADA and not str(tecnico).strip():
            raise serializers.ValidationError({
                "tecnico_asociado": "No se puede finalizar una obra sin tener un técnico responsable asignado."
            })
        return attrs


# Valida los datos que envía bodega al despachar materiales hacia una obra.
class DespachoObraInputSerializer(serializers.Serializer):
    id_articulo = serializers.PrimaryKeyRelatedField(queryset=Articulo.objects.all())
    cantidad = serializers.IntegerField(min_value=1, max_value=1000000)
    motivo = serializers.CharField(required=False, allow_blank=True, default='', max_length=250)
    tecnico_receptor = serializers.CharField(required=False, allow_blank=True, default='', max_length=80)
    documento_respaldo = serializers.CharField(required=False, allow_blank=True, default='', max_length=50)

    def validate_motivo(self, value):
        return validar_texto(value).strip() if value else ''

    def validate_tecnico_receptor(self, value):
        return validar_texto(value).strip() if value else ''

    def validate_documento_respaldo(self, value):
        return validar_texto(value).strip() if value else ''