/**
 * @file TabletBodegaView.jsx
 * @description Terminal táctil optimizada para celular / tablet en Bodega (Captura 5.3.1, PWA).
 * Proporciona un teclado numérico táctil, selector de insumo, selección de obra y registro de mermas con justificación obligatoria.
 * 
 * BIBLIOTECAS UTILIZADAS:
 * - react: Hook useState para control reactivo de insumo seleccionado, cantidades y tipos de movimiento.
 * - lucide-react: Iconos `Building2`, `Minus`, `Plus`, `Search`, `Scan`, `CheckCircle`, `AlertCircle`, `X`, `ChevronDown`, `FileText`, `Truck`, `ShieldAlert`, `ArrowRight`, `Info`.
 * 
 * REGLAS DE NEGOCIO:
 * - Previene errores 409 bloqueando el envío si la cantidad solicitada supera el stock disponible en bodega.
 * - Registro obligatorio de causa o motivo en caso de mermas o pérdidas en faena.
 */

import React, { useState } from 'react';
import { 
  Building2, 
  Minus, 
  Plus, 
  Search, 
  Scan, 
  CheckCircle, 
  AlertCircle, 
  X, 
  ChevronDown, 
  FileText, 
  Truck, 
  ShieldAlert, 
  ArrowRight, 
  Info 
} from 'lucide-react';
import '../styles/TabletBodegaView.css';

