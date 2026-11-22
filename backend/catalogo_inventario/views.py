from django.db.models import Q
from django.db.models.deletion import ProtectedError
from rest_framework import viewsets, status
from rest_framework.response import Response

from .models import Categoria, UnidadMedida, Articulo
from .serializers import CategoriaSerializer, UnidadMedidaSerializer, ArticuloSerializer
from usuarios_rbac.permissions import PermisoArticulos
from cardex_auditoria.models import MovimientoArticulo, TipoMovimiento


# Guarda en el historial los cambios realizados en materiales, categorías o unidades de bodega.
def registrar_movimiento_catalogo(usuario_autor, articulo_obj, tipo_accion, cantidad, detalle_motivo):
    if not usuario_autor or not usuario_autor.is_authenticated:
        return
    tipo_obj, _ = TipoMovimiento.objects.get_or_create(nombre=tipo_accion)
    MovimientoArticulo.objects.create(
        id_articulo=articulo_obj,
        id_usuario=usuario_autor,
        id_tipo_movimiento=tipo_obj,
        id_obra=None,
        cantidad=cantidad,
        motivo=detalle_motivo
    )


# Gestiona las categorías de materiales.
class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all().order_by('nombre')
    serializer_class = CategoriaSerializer
    permission_classes = [PermisoArticulos]

    def perform_create(self, serializer):
        nueva_categoria = serializer.save()
        detalle = f"Nueva categoría de bodega registrada: {nueva_categoria.nombre}"
        registrar_movimiento_catalogo(self.request.user, None, 'Registro de Categoría', 1, detalle)

    def perform_update(self, serializer):
        nombre_previo = self.get_object().nombre
        categoria_actualizada = serializer.save()
        detalle = f"Categoría actualizada: {nombre_previo} -> {categoria_actualizada.nombre}"
        registrar_movimiento_catalogo(self.request.user, None, 'Modificación de Categoría', 1, detalle)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar esta categoría porque ya está asignada a uno o más materiales en el catálogo."},
                status=status.HTTP_400_BAD_REQUEST
            )

# Gestiona las unidades de medida.
class UnidadMedidaViewSet(viewsets.ModelViewSet):
    queryset = UnidadMedida.objects.all().order_by('nombre')
    serializer_class = UnidadMedidaSerializer
    permission_classes = [PermisoArticulos]

    def perform_create(self, serializer):
        nueva_unidad = serializer.save()
        detalle = f"Nueva unidad de medida registrada: {nueva_unidad.nombre}"
        registrar_movimiento_catalogo(self.request.user, None, 'Registro de Unidad', 1, detalle)

    def perform_update(self, serializer):
        nombre_previo = self.get_object().nombre
        unidad_actualizada = serializer.save()
        detalle = f"Unidad de medida actualizada: {nombre_previo} -> {unidad_actualizada.nombre}"
        registrar_movimiento_catalogo(self.request.user, None, 'Modificación de Unidad', 1, detalle)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar esta unidad de medida porque ya está siendo usada por materiales en el catálogo."},
                status=status.HTTP_400_BAD_REQUEST
            )

# Gestiona el catálogo de materiales de bodega y su buscador por nombre o código.
class ArticuloViewSet(viewsets.ModelViewSet):
    serializer_class = ArticuloSerializer
    permission_classes = [PermisoArticulos]

    def get_queryset(self):
        queryset = Articulo.objects.select_related('id_categoria', 'id_unidad_medida').all().order_by('nombre')
        busqueda = self.request.query_params.get('search')
        if busqueda:
            queryset = queryset.filter(
                Q(nombre__icontains=busqueda) | Q(codigo_barra__icontains=busqueda)
            )
        return queryset

    def perform_create(self, serializer):
        nuevo_articulo = serializer.save()
        detalle = (
            f"Ingreso inicial al catálogo: {nuevo_articulo.nombre} "
            f"(Ubicación: {nuevo_articulo.ubicacion})"
        )
        registrar_movimiento_catalogo(
            self.request.user,
            nuevo_articulo,
            'Entrada',
            nuevo_articulo.stock_disponible,
            detalle
        )

    def perform_update(self, serializer):
        articulo_previo = self.get_object()
        stock_previo = articulo_previo.stock_disponible
        precio_previo = articulo_previo.precio
        ubicacion_previa = articulo_previo.ubicacion

        articulo_actualizado = serializer.save()
        diferencia_stock = articulo_actualizado.stock_disponible - stock_previo

        # Si cambió el stock o los datos principales desde el catálogo, deja constancia en el historial.
        if diferencia_stock != 0:
            tipo_mov = 'Entrada' if diferencia_stock > 0 else 'Salida'
            detalle = (
                f"Ajuste de inventario en catálogo ({stock_previo} -> "
                f"{articulo_actualizado.stock_disponible} {articulo_actualizado.id_unidad_medida.nombre})"
            )
            registrar_movimiento_catalogo(
                self.request.user,
                articulo_actualizado,
                tipo_mov,
                diferencia_stock,
                detalle
            )
        elif precio_previo != articulo_actualizado.precio or ubicacion_previa != articulo_actualizado.ubicacion:
            detalle = (
                f"Actualización de ficha en catálogo: Ubicación {articulo_actualizado.ubicacion} | "
                f"Precio ${articulo_actualizado.precio}"
            )
            registrar_movimiento_catalogo(
                self.request.user,
                articulo_actualizado,
                'Entrada',
                0,
                detalle
            )

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar este material porque ya tiene registros de entradas, salidas o facturas en el historial."},
                status=status.HTTP_400_BAD_REQUEST
            )
