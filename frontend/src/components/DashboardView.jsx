/**
 * @file DashboardView.jsx
 * @description Panel de control logístico ejecutivo (KPIs, existencias valorizadas, alertas y faenas activas).
 * 
 * BIBLIOTECAS UTILIZADAS:
 * - react: Componente funcional.
 * - lucide-react: Iconos vectoriales `Boxes`, `TrendingUp`, `AlertTriangle`, `Truck`, `ArrowUpRight`, `ArrowDownLeft`, `Calendar`, `Building2`, `Activity`.
 */

import React from 'react';
import { 
  Boxes, 
  TrendingUp, 
  AlertTriangle, 
  Truck, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Building2, 
  Activity 
} from 'lucide-react';
import '../styles/DashboardView.css';

export default function DashboardView({ articulos = [], cardex = [], obras = [], onNavigateTo }) {
  const stockCriticoCount = articulos.filter(a => a.stock_disponible <= a.stock_minimo).length;
  const totalArticulos = articulos.length;
  const totalStockUnidades = articulos.reduce((acc, a) => acc + a.stock_disponible, 0);
  const totalValorizado = articulos.reduce((acc, a) => acc + (a.stock_disponible * a.precio), 0);

  return (
    <div className="dashboard-container">
      {/* Header Resumen */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            Panel de Control Logístico (Dashboard)
          </h1>
          <p className="dashboard-subtitle">
            Visión global del inventario, faenas agroindustriales y auditoría de bodega en tiempo real
          </p>
        </div>

        <div className="dashboard-badge-date">
          <Calendar size={15} color="#1b5e20" />
          <span>Octubre 2026 · Período Activo</span>
        </div>
      </div>

      {/* 4 CARDS DE MÉTRICAS CLAVE (KPIs) */}
      <div className="dashboard-kpi-grid">
        
        {/* KPI 1: Insumos Totales */}
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

        {/* KPI 2: Valorización Total Bodega */}
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-header">
            <span className="dashboard-kpi-label">CAPITAL EN BODEGA</span>
            <div className="dashboard-kpi-icon-box dashboard-kpi-icon-green">
              <TrendingUp size={18} color="#1b5e20" />
            </div>
          </div>
          <div className="dashboard-kpi-value">
            ${(totalValorizado / 1000000).toFixed(1)}M
          </div>
          <div className="dashboard-kpi-subtext-muted">
            Valor neto inventariado
          </div>
        </div>

        {/* KPI 3: Stock Crítico Alertas */}
        <div className="dashboard-kpi-card-warning">
          <div className="dashboard-kpi-header">
            <span className="dashboard-kpi-label-warning">ALERTAS DE STOCK (HU-03)</span>
            <div className="dashboard-kpi-icon-box dashboard-kpi-icon-orange">
              <AlertTriangle size={18} color="#ea580c" />
            </div>
          </div>
          <div className="dashboard-kpi-value-warning">
            {stockCriticoCount} <span className="dashboard-kpi-value-unit">críticos</span>
          </div>
          <div className="dashboard-kpi-subtext-warning">
            Bajo umbral mínimo requerido
          </div>
        </div>

        {/* KPI 4: Obras Activas */}
        <div className="dashboard-kpi-card">
          <div className="dashboard-kpi-header">
            <span className="dashboard-kpi-label">OBRAS EN EJECUCIÓN</span>
            <div className="dashboard-kpi-icon-box dashboard-kpi-icon-blue">
              <Truck size={18} color="#2563eb" />
            </div>
          </div>
          <div className="dashboard-kpi-value">
            {obras.length} <span className="dashboard-kpi-value-unit">faenas</span>
          </div>
          <div className="dashboard-kpi-subtext-blue">
            Región de Ñuble y Biobío
          </div>
        </div>

      </div>

      {/* SECCIÓN INTERMEDIA: ACTIVIDAD RECIENTE & OBRAS */}
      <div className="dashboard-sections-grid">
        
        {/* Card: Últimos Movimientos Cardex */}
        <div className="dashboard-card-section">
          <div className="dashboard-section-header">
            <div className="dashboard-section-title">
              <Activity size={18} color="#1b5e20" />
              <span>Flujo Reciente de Movimientos (Cardex)</span>
            </div>
            {onNavigateTo && (
              <button onClick={() => onNavigateTo('cardex')} className="dashboard-link-btn">
                Ver Auditoría Completa →
              </button>
            )}
          </div>

          <div className="dashboard-flow-list">
            {cardex.slice(0, 4).map(mov => {
              const isEntrada = mov.tipo_movimiento === 'Entrada';
              const isMerma = mov.tipo_movimiento === 'Merma';
              const iconColor = isEntrada ? '#15803d' : (isMerma ? '#c2410c' : '#1d4ed8');
              const iconBg = isEntrada ? '#dcfce7' : (isMerma ? '#ffedd5' : '#dbeafe');

              return (
                <div key={mov.id_movimiento} className="dashboard-flow-item">
                  <div className="dashboard-flow-info">
                    <div className="dashboard-flow-icon" style={{ backgroundColor: iconBg, color: iconColor }}>
                      {isEntrada && <ArrowDownLeft size={16} />}
                      {mov.tipo_movimiento === 'Salida' && <ArrowUpRight size={16} />}
                      {isMerma && <AlertTriangle size={16} />}
                    </div>
                    <div>
                      <div className="dashboard-flow-name">{mov.articulo_nombre}</div>
                      <div className="dashboard-flow-sub">{mov.obra_destino} · Resp: {mov.usuario_responsable}</div>
                    </div>
                  </div>

                  <div className="dashboard-flow-right">
                    <div className="dashboard-flow-qty" style={{ color: iconColor }}>
                      {mov.cantidad > 0 ? `+${mov.cantidad}` : mov.cantidad} {mov.unidad_medida}
                    </div>
                    <div className="dashboard-flow-time">{mov.fecha_hora?.split(' ')[1] || mov.fecha_hora}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card: Proyectos & Obras Activas */}
        <div className="dashboard-card-section">
          <div className="dashboard-section-header">
            <div className="dashboard-section-title">
              <Building2 size={18} color="#1b5e20" />
              <span>Obras Activas (Imputación Costos)</span>
            </div>
            {onNavigateTo && (
              <button onClick={() => onNavigateTo('obras')} className="dashboard-link-btn">
                Ver Todas →
              </button>
            )}
          </div>

          <div className="dashboard-flow-list">
            {obras.map(o => (
              <div key={o.id} className="dashboard-obra-card">
                <div className="dashboard-obra-top">
                  <div>
                    <div className="dashboard-obra-name">{o.nombre}</div>
                    <div className="dashboard-obra-detail">{o.cliente} · {o.ubicacion}</div>
                  </div>
                  <span className="dashboard-badge-ongoing">
                    En Curso
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
