/**
 * @file obrasService.js
 * @description Servicio de capa de datos para la gestión de faenas, proyectos y obras de refrigeración (HU-05, HU-09).
 * Conecta con los endpoints de Django REST Framework (`/api/obras/`) con respaldo local cuando no hay conexión.
 * 
 * BIBLIOTECAS UTILIZADAS:
 * - axios: Cliente HTTP configurado con interceptores JWT para autenticación Bearer (ver axiosConfig.js).
 */

import api from './axiosConfig';
import { INITIAL_OBRAS } from '../mockData';

const OBRAS_LOCAL_KEY = 'fyag_obras_alpha';

/**
 * Obtiene la lista de obras y proyectos activos de refrigeración.
 * 
 * @async
 * @returns {Promise<Array<Object>>} Lista de proyectos y faenas vigentes.
 */
export const obtenerObras = async () => {
    try {
        const respuesta = await api.get('/obras/');
        if (respuesta.data && Array.isArray(respuesta.data)) {
            if (respuesta.data.length > 0) {
                return respuesta.data;
            }
            return [];
        }
    } catch (err) {
        if (err.response) {
            throw err;
        }
    }

    const guardadas = localStorage.getItem(OBRAS_LOCAL_KEY);
    if (guardadas) {
        try {
            return JSON.parse(guardadas);
        } catch {
            // Ignorar error de parsing
        }
    }

    localStorage.setItem(OBRAS_LOCAL_KEY, JSON.stringify(INITIAL_OBRAS));
    return INITIAL_OBRAS;
};

/**
 * Registra una nueva obra o proyecto en el sistema.
 * 
 * @async
 * @param {Object} datosObra Datos de la faena.
 * @returns {Promise<Object>} Objeto de la obra registrada.
 */
export const crearObra = async (datosObra) => {
    try {
        const respuesta = await api.post('/obras/', datosObra);
        return respuesta.data;
    } catch (err) {
        if (err.response) {
            throw err;
        }
        const guardadas = await obtenerObras();
        const nueva = {
            id: guardadas.length + 1,
            codigo: `OBRA-2026-0${guardadas.length + 1}`,
            ...datosObra
        };
        const actualizadas = [...guardadas, nueva];
        localStorage.setItem(OBRAS_LOCAL_KEY, JSON.stringify(actualizadas));
        return nueva;
    }
};

/**
 * Despacha insumos a una obra específica mediante `POST /api/obras/<id>/despachar/`.
 * Descuenta stock de forma atómica en el backend e imputa al Cardex Append-Only.
 * 
 * @async
 * @param {number|string} idObra Identificador de la obra destino.
 * @param {Object} datosDespacho Datos del despacho (`id_articulo`, `cantidad`, `documento_respaldo`, `tecnico_receptor`, `motivo`).
 * @returns {Promise<Object>} Respuesta del servidor con stock actualizado e ID de movimiento.
 */
export const despacharObra = async (idObra, datosDespacho) => {
    const respuesta = await api.post(`/obras/${idObra}/despachar/`, datosDespacho);
    return respuesta.data;
};
