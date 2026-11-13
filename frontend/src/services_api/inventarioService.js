/**
 * @file inventarioService.js
 * @description Capa de servicios API para la gestión integral del Catálogo de Insumos,
 * Unidades de Medida, Categorías, Clientes, Proveedores, Facturas y Administración de Usuarios.
 * 
 * Consume los endpoints REST de Django bajo `/api/` utilizando la instancia configurada de Axios
 * con soporte para autenticación Bearer Token y refresco JWT (ver axiosConfig.js).
 */

import api from './axiosConfig';

// ==========================================
// 1. Catálogo e Inventario de Artículos (HU-01, HU-02, HU-03)
// ==========================================

/**
 * Consulta el listado de insumos y repuestos en el catálogo maestro.
 * @param {string} [busqueda=''] Término de búsqueda opcional por nombre o código de barras.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const obtenerArticulos = (busqueda = '') =>
    api.get(`/articulos/${busqueda ? `?search=${encodeURIComponent(busqueda)}` : ''}`);

/**
 * Registra un nuevo artículo en el catálogo.
 * @param {Object} datos Atributos del artículo (nombre, codigo_barra, id_categoria, stock_minimo, etc.)
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const crearArticulo = (datos) => api.post('/articulos/', datos);

/**
 * Actualiza la información de un artículo existente.
 * @param {number|string} id Identificador primario del artículo.
 * @param {Object} datos Campos actualizados.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const actualizarArticulo = (id, datos) => api.put(`/articulos/${id}/`, datos);

/**
 * Elimina un artículo del inventario (restringido a Administrador).
 * @param {number|string} id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const eliminarArticulo = (id) => api.delete(`/articulos/${id}/`);

// ==========================================
// 2. Categorías y Unidades de Medida
// ==========================================

/**
 * Obtiene la lista de familias o categorías de insumos.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const obtenerCategorias = () => api.get('/categorias/');

/**
 * Registra una nueva categoría de insumos.
 * @param {Object} datos { nombre: string }
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const crearCategoria = (datos) => api.post('/categorias/', datos);

/**
 * Obtiene las unidades de medida físicas configuradas (un, mts, kg, etc.).
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const obtenerUnidades = () => api.get('/unidades-medida/');

/**
 * Registra una nueva unidad de medida.
 * @param {Object} datos { nombre: string }
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const crearUnidad = (datos) => api.post('/unidades-medida/', datos);

// ==========================================
// 3. Clientes Comerciales
// ==========================================

/**
 * Consulta la cartera de clientes.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const obtenerClientes = () => api.get('/clientes/');

/**
 * Registra un nuevo cliente con validación de RUT.
 * @param {Object} datos
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const crearCliente = (datos) => api.post('/clientes/', datos);

/**
 * Actualiza los datos comerciales o de contacto de un cliente.
 * @param {number|string} id
 * @param {Object} datos
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const actualizarCliente = (id, datos) => api.put(`/clientes/${id}/`, datos);

/**
 * Elimina un cliente de la base de datos.
 * @param {number|string} id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const eliminarCliente = (id) => api.delete(`/clientes/${id}/`);

// ==========================================
// 4. Proveedores Comerciales (HU-07)
// ==========================================

/**
 * Consulta los proveedores de repuestos e insumos.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const obtenerProveedores = () => api.get('/proveedores/');

/**
 * Registra un nuevo proveedor validando RUT chileno (Módulo 11).
 * @param {Object} datos
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const crearProveedor = (datos) => api.post('/proveedores/', datos);

/**
 * Actualiza los datos de un proveedor.
 * @param {number|string} id
 * @param {Object} datos
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const actualizarProveedor = (id, datos) => api.put(`/proveedores/${id}/`, datos);

/**
 * Elimina un proveedor del registro comercial.
 * @param {number|string} id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const eliminarProveedor = (id) => api.delete(`/proveedores/${id}/`);

// ==========================================
// 5. Facturas de Compra (HU-08 / CP-04)
// ==========================================

/**
 * Consulta el histórico de facturas de compra recepcionadas.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const obtenerFacturas = () => api.get('/facturas/');

/**
 * Registra una factura de compra aplicando descuentos comerciales sucesivos y actualizando inventario.
 * @param {Object} datos { numero_documento, id_proveedor, descuento_1, descuento_2, descuento_3, detalles: [...] }
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const crearFactura = (datos) => api.post('/facturas/', datos);

// ==========================================
// 6. Servicios y Tipologías de Movimiento
// ==========================================

/**
 * Consulta los tipos de servicio técnico asociados a proyectos y obras.
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const obtenerTiposServicio = () => api.get('/tipos-servicio/');

/**
 * Registra un nuevo tipo de servicio.
 * @param {Object} datos { nombre: string }
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const crearTipoServicio = (datos) => api.post('/tipos-servicio/', datos);

/**
 * Consulta las tipologías de movimiento del Cardex ('Entrada', 'Salida', 'Merma').
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const obtenerTiposMovimiento = () => api.get('/tipos-movimiento/');

// ==========================================
// 7. Gestión de Usuarios y Roles (RBAC)
// ==========================================

/**
 * Consulta los usuarios del sistema (exclusivo para Administración).
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const obtenerUsuarios = () => api.get('/usuarios/');

/**
 * Da de alta un nuevo usuario con rol asignado.
 * @param {Object} datos
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const crearUsuario = (datos) => api.post('/usuarios/', datos);

/**
 * Actualiza atributos o roles de un usuario.
 * @param {number|string} id
 * @param {Object} datos
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const actualizarUsuario = (id, datos) => api.put(`/usuarios/${id}/`, datos);

/**
 * Elimina un usuario del sistema.
 * @param {number|string} id
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const eliminarUsuario = (id) => api.delete(`/usuarios/${id}/`);

/**
 * Obtiene el listado de roles del sistema (administracion, encargado_bodega, encargado_finanza, supervisor_obra).
 * @returns {Promise<import('axios').AxiosResponse>}
 */
export const obtenerRoles = () => api.get('/roles/');
