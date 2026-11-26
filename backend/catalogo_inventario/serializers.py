from rest_framework import serializers
from .models import Categoria, UnidadMedida, Articulo
from usuarios_rbac.models import Rol
from usuarios_rbac.validators import validar_texto


# Valida el nombre de cada categoría evitando duplicados y textos extensos.
class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'

    def validate_nombre(self, value):
        nombre_limpio = validar_texto(value).strip()
        if len(nombre_limpio) < 2 or len(nombre_limpio) > 50:
            raise serializers.ValidationError("El nombre de la categoría debe tener entre 2 y 50 caracteres.")
        
        qs = Categoria.objects.filter(nombre__iexact=nombre_limpio)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe una categoría registrada con este nombre.")
        return nombre_limpio


# Valida el nombre de cada unidad de medida evitando duplicados y símbolos no permitidos.
class UnidadMedidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnidadMedida
        fields = '__all__'

    def validate_nombre(self, value):
        nombre_limpio = validar_texto(value).strip()
        if len(nombre_limpio) < 1 or len(nombre_limpio) > 50:
            raise serializers.ValidationError("El nombre de la unidad de medida debe tener entre 1 y 50 caracteres.")

        qs = UnidadMedida.objects.filter(nombre__iexact=nombre_limpio)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe una unidad de medida registrada con este nombre.")
        return nombre_limpio


# Prepara, valida y protege los datos de cada material del catálogo de bodega.
class ArticuloSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='id_categoria.nombre', read_only=True)
    unidad_nombre = serializers.CharField(source='id_unidad_medida.nombre', read_only=True)
    # Indica si el material llegó a su mínimo o se quedó en cero.
    alerta_stock_minimo = serializers.SerializerMethodField()
    # Entrega los 3 estados visuales oficiales (Agotado, Stock Bajo o Stock Normal).
    estado_stock = serializers.SerializerMethodField()
    # Calcula cuántas unidades faltan como mínimo para cubrir el stock mínimo y lo comprometido.
    faltante_reposicion = serializers.SerializerMethodField()

    class Meta:
        model = Articulo
        fields = [
            'id_articulo', 'codigo_barra', 'nombre', 'id_categoria', 'categoria_nombre',
            'id_unidad_medida', 'unidad_nombre', 'ubicacion', 'stock_disponible',
            'stock_minimo', 'stock_comprometido', 'precio',
            'alerta_stock_minimo', 'estado_stock', 'faltante_reposicion'
        ]

    # Devuelve un aviso cuando el stock disponible está en cero o bajo el mínimo.
    def get_alerta_stock_minimo(self, obj):
        return obj.stock_disponible <= obj.stock_minimo

    # Clasifica el estado actual del material en (Agotado, Stock Bajo, Stock Normal).
    def get_estado_stock(self, obj):
        if obj.stock_disponible == 0:
            return 'Agotado'
        if obj.stock_disponible <= obj.stock_minimo:
            return 'Stock Bajo'
        return 'Stock Normal'

    # Sugiere cantidad de unidades mínimas a reponer cuando el stock es bajo.
    def get_faltante_reposicion(self, obj):
        objetivo = obj.stock_minimo + obj.stock_comprometido
        return max(0, objetivo - obj.stock_disponible)

    # Oculta el precio unitario al Supervisor de Obra.
    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            if request.user.id_rol.nombre == Rol.SUPERVISOR:
                data.pop('precio', None)
        return data

    # Revisa que el código de barras sea un número positivo válido y único.
    def validate_codigo_barra(self, value):
        if value is None or value <= 0 or value > 999999999999999:
            raise serializers.ValidationError("El código de barras debe ser un número positivo de hasta 15 dígitos.")
        qs = Articulo.objects.filter(codigo_barra=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe otro material registrado con este código de barras.")
        return value

    # Comprueba el largo y los caracteres permitidos.
    def validate_nombre(self, value):
        nombre_limpio = validar_texto(value).strip()
        if len(nombre_limpio) < 3 or len(nombre_limpio) > 100:
            raise serializers.ValidationError("El nombre del material debe tener entre 3 y 100 caracteres.")
        return nombre_limpio

    # Comprueba el largo y los caracteres permitidos.
    def validate_ubicacion(self, value):
        ubicacion_limpia = validar_texto(value).strip()
        if len(ubicacion_limpia) < 2 or len(ubicacion_limpia) > 80:
            raise serializers.ValidationError("La ubicación debe tener entre 2 y 80 caracteres.")
        return ubicacion_limpia

    # Aplica topes seguros a las cantidades y protege stock y precios al editar desde bodega.
    def validate(self, attrs):
        for campo in ['stock_disponible', 'stock_minimo', 'stock_comprometido']:
            valor = attrs.get(campo)
            if valor is not None and (valor < 0 or valor > 1000000):
                raise serializers.ValidationError({
                    campo: "La cantidad debe estar entre 0 y 1.000.000 de unidades."
                })

        precio = attrs.get('precio')
        if precio is not None and (precio < 0 or precio > 999999999):
            raise serializers.ValidationError({
                "precio": "El precio debe estar entre $0 y $999.999.999."
            })

        # Al editar un material ya creado el Encargado de Bodega no puede alterar manualmente el Stock ni el precio sin respaldo de factura.
        request = self.context.get('request')
        if self.instance and request and request.user and request.user.is_authenticated:
            if request.user.id_rol.nombre == Rol.BODEGA:
                if 'precio' in attrs and attrs['precio'] != self.instance.precio:
                    raise serializers.ValidationError({
                        "precio": "Solo Administración puede modificar el precio manualmente. El precio se actualiza al confirmar la recepción de una compra."
                    })
                if 'stock_disponible' in attrs and attrs['stock_disponible'] != self.instance.stock_disponible:
                    raise serializers.ValidationError({
                        "stock_disponible": "No puede editar el stock disponible manualmente. Use Solicitudes, Despachos, Mermas o Devoluciones."
                    })
                if 'stock_comprometido' in attrs and attrs['stock_comprometido'] != self.instance.stock_comprometido:
                    raise serializers.ValidationError({
                        "stock_comprometido": "Solo Administración puede ajustar el stock comprometido desde el catálogo."
                    })
                
        return attrs