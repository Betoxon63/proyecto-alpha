import React, { useState, useEffect } from "react";
import { Building2, Boxes, Search, CheckCircle, PenTool, FileCheck, Lock } from "lucide-react";
import FirmaTablet from '../components/FirmaTablet';
import { obtenerArticulos } from "../services_api/inventarioService";
import { obtenerObras, obtenerCardex } from '../services_api/obrasService';
import { obtenerUsuarioActual } from "../services_api/authService";
import '../styles/SupervisorObraView.css';

export default function SupervisorObraView({ articulos: articulosProp = null, obras: obrasProp = null, cardex: cardexProp = null, }) {
    const usuarioActual = obtenerUsuarioActual();
    const [articulos, setArticulos] = useState(articulosProp || []);
    const [obras, setObras] = useState(obrasProp || []);
    const [cardex, setCardex] = useState(cardexProp || []);
    const [selectedObraId, setSelectedObraId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [firmandoDoc, setFirmandoDoc] = useState(null);
    const [firmasGuardadas, setFirmasGuardadas] = useState({});

    useEffect(() => {
        if (articulosProp && obrasProp && cardexProp) {
            setArticulos(articulosProp);
            setObras(obrasProp);
            setCardex(cardexProp);
            if (obrasProp.length > 0 && !selectedObraId) {
                setSelectedObraId(String(obrasProp[0].id_obra || obrasProp[0].id));
            }
            return;
        }

        Promise.all([
            obtenerArticulos().catch(() => ({ data: [] })), 
            obtenerObras(),
            obtenerCardex().catch(() => []),
        ]).then(([resArt, dataObras, dataCardex]) => {
            const listaArt = resArt?.data || [];
            const listaObras = Array.isArray(dataObras) ? dataObras : [];
            const listaCardex = Array.isArray(dataCardex) ? dataCardex : [];
            setArticulos(listaArt);
            setObras(listaObras);
            setCardex(listaCardex);
            if (listaObras.length > 0 && !selectedObraId) {
                setSelectedObraId(String(listaObras[0].id_obra || listaObras[0].id));
            }
        }).catch(() => {});
    }, [articulosProp, obrasProp, cardexProp]);

    const obraActual = 
        obras.find((o) => String(o.id_obra || o.id) === String(selectedObraId)) || obras[0] || null;

    // Filtra los despachos y devoluciones únicamente de la obra asignada al supervisor.
    const despachosRecibidos = obraActual ? cardex.filter((m) => {
        const tipo = (m.tipo_movimiento || '').toLowerCase();
        if (tipo.includes('registro de obra') || tipo.includes('modificación de obra')) return false;
        const coincideId = obraActual.id_obra && m.id_obra && Number(m.id_obra) === Number(obraActual.id_obra);
        const destino = (m.obra_destino || '').toLowerCase();
        const coincideTexto =
            (tipo.includes('salida') || tipo.includes('devoluci') || Number(m.cantidad) < 0) &&
            (destino.includes((obraActual.nombre || '').toLowerCase()) ||
                destino.includes(`obra #${obraActual.id_obra}`));
        return coincideId || coincideTexto;
    }) : [];

    const articulosFiltrados = articulos.filter((a) => {
        const q = searchTerm.toLowerCase();
        const codigo = String(a.codigo_barra || a.codigo_interno || '').toLowerCase();
        const categoria = (a.categoria_nombre || a.categoria || '').toLowerCase();
        return a.nombre?.toLowerCase().includes(q) || codigo.includes(q) || categoria.includes(q);
    });

    const handleConfirmarFirma = ({ firmaUrl, fecha }) => {
        if (!firmandoDoc) return;
        const idMov = firmandoDoc.id_movimiento || firmandoDoc.id_movimiento_articulo;
        setFirmasGuardadas((prev) => ({
            ...prev,
            [idMov]: {
                firmado: true,
                fecha,
                firmaUrl,
                supervisor: usuarioActual?.nombre || 'Supervisor de Terreno',
            },
        }));
        setFirmandoDoc(null);
    };

    return(
        <div className="supervisor-container">
            <div className="supervisor-header">
                <div>
                    <h1 className="supervisor-title">Portal de Supervisión en Terreno</h1>
                    <p className="supervisor-subtitle">
                        Consulta de stock disponible en bodega, seguimiento de envíos a tus obras asignadas y firma de recepción
                    </p>
               </div>

               <div className="supervisor-badge-role">
                    <Lock size={14} color="#7c3aed" />
                    <span>Supervisión: Solo muestra las obras asignadas a tu cargo</span>
               </div>
            </div>

            <div className="supervisor-selector-bar">
                <div className="supervisor-faena-info">
                    <div className="supervisor-faena-icon">
                        <Building2 size={22} />
                    </div>
                    <div>
                        <div className="supervisor-faena-tag">OBRA ASIGNADA SELECCIONADA</div>
                        <div className="supervisor-faena-name">
                            {obraActual ? (
                                <>
                                    {obraActual.nombre}{' '}
                                    <span className="supervisor-faena-client">
                                        {obraActual.cliente || obraActual.tecnico_asociado}
                                    </span>
                                </>
                            ) : (
                                'Sin obras asignadas a tu cargo'
                            )}
                        </div>
                    </div>
                </div>

                <div className="supervisor-change-faena">
                    <span className="supervisor-change-label">Cambiar Obra:</span>
                    <select value={selectedObraId} onChange={(e) => setSelectedObraId(e.target.value)} className="supervisor-select" disabled={obras.length === 0}>
                        {obras.length === 0 ? (
                            <option value="">No tienes obras asignadas todavía</option>
                        ) : (
                            obras.map((o) => {
                                const idVal = o.id_obra || o.id;
                                return (
                                    <option key={idVal} value={idVal}>
                                        {o.nombre || `Obra #${idVal}`} ({o.ubicacion || o.estado || 'En proceso'})
                                    </option>
                                );
                            })
                        )}
                    </select>
                </div>
            </div>

            <div className="supervisor-grid-2cols">
                <div className="supervisor-col-card">
                    <div className="supervisor-col-title">
                        <Boxes size={18} color="#116530" />
                        <span>Materiales Disponibles en Bodega Central</span>
                    </div>

                    <div className="supervisor-search-box">
                        <Search size={16} color="#64748b" />
                        <input
                            type="text"
                            placeholder="Buscar gas, válvula, cobre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="supervisor-search-input"
                        />
                    </div>

                    <div className="supervisor-items-scroll">
                        {articulosFiltrados.length === 0 ? (
                            <div className="supervisor-empty-state">
                                No se encontraron materiales en el catálogo con ese filtro.
                            </div>
                        ) : (
                            articulosFiltrados.map((art) => {
                                const esCritico = Number(art.stock_disponible) <= Number(art.stock_minimo);
                                return (
                                    <div key={art.id_articulo} className="supervisor-item-row">
                                        <div>
                                            <div className="supervisor-item-name">{art.nombre}</div>
                                            <div className="supervisor-item-sub">
                                                {art.codigo_barra || art.codigo_interno}{' '}
                                                {art.categoria_nombre || art.categoria}
                                            </div>
                                        </div>

                                        <div className="supervisor-item-right">
                                            <div className={`supervisor-item-qty ${esCritico ? 'critico' : ''}`}>
                                                {art.stock_disponible} {art.unidad_nombre || art.unidad_medida || 'un'}
                                            </div>
                                            <span className={`supervisor-item-badge ${esCritico ? 'critico' : ''}`}>
                                                {esCritico ? 'Stock Bajo' : 'Disponible'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="supervisor-col-card">
                    <div className="supervisor-col-title">
                        <FileCheck size={18} color="#116530" />
                        <span>
                            {obraActual
                                ? `Materiales Enviados y Devueltos (${obraActual.nombre})`
                                : 'Materiales de la Obra'
                            }
                        </span>
                    </div>

                    <div className="supervisor-items-scroll">
                        {!obraActual ? (
                            <div className="supervisor-empty-state">
                                Aún no tienes obras asignadas. Puedes registrar una en la sección Gestión de Obras.
                            </div>
                        ) : despachosRecibidos.length === 0 ? (
                            <div className="supervisor-empty-state">
                                Todavía no hay despachos registrados para esta obra.
                            </div>
                        ) : (
                            despachosRecibidos.map((item, idx) => {
                                const idMov = item.id_movimiento || item.id_movimiento_articulo || idx;
                                const firma = firmasGuardadas[idMov];
                                const esDevolucion = (item.tipo_movimiento || '').toLowerCase().includes('devoluci');
                                return (
                                    <div key={idMov} className="supervisor-item-row">
                                        <div>
                                            <div className="supervisor-item-name">{item.articulo_nombre}</div>
                                            <div className="supervisor-item-sub">
                                                {item.documento_respaldo || item.motivo} | {item.fecha_hora}
                                            </div>
                                        </div>

                                        <div className="supervisor-item-right">
                                            <div className="supervisor-dispatch-qty">
                                                {esDevolucion ? '+' : ''}
                                                {Math.abs(item.cantidad)} {item.unidad_medida || 'un'}
                                            </div>
                                            {esDevolucion ? (
                                                <div className="supervisor-signed-tag">
                                                    <span>Devuelto a Bodega</span>
                                                </div>
                                            ) : firma ? (
                                                <div className="supervisor-signed-tag">
                                                    <CheckCircle size={13} />
                                                    <span>
                                                        Recibido: {firma.supervisor} ({firma.fecha})
                                                    </span>
                                                </div>
                                            ) : (
                                                <button type="button" onClick={() => setFirmandoDoc(item)} className="supervisor-btn-sign">
                                                    <PenTool size={12} />
                                                    <span>Firmar Recepción</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {firmandoDoc && obraActual && (
                <FirmaTablet
                    documento={firmandoDoc.documento_respaldo || firmandoDoc.id_movimiento}
                    titulo={`Recepción Conforme en ${obraActual.nombre}`}
                    onConfirmarFirma={handleConfirmarFirma}
                    onCancelar={() => setFirmandoDoc(null)}
                />
            )}
        </div>
    );
}
