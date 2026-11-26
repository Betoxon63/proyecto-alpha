import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ClipboardList, Plus, Search, CheckCircle2, XCircle, PackageCheck, Truck, Clock, Calculator, AlertCircle } from "lucide-react";
import { obtenerSolicitudes, crearSolicitud, aprobarCompraSolicitud, rechazarSolicitud, confirmarRecepcionSolicitud, obtenerArticulos, obtenerProveedores } from "../services_api/inventarioService";
import { obtenerUsuarioActual } from "../services_api/authService";
import { formatearRutVisual } from './GestionUsuariosView';
import '../styles/SolicitudesView.css';

// Devuelve la fecha local.
const obtenerFechaHoyISO = () => new Date().toLocaleDateString('en-CA');

export default function SolicitudesView({ usuario }) {
    const sesion = usuario || obtenerUsuarioActual();
    const rol = sesion?.rol;
    const location = useLocation();
    const navigate = useNavigate();

    // Permisos de cada acción dentro del flujo.
    const puedeSolicitar = ['administracion', 'encargado_bodega'].includes(rol);
    const puedeGestionarCompra = ['administracion', 'encargado_finanza'].includes(rol);
    const puedeConfirmarLlegada = ['administracion', 'encargado_bodega'].includes(rol);

    const [solicitudes, setSolicitudes] = useState([]);
    const [articulos, setArticulos] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setfiltroEstado] = useState('Todas');
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    // Estado del modal (Nueva Solicitud).
    const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
    const [formCrear, setFormCrear] = useState({
        id_articulo: '',
        cantidad_solicitada: 1,
        observacion_bodega: '',
    });

    // Estado del modal (Aprobar y Facturar).
    const [solicitudAprobar, setSolicitudAprobar] = useState(null);
    const [formAprobar, setFormAprobar] = useState({
        id_proveedor: '',
        numero_documento: '',
        fecha_ingreso: obtenerFechaHoyISO(),
        cantidad: 1,
        precio_unitario: 1000,
        descuento_1: 0,
        descuento_2: 0,
        descuento_3: 0,
        observacion_finanzas: '',
    });

    // Estado del modal (Rechazar Solicitud).
    const [solicitudRechazar, setSolicitudRechazar] = useState(null);
    const [motivoRechazo, setMotivoRechazo] = useState('');

    const extraerError = (err, respaldo) => {
        const data = err.response?.data;
        if (typeof data?.detail === 'string') return data.detail;
        if (data && typeof data === 'object') {
            return Object.values(data).flat().join(' ');
        }
        return respaldo;
    };

    // Carga solicitudes, materiales y proveedores desde el servidor.
    const cargarDatos = async () => {
        setCargando(true);
        try {
            const peticiones = [
                obtenerSolicitudes(),
                obtenerArticulos(), 
                puedeGestionarCompra ? obtenerProveedores() : Promise.resolve({ data: [] }),
            ];
            const [resSol, resArt, resProv] = await Promise.all(peticiones);
            setSolicitudes(resSol.data || []);
            setArticulos(resArt.data || []);
            setProveedores(resProv.data || []);
        } catch {
            setError('No se pudo cargar el listado de solicitudes de reposición.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    // Abre el modal precargado.
    useEffect(() => {
        if (!puedeSolicitar || articulos.length === 0) return;
        const estadoRuta = location.state;
        if (estadoRuta?.abrirCrear) {
            const artElegido =
                articulos.find((a) => String(a.id_articulo) === String(estadoRuta.articuloId)) ||
                articulos[0];
            const sugerido =
                estadoRuta.cantidadSugerida ||
                (artElegido?.faltante_reposicion > 0 ? artElegido.faltante_reposicion : 1);

            setFormCrear({
                id_articulo: artElegido ? String(artElegido.id_articulo) : '',
                cantidad_solicitada: Number(sugerido) || 1,
                observacion_bodega: '',
            });
            setError('');
            setModalCrearAbierto(true);
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location.state, articulos, puedeSolicitar]);

    // Abre el formulario para enviar una solicitud nueva a Finanzas.
    const abrirModalCrear = () => {
        setError('');
        const primerUrgente =
            articulos.find((a) => Number(a.stock_disponible) <= Number(a.stock_minimo)) ||
            articulos[0];
        const sugerido =
            primerUrgente && Number(primerUrgente.faltante_reposicion) > 0
                ? Number(primerUrgente.faltante_reposicion)
                : 1;
            
        setFormCrear({
            id_articulo: primerUrgente ? String(primerUrgente.id_articulo) : '',
            cantidad_solicitada: sugerido,
            observacion_bodega: '',
        });
        setModalCrearAbierto(true);
    };

    // Al cambiar el material dentro del modal de solicitud, actualiza automáticamente la cantidad sugerida.
    const manejarCambioArticuloCrear = (nuevoId) => {
        const art = articulos.find((a) => String(a.id_articulo) === String(nuevoId));
        const sugerido =
            art && Number(art.faltante_reposicion) > 0 ? Number(art.faltante_reposicion) : 1;
        setFormCrear((prev) => ({
            ...prev,
            id_articulo: nuevoId,
            cantidad_solicitada: sugerido,
        }));
    };

    // Envía la nueva solicitud al servidor.
    const enviarNuevaSolicitud = async (e) => {
        e.preventDefault();
        setError('');
        setMensaje('');

        try {
            const res = await crearSolicitud({
                id_articulo: Number(formCrear.id_articulo),
                cantidad_solicitada: Number(formCrear.cantidad_solicitada),
                observacion_bodega: formCrear.observacion_bodega.trim(),
            });
            setModalCrearAbierto(false);
            setMensaje(
                `Solicitud ${res.data.codigo_solicitud} enviada a Finanzas correctamente.`
            );
            await cargarDatos();
        } catch (err) {
            setError(extraerError(err, 'No se pudo registrar la solicitud de reposición.'));
        }
    };

    // Abre el modal de aprobación y facturación precargando la cantidad y precio referencial.
    const abrirModalAprobar = (sol) => {
        setError('');
        setSolicitudAprobar(sol);
        setFormAprobar({
            id_proveedor: proveedores[0] ? String(proveedores[0].id_proveedor) : '',
            numero_documento: '',
            fecha_ingreso: obtenerFechaHoyISO(),
            cantidad: Number(sol.cantidad_solicitada || 1),
            precio_unitario: Number(sol.precio_referencia) > 0 ? Number(sol.precio_referencia) : 1000,
            descuento_1: 0,
            descuento_2: 0,
            descuento_3: 0,
            observacion_finanzas: '',
        });
    };

    // Cálculo visual previo de los 3 descuentos sucesivos e IVA (el cálculo oficial lo hace el servidor).
    const bruto = Number(formAprobar.cantidad || 0) * Number(formAprobar.precio_unitario || 0);
    const paso1 = bruto * (1 - Number(formAprobar.descuento_1 || 0) / 100);
    const paso2 = paso1 * (1 - Number(formAprobar.descuento_2 || 0) / 100);
    const netoEstimado = Math.round(paso2 * (1 - Number(formAprobar.descuento_3 || 0) / 100));
    const ivaEstimado = Math.round(netoEstimado * 0.19);
    const totalEstimado = netoEstimado + ivaEstimado;

    // Aprueba la solicitud, registra la factura en Finanzas y la pasa a "En camino".
    const enviarAprobacionCompra = async (e) => {
        e.preventDefault();
        if (!solicitudAprobar) return;
        setError('');
        setMensaje('');

        try {
            const res = await aprobarCompraSolicitud(solicitudAprobar.id_solicitud, {
                id_proveedor: Number(formAprobar.id_proveedor),
                numero_documento: formAprobar.numero_documento.trim(),
                fecha_ingreso: formAprobar.fecha_ingreso,
                cantidad: Number(formAprobar.cantidad),
                precio_unitario: Number(formAprobar.precio_unitario),
                descuento_1: Number(formAprobar.descuento_1 || 0),
                descuento_2: Number(formAprobar.descuento_2 || 0),
                descuento_3: Number(formAprobar.descuento_3 || 0),
                observacion_finanzas: formAprobar.observacion_finanzas.trim(),
            });
            setSolicitudAprobar(null);
            setMensaje(
                `${res.data.codigo_solicitud} aprobada con Factura FAC-${res.data.factura_numero}. Quedó "En camino" esperando confirmación física de Bodega.`
            );
            await cargarDatos();
        } catch (err) {
            setError(extraerError(err, 'No se pudo aprobar la solicitud ni registrar la factura.'));
        }
    };

    // Envía el rechazo de una solicitud con motivo obligatorio.
    const enviarRechazo = async (e) => {
        e.preventDefault();
        if (!solicitudRechazar) return;
        const motivoLimpio = motivoRechazo.trim();
        if (motivoLimpio.length < 5) {
            setError('Escriba un motivo de rechazo de al menos 5 caracteres.');
            return;
        }

        setError('');
        setMensaje('');
        try {
            const res = await rechazarSolicitud(solicitudRechazar.id_solicitud, {
                observacion_finanzas: motivoLimpio,
            });
            setSolicitudRechazar(null);
            setMotivoRechazo('');
            setMensaje(`Solicitud ${res.data.codigo_solicitud} marcada como rechazada.`);
            await cargarDatos();
        } catch (err) {
            setError(extraerError(err, 'No se pudo rechazar la solicitud.'));
        }
    };

    // Confirma la llegada física del material a bodega, suma el stock y registra la Entrada.
    const manejarConfirmarLlegada = async (sol) => {
        const confirmar = window.confirm(
            `¿Confirmar la llegada física de ${sol.cantidad_solicitada} ${sol.unidad_nombre} de "${sol.articulo_nombre}" (Factura FAC-${sol.factura_numero})? Al confirmar, las unidades se sumarán al stock de bodega.`
        );
        if (!confirmar) return;

        setError('');
        setMensaje('');
        try {
            const res = await confirmarRecepcionSolicitud(sol.id_solicitud);
            setMensaje(
                `Recepción confirmada (${res.data.codigo_solicitud}): se sumaron ${sol.cantidad_solicitada} ${sol.unidad_nombre} de ${sol.articulo_nombre} al catálogo de bodega.`
            );
            await cargarDatos();
            // Avisa a la barra lateral para actualizar el contador de alertas de stock.
            window.dispatchEvent(new Event('fyag_inventario_actualizado'));
        } catch (err) {
            setError(extraerError(err, 'No se pudo confirmar la recepción física del material.'));
        }
    };

    // Contadores rápidos por estado para los avisos y botones de filtro.
    const totalPendientes = solicitudes.filter((s) => s.estado === 'Pendiente').length;
    const totalEnCamino = solicitudes.filter((s) => s.estado === 'En camino').length;
    const totalCompletadas = solicitudes.filter((s) => s.estado === 'Completada').length;
    const totalRechazadas = solicitudes.filter((s) => s.estado === 'Rechazada').length;

    const opcionesFiltro = [
        { clave: 'Todas', etiqueta: `Todas (${solicitudes.length})` },
        { clave: 'Pendiente', etiqueta: `Pendientes (${totalPendientes})` },
        { clave: 'En camino', etiqueta: `En camino (${totalEnCamino})` },
        { clave: 'Completada', etiqueta: `Recibidas (${totalCompletadas})` },
        { clave: 'Rechazada', etiqueta: `Rechazadas (${totalRechazadas})` },
    ]

    // Revisa si el material seleccionado en el modal ya tiene otra compra en camino.
    const pedidosEnCaminoMismoArticulo = solicitudes.filter(
        (s) => String(s.id_articulo) === String(formCrear.id_articulo) &&
            s.estado === 'En camino'
    );

    // Filtra la tabla según el estado elegido
    const solicitudesFiltradas = solicitudes.filter((s) => {
        if (filtroEstado !== 'Todas' && s.estado !== filtroEstado) return false;
        if (busqueda.trim() !== '') {
            const q = busqueda.toLowerCase();
            return (
                (s.codigo_solicitud || '').toLowerCase().includes(q) ||
                (s.articulo_nombre || '').toLowerCase().includes(q) ||
                (s.proveedor_nombre || '').toLowerCase().includes(q) ||
                String(s.factura_numero || '').includes(q) ||
                (s.solicitado_por_nombre || '').toLowerCase().includes(q)
            );
        }
        return true;
    });

    // Traduce el estado a la calse CSS de su etiqueta de color.
    const claseEstado = (estado) => {
        if (estado === 'Pendiente') return 'solicitud-badge pendiente';
        if (estado === 'En camino') return 'solicitud-badge en-camino';
        if (estado === 'Completada') return 'solicitud-badge completada';
        return 'solicitud-badge rechazada';
    };

    const modalActivo = modalCrearAbierto || Boolean(solicitudAprobar) || Boolean(solicitudRechazar);

    return (
        <div className="contenedor-vista">
            <div className="solicitudes-container">
                {/* Cabecera del módulo */}
                <div className="solicitudes-header">
                    <div>
                        <h1 className="solicitudes-title">Solicitudes de Reposición de Materiales</h1>
                        <p className="solicitudes-subtitle">
                            Bodega solicita reposición, Finanzas aprueba y factura la compra, y Bodega confirma la llegada física
                        </p>
                    </div>

                    {puedeSolicitar && (
                        <button type="button" onClick={abrirModalCrear} className="solicitudes-btn-add">
                            <Plus size={16} />
                            <span>Nueva Solicitud</span>
                        </button>
                    )}
                </div>

                {/* Avisos inteligentes según el cargo conectado */}
                {puedeGestionarCompra && totalPendientes > 0 && (
                    <div className="solicitudes-banner pendiente">
                        <Clock size={18} />
                        <span>
                            Hay <strong>{totalPendientes}</strong>{' '}
                            {totalPendientes === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de Bodega esperando revisión y compra.
                        </span>
                        <button type="button" onClick={() => setfiltroEstado('Pendiente')} className="solicitudes-banner-btn">
                            Ver pendientes
                        </button>
                    </div>
                )}

                {puedeConfirmarLlegada && totalEnCamino > 0 && (
                    <div className="solicitudes-banner en-camino">
                        <Truck size={18} />
                        <span>
                            Hay <strong>{totalEnCamino}</strong>{' '}
                            {totalEnCamino === 1 ? 'pedido comprado en camino' : 'pedidos comprados en camino'} esperando confirmación física en bodega.
                        </span>
                        <button type="button" onClick={() => setfiltroEstado('En camino')} className="solicitudes-banner-btn">
                            Ver en camino
                        </button>
                    </div>
                )}

                {mensaje && <div className="alerta-exito">{mensaje}</div>}
                {error && !modalActivo && <div className="alerta-error">{error}</div>}

                {/* Tabla principal de solicitudes */}
                <div className="solicitudes-table-card">
                    <div className="solicitudes-toolbar">
                        <div className="solicitudes-search-box">
                            <Search size={15} color="#64748b" />
                            <input
                                type="text"
                                maxLength={80}
                                placeholder="Buscar por código, material, proveedor o N° factura..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="solicitudes-search-input"
                            />
                        </div>

                        <div className="solicitudes-filter-group">
                            {opcionesFiltro.map((op) => (
                                <button
                                    key={op.clave}
                                    type="button"
                                    onClick={() => setfiltroEstado(op.clave)}
                                    className={`solicitudes-filter-btn ${
                                        filtroEstado === op.clave ? 'active' : ''
                                    }`}
                                >
                                    {op.etiqueta}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="solicitudes-table-wrapper">
                        <table className="solicitudes-table">
                            <thead>
                                <tr>
                                    <th>Código y Fecha</th>
                                    <th>Material Solicitado</th>
                                    <th>Cantidad</th>
                                    <th>Estado</th>
                                    <th>Compra / Respaldo</th>
                                    <th>Responsables</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cargando ? (
                                    <tr>
                                        <td colSpan={7} className="solicitudes-empty">
                                            Cargando solicitudes de reposición...
                                        </td>
                                    </tr>
                                ) : solicitudesFiltradas.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="solicitudes-empty">
                                            No hay solicitudes registradas con los filtros seleccionados.
                                        </td>
                                    </tr>
                                ) : (
                                    solicitudesFiltradas.map((sol) => (
                                        <tr key={sol.id_solicitud}>
                                            <td>
                                                <div className="solicitud-code">{sol.codigo_solicitud}</div>
                                                <div className="solicitud-sub">{sol.fecha_solicitud_fmt}</div>
                                            </td>
                                            <td>
                                                <div className="solicitud-name">{sol.articulo_nombre}</div>
                                                <div className="solicitud-sub">
                                                    Stock actual: {sol.stock_actual} (Mín: {sol.stock_minimo}) | {sol.articulo_ubicacion} 
                                                </div>
                                                {sol.observacion_bodega && (
                                                    <div className="solicitud-obs">
                                                        Bodega: "{sol.observacion_bodega}"
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <span className="solicitud-qty">
                                                    {sol.cantidad_solicitada} {sol.unidad_nombre}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={claseEstado(sol.estado)}>
                                                    {sol.estado}
                                                </span>
                                            </td>
                                            <td>
                                                {sol.factura_numero ? (
                                                    <div>
                                                        <div className="solicitud-name">FAC-{sol.factura_numero}</div>
                                                        <div className="solicitud-sub">{sol.proveedor_nombre}</div>
                                                        {puedeGestionarCompra && sol.factura_total && (
                                                            <div className="solicitud-price">
                                                                Total: ${Number(sol.factura_total).toLocaleString('es-CL')}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : sol.estado === 'Rechazada' ? (
                                                    <div className="solicitud-obs-rechazo">
                                                        Motivo: {sol.observacion_finanzas}
                                                    </div>
                                                ) : (
                                                    <span className="solicitud-sub">Sin factura aún</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="solicitud-sub">
                                                    <strong>Pidió:</strong> {sol.solicitado_por_nombre}
                                                </div>
                                                {sol.gestionado_por_nombre && (
                                                    <div className="solicitud-sub">
                                                        <strong>Finanzas:</strong> {sol.gestionado_por_nombre}
                                                    </div>
                                                )}
                                                {sol.recepcionado_por_nombre && (
                                                    <div className="solicitud-sub">
                                                        <strong>Recibió:</strong> {sol.recepcionado_por_nombre}
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div className="solicitudes-actions-cell">
                                                    {sol.estado === 'Pendiente' && puedeGestionarCompra && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => abrirModalAprobar(sol)}
                                                                className="solicitud-btn aprobar"
                                                                title="Aprobar compra y registrar factura"
                                                            >
                                                                <CheckCircle2 size={14} />
                                                                <span>Aprobar y Facturar</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setError('');
                                                                    setMotivoRechazo('');
                                                                    setSolicitudRechazar(sol);
                                                                }}
                                                                className="solicitud-btn rechazar"
                                                                title="Rechazar solicitud"
                                                            >
                                                                <XCircle size={14} />
                                                                <span>Rechazar</span>
                                                            </button>
                                                        </>
                                                    )}

                                                    {sol.estado === 'En camino' && puedeConfirmarLlegada && (
                                                        <button type="button" onClick={() => manejarConfirmarLlegada(sol)} className="solicitud-btn confirmar" title="Confirmar llegada física y sumar stock">
                                                            <PackageCheck size={14} />
                                                            <span>Confirmar Llegada</span>
                                                        </button>
                                                    )}

                                                    {sol.estado === 'Pendiente' && !puedeGestionarCompra && (
                                                        <span className="solicitud-espera">Esperando a Finanzas</span>
                                                    )}

                                                    {sol.estado === 'En camino' && !puedeConfirmarLlegada && (
                                                        <span className="solicitud-espera">Esperando a Bodega</span>
                                                    )}

                                                    {(sol.estado === 'Completada' || sol.estado === 'Rechazada') && (
                                                        <span className="solicitud-espera">Cerrada</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* CREAR NUEVA SOLICITUD */}
                {modalCrearAbierto && (
                    <div className="solicitudes-modal-overlay">
                        <div className="solicitudes-modal-card small">
                            <div className="solicitudes-modal-header">
                                <div className="solicitudes-modal-title">
                                    <ClipboardList size={18} />
                                    <span>Solicitar Reposición a Finanzas</span>
                                </div>
                                <button type="button" onClick={() => setModalCrearAbierto(false)} className="solicitudes-modal-close">X</button>
                            </div>
                            <form onSubmit={enviarNuevaSolicitud} className="solicitudes-modal-form">
                                {error && <div className="alerta-error">{error}</div>}

                                <div className="solicitudes-field">
                                    <label className="solicitudes-label">Material a Reponer</label>
                                    <select required value={formCrear.id_articulo} onChange={(e) => manejarCambioArticuloCrear(e.target.value)} className="solicitudes-select">
                                        <option value="">Seleccione un material...</option>
                                        {articulos.map((a) => {
                                            const marca =
                                                Number(a.stock_disponible) <= 0
                                                    ? ' [AGOTADO]'
                                                    : Number(a.stock_disponible) <= Number(a.stock_minimo)
                                                    ? ' [STOCK BAJO]'
                                                    : '';
                                            return (
                                                <option key={a.id_articulo} value={a.id_articulo}>
                                                    {a.nombre} · Actual: {a.stock_disponible} / Mín: {a.stock_minimo}
                                                    {marca}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div> 

                                {pedidosEnCaminoMismoArticulo.length > 0 && (
                                    <div className="solicitudes-aviso-duplicado">
                                        <AlertCircle size={15} />
                                        <span>
                                            Aviso: ya existe un pedido en camino para este material (
                                            {pedidosEnCaminoMismoArticulo
                                                .map((p) => `${p.codigo_solicitud}: +${p.cantidad_solicitada}`)
                                                .join(', ')}
                                            ). Confirme si necesita solicitar unidades adicionales.
                                        </span>
                                    </div>
                                )}

                                <div className="solicitudes-field">
                                    <label className="solicitudes-label">Cantidad Solicitada</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000000"
                                        required
                                        value={formCrear.cantidad_solicitada}
                                        onChange={(e) =>
                                            setFormCrear({
                                                ...formCrear,
                                                cantidad_solicitada: e.target.value === '' ? '' : Number(e.target.value),
                                            })
                                        }
                                        className="solicitudes-input"
                                    />
                                </div>

                                <div className="solicitudes-field">
                                    <label className="solicitudes-label">Observación o Urgencia (Opcional)</label>
                                    <textarea
                                        rows={3}
                                        maxLength={250}
                                        placeholder="Ej: Se necesita para faena en Chillán la próxima semana..."
                                        value={formCrear.observacion_bodega}
                                        onChange={(e) =>
                                            setFormCrear({
                                                ...formCrear,
                                                observacion_bodega: e.target.value,
                                            })
                                        }
                                        className="solicitudes-textarea"
                                    />
                                </div>

                                <div className="solicitudes-modal-actions">
                                    <button type="button" onClick={() => setModalCrearAbierto(false)} className="solicitudes-btn-cancel">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="solicitudes-btn-save">
                                        Enviar Solicitud
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* APROBAR Y REGISTRAR FACTURA */}
                {solicitudAprobar && (
                    <div className="solicitudes-modal-overlay">
                        <div className="solicitudes-modal-card large">
                            <div className="solicitudes-modal-header">
                                <div className="solicitudes-modal-title">
                                    <CheckCircle2 size={18} />
                                    <span>Aprobar Compra y Facturar ({solicitudAprobar.codigo_solicitud})</span>
                                </div>
                                <button type="button" onClick={() => setSolicitudAprobar(null)} className="solicitudes-modal-close">X</button>
                            </div>

                            <form onSubmit={enviarAprobacionCompra} className="solicitudes-modal-form">
                                {error && <div className="alerta-error">{error}</div>}
                                <div className="solicitudes-resumen-box">
                                    <div>
                                        <strong>Material:</strong> {solicitudAprobar.articulo_nombre} ({solicitudAprobar.unidad_nombre})
                                    </div>
                                    <div>
                                        <strong>Solicitado por:</strong> {solicitudAprobar.solicitado_por_nombre} | {' '}
                                        <strong>Stock actual:</strong> {solicitudAprobar.stock_actual}
                                    </div>
                                </div>

                                <div className="solicitudes-form-grid">
                                    <div className="solicitudes-field full-width">
                                        <label className="solicitudes-label">Proveedor</label>
                                        <select
                                            required
                                            value={formAprobar.id_proveedor}
                                            onChange={(e) =>
                                                setFormAprobar({ ...formAprobar, id_proveedor: e.target.value })
                                            }
                                            className="solicitudes-select"
                                        >
                                            {proveedores.length === 0 ? (
                                                <option value="">
                                                    No hay proveedores registrados (cree uno en Clientes y Proveedores)
                                                </option>
                                            ) : (
                                                proveedores.map((p) => (
                                                    <option key={p.id_proveedor} value={p.id_proveedor}>
                                                        {p.razon_social} ({formatearRutVisual(p.rut)})
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>

                                    <div className="solicitudes-field">
                                        <label className="solicitudes-label">N° de Factura</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={10}
                                            required
                                            placeholder="Ej: 99412"
                                            value={formAprobar.numero_documento}
                                            onChange={(e) =>
                                                setFormAprobar({
                                                    ...formAprobar,
                                                    numero_documento: e.target.value.replace(/\D/g, '').slice(0, 10),
                                                })
                                            }
                                            className="solicitudes-input"
                                        />
                                    </div>

                                    <div className="solicitudes-field">
                                        <label className="solicitudes-label">Fecha de Factura</label>
                                        <input
                                            type="date"
                                            required
                                            value={formAprobar.fecha_ingreso}
                                            onChange={(e) =>
                                                setFormAprobar({ ...formAprobar, fecha_ingreso: e.target.value })
                                            }
                                            className="solicitudes-input"
                                        />
                                    </div>

                                    <div className="solicitudes-field">
                                        <label className="solicitudes-label">Cantidad Comprada</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="1000000"
                                            required
                                            value={formAprobar.cantidad}
                                            onChange={(e) =>
                                                setFormAprobar({
                                                    ...formAprobar,
                                                    cantidad: e.target.value === '' ? '' : Number(e.target.value),
                                                })
                                            }
                                            className="solicitudes-input"
                                        />
                                    </div>

                                    <div className="solicitudes-field">
                                        <label className="solicitudes-label">Precio Unitario ($)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="999999999"
                                            required
                                            value={formAprobar.precio_unitario}
                                            onChange={(e) =>
                                                setFormAprobar({
                                                    ...formAprobar,
                                                    precio_unitario:
                                                        e.target.value === '' ? '' : Number(e.target.value),
                                                })
                                            }
                                            className="solicitudes-input"
                                        />
                                    </div>
                                </div>

                                {/* Cálculo de descuentos */}
                                <div className="solicitudes-descuentos-box">
                                    <div className="solicitudes-descuentos-title">
                                        <Calculator size={16} />
                                        <span>Descuentos comerciales sucesivos (%)</span>
                                    </div>
                                    <div className="solicitudes-descuentos-grid">
                                        <div>
                                            <label className="solicitudes-mini-label">Desc. 1 (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="99"
                                                value={formAprobar.descuento_1}
                                                onChange={(e) =>
                                                    setFormAprobar({
                                                        ...formAprobar,
                                                        descuento_1: e.target.value === '' ? 0 : Number(e.target.value),
                                                    })
                                                }
                                                className="solicitudes-input"
                                            />
                                        </div>

                                        <div>
                                            <label className="solicitudes-mini-label">Desc. 2 (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="99"
                                                value={formAprobar.descuento_2}
                                                onChange={(e) =>
                                                    setFormAprobar({
                                                        ...formAprobar,
                                                        descuento_2: e.target.value === '' ? 0 : Number(e.target.value),
                                                    })
                                                }
                                                className="solicitudes-input"
                                            />
                                        </div>

                                        <div>
                                            <label className="solicitudes-mini-label">Desc. 3 (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="99"
                                                value={formAprobar.descuento_3}
                                                onChange={(e) =>
                                                    setFormAprobar({
                                                        ...formAprobar,
                                                        descuento_3: e.target.value === '' ? 0 : Number(e.target.value),
                                                    })
                                                }
                                                className="solicitudes-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="solicitudes-totales-row">
                                        <span>Neto: <strong>${netoEstimado.toLocaleString('es-CL')}</strong></span>
                                        <span>IVA (19%): <strong>${ivaEstimado.toLocaleString('es-CL')}</strong></span>
                                        <span className="total">
                                            Total: <strong>${totalEstimado.toLocaleString('es-CL')}</strong>
                                        </span>
                                    </div>
                                </div>

                                <div className="solicitudes-field">
                                    <label className="solicitudes-label">Observación de Finanzas (Opcional)</label>
                                    <input
                                        type="text"
                                        maxLength={250}
                                        placeholder="Ej: Despacho del proveedor confirmado para mañana..."
                                        value={formAprobar.observacion_finanzas}
                                        onChange={(e) =>
                                            setFormAprobar({
                                                ...formAprobar,
                                                observacion_finanzas: e.target.value,
                                            })
                                        }
                                        className="solicitudes-input"
                                    />
                                </div>

                                <div className="solicitudes-nota-stock">
                                    Al aprobar se guardará la factura en el control de gastos y el pedido pasará a{' '}
                                    <strong>En camino</strong>. El stock físico subirá recién cuando Bodega confirme la llegada.
                                </div>

                                <div className="solicitudes-modal-actions">
                                    <button type="button" onClick={() => setSolicitudAprobar(null)} className="solicitudes-btn-cancel">
                                        Cancelar
                                    </button>
                                    <button type="submit" disabled={proveedores.length === 0} className="solicitudes-btn-save">
                                        Aprobar y Registrar Factura
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* RECHAZAR SOLICITUD */}
                {solicitudRechazar && (
                    <div className="solicitudes-modal-overlay">
                        <div className="solicitudes-modal-card small">
                            <div className="solicitudes-modal-header rechazo">
                                <div className="solicitudes-modal-title">
                                    <XCircle size={18} />
                                    <span>Rechazar {solicitudRechazar.codigo_solicitud}</span>
                                </div>
                                <button type="button" onClick={() => setSolicitudRechazar(null)} className="solicitudes-modal-close">X</button>
                            </div>

                            <form onSubmit={enviarRechazo} className="solicitudes-modal-form">
                                {error && <div className="alerta-error">{error}</div>}

                                <div className="solicitudes-resumen-box">
                                    <strong>Material:</strong> {solicitudRechazar.articulo_nombre} (
                                    {solicitudRechazar.cantidad_solicitada} {solicitudRechazar.unidad_nombre})
                                </div>

                                <div className="solicitudes-field">
                                    <label className="solicitudes-label">Motivo del Rechazo (Obligatorio)</label>
                                    <textarea
                                        rows={3}
                                        required
                                        minLength={5}
                                        maxLength={250}
                                        placeholder="Explique a Bodega por qué se rechaza o posterga esta compra..."
                                        value={motivoRechazo}
                                        onChange={(e) => setMotivoRechazo(e.target.value)}
                                        className="solicitudes-textarea"
                                    />
                                </div>

                                <div className="solicitudes-modal-actions">
                                    <button type="button" onClick={() => setSolicitudRechazar(null)} className="solicitudes-btn-cancel">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="solicitudes-btn-danger">
                                        Confirmar Rechazo
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}