"""
Serializadores para el módulo de Obras y Despachos a Faena - Proyecto Alpha (FYAG SpA).

Implementa las reglas de negocio:
- HU-05: Imputación de insumos y repuestos a proyectos/faenas específicas.
- HU-09: Identificación de clientes, servicios y técnicos asociados.
- HU-10: Firma conforme y trazabilidad del documento de respaldo (Guía de Despacho).
"""

from rest_framework import serializers
from .models import TipoServicio, Obra, DetalleObra
from catalogo_inventario.models import Articulo
from usuarios_rbac.validators import validar_texto


class TipoServicioSerializer(serializers.ModelSerializer):
    """
    Serializador para los tipos de servicio prestados (Instalación, Mantención Preventiva, Correctiva, etc.).
    """
    class Meta:
        model = TipoServicio
        fields = '__all__'

    def validate_nombre(self, value):
        """Valida que el nombre no contenga caracteres potencialmente maliciosos."""
        return validar_texto(value)


class DetalleObraSerializer(serializers.ModelSerializer):
    """
    Serializador para las líneas de artículos imputados a una obra específica.
    
    Campos calculados de solo lectura:
    - articulo_nombre: Nombre legible del insumo.
    - codigo_barra: Código de barras del insumo.
    - unidad_nombre: Unidad de medida (ej. 'un', 'mts', 'kg').
    """
    articulo_nombre = serializers.CharField(source='id_articulo.nombre', read_only=True)
    codigo_barra = serializers.IntegerField(source='id_articulo.codigo_barra', read_only=True)
    unidad_nombre = serializers.CharField(source='id_articulo.id_unidad_medida.nombre', read_only=True)

    class Meta:
        model = DetalleObra
        fields = [
            'id_detalle_obra', 'id_articulo', 'articulo_nombre',
            'codigo_barra', 'unidad_nombre', 'id_obra', 'cantidad'
        ]

    def validate_cantidad(self, value):
        """Garantiza que la cantidad imputada a la obra sea un entero estrictamente positivo."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("La cantidad despachada debe ser mayor a cero.")
        return value


class ObraSerializer(serializers.ModelSerializer):
    """
    Serializador para la entidad Obra / Faena de refrigeración.
    
    Expone campos enriquecidos para la interfaz frontend:
    - codigo: Formato estandarizado 'OBRA-YYYY-ID' (ej. OBRA-2026-01).
    - nombre: Nombre compuesto 'Servicio - Razón Social Cliente'.
    - cliente_nombre / ubicacion: Datos derivados del cliente asociado.
    - detalles: Lista anidada de los insumos y materiales despachados a esta obra.
    """
    cliente_nombre = serializers.CharField(source='id_cliente.razon_social', read_only=True)
    ubicacion = serializers.CharField(source='id_cliente.ciudad', read_only=True)
    tipo_servicio_nombre = serializers.CharField(source='id_tipo_servicio.nombre', read_only=True)
    detalles = DetalleObraSerializer(many=True, read_only=True)
    codigo = serializers.SerializerMethodField()
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = Obra
        fields = [
            'id_obra', 'codigo', 'nombre', 'fecha_inicio', 'id_cliente',
            'cliente_nombre', 'ubicacion', 'tecnico_asociado',
            'id_tipo_servicio', 'tipo_servicio_nombre', 'estado', 'detalles'
        ]

    def get_codigo(self, obj):
        """Genera el código comercial de la faena."""
        anio = obj.fecha_inicio.year if obj.fecha_inicio else 2026
        return f"OBRA-{anio}-{obj.id_obra:02d}"

    def get_nombre(self, obj):
        """Retorna una etiqueta descriptiva del servicio y cliente."""
        return f"{obj.id_tipo_servicio.nombre} - {obj.id_cliente.razon_social}"

    def validate_tecnico_asociado(self, value):
        """Valida sanitización del nombre del técnico responsable."""
        return validar_texto(value)

    def validate_estado(self, value):
        """Valida que el estado de la faena sea seguro."""
        return validar_texto(value)


class DespachoObraInputSerializer(serializers.Serializer):
    """
    Serializador de entrada para la operación de despacho de insumos hacia una obra (POST /api/obras/{id}/despachar/).
    
    Atributos:
    - id_articulo: Llave foránea del insumo que sale de bodega.
    - cantidad: Número de unidades solicitadas (mínimo 1).
    - motivo: Justificación opcional del movimiento.
    - tecnico_receptor: Nombre del técnico que recepciona en faena.
    - documento_respaldo: Número de Guía de Despacho (ej. 'GD-001540').
    """
    id_articulo = serializers.PrimaryKeyRelatedField(queryset=Articulo.objects.all())
    cantidad = serializers.IntegerField(min_value=1)
    motivo = serializers.CharField(required=False, allow_blank=True, default='')
    tecnico_receptor = serializers.CharField(required=False, allow_blank=True, default='')
    documento_respaldo = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_motivo(self, value):
        """Sanitiza el motivo del movimiento."""
        return validar_texto(value)

    def validate_tecnico_receptor(self, value):
        """Sanitiza el nombre del receptor en terreno."""
        return validar_texto(value)

    def validate_documento_respaldo(self, value):
        """Sanitiza el folio del documento de respaldo."""
        return validar_texto(value)
