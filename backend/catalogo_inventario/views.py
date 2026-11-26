from django.db.models import F, Q
from django.db.models.deletion import ProtectedError
from rest_framework import viewsets, status
from rest_framework.response import Response

from .models import Categoria, UnidadMedida, Articulo
from .serializers import CategoriaSerializer, UnidadMedidaSerializer, ArticuloSerializer
from usuarios_rbac.permissions import PermisoArticulos
from cardex_auditoria.models import MovimientoArticulo, TipoMovimiento


# Guarda en el historial los cambios realizados en materiales, categorías o unidades.
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


# Permite ver, crear, editar y eliminar categorías de bodega dejando registro en el historial.
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
        if nombre_previo != categoria_actualizada.nombre:
            detalle = f"Categoría actualizada: {nombre_previo} -> {categoria_actualizada.nombre}"
            registrar_movimiento_catalogo(self.request.user, None, 'Modificación de Categoría', 1, detalle)

    def destroy(self, request, *args, **kwargs):
        instancia = self.get_object()
        nombre_borrado = instancia.nombre
        try:
            self.perform_destroy(instancia)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar esta categoría porque ya está asignada a uno o más materiales en el catálogo."},
                status=status.HTTP_400_BAD_REQUEST
            )

        detalle = f"Categoría eliminada del catálogo: {nombre_borrado}"
        registrar_movimiento_catalogo(request.user, None, 'Eliminación de Categoría', 1, detalle)
        return Response(status=status.HTTP_204_NO_CONTENT)


# Permite ver, crear, editar y eliminar unidades de medida dejando registro en el historial.
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
        if nombre_previo != unidad_actualizada.nombre:
            detalle = f"Unidad de medida actualizada: {nombre_previo} -> {unidad_actualizada.nombre}"
            registrar_movimiento_catalogo(self.request.user, None, 'Modificación de Unidad', 1, detalle)

    def destroy(self, request, *args, **kwargs):
        instancia = self.get_object()
        nombre_borrado = instancia.nombre
        try:
            self.perform_destroy(instancia)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar esta unidad de medida porque ya está siendo usada por materiales en el catálogo."},
                status=status.HTTP_400_BAD_REQUEST
            )

        detalle = f"Unidad de medida eliminada del catálogo: {nombre_borrado}"
        registrar_movimiento_catalogo(request.user, None, 'Eliminación de Unidad', 1, detalle)
        return Response(status=status.HTTP_204_NO_CONTENT)


