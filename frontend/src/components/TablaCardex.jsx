/**
 * @file TablaCardex.jsx
 * @description Vista principal y tabla de auditoría para el módulo Cardex Inalterable (HU-11, Captura 5.3.2).
 * Proporciona trazabilidad completa de todas las operaciones de inventario bajo el paradigma Append-Only.
 * 
 * BIBLIOTECAS UTILIZADAS:
 * - react: Hooks useState, useEffect para manejo de estado reactivo y filtrado en tiempo real.
 * - lucide-react: Iconos vectoriales (`Boxes`, `ShieldCheck`, `Lock`, `Filter`, `Calendar`, `Building2`,
 *   `FileSpreadsheet`, `ArrowDownLeft`, `ArrowUpRight`, `AlertTriangle`, `Search`, `Download`).
 * 
 * REGLAS DE NEGOCIO IMPLEMENTADAS:
 * - HU-11: Motor Cardex Append-Only inalterable. Los registros históricos no admiten DELETE ni PUT/PATCH.
 * - Filtros combinados por tipo (Entrada, Salida, Merma), faena/obra destino y búsqueda predictiva.
 * - Exportación de auditoría completa a formato CSV descargable.
 */

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ShieldCheck,
  Lock,
  Filter,
  Calendar,
  Building2,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Search,
  Download
} from 'lucide-react';
import { obtenerCardex } from '../services_api/cardexService';
import { obtenerObras } from '../services_api/obrasService';

/**
 * Componente de tabla de auditoría de Cardex.
 * 
 * @component
 * @param {Object} props Propiedades del componente.
 * @param {Array<Object>} [props.cardexInicial] Datos iniciales de Cardex (opcional; si no se provee, consulta la API).
 * @param {Array<Object>} [props.obrasInicial] Lista de obras para el selector de filtro (opcional).
 */
