/**
 * @file SupervisorObraView.jsx
 * @description Portal de supervisión en faena para seguimiento de existencias y firma digital de recepción (HU-09 / HU-10).
 * 
 * BIBLIOTECAS UTILIZADAS:
 * - react: Hooks useState.
 * - lucide-react: Iconos vectoriales `Building2`, `Boxes`, `Search`, `MapPin`, `CheckCircle`, `PenTool`, `FileCheck`, `Calendar`, `UserCheck`, `Lock`, `ArrowRight`, `AlertCircle`.
 */

import React, { useState } from 'react';
import { 
  Building2, 
  Boxes, 
  Search, 
  MapPin, 
  CheckCircle, 
  PenTool, 
  FileCheck, 
  Calendar, 
  UserCheck, 
  Lock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import '../styles/SupervisorObraView.css';

export default function SupervisorObraView({ articulos = [], obras = [], cardex = [] }) {
  const [selectedObraId, setSelectedObraId] = useState(obras[0]?.id || 1);
  const [searchTerm, setSearchTerm] = useState('');
  const [firmandoDoc, setFirmandoDoc] = useState(null);
  const [firmasGuardadas, setFirmasGuardadas] = useState({});

  const obraActual = obras.find(o => o.id.toString() === selectedObraId.toString()) || obras[0] || { nombre: 'Faena Central', cliente: 'Cliente Principal' };

  // Despachos asignados a esta obra
  const despachosRecibidos = cardex.filter(m => 
    m.tipo_movimiento === 'Salida' && m.obra_destino?.toLowerCase().includes(obraActual.nombre?.toLowerCase())
  );

  // Filtro de consulta de catálogo disponible
  const articulosFiltrados = articulos.filter(a =>
    a.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.codigo_interno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFirmarRecepcion = (docId) => {
    setFirmasGuardadas(prev => ({
      ...prev,
      [docId]: {
        firmado: true,
        fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        supervisor: 'Javier Soto'
      }
    }));
    setFirmandoDoc(null);
  };

  return (
    <div className="supervisor-container">
      
      {/* Header Supervisor de Terreno */}
      <div className="supervisor-header">
        <div>
          <h1 className="supervisor-title">
            Portal de Supervisión en Faena (HU-09 / HU-10)
          </h1>
          <p className="supervisor-subtitle">
            Consulta de stock disponible en bodega central, seguimiento de insumos consumidos por faena y firma conforme en tablet
          </p>
        </div>

        {/* Badge Informativo de Rol */}
        <div className="supervisor-badge-role">
          <Lock size={14} color="#7c3aed" />
          <span>Perfil Terreno: Consulta de insumos y firma de recepción conforme</span>
        </div>
      </div>

      {/* Selector de Faena Asignada al Supervisor */}
      <div className="supervisor-selector-bar">
        <div className="supervisor-faena-info">
          <div className="supervisor-faena-icon">
            <Building2 size={22} />
          </div>
          <div>
            <div className="supervisor-faena-tag">
              FAENA AGROINDUSTRIAL SELECCIONADA
            </div>
            <div className="supervisor-faena-name">
              {obraActual.nombre} · <span className="supervisor-faena-client">{obraActual.cliente}</span>
            </div>
          </div>
        </div>

        <div className="supervisor-change-faena">
          <span className="supervisor-change-label">Cambiar Faena:</span>
          <select
            value={selectedObraId}
            onChange={(e) => setSelectedObraId(e.target.value)}
            className="supervisor-select"
          >
            {obras.map(o => (
              <option key={o.id} value={o.id}>{o.nombre} ({o.ubicacion})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: 2 Columnas de Supervisión */}
      <div className="supervisor-grid-2cols">
        
        {/* COLUMNA 1: CONSULTAR DISPONIBILIDAD DE MATERIALES EN BODEGA (HU-09) */}
        <div className="supervisor-col-card">
          <div className="supervisor-col-title">
            <Boxes size={18} color="#1b5e20" />
            <span>Disponibilidad en Bodega Central (HU-09)</span>
          </div>

          {/* Buscador de Insumos */}
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

          {/* Lista de Existencias */}
          <div className="supervisor-items-scroll">
            {articulosFiltrados.map(art => {
              const esCritico = art.stock_disponible <= art.stock_minimo;
              return (
                <div key={art.id_articulo} className="supervisor-item-row">
                  <div>
                    <div className="supervisor-item-name">{art.nombre}</div>
                    <div className="supervisor-item-sub">
                      {art.codigo_interno || art.codigo_barra} · {art.categoria}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className={`supervisor-item-qty ${esCritico ? 'critico' : ''}`}>
                      {art.stock_disponible} {art.unidad_medida}
                    </div>
                    <span className={`supervisor-item-badge ${esCritico ? 'critico' : ''}`}>
                      {esCritico ? 'Stock Bajo' : 'Disponible'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMNA 2: DESPACHOS Y FIRMA DE RECEPCIÓN (HU-10) */}
        <div className="supervisor-col-card">
          <div className="supervisor-col-title">
            <FileCheck size={18} color="#1b5e20" />
            <span>Insumos Despachados a Faena ({obraActual.nombre})</span>
          </div>

          <div className="supervisor-items-scroll">
            {despachosRecibidos.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No hay despachos registrados para esta faena.
              </div>
            ) : (
              despachosRecibidos.map((item, idx) => {
                const firma = firmasGuardadas[item.id_movimiento];
                return (
                  <div key={item.id_movimiento || idx} className="supervisor-item-row">
                    <div>
                      <div className="supervisor-item-name">{item.articulo_nombre}</div>
                      <div className="supervisor-item-sub">
                        Guía: {item.documento_respaldo} · {item.fecha_hora}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                        {Math.abs(item.cantidad)} {item.unidad_medida}
                      </div>
                      {firma ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#15803d', fontWeight: '700', marginTop: '4px' }}>
                          <CheckCircle size={13} />
                          <span>Firma Conforme: {firma.supervisor}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setFirmandoDoc(item)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #1b5e20',
                            backgroundColor: '#f0fdf4',
                            color: '#1b5e20',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            marginTop: '4px'
                          }}
                        >
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

      {/* MODAL SIMULADOR DE FIRMA DIGITAL EN TABLET (BPMN 4.4.1) */}
      {firmandoDoc && (
        <div className="supervisor-modal-overlay">
          <div className="supervisor-modal-card">
            <h3 className="supervisor-modal-title">
              Firma Digital de Recepción Conforme
            </h3>
            <p className="supervisor-modal-desc">
              Confirmación de recepción de <strong>{Math.abs(firmandoDoc.cantidad)} {firmandoDoc.unidad_medida}</strong> de {firmandoDoc.articulo_nombre} en la faena {obraActual.nombre}.
            </p>

            {/* Recuadro táctil de firma */}
            <div className="supervisor-sign-pad">
              <PenTool size={24} color="#1b5e20" style={{ marginBottom: '6px' }} />
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>Javier Soto - Supervisor de Terreno</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Trazo digital validado por pantalla táctil</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setFirmandoDoc(null)}
                className="supervisor-btn-cancel"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleFirmarRecepcion(firmandoDoc.id_movimiento)}
                className="supervisor-btn-confirm"
              >
                <CheckCircle size={15} />
                <span>Confirmar y Guardar Firma</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
