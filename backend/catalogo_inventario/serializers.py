from rest_framework import serializers
from .models import Categoria, UnidadMedida, Articulo
from usuarios_rbac.validators import validar_texto


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'

    def validate_nombre(self, value):
        nombre_limpio = validar_texto(value).strip()
        qs = Categoria.objects.filter(nombre__iexact=nombre_limpio)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe una categoría registrada con este nombre.")
        return nombre_limpio

class UnidadMedidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnidadMedida
        fields = '__all__'

    def validate_nombre(self, value):
        nombre_limpio = validar_texto(value).strip()
        qs = UnidadMedida.objects.filter(nombre__iexact=nombre_limpio)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe una unidad de medida registrada con este nombre.")
        return nombre_limpio

class ArticuloSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='id_categoria.nombre', read_only=True)
    unidad_nombre = serializers.CharField(source='id_unidad_medida.nombre', read_only=True)
    alerta_stock_minimo = serializers.SerializerMethodField()

    class Meta:
        model = Articulo
        fields = [
            'id_articulo', 'codigo_barra', 'nombre', 'id_categoria', 'categoria_nombre',
            'id_unidad_medida', 'unidad_nombre', 'ubicacion', 'stock_disponible',
            'stock_minimo', 'stock_comprometido', 'precio', 'alerta_stock_minimo'
        ]

    def get_alerta_stock_minimo(self, obj):
        return obj.stock_disponible <= obj.stock_minimo

    def validate_nombre(self, value):
        return validar_texto(value)

    def validate_ubicacion(self, value):
        return validar_texto(value)

    def validate(self, attrs):
        for campo in ['stock_disponible', 'stock_minimo', 'stock_comprometido', 'precio', 'codigo_barra']:
            valor = attrs.get(campo)
            if valor is not None and valor < 0:
                raise serializers.ValidationError({campo: "El valor debe ser un número entero positivo."})
        return attrs