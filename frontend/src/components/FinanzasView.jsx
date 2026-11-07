/**
 * @file FinanzasView.jsx
 * @description Módulo de finanzas, auditoría de gastos mensuales (HU-18), condiciones comerciales (HU-16) y cuentas de proveedores (HU-17).
 * 
 * BIBLIOTECAS UTILIZADAS:
 * - react: Hooks useState para control de pestañas y edición de cuentas bancarias.
 * - lucide-react: Iconos `DollarSign`, `Receipt`, `Building2`, `TrendingDown`, `TrendingUp`, `Calendar`, `CreditCard`, `Search`, `FileSpreadsheet`, `Edit3`, `CheckCircle`, `AlertCircle`, `Lock`, `Download`.
 */

import React, { useState } from 'react';
import { 
  DollarSign, 
  Receipt, 
  Building2, 
  TrendingDown, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  Search, 
  FileSpreadsheet, 
  Edit3, 
  CheckCircle, 
  AlertCircle,
  Lock,
  Download
} from 'lucide-react';
import '../styles/FinanzasView.css';

export default function FinanzasView({ proveedores = [], cardex = [], articulos = [] }) {
  const [activeSubTab, setActiveSubTab] = useState('gastos'); // 'gastos' | 'proveedores' | 'clientes'
  const [selectedMes, setSelectedMes] = useState('Octubre 2026');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProveedor, setEditingProveedor] = useState(null);
  const [listaProveedores, setListaProveedores] = useState([
    {
      id: 1,
      rut: "76.432.198-5",
      razon_social: "Refrigeración Industrial Chile Ltda.",
      giro: "Venta de insumos de frío",
      ciudad: "Concepción",
      banco: "Banco de Chile",
      tipo_cuenta: "Cuenta Corriente",
      numero_cuenta: "00-128-49102-01",
      correo_pagos: "pagos@refrigeracionchile.cl",
      condicion_pago: "30 días factura"
    },
    {
      id: 2,
      rut: "77.109.845-2",
      razon_social: "Danfoss Chile SpA",
      giro: "Válvulas y controles automáticos",
      ciudad: "Santiago",
      banco: "Banco Santander",
      tipo_cuenta: "Cuenta Corriente",
      numero_cuenta: "71-002-99410-09",
      correo_pagos: "facturacion@danfoss.cl",
      condicion_pago: "Transferencia contra entrega"
    },
    {
      id: 3,
      rut: "78.223.441-K",
      razon_social: "Gases y Refrigerantes del Biobío",
      giro: "Distribución de gases R-410a y R-134a",
      ciudad: "Chillán",
      banco: "Banco Estado",
      tipo_cuenta: "Cuenta Vista / Chequera",
      numero_cuenta: "52-192-33418-00",
      correo_pagos: "cobranza@gasesbiobio.cl",
      condicion_pago: "15 días"
    }
  ]);

  const [listaClientes, setListaClientes] = useState([
    {
      id: 1,
      rut: "76.890.123-4",
      razon_social: "Agrícola del Sur S.A.",
      giro: "Producción frutícola y cámaras frigoríficas",
      ciudad: "Chillán Viejo",
      contacto_cobranza: "finanzas@agricoladelsur.cl",
      telefono: "+56 42 2291000",
      limite_credito: 15000000,
      estado_pago: "Al día"
    },
    {
      id: 2,
      rut: "79.112.345-8",
      razon_social: "Frigoríficos Olmué SpA",
      giro: "Congelado y exportación de berries",
      ciudad: "San Carlos",
      contacto_cobranza: "contabilidad@frigo-olmue.cl",
      telefono: "+56 42 2480112",
      limite_credito: 25000000,
      estado_pago: "Al día"
    },
    {
      id: 3,
      rut: "78.441.902-1",
      razon_social: "Exportadora Ñuble Fruit",
      giro: "Packing y frío agroindustrial",
      ciudad: "Bulnes",
      contacto_cobranza: "adquisiciones@nublefruit.cl",
      telefono: "+56 42 2771900",
      limite_credito: 10000000,
      estado_pago: "1 factura pendiente"
    }
  ]);

  // Facturas de compra simuladas para el mes (HU-18: gastos del mes)
  const facturasComprasMes = [
    { id: "FAC-99412", fecha: "17/10/2026", proveedor: "Gases y Refrigerantes del Biobío", detalle: "10x Gas Refrigerante R-410a", neto: 855000, iva: 162450, total: 1017450, estado: "Pagada" },
    { id: "FAC-99380", fecha: "15/10/2026", proveedor: "Danfoss Chile SpA", detalle: "15x Válvula Expansión Danfoss", neto: 926250, iva: 175988, total: 1102238, estado: "Pendiente" },
    { id: "FAC-99210", fecha: "10/10/2026", proveedor: "Refrigeración Industrial Chile Ltda.", detalle: "3x Compresor Maneurop 5HP", neto: 2422500, iva: 460275, total: 2882775, estado: "Pagada" },
    { id: "FAC-98994", fecha: "04/10/2026", proveedor: "Refrigeración Industrial Chile Ltda.", detalle: "120m Tubo Cobre 1/2\"", neto: 969000, iva: 184110, total: 1153110, estado: "Pagada" }
  ];

  const totalNetoMes = facturasComprasMes.reduce((acc, f) => acc + f.neto, 0);
  const totalIvaMes = facturasComprasMes.reduce((acc, f) => acc + f.iva, 0);
  const totalGastosMes = facturasComprasMes.reduce((acc, f) => acc + f.total, 0);

  const handleGuardarProveedor = (e) => {
    e.preventDefault();
    setListaProveedores(prev => prev.map(p => p.id === editingProveedor.id ? editingProveedor : p));
    setEditingProveedor(null);
  };

  return (
    <div className="finanzas-container">
      
      {/* Header Finanzas */}
      <div className="finanzas-header">
        <div>
          <h1 className="finanzas-title">
            Módulo de Finanzas y Control de Costos (HU-18 / HU-16 / HU-17)
          </h1>
          <p className="finanzas-subtitle">
            Auditoría de compras del mes, fichas comerciales bancarias de proveedores y clientes mandantes
          </p>
        </div>

        {/* Banner de Seguridad RBAC */}
        <div className="finanzas-banner-lock">
          <Lock size={15} color="#d97706" />
          <span>Perfil Finanzas: Sin atribución de movimiento de stock físico</span>
        </div>
      </div>

      {/* SUB-PESTAÑAS DE FINANZAS */}
      <div className="finanzas-tabs">
        <button
          onClick={() => setActiveSubTab('gastos')}
          className={`finanzas-tab-btn ${activeSubTab === 'gastos' ? 'active' : ''}`}
        >
          <Receipt size={17} />
          <span>Reporte de Gastos Mensuales (HU-18)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('proveedores')}
          className={`finanzas-tab-btn ${activeSubTab === 'proveedores' ? 'active' : ''}`}
        >
          <CreditCard size={17} />
          <span>Fichas Bancarias de Proveedores (HU-17)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('clientes')}
          className={`finanzas-tab-btn ${activeSubTab === 'clientes' ? 'active' : ''}`}
        >
          <Building2 size={17} />
          <span>Condiciones Comerciales Clientes (HU-16)</span>
        </button>
      </div>

      {/* 1. SECCIÓN: GASTOS Y FACTURAS DEL MES (HU-18) */}
      {activeSubTab === 'gastos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Métricas de Gasto del Mes */}
          <div className="finanzas-cards-grid-3">
            <div className="finanzas-metric-card">
              <div className="finanzas-metric-label">TOTAL NETO INSUMOS</div>
              <div className="finanzas-metric-val-main">${totalNetoMes.toLocaleString('es-CL')}</div>
              <div className="finanzas-metric-subtext" style={{ color: '#16a34a' }}>Compras con descuentos aplicados</div>
            </div>

            <div className="finanzas-metric-card">
              <div className="finanzas-metric-label">CRÉDITO FISCAL (IVA 19%)</div>
              <div className="finanzas-metric-val-main" style={{ color: '#475569' }}>${totalIvaMes.toLocaleString('es-CL')}</div>
              <div className="finanzas-metric-subtext">IVA recuperable ante SII</div>
            </div>

            <div className="finanzas-metric-card-highlight">
              <div className="finanzas-metric-label-green">TOTAL GASTOS MES (HU-18)</div>
              <div className="finanzas-metric-val-total">${totalGastosMes.toLocaleString('es-CL')}</div>
              <div className="finanzas-metric-subtext-green">Período: Octubre 2026</div>
            </div>
          </div>

          {/* Tabla de Facturas Recibidas */}
          <div className="finanzas-table-card">
            <div className="finanzas-table-header">
              <div className="finanzas-table-title">
                Desglose de Facturas de Proveedores del Mes
              </div>
              <span className="finanzas-table-meta">{facturasComprasMes.length} facturas recepcionadas</span>
            </div>

            <table className="finanzas-table">
              <thead>
                <tr className="finanzas-thead-tr">
                  <th className="finanzas-th">N° Factura</th>
                  <th className="finanzas-th">Fecha Emisión</th>
                  <th className="finanzas-th">Proveedor</th>
                  <th className="finanzas-th">Insumos</th>
                  <th className="finanzas-th-right">Neto</th>
                  <th className="finanzas-th-right">IVA (19%)</th>
                  <th className="finanzas-th-right">Total Factura</th>
                  <th className="finanzas-th-center">Estado Pago</th>
                </tr>
              </thead>
              <tbody>
                {facturasComprasMes.map((f, idx) => (
                  <tr key={f.id} style={{ borderBottom: idx !== facturasComprasMes.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: '700', color: '#0f172a' }}>{f.id}</td>
                    <td style={{ padding: '14px 18px', color: '#64748b' }}>{f.fecha}</td>
                    <td style={{ padding: '14px 18px', fontWeight: '700', color: '#1e293b' }}>{f.proveedor}</td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>{f.detalle}</td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: '600' }}>${f.neto.toLocaleString('es-CL')}</td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', color: '#64748b' }}>${f.iva.toLocaleString('es-CL')}</td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: '800', color: '#15803d' }}>${f.total.toLocaleString('es-CL')}</td>
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: f.estado === 'Pagada' ? '#dcfce7' : '#fef3c7',
                        color: f.estado === 'Pagada' ? '#15803d' : '#92400e'
                      }}>
                        {f.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SECCIÓN: FICHAS BANCARIAS DE PROVEEDORES (HU-17) */}
      {activeSubTab === 'proveedores' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="finanzas-table-card">
            <div className="finanzas-table-header">
              <div>
                <div className="finanzas-table-title">
                  Fichas Bancarias Registradas (HU-17)
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Datos de transferencia validados para pago a proveedores agroindustriales
                </div>
              </div>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                <Download size={14} />
                <span>Exportar Nómina Bancaria</span>
              </button>
            </div>

            <table className="finanzas-table">
              <thead>
                <tr className="finanzas-thead-tr">
                  <th className="finanzas-th">Razón Social</th>
                  <th className="finanzas-th">RUT</th>
                  <th className="finanzas-th">Banco</th>
                  <th className="finanzas-th">Tipo Cuenta</th>
                  <th className="finanzas-th">Número Cuenta</th>
                  <th className="finanzas-th">Correo Pagos</th>
                  <th className="finanzas-th">Condición Pago</th>
                  <th className="finanzas-th-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listaProveedores.map((p, idx) => (
                  <tr key={p.id} style={{ borderBottom: idx !== listaProveedores.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '14px 18px', fontWeight: '700', color: '#0f172a' }}>{p.razon_social}</td>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#475569' }}>{p.rut}</td>
                    <td style={{ padding: '14px 18px', fontWeight: '600', color: '#1e293b' }}>{p.banco}</td>
                    <td style={{ padding: '14px 18px', color: '#64748b' }}>{p.tipo_cuenta}</td>
                    <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: '700', color: '#1e293b' }}>{p.numero_cuenta}</td>
                    <td style={{ padding: '14px 18px', color: '#2563eb', fontSize: '12px' }}>{p.correo_pagos}</td>
                    <td style={{ padding: '14px 18px', fontSize: '12px', color: '#475569' }}>{p.condicion_pago}</td>
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      <button
                        onClick={() => setEditingProveedor(p)}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          color: '#334155',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Edit3 size={12} />
                        Editar Ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal Edición de Ficha Bancaria */}
          {editingProveedor && (
            <div className="finanzas-modal-overlay">
              <div className="finanzas-modal-box">
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 16px' }}>
                  Editar Ficha Bancaria: {editingProveedor.razon_social}
                </h3>
                <form onSubmit={handleGuardarProveedor}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Banco</label>
                    <input
                      type="text"
                      value={editingProveedor.banco}
                      onChange={(e) => setEditingProveedor({ ...editingProveedor, banco: e.target.value })}
                      className="finanzas-input-field"
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Número de Cuenta</label>
                    <input
                      type="text"
                      value={editingProveedor.numero_cuenta}
                      onChange={(e) => setEditingProveedor({ ...editingProveedor, numero_cuenta: e.target.value })}
                      className="finanzas-input-field"
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Correo para Notificación de Pago</label>
                    <input
                      type="email"
                      value={editingProveedor.correo_pagos}
                      onChange={(e) => setEditingProveedor({ ...editingProveedor, correo_pagos: e.target.value })}
                      className="finanzas-input-field"
                    />
                  </div>
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Condición de Pago</label>
                    <input
                      type="text"
                      value={editingProveedor.condicion_pago}
                      onChange={(e) => setEditingProveedor({ ...editingProveedor, condicion_pago: e.target.value })}
                      className="finanzas-input-field"
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setEditingProveedor(null)}
                      style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#1b5e20', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. SECCIÓN: CLIENTES Y CONDICIONES COMERCIALES (HU-16) */}
      {activeSubTab === 'clientes' && (
        <div className="finanzas-table-card">
          <div className="finanzas-table-header">
            <div className="finanzas-table-title">
              Condiciones Comerciales y Cobranza a Clientes Mandantes (HU-16)
            </div>
            <span className="finanzas-table-meta">3 empresas activas</span>
          </div>

          <table className="finanzas-table">
            <thead>
              <tr className="finanzas-thead-tr">
                <th className="finanzas-th">Razón Social</th>
                <th className="finanzas-th">RUT</th>
                <th className="finanzas-th">Ubicación</th>
                <th className="finanzas-th">Contacto Cobranza</th>
                <th className="finanzas-th-right">Línea de Crédito</th>
                <th className="finanzas-th-center">Estado Cartera</th>
              </tr>
            </thead>
            <tbody>
              {listaClientes.map((c, idx) => (
                <tr key={c.id} style={{ borderBottom: idx !== listaClientes.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '14px 18px', fontWeight: '700', color: '#0f172a' }}>{c.razon_social}</td>
                  <td style={{ padding: '14px 18px', fontFamily: 'monospace', color: '#475569' }}>{c.rut}</td>
                  <td style={{ padding: '14px 18px', color: '#475569' }}>{c.ciudad}</td>
                  <td style={{ padding: '14px 18px', color: '#1b5e20', fontWeight: '600' }}>{c.contacto_cobranza}</td>
                  <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>${c.limite_credito.toLocaleString('es-CL')}</td>
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: c.estado_pago === 'Al día' ? '#dcfce7' : '#fee2e2',
                      color: c.estado_pago === 'Al día' ? '#15803d' : '#991b1b'
                    }}>
                      {c.estado_pago}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
