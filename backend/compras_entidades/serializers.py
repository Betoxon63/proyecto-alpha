from rest_framework import serializers
from .models import Cliente, Proveedor
from usuarios_rbac.validators import validar_rut, validar_texto


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'

    def validate_rut(self, value):
        rut_normalizado = validar_rut(value)
        qs = Cliente.objects.filter(rut=rut_normalizado)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un cliente registrado con este RUT.")
        return rut_normalizado

    def validate_rut_representante(self, value):
        return validar_rut(value)

    def validate_razon_social(self, value):
        return validar_texto(value)

class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'

    def validate_rut(self, value):
        rut_normalizado = validar_rut(value)
        qs = Proveedor.objects.filter(rut=rut_normalizado)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un proveedor registrado con este RUT.")
        return rut_normalizado

    def validate_razon_social(self, value):
        return validar_texto(value)
