import React, { useEffect, useState } from "react";
import { Building2, Truck, Receipt, PieChart, Plus, Search, Edit2, Trash2, Download } from "lucide-react";
import { obtenerClientes, crearCliente, actualizarCliente, eliminarCliente, obtenerProveedores, crearProveedor, actualizarProveedor, eliminarProveedor, obtenerArticulos, crearFactura } from '../services_api/inventarioService';
import { formatearRutVisual, limpiarRutParaGuardar } from './GestionUsuariosView'
import FacturasComprasView from "../components/FacturasComprasView";
import FinanzasView from './FinanzasView'
import { exportarExcel } from "../utils/exportarExcel";
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

// Pantalla de administración comercial para Clientes, Proveedores, Facturas y Gastos.
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
    const puedeEliminar = usuario?.rol === 'administracion';
    const puedeVerFinanzas = ['administracion', 'encargado_finanza'].includes(usuario?.rol);

    // Extrae un aviso entendible cuando el servidor rechaza un dato.
    const formatearErrorAPI = (err, fallback) => {
        const data = err.response?.data;
        if (typeof data?.detail === 'string') return data.detail;
        if (data && typeof data === 'object') {
            return Object.values(data).flat().join(' ');
        }
        return fallback;
    };

    // Carga clientes, proveedores y materiales desde el servidor.
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

    // Cambia entre pestañas.
    const cambiarPestana = (nuevaPestana) => {
        setPestana(nuevaPestana);
        setMensaje('');
        setError('');
    };

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

    // Guarda un cliente nuevo o actualiza uno existente.
    const guardarClienteForm = async (e) => {
        e.preventDefault();
        setError('');
        setMensaje('');
        const datosCliente = {
            rut: limpiarRutParaGuardar(formCliente.rut),
            razon_social: formCliente.razon_social.trim(),
            giro_comercial: formCliente.giro_comercial.trim(),
            direccion: formCliente.direccion.trim(),
            region: formCliente.region.trim(),
            comuna: formCliente.comuna.trim(),
            ciudad: formCliente.ciudad.trim(),
            nombre_representante: formCliente.nombre_representante.trim(),
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
            rut: limpiarRutParaGuardar(formProveedor.rut),
            razon_social: formProveedor.razon_social.trim(),
            direccion: formProveedor.direccion.trim(),
            region: formProveedor.region.trim(),
            comuna: formProveedor.comuna.trim(),
            ciudad: formProveedor.ciudad.trim(),
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

    // Elimina un cliente solo si no tiene obras registradas en el sistema.
    const manejarEliminarCliente = async (idCliente, razonSocial) => {
        if (!window.confirm(`¿Está seguro de eliminar al cliente "${razonSocial}"?`)) return;
        setError('');
        setMensaje('');
        try {
            await eliminarCliente(idCliente);
            setMensaje('Cliente eliminado correctamente.');
            await cargarEntidades();
        } catch (err) {
            setError(
                formatearErrorAPI(
                    err,
                    'No se puede eliminar este cliente porque ya tiene obras asociadas en el sistema.'
                )
            );
        }
    };

    // Elimina un proveedor solo si no tiene facturas registradas en el sistema.
    const manejarEliminarProveedor = async (idProveedor, razonSocial) => {
        if (!window.confirm(`¿Está seguro de eliminar al proveedor "${razonSocial}"?`)) return;
        setError('');
        setMensaje('');
        try {
            await eliminarProveedor(idProveedor);
            setMensaje('Proveedor eliminado correctamente.');
            await cargarEntidades();
        } catch (err) {
            setError(
                formatearErrorAPI(
                    err,
                    'No se puede eliminar este proveedor porque ya tiene facturas registradas en el sistema.'
                )
            );
        }
    };

    // Envía la factura de compra directamente al servidor y actualiza datos.
    const manejarRegistroFactura = async (facturaData) => {
        setError('');
        setMensaje('');

        const res = await crearFactura({
            id_proveedor: facturaData.id_proveedor,
            numero_documento: facturaData.numero_documento,
            fecha_ingreso: facturaData.fecha_ingreso,
            id_articulo: facturaData.articulo_id,
            cantidad: Number(facturaData.cantidad),
            precio_unitario: Number(facturaData.precio_unitario),
            descuento_1: Number(facturaData.descuento_1 || 0),
            descuento_2: Number(facturaData.descuento_2 || 0),
            descuento_3: Number(facturaData.descuento_3 || 0),
            observaciones: facturaData.observaciones || '',
        });

        if (res.data?.pendiente_recepcion) {
            setMensaje(
                `Factura ${facturaData.documento} registrada en gastos. Se creó un pedido "En camino" para que Bodega confirme la llegada física antes de sumar el stock.`
            );
        } else {
            setMensaje(
                `Factura ${facturaData.documento} registrada con éxito. Se sumaron ${facturaData.cantidad} unidades al stock de bodega.`
            );
            window.dispatchEvent(new Event('fyag_inventario_actualizado'));
        }

        await cargarEntidades();
        return res.data;
    };

    const clientesFiltrados = clientes.filter((c) => {
        const q = busquedaCliente.toLowerCase();
        const rutPuntos = formatearRutVisual(c.rut).toLowerCase();
        return (
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
        return (
            p.razon_social?.toLowerCase().includes(q) ||
            p.rut?.toLowerCase().includes(q) ||
            rutPuntos.includes(q) ||
            p.direccion?.toLowerCase().includes(q) ||
            p.ciudad?.toLowerCase().includes(q) ||
            p.comuna?.toLowerCase().includes(q)
        );
    });

    // Exporta a Excel la nómina de clientes.
    const exportarClientesExcel = async () => {
        await exportarExcel({
            nombreArchivo: `nomina_clientes_fyag_${new Date().toLocaleDateString('en-CA')}.xlsx`,
            nombreHoja: 'Clientes',
            titulo: 'Nómina de Clientes Mandantes',
            columnas: [
                { header: 'RUT Empresa', key: 'rut', width: 16, alineacion: 'center' },
                { header: 'Razón Social', key: 'razon_social', width: 32 },
                { header: 'Giro Comercial', key: 'giro_comercial', width: 30 },
                { header: 'Dirección', key: 'direccion', width: 28 },
                { header: 'Comuna', key: 'comuna', width: 16 },
                { header: 'Ciudad', key: 'ciudad', width: 16 },
                { header: 'Región', key: 'region', width: 16 },
                { header: 'Representante Legal', key: 'representante', width: 24 },
                { header: 'RUT Representante', key: 'rut_rep', width: 18, alineacion: 'center' },
            ],
            filas: clientesFiltrados.map((c) => ({
                rut: formatearRutVisual(c.rut),
                razon_social: c.razon_social,
                giro_comercial: c.giro_comercial,
                direccion: c.direccion,
                comuna: c.comuna,
                ciudad: c.ciudad,
                region: c.region,
                representante: c.nombre_representante,
                rut_rep: formatearRutVisual(c.rut_representante),
            })),
        });
    };

    // Exporta a Excel la nómina de proveedores.
    const exportarProveedoresExcel = async () => {
        await exportarExcel({
            nombreArchivo: `nomina_proveedores_fyag_${new Date().toLocaleDateString('en-CA')}.xlsx`,
            nombreHoja: 'Proveedores',
            titulo: 'Nómina de Proveedores',
            columnas: [
                { header: 'RUT Proveedor', key: 'rut', width: 16, alineacion: 'center' },
                { header: 'Razón Social', key: 'razon_social', width: 34 },
                { header: 'Dirección Comercial', key: 'direccion', width: 30 },
                { header: 'Comuna', key: 'comuna', width: 18 },
                { header: 'Ciudad', key: 'ciudad', width: 18 },
                { header: 'Región', key: 'region', width: 18 },
            ],
            filas: proveedoresFiltrados.map((p) => ({
                rut: formatearRutVisual(p.rut),
                razon_social: p.razon_social,
                direccion: p.direccion,
                comuna: p.comuna,
                ciudad: p.ciudad,
                region: p.region,
            })),
        });
    };

    const modalActivo = modalClienteAbierto || modalProveedorAbierto;

    return (
        <div className="contenedor-vista">
            <div className="compras-container">
                <div className="compras-header">
                    <div>
                        <h1 className="compras-title">Clientes, Proveedores y Facturación</h1>
                        <p className="compras-subtitle">
                            Administración de fichas comerciales de empresas, ingreso de compras y control de gastos
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
                    <button type="button" className={`compras-tab-item ${pestana === 'clientes' ? 'active' : ''}`} onClick={() => cambiarPestana('clientes')}>
                        <Building2 size={16} />
                        <span>Clientes Mandantes</span>
                        <span className="compras-tab-count">{clientes.length}</span>
                    </button>

                    <button type="button" className={`compras-tab-item ${pestana === 'proveedores' ? 'active' : ''}`} onClick={() => cambiarPestana('proveedores')}>
                        <Truck size={16} />
                        <span>Proveedores</span>
                        <span className="compras-tab-count">{proveedores.length}</span>
                    </button>

                    <button type="button" className={`compras-tab-item ${pestana === 'facturas' ? 'active' : ''}`} onClick={() => cambiarPestana('facturas')}>
                        <Receipt size={16} />
                        <span>Ingreso de Facturas</span>
                    </button>

                    {puedeVerFinanzas && (
                        <button type="button" className={`compras-tab-item ${pestana === 'finanzas' ? 'active' : ''}`} onClick={() => cambiarPestana('finanzas')}>
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
                                    maxLength={80}
                                    placeholder="Buscar cliente por razón social, RUT, ciudad o representante..."
                                    value={busquedaCliente}
                                    onChange={(e) => setBusquedaCliente(e.target.value)}
                                    className="compras-search-input"
                                />
                            </div>
                            <div className="compras-toolbar-right">
                                <span className="compras-count-label">
                                    {clientesFiltrados.length} clientes registrados
                                </span>
                                <button type="button" onClick={exportarClientesExcel} disabled={clientesFiltrados.length === 0} className="compras-btn-export">
                                    <Download size={14} />
                                    <span>Exportar Excel</span>
                                </button>
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
                                            <td colSpan={puedeEditar ? 7 : 6} className="compras-table-empty">
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
                                                            {puedeEliminar && (
                                                                <button type="button" onClick={() => manejarEliminarCliente(c.id_cliente, c.razon_social)} className="compras-btn-delete" title="Eliminar cliente">
                                                                    <Trash2 size={14} />
                                                                    <span>Eliminar</span>
                                                                </button>
                                                            )}
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
                                    maxLength={80}
                                    placeholder="Buscar proveedor por razón social, RUT, dirección o ciudad..."
                                    value={busquedaProveedor}
                                    onChange={(e) => setBusquedaProveedor(e.target.value)}
                                    className="compras-search-input"
                                />
                            </div>
                            <div className="compras-toolbar-right">
                                <span className="compras-count-label">
                                    {proveedoresFiltrados.length} proveedores registrados
                                </span>
                                <button type="button" onClick={exportarProveedoresExcel} disabled={proveedoresFiltrados.length === 0} className="compras-btn-export">
                                    <Download size={14} />
                                    <span>Exportar Excel</span>
                                </button>
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
                                                                {puedeEliminar && (
                                                                    <button type="button" onClick={() => manejarEliminarProveedor(idProv, p.razon_social)} className="compras-btn-delete" title="Eliminar proveedor">
                                                                        <Trash2 size={14} />
                                                                        <span>Eliminar</span>
                                                                    </button>
                                                                )}
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
                        usuario={usuario}
                        onRegistrarFactura={manejarRegistroFactura}
                    />
                )}

                {pestana === 'finanzas' && puedeVerFinanzas && <FinanzasView />}

                {modalClienteAbierto && (
                    <div className="compras-modal-overlay">
                        <div className="compras-modal-card">
                            <div className="compras-modal-header">
                                <div className="compras-modal-title">
                                    {editClienteId ? 'Modificar Datos del Cliente' : 'Registrar Nuevo Cliente'}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setModalClienteAbierto(false)}
                                    className="compras-modal-close"
                                >
                                    X
                                </button>
                            </div>

                            <form onSubmit={guardarClienteForm} className="compras-modal-form">
                                {error && <div className="alerta-error">{error}</div>}

                                <div className="compras-form-grid">
                                    <div className="compras-form-group">
                                        <label className="compras-form-label">RUT de la Empresa</label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={12}
                                            placeholder="Ej: 76.123.456-7"
                                            value={formCliente.rut}
                                            onChange={(e) =>
                                                setFormCliente({
                                                    ...formCliente,
                                                    rut: formatearRutVisual(e.target.value),
                                                })
                                            }
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Nombre o Razón Social</label>
                                        <input
                                            type="text"
                                            required
                                            minLength={3}
                                            maxLength={120}
                                            placeholder="Ej: Agroindustrial del Sur SpA"
                                            value={formCliente.razon_social}
                                            onChange={(e) =>
                                                setFormCliente({ ...formCliente, razon_social: e.target.value })
                                            }
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group full-width">
                                        <label className="compras-form-label">Rubro o Giro Comercial</label>
                                        <input
                                            type="text"
                                            required
                                            minLength={3}
                                            maxLength={120}
                                            placeholder="Ej: Exportación y Frigorífico de Frutas"
                                            value={formCliente.giro_comercial}
                                            onChange={(e) =>
                                                setFormCliente({ ...formCliente, giro_comercial: e.target.value })
                                            }
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group full-width">
                                        <label className="compras-form-label">Dirección Comercial</label>
                                        <input
                                            type="text"
                                            required
                                            minLength={5}
                                            maxLength={150}
                                            placeholder="Ej: Ruta 5 Sur Km 402"
                                            value={formCliente.direccion}
                                            onChange={(e) =>
                                                setFormCliente({ ...formCliente, direccion: e.target.value })
                                            }
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Región</label>
                                        <input
                                            type="text"
                                            required
                                            minLength={2}
                                            maxLength={80}
                                            placeholder="Ej: Ñuble"
                                            value={formCliente.region}
                                            onChange={(e) =>
                                                setFormCliente({ ...formCliente, region: e.target.value })
                                            }
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Comuna</label>
                                        <input
                                            type="text"
                                            required
                                            minLength={2}
                                            maxLength={80}
                                            placeholder="Ej: Chillán"
                                            value={formCliente.comuna}
                                            onChange={(e) =>
                                                setFormCliente({ ...formCliente, comuna: e.target.value })
                                            }
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Ciudad</label>
                                        <input
                                            type="text"
                                            required
                                            minLength={2}
                                            maxLength={80}
                                            placeholder="Ej: Chillán"
                                            value={formCliente.ciudad}
                                            onChange={(e) =>
                                                setFormCliente({ ...formCliente, ciudad: e.target.value })
                                            }
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Nombre del Representante</label>
                                        <input
                                            type="text"
                                            required
                                            minLength={3}
                                            maxLength={80}
                                            placeholder="Ej: Juan Pérez"
                                            value={formCliente.nombre_representante}
                                            onChange={(e) =>
                                                setFormCliente({
                                                    ...formCliente,
                                                    nombre_representante: e.target.value,
                                                })
                                            }
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group full-width">
                                        <label className="compras-form-label">RUT del Representante Legal</label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={12}
                                            placeholder="Ej: 12.345.678-9"
                                            value={formCliente.rut_representante}
                                            onChange={(e) =>
                                                setFormCliente({
                                                    ...formCliente,
                                                    rut_representante: formatearRutVisual(e.target.value),
                                                })
                                            }
                                            className="compras-form-input"
                                        />
                                    </div>
                                </div>

                                <div className="compras-modal-actions">
                                    <button
                                        type="button"
                                        onClick={() => setModalClienteAbierto(false)}
                                        className="compras-btn-cancel"
                                    >
                                        Cancelar
                                    </button>
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
                                <button
                                    type="button"
                                    onClick={() => setModalProveedorAbierto(false)}
                                    className="compras-modal-close"
                                >
                                    X
                                </button>
                            </div>

                            <form onSubmit={guardarProveedorForm} className="compras-modal-form">
                                {error && <div className="alerta-error">{error}</div>}

                                <div className="compras-form-grid">
                                    <div className="compras-form-group">
                                        <label className="compras-form-label">RUT del Proveedor</label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={12}
                                            placeholder="Ej: 76.543.210-K"
                                            value={formProveedor.rut}
                                            onChange={(e) =>
                                                setFormProveedor({
                                                    ...formProveedor,
                                                    rut: formatearRutVisual(e.target.value),
                                                })
                                            }
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Nombre o Razón Social</label>
                                        <input
                                            type="text"
                                            required
                                            minLength={3}
                                            maxLength={120}
                                            placeholder="Ej: Gases y Refrigerantes Biobío"
                                            value={formProveedor.razon_social}
                                            onChange={(e) =>
                                                setFormProveedor({ ...formProveedor, razon_social: e.target.value })
                                            }
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group full-width">
                                        <label className="compras-form-label">Dirección Comercial</label>
                                        <input
                                            type="text"
                                            required
                                            minLength={5}
                                            maxLength={150}
                                            placeholder="Ej: Av. O'Higgins 850"
                                            value={formProveedor.direccion}
                                            onChange={(e) =>
                                                setFormProveedor({ ...formProveedor, direccion: e.target.value })
                                            }
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Región</label>
                                        <input
                                            type="text"
                                            required
                                            minLength={2}
                                            maxLength={80}
                                            placeholder="Ej: Ñuble"
                                            value={formProveedor.region}
                                            onChange={(e) =>
                                                setFormProveedor({ ...formProveedor, region: e.target.value })
                                            }
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Comuna</label>
                                        <input
                                            type="text"
                                            required
                                            minLength={2}
                                            maxLength={80}
                                            placeholder="Ej: Chillán"
                                            value={formProveedor.comuna}
                                            onChange={(e) =>
                                                setFormProveedor({ ...formProveedor, comuna: e.target.value })
                                            }
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group full-width">
                                        <label className="compras-form-label">Ciudad</label>
                                        <input
                                            type="text"
                                            required
                                            minLength={2}
                                            maxLength={80}
                                            placeholder="Ej: Chillán"
                                            value={formProveedor.ciudad}
                                            onChange={(e) =>
                                                setFormProveedor({ ...formProveedor, ciudad: e.target.value })
                                            }
                                            className="compras-form-input"
                                        />
                                    </div>
                                </div>

                                <div className="compras-modal-actions">
                                    <button
                                        type="button"
                                        onClick={() => setModalProveedorAbierto(false)}
                                        className="compras-btn-cancel"
                                    >
                                        Cancelar
                                    </button>
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