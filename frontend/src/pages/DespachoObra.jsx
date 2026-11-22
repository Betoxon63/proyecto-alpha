import React, { useState, useEffect } from "react";
import { Truck, CheckCircle, PenTool, ShieldAlert, RotateCcw } from "lucide-react";
import FirmaTablet from "../components/FirmaTablet";
import MermasView from "../components/MermasView";
import DevolucionesView from "../components/DevolucionesView";
import { obtenerArticulos, obtenerProveedores } from "../services_api/inventarioService";
import { obtenerObras, obtenerCardex, despacharObra } from "../services_api/obrasService";
import { obtenerUsuarioActual } from "../services_api/authService";
import '../styles/ObrasDespachosView.css';

export default function DespachoObra({ usuario: usuarioProp = null, obras: obrasProp = null, articulos: articulosProp = null, cardex: cardexProp = null, onRegistrarDespacho, }) {
    const usuarioActivo = usuarioProp || obtenerUsuarioActual();
    const [pestana, setPestana] = useState('despachos');
    const [obras, setObras] = useState(obrasProp || []);
    const [articulos, setArticulos] = useState(articulosProp || []);
    const [proveedores, setProveedores] = useState([]);
    const [cardex, setCardex] = useState(cardexProp || []);
    const [cargando, setCargando] = useState(!obrasProp);
    const [selectedObraId, setSelectedObraId] = useState('');
    const [articuloId, setArticuloId] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [tecnicoReceptor, setTecnicoReceptor] = useState('');
    const [guiaDespacho, setGuiaDespacho] = useState('GD-001540');
    const [mostrarFirma, setMostrarFirma] = useState(false);
    const [datosFirmaCapturada, setDatosFirmaCapturada] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const cargarTodo = async () => {
        if (obrasProp && articulosProp && cardexProp) {
            setObras(obrasProp);
            setArticulos(articulosProp);
            setCardex(cardexProp);
            setCargando(false)
            return;
        }

        try {
            const [resObras,  resArt, resProv, resCardex] = await Promise.all([
                obtenerObras(),
                obtenerArticulos().catch(() => ({ data: []})),
                obtenerProveedores().catch(() => ({ data: []})),
                obtenerCardex().catch(() => []),
            ]);

            const listaObras = Array.isArray(resObras) ? resObras : [];
            const listaArt = resArt?.data || [];
            const listaProv = resProv?.data || [];
            const listaCardex = Array.isArray(resCardex) ? resCardex : [];

            setObras(listaObras);
            setArticulos(listaArt);
            setProveedores(listaProv);
            setCardex(listaCardex);

            if (listaArt.length > 0 && !articuloId) {
                const primeroConStock = listaArt.find((a) => Number(a.stock_disponible) > 0) || listaArt[0];
                setArticuloId(String(primeroConStock.id_articulo));
            }
            const activas = listaObras.filter((o) => !o.estado || o.estado === 'En proceso' || o.estado === 'Activa');
            if (activas.length > 0 && !selectedObraId) {
                setSelectedObraId(String(activas[0].id_obra || activas[0].id));
                if (activas[0].tecnico_asociado) {
                    setTecnicoReceptor(activas[0].tecnico_asociado);
                }
            }
        } catch {
            setErrorMsg('No se pudo cargar el módulo de obras y despachos.')
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarTodo();
    }, [obrasProp, articulosProp, cardexProp]);

    // Filtra únicamente las obras en estado "En proceso" para despachar materiales.
    const obrasHabilitadas = obras.filter(
        (o) => !o.estado || o.estado === 'En proceso' || o.estado === 'Activa'
    );

    const selectedObra = obrasHabilitadas.find((o) => String(o.id_obra || o.id) === String(selectedObraId)) ||
        obrasHabilitadas[0] || {
            id_obra: null,
            nombre: 'Sin obras en proceso',
            cliente: 'Registre o active una obra en la sección Obras',
            ubicacion: 'Ñuble',
            tecnico_asociado: '',
            codigo: 'SIN-OBRA',
        };

    const selectedArticulo = articulos.find((a) => String(a.id_articulo) === String(articuloId)) || articulos[0];

    // Muestra todos los envíos y devoluciones asociados a la obra seleccionada.
    const despachoObra = cardex.filter((m) => {
        const tipo = (m.tipo_movimiento || '').toLowerCase();
        if (tipo.includes('registro de obra') || tipo.includes('modificación de obra')) return false;
        const coincideId = selectedObra.id_obra && m.id_obra && Number(m.id_obra) === Number(selectedObra.id_obra);
        const destino = (m.obra_destino || '').toLowerCase();
        const coincideTexto =
            (tipo.includes('salida') || tipo.includes('devoluci') || Number(m.cantidad) < 0) &&
            (destino.includes((selectedObra.nombre || '').toLowerCase()) ||
                destino.includes(`obra #${selectedObra.id_obra}`));
        return coincideId || coincideTexto;
    });

    const totalMermas = cardex.filter((m) => (m.tipo_movimiento || '').toLowerCase().includes('merma')).length;
    const totalDevoluciones = cardex.filter((m) => (m.tipo_movimiento || '').toLowerCase().includes('devoluci')).length;

    const handleCrearDespacho = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!selectedObra.id_obra) {
            setErrorMsg('Primero debe existir una obra con estado "En proceso" para poder despachar materiales.');
            return;
        }

        if (!selectedArticulo) {
            setErrorMsg('Seleccione un material disponible en el catálogo.');
            return;
        }

        if (Number(cantidad) > Number(selectedArticulo.stock_disponible)) {
            setErrorMsg(`Stock insuficiente: solo quedan ${selectedArticulo.stock_disponible} unidades disponibles en bodega.`);
            return;
        }

        const movimientoData = {
            id_articulo: selectedArticulo.id_articulo,
            id_usuario: usuarioActivo?.id_usuario,
            id_obra: selectedObra.id_obra,
            id_tipo_movimiento: 2,
            usuario_responsable: usuarioActivo?.nombre || 'Encargado de Bodega',
            cargo: usuarioActivo?.rol || 'Bodeguero',
            articulo_nombre: selectedArticulo.nombre,
            articulo_codigo: selectedArticulo.codigo_barra || selectedArticulo.codigo_interno,
            articulo_detalle: selectedArticulo.categoria_nombre || selectedArticulo.categoria,
            cantidad: -Number(cantidad),
            unidad_medida: selectedArticulo.unidad_nombre || selectedArticulo.unidad_medida || 'un',
            tipo_movimiento: 'Salida',
            obra_destino: selectedObra.nombre,
            documento_respaldo: guiaDespacho,
            motivo: `Guía ${guiaDespacho} | Entregado a ${tecnicoReceptor} para ${selectedObra.nombre}`,
        };

        try {
            if (onRegistrarDespacho) {
                await onRegistrarDespacho(movimientoData, selectedArticulo.id_articulo, Number(cantidad));
            } else {
                await despacharObra(selectedObra.id_obra, {
                    id_articulo: selectedArticulo.id_articulo,
                    cantidad: Number(cantidad),
                    documento_respaldo: guiaDespacho.trim(),
                    tecnico_receptor: tecnicoReceptor.trim(),
                    motivo: `Entregado a ${tecnicoReceptor.trim()} para ${selectedObra.nombre}`,
                });
                await cargarTodo();
            }

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 4000);
        } catch (err) {
            const dataErr = err.response?.data;
            if (dataErr?.detail) {
                setErrorMsg(dataErr.detail);
            } else if (dataErr && typeof dataErr === 'object') {
                setErrorMsg(Object.values(dataErr).flat().join(' '));
            } else {
                setErrorMsg('No se pudo registrar el despacho en el servidor.');
            }
        }
    };

    return (
        <div className="despachos-container">
            <div className="despachos-header">
                <div>
                    <h1 className="despachos-title">Movimientos de Bodega y Despachos a Obra</h1>
                    <p className="despachos-subtitle">
                        Entrega de materiales a terreno, registro de mermas por daño o pérdida y control de devoluciones
                    </p>
                </div>
            </div>

            <div className="despachos-tabs-bar">
                <button type="button" onClick={() => setPestana('despachos')} className={`despachos-tab-item ${pestana === 'despachos' ? 'active' : ''}`}>
                    <Truck size={16} />
                    <span>Despacho a Obra</span>
                    <span className="despachos-tab-count">{obrasHabilitadas.length}</span>
                </button>

                <button type="button" onClick={() => setPestana('mermas')} className={`despachos-tab-item ${pestana === 'mermas' ? 'active' : ''}`}>
                    <ShieldAlert size={16} />
                    <span>Mermas Justificadas</span>
                    <span className="despachos-tab-count">{totalMermas}</span>
                </button>

                <button type="button" onClick={() => setPestana('devoluciones')} className={`despachos-tab-item ${pestana === 'devoluciones' ? 'active' : ''}`}>
                    <RotateCcw size={16} />
                    <span>Devoluciones</span>
                    <span className="despachos-tab-count">{totalDevoluciones}</span>
                </button>
            </div>

            {pestana === 'despachos' && (
                <>
                    {errorMsg && <div className="alerta-error">{errorMsg}</div>}

                    {showSuccess && (
                        <div className="despachos-alert-success">
                            <CheckCircle size={18} color="#10b981" />
                            <span>
                                <strong>Despacho emitido con éxito:</strong> Stock rebajado, asignado a la obra{' '}
                                {selectedObra.nombre} y guardado en el historial de movimientos.
                            </span>
                        </div>
                    )}

                    <div className="despachos-grid">
                        <div className="despachos-card">
                            <div className="despachos-card-title">
                                <Truck size={18} color="#116530" />
                                <span>Emitir Guía de Despacho a Obra</span>
                            </div>

                            <form onSubmit={handleCrearDespacho}>
                                <div className="despachos-field">
                                    <label className="despachos-label">Obra de Destino (Cliente)</label>
                                    <select
                                        value={selectedObraId}
                                        onChange={(e) => {
                                            const nuevoId = e.target.value;
                                            setSelectedObraId(nuevoId);
                                            const obraElegida = obrasHabilitadas.find(
                                                (o) => String(o.id_obra || o.id) === String(nuevoId)
                                            );
                                            if (obraElegida?.tecnico_asociado) {
                                                setTecnicoReceptor(obraElegida.tecnico_asociado);
                                            }
                                        }}
                                        className="despachos-select"
                                    >
                                        {obrasHabilitadas.length === 0 ? (
                                            <option value="">No hay obras en proceso disponibles</option>
                                        ) : (
                                            obrasHabilitadas.map((o) => {
                                                const idVal = o.id_obra || o.id;
                                                return (
                                                    <option key={idVal} value={idVal}>
                                                        {o.nombre || `Obra #${idVal}`} - Técnico: {o.tecnico_asociado}
                                                    </option>
                                                );
                                            })
                                        )}
                                    </select>
                                </div>

                                <div className="despachos-row-2">
                                    <div>
                                        <label className="despachos-label">N° Guía de Despacho</label>
                                        <input
                                            type="text"
                                            value={guiaDespacho}
                                            onChange={(e) => setGuiaDespacho(e.target.value)}
                                            className="despachos-input"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="despachos-label">Técnico Receptor</label>
                                        <input
                                            type="text"
                                            value={tecnicoReceptor}
                                            onChange={(e) => setTecnicoReceptor(e.target.value)}
                                            className="despachos-input"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="despachos-field">
                                    <label className="despachos-label">Material o Repuesto a Despachar</label>
                                    <select value={articuloId} onChange={(e) => setArticuloId(e.target.value)} className="despachos-select">
                                        {articulos.length === 0 ? (
                                            <option value="">No hay materiales registrados en el catálogo</option>
                                        ) : (
                                            articulos.map((a) => (
                                                <option key={a.id_articulo} value={a.id_articulo}>
                                                    {a.nombre} (Disp: {a.stock_disponible}{' '}
                                                    {a.unidad_nombre || a.unidad_medida || 'un'})
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div className="despachos-field">
                                    <div className="despachos-label-row">
                                        <label className="despachos-label">Cantidad Solicitada</label>
                                        <span className="despachos-stock-hint">
                                            Disponible actual: <strong>{selectedArticulo?.stock_disponible ?? 0}</strong>
                                        </span>
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        max={Math.max(1, Number(selectedArticulo?.stock_disponible || 1))}
                                        value={cantidad}
                                        onChange={(e) => setCantidad(e.target.value)}
                                        className="despachos-input"
                                        required
                                    />
                                </div>

                                <div className="despachos-sign-box">
                                    <div className="despachos-sign-info">
                                        <strong>Firma de recepción conforme:</strong>
                                        <br />
                                        {datosFirmaCapturada
                                            ? `Firmado digitalmente a las ${datosFirmaCapturada.fecha}`
                                            : 'Puede capturar la firma en pantalla o tablet al entregar'
                                        }
                                    </div>
                                    <button type="button" onClick={() => setMostrarFirma(true)} className="despachos-btn-open-sign">
                                        <PenTool size={13} />
                                        <span>{datosFirmaCapturada ? 'Firma Validada' : 'Capturar Firma'}</span>
                                    </button>
                                </div>

                                <button type="submit" className="despachos-btn-submit">
                                    <Truck size={17} />
                                    <span>Emitir y Despachar a Obra</span>
                                </button>
                            </form>
                        </div>

                        <div className="despachos-card despachos-history-card">
                            <div className="despachos-obra-header">
                                <div>
                                    <div className="despachos-obra-name">{selectedObra.nombre}</div>
                                    <div className="despachos-obra-sub">
                                        {selectedObra.cliente} | {selectedObra.ubicacion}
                                    </div>
                                </div>
                                <span className="despachos-obra-code">
                                    {selectedObra.codigo || `OB-${selectedObra.id_obra || 1}`}
                                </span>
                            </div>

                            <div className="despachos-section-subtitle">
                                Materiales Despachados y Devueltos en esta Obra:
                            </div>

                            <div className="despachos-history-list">
                                {cargando ? (
                                    <div className="despachos-empty">
                                        Cargando movimientos de la obra...
                                    </div>
                                ) : despachoObra.length === 0 ? (
                                    <div className="despachos-empty">
                                        Aún no hay despachos registrados para esta obra.
                                    </div>
                                ) : (
                                    despachoObra.map((item, idx) => {
                                        const esDevolucion = (item.tipo_movimiento || '')
                                            .toLowerCase()
                                            .includes('devoluci');
                                        return (
                                            <div key={item.id_movimiento || idx} className="despachos-history-item">
                                                <div>
                                                    <div className="despachos-item-name">{item.articulo_nombre}</div>
                                                    <div className="despachos-item-meta">
                                                        {item.documento_respaldo || item.motivo} | {item.fecha_hora}
                                                    </div>
                                                </div>
                                                <div className="despachos-item-right">
                                                    <span className={`despachos-item-qty ${esDevolucion ? 'ingreso' : ''}`}>
                                                        {esDevolucion ? '+' : ''}
                                                        {Math.abs(item.cantidad)} {item.unidad_medida || 'un'}
                                                    </span>
                                                    <div className="despachos-item-status">
                                                        {esDevolucion ? 'Devuelto' : 'Entregado'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="despachos-footer-count">
                                <span>Total de movimientos en esta obra:</span>
                                <strong>{despachoObra.length} registros</strong>
                            </div>
                        </div>
                    </div>

                    {mostrarFirma && (
                        <FirmaTablet
                            documento={guiaDespacho}
                            onConfirmarFirma={(datosFirma) => {
                                setDatosFirmaCapturada(datosFirma);
                                setMostrarFirma(false);
                            }}
                            onCancelar={() => setMostrarFirma(false)}
                        />
                    )}
                </>
            )}

            {pestana === 'mermas' && (
                <MermasView
                    articulos={articulos}
                    cardex={cardex}
                    onMovimientoRegistrado={cargarTodo}
                />
            )}

            {pestana === 'devoluciones' && (
                <DevolucionesView
                    obras={obras}
                    proveedores={proveedores}
                    articulos={articulos}
                    cardex={cardex}
                    onMovimientoRegistrado={cargarTodo}
                />
            )}
        </div>
    );
}