import React, { use, useEffect, useState } from "react";
import { Building2, Truck, Receipt, PieChart, Plus, Search, Edit2, Trash2, } from "lucide-react";
import { obtenerClientes, crearCliente, actualizarCliente, eliminarCliente, obtenerProveedores, crearProveedor, actualizarProveedor, eliminarProveedor, obtenerArticulos, actualizarArticulo, crearFactura } from '../services_api/inventarioService';
import { crearMovimientoCardex } from "../services_api/obrasService";
import { formatearRutVisual, limpiarRutParaGuardar } from './GestionUsuariosView'
import FacturasComprasView from "../components/FacturasComprasView";
import FinanzasView from './FinanzasView'
import '../styles/ComprasView.css'

const clienteInicial = {
    rut: '',
    razon_social: '',
    giro_comercial: '',
    direccion: '',
    region: 'Ñuble',
    comuna: '',
    ciudad: '',
    nombre_representante: '',
    rut_representante: '',
};

const proveedorInicial = {
    rut: '',
    razon_social: '',
    direccion: '',
    region: 'Ñuble',
    comuna: '',
    ciudad: '',
};

const ComprasView = ({ usuario }) => {
    const [pestana, setPestana] = useState('clientes');
    const [clientes, setClientes] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [articulos, setArticulos] = useState([]);
    const [cargando, setCargando] = useState(true);

    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [busquedaProveedor, setBusquedaProveedor] = useState('');
    const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
    const [modalProveedorAbierto, setModalProveedorAbierto] = useState(false);

    const [formCliente, setFormCliente] = useState(clienteInicial);
    const [formProveedor, setFormProveedor] = useState(proveedorInicial);
    const [editClienteId, setEditClienteId] = useState(null);
    const [editProveedorId, setEditProveedorId] = useState(null);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    const puedeEditar = ['administracion', 'encargado_finanza'].includes(usuario?.rol);
    const puedeVerFinanzas = ['administracion', 'encargado_finanza'].includes(usuario?.rol);

    const formatearErrorAPI = (err, fallback) => {
        const data = err.response?.data;
        if (data && typeof data === 'object') {
            return Object.values(data).flat().join(' ');
        }
        return fallback;
    };

    const cargarEntidades = async () => {
        setCargando(true);
        try {
            const [resCli, resProv, resArt] = await Promise.all([
                obtenerClientes(),
                obtenerProveedores(),
                obtenerArticulos().catch(() => ({ data: [] })),
            ]);
            setClientes(resCli.data || []);
            setProveedores(resProv.data || []);
            setArticulos(resArt?.data || []);
        } catch {
            setError('No se pudieron cargar los datos de clientes y proveedores.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarEntidades();
    }, []);

    const abrirModalNuevoCliente = () => {
        setEditClienteId(null);
        setError('');
        setFormCliente(clienteInicial);
        setModalClienteAbierto(true);
    };

    const abrirModalEditarCliente = (cliente) => {
        setEditClienteId(cliente.id_cliente);
        setError('');
        setFormCliente({
            ...cliente,
            rut: formatearRutVisual(cliente.rut || ''),
            rut_representante: formatearRutVisual(cliente.rut_representante || ''),
        });
        setModalClienteAbierto(true);
    };

    const abrirModalNuevoProveedor = () => {
        setEditProveedorId(null);
        setError('');
        setFormProveedor(proveedorInicial);
        setModalProveedorAbierto(true);
    };

    const abrirModalEditarProveedor = (proveedor) => {
        setEditProveedorId(proveedor.id_proveedor || proveedor.id);
        setError('');
        setFormProveedor({
            ...proveedor,
            rut: formatearRutVisual(proveedor.rut || ''),
        });
        setModalProveedorAbierto(true);
    };

    const guardarClienteForm = async (e) => {
        e.preventDefault();
        setError('');
        setMensaje('');
        const datosCliente = {
            ...formCliente,
            rut: limpiarRutParaGuardar(formCliente.rut),
            rut_representante: limpiarRutParaGuardar(formCliente.rut_representante),
        };
        try {
            if (editClienteId) {
                await actualizarCliente(editClienteId, datosCliente);
                setMensaje('Los datos del cliente se actualizaron correctamente.');
            } else {
                await crearCliente(datosCliente);
                setMensaje('Nuevo cliente registrado correctamente.')
            }
            setModalClienteAbierto(false);
            setFormCliente(clienteInicial);
            setEditClienteId(null);
            await cargarEntidades();
        } catch (err) {
            setError(formatearErrorAPI(err, 'No se pudo guardar el cliente. Revise que el RUT sea válido.'));
        }
    };

    const guardarProveedorForm = async (e) => {
        e.preventDefault();
        setError('');
        setMensaje('');
        const datosProveedor = {
            ...formProveedor,
            rut: limpiarRutParaGuardar(formProveedor.rut),
        };
        try {
            if (editProveedorId) {
                await actualizarProveedor(editProveedorId, datosProveedor);
                setMensaje('Los datos del proveedor se actualizaron correctamente.');
            } else {
                await crearProveedor(datosProveedor);
                setMensaje('Nuevo proveedor registrado correctamente.')
            }
            setModalProveedorAbierto(false);
            setFormProveedor(proveedorInicial);
            setEditProveedorId(null);
            await cargarEntidades();
        } catch (err) {
            setError(formatearErrorAPI(err, 'No se pudo guardar el proveedor. Revise que el RUT sea válido.'));
        }
    };

    const manejarEliminarCliente = async (idCliente, razonSocial) => {
        if (!window.confirm(`¿Está seguro de eliminar al cliente "${razonSocial}"?`)) return;
        setError('');
        setMensaje('');
        try {
            await eliminarCliente(idCliente);
            setMensaje('Cliente eliminado correctamente.');
            await cargarEntidades();
        } catch {
            setError('No se puede eliminar este cliente porque ya tiene obras asociadas en el sistema.');
        }
    };

    const manejarEliminarProveedor = async (idProveedor, razonSocial) => {
        if (!window.confirm(`¿Está seguro de eliminar al proveedor "${razonSocial}"?`)) return;
        setError('');
        setMensaje('');
        try {
            await eliminarProveedor(idProveedor);
            setMensaje('Proveedor eliminado correctamente.');
            await cargarEntidades();
        } catch {
            setError('No se puede eliminar este proveedor porque ya tiene facturas registradas.');
        }
    };

    const manejarRegistroFactura = async (facturaData) => {
        setError('');
        setMensaje('');
        try {
            await crearFactura({
                id_proveedor: facturaData.id_proveedor,
                numero_documento: facturaData.numero_documento,
                id_articulo: facturaData.articulo_id,
                cantidad: Number(facturaData.cantidad),
                precio_unitario: Number(facturaData.precio_unitario),
                total: Number(facturaData.total),
                observaciones: facturaData.motivo,
            });
        } catch {
            const artObjetivo = articulos.find(
                (a) => String(a.id_articulo) === String(facturaData.articulo_id)
            );

            if (artObjetivo) {
                const nuevoStock = Number(artObjetivo.stock_disponible) + Number(facturaData.cantidad);
                await actualizarArticulo(artObjetivo.id_articulo, {
                    ...artObjetivo,
                    stock_disponible: nuevoStock,
                });
            }

            await crearMovimientoCardex({
                id_articulo: facturaData.articulo_id,
                id_usuario: usuario?.id_usuario,
                usuario_responsable: usuario?.nombre || 'Encargado de Bodega',
                cargo: usuario?.rol || 'Bodega',
                articulo_nombre: facturaData.articulo_nombre,
                articulo_codigo: artObjetivo?.codigo_barra || `ART-${facturaData.articulo_id}`,
                articulo_detalle: 'Recepción Factura Proveedor',
                cantidad: Number(facturaData.cantidad),
                unidad_medida: artObjetivo?.unidad_nombre || 'un',
                tipo_movimiento: 'Entrada',
                obra_destino: 'Bodega Central',
                documento_respaldo: facturaData.documento,
                motivo: facturaData.motivo || `Recepción ${facturaData.documento}`,
            });
        }

        setMensaje(
            `Factura ${facturaData.documento} registrada con éxito. Se sumaron ${facturaData.cantidad} unidades al stock.`
        );
        await cargarEntidades();
    };

    const clientesFiltrados = clientes.filter((c) => {
        const q = busquedaCliente.toLowerCase();
        const rutPuntos = formatearRutVisual(c.rut).toLowerCase();
        return(
            c.razon_social?.toLowerCase().includes(q) ||
            c.rut?.toLowerCase().includes(q) ||
            rutPuntos.includes(q) ||
            c.giro_comercial?.toLowerCase().includes(q) ||
            c.ciudad?.toLowerCase().includes(q) ||
            c.nombre_representante?.toLowerCase().includes(q)
        );
    });

    const proveedoresFiltrados = proveedores.filter((p) => {
        const q = busquedaProveedor.toLowerCase();
        const rutPuntos = formatearRutVisual(p.rut).toLowerCase();
        return(
            p.razon_social?.toLowerCase().includes(q) ||
            p.rut?.toLowerCase().includes(q) ||
            rutPuntos.includes(q) ||
            p.direccion?.toLowerCase().includes(q) ||
            p.ciudad?.toLowerCase().includes(q) ||
            p.comuna?.toLowerCase().includes(q)
        );
    });

    const modalActivo = modalClienteAbierto || modalProveedorAbierto;

    return (
        <div className="contenedor-vista">
            <div className="compras-container">
                <div className="compras-header">
                    <div>
                        <h1 className="compras-title">Clientes, Proveedores y Facturación</h1>
                        <p className="compras-subtitle">
                            Administración de fichas comerciales de empresas, recepción de compras y control de gastos
                        </p>
                    </div>

                    <div className="compras-header-actions">
                        {pestana === 'clientes' && puedeEditar && (
                            <button type="button" onClick={abrirModalNuevoCliente} className="compras-btn-add">
                                <Plus size={16} />
                                <span>Registrar Cliente</span>
                            </button>
                        )}
                        {pestana === 'proveedores' && puedeEditar && (
                            <button type="button" onClick={abrirModalNuevoProveedor} className="compras-btn-add">
                                <Plus size={16} />
                                <span>Registrar Proveedor</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="compras-tabs-bar">
                    <button type="button" className={`compras-tab-item ${pestana === 'clientes' ? 'active' : ''}`} onClick={() => setPestana('clientes')}>
                        <Building2 size={16} />
                        <span>Clientes Mandantes</span>
                        <span className="compras-tab-count">{clientes.length}</span>
                    </button>

                    <button type="button" className={`compras-tab-item ${pestana === 'proveedores' ? 'active' : ''}`} onClick={() => setPestana('proveedores')}>
                        <Truck size={16} />
                        <span>Proveedores</span>
                        <span className="compras-tab-count">{proveedores.length}</span>
                    </button>

                    <button type="button" className={`compras-tab-item ${pestana === 'facturas' ? 'active' : ''}`} onClick={() => setPestana('facturas')}>
                        <Receipt size={16} />
                        <span>Ingreso de Facturas</span>
                    </button>

                    {puedeVerFinanzas && (
                        <button type="button" className={`compras-tab-item ${pestana === 'finanzas' ? 'active' : ''}`} onClick={() => setPestana('finanzas')}>
                            <PieChart size={16} />
                            <span>Resumen de Gastos y Finanzas</span>
                        </button>
                    )}
                </div>

                {mensaje && <div className="alerta-exito">{mensaje}</div>}
                {error && !modalActivo && <div className="alerta-error">{error}</div>}

                {pestana === 'clientes' && (
                    <div className="compras-table-card">
                        <div className="compras-table-toolbar">
                            <div className="compras-search-box">
                                <Search size={15} color="#64748b" />
                                <input
                                    type="text"
                                    placeholder="Buscar cliente por razón social, RUT, ciudad o representante..."
                                    value={busquedaCliente}
                                    onChange={(e) => setBusquedaCliente(e.target.value)}
                                    className="compras-search-input"
                                />
                            </div>
                            <div className="compras-count-label">
                                {clientesFiltrados.length} clientes registrados
                            </div>
                        </div>

                        <div className="compras-table-wrapper">
                            <table className="compras-table">
                                <thead>
                                    <tr>
                                        <th>Razón Social</th>
                                        <th>RUT Empresa</th>
                                        <th>Rubro / Giro Comercial</th>
                                        <th>Dirección</th>
                                        <th>Ciudad / Comuna</th>
                                        <th>Representante Legal</th>
                                        {puedeEditar && <th>Acciones</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {cargando ? (
                                        <tr>
                                            <td colSpan={puedeEditar ? 7: 6} className="compras-table-empty">
                                                Cargando nómina de clientes...
                                            </td>
                                        </tr>
                                    ) : clientesFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={puedeEditar ? 7 : 6} className="compras-table-empty">
                                                No se encontraron clientes registrados con esos datos.
                                            </td>
                                        </tr>
                                    ) : (
                                        clientesFiltrados.map((c) => (
                                            <tr key={c.id_cliente}>
                                                <td className="compras-td-name">{c.razon_social}</td>
                                                <td className="compras-td-rut">{formatearRutVisual(c.rut)}</td>
                                                <td className="compras-td-text">{c.giro_comercial}</td>
                                                <td className="compras-td-text">{c.direccion}</td>
                                                <td>
                                                    <span className="compras-location-badge">
                                                        {c.ciudad} ({c.comuna})
                                                    </span>
                                                </td>
                                                <td className="compras-td-text">
                                                    {c.nombre_representante}{' '}
                                                    <span className="compras-td-rut">
                                                        ({formatearRutVisual(c.rut_representante)})
                                                    </span>
                                                </td>
                                                {puedeEditar && (
                                                    <td>
                                                        <div className="compras-actions-cell">
                                                            <button type="button" onClick={() => abrirModalEditarCliente(c)} className="compras-btn-edit" title="Modificar datos del cliente">
                                                                <Edit2 size={14} />
                                                                <span>Editar</span>
                                                            </button>
                                                            <button type="button" onClick={() => manejarEliminarCliente(c.id_cliente, c.razon_social)} className="compras-btn-delete" title="Eliminar cliente">
                                                                <Trash2 size={14} />
                                                                <span>Eliminar</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {pestana === 'proveedores' && (
                    <div className="compras-table-card">
                        <div className="compras-table-toolbar">
                            <div className="compras-search-box">
                                <Search size={15} color="#64748b" />
                                <input
                                    type="text"
                                    placeholder="Buscar proveedor por razón social, RUT, dirección o ciudad..."
                                    value={busquedaProveedor}
                                    onChange={(e) => setBusquedaProveedor(e.target.value)}
                                    className="compras-search-input"
                                />
                            </div>
                            <div className="compras-count-label">
                                {proveedoresFiltrados.length} proveedores registrados
                            </div>
                        </div>

                        <div className="compras-table-wrapper">
                            <table className="compras-table">
                                <thead>
                                    <tr>
                                        <th>Razón Social</th>
                                        <th>RUT Proveedor</th>
                                        <th>Dirección Comercial</th>
                                        <th>Ciudad / Comuna</th>
                                        <th>Región</th>
                                        {puedeEditar && <th>Acciones</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {cargando ? (
                                        <tr>
                                            <td colSpan={puedeEditar ? 6: 5} className="compras-table-empty">
                                                Cargando nómina de proveedores...
                                            </td>
                                        </tr>
                                    ) : proveedoresFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={puedeEditar ? 6 : 5} className="compras-table-empty">
                                                No se encontraron proveedores registrados.
                                            </td>
                                        </tr>
                                    ) : (
                                        proveedoresFiltrados.map((p) => {
                                            const idProv = p.id_proveedor || p.id;
                                            return (
                                                <tr key={idProv}>
                                                    <td className="compras-td-name">{p.razon_social}</td>
                                                    <td className="compras-td-rut">{formatearRutVisual(p.rut)}</td>
                                                    <td className="compras-td-text">{p.direccion}</td>
                                                    <td>
                                                        <span className="compras-location-badge">
                                                            {p.ciudad} ({p.comuna})
                                                        </span>
                                                    </td>
                                                    <td className="compras-td-text">{p.region}</td>
                                                    {puedeEditar && (
                                                        <td>
                                                            <div className="compras-actions-cell">
                                                                <button type="button" onClick={() => abrirModalEditarProveedor(p)} className="compras-btn-edit" title="Modificar datos del proveedor">
                                                                    <Edit2 size={14} />
                                                                    <span>Editar</span>
                                                                </button>
                                                                <button type="button" onClick={() => manejarEliminarProveedor(idProv, p.razon_social)} className="compras-btn-delete" title="Eliminar proveedor">
                                                                    <Trash2 size={14} />
                                                                    <span>Eliminar</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {pestana === 'facturas' && (
                    <FacturasComprasView
                        proveedores={proveedores}
                        articulos={articulos}
                        onRegistrarFactura={manejarRegistroFactura}
                    />
                )}

                {pestana === 'finanzas' && puedeVerFinanzas && (
                    <FinanzasView proveedores={proveedores} clientes={clientes} />
                )}

                {modalClienteAbierto && (
                    <div className="compras-modal-overlay">
                        <div className="compras-modal-card">
                            <div className="compras-modal-header">
                                <div className="compras-modal-title">
                                    {editClienteId ? 'Modificar Datos del Cliente' : 'Registrar Nuevo Cliente'}
                                </div>
                                <button type="button" onClick={() => setModalClienteAbierto(false)} className="compras-modal-close">X</button>
                            </div>

                            <form onSubmit={guardarClienteForm} className="compras-modal-form">
                                {error && <div className="alerta-error">{error}</div>}

                                <div className="compras-form-grid">
                                    <div className="compras-form-group">
                                        <label className="compras-form-label">RUT de la Empresa</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: 76.123.456-7"
                                            value={formCliente.rut}
                                            onChange={(e) => setFormCliente({ ...formCliente, rut: formatearRutVisual(e.target.value), })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Nombre o Razón Social</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Agroindustrial del Sur SpA"
                                            value={formCliente.razon_social}
                                            onChange={(e) => setFormCliente({ ...formCliente, razon_social: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group full-width">
                                        <label className="compras-form-label">Rubro o Giro Comercial</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Exportación y Frigorífico de Frutas"
                                            value={formCliente.giro_comercial}
                                            onChange={(e) => setFormCliente({ ...formCliente, giro_comercial: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group full-width">
                                        <label className="compras-form-label">Dirección Comercial</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Ruta 5 Sur Km 402"
                                            value={formCliente.direccion}
                                            onChange={(e) => setFormCliente({ ...formCliente, direccion: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Región</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Ñuble"
                                            value={formCliente.region}
                                            onChange={(e) => setFormCliente({ ...formCliente, region: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Comuna</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Chillán"
                                            value={formCliente.comuna}
                                            onChange={(e) => setFormCliente({ ...formCliente, comuna: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Ciudad</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Chillán"
                                            value={formCliente.ciudad}
                                            onChange={(e) => setFormCliente({ ...formCliente, ciudad: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Nombre del Representante</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Juan Pérez"
                                            value={formCliente.nombre_representante}
                                            onChange={(e) => setFormCliente({ ...formCliente, nombre_representante: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group full-width">
                                        <label className="compras-form-label">RUT del Representante Legal</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: 12.345.678-9"
                                            value={formCliente.rut_representante}
                                            onChange={(e) => setFormCliente({ ...formCliente, rut_representante: formatearRutVisual(e.target.value), })}
                                            className="compras-form-input"
                                        />
                                    </div>
                                </div>

                                <div className="compras-modal-actions">
                                    <button type="button" onClick={() => setModalClienteAbierto(false)} className="compras-btn-cancel">Cancelar</button>
                                    <button type="submit" className="compras-btn-submit">
                                        {editClienteId ? 'Guardar Cambios' : 'Registrar Cliente'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {modalProveedorAbierto && (
                    <div className="compras-modal-overlay">
                        <div className="compras-modal-card">
                            <div className="compras-modal-header">
                                <div className="compras-modal-title">
                                    {editProveedorId ? 'Modificar Datos del Proveedor' : 'Registrar Nuevo Proveedor'}
                                </div>
                                <button type="button" onClick={() => setModalProveedorAbierto(false)} className="compras-modal-close">X</button>
                            </div>

                            <form onSubmit={guardarProveedorForm} className="compras-modal-form">
                                {error && <div className="alerta-error">{error}</div>}

                                <div className="compras-form-grid">
                                    <div className="compras-form-group">
                                        <label className="compras-form-label">RUT del Proveedor</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: 76.543.210-K"
                                            value={formProveedor.rut}
                                            onChange={(e) => setFormProveedor({ ...formProveedor, rut: formatearRutVisual(e.target.value), })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Nombre o Razón Social</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Gases y Refrigerantes Biobío"
                                            value={formProveedor.razon_social}
                                            onChange={(e) => setFormProveedor({ ...formProveedor, razon_social: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group full-width">
                                        <label className="compras-form-label">Dirección Comercial</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Av. O'Higgins 850"
                                            value={formProveedor.direccion}
                                            onChange={(e) => setFormProveedor({ ...formProveedor, direccion: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Región</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Ñuble"
                                            value={formProveedor.region}
                                            onChange={(e) => setFormProveedor({ ...formProveedor, region: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Comuna</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Chillán"
                                            value={formProveedor.comuna}
                                            onChange={(e) => setFormProveedor({ ...formProveedor, comuna: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group full-width">
                                        <label className="compras-form-label">Ciudad</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Chillán"
                                            value={formProveedor.ciudad}
                                            onChange={(e) => setFormProveedor({ ...formProveedor, ciudad: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>
                                </div>

                                <div className="compras-modal-actions">
                                    <button type="button" onClick={() => setModalProveedorAbierto(false)} className="compras-btn-cancel">Cancelar</button>
                                    <button type="submit" className="compras-btn-submit">
                                        {editProveedorId ? 'Guardar Cambios' : 'Registrar Proveedor'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ComprasView;