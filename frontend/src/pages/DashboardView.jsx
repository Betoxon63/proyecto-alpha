import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Boxes, TrendingUp, AlertTriangle, Truck, ArrowUpRight, ArrowDownLeft, Calendar, Building2, Activity, } from 'lucide-react';
import { obtenerArticulos, obtenerRoles } from "../services_api/inventarioService";
import { obtenerCardex, obtenerObras } from "../services_api/obrasService";
import '../styles/DashboardView.css'

export default function DashboardView({articulos: articulosProp = null, cardex: cardexProp = null, obras: obrasProp = null, onNavigateTo,}) {
    const [articulos, setArticulos] = useState(articulosProp || []);
    const [cardex, setCardex] = useState(cardexProp || []);
    const [obras, setObras] = useState(obrasProp || []);
    const navigate = useNavigate();

    useEffect(() => {
        if (articulosProp && cardexProp && obrasProp) {
            setArticulos(articulosProp);
            setCardex(cardexProp);
            setObras(obrasProp);
            return;
        }

        Promise.all([obtenerArticulos(), obtenerCardex(), obtenerObras()])
            .then(([resArt, dataCardex, dataObras]) => {
                setArticulos(resArt?.data || []);
                setCardex(Array.isArray(dataCardex) ? dataCardex : []);
                setObras(Array.isArray(dataObras) ? dataObras : []);
            })
            .catch(() => {});
    }, [articulosProp, cardexProp, obrasProp]);

    const stockCriticoCount = articulos.filter((a) => Number(a.stock_disponible) <= Number(a.stock_minimo)).length;
    const totalArticulos = articulos.length;
    const totalStockUnidades = articulos.reduce((acc, a) => acc + Number(a.stock_disponible || 0), 0);
    const totalValorizado = articulos.reduce((acc, a) => acc + Number(a.stock_disponible || 0) * Number(a.precio || 0), 0);

    const irASeccion = (destino) => {
        if (onNavigateTo) {onNavigateTo(destino); return;}
        if (destino === 'cardex') navigate('/cardex');
        if (destino === 'obras') navigate('/obras/despachos');
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Panel de Control Logístico (Dashboard)</h1>
                    <p className="dashboard-subtitle">
                        Visión global del inventario, faenas agroindustriales y auditoría de bodega.
                    </p>
                </div>

                <div className="dashboard-badge-date">
                    <Calendar size={15} color="#1b5e20" />
                    <span>Período Operativo Activo * FYAG SpA</span>
                </div>
            </div>

            <div className="dashboard-kpi-grid">
                <div className="dashboard-kpi-card">
                    <div className="dashboard-kpi-header">
                        <span className="dashboard-kpi-label">CATÁLOGO ACTIVO</span>
                        <div className="dashboard-kpi-icon-box dashboard-kpi-icon-green">
                            <Boxes size={18} color="#1b5e20" />
                        </div>
                    </div>

                    <div className="dashboard-kpi-value">
                        {totalArticulos} <span className="dashboard-kpi-value-unit">ítems</span>
                    </div>
                    <div className="dashboard-kpi-subtext-green">
                        {totalStockUnidades} unidades en existencias
                    </div>
                </div>

                <div className="dashboard-kpi-card">
                    <div className="dashboard-kpi-header">
                        <span className="dashboard-kpi-label">CAPITAL EN BODEGA</span>
                        <div className="dashboard-kpi-icon-box dashboard-kpi-icon-green">
                            <TrendingUp size={18} color="#1b5e20" />
                        </div>
                    </div>
                    <div className="dashboard-kpi-value">
                        ${(totalValorizado / 1000000).toFixed(2)}M
                    </div>
                    <div className="dashboard-kpi-subtext-muted">Valor neto inventariado</div>
                </div>

                <div className="dashboard-kpi-card-warning">
                    <div className="dashboard-kpi-header">
                        <span className="dashboard-kpi-label-warning">ALERTAS DE STOCK</span>
                        <div className="dashboard-kpi-icon-box dashboard-kpi-icon-orange">
                            <AlertTriangle size={18} color="#ea580c" />
                        </div>
                    </div>
                    <div className="dashboard-kpi-value-warning">
                        {stockCriticoCount} <span className="dashboard-kpi-value-unit">críticos</span>
                    </div>
                    <div className="dashboard-kpi-subtext-warning">Bajo umbral mínimo requerido</div>
                </div>

                <div className="dashboard-kpi-card">
                    <div className="dashboard-kpi-header">
                        <span className="dashboard-kpi-label">OBRAS EN EJCUCIÓN</span>
                        <div className="dashboard-kpi-icon-box dashboard-kpi-icon-blue">
                            <Truck size={18} color="#2563eb" />
                        </div>
                    </div>

                    <div className="dashboard-kpi-value">
                        {obras.length} <span className="dashboard-kpi-value-unit">faenas</span>
                    </div>
                    <div className="dashboard-kpi-subtext-blue">Región de Ñuble y Biobío</div>
                </div>
            </div>

            <div className="dashboard-sections-grid">
                <div className="dashboard-card-section">
                    <div className="dashboard-section-header">
                        <div className="dashboard-section-title">
                            <Activity size={18} color="#1b5e20" />
                            <span>Flujo Reciente de Movimientos</span>
                        </div>
                        <button type="button" onClick={() => irASeccion('cardex')} className="dashboard-link-btn">Ver Auditoría Completa</button>
                    </div>

                    <div className="dashboard-flow-list">
                        {cardex.length === 0 ? (
                            <div className="dashboard-empty-msg">Aún no se registran movimientos en el Cardex.</div>
                        ) : (
                            cardex.slice(0, 5).map((mov, idx) => {
                                const tipo = (mov.tipo_movimiento || '').toLowerCase();
                                const isMerma = tipo.includes('merma');
                                const isEntrada = tipo.includes('entrada') || tipo.includes('ingreso') || mov.cantidad > 0;
                                const modClase = isMerma ? 'merma' : isEntrada ? 'entrada' : 'salida';

                                return (
                                    <div key={mov.id_movimiento_articulo || mov.id_movimiento || idx} className="dashboard-flow-item">
                                        <div className="dashboard-flow-info">
                                            <div className={`dashboard-flow.ico ${modClase}`}>
                                                {isMerma ? (
                                                    <AlertTriangle size={16} />
                                                ) : isEntrada ? (
                                                    <ArrowDownLeft size={16} />
                                                ) : (
                                                    <ArrowUpRight size={16} />
                                                )}
                                            </div>
                                            <div>
                                                <div className="dashboard-flow-name">{mov.articulo_nombre}</div>
                                                <div className="dashboard-flow-sub">
                                                    {mov.obra_destino || 'Bodega Central'} * Resp:{' '}
                                                    {mov.usuario_responsable || 'Operador'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="dashboard-flow-right">
                                            <div className={`dashboard-flow-qty ${modClase}`}>
                                                {mov.cantidad > 0 ? `+${mov.cantidad}` : mov.cantidad}{' '}
                                                {mov.unidad_medida || 'un'}
                                            </div>
                                            <div className="dashboard-flow-time">
                                                {mov.fecha_hora || mov.fecha}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="dashboard-card-section">
                    <div className="dashboard-section-header">
                        <div className="dashboard-section-title">
                            <Building2 size={18} color="#1b5e20" />
                            <span>Obras Activas (Imputación Costos)</span>
                        </div>
                        <button type="button" onClick={() => irASeccion('obras')} className="dashboard-link-btn">Ver Todas</button>
                    </div>

                    <div className="dashboard-flow-list">
                        {obras.length === 0 ? (
                            <div className="dashboard-empty-msg">No hay obras activas registradas en este momento.</div>
                        ) : (
                            obras.map((o) => {
                                const idObra = o.id_obra || o.id;
                                return (
                                    <div key={idObra} className="dashboard-obra-card">
                                        <div className="dashboard-obra-top">
                                            <div>
                                                <div className="dashboard-obra-name">{o.nombre || `Faena #${idObra}`}</div>
                                                <div className="dashboard-obra-detail">{o.cliente || o.tecnico_asociado} * {o.ubicacion || o.estado}</div>
                                            </div>
                                            <span className="dashboard-badge-ongoing">{o.estado || 'En Curso'}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}