# Administra el catálogo maestro de materiales, con filtros por texto, categoría y nivel de stock.
class ArticuloViewSet(viewsets.ModelViewSet):
    serializer_class = ArticuloSerializer
    permission_classes = [PermisoArticulos]

    # Filtra el catálogo según la búsqueda escrita y los filtros opcionales enviados en la URL.
    def get_queryset(self):
        queryset = Articulo.objects.select_related('id_categoria', 'id_unidad_medida').all().order_by('nombre')

        busqueda = str(self.request.query_params.get('search') or '').strip()[:80]
        if busqueda:
            queryset = queryset.filter(
                Q(nombre__icontains=busqueda) | 
                Q(codigo_barra__icontains=busqueda) |
                Q(ubicacion__icontains=busqueda) |
                Q(id_categoria__nombre__icontains=busqueda) 
            )

        categoria_id = self.request.query_params.get('categoria')
        if categoria_id and str(categoria_id).isdigit():
            queryset = queryset.filter(id_categoria_id=int(categoria_id))

        estado = str(self.request.query_params.get('estado') or '').strip().lower()
        if estado == 'agotado':
            queryset = queryset.filter(stock_disponible=0)
        elif estado == 'bajo':
            queryset = queryset.filter(stock_disponible__gt=0, stock_disponible__lte=F('stock_minimo'))
        elif estado == 'critico':
            queryset = queryset.filter(stock_disponible__lte=F('stock_minimo'))
        elif estado == 'normal':
            queryset = queryset.filter(stock_disponible__gt=F('stock_minimo'))
        
        return queryset

    # Al crear un material nuevo, deja registro en el historial indicando su stock inicial y ubicación.
    def perform_create(self, serializer):
        nuevo_articulo = serializer.save()
        detalle = (
            f"Ingreso inicial al catálogo: {nuevo_articulo.nombre} "
            f"(Ubicación: {nuevo_articulo.ubicacion})"
        )
        tipo_inicial = 'Entrada' if nuevo_articulo.stock_disponible > 0 else 'Registro de Artículo'
        registrar_movimiento_catalogo(
            self.request.user,
            nuevo_articulo,
            tipo_inicial,
            nuevo_articulo.stock_disponible,
            detalle
        )

    # Al editar un material, identifica exactamente qué campos cambiaron y lo guarda en el historial.
    def perform_update(self, serializer):
        articulo_previo = self.get_object()
        nombre_previo = articulo_previo.nombre
        stock_previo = articulo_previo.stock_disponible
        minimo_previo = articulo_previo.stock_minimo
        comprometido_previo = articulo_previo.stock_comprometido
        precio_previo = articulo_previo.precio
        ubicacion_previa = articulo_previo.ubicacion
        categoria_previa = articulo_previo.id_categoria_id
        unidad_previa = articulo_previo.id_unidad_medida_id

        articulo_actualizado = serializer.save()
        diferencia_stock = articulo_actualizado.stock_disponible - stock_previo

        # Si cambió el stock o los datos principales desde el catálogo, deja constancia en el historial.
        if diferencia_stock != 0:
            tipo_mov = 'Entrada' if diferencia_stock > 0 else 'Salida'
            detalle = (
                f"Ajuste manual de inventario en catálogo ({stock_previo} -> "
                f"{articulo_actualizado.stock_disponible} {articulo_actualizado.id_unidad_medida.nombre})"
            )
            registrar_movimiento_catalogo(
                self.request.user,
                articulo_actualizado,
                tipo_mov,
                diferencia_stock,
                detalle
            )

        # Detecta los cambios de la ficha del articulo.
        cambios = []
        if nombre_previo != articulo_actualizado.nombre:
            cambios.append(f"nombre ({nombre_previo} -> {articulo_actualizado.nombre})")
        if ubicacion_previa != articulo_actualizado.ubicacion:
            cambios.append(f"ubicación ({articulo_actualizado.ubicacion})")
        if precio_previo != articulo_actualizado.precio:
            cambios.append(f"precio (${articulo_actualizado.precio})")
        if minimo_previo != articulo_actualizado.stock_minimo:
            cambios.append(f"stock mínimo ({articulo_actualizado.stock_minimo})")
        if comprometido_previo != articulo_actualizado.stock_comprometido:
            cambios.append(f"stock comprometido ({articulo_actualizado.stock_comprometido})")
        if categoria_previa != articulo_actualizado.id_categoria_id:
            cambios.append(f"categoría ({articulo_actualizado.id_categoria.nombre})")
        if unidad_previa != articulo_actualizado.id_unidad_medida_id:
            cambios.append(f"unidad ({articulo_actualizado.id_unidad_medida.nombre})")
        
        if cambios:
            detalle = f"Ficha de material actualizada: {', '.join(cambios)}"
            registrar_movimiento_catalogo(
                self.request.user,
                articulo_actualizado,
                'Modificación de Artículo',
                0,
                detalle
            )

    # Impide borrar material con movimientos registrados en el historial.
    def destroy(self, request, *args, **kwargs):
        instancia = self.get_object()
        nombre_borrado = instancia.nombre
        codigo_borrado = instancia.codigo_barra
        try:
            self.perform_destroy(instancia)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar este material porque ya tiene registros de entradas, salidas o facturas en el historial."},
                status=status.HTTP_400_BAD_REQUEST
            )

        detalle = f"Material eliminado del catálogo: {nombre_borrado} (Código: {codigo_borrado})"
        registrar_movimiento_catalogo(request.user, None, 'Eliminación de Artículo', 1, detalle)
        return Response(status=status.HTTP_204_NO_CONTENT)
