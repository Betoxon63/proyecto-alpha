"""
Módulo de extracción de datos de documentos tributarios y mercantiles chilenos mediante IA Híbrida.
Soporta dos motores de Inteligencia Artificial:
  1. Google Gemini (Cloud Vision, modelo gemini-3-flash-preview o gemini-3.8-flash): Alta velocidad y máxima precisión.
  2. Ollama Local (Visión Edge, modelo qwen2.5vl:3b): Funcionamiento 100% offline sin conexión a internet.

Optimizado para:
  - Guías de Despacho Electrónicas del SII (Chile).
  - Facturas Electrónicas de Proveedores y Materiales de Construcción.
  - Soportes y Vales de Entrega en Bodega.
"""

import os
import io
import re
import json
import base64
import sqlite3
import urllib.request
import urllib.error
from PIL import Image

# Cargar automáticamente variables de entorno desde .env si existe
try:
    from dotenv import load_dotenv
    for ruta_env in [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", ".env")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), ".env")),
    ]:
        if os.path.exists(ruta_env):
            load_dotenv(ruta_env)
except ImportError:
    pass

# Configuración de Google Gemini API
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview").strip()
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"

# Configuración de Ollama Local (IPv4 explícito para evitar problemas de resolución en Windows)
OLLAMA_API_URL = os.environ.get("OLLAMA_API_URL", "http://127.0.0.1:11434/api/chat")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5vl:3b")

PROMPT_EXTRACCION = """Eres un experto auditor tributario chileno especializado en digitalización de Guías de Despacho Electrónicas del SII y Facturas Electrónicas de compra de materiales de construcción e insumos industriales.
Examina la imagen detalladamente y extrae los datos con MÁXIMA PRECISIÓN en formato JSON estricto con esta estructura:
{
  "proveedor": {
    "razon_social": "Razón social del emisor/vendedor que aparece en la cabecera superior",
    "rut": "RUT del emisor ubicado en el recuadro rojo superior derecho (ej: 76.543.210-3)",
    "giro": "Giro comercial si aparece en el encabezado",
    "direccion": "Dirección física del emisor",
    "comuna": "Comuna del emisor",
    "ciudad": "Ciudad del emisor",
    "region": "Región del emisor"
  },
  "documento": {
    "tipo": "Guía de Despacho Electrónica o Factura Electrónica",
    "numero_documento": "Número de folio del documento (ej: 1203)",
    "fecha": "Fecha de emisión en formato YYYY-MM-DD o DD/MM/YYYY"
  },
  "cliente_receptor": {
    "nombre": "Razón social de la empresa compradora en SEÑOR(ES)",
    "rut": "RUT del comprador (ej: 77.812.455-6)",
    "direccion": "Dirección de destino u obra"
  },
  "items": [
    {
      "codigo": "Código del producto (ej: CEM-25, FIE-12, CLA-3)",
      "descripcion": "Descripción textual exacta del producto",
      "cantidad": 120,
      "unidad_medida": "UN, SACO, CJ, M, BOT, etc",
      "precio_unitario": 4290,
      "descuento_porcentaje": 0,
      "descuento_monto": 0,
      "total": 514800
    }
  ],
  "totales": {
    "neto": 2352400,
    "iva": 446956,
    "total": 2799356
  }
}

REGLAS DE CALIBRACIÓN Y EXACTITUD ESTRICTAS:
1. DISTINCIÓN EMISOR vs RECEPTOR:
   - PROVEEDOR (Emisor): Empresa que emite el documento en la cabecera. Su RUT está SIEMPRE en el recuadro rojo 'R.U.T.: XX.XXX.XXX-X' arriba a la derecha.
   - CLIENTE (Receptor): Empresa que recibe la mercadería indicada en la sección 'SEÑOR(ES):'. Su RUT está en el renglón 'R.U.T.:' debajo de Señor(es). ¡NUNCA confundas los RUTs ni las direcciones de ambas partes!
2. NÚMERO DE DOCUMENTO (FOLIO):
   - Extrae el número impreso en rojo debajo de 'GUÍA DE DESPACHO ELECTRÓNICA' o 'FACTURA ELECTRÓNICA' (ejemplo: 'N° 1203' -> número_documento: '1203').
3. MONEDA CHILENA (CLP):
   - Todos los precios y totales deben ser números ENTEROS positivos sin decimales ni símbolos monetarios ni puntos (ejemplo: '$4.290' -> 4290, '$576.840' -> 576840).
4. PRECISIÓN DÍGITO A DÍGITO EN CADA ÍTEM:
   - Extrae TODAS y cada una de las líneas de la tabla de detalle de materiales.
   - Si una línea tiene descuento (ejemplo: '5%' y '$30.360'), asigna descuento_porcentaje: 5 y descuento_monto: 30360. Si no tiene descuento, pon 0.
   - Verifica la consistencia matemática: Total = (Cantidad * Precio Unitario) - Descuento Monto.
5. TEXTOS Y MEDIDAS:
   - Si hay comillas en pulgadas (ejemplo: 3" o 1/2"), reemplázalas por 'pulg' (ej: 'Clavo corriente 3 pulg caja 25 kg') para no romper el formato JSON.
6. FORMATO DE RESPUESTA:
   - Responde EXCLUSIVAMENTE con el objeto JSON válido, sin preámbulos, explicaciones ni caracteres fuera del bloque JSON."""


