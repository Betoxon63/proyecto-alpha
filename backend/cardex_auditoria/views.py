from django.db import transaction
from django.db.models import Sum
from rest_framework import viewsets, serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import MovimientoArticulo, TipoMovimiento
from catalogo_inventario.models import Articulo
from compras_entidades.models import Proveedor
from obras_despachos.models import Obra, DetalleObra
from usuarios_rbac.models import Rol
from usuarios_rbac.permissions import PermisoHistorial, registrar_denegacion
from usuarios_rbac.validators import validar_texto


# Tipos de movimiento.
TIPOS_INVENTARIO = (
    'entrada',
    'salida',
    'merma',
    'devolución',
    'devolucion',
)


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
    grupo = serializers.SerializerMethodField()
    obra_destino = serializers.SerializerMethodField()
    documento_respaldo = serializers.SerializerMethodField()

    class Meta:
        model = MovimientoArticulo
        fields = [
            'id_movimiento_articulo', 'id_movimiento', 'fecha', 'fecha_hora',
            'id_articulo', 'articulo_nombre', 'articulo_codigo', 'articulo_detalle',
            'unidad_medida', 'id_usuario', 'usuario_responsable', 'cargo',
            'id_tipo_movimiento', 'tipo_movimiento', 'grupo', 'id_obra', 'obra_destino',
            'cantidad', 'motivo', 'documento_respaldo'
        ]

    # Crea un código para cada registro.
    def get_id_movimiento(self, obj):
        return f"REG-{obj.id_movimiento_articulo:05d}"

    # Separa los movimientos físicos de inventario de los avisos administrativos.
    def get_grupo(self, obj):
        tipo = (obj.id_tipo_movimiento.nombre if obj.id_tipo_movimiento else '').lower()
        if obj.id_articulo and any(clave in tipo for clave in TIPOS_INVENTARIO):
            return 'Inventario'
        return 'Administración'

    # Entrega el nombre del material o la sección del sistema donde ocurrió la acción.
    def get_articulo_nombre(self, obj):
        if obj.id_articulo:
            return obj.id_articulo.nombre
        if obj.id_obra:
            return f"Gestión de Obras (Obra #{obj.id_obra.id_obra})"
        tipo = (obj.id_tipo_movimiento.nombre if obj.id_tipo_movimiento else '').lower()
        if 'obra' in tipo or 'servicio' in tipo:
            return "Gestión de Obras"
        if 'cliente' in tipo or 'proveedor' in tipo:
            return "Clientes y Proveedores"
        if 'solicitud' in tipo or 'compra' in tipo or 'factura' in tipo:
            return "Solicitudes y Compras"
        if 'categoría' in tipo or 'unidad' in tipo or 'artículo' in tipo:
            return "Clasificación de Bodega" 
        return "Gestión de Personal"

    def get_articulo_codigo(self, obj):
        if obj.id_articulo:
            return str(obj.id_articulo.codigo_barra)
        if obj.id_obra:
            return f"OB-{obj.id_obra.id_obra:03d}"
        return "SISTEMA"

    def get_articulo_detalle(self, obj):
        if obj.id_articulo and obj.id_articulo.id_categoria:
            return obj.id_articulo.id_categoria.nombre
        if obj.id_obra and obj.id_obra.id_tipo_servicio:
            return obj.id_obra.id_tipo_servicio.nombre
        return "Registro Administrativo"

    def get_unidad_medida(self, obj):
        if obj.id_articulo and obj.id_articulo.id_unidad_medida:
            return obj.id_articulo.id_unidad_medida.nombre
        if obj.id_obra:
            return "obra"
        return "reg"

    def get_obra_destino(self, obj):
        if obj.id_obra and obj.id_obra.id_cliente:
            return f"Obra #{obj.id_obra.id_obra} - {obj.id_obra.id_cliente.razon_social}"
        if not obj.id_articulo:
            return "Administración"
        return "Bodega Central"

    def get_documento_respaldo(self, obj):
        return obj.motivo


# Valida los datos enviados para registrar una merma justificada en bodega.
class MermaInputSerializer(serializers.Serializer):
    id_articulo = serializers.PrimaryKeyRelatedField(queryset=Articulo.objects.all())
    cantidad = serializers.IntegerField(min_value=1, max_value=1000000)
    motivo = serializers.CharField(min_length=5, max_length=300)

    def validate_motivo(self, value):
        texto = validar_texto(value).strip()
        if len(texto) < 5:
            raise serializers.ValidationError("Debe escribir una explicación clara del daño o pérdida.")
        return texto


