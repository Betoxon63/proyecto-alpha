import React, { useState, useEffect, useMemo } from "react";
import { RotateCcw, CheckCircle, Building2, Truck, Info } from "lucide-react";
import { registrarDevolucion } from "../services_api/obrasService";
import { formatearRutVisual } from "../pages/GestionUsuariosView";

export default function DevolucionesView({ obras = [], proveedores = [], articulos = [], cardex = [], onMovimientoRegistrado }) {
    const [tipoDevolucion, setTipoDevolucion] = useState('obra');
    const [obraId, setObraId] = useState('');
    const [proveedorId, setProveedorId] = useState('');
    const [articuloId, setArticuloId] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [documento, setDocumento] = useState('');
    const [motivo, setMotivo] = useState('');
    const [enviando, setEnviado] = useState(false);
    const [mensajeExito, setMensajeExito] = useState('');
    const [mensajeError, setMensajeError] = useState('');

    // Obras que han recibido al menos un despacho de materiales.
    const obrasConMateriales = useMemo(
        () => obras.filter((o) => Array.isArray(o.detalles) && o.detalles.length > 0),
        [obras]
    );

    useEffect(() => {
        if (obrasConMateriales.length > 0 && !obrasConMateriales.some((o) => String(o.id_obra) === String(obraId))) {
            setObraId(String(obrasConMateriales[0].id_obra));
        }
    }, [obrasConMateriales, obraId]);

    useEffect(() => {
        if (proveedores.length > 0 && !proveedores.some((p) => String(p.id_proveedor) === String(proveedorId))) {
            setProveedorId(String(proveedores[0].id_proveedor));
        }
    }, [proveedores, proveedorId]);

    const obraSeleccionada = obrasConMateriales.find((o) => String(o.id_obra) === String(obraId)) || null;

    // Agrupa los materiales entregados a la obra elegida y resta lo que ya fue devuelto antes.
    const materialesDisponiblesEnObra = useMemo(() => {
        if (!obraSeleccionada || !Array.isArray(obraSeleccionada.detalles)) return [];

        const mapa = {};
        obraSeleccionada.detalles.forEach((det) => {
            const idArt = det.id_articulo;
            if (!mapa[idArt]) {
                mapa[idArt] = {
                    id_articulo: idArt,
                    nombre: det.articulo_nombre,
                    unidad_nombre: det.unidad_nombre || 'un',
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
                Number(m.id_obra) === Number(obraSeleccionada.id_obra) &&
                mapa[m.id_articulo]
            ) {
                mapa[m.id_articulo].devuelto += Math.abs(Number(m.cantidad || 0));
            }
        });

        return Object.values(mapa)
            .map((item) => ({
                ...item,
                disponibleDevolver: Math.max(0, item.despachado - item.devuelto),
            }))
            .filter((item) => item.disponibleDevolver > 0);
    }, [obraSeleccionada, cardex]);

    // Sincroniza el selector de material cuando cambia el tipo de devolución o la obra.
    useEffect(() => {
        if (tipoDevolucion === 'obra') {
            if (materialesDisponiblesEnObra.length > 0) {
                if (!materialesDisponiblesEnObra.some((m) => String(m.id_articulo) === String(articuloId))) {
                    setArticuloId(String(materialesDisponiblesEnObra[0].id_articulo));
                }
            } else {
                setArticuloId('');
            }
        } else if (articulos.length > 0) {
            if (!articulos.some((a) => String(a.id_articulo) === String(articuloId))) {
                const primeroConStock = articulos.find((a) => Number(a.stock_disponible) > 0) || articulos[0];
                setArticuloId(String(primeroConStock.id_articulo));
            }
        }
    }, [tipoDevolucion, materialesDisponiblesEnObra, articulos, articuloId]);

    const itemObraElegido = materialesDisponiblesEnObra.find((m) => String(m.id_articulo) === String(articuloId));
    const articuloBodegaElegido = articulos.find((a) => String(a.id_articulo) === String(articuloId));

    const maximoPermitido = tipoDevolucion === 'obra'
        ? Number(itemObraElegido?.disponibleDevolver || 0)
        : Number(articuloBodegaElegido?.stock_disponible || 0);
    
    const historialDevoluciones = cardex.filter((m) =>
        (m.tipo_movimiento || '').toLowerCase().includes('devoluci')
    );

    const manejarEnvio = async (e) => {
        e.preventDefault();
        setMensajeError('');
        setMensajeExito('');

        if (!articuloId) {
            setMensajeError(
                tipoDevolucion === 'obra'
                    ? 'La obra seleccionada no tiene materiales pendientes para devolver.'
                    : 'Seleccione un material del catálogo.'
            );
            return;
        }
        if (Number(cantidad) > maximoPermitido) {
            setMensajeError(
                tipoDevolucion === 'obra'
                    ? `Solo puede devolver hasta ${maximoPermitido} unidades desde esta obra.`
                    : `Stock insuficiente: solo quedan ${maximoPermitido} unidades disponibles en bodega.`
            );
            return;
        }
        if (motivo.trim().length < 5) {
            setMensajeError('Debe indicar el motivo de la devolución (mínimo 5 caracteres).');
            return;
        }

        const payload = {
            tipo_devolucion: tipoDevolucion,
            id_articulo: Number(articuloId),
            cantidad: Number(cantidad),
            documento_respaldo: documento.trim(),
            motivo: motivo.trim(),
        };

        if (tipoDevolucion === 'obra') {
            payload.id_obra = Number(obraId);
        } else if (proveedorId) {
            payload.id_proveedor = Number(proveedorId);
        }

        setEnviado(true);
        try {
            const respuesta = await registrarDevolucion(payload);
            const avisoStock = respuesta.alerta_stock_minimo
                ? ' Atención: este material quedó en nivel de stock bajo.'
                : '';
            setMensajeExito(`${respuesta.detail}${avisoStock}`);
            setCantidad(1);
            setDocumento('');
            setMotivo('');
            if (onMovimientoRegistrado) await onMovimientoRegistrado();
        } catch (err) {
            const dataErr = err.response?.data;
            if (dataErr?.detail) {
                setMensajeError(dataErr.detail);
            } else if (dataErr && typeof dataErr === 'object') {
                setMensajeError(Object.values(dataErr).flat().join(' '));
            } else {
                setMensajeError('No se pudo registrar la devolución en el servidor.');
            }
        } finally {
            setEnviado(false);
        }
    };

    return (
        <div>
            {mensajeError && <div className="alerta-error">{mensajeError}</div>}
            {mensajeExito && (
                <div className="despachos-alert-success">
                    <CheckCircle size={18} color="#10b981" />
                    <span>{mensajeExito}</span>
                </div>
            )}

            <div className="despachos-grid">
                {/* Panel Izquierdo: Formulario de Devoluciones */}
                <div className="despachos-card">
                    <div className="despachos-card-title">
                        <RotateCcw size={18} color="#0369a1" />
                        <span>Registrar Devolución de Materiales</span>
                    </div>

                    {/* Conmutador entre Devolución desde Obra y a Proveedor */}
                    <div className="despachos-field">
                        <label className="despachos-label">Tipo de Devolución</label>
                        <div className="despachos-toggle-grid">
                            <button type="button" onClick={() => {setTipoDevolucion('obra'); setMensajeError(''); setCantidad(1);}} className={`despachos-toggle-btn ${tipoDevolucion === 'obra' ? 'active-ingreso' : ''}`}>
                                <Building2 size={15} />
                                <span>Desde Obra (+ Stock)</span>
                            </button>
                            <button type="button" onClick={() => {setTipoDevolucion('proveedor'); setMensajeError(''); setCantidad(1);}} className={`despachos-toggle-btn ${tipoDevolucion === 'proveedor' ? 'active-salida' : ''}`}>
                                <Truck size={15} />
                                <span>A Proveedor (- Stock)</span>
                            </button>
                        </div>
                    </div>

                    <form onSubmit={manejarEnvio}>
                        {tipoDevolucion === 'obra' ? (
                            <div className="despachos-field">
                                <label className="despachos-label">Obra de Origen</label>
                                <select value={obraId} onChange={(e) => {setObraId(e.target.value); setCantidad(1);}} className="despachos-select" required>
                                    {obrasConMateriales.length === 0 ? (
                                        <option value="">No hay obras con despachos registrados</option>
                                    ) : (
                                        obrasConMateriales.map((o) => (
                                            <option key={o.id_obra} value={o.id_obra}>
                                                {o.nombre || `Obra #${o.id_obra}`} - Técnico: {o.tecnico_asociado}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                        ) : (
                            <div className="despachos-field">
                                <label className="despachos-label">Proveedor Destino</label>
                                <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="despachos-select">
                                    {proveedores.length === 0 ? (
                                        <option value="">Sin proveedores registrados</option>
                                    ) : (
                                        proveedores.map((p) => (
                                            <option key={p.id_proveedor} value={p.id_proveedor}>
                                                {p.razon_social} ({formatearRutVisual(p.rut)})
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                        )}

                        <div className="despachos-field">
                            <label className="despachos-label">Material a Devolver</label>
                            <select value={articuloId} onChange={(e) => {setArticuloId(e.target.value); setCantidad(1);}} className="despachos-select" required>
                                {tipoDevolucion === 'obra' ? (
                                    materialesDisponiblesEnObra.length === 0 ? (
                                        <option value="">
                                            Esta obra no tiene materiales pendientes para devolver
                                        </option>
                                    ) : (
                                        materialesDisponiblesEnObra.map((item) => (
                                            <option key={item.id_articulo} value={item.id_articulo}>
                                                {item.nombre} (En obra: {item.disponibleDevolver} {item.unidad_nombre})
                                            </option>
                                        ))
                                    )
                                ) : articulos.length === 0 ? (
                                    <option value="">No hay materiales registrados en el catálogo</option>
                                ) : (
                                    articulos.map((a) => (
                                        <option key={a.id_articulo} value={a.id_articulo}>
                                            {a.nombre} (Disp. bodega: {a.stock_disponible}{' '}
                                            {a.unidad_nombre || a.unidad_medida || 'un'})
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div className="despachos-row-2">
                            <div className="despachos-field">
                                <div className="despachos-label-row">
                                    <label className="despachos-label">Cantidad</label>
                                    <span className="despachos-stock-hint">
                                        Máx: <strong>{maximoPermitido}</strong>
                                    </span>
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    max={Math.max(1, maximoPermitido)}
                                    value={cantidad}
                                    onChange={(e) => setCantidad(e.target.value)}
                                    className="despachos-input"
                                    required
                                />
                            </div>

                            <div className="despachos-field">
                                <label className="despachos-label">
                                    {tipoDevolucion === 'obra'
                                        ? 'N° Guía / Vale (Opcional)'
                                        : 'Nota de Crédito / Factura'
                                    }
                                </label>
                                <input
                                    type="text"
                                    value={documento}
                                    onChange={(e) => setDocumento(e.target.value)}
                                    placeholder={tipoDevolucion === 'obra' ? 'Ej: DEV-001' : 'Ej: NC-4510'}
                                    className="despachos-input"
                                />
                            </div>
                        </div>

                        <div className="despachos-field">
                            <div className="despachos-label-row">
                                <label className="despachos-label">Motivo de la Devolución</label>
                                <span className="despachos-req-label">Obligatorio</span>
                            </div>
                            <textarea
                                rows={3}
                                maxLength={300}
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder={
                                    tipoDevolucion === 'obra'
                                        ? 'Ej: Material sobrante sin uso al finalizar la instalación en faena.'
                                        : 'Ej: Repuesto con falla de fábrica devuelto al proveedor por garantía.'
                                }
                                className="despachos-textarea"
                                required
                            />
                            <div className="despachos-char-counter">{motivo.length} / 300</div>
                        </div>

                        <div className="despachos-audit-note">
                            <Info size={14} color="#64748b" />
                            <span>
                                {tipoDevolucion === 'obra'
                                    ? 'Al confirmar, las unidades volverán a sumarse al stock disponible en bodega.'
                                    : 'Al confirmar, las unidades se descontarán del stock disponible de bodega.'
                                }
                            </span>
                        </div>

                        <button type="submit" className={`despachos-btn-submit ${tipoDevolucion === 'obra' ? 'devolucion' : 'merma'}`} disabled={enviando || maximoPermitido <= 0}>
                            <RotateCcw size={17} />
                            <span>
                                {enviando
                                    ? 'Procesando...'
                                    : tipoDevolucion === 'obra'
                                    ? 'Confirmar Reingreso a Bodega'
                                    : 'Confirmar Devolución a Proveedor'
                                }
                            </span>
                        </button>
                    </form>
                </div>

                {/* Panel Derecho: Últimas Devoluciones Registradas */}
                <div className="despachos-card despachos-history-card">
                    <div className="despachos-obra-header">
                        <div>
                            <div className="despachos-obra-name">Historial de Devoluciones</div>
                            <div className="despachos-obra-sub">
                                Reingreso desde obras y devoluciones enviadas a proveedores
                            </div>
                        </div>
                        <span className="despachos-obra-code devolucion">DEVOLUCIONES</span>
                    </div>

                    <div className="despachos-section-subtitle">Últimas devoluciones registradas:</div>

                    <div className="despachos-history-list">
                        {historialDevoluciones.length === 0 ? (
                            <div className="despachos-empty">
                                Aún no hay devoluciones registradas en el sistema.
                            </div>
                        ) : (
                            historialDevoluciones.map((item, idx) => {
                                const esReingreso = Number(item.cantidad) > 0;
                                return(
                                    <div key={item.id_movimiento || idx} className="despachos-history-item">
                                        <div>
                                            <div className="despachos-item-name">{item.articulo_nombre}</div>
                                            <div className="despachos-item-meta">
                                                {item.motivo} | {item.fecha_hora}
                                            </div>
                                        </div>
                                        <div className="despachos-item-right">
                                            <span className={`despachos-item-qty ${esReingreso ? 'ingreso' : 'merma'}`}>
                                                {esReingreso ? '+' : '-'}
                                                {Math.abs(item.cantidad)} {item.unidad_medida || 'un'}
                                            </span>
                                            <div className="despachos-item-status">
                                                {esReingreso ? 'Reingreso Obra' : 'A Proveedor'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="despachos-footer-count">
                        <span>Total de devoluciones registradas:</span>
                        <strong>{historialDevoluciones.length} registros</strong>
                    </div>
                </div>
            </div>
        </div>
    );
}