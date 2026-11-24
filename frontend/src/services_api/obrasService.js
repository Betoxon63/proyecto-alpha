import api from './axiosConfig';

// Obtiene las obras registradas (el servidor filtra automáticamente las obras propias si es Supervisor).
export const obtenerObras = async () => {
    const respuesta = await api.get('/obras/');
    return Array.isArray(respuesta.data) ? respuesta.data : [];
};

// Registra una nueva obra o proyecto en el sistema.
export const crearObra = async (datosObra) => {
    const respuesta = await api.post('/obras/', datosObra);
    return respuesta.data;
};

// Actualiza los datos o cambia el estado de una obra existente.
export const actualizarObra = async (idObra, datosObra) => {
    const respuesta = await api.put(`/obras/${idObra}/`, datosObra);
    return respuesta.data;
};

// Elimina una obra (el servidor impide borrarla si ya tiene despachos de materiales asociados).
export const eliminarObra = async (idObra) => {
    const respuesta = await api.delete(`/obras/${idObra}/`);
    return respuesta.data;
};

// Obtiene la lista oficial de tipos de servicio para clasificar las obras.
export const obtenerTiposServicio = async () => {
    const respuesta = await api.get('/tipos-servicio/');
    return Array.isArray(respuesta.data) ? respuesta.data : [];
};

// Funciones exclusivas de Administración para gestionar la lista paramétrica de tipos de servicio.
export const crearTipoServicio = async (datos) => {
    const respuesta = await api.post('/tipos-servicio/', datos);
    return respuesta.data;
};

export const actualizarTipoServicio = async (idTipo, datos) => {
    const respuesta = await api.put(`/tipos-servicio/${idTipo}/`, datos);
    return respuesta.data;
};

export const eliminarTipoServicio = async (idTipo) => {
    const respuesta = await api.delete(`/tipos-servicio/${idTipo}/`);
    return respuesta.data;
};

// Obtiene la lista de supervisores activos para asignarlos al crear o editar una obra.
export const obtenerSupervisores = async () => {
    try {
        const respuesta = await api.get('/obras/supervisores/');
        return Array.isArray(respuesta.data) ? respuesta.data : [];
    } catch {
        return [];
    }
};

// Objeto agrupado mantenido por compatibilidad con la vista Obras.jsx.
export const obraService = {
    getAll: obtenerObras,
    create: crearObra,
    update: actualizarObra,
    delete: eliminarObra,
    getTiposServicio: obtenerTiposServicio,
    getSupervisores: obtenerSupervisores,
};

// Consulta directamente desde el servidor el historial de movimientos permitido para el cargo actual.
export const obtenerCardex = async () => {
    const respuesta = await api.get('/cardex/');
    return Array.isArray(respuesta.data) ? respuesta.data : [];
};

// Registra un movimiento en el historial directamente en el servidor (propaga cualquier error real).
export const crearMovimientoCardex = async (datosMovimiento) => {
    const respuesta = await api.post('/cardex/', datosMovimiento);
    return respuesta.data;
};

// Alias mantenido por compatibilidad con otros componentes.
export const registrarMovimientoCardex = crearMovimientoCardex;

// Despacha materiales desde bodega hacia una obra que se encuentre en estado "En proceso".
export const despacharObra = async (idObra, datosDespacho) => {
    const respuesta = await api.post(`/obras/${idObra}/despachar/`, datosDespacho);
    return respuesta.data;
};

// Registra una merma justificada descontando las unidades en el servidor.
export const registrarMerma = async (datosMerma) => {
    const respuesta = await api.post('/cardex/registrar-merma/', datosMerma);
    return respuesta.data;
};

// Registra una devolución de material desde una obra hacia bodega o hacia un proveedor.
export const registrarDevolucion = async (datosDevolucion) => {
    const respuesta = await api.post('/cardex/registrar-devolucion/', datosDevolucion);
    return respuesta.data;
};