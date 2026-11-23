/**
 * Componente: FacturasComprasView
 * 
 * Propósito:
 * Gestiona el formulario principal de recepción de compras y abastecimiento de bodega.
 * Permite registrar facturas y guías de despacho tanto de forma manual como mediante
 * digitalización inteligente con Inteligencia Artificial (Ollama).
 * 
 * Funcionalidades clave:
 * 1. Recepción Multi-producto: Permite ingresar facturas con múltiples materiales simultáneamente.
 * 2. Cálculo Financiero Avanzado:
 *    - Descuentos por línea de producto (% individual por material).
 *    - Hasta 3 descuentos comerciales sucesivos pactados con el proveedor (D1, D2, D3).
 *    - Desglose transparente de Subtotal Bruto, Descuentos de Línea, Neto, IVA (19%) y Total Factura.
 * 3. Digitalización con IA: Botón integrado con soporte para cámara móvil ('capture="environment"')
 *    que analiza el documento y abre el modal de revisión interactivo.
 * 4. Precarga Externa: Acepta 'datosPrecargadosIA' enviados desde la cabecera global de ComprasView.
 */

import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Calculator, CheckCircle, Sparkles, Trash2, Eye, X, Tag } from 'lucide-react';
import { obtenerProveedores, obtenerArticulos, actualizarArticulo, obtenerCategorias } from '../services_api/inventarioService';
import { formatearRutVisual } from '../pages/GestionUsuariosView';
import '../styles/FacturasComprasView.css';

