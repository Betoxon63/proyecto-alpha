from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Usuario, Rol
from .validators import validar_rut, validar_texto


# Prepara la lista de cargos de la empresa para mostrarla en la pantalla.
class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = ['id_rol', 'nombre']


# Valida, crea y actualiza los datos de cada trabajador antes de guardarlos.
class UsuarioSerializer(serializers.ModelSerializer):
    rol_nombre = serializers.CharField(source='id_rol.nombre', read_only=True)
    # La contraseña solo es obligatoria al crear una cuenta nueva y nunca se devuelve en las respuestas.
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Usuario
        fields = [
            'id_usuario', 'nombre', 'rut', 'correo_electronico',
            'password', 'telefono', 'id_rol', 'rol_nombre', 'is_active'
        ]

    # Comprueba que el RUT sea válido y no pertenezca a otro trabajador.
    def validate_rut(self, value):
        rut_normalizado = validar_rut(value)
        qs = Usuario.objects.filter(rut=rut_normalizado)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya hay un trabajador registrado con este RUT.")
        return rut_normalizado

    # Normaliza el correo a mínusculas y verifica que no pertezca a otro trabajador.
    def validate_correo_electronico(self, value):
        correo_limpio = str(value).strip().lower()
        if len(correo_limpio) > 80:
            raise serializers.ValidationError("El correo electrónico es muy largo. No puede superar los 80 caracteres.")
        
        nombre_usuario = correo_limpio.split('@')[0]
        if len(nombre_usuario) < 2 or len(nombre_usuario) > 40:
            raise serializers.ValidationError(
                "El nombre del correo debe tener entre 2 y 40 caracteres."
            )
        
        qs = Usuario.objects.filter(correo_electronico__iexact=correo_limpio)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un trabajador registrado con este correo electrónico.")
        return correo_limpio

    # Verifica que el nombre no contenga símbolos extraños o peligrosos.
    def validate_nombre(self, value):
        nombre_limpio = validar_texto(value).strip()
        if len(nombre_limpio) < 3:
            raise serializers.ValidationError("El nombre debe tener al menos 3 caracteres.")
        if len(nombre_limpio) > 80:
            raise serializers.ValidationError("El nombre no puede superar los 80 caracteres.")
        return nombre_limpio

    # Comprueba que el teléfono sea válido.
    def validate_telefono(self, value):
        if value is None:
            return value
        if value < 10000000 or value > 999999999:
            raise serializers.ValidationError(
                "Ingrese un teléfono válido de 8 o 9 dígitos sin el código +56 (ejemplo: 912345678)."
            )
        return value

    # Evita que Soporte Técnico asigne el cargo de Administrador o cambie su propio cargo.
    def validate_id_rol(self, value):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            if request.user.id_rol.nombre == Rol.SOPORTE_TI:
                if value.nombre == Rol.ADMIN:
                    raise serializers.ValidationError(
                        "Soporte Técnico no tiene permiso para asignar el cargo de Administrador."
                    )
                if self.instance and self.instance.pk == request.user.pk and value != self.instance.id_rol:
                    raise serializers.ValidationError(
                        "No puede cambiar su propio cargo de usuario."
                    )
        return value

    # Verifica las reglas de contraseña.
    def validate(self, attrs):
        password = attrs.get('password', '')
        password_limpia = password.strip() if isinstance(password, str) else ''

        if self.instance is None:
            if len(password_limpia) < 8:
                raise serializers.ValidationError({
                    "password": "Debe escribir una contraseña de al menos 8 caracteres para el nuevo trabajador."
                })
            if len(password_limpia) > 64:
                raise serializers.ValidationError({
                    "password": "La contraseña no puede superar los 64 caracteres."
                })
        else:
            if password_limpia and len(password_limpia) < 8:
                raise serializers.ValidationError({
                    "password": "La nueva contraseña debe tener al menos 8 caracteres."
                })
            if password_limpia and len(password_limpia) > 64:
                raise serializers.ValidationError({
                    "password": "La nueva contraseña no puede superar los 64 caracteres."
                })

        return attrs

    # Guarda un trabajador nuevo asegurándose de encriptar su contraseña.
    def create(self, validated_data):
        password = validated_data.pop('password').strip()
        usuario = Usuario(**validated_data)
        usuario.set_password(password)
        usuario.save()
        return usuario

    # Actualiza los datos de un trabajador existente.
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password and password.strip():
            instance.set_password(password.strip())
        instance.save()
        return instance


# Entrega los datos del trabajador y su cargo cuando inicia sesión.
class LoginSerializer(TokenObtainPairSerializer):
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


# Alias temporal para mantener compatibilidad.
CustomTokenObtainPairSerializer = LoginSerializer