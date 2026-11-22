import React, { useState, useEffect } from "react";
import { ShieldAlert, CheckCircle, Building2, Info } from "lucide-react";
import { registrarMerma } from "../services_api/obrasService";

export default function MermasView({ articulos = [], cardex = [], onMovimientoRegistrado }) {
    const [articuloId, setArticuloId] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [motivo, setMotivo] = useState('');
    const [enviando, setEnviado] = useState(false);
    const [mensajeExito, setMensajeExito] = useState('');
    const [mensajeError, setMensajeError] = useState('');

    useEffect(() => {
        if (articulos.length > 0 && !articulos.some((a) => String(a.id_articulo) === String(articuloId))) {
            const primeroConStock = articulos.find((a) => Number(a.stock_disponible) > 0) || articulos[0];
            setArticuloId(String(primeroConStock.id_articulo));
        }
    }, [articulos, articuloId]);

    const articuloSeleccionado =
        articulos.find((a) => String(a.id_articulo) === String(articuloId)) || articulos[0];
    
    // Filtra las mermas registradas en el historial para mostrarlas en el panel derecho.
    const historialMermas = cardex.filter((m) =>
        (m.tipo_movimiento || '').toLowerCase().includes('merma')
    );

    const manejarRegistroMerma = async (e) => {
        e.preventDefault();
        setMensajeError('');
        setMensajeExito('');

        if (!articuloSeleccionado) {
            setMensajeError('Seleccione un material del catálogo.');
            return;
        }
        if (Number(cantidad) > Number(articuloSeleccionado.stock_disponible)) {
            setMensajeError(`Stock insuficiente: solo quedan ${articuloSeleccionado.stock_disponible} unidades disponibles en bodega.`);
            return;
        }
        if (motivo.trim().length < 5) {
            setMensajeError('Debe escribir una explicación clara del daño o pérdida (mínimo 5 caracteres).');
            return;
        }

        setEnviado(true);
        try {
            const respuesta = await registrarMerma({
                id_articulo: Number(articuloSeleccionado.id_articulo),
                cantidad: Number(cantidad),
                motivo: motivo.trim(),
            });

            const avisoStock = respuesta.alerta_stock_minimo
                ? ' Atención: este material quedó en nivel de stock bajo.'
                : '';
            setMensajeExito(`${respuesta.detail}${avisoStock}`);
            setCantidad(1);
            setMotivo('');
            if (onMovimientoRegistrado) await onMovimientoRegistrado();
        } catch (err) {
            const dataErr = err.response?.data;
            if (dataErr?.detail) {
                setMensajeError(dataErr.detail);
            } else if (dataErr && typeof dataErr === 'object') {
                setMensajeError(Object.values(dataErr).flat().join(' '));
            } else {
                setMensajeError('No se pudo registrar la merma en el servidor.');
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
                {/* Panel Izquierdo: Formulario de Merma Justificada */}
                <div className="despachos-card">
                    <div className="despachos-card-title">
                        <ShieldAlert size={18} color="#b45309" />
                        <span>Registrar Merma por Daño o Pérdida</span>
                    </div>

                    <form onSubmit={manejarRegistroMerma}>
                        <div className="despachos-field">
                            <label className="despachos-label">Material o Repuesto Dañado</label>
                            <select value={articuloId} onChange={(e) => setArticuloId(e.target.value)} className="despachos-select" required>
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
                                <label className="despachos-label">Cantidad a Rebajar</label>
                                <span className="despachos-stock-hint">
                                    Disponible actual: <strong>{articuloSeleccionado?.stock_disponible ?? 0}</strong>
                                </span>
                            </div>
                            <input
                                type="number"
                                min="1"
                                max={Math.max(1, Number(articuloSeleccionado?.stock_disponible || 1))}
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                                className="despachos-input"
                                required
                            />
                        </div>

                        <div className="despachos-field">
                            <div className="despachos-label-row">
                                <label className="despachos-label">Obra Destino</label>
                                <span className="despachos-stock-hint">Solo para despachos a obra</span>
                            </div>
                            <div className="despachos-disabled-box">
                                <Building2 size={16} color="#94a3b8" />
                                <span>No aplica para merma (baja directa de bodega)</span>
                            </div>
                        </div>

                        <div className="despachos-field">
                            <div className="despachos-label-row">
                                <label className="despachos-label">Causa del Daño o Pérdida</label>
                                <span className="despachos-req-label">Obligatorio</span>
                            </div>
                            <textarea
                                rows={3}
                                maxLength={300}
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder="Ej: Tramo de tubo aplastado durante la descarga. No es apto para instalación."
                                className="despachos-textarea"
                                required
                            />
                            <div className="despachos-char-counter">{motivo.length} / 300</div>
                        </div>

                        <div className="despachos-audit-note">
                            <Info size={14} color="#64748b" />
                            <span>
                                Esta justificación quedará guardada en el Historial de Movimientos.
                            </span>
                        </div>

                        <button type="submit" className="despachos-btn-submit merma" disabled={enviando}>
                            <ShieldAlert size={17} />
                            <span>{enviando ? 'Guardando...' : 'Confirmar Merma y Descontar Stock'}</span>
                        </button>
                    </form>
                </div>

                {/* Panel Derecho: Últimas Mermas Registradas */}
                <div className="despachos-card despachos-history-card">
                    <div className="despachos-obra-header">
                        <div>
                            <div className="despachos-obra-name">Mermas Registradas en Bodega</div>
                            <div className="despachos-obra-sub">
                                Control de pérdidas y daños con justificación obligatoria
                            </div>
                        </div>
                        <span className="despachos-obra-code merma">MERMAS</span>
                    </div>

                    <div className="despachos-section-subtitle">Últimos registros de mermas:</div>

                    <div className="despachos-history-list">
                        {historialMermas.length === 0 ? (
                            <div className="despachos-empty">
                                No hay mermas registradas en el historial.
                            </div>
                        ) : (
                            historialMermas.map((item, idx) => (
                                <div key={item.id_movimiento || idx} className="despachos-history-item">
                                    <div>
                                        <div className="despachos-item-name">{item.articulo_nombre}</div>
                                        <div className="despachos-item-meta">
                                            Motivo: {item.motivo} | {item.usuario_responsable} ({item.fecha_hora})
                                        </div>
                                    </div>
                                    <div className="despachos-item-right">
                                        <span className="despachos-item-qty merma">
                                            -{Math.abs(item.cantidad)} {item.unidad_medida || 'un'}
                                        </span>
                                        <div className="despachos-item-status merma">Merma</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="despachos-footer-count">
                        <span>Total de mermas registradas:</span>
                        <strong>{historialMermas.length} registros</strong>
                    </div>
                </div>
            </div>
        </div>
    );
}