export default function TablaCardex({ cardexInicial = null, obrasInicial = null }) {
  const [movimientos, setMovimientos] = useState(cardexInicial || []);
  const [obras, setObras] = useState(obrasInicial || []);
  const [tipoFiltro, setTipoFiltro] = useState('Todos');
  const [obraFiltro, setObraFiltro] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);

  // Carga asíncrona de datos desde el backend
  useEffect(() => {
    if (!cardexInicial) {
      setCargando(true);
      Promise.all([obtenerCardex(), obtenerObras()])
        .then(([dataCardex, dataObras]) => {
          setMovimientos(dataCardex);
          setObras(dataObras);
        })
        .finally(() => setCargando(false));
    }
  }, [cardexInicial]);

  // Lógica de filtrado reactivo
  const filtrados = movimientos.filter(item => {
    if (tipoFiltro === 'Entradas' && item.tipo_movimiento !== 'Entrada') return false;
    if (tipoFiltro === 'Salidas' && item.tipo_movimiento !== 'Salida') return false;
    if (tipoFiltro === 'Mermas' && item.tipo_movimiento !== 'Merma') return false;

    if (obraFiltro !== 'Todas') {
      const destino = item.obra_destino || '';
      if (!destino.toLowerCase().includes(obraFiltro.toLowerCase())) return false;
    }

    if (busqueda.trim() !== '') {
      const q = busqueda.toLowerCase();
      const match = (
        (item.articulo_nombre && item.articulo_nombre.toLowerCase().includes(q)) ||
        (item.articulo_codigo && item.articulo_codigo.toLowerCase().includes(q)) ||
        (item.id_movimiento && String(item.id_movimiento).toLowerCase().includes(q)) ||
        (item.documento_respaldo && item.documento_respaldo.toLowerCase().includes(q)) ||
        (item.usuario_responsable && item.usuario_responsable.toLowerCase().includes(q))
      );
      if (!match) return false;
    }

    return true;
  });

  // Generación y descarga directa de reporte de auditoría en CSV
  const exportarCSV = () => {
    const encabezados = ['ID Movimiento', 'Fecha Hora', 'Usuario', 'Articulo', 'Cantidad', 'Unidad', 'Tipo', 'Obra Destino', 'Documento', 'Motivo'];
    const filas = filtrados.map(m => [
      m.id_movimiento,
      m.fecha_hora,
      m.usuario_responsable,
      `"${m.articulo_nombre || ''}"`,
      m.cantidad,
      m.unidad_medida,
      m.tipo_movimiento,
      `"${m.obra_destino || ''}"`,
      m.documento_respaldo,
      `"${m.motivo || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [encabezados.join(','), ...filas.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cardex_fyag_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* HEADER DE LA VISTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Auditoría de Cardex Inalterable
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Trazabilidad completa de entradas, salidas y mermas (Regla Append-Only)
          </p>
        </div>

        <button
          onClick={exportarCSV}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '9px 16px',
            fontSize: '12.5px',
            fontWeight: '700',
            color: '#1b5e20',
            cursor: 'pointer'
          }}
        >
          <Download size={15} />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* BANNER PROTEGIDO · APPEND-ONLY */}
      <div style={{
        backgroundColor: '#ecfdf5',
        border: '1px solid #a7f3d0',
        borderRadius: '12px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#d1fae5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#065f46' }}>
              Registro protegido · Append-Only
            </div>
            <div style={{ fontSize: '12px', color: '#047857' }}>
              Los movimientos no se pueden modificar ni eliminar. Toda corrección genera un nuevo registro.
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#ffffff',
          border: '1px solid #a7f3d0',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '700',
          color: '#065f46'
        }}>
          <Lock size={14} />
          <span>Solo lectura</span>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
          
          {/* Buscador */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
              Búsqueda Rápida
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 12px'
            }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Insumo, código, usuario o guía..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '12.5px' }}
              />
            </div>
          </div>

          {/* Filtro Tipo */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
              Tipo de Movimiento
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['Todos', 'Entradas', 'Salidas', 'Mermas'].map(tipo => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setTipoFiltro(tipo)}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    backgroundColor: tipoFiltro === tipo ? '#1b5e20' : '#f1f5f9',
                    color: tipoFiltro === tipo ? '#ffffff' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro Obra */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
              Obra / Destino
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '8px 12px'
            }}>
              <Building2 size={16} color="#64748b" />
              <select
                value={obraFiltro}
                onChange={(e) => setObraFiltro(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '12.5px' }}
              >
                <option value="Todas">Todas las ubicaciones</option>
                <option value="Bodega Central">Bodega Central</option>
                {obras.map(o => (
                  <option key={o.id} value={o.nombre}>{o.nombre}</option>
                ))}
              </select>
            </div>
          </div>

        </div>
      </div>

      {/* TABLA PRINCIPAL DE MOVIMIENTOS */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>Movimientos Registrados</span>
            <span style={{
              fontSize: '11px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: '700'
            }}>
              {filtrados.length} registros
            </span>
          </div>

          <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileSpreadsheet size={14} />
            <span>Orden cronológico descendente</span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '11.5px', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>ID Movimiento</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Fecha / Hora</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Responsable</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Artículo / Insumo</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'right' }}>Cantidad</th>
                <th style={{ padding: '12px 16px', fontWeight: '700', textAlign: 'center' }}>Tipo</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Destino / Faena</th>
                <th style={{ padding: '12px 16px', fontWeight: '700' }}>Respaldo</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    Cargando movimientos de Cardex...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                    No se encontraron movimientos registrados con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filtrados.map((mov, idx) => {
                  const isPositive = mov.cantidad > 0;
                  const esMerma = mov.tipo_movimiento === 'Merma';

                  return (
                    <tr
                      key={mov.id_movimiento || idx}
                      style={{
                        borderBottom: idx !== filtrados.length - 1 ? '1px solid #f1f5f9' : 'none',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '700', color: '#0f172a' }}>
                        {mov.id_movimiento}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {mov.fecha_hora || mov.fecha || 'Reciente'}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{mov.usuario_responsable || 'Usuario'}</div>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>{mov.cargo || 'Operador'}</div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{mov.articulo_nombre}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{mov.articulo_codigo} · {mov.articulo_detalle}</div>
                      </td>

                      <td style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontWeight: '800',
                        fontFamily: 'monospace',
                        color: esMerma ? '#b91c1c' : (isPositive ? '#15803d' : '#b45309')
                      }}>
                        {isPositive ? `+${mov.cantidad}` : mov.cantidad} {mov.unidad_medida}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: esMerma ? '#fee2e2' : (isPositive ? '#dcfce7' : '#fef3c7'),
                          color: esMerma ? '#991b1b' : (isPositive ? '#166534' : '#92400e')
                        }}>
                          {esMerma ? <AlertTriangle size={12} /> : (isPositive ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />)}
                          {mov.tipo_movimiento}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#334155' }}>
                        {mov.obra_destino || 'Bodega Central'}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          fontFamily: 'monospace'
                        }}>
                          {mov.documento_respaldo || 'DOC-RESP'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
