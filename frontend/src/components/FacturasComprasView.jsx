/**
 * @file FacturasComprasView.jsx
 * @description Módulo de recepción de compras y cálculo de 3 descuentos sucesivos comerciales (HU-08 / CP-04).
 * Calcula exactamente: Bruto = Cantidad * Precio, aplicando sucesivamente d1%, d2% y d3%, luego Neto, IVA (19%) y Total.
 * 
 * BIBLIOTECAS UTILIZADAS:
 * - react: Hook useState para cálculo dinámico en tiempo real.
 * - lucide-react: Iconos vectoriales `Building2`, `Receipt`, `Plus`, `Calculator`, `CheckCircle`, `AlertCircle`, `FileText`, `DollarSign`.
 * 
 * REGLAS DE NEGOCIO:
 * - Caso de Prueba CP-04: Cálculo encadenado de descuentos para facturas de proveedores agroindustriales.
 * - Entrada automática a bodega central con generación de correlativo de movimiento Cardex.
 */

import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Receipt, 
  Plus, 
  Calculator, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  DollarSign
} from 'lucide-react';
import '../styles/FacturasComprasView.css';

export default function FacturasComprasView({ proveedores = [], articulos = [], onRegistrarFactura }) {
  const primerProvId = proveedores[0]?.id_proveedor || proveedores[0]?.id || '';
  const primerArtId = articulos[0]?.id_articulo || articulos[0]?.id || '';
  const [proveedorId, setProveedorId] = useState(primerProvId);
  const [numeroFactura, setNumeroFactura] = useState('FAC-99412');
  const [articuloId, setArticuloId] = useState(primerArtId);
  const [cantidad, setCantidad] = useState(10);
  const [precioUnitario, setPrecioUnitario] = useState(10000);
  
  // Descuentos sucesivos comerciales (HU-08: hasta 3 descuentos sucesivos)
  const [d1, setD1] = useState(10); // 10%
  const [d2, setD2] = useState(5);  // 5%
  const [d3, setD3] = useState(0);  // 0%
  const [observaciones, setObservaciones] = useState('Compra de reposición stock programada');
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (!proveedorId && proveedores.length > 0) {
      setProveedorId(proveedores[0].id_proveedor || proveedores[0].id || '');
    }
  }, [proveedores, proveedorId]);

  useEffect(() => {
    if (!articuloId && articulos.length > 0) {
      setArticuloId(articulos[0].id_articulo || articulos[0].id || '');
    }
  }, [articulos, articuloId]);

  // Cálculo matemático exacto de descuentos sucesivos (Caso de Prueba CP-04)
  const bruto = cantidad * precioUnitario;
  const paso1 = bruto * (1 - d1 / 100);
  const paso2 = paso1 * (1 - d2 / 100);
  const neto = Math.round(paso2 * (1 - d3 / 100));
  const iva = Math.round(neto * 0.19);
  const total = neto + iva;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const artObj = articulos.find(a => (a.id_articulo || a.id || '').toString() === articuloId.toString());
    const provObj = proveedores.find(p => (p.id_proveedor || p.id || '').toString() === proveedorId.toString());

    try {
      await onRegistrarFactura({
        id_factura: `FAC-${Math.floor(10000 + Math.random() * 90000)}`,
        proveedor_id: provObj?.id_proveedor || provObj?.id,
        proveedor: provObj?.razon_social || 'Proveedor Registrado',
        articulo_id: artObj?.id_articulo || artObj?.id,
        articulo_nombre: artObj?.nombre,
        cantidad: Number(cantidad),
        precio_unitario: Number(precioUnitario),
        descuento_1: Number(d1),
        descuento_2: Number(d2),
        descuento_3: Number(d3),
        observaciones,
        neto,
        total,
        documento: numeroFactura,
        motivo: `Factura ${numeroFactura} - ${provObj?.razon_social || 'Proveedor'}`
      });

      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 4000);
    } catch {
      // El componente padre maneja el mensaje de error
    }
  };

  return (
    <div className="facturas-container">
      <div className="facturas-header">
        <div className="facturas-icon-badge">
          <Receipt size={22} />
        </div>
        <div>
          <h2 className="facturas-title">
            Ingreso de Facturas de Compra (HU-08 / CP-04)
          </h2>
          <p className="facturas-subtitle">
            Recepción de materiales a bodega con cálculo de hasta 3 descuentos sucesivos comerciales
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="facturas-success-alert">
          <CheckCircle size={18} color="#10b981" />
          <span><strong>Factura registrada con éxito:</strong> Stock sumado en catálogo y movimiento de Entrada añadido al Cardex Append-Only.</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="facturas-grid-row-2">
          <div>
            <label className="facturas-label">
              Proveedor Registrado
            </label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="facturas-select"
            >
              {proveedores.map(p => {
                const idVal = p.id_proveedor || p.id;
                return (
                  <option key={idVal} value={idVal}>{p.razon_social} ({p.rut})</option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="facturas-label">
              N° Factura o Guía Proveedor
            </label>
            <input
              type="text"
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              className="facturas-input"
            />
          </div>
        </div>

        <div className="facturas-grid-row-3">
          <div>
            <label className="facturas-label">
              Insumo / Artículo recibido
            </label>
            <select
              value={articuloId}
              onChange={(e) => setArticuloId(e.target.value)}
              className="facturas-select"
            >
              {articulos.map(a => {
                const aId = a.id_articulo || a.id;
                const cod = a.codigo_interno || a.codigo_barra || `ART-${aId}`;
                return (
                  <option key={aId} value={aId}>
                    {a.nombre} ({cod}) - Stock actual: {a.stock_disponible}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="facturas-label">
              Cantidad Ingresada
            </label>
            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              className="facturas-input"
            />
          </div>

          <div>
            <label className="facturas-label">
              Precio Unitario Bruto ($)
            </label>
            <input
              type="number"
              min="100"
              step="100"
              value={precioUnitario}
              onChange={(e) => setPrecioUnitario(Number(e.target.value))}
              className="facturas-input"
            />
          </div>
        </div>

        {/* CÁLCULO DE HASTA 3 DESCUENTOS SUCESIVOS (HU-08 / CP-04) */}
        <div className="facturas-discounts-panel">
          <div className="facturas-discounts-title">
            <Calculator size={16} />
            <span>Descuentos comerciales sucesivos acordados con proveedor:</span>
          </div>

          <div className="facturas-discounts-grid">
            <div>
              <label className="facturas-discount-label">Descuento 1 (%)</label>
              <input
                type="number"
                min="0"
                max="99"
                value={d1}
                onChange={(e) => setD1(Number(e.target.value))}
                className="facturas-discount-input"
              />
            </div>
            <div>
              <label className="facturas-discount-label">Descuento 2 (%)</label>
              <input
                type="number"
                min="0"
                max="99"
                value={d2}
                onChange={(e) => setD2(Number(e.target.value))}
                className="facturas-discount-input"
              />
            </div>
            <div>
              <label className="facturas-discount-label">Descuento 3 (%)</label>
              <input
                type="number"
                min="0"
                max="99"
                value={d3}
                onChange={(e) => setD3(Number(e.target.value))}
                className="facturas-discount-input"
              />
            </div>
          </div>

          {/* Desglose de totales */}
          <div className="facturas-totals-breakdown">
            <div>
              <div className="facturas-total-label">Subtotal Bruto</div>
              <div className="facturas-total-bruto">${bruto.toLocaleString('es-CL')}</div>
            </div>
            <div>
              <div className="facturas-total-label">Neto c/ Descuentos</div>
              <div className="facturas-total-neto">${neto.toLocaleString('es-CL')}</div>
            </div>
            <div>
              <div className="facturas-total-label">IVA (19%)</div>
              <div className="facturas-total-iva">${iva.toLocaleString('es-CL')}</div>
            </div>
            <div>
              <div className="facturas-total-label">Total a Pagar Factura</div>
              <div className="facturas-total-final">${total.toLocaleString('es-CL')}</div>
            </div>
          </div>
        </div>

        <button type="submit" className="facturas-btn-submit">
          <Plus size={18} />
          <span>Ingresar Factura y Sumar Stock a Bodega</span>
        </button>
      </form>
    </div>
  );
}