export default function FacturasComprasView({
    proveedores: provProp = null,           // Lista de proveedores precargados desde el componente padre
    articulos: artProp = null,               // Catálogo de artículos disponibles en inventario
    categorias: catProp = null,              // Categorías de materiales disponibles
    unidades: uniProp = null,                // Unidades de medida disponibles
    onRegistrarFactura,                      // Función callback para persistir la factura en el backend
    onNuevoProveedor = null,                 // Callback para abrir el modal de registrar proveedor si es nuevo
    datosPrecargadosIA = null,               // Datos derivados desde el botón de IA global de ComprasView
    onLimpiarDatosPrecargados = null        // Limpia el estado de datos precargados una vez aplicados
}) {
    // Estados principales del formulario
    const [proveedores, setProveedores] = useState(provProp || []);
    const [articulos, setArticulos] = useState(artProp || []);
    const [categorias, setCategorias] = useState(catProp || []);
    const [proveedorId, setProveedorId] = useState('');
    const [numeroFactura, setNumeroFactura] = useState('');

    // Lista dinámica multi-producto (cada elemento representa una fila de material)
    const [itemsFactura, setItemsFactura] = useState([
        { id_temporal: 1, articuloId: '', cantidad: 1, precioUnitario: 10000, descuentoPorcentaje: 0 }
    ]);

    // Descuentos comerciales globales sucesivos con el proveedor
    const [d1, setD1] = useState(0);
    const [d2, setD2] = useState(0);
    const [d3, setD3] = useState(0);
    const [successMsg, setSuccessMsg] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [bannerIAPrecargado, setBannerIAPrecargado] = useState(null);
    const [imagenRespaldo, setImagenRespaldo] = useState('');
    const [modalRespaldoAbierto, setModalRespaldoAbierto] = useState(false);

    /**
     * Carga inicial o sincronización de proveedores, artículos y categorías desde la API
     */
    const cargarDatos = async () => {
        if (provProp && artProp) {
            setProveedores(provProp);
            setArticulos(artProp);
            if (catProp) setCategorias(catProp);
            if (provProp.length > 0 && !provProp.some((p) => String(p.id_proveedor || p.id) === String(proveedorId))) {
                setProveedorId(provProp[0].id_proveedor || provProp[0].id);
            }
            if (artProp.length > 0 && itemsFactura.length === 1 && !itemsFactura[0].articuloId && !numeroFactura && !itemsFactura[0].descripcionOriginal) {
                setItemsFactura([{ ...itemsFactura[0], articuloId: artProp[0].id_articulo || artProp[0].id }]);
            }
            return;
        }

        try {
            const [resProv, resArt, resCat] = await Promise.all([
                obtenerProveedores(), 
                obtenerArticulos(),
                obtenerCategorias().catch(() => ({ data: [] }))
            ]);
            setProveedores(resProv.data);
            setArticulos(resArt.data);
            setCategorias(resCat.data || []);
            if (resProv.data.length > 0 && !proveedorId) setProveedorId(resProv.data[0].id_proveedor);
            if (resArt.data.length > 0 && itemsFactura.length === 1 && !itemsFactura[0].articuloId && !numeroFactura && !itemsFactura[0].descripcionOriginal) {
                setItemsFactura([{ ...itemsFactura[0], articuloId: resArt.data[0].id_articulo }]);
            }
        } catch {
            setErrorMsg('No se pudieron cargar los proveedores o materiales.');
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [provProp, artProp, catProp]);

    /**
     * Si ComprasView envía datos de una digitalización global, los aplica automáticamente
     */
    useEffect(() => {
        if (datosPrecargadosIA) {
            aplicarDatosIA(datosPrecargadosIA);
            if (onLimpiarDatosPrecargados) onLimpiarDatosPrecargados();
        }
    }, [datosPrecargadosIA]);

    /**
     * Actualiza el valor de una celda específica en una fila de material
     */
    const handleActualizarItem = (index, campo, valor) => {
        setItemsFactura(prev => {
            const copia = [...prev];
            copia[index] = { ...copia[index], [campo]: valor };
            return copia;
        });
    };

    /**
     * Añade una nueva fila de material a la factura
     */
    const handleAgregarItem = () => {
        const primerArtId = articulos.length > 0 ? (articulos[0].id_articulo || articulos[0].id) : '';
        setItemsFactura(prev => [
            ...prev,
            { id_temporal: Date.now(), articuloId: primerArtId, cantidad: 1, precioUnitario: 10000, descuentoPorcentaje: 0 }
        ]);
    };

    /**
     * Elimina una fila de material (mantiene siempre al menos una)
     */
    const handleEliminarItem = (index) => {
        if (itemsFactura.length <= 1) return;
        setItemsFactura(prev => prev.filter((_, i) => i !== index));
    };

    // Cálculos matemáticos y tributarios
    // 1. Subtotal Bruto antes de cualquier descuento
    const subtotalBruto = itemsFactura.reduce((acc, it) => acc + (Number(it.cantidad) * Number(it.precioUnitario)), 0);

    // 2. Suma de los descuentos individuales por línea de producto
    const totalDescuentosLinea = itemsFactura.reduce((acc, it) => {
        const cant = Number(it.cantidad) || 0;
        const pu = Number(it.precioUnitario) || 0;
        const desc = Number(it.descuentoPorcentaje) || 0;
        return acc + Math.round((cant * pu) * (desc / 100));
    }, 0);

    // 3. Subtotal con descuento de línea aplicado
    const subtotalConDescLinea = subtotalBruto - totalDescuentosLinea;

    // 4. Descuentos comerciales globales sucesivos (D1, D2, D3)
    const paso1 = subtotalConDescLinea * (1 - Number(d1) / 100);
    const paso2 = paso1 * (1 - Number(d2) / 100);
    const neto = Math.round(paso2 * (1 - Number(d3) / 100));

    // 5. IVA (19% en Chile) y Total General a Pagar
    const iva = Math.round(neto * 0.19);
    const total = neto + iva;

    /**
     * Inyecta los datos validados del modal de IA directamente en los campos del formulario
     */
    const aplicarDatosIA = (datosConfirmados) => {
        // 1. Asignar el proveedor detectado asegurando su presencia en el listado
        const provData = datosConfirmados.proveedor;
        if (provData?.id_proveedor) {
            setProveedores(prev => {
                const idProv = String(provData.id_proveedor || provData.id);
                if (!prev.some(p => String(p.id_proveedor || p.id) === idProv)) {
                    return [provData, ...prev];
                }
                return prev;
            });
            setProveedorId(provData.id_proveedor);
        } else if (provData?.rut) {
            const rutLimpio = String(provData.rut).replace(/[^0-9kK]/g, '').toUpperCase();
            const provExistente = proveedores.find(p => {
                const pRut = String(p.rut).replace(/[^0-9kK]/g, '').toUpperCase();
                return pRut.includes(rutLimpio) || rutLimpio.includes(pRut);
            });
            if (provExistente) {
                setProveedorId(provExistente.id_proveedor || provExistente.id);
            }
        }

        // 2. Asignar número de folio
        if (datosConfirmados.numero_documento) {
            setNumeroFactura(String(datosConfirmados.numero_documento));
        }

        // 3. Asignar lista completa de materiales extraídos con sus descuentos
        if (datosConfirmados.items && datosConfirmados.items.length > 0) {
            const nuevosItems = datosConfirmados.items.map((it, idx) => {
                let artIdAsignado = it.id_articulo;
                if (!artIdAsignado || artIdAsignado === 'NUEVO') {
                    const descLimpia = (it.descripcion || '').toLowerCase();
                    const coincidente = articulos.find(a => 
                        a.nombre && (a.nombre.toLowerCase().includes(descLimpia) || descLimpia.includes(a.nombre.toLowerCase()))
                    );
                    artIdAsignado = coincidente ? (coincidente.id_articulo || coincidente.id) : (articulos[0]?.id_articulo || '');
                }

                return {
                    id_temporal: idx + 1,
                    articuloId: artIdAsignado,
                    cantidad: Number(it.cantidad) || 1,
                    precioUnitario: Number(it.precio_unitario) || 0,
                    descuentoPorcentaje: Number(it.descuento_porcentaje) || 0,
                    descripcionOriginal: it.descripcion
                };
            });
            setItemsFactura(nuevosItems);
        }

        // Guardar el respaldo de imagen si viene desde la digitalización
        if (datosConfirmados.imagen_respaldo) {
            setImagenRespaldo(datosConfirmados.imagen_respaldo);
        }

        // Mensaje de éxito de precarga para guiar al usuario
        setBannerIAPrecargado({
            proveedor: provData?.razon_social || 'Proveedor Detectado',
            folio: datosConfirmados.numero_documento || 'Sin folio',
            totalItems: (datosConfirmados.items || []).length,
            tieneRespaldo: !!datosConfirmados.imagen_respaldo
        });
        setSuccessMsg(false);
        setErrorMsg('');
    };

    /**
     * Envía la factura con todos sus productos al backend para guardado definitivo y aumento de stock
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        const provObj = proveedores.find((p) => String(p.id_proveedor || p.id) === String(proveedorId));
        if (!provObj) {
            setErrorMsg('Debe seleccionar un proveedor válido.');
            return;
        }

        // Validar que cada ítem tenga artículo asignado y cantidad válida
        for (let i = 0; i < itemsFactura.length; i++) {
            const it = itemsFactura[i];
            const artObj = articulos.find((a) => String(a.id_articulo || a.id) === String(it.articuloId));
            if (!artObj) {
                setErrorMsg(`En la fila #${i + 1} debe seleccionar un material del catálogo.`);
                return;
            }
            if (Number(it.cantidad) <= 0) {
                setErrorMsg(`En la fila #${i + 1} la cantidad debe ser mayor a cero.`);
                return;
            }
        }

        const nroLimpio = String(numeroFactura).replace(/^FAC-/i, '').trim();
        const resumenDescuentos = [d1, d2, d3].filter((d) => Number(d) > 0).map((d) => `${d}%`).join(' + ');
        const textoMotivo = `Recepción Factura FAC-${nroLimpio} - ${provObj.razon_social}${resumenDescuentos ? ` (Desc. Global ${resumenDescuentos})` : ''}`;

        const primerArt = articulos.find(a => String(a.id_articulo || a.id) === String(itemsFactura[0].articuloId));

        // Estructura completa de la factura para la API
        const payloadFactura = {
            id_factura: nroLimpio,
            numero_documento: Number(nroLimpio) || 0,
            id_proveedor: provObj.id_proveedor,
            proveedor: provObj.razon_social,
            // Retrocompatibilidad con la API existente
            articulo_id: primerArt?.id_articulo,
            articulo_nombre: primerArt?.nombre,
            cantidad: Number(itemsFactura[0].cantidad),
            precio_unitario: Number(itemsFactura[0].precioUnitario),
            // Detalles multi-producto completos
            detalles: itemsFactura.map(it => ({
                id_articulo: it.articuloId,
                cantidad: Number(it.cantidad),
                precio_unitario: Number(it.precioUnitario),
                descuento_porcentaje: Number(it.descuentoPorcentaje) || 0
            })),
            neto,
            iva,
            total,
            documento: `FAC-${nroLimpio}`,
            motivo: textoMotivo,
            imagen_respaldo: imagenRespaldo || '',
        };

        try {
            if (onRegistrarFactura) {
                await onRegistrarFactura(payloadFactura);
            } else {
                // Modo independiente si no se proporciona callback padre
                for (const it of itemsFactura) {
                    const artObj = articulos.find((a) => String(a.id_articulo || a.id) === String(it.articuloId));
                    if (artObj) {
                        const nuevoStock = Number(artObj.stock_disponible) + Number(it.cantidad);
                        await actualizarArticulo(artObj.id_articulo, { ...artObj, stock_disponible: nuevoStock });
                    }
                }
                await cargarDatos();
            }

            setSuccessMsg(true);
            setImagenRespaldo('');
            setBannerIAPrecargado(null);
            setNumeroFactura('');
            setD1(0);
            setD2(0);
            setD3(0);
            const primerArtId = articulos.length > 0 ? (articulos[0].id_articulo || articulos[0].id) : '';
            setItemsFactura([
                { id_temporal: 1, articuloId: primerArtId, cantidad: 1, precioUnitario: 10000, descuentoPorcentaje: 0 }
            ]);
            setTimeout(() => setSuccessMsg(false), 5000);
        } catch {
            setErrorMsg('No se pudo registrar la factura ni actualizar el stock.');
        }
    };

    return (
        <div className="facturas-container">
            {/* CABECERA CON BOTÓN DE DIGITALIZACIÓN IA */}
            <div className="facturas-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="facturas-icon-badge">
                        <Receipt size={22} />
                    </div>
                    <div>
                        <h2 className="facturas-title">Ingreso de Facturas y Guías de Compra</h2>
                        <p className="facturas-subtitle">
                            Recepción multi-producto en bodega con detección IA, descuentos de línea, descuentos comerciales y actualización de stock.
                        </p>
                    </div>
                </div>
            </div>

            {errorMsg && <div className="alerta-error">{errorMsg}</div>}

            {bannerIAPrecargado && (
                <div style={{
                    background: '#f0fdf4', border: '1.5px solid #86efac', color: '#166534',
                    padding: '12px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: '10px', marginBottom: '14px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sparkles size={18} color="#15803d" />
                        <span style={{ fontSize: '13.5px' }}>
                            <strong>Documento cargado con éxito:</strong> Proveedor <em>"{bannerIAPrecargado.proveedor}"</em> vinculado, Folio <em>N° {bannerIAPrecargado.folio}</em> y <strong>{bannerIAPrecargado.totalItems} productos</strong> listos en la tabla para ingresar a bodega.
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {imagenRespaldo && (
                            <button
                                type="button"
                                onClick={() => setModalRespaldoAbierto(true)}
                                style={{
                                    background: '#15803d', color: '#ffffff', border: 'none',
                                    borderRadius: '6px', padding: '6px 12px', fontSize: '12px',
                                    fontWeight: 700, cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                                title="Ver escaneo del documento físico"
                            >
                                <Eye size={13} />
                                <span>Ver Respaldo Escaneado</span>
                            </button>
                        )}
                        <button 
                            type="button" 
                            onClick={() => setBannerIAPrecargado(null)} 
                            style={{ background: 'transparent', border: 'none', color: '#166534', cursor: 'pointer', fontWeight: 700, fontSize: '14px', padding: '4px' }}
                            title="Descartar aviso"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {successMsg && (
                <div className="facturas-success-alert">
                    <CheckCircle size={18} color="#10b981" />
                    <span>
                        <strong>Factura registrada con éxito:</strong> Se recibieron {itemsFactura.length} productos,
                        aumentando el stock en bodega por un valor neto de ${neto.toLocaleString('es-CL')}.
                    </span>
                </div>
            )}

            {/* FORMULARIO PRINCIPAL */}
            <form onSubmit={handleSubmit} className="facturas-main-grid">
                
                {/* COLUMNA IZQUIERDA: PROVEEDOR, FOLIO Y TABLA DE MATERIALES */}
                <div className="facturas-left-column">
                    <div className="facturas-fields-stack">
                        
                        {/* DATOS DE CABECERA */}
                        <div className="facturas-grid-row-2">
                            <div>
                                <label className="facturas-label">Proveedor Emisor</label>
                                <select 
                                    value={proveedorId} 
                                    onChange={(e) => setProveedorId(e.target.value)} 
                                    className="facturas-select" 
                                    required
                                >
                                    {proveedores.length === 0 ? (
                                        <option value="">No hay proveedores registrados</option>
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
                                    placeholder="Ej: 1203"
                                    required
                                />
                            </div>
                        </div>

                        {/* TABLA DE MATERIALES MULTI-PRODUCTO */}
                        <div style={{ marginTop: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label className="facturas-label" style={{ margin: 0, fontWeight: 700 }}>
                                    Detalle de Materiales Recibidos ({itemsFactura.length})
                                </label>
                                <button
                                    type="button"
                                    onClick={handleAgregarItem}
                                    style={{
                                        background: '#ecfdf5',
                                        border: '1px solid #a7f3d0',
                                        color: '#047857',
                                        borderRadius: '6px',
                                        padding: '4px 10px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Plus size={14} /> Agregar Material
                                </button>
                            </div>

                            <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569', textAlign: 'left' }}>
                                            <th style={{ padding: '8px 10px', width: '25px' }}>#</th>
                                            <th style={{ padding: '8px 10px' }}>Material / Repuesto</th>
                                            <th style={{ padding: '8px 10px', width: '65px', textAlign: 'center' }}>Cant.</th>
                                            <th style={{ padding: '8px 10px', width: '85px', textAlign: 'right' }}>P. Unit.</th>
                                            <th style={{ padding: '8px 10px', width: '60px', textAlign: 'center' }}>% Desc.</th>
                                            <th style={{ padding: '8px 10px', width: '90px', textAlign: 'right' }}>Total</th>
                                            <th style={{ padding: '8px 10px', width: '30px', textAlign: 'center' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itemsFactura.map((it, idx) => {
                                            const cant = Number(it.cantidad) || 0;
                                            const pu = Number(it.precioUnitario) || 0;
                                            const desc = Number(it.descuentoPorcentaje) || 0;
                                            const totalLinea = Math.round((cant * pu) * (1 - desc / 100));

                                            return (
                                                <tr key={it.id_temporal || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px 10px', color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <select
                                                            value={it.articuloId}
                                                            onChange={(e) => handleActualizarItem(idx, 'articuloId', e.target.value)}
                                                            className="facturas-select"
                                                            style={{ padding: '5px 8px', fontSize: '12px', width: '100%' }}
                                                            required
                                                        >
                                                            {categorias.length > 0 ? (
                                                                categorias.map((cat) => {
                                                                    const artsDeCat = articulos.filter(a => String(a.id_categoria || a.categoria_id) === String(cat.id_categoria));
                                                                    if (artsDeCat.length === 0) return null;
                                                                    return (
                                                                        <optgroup key={cat.id_categoria} label={cat.nombre}>
                                                                            {artsDeCat.map((a) => {
                                                                                const aId = a.id_articulo || a.id;
                                                                                const cod = a.codigo_barra || a.codigo_interno || `ART-${aId}`;
                                                                                return (
                                                                                    <option key={aId} value={aId}>
                                                                                        {a.nombre} ({cod})
                                                                                    </option>
                                                                                );
                                                                            })}
                                                                        </optgroup>
                                                                    );
                                                                })
                                                            ) : (
                                                                articulos.map((a) => {
                                                                    const aId = a.id_articulo || a.id;
                                                                    const cod = a.codigo_barra || a.codigo_interno || `ART-${aId}`;
                                                                    return (
                                                                        <option key={aId} value={aId}>
                                                                            {a.nombre} ({cod})
                                                                        </option>
                                                                    );
                                                                })
                                                            )}
                                                            {categorias.length > 0 && articulos.filter(a => !a.id_categoria && !a.categoria_id).length > 0 && (
                                                                <optgroup label="Otros Materiales">
                                                                    {articulos.filter(a => !a.id_categoria && !a.categoria_id).map((a) => {
                                                                        const aId = a.id_articulo || a.id;
                                                                        const cod = a.codigo_barra || a.codigo_interno || `ART-${aId}`;
                                                                        return (
                                                                            <option key={aId} value={aId}>
                                                                                {a.nombre} ({cod})
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </optgroup>
                                                            )}
                                                        </select>
                                                        {it.descripcionOriginal && (
                                                            <div style={{ fontSize: '10.5px', color: '#047857', marginTop: '2px' }}>
                                                                Doc: {it.descripcionOriginal}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={it.cantidad}
                                                            onChange={(e) => handleActualizarItem(idx, 'cantidad', e.target.value)}
                                                            style={{ width: '55px', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '12px' }}
                                                            required
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={it.precioUnitario}
                                                            onChange={(e) => handleActualizarItem(idx, 'precioUnitario', e.target.value)}
                                                            style={{ width: '75px', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right', fontSize: '12px' }}
                                                            required
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="99"
                                                            value={it.descuentoPorcentaje}
                                                            onChange={(e) => handleActualizarItem(idx, 'descuentoPorcentaje', e.target.value)}
                                                            style={{ width: '45px', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '12px', background: it.descuentoPorcentaje > 0 ? '#fef3c7' : '#ffffff' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                                        ${totalLinea.toLocaleString('es-CL')}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEliminarItem(idx)}
                                                            disabled={itemsFactura.length <= 1}
                                                            style={{ background: 'transparent', border: 'none', color: itemsFactura.length <= 1 ? '#cbd5e1' : '#ef4444', cursor: itemsFactura.length <= 1 ? 'not-allowed' : 'pointer', padding: '2px' }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="facturas-info-box">
                            Al confirmar esta factura, el sistema sumará automáticamente las unidades recibidas de cada uno de los
                            materiales al stock disponible en bodega y registrará los movimientos de entrada en el Historial General.
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: DESCUENTOS Y TOTALES */}
                <div className="facturas-right-column">
                    <div className="facturas-discounts-panel">
                        <div>
                            <div className="facturas-discounts-title">
                                <Calculator size={16} />
                                <span>Descuentos comerciales adicionales con proveedor:</span>
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
                            <div className="facturas-total-item">
                                <div className="facturas-total-label">Subtotal Bruto ({itemsFactura.length} prod.)</div>
                                <div className="facturas-total-bruto">${subtotalBruto.toLocaleString('es-CL')}</div>
                            </div>

                            {totalDescuentosLinea > 0 && (
                                <div className="facturas-total-item" style={{ color: '#b45309' }}>
                                    <div className="facturas-total-label">Descuentos por Línea</div>
                                    <div className="facturas-total-bruto">-${totalDescuentosLinea.toLocaleString('es-CL')}</div>
                                </div>
                            )}

                            <div className="facturas-total-item highlight">
                                <div className="facturas-total-label">Neto c/ Descuentos</div>
                                <div className="facturas-total-neto">${neto.toLocaleString('es-CL')}</div>
                            </div>

                            <div className="facturas-total-item">
                                <div className="facturas-total-label">IVA (19%)</div>
                                <div className="facturas-total-iva">${iva.toLocaleString('es-CL')}</div>
                            </div>

                            <div className="facturas-total-item highlight">
                                <div className="facturas-total-label">Total a Pagar Factura</div>
                                <div className="facturas-total-final">${total.toLocaleString('es-CL')}</div>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="facturas-btn-submit">
                        <Plus size={18} />
                        <span>Guardar Factura y Sumar al Stock ({itemsFactura.length} productos)</span>
                    </button>
                </div>
            </form>

            {/* MODAL VISTA PREVIA DEL RESPALDO FÍSICO ESCANEADO */}
            {modalRespaldoAbierto && imagenRespaldo && (
                <div className="compras-modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="compras-modal-card" style={{ maxWidth: '820px', width: '92vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '14px', overflow: 'hidden' }}>
                        <div style={{ background: '#047857', color: '#ffffff', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Receipt size={20} />
                                <strong style={{ fontSize: '15px' }}>Respaldo Físico Escaneado - Folio N° {numeroFactura || 'S/N'}</strong>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setModalRespaldoAbierto(false)} 
                                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, textAlign: 'center', background: '#0f172a' }}>
                            <img 
                                src={imagenRespaldo} 
                                alt="Respaldo Físico" 
                                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.5)' }} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
