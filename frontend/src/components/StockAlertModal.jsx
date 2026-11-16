import React from "react";
import { AlertTriangle, X, ArrowRight, ShieldAlert, } from "lucide-react";
import '../styles/StockAlertModal.css';

export default function StockAlertModal({ isOpen, onClose, articulos = [], onNavigateToBodega }) {
    if (!isOpen) return null;

    // Filtra los materiales cuyas unidades disponibles son iguales o menores al mínimo recomendado.
    const criticos = articulos.filter((a) => Number(a.stock_disponible) <= Number(a.stock_minimo));

    return (
        <div className="stock-modal-backdrop">
            <div className="stock-modal-container">
                <div className="stock-modal-header">
                    <div className="stock-modal-header-info">
                        <div className="stock-modal-icon-badge">
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <div className="stock-modal-title">Aviso de Materiales por Agotarse</div>
                            <div className="stock-modal-subtitle">{criticos.length} materiales tienen pocas unidades disponibles en bodega</div>
                        </div>
                    </div>

                    <button type="button" onClick={onClose} className="stock-modal-btn-close">
                        <X size={20} />
                    </button>
                </div>

                <div className="stock-modal-body">
                    <p className="stock-modal-description">
                        Los siguientes materiales llegaron al mínimo recomendado y requieren reposición:
                    </p>

                    {criticos.length === 0 ? (
                        <div className="stock-modal-empty">
                            Todo en orden: no hay materiales con stock bajo en este momento.
                        </div>
                    ) : (
                        <div className="stock-modal-list">
                            {criticos.map((art) => (
                                <div key={art.id_articulo} className="stock-modal-item">
                                    <div>
                                        <div className="stock-modal-item-name">{art.nombre}</div>
                                        <div className="stock-modal-item-code">
                                            Cód: {art.codigo_barra || art.codigo_interno} * Ubicación: {art.ubicacion || 'Bodega'}
                                        </div>
                                    </div>

                                    <div className="stock-modal-item-stock">
                                        <div className="stock-modal-stock-qty">
                                            {art.stock_disponible} {art.unidad_nombre || art.unidad_medida || 'un'}
                                        </div>
                                        <div className="stock-modal-stock-min">
                                            Mínimo: {art.stock_minimo}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="stock-modal-footer">
                    <div className="stock-modal-notice">
                        <ShieldAlert size={14} color="#f59e0b" />
                        <span>Notificación preventiva generada automáticamente</span>
                    </div>

                    <div className="stock-modal-actions">
                        <button type="button" onClick={onClose} className="stock-modal-btn-secondary">Cerrar</button>
                        {onNavigateToBodega && (
                            <button type="button" onClick={() => {onClose(); onNavigateToBodega();}} className="stock-modal-btn-primary">
                                <span>Ir al Catálogo de Bodega</span>
                                <ArrowRight size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}