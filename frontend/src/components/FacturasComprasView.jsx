import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Calculator, CheckCircle } from 'lucide-react';
import { obtenerProveedores, obtenerArticulos, crearFactura } from '../services_api/inventarioService';
import { obtenerUsuarioActual } from '../services_api/authService';
import { formatearRutVisual } from '../pages/GestionUsuariosView';
import '../styles/FacturasComprasView.css';

const obtenerFechaHoyISO = () => new Date().toLocaleDateString('en-CA');

// Formulario de ingreso directo de facturas de compra.
export default function FacturasComprasView({ proveedores: provProp = null, articulos: artProp = null, usuario = null, onRegistrarFactura, }) {
    const sesion = usuario || obtenerUsuarioActual();
    const esFinanzas = sesion?.rol === 'encargado_finanza';
    
    const [proveedores, setProveedores] = useState(provProp || []);
    const [articulos, setArticulos] = useState(artProp || []);
    const [proveedorId, setProveedorId] = useState('');
    const [numeroFactura, setNumeroFactura] = useState('');
    const [fechaIngreso, setFechaIngreso] = useState(obtenerFechaHoyISO());
    const [articuloId, setArticuloId] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [precioUnitario, setPrecioUnitario] = useState(10000);
    const [observaciones, setObservaciones] = useState('');

    // Descuentos comerciales sucesivos.
    const [d1, setD1] = useState(0);
    const [d2, setD2] = useState(0);
    const [d3, setD3] = useState(0);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [enviando, setEnviando] = useState(false);

    // Sincroniza los listados de proveedores y materiales con el servidor o las pops recibidas.
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
    const bruto = Number(cantidad || 0) * Number(precioUnitario || 0);
    const paso1 = bruto * (1 - Number(d1 || 0) / 100);
    const paso2 = paso1 * (1 - Number(d2 || 0) / 100);
    const neto = Math.round(paso2 * (1 - Number(d3 || 0) / 100));
    const iva = Math.round(neto * 0.19);
    const total = neto + iva;

    // Valida los datos y registra la factura en el servidor.
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        const artObj = articulos.find((a) => String(a.id_articulo || a.id) === String(articuloId));
        const provObj = proveedores.find((p) => String(p.id_proveedor || p.id) === String(proveedorId));

        if (!artObj || !provObj) {
            setErrorMsg('Debe seleccionar un proveedor y un material válidos.');
            return;
        }

        const nroLimpio = String(numeroFactura).replace(/\D/g, '').trim();
        if (!nroLimpio || Number(nroLimpio) <= 0) {
            setErrorMsg('Ingrese un número de factura válido (solo dígitos positivos).');
            return;
        }

        setEnviando(true);
        try {
            const payload = {
                numero_documento: Number(nroLimpio),
                fecha_ingreso: fechaIngreso,
                id_proveedor: provObj.id_proveedor,
                articulo_id: artObj.id_articulo,
                articulo_nombre: artObj.nombre,
                cantidad: Number(cantidad),
                precio_unitario: Number(precioUnitario),
                descuento_1: Number(d1 || 0),
                descuento_2: Number(d2 || 0),
                descuento_3: Number(d3 || 0),
                observaciones: observaciones.trim(),
                documento: `FAC-${nroLimpio}`,
            };

            let respuesta = null;
            if (onRegistrarFactura) {
                respuesta = await onRegistrarFactura(payload);
            } else {
                const res = await crearFactura({
                    id_proveedor: payload.id_proveedor,
                    numero_documento: payload.numero_documento,
                    fecha_ingreso: payload.fecha_ingreso,
                    id_articulo: payload.articulo_id,
                    cantidad: payload.cantidad,
                    precio_unitario: payload.precio_unitario,
                    descuento_1: payload.descuento_1,
                    descuento_2: payload.descuento_2,
                    descuento_3: payload.descuento_3,
                    observaciones: payload.observaciones,
                });
                respuesta = res.data;
                await cargarDatos();
            }

            const netoFinal = respuesta?.neto_calculado ?? neto;
            if (respuesta?.pendiente_recepcion) {
                setSuccessMsg(
                    `Factura FAC-${nroLimpio} guardada (Neto $${Number(netoFinal).toLocaleString('es-CL')}). Quedó "En camino" para que Bodega confirme la llegada física.`
                );
            } else {
                setSuccessMsg(
                    `Factura FAC-${nroLimpio} guardada (Neto $${Number(netoFinal).toLocaleString('es-CL')}). Se sumaron ${cantidad} unidades al catálogo.`
                );
            }

            // Limpia los campos para evitar duplicar el envío por accidente.
            setNumeroFactura('');
            setCantidad(1);
            setObservaciones('');
            setD1(0);
            setD2(0);
            setD3(0);
        } catch (err) {
            const dataErr = err.response?.data;
            if (typeof dataErr?.detail === 'string') {
                setErrorMsg(dataErr.detail);
            } else if (dataErr && typeof dataErr === 'object') {
                setErrorMsg(Object.values(dataErr).flat().join(' '));
            } else {
                setErrorMsg('No se pudo registrar la factura. Revise los datos ingresados.');
            }
        } finally {
            setEnviando(false);
        }
    };

    const sinDatosBase = proveedores.length === 0 || articulos.length === 0;

    return (
        <div className="facturas-container">
            <div className="facturas-header">
                <div className="facturas-icon-badge">
                    <Receipt size={22} />
                </div>
                <div>
                    <h2 className="facturas-title">Ingreso Directo de Facturas de Compra</h2>
                    <p className="facturas-subtitle">
                        Registro de compras a proveedores con cálculo automático de hasta 3 descuentos sucesivos e IVA (19%).
                    </p>
                </div>
            </div>

            {errorMsg && <div className="alerta-error">{errorMsg}</div>}

            {successMsg && (
                <div className="facturas-success-alert">
                    <CheckCircle size={18} color="#10b981" />
                    <span>{successMsg}</span>
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
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={numeroFactura}
                                    onChange={(e) => setNumeroFactura(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    className="facturas-input"
                                    placeholder='Ej: 99412'
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="facturas-label">Material o Repuesto Comprado</label>
                            <select value={articuloId} onChange={(e) => setArticuloId(e.target.value)} className="facturas-select" required>
                                {articulos.length === 0 ? (
                                    <option value="">No hay materiales registrados en el catálogo</option>
                                ) : (
                                    articulos.map((a) => {
                                        const aId = a.id_articulo || a.id;
                                        const cod = a.codigo_barra || a.codigo_interno || `ART-${aId}`;
                                        return (
                                            <option key={aId} value={aId}>
                                                {a.nombre} ({cod}) | Stock actual: {a.stock_disponible}
                                            </option>
                                        )
                                    })
                                )}
                            </select>
                        </div>

                        <div className="facturas-grid-row-2">
                            <div>
                                <label className="facturas-label">Cantidad Comprada</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="1000000"
                                    value={cantidad}
                                    onChange={(e) => setCantidad(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="facturas-input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="facturas-label">Precio Unitario ($)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="999999999"
                                    value={precioUnitario}
                                    onChange={(e) => setPrecioUnitario(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="facturas-input"
                                    required
                                />
                            </div>
                        </div>

                        <div className="facturas-grid-row-2">
                            <div>
                                <label className="facturas-label">Fecha de Factura</label>
                                <input
                                    type="date"
                                    value={fechaIngreso}
                                    onChange={(e) => setFechaIngreso(e.target.value)}
                                    className="facturas-input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="facturas-label">Observaciones (Opcional)</label>
                                <input
                                    type="text"
                                    maxLength={250}
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    className="facturas-input"
                                    placeholder="Ej: Compra directa con despacho a bodega..."
                                />
                            </div>
                        </div>

                        <div className="facturas-info-box">
                            {esFinanzas
                                ? 'Al guardar esta compra, la factura quedará registrada en Finanzas y se creará automáticamente un pedido "En camino" para que Bodega confirme la llegada física antes de sumar el stock.'
                                : 'Al confirmar esta factura como Administración, las unidades se sumarán directamente al stock disponible en bodega y quedará registrada la entrada en el Historial General.'}
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
                                        onChange={(e) => setD1(e.target.value === '' ? 0 : Number(e.target.value))}
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
                                        onChange={(e) => setD2(e.target.value === '' ? 0 : Number(e.target.value))}
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
                                        onChange={(e) => setD3(e.target.value === '' ? 0 : Number(e.target.value))}
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

                    <button type="submit" disabled={enviando || sinDatosBase} className="facturas-btn-submit">
                        <Plus size={18} />
                        <span>
                            {enviando
                                ? 'Guardando Factura...'
                                : esFinanzas
                                ? 'Guardar Factura y Enviar a Recepción en Bodega'
                                : 'Guardar Factura y Sumar al Stock de Bodega'
                            }
                        </span>
                    </button>
                </div>
            </form>
        </div>
    );
}