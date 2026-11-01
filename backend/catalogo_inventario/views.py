from django.db.models import Q
from rest_framework import viewsets
from .models import Categoria, UnidadMedida, Articulo
from .serializers import CategoriaSerializer, UnidadMedidaSerializer, ArticuloSerializer
from usuarios_rbac.permissions import PermisoArticulos


class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all().order_by('nombre')
    serializer_class = CategoriaSerializer
    permission_classes = [PermisoArticulos]

class UnidadMedidaViewSet(viewsets.ModelViewSet):
    queryset = UnidadMedida.objects.all().order_by('nombre')
    serializer_class = UnidadMedidaSerializer
    permission_classes = [PermisoArticulos]

class ArticuloViewSet(viewsets.ModelViewSet):
    serializer_class = ArticuloSerializer
    permission_classes = [PermisoArticulos]

    def get_queryset(self):
        self.queryset = Articulo.objects.select_related('id_categoria', 'id_unidad_medida').all().order_by('nombre')
        busqueda = self.request.query_params.get('search')
        if busqueda:
            queryset = queryset.filter(
                Q(nombre__icontains=busqueda) | Q(codigo_barra__icontains=busqueda)
            )
        return queryset