def limpiar_rut(rut_str: str) -> str:
    """Limpia el RUT dejando solo dígitos y K mayúscula sin puntos ni guión."""
    if not rut_str:
        return ""
    return re.sub(r'[^0-9kK]', '', str(rut_str)).upper()


def formatear_rut(rut_str: str) -> str:
    """Formatea un RUT al estilo 76.543.210-K si corresponde."""
    limpio = limpiar_rut(rut_str)
    if len(limpio) < 2:
        return limpio
    cuerpo, dv = limpio[:-1], limpio[-1]
    invertido = cuerpo[::-1]
    partes = [invertido[i:i+3] for i in range(0, len(invertido), 3)]
    cuerpo_formateado = ".".join(partes)[::-1]
    return f"{cuerpo_formateado}-{dv}"


def normalizar_imagen_bytes(imagen_bytes: bytes) -> str:
    """Asegura que la imagen sea RGB JPEG de alta calidad y resolución balanceada."""
    img = Image.open(io.BytesIO(imagen_bytes))
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Escalar para máxima nitidez en el modelo de visión sin saturar memoria
    w, h = img.size
    if w < 700:
        factor = 900 / float(w)
        img = img.resize((900, int(h * factor)), Image.Resampling.LANCZOS)
    elif w > 1600:
        factor = 1600 / float(w)
        img = img.resize((1600, int(h * factor)), Image.Resampling.LANCZOS)

    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=90)
    return base64.b64encode(buf.getvalue()).decode('utf-8')


def _parsear_json_resiliente(texto: str) -> dict:
    """Parsea una cadena a JSON con tolerancia a bloques markdown, comillas y caracteres especiales."""
    if not texto:
        return {}
    txt = texto.strip()
    if txt.startswith("```json"): txt = txt[7:]
    if txt.startswith("```"): txt = txt[3:]
    if txt.endswith("```"): txt = txt[:-3]
    txt = txt.strip()

    try:
        return json.loads(txt, strict=False)
    except Exception:
        # Limpieza de caracteres de control
        limpio = re.sub(r'[\x00-\x09\x0b-\x1f\x7f-\x9f]', ' ', txt)
        # Convertir medidas en pulgadas (ej: 3" -> 3 pulg)
        limpio = re.sub(r'(\d+)"', r"\1 pulg", limpio)
        # Quitar comas sobrantes antes de llaves o corchetes
        limpio = re.sub(r',\s*([}\]])', r'\1', limpio)
        try:
            return json.loads(limpio, strict=False)
        except Exception:
            # Buscar el bloque principal { ... }
            m = re.search(r'(\{[\s\S]*\})', limpio)
            if m:
                return json.loads(m.group(1), strict=False)
            raise


