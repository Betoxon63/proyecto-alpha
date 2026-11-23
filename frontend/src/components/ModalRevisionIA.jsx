/**
 * Componente Modal: ModalRevisionIA
 * 
 * Propósito:
 * Proporciona una interfaz visual e interactiva para revisar, validar y ajustar los datos
 * extraídos automáticamente por el modelo de visión local Ollama (qwen2.5vl:3b) antes de
 * incorporarlos formalmente al sistema de compras e inventario de FYAG SpA.
 * 
 * Características principales:
 * 1. Respaldo Visual: Muestra una vista previa de la foto o escaneo del documento físico.
 * 2. Validación de Entidades: Identifica al Proveedor Emisor y al Cliente Receptor. Si son
 *    nuevos, permite registrarlos en sus respectivos módulos con un solo clic.
 * 3. Tabla Interactiva de Materiales: Permite editar cantidades, precios unitarios, porcentajes
 *    de descuento por línea o reasignar el artículo al catálogo oficial.
 * 4. Desglose Financiero: Calcula en tiempo real el Subtotal Bruto, Descuentos de Línea,
 *    Neto, IVA (19%) y Total General.
 * 5. Derivación Automática: Al confirmar, inyecta los datos directamente en el formulario
 *    de Ingreso de Facturas y activa la recepción multi-producto.
 */

import React, { useState, useEffect } from 'react';
import { 
    X, CheckCircle, AlertTriangle, Building2, Receipt, 
    Layers, Plus, Trash2, Eye, EyeOff, Sparkles, UserPlus, 
    Edit2, Save, Loader2, Check, Tag 
} from 'lucide-react';
import { formatearRutVisual, limpiarRutParaGuardar } from '../pages/GestionUsuariosView';
import { crearProveedor, obtenerCategorias, obtenerUnidades, crearArticulo } from '../services_api/inventarioService';
import '../styles/ComprasView.css';

// Deduce la categoría adecuada a partir de palabras clave en la descripción del material
const inferirCategoriaId = (descripcion, cats) => {
    if (!cats || cats.length === 0) return '';
    const desc = (descripcion || '').toLowerCase();
    if (/cemento|árido|arido|hormig|yeso|cal\b/i.test(desc)) {
        const c = cats.find(x => /cemento|árido|arido|básico/i.test(x.nombre));
        if (c) return c.id_categoria;
    }
    if (/fierro|acero|barra|estriad/i.test(desc)) {
        const c = cats.find(x => /acero|fierro/i.test(x.nombre));
        if (c) return c.id_categoria;
    }
    if (/malla|acma|alambre/i.test(desc)) {
        const c = cats.find(x => /malla|estructura/i.test(x.nombre));
        if (c) return c.id_categoria;
    }
    if (/placa|osb|madera|pino|terciado|viga/i.test(desc)) {
        const c = cats.find(x => /madera|tablero/i.test(x.nombre));
        if (c) return c.id_categoria;
    }
    if (/clavo|tornillo|perno|fijaci|ferreter/i.test(desc)) {
        const c = cats.find(x => /fijaci|ferreter/i.test(x.nombre));
        if (c) return c.id_categoria;
    }
    if (/pintura|esmalte|brocha|rodillo|terminaci/i.test(desc)) {
        const c = cats.find(x => /terminaci|pintura/i.test(x.nombre));
        if (c) return c.id_categoria;
    }
    const cBasico = cats.find(x => /básico|general/i.test(x.nombre));
    return cBasico ? cBasico.id_categoria : cats[0].id_categoria;
};

// Deduce la unidad de medida según el texto de unidad del documento
const inferirUnidadId = (unidadTexto, unis) => {
    if (!unis || unis.length === 0) return 1;
    const uNorm = String(unidadTexto || '').toUpperCase().trim();
    const uMatch = unis.find(u => u.nombre.toUpperCase() === uNorm || uNorm.includes(u.nombre.toUpperCase()));
    if (uMatch) return uMatch.id_unidad_medida;
    const uUn = unis.find(u => u.nombre.toUpperCase() === 'UN');
    return uUn ? uUn.id_unidad_medida : unis[0].id_unidad_medida;
};

