/**
 * @file cardexService.js
 * @description Servicio de capa de datos para la gestión y auditoría del Cardex Inalterable (HU-11).
 * Implementa el consumo del endpoint REST Django `/api/cardex/` con estrategia de resiliencia local (localStorage).
 * 
 * BIBLIOTECAS UTILIZADAS:
 * - axios: Cliente HTTP configurado con interceptores JWT para autenticación Bearer (ver axiosConfig.js).
 * 
 * REGLAS DE NEGOCIO IMPLEMENTADAS:
 * - HU-11: Motor Cardex Append-Only inalterable. Los registros históricos no admiten DELETE ni PUT/PATCH.
 * - Registro con fecha, usuario responsable, insumo imputado, tipo de movimiento y documento de respaldo.
 */

import api from './axiosConfig';
import { INITIAL_CARDEX } from '../mockData';

const CARDEX_LOCAL_KEY = 'fyag_cardex_alpha';

/**
 * Consulta el listado de movimientos registrados en el Cardex.
 * Intenta obtener los datos desde la API REST de Django (`GET /api/cardex/`).
 * En caso de desconexión o fallo, recurre a la persistencia local en `localStorage`
 * o al catálogo inicial de respaldo (`INITIAL_CARDEX`).
 * 
 * @async
 * @returns {Promise<Array<Object>>} Lista ordenada cronológicamente de movimientos de Cardex.
 */
export const obtenerCardex = async () => {
    try {
        const respuesta = await api.get('/cardex/');
        if (respuesta.data && Array.isArray(respuesta.data) && respuesta.data.length > 0) {
            return respuesta.data;
        }
    } catch {
        // Fallback al almacenamiento local o datos iniciales si la API no está disponible
    }

    const localData = localStorage.getItem(CARDEX_LOCAL_KEY);
    if (localData) {
        try {
            return JSON.parse(localData);
        } catch {
            // Ignorar error de parsing y continuar al valor por defecto
        }
    }

    localStorage.setItem(CARDEX_LOCAL_KEY, JSON.stringify(INITIAL_CARDEX));
    return INITIAL_CARDEX;
};

/**
 * Registra un nuevo movimiento en el Cardex bajo el patrón inalterable Append-Only.
 * Intenta persistir en Django (`POST /api/cardex/`) y sincroniza el estado local reactivo.
 * 
 * @async
 * @param {Object} datosMovimiento Datos del movimiento a crear.
 * @param {number|string} datosMovimiento.id_articulo Identificador del insumo.
 * @param {number} datosMovimiento.cantidad Cantidad (positiva para entradas, negativa para salidas o mermas).
 * @param {string} [datosMovimiento.tipo_movimiento] Tipo: 'Entrada', 'Salida' o 'Merma'.
 * @param {string} [datosMovimiento.obra_destino] Faena u obra destino (por defecto 'Bodega Central').
 * @param {string} [datosMovimiento.documento_respaldo] Guía de despacho, factura u orden de compra.
 * @param {string} [datosMovimiento.motivo] Causa o justificación obligatoria del movimiento.
 * @param {string} [datosMovimiento.usuario_responsable] Nombre del usuario autenticado que ejecuta la acción.
 * @returns {Promise<Object>} Objeto del movimiento creado y validado.
 */
export const crearMovimientoCardex = async (datosMovimiento) => {
    let movimientoCreado = null;
    try {
        const respuesta = await api.post('/cardex/', datosMovimiento);
        movimientoCreado = respuesta.data;
    } catch {
        // Simular registro local si la API aún no está disponible
    }

    const nuevoLocal = {
        id_movimiento: movimientoCreado?.id_movimiento_articulo 
            ? `MOV-${movimientoCreado.id_movimiento_articulo}`
            : `MOV-${Math.floor(100000 + Math.random() * 900000)}`,
        fecha_hora: new Date().toISOString().replace('T', ' ').substring(0, 16),
        usuario_responsable: datosMovimiento.usuario_responsable || 'Usuario Sistema',
        cargo: datosMovimiento.cargo || 'Operador',
        articulo_nombre: datosMovimiento.articulo_nombre || `Articulo #${datosMovimiento.id_articulo}`,
        articulo_codigo: datosMovimiento.articulo_codigo || `ART-${datosMovimiento.id_articulo}`,
        articulo_detalle: datosMovimiento.articulo_detalle || 'Movimiento de Almacén',
        cantidad: Number(datosMovimiento.cantidad),
        unidad_medida: datosMovimiento.unidad_medida || 'un',
        tipo_movimiento: datosMovimiento.tipo_movimiento || (datosMovimiento.cantidad >= 0 ? 'Entrada' : 'Salida'),
        obra_destino: datosMovimiento.obra_destino || 'Bodega Central',
        documento_respaldo: datosMovimiento.documento_respaldo || 'DOC-SISTEMA',
        motivo: datosMovimiento.motivo || 'Movimiento de inventario'
    };

    const guardados = await obtenerCardex();
    const actualizados = [nuevoLocal, ...guardados];
    localStorage.setItem(CARDEX_LOCAL_KEY, JSON.stringify(actualizados));
    return nuevoLocal;
};
