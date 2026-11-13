from rest_framework import viewsets
from rest_framework import serializers
from .models import MovimientoArticulo
from usuarios_rbac.permissions import PermisoArticulos


class MovimientoArticuloSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimientoArticulo
        fields = '__all__'

class CardexViewSet(viewsets.ModelViewSet):
    queryset = MovimientoArticulo.objects.all().order_by('-fecha')
    serializer_class = MovimientoArticuloSerializer
    permission_classes = [PermisoArticulos]
    http_method_names = ['get', 'post', 'head', 'options']