export default function ModalRevisionIA({
    datos,                      // Objeto JSON extraído (proveedor, documento, items, totales)
    imagenSrc,                  // URL o Base64 de la imagen para vista previa
    articulosDisponibles = [],  // Catálogo completo de materiales para asociar en selectores
    categoriasDisponibles = [], // Categorías del sistema
    unidadesDisponibles = [],   // Unidades de medida
    clientesDisponibles = [],   // Clientes mandantes registrados en el sistema
    onConfirmar,                // Callback que recibe los datos validados para cargar la factura
    onCerrar,                   // Callback para cancelar y cerrar el modal (Descartar)
    onRegistrarProveedor = null,// Callback legado (opcional)
    onRegistrarCliente = null,  // Callback para abrir el formulario de nuevo cliente precargado
    onProveedorCreado = null,   // Notifica al componente padre cuando se registra un proveedor exitosamente
    onArticuloCreado = null     // Notifica al componente padre cuando se registra un nuevo artículo
}) {
    // Control de visibilidad de la imagen escaneada
    const [verImagen, setVerImagen] = useState(true);

    // Listas maestras de categorías y unidades
    const [categorias, setCategorias] = useState(categoriasDisponibles || []);
    const [unidades, setUnidades] = useState(unidadesDisponibles || []);

    // Cargar categorías y unidades si no vienen en props
    useEffect(() => {
        const cargarMetadatos = async () => {
            try {
                if (!categorias.length) {
                    const resCat = await obtenerCategorias();
                    setCategorias(resCat.data || []);
                }
                if (!unidades.length) {
                    const resUni = await obtenerUnidades();
                    setUnidades(resUni.data || []);
                }
            } catch (e) {
                console.warn('Error cargando categorías o unidades:', e);
            }
        };
        cargarMetadatos();
    }, []);

    // Estado reactivo del Proveedor detectado
    const [prov, setProv] = useState({
        razon_social: datos?.proveedor?.razon_social || '',
        rut: datos?.proveedor?.rut || '',
        direccion: datos?.proveedor?.direccion || '',
        comuna: datos?.proveedor?.comuna || '',
        ciudad: datos?.proveedor?.ciudad || '',
        region: datos?.proveedor?.region || 'Ñuble',
        existe_db: datos?.proveedor?.existe_db ?? !datos?.proveedor?.es_nuevo,
        id_proveedor: datos?.proveedor?.id_proveedor || datos?.proveedor?.id_proveedor_db || null
    });
    const [editandoProv, setEditandoProv] = useState(false);
    const [guardandoProv, setGuardandoProv] = useState(false);
    const [msgProv, setMsgProv] = useState('');
    const [errorProv, setErrorProv] = useState('');

    // Función auxiliar para inicializar la lista de materiales
    const mapearItemsIniciales = () => {
        return (datos?.items || []).map((it, idx) => {
            const descLimpia = (it.descripcion || '').toLowerCase().trim();
            const coincidente = articulosDisponibles.find(a => {
                const n = (a.nombre || '').toLowerCase().trim();
                return n === descLimpia || (n.length > 5 && (descLimpia.includes(n) || n.includes(descLimpia)));
            });

            const esNuevo = !coincidente;
            const idArt = coincidente ? (coincidente.id_articulo || coincidente.id) : 'NUEVO';
            const idCat = coincidente 
                ? (coincidente.id_categoria || coincidente.categoria_id || inferirCategoriaId(it.descripcion, categorias))
                : inferirCategoriaId(it.descripcion, categorias);
            const idUni = inferirUnidadId(it.unidad_medida, unidades);

            const cant = Number(it.cantidad) || 1;
            const pu = Number(it.precio_unitario) || 0;
            const descPct = Number(it.descuento_porcentaje) || 0;
            const subt = cant * pu;
            const descM = descPct > 0 ? Math.round(subt * (descPct / 100)) : (Number(it.descuento_monto) || 0);
            const total = subt - descM;

            return {
                id_temporal: idx + 1,
                codigo: it.codigo || '',
                descripcion: it.descripcion || '',
                id_articulo: idArt,
                es_nuevo: esNuevo,
                id_categoria: idCat,
                id_unidad_medida: idUni,
                cantidad: cant,
                unidad_medida: it.unidad_medida || 'UN',
                precio_unitario: pu,
                descuento_porcentaje: descPct,
                descuento_monto: descM,
                total: total
            };
        });
    };

    // Lista interactiva de materiales extraídos del documento
    const [items, setItems] = useState(mapearItemsIniciales());

    // Sincronizar categorías si se cargaron asincrónicamente
    useEffect(() => {
        if (categorias.length > 0) {
            setItems(prev => prev.map(it => {
                if (!it.id_categoria || it.id_categoria === '') {
                    return { ...it, id_categoria: inferirCategoriaId(it.descripcion, categorias) };
                }
                return it;
            }));
        }
    }, [categorias]);

    // Campos del documento (folio y fecha de emisión)
    const [numeroDocumento, setNumeroDocumento] = useState(datos?.documento?.numero_documento || '');
    const [fechaEmision, setFechaEmision] = useState(datos?.documento?.fecha || '');

    /**
     * Actualiza un campo de una fila específica y recalcula el monto de descuento y total de la línea.
     */
    const actualizarFila = (index, campo, valor) => {
        setItems(prev => {
            const copia = [...prev];
            copia[index] = { ...copia[index], [campo]: valor };
            
            // Recalcular total de línea cuando cambia cantidad, precio o % de descuento
            const cant = Number(campo === 'cantidad' ? valor : copia[index].cantidad);
            const pu = Number(campo === 'precio_unitario' ? valor : copia[index].precio_unitario);
            const desc = Number(campo === 'descuento_porcentaje' ? valor : copia[index].descuento_porcentaje);
            
            const subt = cant * pu;
            const descMonto = subt * (desc / 100);
            copia[index].descuento_monto = Math.round(descMonto);
            copia[index].total = Math.round(subt - descMonto);
            
            return copia;
        });
    };

    /**
     * Elimina un ítem de la tabla (siempre mantiene al menos una fila).
     */
    const eliminarFila = (index) => {
        if (items.length <= 1) return;
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    /**
     * Añade manualmente una fila vacía a la tabla de materiales.
     */
    const agregarFila = () => {
        const catDef = categorias.length > 0 ? categorias[0].id_categoria : 1;
        const uniDef = unidades.length > 0 ? unidades[0].id_unidad_medida : 1;
        setItems(prev => [
            ...prev,
            {
                id_temporal: Date.now(),
                codigo: '',
                descripcion: 'Nuevo material',
                id_articulo: 'NUEVO',
                es_nuevo: true,
                id_categoria: catDef,
                id_unidad_medida: uniDef,
                cantidad: 1,
                unidad_medida: 'UN',
                precio_unitario: 10000,
                descuento_porcentaje: 0,
                descuento_monto: 0,
                total: 10000
            }
        ]);
    };

    // Cálculos financieros globales en tiempo real
    const subtotalBruto = items.reduce((acc, it) => acc + (Number(it.cantidad) * Number(it.precio_unitario)), 0);
    const totalDescuentosLinea = items.reduce((acc, it) => acc + (Number(it.descuento_monto) || 0), 0);
    const netoCalculado = subtotalBruto - totalDescuentosLinea;
    const ivaCalculado = Math.round(netoCalculado * 0.19);
    const totalFinal = netoCalculado + ivaCalculado;

    /**
     * Registra el proveedor directamente en la base de datos sin cerrar el modal
     * para que ningún material ni dato del documento se pierda.
     */
    const handleRegistrarProveedorDirecto = async () => {
        if (!prov.rut || !prov.razon_social) {
            setErrorProv('Se requiere RUT y Razón Social del proveedor.');
            return;
        }

        setGuardandoProv(true);
        setErrorProv('');
        setMsgProv('');

        try {
            const payload = {
                rut: limpiarRutParaGuardar(prov.rut),
                razon_social: prov.razon_social.trim(),
                direccion: prov.direccion?.trim() || 'Sin dirección',
                region: prov.region || 'Ñuble',
                comuna: prov.comuna?.trim() || 'Sin comuna',
                ciudad: prov.ciudad?.trim() || 'Sin ciudad'
            };
            const res = await crearProveedor(payload);
            const nuevo = res.data;
            const provActualizado = {
                ...prov,
                ...nuevo,
                existe_db: true,
                id_proveedor: nuevo.id_proveedor || nuevo.id
            };
            setProv(provActualizado);
            setMsgProv(`✓ Proveedor "${nuevo.razon_social}" registrado con éxito en el sistema.`);
            setEditandoProv(false);
            if (onProveedorCreado) {
                onProveedorCreado(nuevo);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.rut?.[0] || err.response?.data?.detail || err.message || 'Error al guardar proveedor';
            setErrorProv(errorMsg);
        } finally {
            setGuardandoProv(false);
        }
    };

    /**
     * Envía los datos validados al componente padre para cargarlos en la factura.
     * Si hay artículos marcados como 'NUEVO', los crea automáticamente en el catálogo
     * asignándoles la categoría seleccionada por el usuario.
     */
    const handleConfirmar = async () => {
        let provFinal = { ...prov };

        // 1. Auto-registro de proveedor si aún no está guardado
        if (!provFinal.id_proveedor && !provFinal.existe_db && provFinal.rut && provFinal.razon_social) {
            setGuardandoProv(true);
            try {
                const payload = {
                    rut: limpiarRutParaGuardar(provFinal.rut),
                    razon_social: provFinal.razon_social.trim(),
                    direccion: provFinal.direccion?.trim() || 'Sin dirección',
                    region: provFinal.region || 'Ñuble',
                    comuna: provFinal.comuna?.trim() || 'Sin comuna',
                    ciudad: provFinal.ciudad?.trim() || 'Sin ciudad'
                };
                const res = await crearProveedor(payload);
                const nuevo = res.data;
                provFinal = {
                    ...provFinal,
                    ...nuevo,
                    id_proveedor: nuevo.id_proveedor || nuevo.id,
                    existe_db: true
                };
                setProv(provFinal);
                if (onProveedorCreado) {
                    onProveedorCreado(nuevo);
                }
            } catch (err) {
                console.warn('Auto-registro de proveedor previo falló:', err);
            } finally {
                setGuardandoProv(false);
            }
        }

        // 2. Registro automático de artículos nuevos con su categoría
        const itemsValidados = [...items];
        for (let i = 0; i < itemsValidados.length; i++) {
            const it = itemsValidados[i];
            if (it.id_articulo === 'NUEVO' || it.es_nuevo) {
                try {
                    const baseTimestamp = Date.now().toString().slice(-7);
                    const codBarra = Number(`${baseTimestamp}${i + 1}`);
                    const catId = it.id_categoria || (categorias.length > 0 ? categorias[0].id_categoria : 1);
                    const uniId = it.id_unidad_medida || (unidades.length > 0 ? unidades[0].id_unidad_medida : 1);
                    
                    const resArt = await crearArticulo({
                        nombre: it.descripcion.trim(),
                        codigo_barra: codBarra,
                        id_categoria: catId,
                        id_unidad_medida: uniId,
                        ubicacion: 'Bodega Central',
                        stock_disponible: 0,
                        stock_minimo: 5,
                        stock_comprometido: 0,
                        precio: it.precio_unitario
                    });

                    const artCreado = resArt.data;
                    itemsValidados[i].id_articulo = artCreado.id_articulo;
                    itemsValidados[i].es_nuevo = false;
                    if (onArticuloCreado) {
                        onArticuloCreado(artCreado);
                    }
                } catch (eArt) {
                    console.warn(`Error registrando artículo "${it.descripcion}":`, eArt);
                    // Si ya existía o falla la creación, intenta asociar al primer artículo disponible
                    if (articulosDisponibles.length > 0 && itemsValidados[i].id_articulo === 'NUEVO') {
                        itemsValidados[i].id_articulo = articulosDisponibles[0].id_articulo || articulosDisponibles[0].id;
                    }
                }
            }
        }

        onConfirmar({
            proveedor: provFinal,
            numero_documento: numeroDocumento,
            fecha: fechaEmision,
            items: itemsValidados,
            imagen_respaldo: imagenSrc,
            totales: {
                bruto: subtotalBruto,
                descuento_lineas: totalDescuentosLinea,
                neto: netoCalculado,
                iva: ivaCalculado,
                total: totalFinal
            }
        });
    };

    return (
        <div className="compras-modal-overlay">
            <div className="compras-modal-card" style={{ maxWidth: '1060px', width: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
                
                {/* 1. CABECERA DEL MODAL */}
                <div className="compras-modal-header" style={{ background: '#047857', color: '#ffffff', padding: '16px 20px', borderRadius: '15px 15px 0 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '8px' }}>
                            <Sparkles size={20} color="#ffffff" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                                Revisión de Documento Digitalizado con IA
                            </h3>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.9 }}>
                                {datos?.motor_ia ? `Motor: ${datos.motor_ia}` : 'Modelo de Visión Artificial'} • Valida y confirma los datos antes de cargarlos
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onCerrar} style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }} title="Cerrar modal">
                        <X size={20} />
                    </button>
                </div>

                {/* 2. CUERPO CON SCROLL */}
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    
                    {/* PANEL DE ENTIDADES Y DOCUMENTO */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                        
                        {/* TARJETA DEL PROVEEDOR EMISOR */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Building2 size={14} color="#047857" /> Proveedor Emisor
                                </span>
                                {prov.existe_db ? (
                                    <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                                        ✓ En Sistema
                                    </span>
                                ) : (
                                    <span style={{ fontSize: '11px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                                        Nuevo Proveedor
                                    </span>
                                )}
                            </div>

                            {msgProv && (
                                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                                    {msgProv}
                                </div>
                            )}

                            {errorProv && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', marginBottom: '8px' }}>
                                    {errorProv}
                                </div>
                            )}

                            {editandoProv ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Razón Social</label>
                                        <input
                                            type="text"
                                            value={prov.razon_social}
                                            onChange={(e) => setProv({ ...prov, razon_social: e.target.value })}
                                            style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>RUT</label>
                                        <input
                                            type="text"
                                            value={prov.rut}
                                            onChange={(e) => setProv({ ...prov, rut: e.target.value })}
                                            style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Dirección</label>
                                            <input
                                                type="text"
                                                value={prov.direccion}
                                                onChange={(e) => setProv({ ...prov, direccion: e.target.value })}
                                                style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Comuna / Ciudad</label>
                                            <input
                                                type="text"
                                                value={prov.ciudad || prov.comuna}
                                                onChange={(e) => setProv({ ...prov, comuna: e.target.value, ciudad: e.target.value })}
                                                style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                        <button
                                            type="button"
                                            onClick={handleRegistrarProveedorDirecto}
                                            disabled={guardandoProv}
                                            style={{
                                                flex: 1, background: '#047857', color: '#ffffff', border: 'none', borderRadius: '6px',
                                                padding: '6px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                            }}
                                        >
                                            {guardandoProv ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                            <span>Guardar Proveedor</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditandoProv(false)}
                                            style={{ background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                                        {prov.razon_social || 'Proveedor Desconocido'}
                                    </div>
                                    <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                                        RUT: <strong>{formatearRutVisual(prov.rut) || prov.rut || 'No detectado'}</strong>
                                    </div>
                                    {prov.direccion && (
                                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                                            {prov.direccion} {prov.ciudad ? `• ${prov.ciudad}` : ''}
                                        </div>
                                    )}

                                    {!prov.existe_db && (
                                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                onClick={handleRegistrarProveedorDirecto}
                                                disabled={guardandoProv}
                                                style={{
                                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                    background: '#047857', border: 'none', color: '#ffffff', borderRadius: '6px', padding: '7px 10px',
                                                    fontSize: '12px', fontWeight: 700, cursor: guardandoProv ? 'not-allowed' : 'pointer',
                                                    boxShadow: '0 1px 2px rgba(4, 120, 87, 0.2)'
                                                }}
                                                title="Registrar en la base de datos sin cerrar este modal"
                                            >
                                                {guardandoProv ? (
                                                    <>
                                                        <Loader2 size={13} className="animate-spin" />
                                                        <span>Registrando...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserPlus size={13} />
                                                        <span>Registrar Proveedor con 1 Clic</span>
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditandoProv(true)}
                                                style={{
                                                    background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '6px',
                                                    padding: '7px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                                }}
                                                title="Modificar datos antes de registrar"
                                            >
                                                <Edit2 size={12} />
                                                <span>Editar</span>
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* TARJETA DE DATOS DEL DOCUMENTO SII */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Receipt size={14} color="#047857" /> Documento SII
                                </span>
                                <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                                    {datos?.documento?.tipo || 'Guía de Despacho'}
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>N° Folio / Factura</label>
                                    <input 
                                        type="text" 
                                        value={numeroDocumento} 
                                        onChange={(e) => setNumeroDocumento(e.target.value)}
                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, marginTop: '2px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>Fecha Emisión</label>
                                    <input 
                                        type="text" 
                                        value={fechaEmision} 
                                        onChange={(e) => setFechaEmision(e.target.value)}
                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginTop: '2px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            {datos?.cliente_receptor?.nombre && (
                                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '8px' }}>
                                    Receptor: <strong>{datos.cliente_receptor.nombre}</strong>
                                </div>
                            )}
                        </div>

                        {/* TARJETA DEL CLIENTE RECEPTOR (OBRA / MANDANTE) */}
                        {datos?.cliente_receptor?.nombre && (() => {
                            const docRut = String(datos.cliente_receptor.rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
                            const docNom = String(datos.cliente_receptor.nombre || '').toLowerCase().trim();
                            const clienteEncontrado = clientesDisponibles.find(c => {
                                const cRut = String(c.rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
                                const cNom = String(c.razon_social || '').toLowerCase().trim();
                                return (docRut && cRut && (cRut === docRut || cRut.includes(docRut) || docRut.includes(cRut))) ||
                                       (cNom && docNom && (cNom === docNom || cNom.includes(docNom) || docNom.includes(cNom)));
                            });

                            return (
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Building2 size={14} color="#2563eb" /> Cliente Receptor
                                        </span>
                                        {clienteEncontrado ? (
                                            <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                                                ✓ En Sistema
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                                                Nuevo Mandante
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                                        {datos.cliente_receptor.nombre}
                                    </div>
                                    {datos.cliente_receptor.rut && (
                                        <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                                            RUT: <strong>{formatearRutVisual(datos.cliente_receptor.rut)}</strong>
                                        </div>
                                    )}
                                    {datos.cliente_receptor.direccion && (
                                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                                            {datos.cliente_receptor.direccion}
                                        </div>
                                    )}
                                    {/* Botón para registrar el cliente mandante sin cerrar la sesión de digitalización */}
                                    {!clienteEncontrado && onRegistrarCliente && (
                                        <button
                                            type="button"
                                            onClick={() => onRegistrarCliente(datos.cliente_receptor)}
                                            style={{
                                                marginTop: '10px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', borderRadius: '6px', padding: '6px 10px',
                                                fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                                            }}
                                            title="Abrir formulario para registrar cliente sin perder los datos de este documento"
                                        >
                                            <UserPlus size={14} /> Registrar como Cliente Mandante
                                        </button>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* VISTA PREVIA COLAPSABLE DE LA FOTO DEL DOCUMENTO */}
                    {imagenSrc && (
                        <div style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                                    📸 Respaldo visual escaneado
                                </span>
                                <button 
                                    type="button" 
                                    onClick={() => setVerImagen(!verImagen)}
                                    style={{ background: 'transparent', border: 'none', color: '#047857', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    {verImagen ? <EyeOff size={14} /> : <Eye size={14} />}
                                    {verImagen ? 'Ocultar foto' : 'Ver documento'}
                                </button>
                            </div>
                            {verImagen && (
                                <div style={{ marginTop: '8px', textAlign: 'center', maxHeight: '180px', overflowY: 'auto', background: '#0f172a', borderRadius: '6px', padding: '6px' }}>
                                    <img src={imagenSrc} alt="Documento escaneado" style={{ maxHeight: '160px', maxWidth: '100%', objectFit: 'contain' }} />
                                </div>
                            )}
                        </div>
                    )}

                    {/* TABLA EDITABLE DE PRODUCTOS EXTRAÍDOS */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Layers size={16} color="#047857" /> Materiales Detectados ({items.length})
                            </div>
                            <button
                                type="button"
                                onClick={agregarFila}
                                style={{
                                    background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857',
                                    borderRadius: '6px', padding: '4px 10px', fontSize: '12px', fontWeight: 700,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                            >
                                <Plus size={14} /> Agregar Fila
                            </button>
                        </div>

                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                                        <th style={{ padding: '8px 8px', width: '25px', textAlign: 'center' }}>#</th>
                                        <th style={{ padding: '8px 8px' }}>Descripción Escaneada</th>
                                        <th style={{ padding: '8px 8px', width: '170px' }}>Categoría</th>
                                        <th style={{ padding: '8px 8px', width: '220px' }}>Asignar al Catálogo</th>
                                        <th style={{ padding: '8px 6px', width: '60px', textAlign: 'center' }}>Cant.</th>
                                        <th style={{ padding: '8px 6px', width: '80px', textAlign: 'right' }}>P. Unit.</th>
                                        <th style={{ padding: '8px 6px', width: '60px', textAlign: 'center' }}>% Desc.</th>
                                        <th style={{ padding: '8px 8px', width: '85px', textAlign: 'right' }}>Total</th>
                                        <th style={{ padding: '8px 6px', width: '30px', textAlign: 'center' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it, idx) => (
                                        <tr key={it.id_temporal || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px 8px', color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>{idx + 1}</td>
                                            <td style={{ padding: '8px 8px' }}>
                                                <input
                                                    type="text"
                                                    value={it.descripcion}
                                                    onChange={(e) => actualizarFila(idx, 'descripcion', e.target.value)}
                                                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 6px', fontSize: '12px', boxSizing: 'border-box' }}
                                                />
                                                {it.codigo && (
                                                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                                                        Cód: <strong>{it.codigo}</strong>
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px 8px' }}>
                                                <select
                                                    value={it.id_categoria}
                                                    onChange={(e) => actualizarFila(idx, 'id_categoria', Number(e.target.value))}
                                                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 6px', fontSize: '11.5px', background: '#f8fafc', fontWeight: 600, color: '#334155' }}
                                                >
                                                    {categorias.map(c => (
                                                        <option key={c.id_categoria} value={c.id_categoria}>
                                                            {c.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td style={{ padding: '8px 8px' }}>
                                                <select
                                                    value={it.id_articulo}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === 'NUEVO') {
                                                            actualizarFila(idx, 'id_articulo', 'NUEVO');
                                                            actualizarFila(idx, 'es_nuevo', true);
                                                        } else {
                                                            actualizarFila(idx, 'id_articulo', val);
                                                            actualizarFila(idx, 'es_nuevo', false);
                                                            const artMatch = articulosDisponibles.find(a => String(a.id_articulo || a.id) === String(val));
                                                            if (artMatch && (artMatch.id_categoria || artMatch.categoria_id)) {
                                                                actualizarFila(idx, 'id_categoria', artMatch.id_categoria || artMatch.categoria_id);
                                                            }
                                                        }
                                                    }}
                                                    style={{
                                                        width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px',
                                                        padding: '4px 6px', fontSize: '11.5px',
                                                        background: it.es_nuevo ? '#ecfdf5' : '#ffffff',
                                                        color: it.es_nuevo ? '#047857' : '#1e293b',
                                                        fontWeight: it.es_nuevo ? 700 : 400
                                                    }}
                                                >
                                                    <option value="NUEVO">✨ Registrar como nuevo en catálogo</option>
                                                    {categorias.map(cat => {
                                                        const artsDeCat = articulosDisponibles.filter(a => String(a.id_categoria || a.categoria_id) === String(cat.id_categoria));
                                                        if (artsDeCat.length === 0) return null;
                                                        return (
                                                            <optgroup key={cat.id_categoria} label={cat.nombre}>
                                                                {artsDeCat.map(a => {
                                                                    const idVal = a.id_articulo || a.id;
                                                                    return (
                                                                        <option key={idVal} value={idVal}>
                                                                            {a.nombre} ({a.codigo_barra || `ART-${idVal}`})
                                                                        </option>
                                                                    );
                                                                })}
                                                            </optgroup>
                                                        );
                                                    })}
                                                    {articulosDisponibles.filter(a => !a.id_categoria && !a.categoria_id).length > 0 && (
                                                        <optgroup label="Otros Artículos">
                                                            {articulosDisponibles.filter(a => !a.id_categoria && !a.categoria_id).map(a => {
                                                                const idVal = a.id_articulo || a.id;
                                                                return (
                                                                    <option key={idVal} value={idVal}>
                                                                        {a.nombre} ({a.codigo_barra || `ART-${idVal}`})
                                                                    </option>
                                                                );
                                                            })}
                                                        </optgroup>
                                                    )}
                                                </select>
                                                {it.es_nuevo && (
                                                    <span style={{ fontSize: '10px', color: '#047857', display: 'block', marginTop: '2px', fontWeight: 600 }}>
                                                        ● Se creará en catálogo bajo la categoría elegida
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={it.cantidad}
                                                    onChange={(e) => actualizarFila(idx, 'cantidad', e.target.value)}
                                                    style={{ width: '55px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '12px', textAlign: 'center' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={it.precio_unitario}
                                                    onChange={(e) => actualizarFila(idx, 'precio_unitario', e.target.value)}
                                                    style={{ width: '75px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '12px', textAlign: 'right' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="99"
                                                    value={it.descuento_porcentaje}
                                                    onChange={(e) => actualizarFila(idx, 'descuento_porcentaje', e.target.value)}
                                                    style={{ width: '45px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px', fontSize: '12px', textAlign: 'center', background: it.descuento_porcentaje > 0 ? '#fef3c7' : '#ffffff', fontWeight: it.descuento_porcentaje > 0 ? 700 : 400 }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                                ${it.total.toLocaleString('es-CL')}
                                            </td>
                                            <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => eliminarFila(idx)}
                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                                                    title="Eliminar fila"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* RESUMEN DE TOTALES FINANCIEROS */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                <span>Subtotal Bruto:</span>
                                <span>${subtotalBruto.toLocaleString('es-CL')}</span>
                            </div>
                            {totalDescuentosLinea > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontWeight: 600 }}>
                                    <span>Descuentos Ítems:</span>
                                    <span>-${totalDescuentosLinea.toLocaleString('es-CL')}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontWeight: 600, borderTop: '1px solid #cbd5e1', paddingTop: '4px' }}>
                                <span>Neto Documento:</span>
                                <span>${netoCalculado.toLocaleString('es-CL')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                                <span>IVA (19%):</span>
                                <span>${ivaCalculado.toLocaleString('es-CL')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857', fontWeight: 800, fontSize: '15px', borderTop: '2px solid #047857', paddingTop: '4px' }}>
                                <span>Total General:</span>
                                <span>${totalFinal.toLocaleString('es-CL')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. BARRA DE ACCIONES INFERIOR */}
                <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '0 0 15px 15px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        type="button"
                        onClick={onCerrar}
                        style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Descartar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmar}
                        style={{ background: '#047857', border: 'none', color: '#ffffff', borderRadius: '8px', padding: '9px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <CheckCircle size={16} /> Confirmar y Cargar a Facturas
                    </button>
                </div>
            </div>
        </div>
    );
}
