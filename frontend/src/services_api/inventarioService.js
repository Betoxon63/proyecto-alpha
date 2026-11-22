import api from './axiosConfig';

// Funciones para consultar, crear, editar y eliminar materiales de bodega.
export const obtenerArticulos = (busqueda = '') =>
    api.get(`/articulos/${busqueda ? `?search=${encodeURIComponent(busqueda)}` : ''}`);
export const crearArticulo = (datos) => api.post('/articulos/', datos);
export const actualizarArticulo = (id, datos) => api.put(`/articulos/${id}/`, datos);
export const eliminarArticulo = (id) => api.delete(`/articulos/${id}/`);

// Funciones para categorías y unidades de medida del catálogo.
export const obtenerCategorias = () => api.get('/categorias/');
export const crearCategoria = (datos) => api.post('/categorias/', datos);
export const actualizarCategoria = (id, datos) => api.put(`/categorias/${id}/`, datos);
export const eliminarCategoria = (id) => api.delete(`/categorias/${id}/`);

export const obtenerUnidades = () => api.get('/unidades-medida/');
export const crearUnidad = (datos) => api.post('/unidades-medida/', datos);
export const actualizarUnidad = (id, datos) => api.put(`/unidades-medida/${id}/`, datos);
export const eliminarUnidad = (id) => api.delete(`/unidades-medida/${id}/`);

// Funciones para fichas de clientes y proveedores.
export const obtenerClientes = () => api.get('/clientes/');
export const crearCliente = (datos) => api.post('/clientes/', datos);
export const actualizarCliente = (id, datos) => api.put(`/clientes/${id}/`, datos);
export const eliminarCliente = (id) => api.delete(`/clientes/${id}/`);

export const obtenerProveedores = () => api.get('/proveedores/');
export const crearProveedor = (datos) => api.post('/proveedores/', datos);
export const actualizarProveedor = (id, datos) => api.put(`/proveedores/${id}/`, datos);
export const eliminarProveedor = (id) => api.delete(`/proveedores/${id}/`);

// Funciones para el registro y consulta de facturas de compra.
export const obtenerFacturas = () => api.get('/facturas/');
export const crearFactura = (datos) => api.post('/facturas/', datos);

// Funciones para la administración de trabajadores y cargos.
export const obtenerUsuarios = () => api.get('/usuarios/');
export const crearUsuario = (datos) => api.post('/usuarios/', datos);
export const actualizarUsuario = (id, datos) => api.put(`/usuarios/${id}/`, datos);
export const eliminarUsuario = (id) => api.delete(`/usuarios/${id}/`);
export const obtenerRoles = () => api.get('/roles/');