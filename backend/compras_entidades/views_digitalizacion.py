"""
Controlador API para el procesamiento y digitalización de documentos mediante Inteligencia Artificial.
Permite recibir imágenes de Guías de Despacho del SII o Facturas en papel, procesarlas con el modelo
local de visión Ollama (qwen2.5vl:3b), y enlazar automáticamente los datos extraídos con los registros
existentes en la base de datos de FYAG SpA (proveedores y catálogo de inventario).
"""

import os
import sys
import re
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import Proveedor
from catalogo_inventario.models import Articulo

# Carga dinámica del módulo central de IA ubicado en IA-digitalizacion
# Esto mantiene la lógica del extractor desacoplada y centralizada en una sola carpeta
RUTA_IA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "IA-digitalizacion"))
if RUTA_IA not in sys.path:
    sys.path.insert(0, RUTA_IA)

try:
    from extractor import ExtractorDocumentos, formatear_rut, limpiar_rut
except ImportError:
    # Manejo de contingencia si la carpeta del extractor no estuviese presente
    ExtractorDocumentos = None
    formatear_rut = lambda r: r
    limpiar_rut = lambda r: r


class DigitalizarDocumentoView(APIView):
    """
    Endpoint: POST /api/digitalizacion/analizar/
    Acceso: Requiere autenticación JWT activa.
    
    Flujo de trabajo:
    1. Recibe la imagen capturada (cámara del celular o archivo) en formato base64.
    2. Envía la imagen al modelo de visión artificial local (Ollama qwen2.5vl:3b).
    3. Normaliza moneda chilena (CLP), cantidades, descripciones y descuentos por ítem.
    4. Cruza el RUT del emisor con la tabla 'proveedor' de Django para saber si ya existe.
    5. Cruza cada producto detectado con la tabla 'articulo' del catálogo para sugerir el ID correspondiente.
    6. Retorna un objeto JSON estructurado listo para ser revisado o cargado al formulario de compras.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # 0. Verificación de estado de la IA (Interruptor Maestro)
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT valor FROM configuracion_sistema WHERE clave = 'IA_DIGITALIZACION_ACTIVA';")
                row = cursor.fetchone()
                if row and row[0].lower() != 'true':
                    return Response(
                        {"detail": "El servicio de digitalización con IA está desactivado."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE
                    )
        except Exception:
            # Si la tabla aún no existe o falla la lectura, se permite continuar por defecto
            pass

        # 1. Validación de disponibilidad del motor de IA
        if not ExtractorDocumentos:
            return Response(
                {"detail": "El módulo de digitalización IA no está disponible en el servidor."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # 2. Validación de entrada de datos
        imagen_b64 = request.data.get('imagen_b64')
        if not imagen_b64:
            return Response(
                {"detail": "No se proporcionó la imagen en formato base64."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Limpiar prefijo data URL si viene desde un FileReader de HTML5 (data:image/jpeg;base64,...)
        if "," in imagen_b64:
            imagen_b64 = imagen_b64.split(",")[1]

        # 3. Procesamiento mediante visión artificial (Gemini Cloud o Ollama Local)
        motor_seleccionado = request.data.get('motor', 'auto')
        try:
            extractor = ExtractorDocumentos()
            resultado = extractor.procesar_imagen_base64(imagen_b64, motor_preferido=motor_seleccionado)
        except Exception as e:
            return Response(
                {"detail": f"Error al procesar la imagen con el motor de IA ({motor_seleccionado}): {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # 4. Enlace con la base de datos de Proveedores de Django
        prov_data = resultado.get("proveedor", {})
        rut_prov = prov_data.get("rut", "")
        rut_limpio = limpiar_rut(rut_prov) if rut_prov else ""

        prov_db = None
        if rut_limpio:
            # Buscar coincidencia exacta o por dígitos limpios en la base de datos
            for prov in Proveedor.objects.all():
                if limpiar_rut(prov.rut) == rut_limpio:
                    prov_db = prov
                    break

        if prov_db:
            # Proveedor ya registrado en el sistema: adjuntar IDs oficiales
            resultado["proveedor"]["existe_db"] = True
            resultado["proveedor"]["id_proveedor"] = prov_db.id_proveedor
            resultado["proveedor"]["razon_social"] = prov_db.razon_social
            resultado["proveedor"]["direccion"] = prov_db.direccion
            resultado["proveedor"]["ciudad"] = prov_db.ciudad
            resultado["proveedor"]["comuna"] = prov_db.comuna
        else:
            # Proveedor no registrado: se marca para permitir registro con un clic
            resultado["proveedor"]["existe_db"] = False
            resultado["proveedor"]["id_proveedor"] = None

        # 5. Enlace con la base de datos de Artículos del Catálogo
        articulos_db = list(Articulo.objects.all())
        for item in resultado.get("items", []):
            cod_extraido = str(item.get("codigo", "") or "").strip().lower()
            desc_extraida = str(item.get("descripcion", "") or "").strip().lower()

            art_encontrado = None
            # Prioridad 1: Buscar coincidencia exacta por código de barra o código interno
            if cod_extraido:
                art_encontrado = next(
                    (a for a in articulos_db if str(getattr(a, 'codigo_barra', '') or getattr(a, 'codigo_interno', '')).lower() == cod_extraido),
                    None
                )
            # Prioridad 2: Buscar coincidencia parcial por nombre del material
            if not art_encontrado and desc_extraida:
                art_encontrado = next(
                    (a for a in articulos_db if a.nombre and (a.nombre.lower() in desc_extraida or desc_extraida in a.nombre.lower())),
                    None
                )

            if art_encontrado:
                item["id_articulo"] = art_encontrado.id_articulo
                item["articulo_nombre_db"] = art_encontrado.nombre
                item["stock_actual"] = art_encontrado.stock_disponible
                item["existe_db"] = True
            else:
                item["id_articulo"] = None
                item["existe_db"] = False

        # 6. Retorno de datos estructurados para el modal de revisión en el frontend
        return Response(resultado, status=status.HTTP_200_OK)
