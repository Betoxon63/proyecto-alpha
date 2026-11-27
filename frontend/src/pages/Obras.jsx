import React, { useEffect, useState } from "react";
import { Search, Edit2, Trash2, Plus, Briefcase, Wrench, Package, Download } from "lucide-react";
import { obraService, obtenerCardex } from "../services_api/obrasService";
import { obtenerClientes } from "../services_api/inventarioService";
import { obtenerUsuarioActual } from "../services_api/authService";
import { formatearRutVisual } from './GestionUsuariosView';
import TiposServicioView from "../components/TiposServicioView";
import { exportarExcel } from "../utils/exportarExcel";
import '../styles/ObrasView.css';

// Devuelve la fecha actual.
const obtenerFechaHoyISO = () => new Date().toLocaleDateString('en-CA');

const estadoInicialObra = {
    fecha_inicio: obtenerFechaHoyISO(),
    id_cliente: '',
    id_supervisor: '',
    tecnico_asociado: '',
    id_tipo_servicio: '',
    estado: 'En proceso',
};

const CLASE_ESTADO = {
    'En proceso': 'obras-status-badge proceso',
    Activa: 'obras-status-badge proceso',
    Finalizada: 'obras-status-badge finalizada',
    Suspendida: 'obras-status-badge suspendida',
    Cancelada: 'obras-status-badge cancelada',  
};