export default function TabletBodegaView({ 
  articulos, 
  obras, 
  currentUser = { nombre: 'Carlos Muñoz', iniciales: 'CM', rol: 'BODEGA · REFRIGERACIÓN' }, 
  onSaveMovimiento,
  onSwitchToDesktop
}) {
  const [tipoMovimiento, setTipoMovimiento] = useState('Merma Justificada'); // 'Salida a Obra' | 'Merma Justificada'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticulo, setSelectedArticulo] = useState(articulos[0] || null); // Tubo de cobre 1/2" por defecto como en captura
  const [cantidad, setCantidad] = useState(2);
  const [selectedObraId, setSelectedObraId] = useState('');
  const [justificacion, setJustificacion] = useState('Tramo de tubo aplastado durante la descarga. No es apto para instalación.');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Filtrado de insumos para la barra de búsqueda
  const filteredArticulos = articulos.filter(item => 
    item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.codigo_interno.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTipoChange = (nuevoTipo) => {
    setTipoMovimiento(nuevoTipo);
    if (nuevoTipo === 'Merma Justificada') {
      setSelectedObraId('');
    } else {
      if (obras.length > 0 && !selectedObraId) {
        setSelectedObraId(obras[0].id.toString());
      }
    }
  };

  const handleIncrement = () => {
    if (selectedArticulo && cantidad < selectedArticulo.stock_disponible) {
      setCantidad(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (cantidad > 1) {
      setCantidad(prev => prev - 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedArticulo) {
      alert("Selecciona un insumo para el movimiento.");
      return;
    }

    if (cantidad > selectedArticulo.stock_disponible) {
      alert(`Error 409: Conflicto de stock. Solo hay ${selectedArticulo.stock_disponible} unidades disponibles.`);
      return;
    }

    if (tipoMovimiento === 'Merma Justificada' && !justificacion.trim()) {
      alert("Debe ingresar la causa obligatoria del daño o pérdida.");
      return;
    }

    if (tipoMovimiento === 'Salida a Obra' && !selectedObraId) {
      alert("Debe seleccionar una obra de destino.");
      return;
    }

    const obraObj = obras.find(o => o.id.toString() === selectedObraId.toString());

    // Generar nuevo movimiento con regla Append-Only
    const nuevoMov = {
      id_movimiento: `MOV-${Math.floor(100000 + Math.random() * 900000)}`,
      fecha_hora: new Date().toISOString().replace('T', ' ').substring(0, 16),
      usuario_responsable: currentUser.nombre,
      cargo: "Bodeguero",
      articulo_nombre: selectedArticulo.nombre,
      articulo_codigo: selectedArticulo.codigo_interno,
      articulo_detalle: selectedArticulo.categoria,
      cantidad: -cantidad,
      unidad_medida: selectedArticulo.unidad_medida.includes('Metros') ? 'm' : (selectedArticulo.unidad_medida.includes('Cilindro') ? 'cil' : 'un'),
      tipo_movimiento: tipoMovimiento === 'Merma Justificada' ? 'Merma' : 'Salida',
      obra_destino: tipoMovimiento === 'Merma Justificada' ? 'Bodega Central' : (obraObj ? obraObj.nombre : 'Obra en Terreno'),
      documento_respaldo: tipoMovimiento === 'Merma Justificada' ? `MR-${Math.floor(100000 + Math.random() * 900000)}` : `GD-${Math.floor(100000 + Math.random() * 900000)}`,
      motivo: justificacion.trim() || `Despacho operativo a obra ${obraObj?.nombre}`
    };

    onSaveMovimiento(nuevoMov, selectedArticulo.id_articulo, cantidad);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);
  };

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      backgroundColor: '#ffffff',
      borderRadius: '24px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '840px',
      position: 'relative'
    }}>
      {/* Toast de confirmación Append-Only */}
      {showSuccessToast && (
        <div style={{
          position: 'absolute',
          top: '75px',
          left: '16px',
          right: '16px',
          backgroundColor: '#065f46',
          color: '#ffffff',
          padding: '14px 16px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 50,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <CheckCircle size={22} color="#a7f3d0" />
          <div style={{ fontSize: '13px', lineHeight: 1.3 }}>
            <strong>Movimiento Guardado con Éxito</strong>
            <p style={{ margin: 0, opacity: 0.9 }}>Registrado en Cardex Append-Only (PostgreSQL)</p>
          </div>
        </div>
      )}

      {/* HEADER DE ALTA FIDELIDAD - CAPTURA 5.3.1 */}
      <div style={{
        backgroundColor: '#1b5e20',
        color: '#ffffff',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #144918'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Botón menú hamburguesa con recuadro exacto a la captura */}
          <div 
            onClick={() => setMenuAbierto(prev => !prev)}
            title="Menú del sistema"
            style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            border: '1.5px solid rgba(255, 255, 255, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            backgroundColor: menuAbierto ? 'rgba(255,255,255,0.15)' : 'transparent'
          }}>
            <div style={{ width: '18px', height: '2px', backgroundColor: '#fff', borderRadius: '1px' }}></div>
            <div style={{ width: '18px', height: '2px', backgroundColor: '#fff', borderRadius: '1px' }}></div>
            <div style={{ width: '18px', height: '2px', backgroundColor: '#fff', borderRadius: '1px' }}></div>
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
              FYAG <span style={{ fontSize: '13px', fontWeight: '400', opacity: 0.85 }}>SpA</span>
            </div>
            <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.6px', color: '#86efac', marginTop: '2px' }}>
              BODEGA · REFRIGERACIÓN
            </div>
          </div>
        </div>

        {/* Badge Avatar del Operador "CM" en círculo blanco/grisáceo */}
        <div 
          onClick={() => setMenuAbierto(prev => !prev)}
          title={`Operador: ${currentUser.nombre}`}
          style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          backgroundColor: '#f1f5f9',
          color: '#0f172a',
          fontWeight: '800',
          fontSize: '13.5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          cursor: 'pointer'
        }}>
          {currentUser.iniciales}
        </div>
      </div>

      {/* Menú Desplegable Hamburguesa en Terminal Móvil */}
      {menuAbierto && (
        <div style={{
          backgroundColor: '#144918',
          borderBottom: '2px solid #0d3110',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#ffffff',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <div style={{ fontSize: '12px' }}>
            <span style={{ fontWeight: '700' }}>{currentUser.nombre}</span> · <span style={{ color: '#86efac' }}>{currentUser.rol}</span>
          </div>

          <button
            onClick={() => {
              setMenuAbierto(false);
              onSwitchToDesktop && onSwitchToDesktop();
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.3)',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            ← Portal Escritorio
          </button>
        </div>
      )}

      {/* CUERPO DEL FORMULARIO OPERATIVO TÁCTIL */}
      <div style={{ padding: '20px 20px 28px', flex: 1, overflowY: 'auto' }}>
        
        {/* Breadcrumb de navegación */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#64748b',
          fontSize: '11px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '6px'
        }}>
          <Building2 size={13} />
          <span>BODEGA CENTRAL / MOVIMIENTOS</span>
        </div>

        <h1 style={{
          fontSize: '26px',
          fontWeight: '800',
          color: '#0f172a',
          margin: '0 0 4px',
          letterSpacing: '-0.5px'
        }}>
          Registrar movimiento
        </h1>
        <p style={{
          fontSize: '13px',
          color: '#64748b',
          marginBottom: '20px'
        }}>
          Selecciona el tipo de salida y los insumos a rebajar.
        </p>

        {/* 1. SECCIÓN: TIPO DE MOVIMIENTO (Conmutador 5.3.1) */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13.5px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
            Tipo de movimiento
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleTipoChange('Salida a Obra')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 14px',
                borderRadius: '12px',
                border: tipoMovimiento === 'Salida a Obra' ? '2px solid #1b5e20' : '1px solid #e2e8f0',
                backgroundColor: tipoMovimiento === 'Salida a Obra' ? '#f0fdf4' : '#f8fafc',
                color: tipoMovimiento === 'Salida a Obra' ? '#1b5e20' : '#475569',
                fontWeight: '700',
                fontSize: '13.5px',
                transition: 'all 0.2s'
              }}
            >
              <Truck size={17} />
              <span>Salida a Obra</span>
            </button>

            <button
              type="button"
              onClick={() => handleTipoChange('Merma Justificada')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 14px',
                borderRadius: '12px',
                border: tipoMovimiento === 'Merma Justificada' ? '2px solid #1e293b' : '1px solid #e2e8f0',
                backgroundColor: tipoMovimiento === 'Merma Justificada' ? '#1e293b' : '#f8fafc',
                color: tipoMovimiento === 'Merma Justificada' ? '#ffffff' : '#475569',
                fontWeight: '700',
                fontSize: '13.5px',
                transition: 'all 0.2s'
              }}
            >
              <ShieldAlert size={17} color={tipoMovimiento === 'Merma Justificada' ? '#f87171' : 'currentColor'} />
              <span>Merma Justificada</span>
            </button>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', fontStyle: 'normal' }}>
            {tipoMovimiento === 'Merma Justificada' 
              ? 'Rebaja por daño o pérdida. Debes justificar la causa.' 
              : 'Despacho directo de materiales e insumos a cuadrillas en terreno.'}
          </div>
        </div>

        {/* 2. SECCIÓN: BUSCAR INSUMO */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
              Buscar insumo
            </label>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Código o descripción</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '10px 14px',
            gap: '10px'
          }}>
            <Search size={18} color="#94a3b8" />
            <input
              type="text"
              placeholder="Tubo de cobre, gas refrigerante..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSearchDropdownOpen(true);
              }}
              onFocus={() => setSearchDropdownOpen(true)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '13.5px',
                color: '#1e293b'
              }}
            />
            <Scan size={18} color="#94a3b8" style={{ cursor: 'pointer' }} title="Escanear Código de Barra" />
          </div>

          {/* Menú desplegable reactivo de búsqueda */}
          {searchDropdownOpen && searchTerm.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              marginTop: '4px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              zIndex: 30,
              maxHeight: '180px',
              overflowY: 'auto'
            }}>
              {filteredArticulos.map(art => (
                <div 
                  key={art.id_articulo}
                  onClick={() => {
                    setSelectedArticulo(art);
                    setSearchTerm('');
                    setSearchDropdownOpen(false);
                    setCantidad(1);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                >
                  <div>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{art.nombre}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{art.codigo_interno} · {art.categoria}</div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: art.stock_disponible <= art.stock_minimo ? '#dc2626' : '#16a34a' }}>
                    Stock: {art.stock_disponible}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. CARD DEL INSUMO SELECCIONADO Y CANTIDAD (Fiel a prototipo 5.3.1) */}
        {selectedArticulo && (
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '16px',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569'
                }}>
                  {/* Ícono de cubo/caja isométrica idéntico a la captura */}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    {selectedArticulo.nombre}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    {selectedArticulo.codigo_interno} · Disponible: {selectedArticulo.stock_disponible} {selectedArticulo.unidad_medida.includes('Metros') ? 'm' : 'un'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArticulo(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#94a3b8',
                  padding: '4px',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Selector táctil incremental de cantidad */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>Cantidad a rebajar</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{selectedArticulo.unidad_medida}</div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '4px'
              }}>
                <button
                  type="button"
                  onClick={handleDecrement}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                  }}
                >
                  <Minus size={16} />
                </button>
                <div style={{
                  width: '44px',
                  textAlign: 'center',
                  fontWeight: '800',
                  fontSize: '17px',
                  color: '#0f172a'
                }}>
                  {cantidad}
                </div>
                <button
                  type="button"
                  onClick={handleIncrement}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. SECCIÓN: OBRA DESTINO (Con deshabilitación dinámica demostrada) */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '13.5px', fontWeight: '700', color: tipoMovimiento === 'Merma Justificada' ? '#94a3b8' : '#0f172a' }}>
              Obra Destino
            </label>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Solo para Salida a Obra</span>
          </div>

          <div style={{
            position: 'relative',
            backgroundColor: tipoMovimiento === 'Merma Justificada' ? '#f8fafc' : '#ffffff',
            border: tipoMovimiento === 'Merma Justificada' ? '1.5px dashed #cbd5e1' : '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Building2 size={18} color={tipoMovimiento === 'Merma Justificada' ? '#cbd5e1' : '#64748b'} />
            
            {tipoMovimiento === 'Merma Justificada' ? (
              <span style={{ fontSize: '13.5px', color: '#94a3b8', fontStyle: 'italic', flex: 1 }}>
                No aplica para merma
              </span>
            ) : (
              <select
                value={selectedObraId}
                onChange={(e) => setSelectedObraId(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  width: '100%',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  color: '#1e293b',
                  cursor: 'pointer'
                }}
              >
                <option value="">Selecciona obra de destino...</option>
                {obras.map(o => (
                  <option key={o.id} value={o.id}>{o.nombre} ({o.ubicacion})</option>
                ))}
              </select>
            )}
            <ChevronDown size={18} color="#94a3b8" />
          </div>
        </div>

        {/* 5. SECCIÓN: CAUSA DEL DAÑO O PÉRDIDA (Obligatoria para merma) */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#0f172a' }}>
              Causa del daño o pérdida
            </label>
            <span style={{ fontSize: '11px', color: tipoMovimiento === 'Merma Justificada' ? '#dc2626' : '#94a3b8', fontWeight: '600' }}>
              {tipoMovimiento === 'Merma Justificada' ? 'Obligatorio para merma' : 'Opcional para salida'}
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <textarea
              rows={3}
              maxLength={300}
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              placeholder="Describa el motivo técnico o causal de la rebaja..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '13px',
                lineHeight: '1.4',
                color: '#1e293b',
                outline: 'none',
                resize: 'none',
                backgroundColor: '#ffffff'
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '10px',
              right: '12px',
              fontSize: '11px',
              color: '#94a3b8'
            }}>
              {justificacion.length} / 300
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#64748b',
            fontSize: '11.5px',
            marginTop: '6px'
          }}>
            <Info size={14} color="#64748b" />
            <span>La justificación quedará registrada en el Cardex.</span>
          </div>
        </div>

        {/* RESUMEN PREVIO Y BOTÓN APPEND-ONLY (Fiel a prototipo 5.3.1) */}
        <div style={{
          paddingTop: '12px',
          borderTop: '1px solid #f1f5f9',
          marginTop: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '12px'
          }}>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>
              1 insumo · {tipoMovimiento === 'Merma Justificada' ? 'Merma justificada' : 'Salida a obra'}
            </span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
              -{cantidad} {selectedArticulo?.unidad_medida.includes('Metros') ? 'm' : 'un'} de stock
            </span>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            style={{
              width: '100%',
              backgroundColor: '#1b5e20',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '14px 18px',
              fontSize: '15px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#154a1a'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1b5e20'}
          >
            {/* Ícono de Check idéntico a la captura */}
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
