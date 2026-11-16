import api from './axiosConfig';

const CARDEX_LOCAL_KEY = 'fyag_cardex_alpha'

// Obtiene todas las obras registradas.
export const obtenerObras = async () => {
    try {
        const respuesta = await api.get('/obras/');
        return Array.isArray(respuesta.data) ? respuesta.data : [];
    } catch {
        return [];
    }
};

// Registra una nueva obra en el sistema.
export const crearObra = async (datosObra) => {
    const respuesta = await api.post('/obras/', datosObra);
    return respuesta.data;
};

// Actualiza los datos o el estado de una obra existente.
export const actualizarObra = async (idObra, datosObra) => {
    const respuesta = await api.put(`/obras/${idObra}/`, datosObra);
    return respuesta.data;
};

// Elimina una obra si no tiene movimientos de materiales asociados.
export const eliminarObra = async (idObra) => {
    const respuesta = await api.delete(`/obras/${idObra}/`);
    return respuesta.data;
};

// Obtiene las 8 claasificaciones oficiales de tipos de servicio.
export const obtenerTiposServicio = async () => {
    const respuesta = await api.get('/tipos-servicio/');
    return Array.isArray(respuesta.data) ? respuesta.data : [];
};

// Objeto compatible con la vista Obras.jsx.
export const obraService = {
    getAll: obtenerObras,
    create: crearObra,
    update: actualizarObra,
    delete: eliminarObra,
    getTiposServicio: obtenerTiposServicio,
};

// Consulta el historial general de movimientos desde el servidor.
export const obtenerCardex = async () => {
    try {
        const respuesta = await api.get('/cardex/');
        if (Array.isArray(respuesta.data)) {
            localStorage.setItem(CARDEX_LOCAL_KEY, JSON.stringify(respuesta.data));
            return respuesta.data;
        }
    } catch {
        // Si ocurre un error de red, utiliza el respaldo sincronizado.
    }

    const localData = localStorage.getItem(CARDEX_LOCAL_KEY);
    if (localData) {
        try {
            return JSON.parse(localData);
        } catch {
            return [];
        }
    }
    return [];
};

// Registra un nuevo movimiento de material en el historial vinculándolo a la obra.
export const crearMovimientoCardex = async (datosMovimiento) => {
    let movimientoCreado = null;

    try {
        const respuesta = await api.post('/cardex/', datosMovimiento);
        movimientoCreado = respuesta.data;
    } catch {
        // Mantiene respaldo local si falta algún identificador opcional.
    }

    const nuevoRegistro = {
        id_movimiento: movimientoCreado?.id_movimiento
            ? movimientoCreado.id_movimiento
            : datosMovimiento.id_movimiento || `REG-${Math.floor(10000 + Math.random() * 90000)}`,
        fecha_hora:
            movimientoCreado?.fecha_hora ||
            datosMovimiento.fecha_hora ||
            new Date().toISOString().replace('T', ' ').substring(0, 16),
        usuario_responsable: datosMovimiento.usuario_responsable || 'Trabajador',
        cargo: datosMovimiento.cargo || 'Bodega',
        articulo_nombre: 
            datosMovimiento.articulo_nombre || `Material #${datosMovimiento.id_articulo || ''}`,
        articulo_codigo:
            datosMovimiento.articulo_codigo || `MAT-${datosMovimiento.id_articulo || ''}`,
        articulo_detalle: datosMovimiento.articulo_detalle || 'Bodega Central',
        cantidad: Number(datosMovimiento.cantidad),
        unidad_medida: datosMovimiento.unidad_medida || 'un',
        tipo_movimiento:
            datosMovimiento.tipo_movimiento ||
            (Number(datosMovimiento.cantidad) >= 0 ? 'Entrada' : 'Salida'),
        id_obra: datosMovimiento.id_obra || null,
        obra_destino: datosMovimiento.obra_destino || 'Bodega Central',
        documento_respaldo: datosMovimiento.documento_respaldo || datosMovimiento.motivo || 'Sin detalle',
        motivo: datosMovimiento.motivo || 'Movimiento de bodega',
    };

    const guardados = await obtenerCardex();
    const actualizados = [nuevoRegistro, ...guardados];
    localStorage.setItem(CARDEX_LOCAL_KEY, JSON.stringify(actualizados));
    return movimientoCreado || nuevoRegistro;
};

// Alias de compatibilidad para componentes de las tandas anteriores.
export const registrarMovimientoCardex = crearMovimientoCardex;

export const despacharObra = async (idObra, datosDespacho) => {
    const respuesta = await api.post(`/obras/${idObra}/despachar/`, datosDespacho);
    return respuesta.data;
};