# Valida los datos enviados para registrar una devolución (desde obra o hacia proveedor).
class DevolucionInputSerializer(serializers.Serializer):
    TIPO_CHOICES = [('obra', 'Devolución desde Obra'), ('proveedor', 'Devolución a Proveedor')]

    tipo_devolucion = serializers.ChoiceField(choices=TIPO_CHOICES)
    id_articulo = serializers.PrimaryKeyRelatedField(queryset=Articulo.objects.all())
    cantidad = serializers.IntegerField(min_value=1, max_value=1000000)
    id_obra = serializers.PrimaryKeyRelatedField(queryset=Obra.objects.all(), required=False, allow_null=True)
    id_proveedor = serializers.PrimaryKeyRelatedField(queryset=Proveedor.objects.all(), required=False, allow_null=True)
    documento_respaldo = serializers.CharField(required=False, allow_blank=True, default='', max_length=80)
    motivo = serializers.CharField(min_length=5, max_length=300)

    def validate_motivo(self, value):
        texto = validar_texto(value).strip()
        if len(texto) < 5:
            raise serializers.ValidationError("Debe escribir el motivo de la devolución.")
        return texto

    def validate_documento_respaldo(self, value):
        return validar_texto(value).strip() if value else ''

    def validate(self, attrs):
        if attrs.get('tipo_devolucion') == 'obra' and not attrs.get('id_obra'):
            raise serializers.ValidationError({
                "id_obra": "Debe seleccionar la obra desde la cual se devuelve el material."
            })
        if attrs.get('tipo_devolucion') == 'proveedor' and not attrs.get('id_proveedor'):
            raise serializers.ValidationError({
                "id_proveedor": "Debe seleccionar el proveedor al cual se devuelve el material."
            })
        return attrs


