/**
 * @file cardexService.js
 * @description Servicio de capa de datos para la gestión y auditoría del Cardex Inalterable (HU-11).
 * Implementa el consumo del endpoint REST Django `/api/cardex/` con estrategia de resiliencia local si no hay red.
 * 
 * BIBLIOTECAS UTILIZADAS:
 * - axios: Cliente HTTP configurado con interceptores JWT para autenticación Bearer (ver axiosConfig.js).
 */

import api from './axiosConfig';
import { INITIAL_CARDEX } from '../mockData';

const CARDEX_LOCAL_KEY = 'fyag_cardex_alpha';

/**
 * Consulta el listado de movimientos registrados en el Cardex.
 * 
 * @async
 * @param {Object} [filtros] Filtros opcionales (`tipo`, `id_obra`, `search`).
 * @returns {Promise<Array<Object>>} Lista ordenada cronológicamente de movimientos de Cardex.
 */
export const obtenerCardex = async (filtros = {}) => {
    try {
        const params = new URLSearchParams();
        if (filtros.tipo) params.append('tipo', filtros.tipo);
        if (filtros.id_obra) params.append('id_obra', filtros.id_obra);
        if (filtros.search) params.append('search', filtros.search);
        const query = params.toString() ? `?${params.toString()}` : '';

        const respuesta = await api.get(`/cardex/${query}`);
        if (respuesta.data && Array.isArray(respuesta.data)) {
            return respuesta.data;
        }
    } catch (err) {
        if (err.response) {
            throw err;
        }
    }

    const localData = localStorage.getItem(CARDEX_LOCAL_KEY);
    if (localData) {
        try {
            return JSON.parse(localData);
        } catch {
            // Ignorar error de parsing
        }
    }

    localStorage.setItem(CARDEX_LOCAL_KEY, JSON.stringify(INITIAL_CARDEX));
    return INITIAL_CARDEX;
};

/**
 * Registra un nuevo movimiento en el Cardex bajo el patrón inalterable Append-Only.
 * 
 * @async
 * @param {Object} datosMovimiento Datos del movimiento a crear.
 * @returns {Promise<Object>} Objeto del movimiento creado y validado.
 */
export const crearMovimientoCardex = async (datosMovimiento) => {
    const payload = {
        id_articulo: datosMovimiento.id_articulo,
        id_obra: datosMovimiento.id_obra || null,
        cantidad: Number(datosMovimiento.cantidad),
        motivo: datosMovimiento.documento_respaldo
            ? `(${datosMovimiento.documento_respaldo}) ${datosMovimiento.motivo || 'Movimiento de inventario'}`
            : (datosMovimiento.motivo || 'Movimiento de inventario'),
    };

    if (datosMovimiento.id_tipo_movimiento) {
        payload.id_tipo_movimiento = datosMovimiento.id_tipo_movimiento;
    } else {
        payload.tipo_movimiento_nombre =
            datosMovimiento.tipo_movimiento_nombre ||
            datosMovimiento.tipo_movimiento ||
            (Number(datosMovimiento.cantidad) >= 0 ? 'Entrada' : 'Salida');
    }

    try {
        const respuesta = await api.post('/cardex/', payload);
        return respuesta.data;
    } catch (err) {
        if (err.response) {
            throw err;
        }

        const nuevoLocal = {
            id_movimiento: `MOV-${Math.floor(100000 + Math.random() * 900000)}`,
            fecha_hora: new Date().toISOString().replace('T', ' ').substring(0, 16),
            usuario_responsable: datosMovimiento.usuario_responsable || 'Usuario Sistema',
            cargo: datosMovimiento.cargo || 'Operador',
            articulo_nombre: datosMovimiento.articulo_nombre || `Articulo #${datosMovimiento.id_articulo}`,
            articulo_codigo: datosMovimiento.articulo_codigo || `ART-${datosMovimiento.id_articulo}`,
            articulo_detalle: datosMovimiento.articulo_detalle || 'Movimiento de Almacén',
            cantidad: Number(datosMovimiento.cantidad),
            unidad_medida: datosMovimiento.unidad_medida || 'un',
            tipo_movimiento: payload.tipo_movimiento_nombre || 'Salida',
            obra_destino: datosMovimiento.obra_destino || 'Bodega Central',
            documento_respaldo: datosMovimiento.documento_respaldo || 'DOC-SISTEMA',
            motivo: datosMovimiento.motivo || 'Movimiento de inventario'
        };

        const guardados = await obtenerCardex();
        const actualizados = [nuevoLocal, ...guardados];
        localStorage.setItem(CARDEX_LOCAL_KEY, JSON.stringify(actualizados));
        return nuevoLocal;
    }
};
