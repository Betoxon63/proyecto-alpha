"""
Vistas y Controladores REST para el Catálogo de Insumos y Repuestos - Proyecto Alpha (FYAG SpA).

Endpoints disponibles:
- /api/categorias/       : Clasificación de insumos (ej. 'Refrigeración', 'Eléctrico').
- /api/unidades-medida/  : Unidades de control de inventario (ej. 'un', 'mts', 'kg').
- /api/articulos/        : Catálogo de artículos con control de stock mínimo y código de barras (HU-01, HU-02, HU-03).
"""

from django.db.models import Q
from rest_framework import viewsets
from .models import Categoria, UnidadMedida, Articulo
from .serializers import CategoriaSerializer, UnidadMedidaSerializer, ArticuloSerializer
from usuarios_rbac.permissions import PermisoArticulos


class CategoriaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la consulta y administración de categorías de artículos.
    
    Protegido por `PermisoArticulos` (RBAC).
    """
    queryset = Categoria.objects.all().order_by('nombre')
    serializer_class = CategoriaSerializer
    permission_classes = [PermisoArticulos]


class UnidadMedidaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la consulta y administración de unidades de medida físicas.
    
    Protegido por `PermisoArticulos` (RBAC).
    """
    queryset = UnidadMedida.objects.all().order_by('nombre')
    serializer_class = UnidadMedidaSerializer
    permission_classes = [PermisoArticulos]


class ArticuloViewSet(viewsets.ModelViewSet):
    """
    ViewSet para el catálogo maestro de artículos y repuestos (HU-01, HU-02, HU-03).
    
    Características:
    - Búsqueda en tiempo real mediante `?search=` sobre nombre o código de barra numérico.
    - Marcador `alerta_stock_minimo`: Calculado dinámicamente si `stock_disponible <= stock_minimo`.
    - Optimización: Inclusión de categorías y unidades de medida mediante `select_related`.
    """
    serializer_class = ArticuloSerializer
    permission_classes = [PermisoArticulos]

    def get_queryset(self):
        """Retorna artículos con soporte de filtro de búsqueda textual y por código de barra."""
        queryset = Articulo.objects.select_related('id_categoria', 'id_unidad_medida').all().order_by('nombre')
        busqueda = self.request.query_params.get('search')
        if busqueda:
            queryset = queryset.filter(
                Q(nombre__icontains=busqueda) | Q(codigo_barra__icontains=busqueda)
            )
        return queryset