class ExtractorDocumentos:
    """
    Motor híbrido de digitalización documental inteligente.
    Combina Google Gemini (en la nube) y Ollama (en local) con consulta a la base de datos de FYAG SpA.
    """

    def __init__(self, db_path=None, gemini_api_key=None):
        if not db_path:
            posible_db = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "db.sqlite3"))
            self.db_path = posible_db if os.path.exists(posible_db) else None
        else:
            self.db_path = db_path

        self.gemini_key = (gemini_api_key or GEMINI_API_KEY or "").strip()

    def verificar_proveedor_existente(self, rut: str) -> dict:
        """
        Consulta en la base de datos si el proveedor ya existe por RUT.
        Prioriza el ORM de Django para respetar automáticamente la conexión configurada
        por el equipo (DATABASE_URL en Supabase, PostgreSQL, MySQL o SQLite).
        """
        rut_limpio = limpiar_rut(rut)
        if not rut_limpio:
            return {"existe": False, "proveedor": None}

        # 1. Intentar mediante el ORM de Django (conecta directamente a Supabase o al motor en settings.py)
        try:
            from compras_entidades.models import Proveedor
            # Buscar comparando variantes: directo, formateado o por números
            proveedores = Proveedor.objects.all()
            for prov in proveedores:
                if limpiar_rut(prov.rut) == rut_limpio:
                    return {
                        "existe": True,
                        "proveedor": {
                            "id_proveedor": prov.id_proveedor,
                            "rut": formatear_rut(prov.rut),
                            "razon_social": prov.razon_social,
                            "direccion": prov.direccion,
                            "comuna": prov.comuna,
                            "ciudad": prov.ciudad
                        }
                    }
            return {"existe": False, "proveedor": None}
        except Exception:
            # Si se ejecuta de forma aislada fuera del entorno de Django, continúa con fallback local
            pass
        
        # 2. Respaldo para ejecuciones en terminal sin Django cargado (SQLite local si existe)
        if self.db_path and os.path.exists(self.db_path):
            try:
                conn = sqlite3.connect(self.db_path)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("SELECT * FROM proveedor WHERE rut = ? OR REPLACE(REPLACE(rut, '.', ''), '-', '') = ?", (rut, rut_limpio))
                row = cursor.fetchone()
                conn.close()
                
                if row:
                    return {
                        "existe": True,
                        "proveedor": {
                            "id_proveedor": row["id_proveedor"],
                            "rut": formatear_rut(row["rut"]),
                            "razon_social": row["razon_social"],
                            "direccion": row["direccion"],
                            "comuna": row["comuna"],
                            "ciudad": row["ciudad"]
                        }
                    }
            except Exception as e:
                print(f"[Aviso DB] Error consultando tabla proveedor: {e}")
            
        return {"existe": False, "proveedor": None}

    def _procesar_con_gemini(self, jpeg_b64: str) -> dict:
        """Envía la imagen a Google Gemini mediante la Interactions API oficial."""
        url = f"{GEMINI_API_URL}?key={self.gemini_key}"
        
        modelos_a_probar = [GEMINI_MODEL, "gemini-3-flash-preview", "gemini-3.8-flash"]
        # Eliminar duplicados manteniendo orden
        modelos_unicos = []
        for m in modelos_a_probar:
            if m not in modelos_unicos:
                modelos_unicos.append(m)

        ultimo_error = None
        for modelo in modelos_unicos:
            payload = {
                "model": modelo,
                "input": [
                    {"type": "text", "text": PROMPT_EXTRACCION},
                    {
                        "type": "image",
                        "data": jpeg_b64,
                        "mime_type": "image/jpeg"
                    }
                ],
                "response_format": {
                    "type": "text",
                    "mime_type": "application/json"
                }
            }

            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Api-Revision": "2026-05-20"
                }
            )

            try:
                with urllib.request.urlopen(req, timeout=35) as response:
                    res_json = json.loads(response.read().decode("utf-8"))
                    
                    texto_salida = ""
                    for step in res_json.get("steps", []):
                        if step.get("type") == "model_output":
                            for c in step.get("content", []):
                                if c.get("type") == "text":
                                    texto_salida += c.get("text", "")
                    
                    if not texto_salida and "output_text" in res_json:
                        texto_salida = res_json["output_text"]
                    
                    datos = _parsear_json_resiliente(texto_salida)
                    datos["motor_ia"] = f"Google Gemini ({modelo})"
                    return datos

            except urllib.error.HTTPError as he:
                cuerpo = he.read().decode("utf-8", errors="replace")
                ultimo_error = f"Gemini HTTP {he.code}: {cuerpo}"
                print(f"[Gemini Error con modelo {modelo}] {ultimo_error}")
                # Si el error es 503 (alta demanda) o 404, prueba con el siguiente modelo en la lista
                continue
            except Exception as e:
                ultimo_error = str(e)
                print(f"[Gemini Excepción con modelo {modelo}] {ultimo_error}")
                continue

        raise Exception(f"No fue posible completar la digitalización con Google Gemini: {ultimo_error}")

    def _procesar_con_ollama(self, jpeg_b64: str) -> dict:
        """Envía la imagen al servidor local Ollama (qwen2.5vl:3b)."""
        payload = {
            "model": OLLAMA_MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": PROMPT_EXTRACCION,
                    "images": [jpeg_b64]
                }
            ],
            "stream": False,
            "options": {
                "temperature": 0.1,
                "repeat_penalty": 1.15,
                "num_predict": 2048
            }
        }

        req = urllib.request.Request(
            OLLAMA_API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as response:
                res_json = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8", errors="replace")
            print(f"[Error Ollama {he.code}] {err_body}")
            raise Exception(f"Ollama respondió con error {he.code}: {err_body}")

        content = res_json.get("message", {}).get("content", "{}").strip()
        datos = _parsear_json_resiliente(content)
        datos["motor_ia"] = f"Ollama Local ({OLLAMA_MODEL})"
        return datos

    def procesar_imagen_base64(self, imagen_b64: str, motor_preferido: str = "auto") -> dict:
        """
        Decodifica, normaliza y procesa el documento según el motor seleccionado.
        
        Parámetros:
          motor_preferido:
            - 'gemini' o 'api': Ejecuta con Google Gemini (Cloud Vision).
            - 'local' u 'ollama': Ejecuta exclusivamente con Ollama Local (qwen2.5vl:3b).
            - 'auto': Intenta con Gemini y si falla conmuta a Ollama local.
        """
        raw_bytes = base64.b64decode(imagen_b64)
        jpeg_b64 = normalizar_imagen_bytes(raw_bytes)

        motor_modo = str(motor_preferido or "auto").strip().lower()
        datos = None
        errores = []

        # 1. Modo Forzado Local (Ollama)
        if motor_modo in ["local", "ollama"]:
            try:
                datos = self._procesar_con_ollama(jpeg_b64)
            except Exception as e_ollama:
                raise Exception(f"Error procesando con Ollama Local: {e_ollama}")

        # 2. Modo Forzado Google Gemini
        elif motor_modo in ["gemini", "api", "cloud"]:
            if not self.gemini_key:
                raise Exception("No se ha configurado la API Key de Google Gemini en el servidor (GEMINI_API_KEY).")
            try:
                datos = self._procesar_con_gemini(jpeg_b64)
            except Exception as e_gemini:
                raise Exception(f"Error procesando con Google Gemini: {e_gemini}")

        # 3. Modo Automático (Híbrido: Gemini primero, respaldo en Ollama)
        else:
            if self.gemini_key:
                try:
                    datos = self._procesar_con_gemini(jpeg_b64)
                except Exception as e_gemini:
                    errores.append(f"Gemini: {e_gemini}")
                    print(f"[Aviso] Falló Google Gemini, conmutando a Ollama Local... Detalle: {e_gemini}")

            if not datos:
                try:
                    datos = self._procesar_con_ollama(jpeg_b64)
                except Exception as e_ollama:
                    errores.append(f"Ollama: {e_ollama}")
                    msg_error = " | ".join(errores)
                    raise Exception(f"No se pudo procesar el documento con ningún motor de IA. Detalles: {msg_error}")

        # Normalización post-extracción para moneda chilena (CLP) y reconciliación matemática
        for item in datos.get("items", []):
            try:
                pu = float(item.get("precio_unitario", 0) or 0)
                # Si el modelo interpretó el punto de miles (4.290) como decimal (4.29)
                if 0 < pu < 100:
                    pu = round(pu * 1000)
                item["precio_unitario"] = int(round(pu))

                cant = float(item.get("cantidad", 0) or 0)
                item["cantidad"] = int(cant) if cant.is_integer() else cant

                desc_pct = float(item.get("descuento_porcentaje", 0) or 0)
                item["descuento_porcentaje"] = desc_pct

                tot_item = float(item.get("total", 0) or 0)
                if 0 < tot_item < 1000:
                    tot_item = round(tot_item * 1000)

                # Reconciliación matemática: corregir pequeñas discrepancias ópticas de OCR (ej: 21980 vs 21990)
                if desc_pct == 0 and cant > 0 and tot_item > 0:
                    pu_calculado = int(round(tot_item / cant))
                    if abs(pu_calculado - item["precio_unitario"]) <= 50 and (pu_calculado * cant == int(tot_item)):
                        item["precio_unitario"] = pu_calculado

                subt = item["cantidad"] * item["precio_unitario"]
                if desc_pct > 0:
                    desc_m = int(round(subt * (desc_pct / 100.0)))
                    item["descuento_monto"] = desc_m
                    item["total"] = subt - desc_m
                else:
                    item["descuento_monto"] = 0
                    item["total"] = int(round(tot_item)) if tot_item > 0 else subt
            except Exception as e_norm:
                print(f"[Aviso] Error normalizando item: {e_norm}")

        # Reconciliación de totales con el SII
        if "items" in datos and datos["items"]:
            suma_netos = sum(it.get("total", 0) for it in datos["items"])
            totales = datos.get("totales") or {}
            neto_doc = float(totales.get("neto", 0) or 0)
            
            # Si el neto del documento coincide o está dentro de un rango de tolerancia, sincronizar
            if neto_doc <= 0 or abs(neto_doc - suma_netos) <= 1000:
                neto_doc = suma_netos
            
            iva_doc = round(neto_doc * 0.19)
            total_doc = neto_doc + iva_doc

            datos["totales"] = {
                "neto": int(neto_doc),
                "iva": int(iva_doc),
                "total": int(total_doc)
            }

        # Validación con base de datos de Django
        prov = datos.get("proveedor", {})
        rut_prov = prov.get("rut", "")
        estado_db = self.verificar_proveedor_existente(rut_prov)
        
        datos["proveedor"]["rut_formateado"] = formatear_rut(rut_prov) if "-" in str(rut_prov) or len(limpiar_rut(rut_prov)) >= 8 else rut_prov
        datos["proveedor"]["es_nuevo"] = not estado_db["existe"]
        if estado_db["existe"]:
            datos["proveedor"]["id_proveedor_db"] = estado_db["proveedor"]["id_proveedor"]

        return datos

    def procesar_archivo(self, ruta_archivo: str) -> dict:
        """Carga una imagen desde disco y la procesa."""
        with open(ruta_archivo, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        return self.procesar_imagen_base64(b64)
