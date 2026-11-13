/**
 * @file ObrasDespachosView.jsx
 * @description Componente de gestión de despacho de insumos hacia faenas y proyectos de refrigeración (HU-05, HU-09, HU-10).
 * 
 * Permite emitir guías de despacho, asociar técnicos receptores, verificar firmas conformes
 * e imputar automáticamente los materiales a los costos del proyecto en Cardex y Bodega.
 * 
 * @param {Object} props
 * @param {Array<Object>} props.obras Lista de obras y faenas activas disponibles.
 * @param {Array<Object>} props.articulos Catálogo maestro de insumos con stock disponible.
 * @param {Array<Object>} props.cardex Bitácora de movimientos para auditar despachos históricos.
 * @param {Function} props.onRegistrarDespacho Callback para persistir el despacho vía API o fallback local.
 */

import React, { useState } from 'react';
import { 
  Truck, 
  Building2, 
  UserCheck, 
  Boxes, 
  Plus, 
  CheckCircle, 
  FileText, 
  Search, 
  MapPin, 
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function ObrasDespachosView({ obras = [], articulos = [], cardex = [], onRegistrarDespacho }) {
  const primerObraId = obras[0]?.id_obra || obras[0]?.id || '';
  const primerArtId = articulos[0]?.id_articulo || articulos[0]?.id || '';
  const [selectedObraId, setSelectedObraId] = useState(primerObraId);
  const [articuloId, setArticuloId] = useState(primerArtId);
  const [cantidad, setCantidad] = useState(2);
  const [tecnicoReceptor, setTecnicoReceptor] = useState('Javier Soto (Técnico Frigorista)');
  const [guiaDespacho, setGuiaDespacho] = useState('GD-001540');
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [firmaDigital, setFirmaDigital] = useState(true);

  const selectedObra = obras.find(o => String(o.id_obra || o.id) === String(selectedObraId)) || obras[0] || { nombre: 'Sin obras', cliente: '', ubicacion: '', codigo: 'N/A' };
  const selectedArticulo = articulos.find(a => String(a.id_articulo || a.id) === String(articuloId)) || articulos[0] || { id_articulo: '', nombre: 'Sin artículos', stock_disponible: 0, unidad_medida: 'un' };

  const unidadTexto = selectedArticulo.unidad_nombre || selectedArticulo.unidad_medida || 'un';
  const obraCliente = selectedObra.cliente_nombre || selectedObra.cliente || '';

  // Despachos realizados a la obra seleccionada desde el historial
  const nombreObraLower = (selectedObra.nombre || '').toLowerCase();
  const despachosObra = cardex.filter(m => 
    m.tipo_movimiento === 'Salida' && (
      (m.obra_destino || '').toLowerCase().includes(nombreObraLower) ||
      (m.motivo || '').toLowerCase().includes(nombreObraLower)
    )
  );

  const handleCrearDespacho = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedObra.id_obra && !selectedObra.id) {
      setErrorMsg('Debe registrar o seleccionar una obra válida.');
      return;
    }
    if (Number(cantidad) > Number(selectedArticulo.stock_disponible)) {
      setErrorMsg(`Error 409: Stock insuficiente. Solo hay ${selectedArticulo.stock_disponible} unidades disponibles.`);
      return;
    }

    try {
      await onRegistrarDespacho({
        id_obra: selectedObra.id_obra || selectedObra.id,
        id_articulo: selectedArticulo.id_articulo,
        id_movimiento: `MOV-${Math.floor(100000 + Math.random() * 900000)}`,
        fecha_hora: new Date().toISOString().replace('T', ' ').substring(0, 16),
        usuario_responsable: 'Carlos Muñoz',
        cargo: 'Bodeguero',
        articulo_nombre: selectedArticulo.nombre,
        articulo_codigo: selectedArticulo.codigo_interno || String(selectedArticulo.codigo_barra || ''),
        articulo_detalle: selectedArticulo.categoria_nombre || selectedArticulo.categoria || '',
        cantidad: -Number(cantidad),
        unidad_medida: unidadTexto.includes('Metros') ? 'm' : (unidadTexto.includes('Cilindro') ? 'cil' : unidadTexto),
        tipo_movimiento: 'Salida',
        obra_destino: selectedObra.nombre,
        documento_respaldo: guiaDespacho,
        tecnico_receptor: tecnicoReceptor,
        motivo: `Despacho a terreno recibido por ${tecnicoReceptor}`
      }, selectedArticulo.id_articulo, Number(cantidad));

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) {
      const data = err.response?.data;
      const detalle = data?.detail || (data ? JSON.stringify(data) : null);
      setErrorMsg(detalle || 'No se pudo emitir el despacho. Verifique permisos o stock disponible.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Obras y Despachos a Terreno (HU-05 / HU-10)
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Control de guías de despacho, imputación de costos directos a proyectos y firma conforme en tablet
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="alerta-error" style={{ marginBottom: '4px' }}>
          {errorMsg}
        </div>
      )}

      {showSuccess && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '12px 16px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13.5px'
        }}>
          <CheckCircle size={18} color="#10b981" />
          <span><strong>Despacho emitido con éxito:</strong> Stock rebajado, imputado al costo de {selectedObra.nombre} y anotado en el Cardex inalterable.</span>
        </div>
      )}

      {/* Grid: Formulario de Despacho & Resumen de Obra */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: '20px' }}>
        
        {/* FORMULARIO DE NUEVO DESPACHO */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '22px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={18} color="#1b5e20" />
            <span>Emitir Guía de Despacho a Faena</span>
          </div>

          <form onSubmit={handleCrearDespacho}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Obra de Destino (Cliente)
              </label>
              <select
                value={selectedObraId}
                onChange={(e) => setSelectedObraId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  color: '#1e293b'
                }}
              >
                {obras.map(o => {
                  const oid = o.id_obra || o.id;
                  const cli = o.cliente_nombre || o.cliente || '';
                  return (
                    <option key={oid} value={oid}>{o.nombre} - {cli}</option>
                  );
                })}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  N° Guía de Despacho
                </label>
                <input
                  type="text"
                  value={guiaDespacho}
                  onChange={(e) => setGuiaDespacho(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Técnico Receptor
                </label>
                <input
                  type="text"
                  value={tecnicoReceptor}
                  onChange={(e) => setTecnicoReceptor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Insumo / Repuesto a Despachar
              </label>
              <select
                value={articuloId}
                onChange={(e) => setArticuloId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  color: '#1e293b'
                }}
              >
                {articulos.map(a => {
                  const u = a.unidad_nombre || a.unidad_medida || 'un';
                  return (
                    <option key={a.id_articulo} value={a.id_articulo}>
                      {a.nombre} (Disp: {a.stock_disponible} {u.includes('Metros') ? 'm' : u})
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155' }}>
                  Cantidad Solicitada
                </label>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Disponible actual: <strong>{selectedArticulo.stock_disponible}</strong>
                </span>
              </div>
              <input
                type="number"
                min="1"
                max={selectedArticulo.stock_disponible}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Simulación de Firma Digital en Tablet (BPMN 4.4.1) */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  <span style={{ fontWeight: '700' }}>Firma de recepción conforme:</span><br />
                  Capturada mediante digitalizador tablet en terreno
                </div>
                <div style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                  fontSize: '11px',
                  fontWeight: '700'
                }}>
                  ✓ Validada
                </div>
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                backgroundColor: '#1b5e20',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '13px',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <Truck size={17} />
              <span>Emitir y Despachar a Obra</span>
            </button>
          </form>
        </div>

        {/* DETALLE Y GASTO HISTÓRICO DE LA OBRA SELECCIONADA */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '22px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>{selectedObra.nombre}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>{obraCliente} · {selectedObra.ubicacion}</div>
            </div>
            <span style={{
              fontSize: '11px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              padding: '3px 8px',
              borderRadius: '6px',
              fontWeight: '700'
            }}>
              {selectedObra.codigo}
            </span>
          </div>

          <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '10px' }}>
            Insumos y Materiales Imputados a esta Obra:
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {despachosObra.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Aún no hay despachos registrados para esta faena.
              </div>
            ) : (
              despachosObra.map(item => (
                <div 
                  key={item.id_movimiento}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{item.articulo_nombre}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Doc: {item.documento_respaldo} · {item.fecha_hora}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#2563eb' }}>
                      {Math.abs(item.cantidad)} {item.unidad_medida}
                    </span>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>Entregado</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#64748b'
          }}>
            <span>Total de despachos imputados:</span>
            <strong style={{ color: '#0f172a' }}>{despachosObra.length} envíos</strong>
          </div>
        </div>

      </div>

    </div>
  );
}
