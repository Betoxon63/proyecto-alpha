import React, { useState, useEffect } from 'react';
import { Receipt, Building2, CreditCard, Edit2, Lock, Download, Eye, X } from 'lucide-react';
import {
    obtenerProveedores,
    actualizarProveedor,
    obtenerClientes,
    actualizarCliente,
    obtenerFacturas,
} from '../services_api/inventarioService';
import { formatearRutVisual, limpiarRutParaGuardar } from './GestionUsuariosView';
import '../styles/FinanzasView.css';

export default function FinanzasView({
    proveedores: provProp = null,
    clientes: cliProp = null,
    facturas: facProp = null,
}) {
    const [activeSubTab, setActiveSubTab] = useState('gastos');
    const [listaProveedores, setListaProveedores] = useState(provProp || []);
    const [listaClientes, setListaClientes] = useState(cliProp || []);
    const [facturasComprasMes, setFacturasComprasMes] = useState(facProp || []);
    const [editingProveedor, setEditingProveedor] = useState(null);
    const [editingCliente, setEditingCliente] = useState(null);
    const [mensaje, setMensaje] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [modalFotoRespaldo, setModalFotoRespaldo] = useState(null);

    const obtenerUrlMedia = (ruta) => {
        if (!ruta) return '';
        if (ruta.startsWith('http://') || ruta.startsWith('https://') || ruta.startsWith('data:')) {
            return ruta;
        }
        const backendRoot = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/api\/?$/, '');
        return `${backendRoot}${ruta.startsWith('/') ? '' : '/'}${ruta}`;
    };

    const cargarEntidadesReales = async () => {
        try {
            const [resProv, resCli, resFac] = await Promise.all([
                obtenerProveedores(),
                obtenerClientes(),
                obtenerFacturas().catch(() => ({ data: [] })),
            ]);
            setListaProveedores(resProv.data || []);
            setListaClientes(resCli.data || []);

            if (Array.isArray(resFac.data)) {
                const adaptadas = resFac.data.map((f) => {
                    const totalFac = Number(f.total || 0);
                    const netoFac = Math.round(totalFac / 1.19);
                    const ivaFac = totalFac - netoFac;
                    const primerDetalle = f.detalles?.[0];
                    const textoDetalle = primerDetalle
                        ? `${primerDetalle.cantidad}x ${primerDetalle.articulo_nombre}`
                        : f.observaciones || 'Compra de materiales';
                    return {
                        id: `FAC-${f.numero_documento}`,
                        fecha: f.fecha_ingreso,
                        proveedor: f.proveedor_nombre || 'Proveedor',
                        detalle: textoDetalle,
                        neto: netoFac,
                        iva: ivaFac,
                        total: totalFac,
                        estado: 'Pagada',
                        imagen_respaldo: f.imagen_respaldo || null
                    };
                });
                setFacturasComprasMes(adaptadas);
            }
        } catch {
            setErrorMsg('No se pudieron cargar las fichas comerciales.');
        }
    };

    useEffect(() => {
        cargarEntidadesReales();
    }, [provProp, cliProp]);

    const totalNetoMes = facturasComprasMes.reduce((acc, f) => acc + Number(f.neto || 0), 0);
    const totalIvaMes = facturasComprasMes.reduce((acc, f) => acc + Number(f.iva || 0), 0);
    const totalGastosMes = facturasComprasMes.reduce((acc, f) => acc + Number(f.total || 0), 0);

    const handleGuardarProveedor = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setMensaje('');
        try {
            await actualizarProveedor(editingProveedor.id_proveedor, {
                ...editingProveedor,
                rut: limpiarRutParaGuardar(editingProveedor.rut),
            });
            setMensaje('Los datos del proveedor se actualizaron correctamente.');
            setEditingProveedor(null);
            await cargarEntidadesReales();
        } catch {
            setErrorMsg('No se pudieron guardar los cambios del proveedor. Revise que el RUT sea válido.');
        }
    };

    const handleGuardarCliente = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setMensaje('');
        try {
            await actualizarCliente(editingCliente.id_cliente, {
                ...editingCliente,
                rut: limpiarRutParaGuardar(editingCliente.rut),
                rut_representante: limpiarRutParaGuardar(editingCliente.rut_representante),
            });
            setMensaje('Los datos del cliente se actualizaron correctamente.');
            setEditingCliente(null);
            await cargarEntidadesReales();
        } catch {
            setErrorMsg('No se pudieron guardar los cambios del cliente. Revise que el RUT sea válido.');
        }
    };

    const exportarNominaProveedoresCSV = () => {
        const encabezados = ['RUT', 'Razon Social', 'Direccion', 'Comuna', 'Ciudad', 'Region'];
        const filas = listaProveedores.map((p) => [
            p.rut,
            `"${p.razon_social}"`,
            `"${p.direccion}"`,
            `"${p.comuna}"`,
            `"${p.ciudad}"`,
            `"${p.region}"`,
        ]);
        const csvContent =
            'data:text/csv;charset=utf-8,' +
            [encabezados.join(','), ...filas.map((e) => e.join(','))].join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', 'nomina_proveedores_fyag.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="finanzas-container">
            <div className="finanzas-header">
                <div>
                    <h2 className="finanzas-title">Control de Costos y Facturación del Mes</h2>
                    <p className="finanzas-subtitle">
                        Revisión de gastos mensuales en materiales y actualización de datos de proveedores y clientes
                    </p>
                </div>

                <div className="finanzas-banner-lock">
                    <Lock size={15} color="#d97706" />
                    <span>Área de Finanzas: Consulta de gastos sin modificación de stock físico</span>
                </div>
            </div>

            {mensaje && <div className="alerta-exito">{mensaje}</div>}
            {errorMsg && <div className="alerta-error">{errorMsg}</div>}

            <div className="finanzas-tabs">
                <button
                    type="button"
                    onClick={() => setActiveSubTab('gastos')}
                    className={`finanzas-tab-btn ${activeSubTab === 'gastos' ? 'active' : ''}`}
                >
                    <Receipt size={17} />
                    <span>Gastos Mensuales en Facturas</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveSubTab('proveedores')}
                    className={`finanzas-tab-btn ${activeSubTab === 'proveedores' ? 'active' : ''}`}
                >
                    <CreditCard size={17} />
                    <span>Fichas de Proveedores ({listaProveedores.length})</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveSubTab('clientes')}
                    className={`finanzas-tab-btn ${activeSubTab === 'clientes' ? 'active' : ''}`}
                >
                    <Building2 size={17} />
                    <span>Fichas de Clientes ({listaClientes.length})</span>
                </button>
            </div>

            {activeSubTab === 'gastos' && (
                <div className="finanzas-section-stack">
                    <div className="finanzas-cards-grid-3">
                        <div className="finanzas-metric-card">
                            <div className="finanzas-metric-label">TOTAL NETO EN MATERIALES</div>
                            <div className="finanzas-metric-val-main">
                                ${totalNetoMes.toLocaleString('es-CL')}
                            </div>
                            <div className="finanzas-metric-subtext-green">
                                Compras con descuentos aplicados
                            </div>
                        </div>

                        <div className="finanzas-metric-card">
                            <div className="finanzas-metric-label">CRÉDITO FISCAL (IVA 19%)</div>
                            <div className="finanzas-metric-val-muted">
                                ${totalIvaMes.toLocaleString('es-CL')}
                            </div>
                            <div className="finanzas-metric-subtext">IVA recuperable del período</div>
                        </div>

                        <div className="finanzas-metric-card-highlight">
                            <div className="finanzas-metric-label-green">TOTAL GASTOS DEL MES</div>
                            <div className="finanzas-metric-val-total">
                                ${totalGastosMes.toLocaleString('es-CL')}
                            </div>
                            <div className="finanzas-metric-subtext-green">Consolidado Mensual FYAG SpA</div>
                        </div>
                    </div>

                    <div className="finanzas-table-card">
                        <div className="finanzas-table-header">
                            <div className="finanzas-table-title">
                                Desglose de Facturas de Proveedores del Mes
                            </div>
                            <span className="finanzas-table-meta">
                                {facturasComprasMes.length} facturas registradas
                            </span>
                        </div>

                        <div className="finanzas-table-scroll">
                            <table className="finanzas-table">
                                <thead>
                                    <tr className="finanzas-thead-tr">
                                        <th className="finanzas-th">N° Factura</th>
                                        <th className="finanzas-th">Fecha Emisión</th>
                                        <th className="finanzas-th">Proveedor</th>
                                        <th className="finanzas-th">Materiales / Detalle</th>
                                        <th className="finanzas-th-right">Valor Neto</th>
                                        <th className="finanzas-th-right">IVA (19%)</th>
                                        <th className="finanzas-th-right">Total Factura</th>
                                        <th className="finanzas-th-center">Respaldo Físico</th>
                                        <th className="finanzas-th-center">Estado Pago</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {facturasComprasMes.length === 0 ? (
                                      <tr>
                                        <td colSpan={9} className='finanzas-empty-row'>
                                          No hay facturas registradas en el sistema.
                                        </td>
                                      </tr>
                                    ) : (
                                      facturasComprasMes.map((f, idx) => (
                                        <tr key={`${f.id}-${idx}`} className="finanzas-tr">
                                            <td className="finanzas-td-mono">{f.id}</td>
                                            <td className="finanzas-td-muted">{f.fecha}</td>
                                            <td className="finanzas-td-bold">{f.proveedor}</td>
                                            <td className="finanzas-td-normal">{f.detalle}</td>
                                            <td className="finanzas-td-right">
                                                ${Number(f.neto || 0).toLocaleString('es-CL')}
                                            </td>
                                            <td className="finanzas-td-right-muted">
                                                ${Number(f.iva || 0).toLocaleString('es-CL')}
                                            </td>
                                            <td className="finanzas-td-total">
                                                ${Number(f.total || 0).toLocaleString('es-CL')}
                                            </td>
                                            <td className="finanzas-td-center">
                                                {f.imagen_respaldo ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setModalFotoRespaldo(f)}
                                                        style={{
                                                            background: '#ecfdf5',
                                                            border: '1px solid #a7f3d0',
                                                            color: '#065f46',
                                                            borderRadius: '6px',
                                                            padding: '4px 8px',
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                        title="Ver foto o escaneo del documento físico"
                                                    >
                                                        <Eye size={12} />
                                                        <span>Ver Guía</span>
                                                    </button>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>Manual</span>
                                                )}
                                            </td>
                                            <td className="finanzas-td-center">
                                                <span
                                                    className={`finanzas-status-badge ${
                                                        f.estado === 'Pendiente' ? 'pending' : 'paid'
                                                    }`}
                                                >
                                                    {f.estado}
                                                </span>
                                            </td>
                                        </tr>
                                      ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === 'proveedores' && (
                <div className="finanzas-section-stack">
                    <div className="finanzas-table-card">
                        <div className="finanzas-table-header">
                            <div>
                                <div className="finanzas-table-title">Fichas Comerciales de Proveedores</div>
                                <div className="finanzas-subtitle">
                                    Actualización directa de datos comerciales y de contacto
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={exportarNominaProveedoresCSV}
                                className="finanzas-btn-export"
                            >
                                <Download size={14} />
                                <span>Descargar Nómina CSV</span>
                            </button>
                        </div>

                        <div className="finanzas-table-scroll">
                            <table className="finanzas-table">
                                <thead>
                                    <tr className="finanzas-thead-tr">
                                        <th className="finanzas-th">Razón Social</th>
                                        <th className="finanzas-th">RUT</th>
                                        <th className="finanzas-th">Dirección</th>
                                        <th className="finanzas-th">Comuna</th>
                                        <th className="finanzas-th">Ciudad / Región</th>
                                        <th className="finanzas-th-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {listaProveedores.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="finanzas-empty-row">
                                                No hay proveedores registrados en el sistema.
                                            </td>
                                        </tr>
                                    ) : (
                                        listaProveedores.map((p) => (
                                            <tr key={p.id_proveedor} className="finanzas-tr">
                                                <td className="finanzas-td-bold">{p.razon_social}</td>
                                                <td className="finanzas-td-mono">{formatearRutVisual(p.rut)}</td>
                                                <td className="finanzas-td-normal">{p.direccion}</td>
                                                <td className="finanzas-td-muted">{p.comuna}</td>
                                                <td className="finanzas-td-normal">
                                                    {p.ciudad} ({p.region})
                                                </td>
                                                <td className="finanzas-td-center">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setEditingProveedor({
                                                                ...p,
                                                                rut: formatearRutVisual(p.rut),
                                                            })
                                                        }
                                                        className="finanzas-btn-edit"
                                                    >
                                                        <Edit2 size={13} />
                                                        <span>Editar</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {editingProveedor && (
                        <div className="finanzas-modal-overlay">
                            <div className="finanzas-modal-box">
                                <div className="finanzas-modal-header">
                                    <h3 className="finanzas-modal-title">
                                        Modificar Proveedor: {editingProveedor.razon_social}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setEditingProveedor(null)}
                                        className="finanzas-modal-close"
                                    >
                                        X
                                    </button>
                                </div>
                                <form onSubmit={handleGuardarProveedor} className="finanzas-modal-form">
                                    <div className="finanzas-form-group">
                                        <label className="finanzas-form-label">Razón Social</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingProveedor.razon_social}
                                            onChange={(e) =>
                                                setEditingProveedor({
                                                    ...editingProveedor,
                                                    razon_social: e.target.value,
                                                })
                                            }
                                            className="finanzas-input-field"
                                        />
                                    </div>
                                    <div className="finanzas-form-group">
                                        <label className="finanzas-form-label">RUT del Proveedor</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingProveedor.rut}
                                            onChange={(e) =>
                                                setEditingProveedor({
                                                    ...editingProveedor,
                                                    rut: formatearRutVisual(e.target.value),
                                                })
                                            }
                                            className="finanzas-input-field"
                                        />
                                    </div>
                                    <div className="finanzas-form-group">
                                        <label className="finanzas-form-label">Dirección Comercial</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingProveedor.direccion}
                                            onChange={(e) =>
                                                setEditingProveedor({
                                                    ...editingProveedor,
                                                    direccion: e.target.value,
                                                })
                                            }
                                            className="finanzas-input-field"
                                        />
                                    </div>
                                    <div className="finanzas-form-group">
                                        <label className="finanzas-form-label">Ciudad</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingProveedor.ciudad}
                                            onChange={(e) =>
                                                setEditingProveedor({
                                                    ...editingProveedor,
                                                    ciudad: e.target.value,
                                                })
                                            }
                                            className="finanzas-input-field"
                                        />
                                    </div>
                                    <div className="finanzas-modal-actions">
                                        <button
                                            type="button"
                                            onClick={() => setEditingProveedor(null)}
                                            className="finanzas-btn-cancel"
                                        >
                                            Cancelar
                                        </button>
                                        <button type="submit" className="finanzas-btn-save">
                                            Guardar Cambios
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeSubTab === 'clientes' && (
                <div className="finanzas-table-card">
                    <div className="finanzas-table-header">
                        <div className="finanzas-table-title">Fichas Comerciales de Clientes Mandantes</div>
                        <span className="finanzas-table-meta">
                            {listaClientes.length} empresas registradas
                        </span>
                    </div>

                    <div className="finanzas-table-scroll">
                        <table className="finanzas-table">
                            <thead>
                                <tr className="finanzas-thead-tr">
                                    <th className="finanzas-th">Razón Social</th>
                                    <th className="finanzas-th">RUT</th>
                                    <th className="finanzas-th">Rubro / Giro Comercial</th>
                                    <th className="finanzas-th">Ubicación</th>
                                    <th className="finanzas-th">Representante Legal</th>
                                    <th className="finanzas-th-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listaClientes.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="finanzas-empty-row">
                                            No hay clientes registrados en el sistema.
                                        </td>
                                    </tr>
                                ) : (
                                    listaClientes.map((c) => (
                                        <tr key={c.id_cliente} className="finanzas-tr">
                                            <td className="finanzas-td-bold">{c.razon_social}</td>
                                            <td className="finanzas-td-mono">{formatearRutVisual(c.rut)}</td>
                                            <td className="finanzas-td-normal">{c.giro_comercial}</td>
                                            <td className="finanzas-td-muted">
                                                {c.ciudad} ({c.comuna})
                                            </td>
                                            <td className="finanzas-td-normal">
                                                {c.nombre_representante} ({formatearRutVisual(c.rut_representante)})
                                            </td>
                                            <td className="finanzas-td-center">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEditingCliente({
                                                            ...c,
                                                            rut: formatearRutVisual(c.rut),
                                                            rut_representante: formatearRutVisual(c.rut_representante),
                                                        })
                                                    }
                                                    className="finanzas-btn-edit"
                                                >
                                                    <Edit2 size={13} />
                                                    <span>Editar</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {editingCliente && (
                        <div className="finanzas-modal-overlay">
                            <div className="finanzas-modal-box">
                                <div className="finanzas-modal-header">
                                    <h3 className="finanzas-modal-title">
                                        Modificar Cliente: {editingCliente.razon_social}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setEditingCliente(null)}
                                        className="finanzas-modal-close"
                                    >
                                        X
                                    </button>
                                </div>
                                <form onSubmit={handleGuardarCliente} className="finanzas-modal-form">
                                    <div className="finanzas-form-group">
                                        <label className="finanzas-form-label">Razón Social</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingCliente.razon_social}
                                            onChange={(e) =>
                                                setEditingCliente({
                                                    ...editingCliente,
                                                    razon_social: e.target.value,
                                                })
                                            }
                                            className="finanzas-input-field"
                                        />
                                    </div>
                                    <div className="finanzas-form-group">
                                        <label className="finanzas-form-label">Rubro o Giro Comercial</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingCliente.giro_comercial}
                                            onChange={(e) =>
                                                setEditingCliente({
                                                    ...editingCliente,
                                                    giro_comercial: e.target.value,
                                                })
                                            }
                                            className="finanzas-input-field"
                                        />
                                    </div>
                                    <div className="finanzas-form-group">
                                        <label className="finanzas-form-label">Nombre del Representante Legal</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingCliente.nombre_representante}
                                            onChange={(e) =>
                                                setEditingCliente({
                                                    ...editingCliente,
                                                    nombre_representante: e.target.value,
                                                })
                                            }
                                            className="finanzas-input-field"
                                        />
                                    </div>
                                    <div className="finanzas-modal-actions">
                                        <button
                                            type="button"
                                            onClick={() => setEditingCliente(null)}
                                            className="finanzas-btn-cancel"
                                        >
                                            Cancelar
                                        </button>
                                        <button type="submit" className="finanzas-btn-save">
                                            Guardar Cambios
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL PARA VER EL RESPALDO FÍSICO DE LA FACTURA / GUÍA */}
            {modalFotoRespaldo && (
                <div className="compras-modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="compras-modal-card" style={{ maxWidth: '850px', width: '94vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: '14px', overflow: 'hidden' }}>
                        <div style={{ background: '#047857', color: '#ffffff', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Receipt size={22} />
                                <div>
                                    <strong style={{ fontSize: '15px', display: 'block' }}>Respaldo Físico - {modalFotoRespaldo.id}</strong>
                                    <span style={{ fontSize: '12px', opacity: 0.9 }}>
                                        {modalFotoRespaldo.proveedor} • Fecha: {modalFotoRespaldo.fecha} • Total: ${Number(modalFotoRespaldo.total).toLocaleString('es-CL')}
                                    </span>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setModalFotoRespaldo(null)} 
                                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                                title="Cerrar vista previa"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, textAlign: 'center', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img 
                                src={obtenerUrlMedia(modalFotoRespaldo.imagen_respaldo)} 
                                alt={`Respaldo ${modalFotoRespaldo.id}`}
                                style={{ maxWidth: '100%', maxHeight: '74vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}