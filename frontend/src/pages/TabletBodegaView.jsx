import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Minus, Plus, Search, Scan, CheckCircle, X, ChevronDown, Truck, ShieldAlert, Info, } from "lucide-react";
import { obtenerArticulos, actualizarArticulo } from "../services_api/inventarioService";
import { obtenerObras, registrarMovimientoCardex } from "../services_api/obrasService";
import { obtenerUsuarioActual } from "../services_api/authService";
import '../styles/TabletBodegaView.css';

export default function TabletBodegaView({articulos: articulosProp = null, obras: obrasProp = null, currentUser: userProp = null, onSaveMovimiento, onSwitchToDesktop,}) {
    const navigate = useNavigate();
    const usuarioSesion = userProp || obtenerUsuarioActual() || {
        id_usuario: 1,
        nombre: 'Operador Bodega',
        rol: 'encargado_bodega',
    };

    const [articulos, setArticulos] = useState(articulosProp || []);
    const [obras, setObras] = useState(obrasProp || []);
    const [tipoMovimiento, setTipoMovimiento] = useState('Merma Justificada');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedArticulo, setSelectedArticulo] = useState(null);
    const [cantidad, setCantidad] = useState(1);
    const [selectedObraId, setSelectedObraId] = useState('');
    const [justificacion, setJustificacion] = useState('');
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
    const [menuAbierto, setMenuAbierto] = useState(false);

    const cargarDatos = async () => {
        if (articulosProp && obrasProp) {
            setArticulos(articulosProp);
            setObras(obrasProp);
            if (articulosProp.length > 0 && !selectedArticulo) setSelectedArticulo(articulosProp[0]);
            return;
        }
        try {
            const [resArt, dataObras] = await Promise.all([obtenerArticulos(), obtenerObras()]);
            const listaArt = resArt?.data || [];
            setArticulos(listaArt);
            setObras(Array.isArray(dataObras) ? dataObras : []);
            if (listaArt.length > 0 && !selectedArticulo) {
                setSelectedArticulo(listaArt[0]);
            }
        } catch {
            setErrorMsg('No se pudo sincronizar el inventario..');
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [articulosProp, obrasProp]);

    const obtenerIniciales = (nombre = '') => {
        const partes = nombre.trim().split(/\s+/);
        if (partes.length === 0 || !partes[0]) return 'OP';
        if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    };

    const filteredArticulos = articulos.filter((item) => {
        const q = searchTerm.toLowerCase();
        const codigo = String(item.codigo_barra || item.codigo_interno || '').toLowerCase();
        return item.nombre?.toLowerCase().includes(q) || codigo.includes(q);
    });

    const handleTipoChange = (nuevoTipo) => {
        setTipoMovimiento(nuevoTipo);
        setErrorMsg('');
        if (nuevoTipo === 'Merma Justificada') {
            setSelectedObraId('');
        } else if (obras.length > 0 && !selectedObraId) {
            setSelectedObraId(String(obras[0].id_obra || obras[0].id));
        }
    };

    const handleIncrement = () => {
        if (selectedArticulo && cantidad < selectedArticulo.stock_disponible) {
            setCantidad((prev) => prev + 1);
        }
    };

    const handleDecrement = () => {
        if (cantidad > 1) {
            setCantidad((prev) => prev - 1);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!selectedArticulo) {
            setErrorMsg('Seleccione un insumo del catálogo para registrar el movimiento.');
            return;
        }

        if (cantidad > selectedArticulo.stock_disponible) {
            setErrorMsg(`Error HTTP 409 (Conflicto de Stock): Solo hay ${selectedArticulo.stock_disponible} unidades disponibles.`);
            return;
        }

        if (tipoMovimiento === 'Merma Justificada' && !justificacion.trim()) {
            setErrorMsg('Es obligatorio justificar la causa del daño o pérdida para registrar una merma.');
            return;
        }

        if (tipoMovimiento === 'Salida a Obra' && !selectedObraId && obras.length > 0) {
            setErrorMsg('Debe seleccionar una obra de destino para el despacho.');
            return;
        }

        const nuevoStock = Number(selectedArticulo.stock_disponible) - Number(cantidad);

        try {
            if (onSaveMovimiento) {
                onSaveMovimiento(
                    {
                        id_articulo: selectedArticulo.id_articulo,
                        cantidad: -Number(cantidad),
                        tipo_movimiento: tipoMovimiento === 'Merma Justificada' ? 'Merma' : 'Salida',
                        motivo: justificacion.trim() || 'Salida a obra registrada en terminal móvil',
                    },
                    selectedArticulo.id_articulo,
                    Number(cantidad)
                );
            } else {
                await actualizarArticulo(selectedArticulo.id_articulo, { ...selectedArticulo, stock_disponible: nuevoStock, });
                try {
                    await registrarMovimientoCardex({
                        id_articulo: selectedArticulo.id_articulo,
                        id_usuario: usuarioSesion.id_usuario,
                        id_tipo_movimiento: tipoMovimiento === 'Merma Justificada' ? 3 : 2,
                        id_obra: tipoMovimiento === 'Salida a Obra' && selectedObraId ? Number(selectedObraId) : null,
                        cantidad: -Number(cantidad),
                        motivo: justificacion.trim() || `Despacho registrado desde terminal tablet (${tipoMovimiento})`,
                    });
                } catch {

                }
                await cargarDatos();
                setSelectedArticulo((prev) => prev ? { ...prev, stock_disponible: nuevoStock} : null);
            }

            setJustificacion('');
            setCantidad(1);
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 4000);
        } catch {
            setErrorMsg('No se pudo procesar el movimiento en el servidor.');
        }
    };

    const unidadTexto = selectedArticulo?.unidad_nombre || selectedArticulo?.unidad_medida || 'unidades';
    const unidadCorta = unidadTexto.toLowerCase().includes('metro') ? 'm' : 'un';

    return (
        <div className="tablet-wrapper">
            {showSuccessToast && (
                <div className="tablet-toast-success">
                    <CheckCircle size={22} color="#a7f3d0" />
                    <div className="tablet-toast-text">
                        <strong>Movimiento Guardado con Éxito</strong>
                        <p>Registrado en Cardex</p>
                    </div>
                </div>
            )}

            <div className="tablet-header">
                <div className="tablet-header-left">
                    <div onClick={() => setMenuAbierto((prev) => !prev)} title="Menú del sistema" className={`tablet-burger-btn ${menuAbierto ? 'open' : ''}`}>
                        <div className="tablet-burger-line"></div>
                        <div className="tablet-burger-line"></div>
                        <div className="tablet-burger-line"></div>
                    </div>
                    <div>
                        <div className="tablet-brand-name">
                            FYAG <span className="tablet-brand-spa">SpA</span>
                        </div>
                        <div className="tablet-brand-sub">BODEGA * REFRIGERACIÓN</div>
                    </div>
                </div>

                <div onClick={() => setMenuAbierto((prev) => !prev)} title={`Operador: ${usuarioSesion.nombre}`} className="tablet-avatar-badge">
                    {usuarioSesion.iniciales || obtenerIniciales(usuarioSesion.nombre)}
                </div>
            </div>

            {menuAbierto && (
                <div className="tablet-dropdown-menu">
                    <div className="tablet-dropdown-user">
                        <strong>{usuarioSesion.nombre}</strong> {' '}
                        <span className="tablet-dropdown-role">{usuarioSesion.rol}</span>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setMenuAbierto(false);
                            if (onSwitchToDesktop) {
                                onSwitchToDesktop();
                            } else {
                                navigate('/bodega/inventario');
                            }
                        }}
                        className="tablet-btn-switch-desktop"
                    >Catálogo Escritorio</button>
                </div>
            )}

            <div className="tablet-content-body">
                <div className="tablet-breadcrumb">
                    <Building2 size={13} />
                    <span>BODEGA CENTRAL / MOVIMIENTOS</span>
                </div>

                <div>
                    <h1 className="tablet-main-title">Registrar movimientos</h1>
                    <p className="tablet-main-subtitle">Selecciona el tipo de salida y los insumos a rebajar.</p>
                </div>

                {errorMsg && <div className="alerta-error">{errorMsg}</div>}

                <div className="tablet-section">
                    <label className="tablet-label">Tipo de movimientos</label>
                    <div className="tablet-type-grid">
                        <button type="button" onClick={() => handleTipoChange('Salida a Obra')} className={`tablet-type-card ${tipoMovimiento === 'Salida a Obra' ? 'active-salida' : ''}`}>
                            <Truck size={17} />
                            <span>Salida a Obra</span>
                        </button>

                        <button type="button" onClick={() => handleTipoChange('Merma Justificada')} className={`tablet-type-card ${tipoMovimiento === 'Merma Justificada' ? 'active-merma' : ''}`}>
                            <ShieldAlert size={17} color={tipoMovimiento === 'Merma Justificada' ? '#f87171' : 'currentColor'} />
                            <span>Merma Justificada</span>
                        </button>
                    </div>
                    <div className="tablet-helper-text">
                        {tipoMovimiento === 'Merma Justificada' ? 'Rebaja por daño o pérdida. Debes justificar la causa.' : 'Despacho directo de materiales e insumos a cuadrillas en terreno.'}
                    </div>
                </div>

                <div className="tablet-section tablet-search-wrapper">
                    <div className="tablet-label-row">
                        <label className="tablet-label">Buscar insumo</label>
                        <span className="tablet-hint">Código o descripción</span>
                    </div>

                    <div className="tablet-search-box">
                        <Search size={18} color="#94a3b8" />
                        <input
                            type="text"
                            placeholder="Tubo de cobre, gas refrigerante..."
                            value={searchTerm}
                            onChange={(e) => {setSearchTerm(e.target.value); setSearchDropdownOpen(true);}}
                            onFocus={() => setSearchDropdownOpen(true)}
                            className="tablet-search-input"
                        />
                        <Scan size={18} color="#94a3b8" title="Escanear Código de Barra" />
                    </div>

                    {searchDropdownOpen && searchTerm.length > 0 && (
                        <div className="tablet-search-dropdown">
                            {filteredArticulos.map((art) => (
                                <div key={art.id_articulo} onClick={() => {setSelectedArticulo(art); setSearchTerm(''); setSearchDropdownOpen(false); setCantidad(1);}} className="tablet-search-item">
                                    <div>
                                        <div className="tablet-search-item-name">{art.nombre}</div>
                                        <div className="tablet-search-item-meta">
                                            {art.codigo_barra || art.codigo_interno} {' '}
                                            {art.categoria_nombre || art.categoria}
                                        </div>
                                    </div>
                                    <div className={`tablet-search-item-stock ${art.stock_disponible <= art.stock_minimo ? 'critico' : 'ok'}`}>
                                        Stock: {art.stock_disponible}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {selectedArticulo && (
                    <div className="tablet-selected-card">
                        <div className="tablet-selected-top">
                            <div className="tablet-selected-info">
                                <div className="tablet-cube-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                                    </svg>
                                </div>
                                <div>
                                    <div className="tablet-selected-name">{selectedArticulo.nombre}</div>
                                    <div className="tablet-selected-meta">
                                        {selectedArticulo.codigo_barra || selectedArticulo.codigo_interno} * Disponible:{' '}
                                        {selectedArticulo.stock_disponible} {unidadCorta}
                                    </div>
                                </div>
                            </div>
                            <button type="button" onClick={() => setSelectedArticulo(null)} className="tablet-btn-clear-item">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="tablet-qty-row">
                            <div>
                                <div className="tablet-qty-title">Cantidad a rebajar</div>
                                <div className="tablet-qty-unit">{unidadTexto}</div>
                            </div>

                            <div className="tablet-qty-stepper">
                                <button type="button" onClick={handleDecrement} className="tablet-step-btn">
                                    <Minus size={16} />
                                </button>
                                <div className="tablet-step-value">{cantidad}</div>
                                <button type="button" onClick={handleIncrement} className="tablet-step-btn">
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="tablet-section">
                    <div className="tablet-label-row">
                        <label className={`tablet-label ${tipoMovimiento === 'Merma Justificada' ? 'muted' : ''}`}>Obra Destino</label>
                        <span className="tablet-hint">Solo para Salida a Obra</span>
                    </div>
                    
                    <div className={`tablet-obra-box ${tipoMovimiento === 'Merma Justificada' ? 'disabled' : ''}`}>
                        <Building2 size={18} color={tipoMovimiento === 'Merma Justificada' ? '#cbd5e1' : '#64748b'} />
                        {tipoMovimiento === 'Merma Justificada' ? (
                            <span className="tablet-obra-disabled-text">No aplica para merma</span>
                        ) : (
                            <select value={selectedObraId} onChange={(e) => setSelectedObraId(e.target.value)} className="tablet-obra-select">
                                <option value="">Selecciona obra de destino...</option>
                                {obras.map((o) => {
                                    const idVal = o.id_obra || o.id;
                                    return (
                                        <option key={idVal} value={idVal}>
                                            {o.nombre || `Faena #${idVal}`} ({o.ubicacion || o.estado || 'Activa'})
                                        </option>
                                    );
                                })}
                            </select>
                        )}
                        <ChevronDown size={18} color="#94a3b8" />
                    </div>
                </div>

                <div className="tablet-section">
                    <div className="tablet-label-row">
                        <label className="tablet-label">Causa del daño o pérdida</label>
                        <span className={`tablet-req-tag ${tipoMovimiento === 'Merma Justificada' ? 'required' : ''}`}>
                            {tipoMovimiento === 'Merma Justificada' ? 'Obligatorio para merma' : 'Opcional para salida'}
                        </span>
                    </div>

                    <div className="tablet-textarea-wrapper">
                        <textarea rows={3} maxLength={300} value={justificacion} onChange={(e) => setJustificacion(e.target.value)} placeholder="Describa el motivo técnico o casual de la rebaja..."className="tablet-textarea" />
                        <div className="tablet-char-counter">{justificacion.length} / 300</div>
                    </div>

                    <div className="tablet-audit-note">
                        <Info size={14} color="#64748b" />
                        <span>La justificación quedará registrada en el Cardex.</span>
                    </div>
                </div>

                <div className="tablet-footer-summary">
                    <div className="tablet-summary-row">
                        <span className="tablet-summary-label">
                            1 insumo {' '}
                            {tipoMovimiento === 'Merma Justificada' ? 'Merma justificada' : 'Salida a obra'}
                        </span>
                        <span className="tablet-summary-qty">
                            -{cantidad} {unidadCorta} de stock
                        </span>
                    </div>

                    <button type="button" onClick={handleSubmit} className="tablet-btn-submit">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Confirmar e Imputar a Cardex</span>
                    </button>
                </div>
            </div>
        </div>
    );
}