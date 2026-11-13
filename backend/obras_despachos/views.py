"""
Vistas y Controladores REST para el módulo de Obras y Despachos - Proyecto Alpha (FYAG SpA).

Endpoints disponibles:
- /api/tipos-servicio/ : CRUD de tipos de servicio técnico.
- /api/detalles-obra/  : Consulta de líneas de artículos despachados a proyectos.
- /api/obras/          : Gestión integral de obras y proyectos de refrigeración.
- /api/obras/{id}/despachar/ : Acción atómica para despachar insumos, descontar stock e imputar Cardex.
"""

from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import TipoServicio, Obra, DetalleObra
from .serializers import (
    TipoServicioSerializer,
    ObraSerializer,
    DetalleObraSerializer,
    DespachoObraInputSerializer,
)
from catalogo_inventario.models import Articulo
from cardex_auditoria.models import TipoMovimiento, MovimientoArticulo
from usuarios_rbac.permissions import PermisoObrasDespachos


class TipoServicioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la consulta y administración de tipos de servicio en climatización y refrigeración.
    
    Protegido por `PermisoObrasDespachos` (RBAC).
    """
    queryset = TipoServicio.objects.all().order_by('nombre')
    serializer_class = TipoServicioSerializer
    permission_classes = [PermisoObrasDespachos]


class DetalleObraViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet de solo lectura para listar y auditar los materiales despachados e imputados a faena.
    
    Parámetros de consulta opcionales:
    - ?obra=<id_obra>: Filtra los insumos imputados exclusivamente a la faena indicada.
    """
    serializer_class = DetalleObraSerializer
    permission_classes = [PermisoObrasDespachos]

    def get_queryset(self):
        """Optimiza las consultas mediante select_related y filtra por ID de obra si se proporciona."""
        queryset = DetalleObra.objects.select_related(
            'id_articulo', 'id_articulo__id_unidad_medida', 'id_obra'
        ).all().order_by('-id_detalle_obra')
        obra_id = self.request.query_params.get('obra')
        if obra_id:
            queryset = queryset.filter(id_obra_id=obra_id)
        return queryset


class ObraViewSet(viewsets.ModelViewSet):
    """
    ViewSet principal para administrar obras y despachos de insumos (HU-05, HU-09, HU-10).
    
    Optimiza el acceso a la base de datos precargando clientes, tipos de servicio
    y líneas de detalle de insumos despachados.
    """
    queryset = Obra.objects.select_related(
        'id_cliente', 'id_tipo_servicio'
    ).prefetch_related(
        'detalles__id_articulo__id_unidad_medida'
    ).all().order_by('-fecha_inicio', '-id_obra')
    serializer_class = ObraSerializer
    permission_classes = [PermisoObrasDespachos]

    @action(detail=True, methods=['post'], url_path='despachar')
    def despachar(self, request, pk=None):
        """
        Despacha insumos a la faena descontando stock e imputando al Cardex bajo control de concurrencia.
        
        Garantías del proceso:
        1. Bloqueo pesimista con `select_for_update()` para evitar condiciones de carrera en inventario.
        2. Validación de disponibilidad: Si `stock_disponible < cantidad`, responde HTTP 409 Conflict.
        3. Creación del registro en `DetalleObra` (imputación directa a costos del proyecto).
        4. Inserción automática del movimiento de 'Salida' en `MovimientoArticulo` (Cardex Append-Only).
        5. Todo el flujo se ejecuta de forma atómica dentro de `transaction.atomic()`.
        
        Respuestas:
        - HTTP 201: Despacho completado con detalle y nuevo saldo en bodega.
        - HTTP 409: Conflicto por stock insuficiente.
        - HTTP 400: Datos de entrada inválidos.
        """
        obra = self.get_object()
        serializer = DespachoObraInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        articulo_ref = serializer.validated_data['id_articulo']
        cantidad = serializer.validated_data['cantidad']
        motivo_input = serializer.validated_data.get('motivo', '').strip()
        tecnico_receptor = serializer.validated_data.get('tecnico_receptor', '').strip()
        documento_respaldo = serializer.validated_data.get('documento_respaldo', '').strip()

        with transaction.atomic():
            # Bloqueo pesimista del registro del artículo para evitar inconsistencias de concurrencia
            articulo = Articulo.objects.select_for_update().get(pk=articulo_ref.pk)
            if articulo.stock_disponible < cantidad:
                return Response(
                    {
                        "detail": f"Conflicto de stock (HTTP 409): Solo hay {articulo.stock_disponible} unidades disponibles.",
                        "codigo_error": "stock_insuficiente"
                    },
                    status=status.HTTP_409_CONFLICT
                )

            # Descuento atómico del inventario disponible
            articulo.stock_disponible -= cantidad
            articulo.save(update_fields=['stock_disponible'])

            # Imputación directa a la faena (HU-05)
            detalle = DetalleObra.objects.create(
                id_articulo=articulo,
                id_obra=obra,
                cantidad=cantidad,
            )

            # Registro de auditoría en Cardex (HU-11)
            tipo_salida, _ = TipoMovimiento.objects.get_or_create(nombre='Salida')
            partes_motivo = []
            if documento_respaldo:
                partes_motivo.append(f"({documento_respaldo})")
            if motivo_input:
                partes_motivo.append(motivo_input)
            elif tecnico_receptor:
                partes_motivo.append(f"Despacho a terreno recibido por {tecnico_receptor}")
            else:
                partes_motivo.append(f"Despacho a obra {obra.id_tipo_servicio.nombre}")

            movimiento = MovimientoArticulo.objects.create(
                id_articulo=articulo,
                id_usuario=request.user,
                id_tipo_movimiento=tipo_salida,
                id_obra=obra,
                cantidad=-cantidad,
                motivo=" ".join(partes_motivo),
            )

        return Response(
            {
                "detail": "Despacho registrado con éxito en obra y Cardex.",
                "id_detalle_obra": detalle.id_detalle_obra,
                "id_movimiento_articulo": movimiento.id_movimiento_articulo,
                "stock_disponible_actual": articulo.stock_disponible,
            },
            status=status.HTTP_201_CREATED
        )