# Entrega el historial completo y permite agregar nuevos registros sin borrar los anteriores.
class CardexViewSet(viewsets.ModelViewSet):
    serializer_class = MovimientoArticuloSerializer
    permission_classes = [PermisoHistorial]
    http_method_names = ['get', 'post', 'head', 'options']

    # Filtra el historial según el cargo conectado.
    def get_queryset(self):
        queryset = MovimientoArticulo.objects.select_related(
            'id_articulo', 'id_articulo__id_categoria', 'id_articulo__id_unidad_medida',
            'id_usuario', 'id_usuario__id_rol', 'id_tipo_movimiento',
            'id_obra', 'id_obra__id_cliente', 'id_obra__id_tipo_servicio'
        ).all().order_by('-fecha')

        usuario = self.request.user
        rol = getattr(getattr(usuario, 'id_rol', None), 'nombre', None)

        # Un supervisor solo puede ver los movimientos de sus propias obras.
        if rol == Rol.SUPERVISOR:
            queryset = queryset.filter(id_obra__id_supervisor=usuario)
        # Bodega no ve registros administrativos de trabajadores.
        elif rol == Rol.BODEGA:
            queryset = queryset.exclude(id_tipo_movimiento__nombre__icontains='Usuario')

        return queryset

    # Bloquea la inserción de un movimiento manualmente.
    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "El historial no permite ingresos manuales. Los movimientos se registran automáticamente desde cada módulo."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    # Registra una merma por daño o pérdida descontando el stock de bodega.
    @action(detail=False, methods=['post'], url_path='registrar-merma')
    def registrar_merma(self, request):
        if request.user.id_rol.nombre not in (Rol.ADMIN, Rol.BODEGA):
            registrar_denegacion(request, "Registro de Mermas")
            return Response(
                {"detail": "Solo Administración o el Encargado de Bodega pueden registrar mermas."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = MermaInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        articulo_ref = serializer.validated_data['id_articulo']
        cantidad = serializer.validated_data['cantidad']
        motivo = serializer.validated_data['motivo']

        with transaction.atomic():
            articulo = Articulo.objects.select_for_update().get(pk=articulo_ref.pk)
            if articulo.stock_disponible < cantidad:
                return Response(
                    {
                        "detail": f"Stock insuficiente: solo quedan {articulo.stock_disponible} unidades disponibles en bodega.",
                        "codigo_error": "stock_insuficiente"
                    },
                    status=status.HTTP_409_CONFLICT
                )

            articulo.stock_disponible -= cantidad
            articulo.save(update_fields=['stock_disponible'])

            tipo_merma, _ = TipoMovimiento.objects.get_or_create(nombre='Merma Justificada')
            movimiento = MovimientoArticulo.objects.create(
                id_articulo=articulo,
                id_usuario=request.user,
                id_tipo_movimiento=tipo_merma,
                id_obra=None,
                cantidad=-cantidad,
                motivo=motivo
            )

        return Response(
            {
                "detail": "Merma registrada correctamente en el historial y descontada del stock.",
                "id_movimiento_articulo": movimiento.id_movimiento_articulo,
                "stock_disponible_actual": articulo.stock_disponible,
                "alerta_stock_minimo": articulo.stock_disponible <= articulo.stock_minimo,
            },
            status=status.HTTP_201_CREATED
        )

    # Registra devoluciones desde obra o hacia proveedor.
    @action(detail=False, methods=['post'], url_path='registrar-devolucion')
    def registrar_devolucion(self, request):
        if request.user.id_rol.nombre not in (Rol.ADMIN, Rol.BODEGA):
            registrar_denegacion(request, "Registro de Devoluciones")
            return Response(
                {"detail": "Solo Administración o el Encargado de Bodega pueden registrar devoluciones."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = DevolucionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tipo_dev = serializer.validated_data['tipo_devolucion']
        articulo_ref = serializer.validated_data['id_articulo']
        cantidad = serializer.validated_data['cantidad']
        obra_ref = serializer.validated_data.get('id_obra')
        proveedor = serializer.validated_data.get('id_proveedor')
        documento = serializer.validated_data.get('documento_respaldo', '')
        motivo = serializer.validated_data['motivo']

        with transaction.atomic():
            articulo = Articulo.objects.select_for_update().get(pk=articulo_ref.pk)

            if tipo_dev == 'obra':
                obra = Obra.objects.select_for_update().get(pk=obra_ref.pk)
                total_despachado = (
                    DetalleObra.objects.filter(id_obra=obra, id_articulo=articulo)
                    .aggregate(total=Sum('cantidad'))['total'] or 0
                )
                if total_despachado <= 0:
                    return Response(
                        {"detail": "Este material no tiene despachos registrados en la obra seleccionada."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                total_devuelto = (
                    MovimientoArticulo.objects.filter(
                        id_obra=obra,
                        id_articulo=articulo,
                        id_tipo_movimiento__nombre='Devolución de Obra'
                    ).aggregate(total=Sum('cantidad'))['total'] or 0
                )
                disponible_devolver = total_despachado - total_devuelto
                if cantidad > disponible_devolver:
                    return Response(
                        {"detail": f"No puede devolver {cantidad} unidades. Esta obra solo tiene {disponible_devolver} unidades disponibles para reingresar."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                articulo.stock_disponible += cantidad
                articulo.save(update_fields=['stock_disponible'])

                tipo_mov, _ = TipoMovimiento.objects.get_or_create(nombre='Devolución de Obra')
                partes = [f"Doc. {documento}"] if documento else []
                partes.append(f"Reingreso desde Obra #{obra.id_obra}: {motivo}")

                movimiento = MovimientoArticulo.objects.create(
                    id_articulo=articulo,
                    id_usuario=request.user,
                    id_tipo_movimiento=tipo_mov,
                    id_obra=obra,
                    cantidad=cantidad,
                    motivo=" | ".join(partes)
                )
                mensaje_ok = f"Devolución desde Obra #{obra.id_obra} registrada. Se sumaron {cantidad} unidades al stock."
            else:
                if articulo.stock_disponible < cantidad:
                    return Response(
                        {
                            "detail": f"Stock insuficiente: solo quedan {articulo.stock_disponible} unidades disponibles en bodega.",
                            "codigo_error": "stock_insuficiente"
                        },
                        status=status.HTTP_409_CONFLICT
                    )

                articulo.stock_disponible -= cantidad
                articulo.save(update_fields=['stock_disponible'])

                tipo_mov, _ = TipoMovimiento.objects.get_or_create(nombre='Devolución a Proveedor')
                partes = []
                if documento:
                    partes.append(f"Doc. {documento}")
                partes.append(f"Proveedor: {proveedor.razon_social}")
                partes.append(motivo)

                movimiento = MovimientoArticulo.objects.create(
                    id_articulo=articulo,
                    id_usuario=request.user,
                    id_tipo_movimiento=tipo_mov,
                    id_obra=None,
                    cantidad=-cantidad,
                    motivo=" | ".join(partes)
                )
                mensaje_ok = f"Devolución a proveedor registrada. Se descontaron {cantidad} unidades del stock."

        return Response(
            {
                "detail": mensaje_ok,
                "id_movimiento_articulo": movimiento.id_movimiento_articulo,
                "stock_disponible_actual": articulo.stock_disponible,
                "alerta_stock_minimo": articulo.stock_disponible <= articulo.stock_minimo,
            },
            status=status.HTTP_201_CREATED
        )
