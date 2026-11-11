from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Usuario, Rol
from .validators import validar_rut, validar_texto


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ['id_rol', 'nombre']

class UsuarioSerializer(serializers.ModelSerializer):
    rol_nombre = serializers.CharField(source='id_rol.nombre', read_only=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)

    class Meta:
        model = Usuario
        fields = [
            'id_usuario', 'nombre', 'rut', 'correo_electronico',
            'password', 'telefono', 'id_rol', 'rol_nombre', 'is_active'
        ]

    def validate_rut(self, value):
        rut_normalizado = validar_rut(value)
        qs = Usuario.objects.filter(rut=rut_normalizado)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un usuario con este RUT.")
        return rut_normalizado

    def validate_nombre(self, value):
        return validar_texto(value)

    def create(self, validated_data):
        password = validated_data.pop('password')
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        return usuario

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['nombre'] = user.nombre
        token['correo'] = user.correo_electronico
        token['rol'] = user.id_rol.nombre
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['usuario'] = {
            'id_usuario': self.user.id_usuario,
            'nombre': self.user.nombre,
            'correo_electronico': self.user.correo_electronico,
            'rol': self.user.id_rol.nombre,
        }
        return data