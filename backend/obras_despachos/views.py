from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Obra, TipoServicio, DetalleObra
from .serializers import ObraSerializer, TipoServicioSerializer, DetalleObraSerializer, DespachoObraInputSerializer

from catalogo_inventario.models import Articulo
from usuarios_rbac.models import Rol
from usuarios_rbac.permissions import PermisoObras, registrar_denegacion
from cardex_auditoria.models import MovimientoArticulo, TipoMovimiento

# Guarda en el historial general cada vez que se crea o modifica una obra.
def registrar_accion_obra(usuario_autor, obra_obj, tipo_accion, detalle_motivo):
    if not usuario_autor or not usuario_autor.is_authenticated:
        return
    tipo_obj, _ = TipoMovimiento.objects.get_or_create(nombre=tipo_accion)
    MovimientoArticulo.objects.create(
        id_articulo=None,
        id_usuario=usuario_autor,
        id_tipo_movimiento=tipo_obj,
        id_obra=obra_obj,
        cantidad=1,
        motivo=detalle_motivo
    )

# Entrega la lista de tipos de servicio.
class TipoServicioViewSet(viewsets.ModelViewSet):
    queryset = TipoServicio.objects.all().order_by('id_tipo_servicio')
    serializer_class = TipoServicioSerializer
    permission_classes = [PermisoObras]

# Permite consultar la lista de materiales entregados por obra.
class DetalleObraViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DetalleObraSerializer
    permission_classes = [PermisoObras]

    def get_queryset(self):
        queryset = DetalleObra.objects.select_related(
            'id_articulo', 'id_articulo__id_unidad_medida', 'id_obra'
        ).all().order_by('-id_detalle_obra')
        obra_id = self.request.query_params.get('obra')
        if (obra_id):
            queryset = queryset.filter(id_obra_id=obra_id)
        return queryset

# Permite crear, consultar, actualizar obras y despacharles materiales desde bodega.
class ObraViewSet(viewsets.ModelViewSet):
    queryset = Obra.objects.select_related(
        'id_cliente', 'id_tipo_servicio'
    ).prefetch_related(
        'detalles__id_articulo__id_unidad_medida'
    ).all().order_by('-id_obra')
    serializer_class = ObraSerializer
    permission_classes = [PermisoObras]

    # Permite que el encargado de Bodega y el Administrador ejecuten la acción de despachar materiales a una obra.
    def check_permissions(self, request):
        if getattr(self, 'action', None) == 'despachar':
            if not (request.user and request.user.is_authenticated):
                self.permission_denied(request)
            if request.user.id_rol.nombre in (Rol.ADMIN, Rol.BODEGA):
                return
            registrar_denegacion(request, "Despacho de Materiales a Obra")
            self.permission_denied(request)
        super().check_permissions(request)
        
    def perform_create(self, serializer):
        nueva_obra = serializer.save()
        detalle = (
            f"Nueva obra #{nueva_obra.id_obra} registrada para {nueva_obra.id_cliente.razon_social} "
            f"({nueva_obra.id_tipo_servicio.nombre}) | Técnico: {nueva_obra.tecnico_asociado}"
        )
        registrar_accion_obra(self.request.user, nueva_obra, 'Registro de Obra', detalle)

    def perform_update(self, serializer):
        obra_previa = self.get_object()
        estado_previo = obra_previa.estado
        tecnico_previo = obra_previa.tecnico_asociado

        obra_actualizada = serializer.save()

        cambios = []
        if estado_previo != obra_actualizada.estado:
            cambios.append(f"estado ({estado_previo} -> {obra_actualizada.estado})")
        if tecnico_previo != obra_actualizada.tecnico_asociado:
            cambios.append(f"técnico ({tecnico_previo} -> {obra_actualizada.tecnico_asociado})")

        resumen = ", ".join(cambios) if cambios else "actualización de datos de la obra"
        detalle = f"Obra #{obra_actualizada.id_obra} ({obra_actualizada.id_cliente.razon_social}) : {resumen}"
        registrar_accion_obra(self.request.user, obra_actualizada, 'Modificación de Obra', detalle)

    # Despacha materiales a la obra descontando stock, guardando en detalle_obra y en el historial.
    @action(detail=True, methods=['post'], url_path='despachar')
    def despachar(self, request, pk=None):
        obra = self.get_object()
        serializer = DespachoObraInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        articulo_ref = serializer.validated_data['id_articulo']
        cantidad = serializer.validated_data['cantidad']
        motivo_input = serializer.validated_data.get('motivo', '').strip()
        tecnico_receptor = serializer.validated_data.get('tecnico_receptor', '').strip()
        documento_respaldo = serializer.validated_data.get('documento_respaldo', '').strip()

        # Bloquea la fila del artículo mientras se descuenta el stock para evitar errores si dos personas despachan a la vez.
        with transaction.atomic():
            articulo  = Articulo.objects.select_for_update().get(pk=articulo_ref.pk)
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

            detalle = DetalleObra.objects.create(
                id_articulo=articulo,
                id_obra=obra,
                cantidad=cantidad,
            )

            tipo_salida, _ = TipoMovimiento.objects.get_or_create(nombre='Salida')
            partes_motivo = []
            if documento_respaldo:
                partes_motivo.append(f"Guía {documento_respaldo}")
            if motivo_input:
                partes_motivo.append(motivo_input)
            elif tecnico_receptor:
                partes_motivo.append(f"Entregado a {tecnico_receptor}")
            else:
                partes_motivo.append(f"Despacho a Obra #{obra.id_obra}")

            movimiento = MovimientoArticulo.objects.create(
                id_articulo=articulo,
                id_usuario=request.user,
                id_tipo_movimiento=tipo_salida,
                id_obra=obra,
                cantidad=-cantidad,
                motivo=" | ".join(partes_motivo),
            )

        return Response(
            {
                "detail": "Despacho registrado con éxito en la obra y en el historial.",
                "id_detalle_obra": detalle.id_detalle_obra,
                "id_movimiento_articulo": movimiento.id_movimiento_articulo,
                "stock_disponible_actual": articulo.stock_disponible,
            },
            status=status.HTTP_201_CREATED
        )
