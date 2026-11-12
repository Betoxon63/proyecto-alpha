# obras_despachos/serializers.py
from rest_framework import serializers
from .models import Obra, TipoServicio
from compras_entidades.models import Cliente

class TipoServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoServicio
        fields = '__all__'

class ObraSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source='id_cliente.nombre', read_only=True)
    tipo_servicio_nombre = serializers.CharField(source='id_tipo_servicio.nombre', read_only=True)

    class Meta:
        model = Obra
        fields = ['id_obra', 'fecha_inicio', 'id_cliente', 'cliente_nombre', 'tecnico_asociado', 'id_tipo_servicio', 'tipo_servicio_nombre', 'estado']