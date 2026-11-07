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

export default function ObrasDespachosView({ obras, articulos, cardex, onRegistrarDespacho }) {
  const [selectedObraId, setSelectedObraId] = useState(obras[0]?.id || 1);
  const [articuloId, setArticuloId] = useState(articulos[0]?.id_articulo || 1);
  const [cantidad, setCantidad] = useState(2);
  const [tecnicoReceptor, setTecnicoReceptor] = useState('Javier Soto (Técnico Frigorista)');
  const [guiaDespacho, setGuiaDespacho] = useState('GD-001540');
  const [showSuccess, setShowSuccess] = useState(false);
  const [firmaDigital, setFirmaDigital] = useState(true);

  const selectedObra = obras.find(o => o.id.toString() === selectedObraId.toString()) || obras[0];
  const selectedArticulo = articulos.find(a => a.id_articulo.toString() === articuloId.toString()) || articulos[0];

  // Despachos realizados a la obra seleccionada desde el historial
  const despachosObra = cardex.filter(m => 
    m.tipo_movimiento === 'Salida' && m.obra_destino.toLowerCase().includes(selectedObra.nombre.toLowerCase())
  );

  const handleCrearDespacho = (e) => {
    e.preventDefault();
    if (cantidad > selectedArticulo.stock_disponible) {
      alert(`Error 409: Stock insuficiente. Solo hay ${selectedArticulo.stock_disponible} unidades disponibles.`);
      return;
    }

    onRegistrarDespacho({
      id_movimiento: `MOV-${Math.floor(100000 + Math.random() * 900000)}`,
      fecha_hora: new Date().toISOString().replace('T', ' ').substring(0, 16),
      usuario_responsable: 'Carlos Muñoz',
      cargo: 'Bodeguero',
      articulo_nombre: selectedArticulo.nombre,
      articulo_codigo: selectedArticulo.codigo_interno,
      articulo_detalle: selectedArticulo.categoria,
      cantidad: -Number(cantidad),
      unidad_medida: selectedArticulo.unidad_medida.includes('Metros') ? 'm' : (selectedArticulo.unidad_medida.includes('Cilindro') ? 'cil' : 'un'),
      tipo_movimiento: 'Salida',
      obra_destino: selectedObra.nombre,
      documento_respaldo: guiaDespacho,
      motivo: `Despacho a terreno recibido por ${tecnicoReceptor}`
    }, selectedArticulo.id_articulo, Number(cantidad));

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
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
                {obras.map(o => (
                  <option key={o.id} value={o.id}>{o.nombre} - {o.cliente}</option>
                ))}
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
                {articulos.map(a => (
                  <option key={a.id_articulo} value={a.id_articulo}>
                    {a.nombre} (Disp: {a.stock_disponible} {a.unidad_medida.includes('Metros') ? 'm' : 'un'})
                  </option>
                ))}
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
              <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedObra.cliente} · {selectedObra.ubicacion}</div>
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
