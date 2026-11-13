"""
Vistas y Controladores REST para el Cardex Append-Only - Proyecto Alpha (FYAG SpA).

Endpoints disponibles:
- /api/tipos-movimiento/ : Tipologías de movimiento ('Entrada', 'Salida', 'Merma').
- /api/cardex/           : Bitácora inalterable y transaccional de movimientos de inventario (HU-11).

Principios de Diseño:
- Arquitectura Append-Only: Se inhabilitan explícitamente PUT, PATCH y DELETE (respondiendo HTTP 405 Method Not Allowed).
- Concurrencia segura: Modificación de stock mediante `select_for_update()` y `transaction.atomic()`.
- Prevención de saldos negativos: Retorna HTTP 409 Conflict si un egreso supera el stock disponible actual.
"""

from django.db import transaction
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.response import Response

from .models import TipoMovimiento, MovimientoArticulo
from .serializers import TipoMovimientoSerializer, MovimientoArticuloSerializer
from catalogo_inventario.models import Articulo
from usuarios_rbac.permissions import PermisoCardex


class TipoMovimientoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la consulta de tipos de movimiento de inventario.
    
    Protegido por `PermisoCardex`. Bloquea modificaciones para asegurar integridad tipológica.
    """
    queryset = TipoMovimiento.objects.all().order_by('nombre')
    serializer_class = TipoMovimientoSerializer
    permission_classes = [PermisoCardex]
    http_method_names = ['get', 'post', 'head', 'options']


class CardexViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la auditoría y registro inalterable del Cardex (HU-11).
    
    Garantías de seguridad y consistencia:
    1. Append-Only: Bloquea operaciones destructivas o de edición retroactiva (HTTP 405 en PUT/PATCH/DELETE).
    2. Filtrado dinámico por query params:
       - `?tipo=`: Filtra por tipo de movimiento (ej. 'Entrada', 'Salida', 'Merma').
       - `?id_obra=`: Filtra los movimientos imputados a una obra específica.
       - `?search=`: Búsqueda textual sobre artículo, código de barra, motivo o usuario responsable.
    3. Validación atómica de inventario en `create()`:
       - Si es salida/merma y `stock_disponible < cantidad`, responde HTTP 409 Conflict sin alterar el registro.
       - Descuenta o incrementa `stock_disponible` con bloqueo pesimista en la base de datos.
    """
    serializer_class = MovimientoArticuloSerializer
    permission_classes = [PermisoCardex]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        """
        Retorna la bitácora histórica ordenada descendentemente con precarga relacional de artículos y usuarios.
        """
        queryset = MovimientoArticulo.objects.select_related(
            'id_articulo',
            'id_articulo__id_categoria',
            'id_articulo__id_unidad_medida',
            'id_usuario',
            'id_usuario__id_rol',
            'id_tipo_movimiento',
            'id_obra',
            'id_obra__id_cliente',
            'id_obra__id_tipo_servicio',
        ).all().order_by('-fecha', '-id_movimiento_articulo')

        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(id_tipo_movimiento__nombre__iexact=tipo)

        id_obra = self.request.query_params.get('id_obra')
        if id_obra:
            queryset = queryset.filter(id_obra_id=id_obra)

        busqueda = self.request.query_params.get('search')
        if busqueda:
            queryset = queryset.filter(
                Q(id_articulo__nombre__icontains=busqueda)
                | Q(id_articulo__codigo_barra__icontains=busqueda)
                | Q(motivo__icontains=busqueda)
                | Q(id_usuario__nombre__icontains=busqueda)
            )

        return queryset

    def create(self, request, *args, **kwargs):
        """
        Registra un movimiento Append-Only validando concurrencia y stock disponible.
        
        Respuestas:
        - HTTP 201: Movimiento registrado exitosamente y stock sincronizado.
        - HTTP 409: Conflicto si la salida supera el stock disponible en bodega.
        - HTTP 400: Error de validación en los parámetros suministrados.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        datos = serializer.validated_data
        articulo_ref = datos['id_articulo']
        cantidad_raw = datos['cantidad']
        obra = datos.get('id_obra')
        motivo = datos['motivo']

        tipo_obj = datos.get('id_tipo_movimiento')
        if not tipo_obj:
            nombre_tipo = datos.get('tipo_movimiento_nombre', '').strip()
            tipo_obj, _ = TipoMovimiento.objects.get_or_create(nombre=nombre_tipo)

        nombre_norm = tipo_obj.nombre.strip().lower()
        es_entrada = nombre_norm == 'entrada' or (nombre_norm not in ('salida', 'merma') and cantidad_raw > 0)
        unidades = abs(cantidad_raw)

        with transaction.atomic():
            articulo = Articulo.objects.select_for_update().get(pk=articulo_ref.pk)

            if es_entrada:
                articulo.stock_disponible += unidades
                cantidad_final = unidades
            else:
                if articulo.stock_disponible < unidades:
                    return Response(
                        {
                            "detail": f"Conflicto de stock (HTTP 409): Solo hay {articulo.stock_disponible} unidades disponibles.",
                            "codigo_error": "stock_insuficiente"
                        },
                        status=status.HTTP_409_CONFLICT
                    )
                articulo.stock_disponible -= unidades
                cantidad_final = -unidades

            articulo.save(update_fields=['stock_disponible'])

            movimiento = MovimientoArticulo.objects.create(
                id_articulo=articulo,
                id_usuario=request.user,
                id_tipo_movimiento=tipo_obj,
                id_obra=obra,
                cantidad=cantidad_final,
                motivo=motivo,
            )

        salida_serializer = self.get_serializer(movimiento)
        headers = self.get_success_headers(salida_serializer.data)
        return Response(salida_serializer.data, status=status.HTTP_201_CREATED, headers=headers)