// Pantalla principal para gestionar obras.
export const ObrasPage = ({ usuario: usuarioProp = null }) => {
    const usuario = usuarioProp || obtenerUsuarioActual();
    const rol = usuario?.rol;
    const esAdmin = rol === 'administracion';
    const esSupervisor = rol === 'supervisor_obra';
    const puedeEditar = esAdmin || esSupervisor;
    const puedeEliminar = esAdmin;
    const puedeVerCostos = ['administracion', 'encargado_finanza', 'supervisor_obra'].includes(rol);

    const [pestana, setPestana] = useState('obras');
    const [triggerCrearServicio, setTriggerCrearServicio] = useState(0);

    const [obras, setObras] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [tiposServicio, setTiposServicio] = useState([]);
    const [supervisores, setSupervisores] = useState([]);
    const [cardex, setCardex] = useState([]);

    const [modalObraAbierto, setModalObraAbierto] = useState(false);
    const [obraDetalle, setObraDetalle] = useState(null);
    const [formObra, setFormObra] = useState(estadoInicialObra);
    const [editId, setEditId] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('Todas');
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(true);

    // Carga las obras, clientes, tipos de servicio, supervisores y movimientos.
    const cargarDatos = async () => {
        setCargando(true);
        try {
            const [listaObras, resClientes, listaTipos, listaSupervisores, listaCardex] = await Promise.all([
                obraService.getAll(),
                obtenerClientes().catch(() => ({ data: [] })),
                obraService.getTiposServicio().catch(() => []),
                esAdmin ? obraService.getSupervisores().catch(() => []) : Promise.resolve([]),
                obtenerCardex().catch(() => []),
            ]);
            setObras(listaObras);
            setClientes(resClientes.data || []);
            setTiposServicio(listaTipos);
            setSupervisores(listaSupervisores);
            setCardex(listaCardex);
        } catch {
            setError('No se pudo cargar la información de las obras desde el servidor.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    // Cambia entre pestañas (obras, tipos de servicio).
    const cambiarPestana = (nuevaPestana) => {
        setPestana(nuevaPestana);
        setMensaje('');
        setError('');
        setTriggerCrearServicio(0);
    };

    // Abre el modal limpio para crear una obra nueva.
    const abrirModalNuevaObra = () => {
        setEditId(null);
        setError('');
        setFormObra({
            ...estadoInicialObra,
            fecha_inicio: obtenerFechaHoyISO(),
            id_supervisor: esSupervisor ? usuario?.id_usuario || '' : '',
        });
        setModalObraAbierto(true);
    };

    // Gestiona le edición de la obra seleccionada.
    const abrirModalEditarObra = (obra) => {
        setMensaje('');
        setError('');
        setFormObra({
            fecha_inicio: obra.fecha_inicio,
            id_cliente: obra.id_cliente,
            id_supervisor: obra.id_supervisor || '',
            tecnico_asociado: obra.tecnico_asociado,
            id_tipo_servicio: obra.id_tipo_servicio,
            estado: obra.estado === 'Activa' ? 'En proceso' : obra.estado,
        });
        setEditId(obra.id_obra);
        setModalObraAbierto(true);
    };

    // Valida los datos antes de guardar o editar.
    const guardarObra = async (e) => {
        e.preventDefault();
        setMensaje('');
        setError('');

        const tecnicoLimpio = formObra.tecnico_asociado.trim();
        if (tecnicoLimpio.length < 3 || tecnicoLimpio.length > 80) {
            setError('El nombre del técnico responsable debe tener entre 3 y 80 caracteres.');
            return;
        }

        const datosEnviar = {
            fecha_inicio: formObra.fecha_inicio,
            id_cliente: Number(formObra.id_cliente),
            tecnico_asociado: tecnicoLimpio,
            id_tipo_servicio: Number(formObra.id_tipo_servicio),
            estado: formObra.estado,
        };

        if (esAdmin) {
            datosEnviar.id_supervisor = formObra.id_supervisor ? Number(formObra.id_supervisor) : null;
        }

        try {
            if (editId) {
                await obraService.update(editId, datosEnviar);
                setMensaje('Los datos de la obra se actualizaron correctamente y quedaron anotados en el historial.');
            } else {
                await obraService.create(datosEnviar);
                setMensaje('Nueva obra registrada con éxito. Ya está disponible para asignarle materiales desde bodega.');
            }
            setModalObraAbierto(false);
            setFormObra(estadoInicialObra);
            setEditId(null);
            await cargarDatos();
        } catch (err) {
            const dataErr = err.response?.data;
            if (dataErr && typeof dataErr === 'object') {
                setError(Object.values(dataErr).flat().join(' '));
            } else {
                setError('No se pudo guardar la obra. Verifique que todos los campos estén completos.');
            }
        }
    };

    // Elimina una obra solo si no tiene entregas de materiales asociadas.
    const handleDelete = async (obra) => {
        if (!window.confirm(`¿Está seguro de eliminar la Obra #${obra.id_obra} (${obra.cliente_razon_social})?`)) {
            return;
        }
        setMensaje('');
        setError('');
        try {
            await obraService.delete(obra.id_obra);
            setMensaje('Obra eliminada correctamente.');
            await cargarDatos();
        } catch (err) {
            const detalle = err.response?.data?.detail;
            setError(
                detalle || 
                    'No se puede eliminar esta obra porque ya tiene materiales o registros asociados en el historial. Puede cambiar su estado a Finalizada o Cancelada.'
            );
        }
    };

    // Cuenta cuántos despachos de materiales se han enviado a la obra.
    const contarDespachosObra = (obra) => {
        if (Array.isArray(obra.detalles)) {
            return obra.detalles.length;
        }
        return 0;
    };

    // Agrupa los materiales entregados a una obra.
    const obtenerResumenMaterialesObra = (obra) => {
        if (!obra || !Array.isArray(obra.detalles)) return [];
        const mapa = {};

        obra.detalles.forEach((det) => {
            const idArt = det.id_articulo;
            if (!mapa[idArt]) {
                mapa[idArt] = {
                    id_articulo: idArt,
                    nombre: det.articulo_nombre,
                    codigo_barra: det.codigo_barra,
                    unidad_nombre: det.unidad_nombre || 'un',
                    precio_unitario: Number(det.precio_unitario || 0),
                    despachado: 0,
                    devuelto: 0,
                };
            }
            mapa[idArt].despachado += Number(det.cantidad || 0);
        });

        cardex.forEach((m) => {
            const tipo = (m.tipo_movimiento || '').toLowerCase();
            if (
                tipo.includes('devoluci') &&
                tipo.includes('obra') &&
                Number(m.id_obra) === Number(obra.id_obra) &&
                mapa[m.id_articulo]
            ) {
                mapa[m.id_articulo].devuelto += Math.abs(Number(m.cantidad || 0));
            }
        });

        return Object.values(mapa).map((item) => {
            const neto = Math.max(0, item.despachado - item.devuelto);
            return {
                ...item,
                neto,
                subtotalNeto: neto * item.precio_unitario,
            };
        });
    };

    const obrasFiltradas = obras.filter((o) => {
        const estadoNorm = o.estado === 'Activa' ? 'En proceso' : o.estado;
        if (filtroEstado !== 'Todas' && estadoNorm !== filtroEstado) return false;

        if (busqueda.trim() !== '') {
            const q = busqueda.toLowerCase();
            const clienteTxt = (o.cliente_razon_social || o.cliente_nombre || '').toLowerCase();
            const supervisorTxt = (o.supervisor_nombre || '').toLowerCase();
            const tecnicoTxt = (o.tecnico_asociado || '').toLowerCase();
            const servicioTxt = (o.tipo_servicio_nombre || '').toLowerCase();
            const codigoTxt = (o.codigo || `ob-${o.id_obra}`).toLowerCase();
            return (
                clienteTxt.includes(q) ||
                supervisorTxt.includes(q) ||
                tecnicoTxt.includes(q) ||
                servicioTxt.includes(q) ||
                codigoTxt.includes(q)
            );
        }
        return true;
    });

    // Descarga en formato Excel las obras actualmente filtradas.
    const exportarObrasExcel = async () => {
        const columnas = [
            { header: 'Código', key: 'codigo', width: 12, alineacion: 'center' },
            { header: 'Fecha Inicio', key: 'fecha', width: 14, alineacion: 'center' },
            { header: 'Cliente Mandante', key: 'cliente', width: 30 },
            { header: 'RUT Cliente', key: 'rut', width: 15, alineacion: 'center' },
            { header: 'Tipo de Servicio', key: 'servicio', width: 22 },
            { header: 'Supervisor', key: 'supervisor', width: 22 },
            { header: 'Técnico Responsable', key: 'tecnico', width: 22 },
            { header: 'Despachos', key: 'despachos', width: 12, formato: 'numero', alineacion: 'center' },
            { header: 'Estado', key: 'estado', width: 14, alineacion: 'center' },
        ];
        if (puedeVerCostos) {
            columnas.push({ header: 'Costo Materiales', key: 'costo', width: 18, formato: 'moneda' });
        }

        const totalDespachos = obrasFiltradas.reduce((acc, o) => acc + contarDespachosObra(o), 0);
        const totalCosto = obrasFiltradas.reduce(
            (acc, o) => acc + Number(o.costo_total_materiales || 0),
            0
        );

        await exportarExcel({
            nombreArchivo: `obras_fyag_${obtenerFechaHoyISO()}.xlsx`,
            nombreHoja: 'Obras y Proyectos',
            titulo: 'Listado de Obras y Servicios en Terreno',
            subtitulo: filtroEstado !== 'Todas' ? `Estado: ${filtroEstado}` : '',
            columnas,
            filas: obrasFiltradas.map((o) => ({
                codigo: o.codigo || `OB-${o.id_obra}`,
                fecha: o.fecha_inicio,
                cliente: o.cliente_razon_social || o.cliente_nombre || '',
                rut: formatearRutVisual(o.cliente_rut || ''),
                servicio: o.tipo_servicio_nombre || '',
                supervisor: o.supervisor_nombre || 'Sin asignar',
                tecnico: o.tecnico_asociado || '',
                despachos: contarDespachosObra(o),
                estado: o.estado === 'Activa' ? 'En proceso' : o.estado,
                ...(puedeVerCostos ? { costo: Number(o.costo_total_materiales || 0) } : {}),
            })),
            filaTotales: {
                tecnico: 'TOTALES',
                despachos: totalDespachos,
                ...(puedeVerCostos ? { costo: totalCosto } : {}),
            },
        });
    };

    const totalEnProceso = obras.filter((o) => o.estado === 'En proceso' || o.estado === 'Activa').length;
    const totalFinalizadas = obras.filter((o) => o.estado === 'Finalizada').length;
    const totalColumnasTabla = 8 + (puedeVerCostos ? 1 : 0) + 1;
    const materialesModal = obraDetalle ? obtenerResumenMaterialesObra(obraDetalle) : [];

    return (
        <div className="contenedor-vista">
            <div className="obras-container">
                <div className="obras-header">
                    <div>
                        <h1 className="obras-title">
                            {esSupervisor ? 'Mis Obras y Servicios Asignados' : 'Gestión de Obras y Servicios en Terreno'}
                        </h1>
                        <p className="obras-subtitle">
                            {esSupervisor
                                ? 'Administración de las obras a tu cargo, materiales asignados y estados de avance'
                                : 'Creación de proyectos, asignación de supervisores, costos de materiales y control de estados'
                            }
                        </p>
                    </div>

                    <div className="obras-header-actions">
                        {pestana === 'obras' && puedeEditar && (
                            <button type="button" onClick={abrirModalNuevaObra} className="obras-btn-add">
                                <Plus size={16} />
                                <span>Registrar Obra</span>
                            </button>
                        )}
                        {pestana === 'servicios' && esAdmin && (
                            <button type="button" onClick={() => setTriggerCrearServicio((prev) => prev + 1)} className="obras-btn-add">
                                <Plus size={16} />
                                <span>Registrar Servicio</span>
                            </button>
                        )}
                    </div>
                </div>

                {esAdmin && (
                    <div className="obras-tabs-bar">
                        <button type="button" className={`obras-tab-item ${pestana === 'obras' ? 'active' : ''}`} onClick={() => cambiarPestana('obras')}>
                            <Briefcase size={16} />
                            <span>Obras y Proyectos</span>
                            <span className="obras-tab-count">{obras.length}</span>
                        </button>

                        <button type="button" className={`obras-tab-item ${pestana === 'servicios' ? 'active' : ''}`} onClick={() => cambiarPestana('servicios')}>
                            <Wrench size={16} />
                            <span>Tipos de Servicio</span>
                            <span className="obras-tab-count">{tiposServicio.length}</span>
                        </button>
                    </div>
                )}

                {pestana === 'obras' && (
                    <>
                        {mensaje && <div className="alerta-exito">{mensaje}</div>}
                        {error && !modalObraAbierto && <div className="alerta-error">{error}</div>}

                        {/* Resumen rápido de estados */}
                        <div className="obras-summary-grid">
                            <div className="obras-kpi-card">
                                <div className="obras-kpi-label">
                                    {esSupervisor ? 'Mis Obras Registradas' : 'Total de Obras Registradas'}
                                </div>
                                <div className="obras-kpi-value">{obras.length}</div>
                            </div>
                            <div className="obras-kpi-card proceso">
                                <div className="obras-kpi-label">Obras en Proceso (Habilitadas para Despacho)</div>
                                <div className="obras-kpi-value">{totalEnProceso}</div>
                            </div>
                            <div className="obras-kpi-card">
                                <div className="obras-kpi-label">Obras Finalizadas</div>
                                <div className="obras-kpi-value">{totalFinalizadas}</div>
                            </div>
                        </div>

                        <div className="obras-table-card">
                            <div className="obras-toolbar">
                                <div className="obras-search-box">
                                    <Search size={15} color="#64748b" />
                                    <input
                                        type="text"
                                        maxLength={80}
                                        placeholder="Buscar por cliente, supervisor, técnico, código o servicio..."
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        className="obras-search-input"
                                    />
                                </div>

                                <div className="obras-toolbar-right">
                                    <div className="obras-filter-group">
                                        {['Todas', 'En proceso', 'Finalizada', 'Suspendida', 'Cancelada'].map((est) => (
                                            <button
                                                key={est}
                                                type="button"
                                                onClick={() => setFiltroEstado(est)}
                                                className={`obras-filter-btn ${filtroEstado === est ? 'active' : ''}`}
                                            >{est}</button>
                                        ))}
                                    </div>

                                    <button type="button" onClick={exportarObrasExcel} disabled={obrasFiltradas.length === 0} className="obras-btn-export">
                                        <Download size={14} />
                                        <span>Exportar Excel</span>
                                    </button>
                                </div>
                            </div>

                            <div className="obras-table-wrapper">
                                <table className="obras-table">
                                    <thead>
                                        <tr>
                                            <th>Código</th>
                                            <th>Fecha Inicio</th>
                                            <th>Cliente Mandante</th>
                                            <th>Tipo de Servicio</th>
                                            <th>Supervisor Encargado</th>
                                            <th>Técnico Responsable</th>
                                            <th>Envíos de Bodega</th>
                                            {puedeVerCostos && <th>Costo Materiales</th>}
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cargando ? (
                                            <tr>
                                                <td colSpan={totalColumnasTabla} className="obras-empty">
                                                    Cargando listado de obras...
                                                </td>
                                            </tr>
                                        ) : obrasFiltradas.length === 0 ? (
                                            <tr>
                                                <td colSpan={totalColumnasTabla} className="obras-empty">
                                                    {esSupervisor
                                                        ? 'Aún no tienes obras asignadas a tu cargo. Puedes crear una desde el botón Registrar Obra.'
                                                        : 'No hay obras registradas con los filtros seleccionados.'
                                                    }
                                                </td>
                                            </tr>
                                        ) : (
                                            obrasFiltradas.map((o) => {
                                                const estadoTexto = o.estado === 'Activa' ? 'En proceso' : o.estado;
                                                const envios = contarDespachosObra(o);
                                                return (
                                                    <tr key={o.id_obra}>
                                                        <td>
                                                            <span className="obras-code-badge">
                                                                {o.codigo || `OB-${o.id_obra}`}
                                                            </span>
                                                        </td>
                                                        <td>{o.fecha_inicio}</td>
                                                        <td>
                                                            <div className="obras-client-name">
                                                                {o.cliente_razon_social || o.cliente_nombre || `Cliente #${o.id_cliente}`}
                                                            </div>
                                                            {o.cliente_rut && (
                                                                <div className="obras-client-rut">
                                                                    RUT: {formatearRutVisual(o.cliente_rut)} | {o.ubicacion}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span className="obras-service-tag">
                                                                {o.tipo_servicio_nombre || `Servicio #${o.id_tipo_servicio}`}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="obras-client-name">
                                                                {o.supervisor_nombre || 'Sin asignar'}
                                                            </div>
                                                            {o.supervisor_rut && (
                                                                <div className="obras-client-rut">
                                                                    {formatearRutVisual(o.supervisor_rut)}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td>{o.tecnico_asociado}</td>
                                                        <td>
                                                            <strong>{envios}</strong> {envios === 1 ? 'despacho' : 'despachos'}
                                                        </td>
                                                        {puedeVerCostos && (
                                                            <td className="obras-cost">
                                                                ${Number(o.costo_total_materiales || 0).toLocaleString('es-CL')}
                                                            </td>
                                                        )}
                                                        <td>
                                                            <span className={CLASE_ESTADO[estadoTexto] || 'obras-status-badge proceso'}>
                                                                {estadoTexto}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="obras-actions-cell">
                                                                <button type="button" className="obras-btn-view" onClick={() => setObraDetalle(o)} title="Ver materiales consumidos por esta obra">
                                                                    <Package size={13} />
                                                                    <span>Materiales</span>
                                                                </button>
                                                                {puedeEditar && (
                                                                    <button type="button" className="obras-btn-edit" onClick={() => abrirModalEditarObra(o)} title="Modificar datos de la obra">
                                                                        <Edit2 size={13} />
                                                                        <span>Editar</span>
                                                                    </button>
                                                                )}
                                                                {puedeEliminar && (
                                                                    <button type="button" className="obras-btn-delete" onClick={() => handleDelete(o)} title="Eliminar obra">
                                                                        <Trash2 size={13} />
                                                                        <span>Eliminar</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {pestana === 'servicios' && esAdmin && (
                    <TiposServicioView
                        tiposServicio={tiposServicio}
                        obras={obras}
                        cargando={cargando}
                        onDatosActualizados={cargarDatos}
                        triggerCrear={triggerCrearServicio}
                    />
                )}

                {modalObraAbierto && (
                    <div className="obras-modal-overlay">
                        <div className="obras-modal-card">
                            <div className="obras-modal-header">
                                <div className="obras-modal-title">
                                    {editId ? `Modificar Obra #${editId}` : 'Registrar Nueva Obra o Servicio'}
                                </div>
                                <button type="button" onClick={() => setModalObraAbierto(false)} className="obras-modal-close">X</button>
                            </div>

                            <form onSubmit={guardarObra} className="obras-modal-form">
                                {error && <div className="alerta-error">{error}</div>}

                                <div className="obras-modal-grid">
                                    <div className="obras-field">
                                        <label className="obras-label">Fecha de Inicio</label>
                                        <input
                                            type="date"
                                            className="obras-input"
                                            value={formObra.fecha_inicio}
                                            onChange={(e) => setFormObra({ ...formObra, fecha_inicio: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="obras-field">
                                        <label className="obras-label">Estado de la Obra</label>
                                        <select className="obras-select" value={formObra.estado} onChange={(e) => setFormObra({ ...formObra, estado: e.target.value })} required>
                                            <option value="En proceso">En proceso (Permite despachar materiales)</option>
                                            <option value="Finalizada">Finalizada (Cierra despachos)</option>
                                            <option value="Suspendida">Suspendida (Pausada temporalmente)</option>
                                            <option value="Cancelada">Cancelada</option>
                                        </select>
                                    </div>

                                    <div className="obras-field full-width">
                                        <label className="obras-label">Cliente Mandante</label>
                                        <select className="obras-select" value={formObra.id_cliente} onChange={(e) => setFormObra({ ...formObra, id_cliente: e.target.value })} required>
                                            <option value="">Seleccione un cliente...</option>
                                            {clientes.map((c) => (
                                                <option key={c.id_cliente} value={c.id_cliente}>
                                                    {c.razon_social} ({formatearRutVisual(c.rut)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="obras-field full-width">
                                        <label className="obras-label">Supervisor Encargado</label>
                                        {esAdmin ? (
                                            <select className="obras-select" value={formObra.id_supervisor} onChange={(e) => setFormObra({ ...formObra, id_supervisor: e.target.value })}>
                                                <option value="">Seleccione un supervisor...</option>
                                                {supervisores.map((s) => (
                                                    <option key={s.id_usuario} value={s.id_usuario}>
                                                        {s.nombre} ({formatearRutVisual(s.rut)})
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                className="obras-input"
                                                value={`${usuario?.nombre || 'Supervisor'} (Asignado automáticamente)`}
                                                disabled
                                            />
                                        )}
                                    </div>

                                    <div className="obras-field">
                                        <label className="obras-label">Tipo de Servicio</label>
                                        <select className="obras-select" value={formObra.id_tipo_servicio} onChange={(e) => setFormObra({ ...formObra, id_tipo_servicio: e.target.value })} required>
                                            <option value="">Seleccione clasificación...</option>
                                            {tiposServicio.map((t) => (
                                                <option key={t.id_tipo_servicio} value={t.id_tipo_servicio}>
                                                    {t.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="obras-field">
                                        <label className="obras-label">Técnico Responsable en Terreno</label>
                                        <input
                                            type="text"
                                            minLength={3}
                                            maxLength={80}
                                            className="obras-input"
                                            placeholder="Ej: Javier Soto"
                                            value={formObra.tecnico_asociado}
                                            onChange={(e) => setFormObra({ ...formObra, tecnico_asociado: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="obras-modal-actions">
                                    <button type="button" onClick={() => setModalObraAbierto(false)} className="obras-btn-cancel">Cancelar</button>
                                    <button type="submit" className="obras-btn-save">
                                        {editId ? 'Guardar Cambios' : 'Registrar Obra'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {obraDetalle && (
                    <div className="obras-modal-overlay">
                        <div className="obras-modal-card large">
                            <div className="obras-modal-header">
                                <div className="obras-modal-title">
                                    Materiales de {obraDetalle.codigo || `OB-${obraDetalle.id_obra}`} | {' '}
                                    {obraDetalle.cliente_razon_social || obraDetalle.cliente_nombre}
                                </div>
                                <button type="button" onClick={() => setObraDetalle(null)} className="obras-modal-close">X</button>
                            </div>

                            <div className="obras-modal-form">
                                <div className="obras-detail-summary">
                                    <div>
                                        <strong>Servicio:</strong> {obraDetalle.tipo_servicio_nombre}
                                    </div>
                                    <div>
                                        <strong>Supervisor:</strong> {obraDetalle.supervisor_nombre || 'Sin asignar'}
                                    </div>
                                    <div>
                                        <strong>Técnico:</strong> {obraDetalle.tecnico_asociado}
                                    </div>
                                    <div>
                                        <strong>Estado:</strong> {obraDetalle.estado}
                                    </div>
                                </div>

                                {materialesModal.length === 0 ? (
                                    <div className="obras-empty">
                                        Todavía no se han despachado materiales a esta obra.
                                    </div>
                                ) : (
                                    <div className="obras-table-wrapper">
                                        <table className="obras-table">
                                            <thead>
                                                <tr>
                                                    <th>Material</th>
                                                    <th>Entregado</th>
                                                    <th>Devuelto</th>
                                                    <th>Consumo Neto</th>
                                                    {puedeVerCostos && <th>Precio Lista</th>}
                                                    {puedeVerCostos && <th>Subtotal</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {materialesModal.map((m) => (
                                                    <tr key={m.id_articulo}>
                                                        <td>
                                                            <div className="obras-client-name">{m.nombre}</div>
                                                            <div className="obras-client-rut">Cód: {m.codigo_barra}</div>
                                                        </td>
                                                        <td>
                                                            {m.despachado} {m.unidad_nombre}
                                                        </td>
                                                        <td>
                                                            {m.devuelto} {m.unidad_nombre}
                                                        </td>
                                                        <td>
                                                            <strong>
                                                                {m.neto} {m.unidad_nombre}
                                                            </strong>
                                                        </td>
                                                        {puedeVerCostos && (
                                                            <td>${m.precio_unitario.toLocaleString('es-CL')}</td>
                                                        )}
                                                        {puedeVerCostos && (
                                                            <td className="obras-cost">
                                                                ${m.subtotalNeto.toLocaleString('es-CL')}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {puedeVerCostos && (
                                    <div className="obras-detail-total">
                                        <span>Costo total en materiales de la obra:</span>
                                        <strong>
                                            ${Number(obraDetalle.costo_total_materiales || 0).toLocaleString('es-CL')}
                                        </strong>
                                    </div>
                                )}

                                <div className="obras-modal-actions">
                                    <button type="button" onClick={() => setObraDetalle(null)} className="obras-btn-cancel">Cerrar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ObrasPage;