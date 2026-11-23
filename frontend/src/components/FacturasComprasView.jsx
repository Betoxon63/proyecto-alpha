import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Calculator, CheckCircle } from 'lucide-react';
import { obtenerProveedores, obtenerArticulos, actualizarArticulo } from '../services_api/inventarioService';
import { formatearRutVisual } from '../pages/GestionUsuariosView';
import '../styles/FacturasComprasView.css';

export default function FacturasComprasView({ proveedores: provProp = null, articulos: artProp = null, onRegistrarFactura, }) {
    const [proveedores, setProveedores] = useState(provProp || []);
    const [articulos, setArticulos] = useState(artProp || []);
    const [proveedorId, setProveedorId] = useState('');
    const [numeroFactura, setNumeroFactura] = useState('');
    const [articuloId, setArticuloId] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [precioUnitario, setPrecioUnitario] = useState(10000);

    // Descuentos comerciales sucesivos.
    const [d1, setD1] = useState(0);
    const [d2, setD2] = useState(0);
    const [d3, setD3] = useState(0);
    const [successMsg, setSuccessMsg] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const cargarDatos = async () => {
        if (provProp && artProp) {
            setProveedores(provProp);
            setArticulos(artProp);
            if (provProp.length > 0 && !provProp.some((p) => String(p.id_proveedor || p.id) === String(proveedorId))) {
                setProveedorId(provProp[0].id_proveedor || provProp[0].id);
            }
            if (artProp.length > 0 && !artProp.some((a) => String(a.id_articulo || a.id) === String(articuloId))) {
                setArticuloId(artProp[0].id_articulo || artProp[0].id);
            }
            return;
        }

        try {
            const [resProv, resArt] = await Promise.all([obtenerProveedores(), obtenerArticulos()]);
            setProveedores(resProv.data);
            setArticulos(resArt.data);
            if (resProv.data.length > 0 && !proveedorId) setProveedorId(resProv.data[0].id_proveedor);
            if (resArt.data.length > 0 && !articuloId) setArticuloId(resArt.data[0].id_articulo);
        } catch {
            setErrorMsg('No se pudieron cargar los proveedores o materiales.');
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [provProp, artProp]);

    // Cálculo de hasta 3 descuentos sucesivos y del IVA (19%).
    const bruto = Number(cantidad) * Number(precioUnitario);
    const paso1 = bruto * (1 - Number(d1) / 100);
    const paso2 = paso1 * (1 - Number(d2) / 100);
    const neto = Math.round(paso2 * (1 - Number(d3) / 100));
    const iva = Math.round(neto * 0.19);
    const total = neto + iva;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        const artObj = articulos.find((a) => String(a.id_articulo || a.id) === String(articuloId));
        const provObj = proveedores.find((p) => String(p.id_proveedor || p.id) === String(proveedorId));

        if (!artObj || !provObj) {
            setErrorMsg('Debe seleccionar un proveedor y un material válidos.');
            return;
        }

        const nroLimpio = String(numeroFactura).replace(/^FAC-/i, '').trim();
        const resumenDescuentos = [d1, d2, d3].filter((d) => Number(d) > 0).map((d) => `${d}%`).join(' + ');
        const textoMotivo = `Recepción Factura FAC-${nroLimpio} - ${provObj.razon_social}${resumenDescuentos ? ` (Desc. ${resumenDescuentos})` : ''}`;

        try {
            if (onRegistrarFactura) {
                await onRegistrarFactura({
                    id_factura: nroLimpio,
                    numero_documento: Number(nroLimpio) || 0,
                    id_proveedor: provObj.id_proveedor,
                    proveedor: provObj.razon_social,
                    articulo_id: artObj.id_articulo,
                    articulo_nombre: artObj.nombre,
                    cantidad: Number(cantidad),
                    precio_unitario: Number(precioUnitario),
                    neto,
                    iva,
                    total,
                    documento: `FAC-${nroLimpio}`,
                    motivo: textoMotivo,
                });
            } else {
                const nuevoStock = Number(artObj.stock_disponible) + Number(cantidad);
                await actualizarArticulo(artObj.id_articulo, { ...artObj, stock_disponible: nuevoStock,});
                await cargarDatos();
            }

            setSuccessMsg(true);
            setTimeout(() => setSuccessMsg(false), 4000);
        } catch {
            setErrorMsg('No se pudo registrar la factura ni actualizar el stock.');
        }
    };

    return (
        <div className="facturas-container">
            <div className="facturas-header">
                <div className="facturas-icon-badge">
                    <Receipt size={22} />
                </div>
                <div>
                    <h2 className="facturas-title">Ingreso de Facturas de Compra</h2>
                    <p className="facturas-subtitle">
                        Recepción de materiales en bodega con cálculo automático de hasta 3 descuentos sucesivos y aumento de stock.
                    </p>
                </div>
            </div>

            {errorMsg && <div className="alerta-error">{errorMsg}</div>}

            {successMsg && (
                <div className="facturas-success-alert">
                    <CheckCircle size={18} color="#10b981" />
                    <span>
                        <strong>Factura registrada con éxito:</strong> Se sumaron {cantidad} unidades al catálogo
                        y se calculó un valor neto de ${neto.toLocaleString('es-CL')}.
                    </span>
                </div>
            )}

            <form onSubmit={handleSubmit} className='facturas-main-grid'>
                <div className='facturas-left-column'>
                    <div className='facturas-fields-stack'>
                        <div className="facturas-grid-row-2">
                            <div>
                                <label className="facturas-label">Proveedor</label>
                                <select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="facturas-select" required>
                                    {proveedores.length === 0 ? (
                                        <option value="">No hay proveedores registrados (agregue uno en la pestaña Proveedores)</option>
                                    ) : (
                                        proveedores.map((p) => {
                                            const idVal = p.id_proveedor || p.id;
                                            return (
                                                <option key={idVal} value={idVal}>
                                                    {p.razon_social} ({formatearRutVisual(p.rut)})
                                                </option>
                                            );
                                        })
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="facturas-label">N° Factura o Guía</label>
                                <input
                                    type="text"
                                    value={numeroFactura}
                                    onChange={(e) => setNumeroFactura(e.target.value)}
                                    className="facturas-input"
                                    placeholder='Ej: 99412'
                                    required
                                />
                            </div>
                        </div>

                        <div className="facturas-grid-row-2">
                            <div>
                                <label className="facturas-label">Material o Repuesto Recibido</label>
                                <select value={articuloId} onChange={(e) => setArticuloId(e.target.value)} className="facturas-select" required>
                                    {articulos.map((a) => {
                                        const aId = a.id_articulo || a.id;
                                        const cod = a.codigo_barra || a.codigo_interno || `ART-${aId}`;
                                        return (
                                            <option key={aId} value={aId}>
                                                {a.nombre} ({cod}) - Stock actual: {a.stock_disponible}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="facturas-label">Cantidad Recibida</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={cantidad}
                                    onChange={(e) => setCantidad(Number(e.target.value))}
                                    className="facturas-input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="facturas-label">Precio Unitario ($)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={precioUnitario}
                                    onChange={(e) => setPrecioUnitario(Number(e.target.value))}
                                    className="facturas-input"
                                    required
                                />
                            </div>
                        </div>

                        <div className='facturas-info-box'>
                            Al confirmar el ingreso de esta factura, el sistema sumará automáticamente las unidades recibidas
                            al stock disponible en bodega y dejará registrado el movimiento de entrada en el Historial General.
                        </div>
                    </div>
                </div>

                <div className='facturas-right-column'>
                    <div className="facturas-discounts-panel">
                        <div>
                            <div className="facturas-discounts-title">
                                <Calculator size={16} />
                                <span>Descuentos comerciales acordados con el proveedor:</span>
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
                        </div>

                        <div className="facturas-totals-breakdown">
                            <div className='facturas-total-item'>
                                <div className="facturas-total-label">Subtotal Bruto</div>
                                <div className="facturas-total-bruto">${bruto.toLocaleString('es-CL')}</div>
                            </div>
                            <div className='facturas-total-item highlight'>
                                <div className="facturas-total-label">Neto c/ Descuentos</div>
                                <div className="facturas-total-neto">${neto.toLocaleString('es-CL')}</div>
                            </div>
                            <div className='facturas-total-item'>
                                <div className="facturas-total-label">IVA (19%)</div>
                                <div className="facturas-total-iva">${iva.toLocaleString('es-CL')}</div>
                            </div>
                            <div className='facturas-total-item highlight'>
                                <div className="facturas-total-label">Total a Pagar Factura</div>
                                <div className="facturas-total-final">${total.toLocaleString('es-CL')}</div>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="facturas-btn-submit">
                        <Plus size={18} />
                        <span>Guardar Factura y Sumar al Stock de Bodega</span>
                    </button>
                </div>
            </form>
        </div>
    );
}