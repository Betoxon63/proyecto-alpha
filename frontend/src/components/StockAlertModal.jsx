/**
 * @file StockAlertModal.jsx
 * @description Modal preventivo para la visualización de alertas de insumos con stock crítico (HU-03).
 * Identifica artículos cuyas existencias han alcanzado o perforado su umbral de stock mínimo (`stock_disponible <= stock_minimo`).
 * 
 * BIBLIOTECAS UTILIZADAS:
 * - react: Componente funcional React.
 * - lucide-react: Iconos vectoriales `AlertTriangle`, `X`, `Boxes`, `ArrowRight` y `ShieldAlert`.
 * 
 * REGLAS DE NEGOCIO IMPLEMENTADAS:
 * - HU-03: Alertas visuales inmediatas para evitar quiebres operacionales de inventario en faenas de refrigeración.
 * - Enlace directo a la terminal de reposición de bodega.
 */

import React from 'react';
import { AlertTriangle, X, Boxes, ArrowRight, ShieldAlert } from 'lucide-react';
import '../styles/StockAlertModal.css';

/**
 * Modal de alertas de stock crítico.
 * 
 * @component
 * @param {Object} props Propiedades del componente.
 * @param {boolean} props.isOpen Estado de visibilidad del modal.
 * @param {Function} props.onClose Callback ejecutado al cerrar el modal.
 * @param {Array<Object>} [props.articulos] Lista completa de artículos para evaluar stock crítico.
 * @param {Function} [props.onNavigateToBodega] Callback para redirigir directamente al terminal de bodega.
 */
export default function StockAlertModal({ isOpen, onClose, articulos = [], onNavigateToBodega }) {
  if (!isOpen) return null;

  // Filtrado de artículos en condición crítica de inventario
  const criticos = articulos.filter(a => Number(a.stock_disponible) <= Number(a.stock_minimo));

  return (
    <div className="stock-modal-backdrop">
      <div className="stock-modal-container">
        {/* Header Modal */}
        <div className="stock-modal-header">
          <div className="stock-modal-header-info">
            <div className="stock-modal-icon-badge">
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className="stock-modal-title">
                Alerta Preventiva de Inventario (HU-03)
              </div>
              <div className="stock-modal-subtitle">
                {criticos.length} insumos han alcanzado o perforado su umbral de stock mínimo
              </div>
            </div>
          </div>

          <button onClick={onClose} className="stock-modal-btn-close">
            <X size={20} />
          </button>
        </div>

        {/* Lista de Insumos Críticos */}
        <div className="stock-modal-body">
          <p className="stock-modal-description">
            El sistema ha detectado existencias bajo el límite de reposición operacional para faenas activas de refrigeración:
          </p>

          {criticos.length === 0 ? (
            <div className="stock-modal-empty">
              ✅ No hay artículos con stock crítico en este momento.
            </div>
          ) : (
            <div className="stock-modal-list">
              {criticos.map(art => (
                <div key={art.id_articulo} className="stock-modal-item">
                  <div>
                    <div className="stock-modal-item-name">
                      {art.nombre}
                    </div>
                    <div className="stock-modal-item-code">
                      Cód: {art.codigo_interno || art.codigo_barra} · Ubicación: {art.ubicacion || 'Bodega'}
                    </div>
                  </div>

                  <div className="stock-modal-item-stock">
                    <div className="stock-modal-stock-qty">
                      {art.stock_disponible} {art.unidad_medida || 'un'}
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

        {/* Footer Modal */}
        <div className="stock-modal-footer">
          <div className="stock-modal-notice">
            <ShieldAlert size={14} color="#f59e0b" />
            <span>Notificación preventiva generada automáticamente</span>
          </div>

          <div className="stock-modal-actions">
            <button onClick={onClose} className="stock-modal-btn-secondary">
              Cerrar
            </button>
            {onNavigateToBodega && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToBodega();
                }}
                className="stock-modal-btn-primary"
              >
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
