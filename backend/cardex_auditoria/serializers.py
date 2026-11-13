"""
Serializadores para el módulo de Cardex y Auditoría Inalterable - Proyecto Alpha (FYAG SpA).

Implementa las especificaciones técnicas:
- HU-11: Motor Cardex Append-Only de registro inalterable de movimientos físicos.
- Trazabilidad total: ID de usuario responsable, cargo, fecha-hora exacta, documento de respaldo y motivo.
- Compatibilidad dual con frontend web/móvil: Acepta tanto IDs como nombres descriptivos de tipo de movimiento.
"""

import re
from django.utils import timezone
from rest_framework import serializers
from .models import TipoMovimiento, MovimientoArticulo
from usuarios_rbac.validators import validar_texto


class TipoMovimientoSerializer(serializers.ModelSerializer):
    """
    Serializador para las tipologías de movimiento de inventario ('Entrada', 'Salida', 'Merma').
    """
    class Meta:
        model = TipoMovimiento
        fields = '__all__'

    def validate_nombre(self, value):
        """Valida que el nombre del tipo de movimiento no contenga caracteres inválidos."""
        return validar_texto(value)


class MovimientoArticuloSerializer(serializers.ModelSerializer):
    """
    Serializador principal del Cardex de Artículos (HU-11).
    
    Campos calculados y enriquecidos:
    - id_movimiento: Código formateado con prefijo (ej. 'MOV-000123').
    - fecha_hora: Fecha y hora en zona horaria local con formato legible 'YYYY-MM-DD HH:MM'.
    - usuario_responsable / cargo: Nombre y perfil del usuario autenticado que emitió el movimiento.
    - articulo_codigo / articulo_nombre / articulo_detalle / unidad_medida: Metadatos del insumo afectado.
    - tipo_movimiento: Nombre del tipo ('Entrada', 'Salida', 'Merma').
    - obra_destino: Nombre de la faena imputada o 'Bodega Central'.
    - documento_respaldo: Extraído automáticamente de patrones '(FOLIO)' en el campo motivo o folio MOV.
    
    Entrada flexible:
    - Permite enviar `tipo_movimiento_nombre` (string) cuando el cliente no dispone del ID relacional.
    """
    id_movimiento = serializers.SerializerMethodField()
    fecha_hora = serializers.SerializerMethodField()
    usuario_responsable = serializers.CharField(source='id_usuario.nombre', read_only=True)
    cargo = serializers.CharField(source='id_usuario.id_rol.get_nombre_display', read_only=True)
    articulo_nombre = serializers.CharField(source='id_articulo.nombre', read_only=True)
    articulo_codigo = serializers.SerializerMethodField()
    articulo_detalle = serializers.CharField(source='id_articulo.id_categoria.nombre', read_only=True)
    unidad_medida = serializers.CharField(source='id_articulo.id_unidad_medida.nombre', read_only=True)
    tipo_movimiento = serializers.CharField(source='id_tipo_movimiento.nombre', read_only=True)
    obra_destino = serializers.SerializerMethodField()
    documento_respaldo = serializers.SerializerMethodField()

    id_tipo_movimiento = serializers.PrimaryKeyRelatedField(
        queryset=TipoMovimiento.objects.all(),
        required=False,
        allow_null=True,
    )
    tipo_movimiento_nombre = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = MovimientoArticulo
        fields = [
            'id_movimiento_articulo', 'id_movimiento', 'fecha', 'fecha_hora',
            'id_usuario', 'usuario_responsable', 'cargo',
            'id_articulo', 'articulo_nombre', 'articulo_codigo', 'articulo_detalle', 'unidad_medida',
            'id_tipo_movimiento', 'tipo_movimiento', 'tipo_movimiento_nombre',
            'id_obra', 'obra_destino', 'cantidad', 'motivo', 'documento_respaldo'
        ]
        read_only_fields = ['id_usuario', 'fecha']

    def get_id_movimiento(self, obj):
        """Genera el código de folio visual para el registro de auditoría."""
        return f"MOV-{obj.id_movimiento_articulo:06d}"

    def get_fecha_hora(self, obj):
        """Formatea la fecha del movimiento a la zona horaria local chilena."""
        if not obj.fecha:
            return ''
        return timezone.localtime(obj.fecha).strftime('%Y-%m-%d %H:%M')

    def get_articulo_codigo(self, obj):
        """Retorna el código de barra como identificador principal del artículo."""
        return str(obj.id_articulo.codigo_barra)

    def get_obra_destino(self, obj):
        """Identifica la faena de destino o indica 'Bodega Central' si no tiene obra asociada."""
        if obj.id_obra:
            return f"{obj.id_obra.id_tipo_servicio.nombre} - {obj.id_obra.id_cliente.razon_social}"
        return "Bodega Central"

    def get_documento_respaldo(self, obj):
        """
        Extrae el identificador del documento de respaldo (Guía de Despacho o Factura)
        usando la convención de prefijo '(DOC_ID)' dentro de la glosa del motivo.
        """
        coincidencia = re.match(r'^\(([A-Za-z0-9\-_]+)\)', obj.motivo or '')
        if coincidencia:
            return coincidencia.group(1)
        return f"MOV-{obj.id_movimiento_articulo:06d}"

    def validate_cantidad(self, value):
        """Garantiza que la variación de stock no sea nula (cero)."""
        if value == 0:
            raise serializers.ValidationError("La cantidad del movimiento no puede ser cero.")
        return value

    def validate_motivo(self, value):
        """Asegura que todo movimiento posea una justificación textual debidamente sanitizada."""
        if not value or not str(value).strip():
            raise serializers.ValidationError("El motivo o justificación del movimiento es obligatorio.")
        return validar_texto(value)

    def validate(self, attrs):
        """Valida que se haya suministrado al menos un tipo de movimiento (por ID o por nombre)."""
        id_tipo = attrs.get('id_tipo_movimiento')
        nombre_tipo = attrs.get('tipo_movimiento_nombre', '').strip()
        if not id_tipo and not nombre_tipo:
            raise serializers.ValidationError({
                'id_tipo_movimiento': "Debe indicar el tipo de movimiento."
            })
        return attrs
