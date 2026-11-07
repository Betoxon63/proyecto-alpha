/**
 * @file obrasService.js
 * @description Servicio de capa de datos para la gestión de faenas, proyectos y obras de refrigeración (HU-05, HU-09).
 * Conecta con los endpoints de Django REST Framework con respaldo en almacenamiento local (`localStorage`).
 * 
 * BIBLIOTECAS UTILIZADAS:
 * - axios: Cliente HTTP configurado con interceptores JWT para autenticación Bearer (ver axiosConfig.js).
 * 
 * REGLAS DE NEGOCIO IMPLEMENTADAS:
 * - HU-05: Asignación e imputación directa de insumos consumidos por proyecto/obra.
 * - HU-09: Trazabilidad y visibilidad de existencias para supervisores de terreno.
 */

import api from './axiosConfig';
import { INITIAL_OBRAS } from '../mockData';

const OBRAS_LOCAL_KEY = 'fyag_obras_alpha';

/**
 * Obtiene la lista de obras y proyectos activos de refrigeración.
 * Consulta el endpoint `GET /api/obras/` con fallback al almacenamiento local.
 * 
 * @async
 * @returns {Promise<Array<Object>>} Lista de proyectos y faenas vigentes.
 */
export const obtenerObras = async () => {
    try {
        const respuesta = await api.get('/obras/');
        if (respuesta.data && Array.isArray(respuesta.data) && respuesta.data.length > 0) {
            return respuesta.data;
        }
    } catch {
        // Fallback a localStorage o INITIAL_OBRAS
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
 * @param {Object} datosObra Datos de la faena (nombre, cliente, técnico, estado).
 * @returns {Promise<Object>} Objeto de la obra registrada.
 */
export const crearObra = async (datosObra) => {
    try {
        const respuesta = await api.post('/obras/', datosObra);
        return respuesta.data;
    } catch {
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
