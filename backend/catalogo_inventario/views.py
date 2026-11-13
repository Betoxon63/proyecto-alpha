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
        # 1. Definir la consulta base siempre
        queryset = Articulo.objects.select_related('id_categoria', 'id_unidad_medida').all().order_by('nombre')
        
        # 2. Capturar el parámetro de búsqueda
        busqueda = self.request.query_params.get('search')
        
        # 3. Aplicar el filtro si existe búsqueda
        if busqueda:
            queryset = queryset.filter(
                Q(nombre__icontains=busqueda) | Q(codigo_barra__icontains=busqueda)
            )
            
        # 4. Retornar siempre la variable definida
        return queryset
