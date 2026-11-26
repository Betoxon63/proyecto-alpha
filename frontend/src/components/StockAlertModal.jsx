import React from "react";
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X, ArrowRight, ShieldAlert, ClipboardList, ShoppingCart } from "lucide-react";
import { obtenerUsuarioActual } from '../services_api/authService';
import '../styles/StockAlertModal.css';

// Ventana emergente que avisa sobre materiales agotados o por debajo de su stock mínimo.
export default function StockAlertModal({ isOpen, onClose, articulos = [], usuario = null, onNavigateToBodega }) {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const sesion = usuario || obtenerUsuarioActual();
    const rol = sesion?.rol;
    const puedeSolicitar = ['administracion', 'encargado_bodega'].includes(rol);
    const puedeVerSolicitudes = ['administracion', 'encargado_bodega', 'encargado_finanza'].includes(sesion?.rol);

    // Filtra los materiales en alerta y los ordena mostrando primero los agotados.
    const criticos = articulos
        .filter((a) => Number(a.stock_disponible) <= Number(a.stock_minimo))
        .sort((a, b) => Number(a.stock_disponible) - Number(b.stock_disponible));
    
    const totalAgotados = criticos.filter((a) => Number(a.stock_disponible) <= 0).length;
    const totalStockBajo = criticos.length - totalAgotados;

    // Lleva a la pantalla de Solicitudes precargando el material escogido.
    const irASolicitudes = (art = null, cantidadSugerida = 1) => {
        onClose();
        if (art && puedeSolicitar) {
            navigate('/solicitudes', {
                state: {
                    abrirCrear: true,
                    articuloId: art.id_articulo,
                    cantidadSugerida: cantidadSugerida > 0 ? cantidadSugerida : 1,
                },
            });
        } else {
            navigate('/solicitudes');
        }
    };

    return (
        <div className="stock-modal-backdrop">
            <div className="stock-modal-container">
                <div className={`stock-modal-header ${totalAgotados > 0 ? 'critico' : ''}`}>
                    <div className="stock-modal-header-info">
                        <div className={`stock-modal-icon-badge ${totalAgotados > 0 ? 'critico' : ''}`}>
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <div className="stock-modal-title">Aviso de Materiales sin Stock o por Agotarse</div>
                            <div className="stock-modal-subtitle">
                                {totalAgotados} agotados | {totalStockBajo} con stock bajo en bodega
                            </div>
                        </div>
                    </div>

                    <button type="button" onClick={onClose} className="stock-modal-btn-close">
                        <X size={20} />
                    </button>
                </div>

                <div className="stock-modal-body">
                    <p className="stock-modal-description">
                        Los siguientes materiales requieren reposición prioritaria para evitar detenciones en las obras:
                    </p>

                    {criticos.length === 0 ? (
                        <div className="stock-modal-empty">
                            Todo en orden: no hay materiales agotados ni con stock bajo en este momento.
                        </div>
                    ) : (
                        <div className="stock-modal-list">
                            {criticos.map((art) => {
                                const disponible = Number(art.stock_disponible || 0);
                                const minimo = Number(art.stock_minimo || 0);
                                const comprometido = Number(art.stock_comprometido || 0);
                                const esAgotado = disponible <= 0;
                                const sugeridoReponer =
                                    art.faltante_reposicion !== undefined
                                        ? Number(art.faltante_reposicion)
                                        : Math.max(0, minimo + comprometido - disponible);
                                const unidad = art.unidad_nombre || art.unidad_medida || 'un';

                                return (
                                    <div key={art.id_articulo} className={`stock-modal-item ${esAgotado ? 'agotado' : 'bajo'}`}>
                                        <div className="stock-modal-item-left">
                                            <div className="stock-modal-item-top">
                                                <span className={`stock-modal-pill ${esAgotado ? 'agotado' : 'bajo'}`}>
                                                    {esAgotado ? 'AGOTADO' : 'STOCK BAJO'}
                                                </span>
                                                <span className="stock-modal-item-name">{art.nombre}</span>
                                            </div>
                                            <div className="stock-modal-item-code">
                                                Cód: {art.codigo_barra || art.codigo_interno} | Ubicación: {art.ubicacion || 'Bodega'}
                                            </div>
                                            {sugeridoReponer > 0 && (
                                                <div className="stock-modal-sugerido">
                                                    Reposición sugerida: al menos {sugeridoReponer} {unidad}
                                                </div>
                                            )}
                                        </div>

                                        <div className="stock-modal-item-stock">
                                            <div className={`stock-modal-stock-qty ${esAgotado ? 'agotado' : 'bajo'}`}>
                                                {disponible} {unidad}
                                            </div>
                                            <div className="stock-modal-stock-min">Mínimo: {minimo}</div>
                                            {puedeSolicitar && (
                                                <button type="button" onClick={() => irASolicitudes(art, sugeridoReponer)} className="catalogo-btn-pedir" style={{ marginTop: 6 }}>
                                                    <ShoppingCart size={12} />
                                                    <span>Pedir</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="stock-modal-footer">
                    <div className="stock-modal-notice">
                        <ShieldAlert size={14} color="#f59e0b" />
                        <span>Aviso preventivo generado automáticamente</span>
                    </div>

                    <div className="stock-modal-actions">
                        <button type="button" onClick={onClose} className="stock-modal-btn-secondary">
                            Cerrar
                        </button>

                        {puedeVerSolicitudes && criticos.length > 0 && (
                            <button type="button" onClick={() => irASolicitudes()} className="stock-modal-btn-factura">
                                <ClipboardList size={14} />
                                <span>{puedeSolicitar ? 'Solicitar Reposición' : 'Revisar Solicitudes'}</span>
                            </button>
                        )}

                        {onNavigateToBodega && (
                            <button type="button" onClick={() => {onClose(); onNavigateToBodega();}} className="stock-modal-btn-primary">
                                <span>Ir al Catálogo</span>
                                <ArrowRight size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}