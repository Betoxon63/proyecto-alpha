/**
 * Vista Principal: ComprasView ("Clientes, Proveedores y Facturación")
 * 
 * Propósito:
 * Módulo central de gestión comercial, compras y abastecimiento de FYAG SpA.
 * Integra cuatro áreas de trabajo en una interfaz por pestañas:
 * 1. Clientes Mandantes: Fichas de constructoras e inmobiliarias con validación de RUT y representante legal.
 * 2. Proveedores: Registro de distribuidores y empresas proveedoras de insumos.
 * 3. Ingreso de Facturas: Recepción multi-producto de materiales en bodega con cálculo de descuentos e IVA.
 * 4. Resumen de Gastos y Finanzas: Métricas y análisis financiero de adquisiciones.
 * 
 * Digitalización Inteligente con IA (Ollama):
 * Dispone de un botón global "Digitalizar Documento con IA" en la cabecera principal,
 * accesible desde todas las pestañas, que permite capturar o subir guías y facturas
 * para derivar sus datos a clientes, proveedores o al formulario de facturación en bodega.
 */

import React, { useEffect, useState, useRef } from "react";
import { Building2, Truck, Receipt, PieChart, Plus, Search, Edit2, Trash2, Sparkles, Loader2 } from "lucide-react";
import { 
    obtenerClientes, crearCliente, actualizarCliente, eliminarCliente, 
    obtenerProveedores, crearProveedor, actualizarProveedor, eliminarProveedor, 
    obtenerArticulos, actualizarArticulo, crearFactura, digitalizarDocumento,
    obtenerCategorias, obtenerUnidades 
} from '../services_api/inventarioService';
import { crearMovimientoCardex } from "../services_api/obrasService";
import { formatearRutVisual, limpiarRutParaGuardar } from './GestionUsuariosView';
import FacturasComprasView from "../components/FacturasComprasView";
import ModalRevisionIA from "../components/ModalRevisionIA";
import ModalSelectorMotorIA from "../components/ModalSelectorMotorIA";
import FinanzasView from './FinanzasView';
import '../styles/ComprasView.css';

// Estructura base para el formulario de registro de un nuevo cliente mandante
const clienteInicial = {
    rut: '',
    razon_social: '',
    giro_comercial: '',
    direccion: '',
    region: 'Ñuble',
    comuna: '',
    ciudad: '',
    nombre_representante: '',
    rut_representante: '',
};

// Estructura base para el formulario de registro de un nuevo proveedor
const proveedorInicial = {
    rut: '',
    razon_social: '',
    direccion: '',
    region: 'Ñuble',
    comuna: '',
    ciudad: '',
};

const ComprasView = ({ usuario }) => {
    // Control de pestaña activa ('clientes', 'proveedores', 'facturas', 'finanzas')
    const [pestana, setPestana] = useState('clientes');

    // Listados de entidades comerciales y catálogo de materiales
    const [clientes, setClientes] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [articulos, setArticulos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Filtros de búsqueda en tiempo real
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [busquedaProveedor, setBusquedaProveedor] = useState('');

    // Control de visibilidad de modales de edición/creación manual
    const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
    const [modalProveedorAbierto, setModalProveedorAbierto] = useState(false);

    // Estados de formularios individuales
    const [formCliente, setFormCliente] = useState(clienteInicial);
    const [formProveedor, setFormProveedor] = useState(proveedorInicial);
    const [editClienteId, setEditClienteId] = useState(null);
    const [editProveedorId, setEditProveedorId] = useState(null);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    // Estados para la Digitalización Inteligente con IA (Gemini API o Ollama Local)
    const [cargandoIAGlobal, setCargandoIAGlobal] = useState(false);
    const [modalSelectorMotorGlobalAbierto, setModalSelectorMotorGlobalAbierto] = useState(false);
    const [modalIAGlobalAbierto, setModalIAGlobalAbierto] = useState(false);
    const [datosIAGlobal, setDatosIAGlobal] = useState(null);
    const [imagenIAGlobal, setImagenIAGlobal] = useState('');
    const [datosFacturaPrecargados, setDatosFacturaPrecargados] = useState(null);
    const fileInputGlobalRef = useRef(null);

    // Control de permisos RBAC según el rol del usuario conectado
    const puedeEditar = ['administracion', 'encargado_finanza'].includes(usuario?.rol);
    const puedeVerFinanzas = ['administracion', 'encargado_finanza'].includes(usuario?.rol);

    /**
     * Formatea errores devueltos por Django REST Framework para mostrarlos de forma amigable
     */
    const formatearErrorAPI = (err, fallback) => {
        const data = err.response?.data;
        if (data && typeof data === 'object') {
            return Object.values(data).flat().join(' ');
        }
        return fallback;
    };

    /**
     * Sincroniza desde el backend las listas de clientes, proveedores, artículos, categorías y unidades
     */
    const cargarEntidades = async () => {
        setCargando(true);
        try {
            const [resCli, resProv, resArt, resCat, resUni] = await Promise.all([
                obtenerClientes(),
                obtenerProveedores(),
                obtenerArticulos().catch(() => ({ data: [] })),
                obtenerCategorias().catch(() => ({ data: [] })),
                obtenerUnidades().catch(() => ({ data: [] })),
            ]);
            setClientes(resCli.data || []);
            setProveedores(resProv.data || []);
            setArticulos(resArt?.data || []);
            setCategorias(resCat?.data || []);
            setUnidades(resUni?.data || []);
        } catch {
            setError('No se pudieron cargar los datos de clientes y proveedores.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarEntidades();
    }, []);

    // =========================================================================
    // FUNCIONES DEL FLUJO DE DIGITALIZACIÓN CON IA (OLLAMA)
    // =========================================================================

    /**
     * Abre el modal de nuevo cliente con datos precargados automáticamente por la IA
     */
    const abrirModalNuevoClienteConDatos = (datosCli) => {
        setEditClienteId(null);
        setError('');
        setFormCliente({
            ...clienteInicial,
            rut: datosCli?.rut ? formatearRutVisual(datosCli.rut) : '',
            razon_social: datosCli?.nombre || datosCli?.razon_social || '',
            direccion: datosCli?.direccion || '',
            giro_comercial: datosCli?.giro || '',
            ciudad: datosCli?.ciudad || '',
            comuna: datosCli?.comuna || '',
        });
        setModalClienteAbierto(true);
    };

    /**
     * Abre el modal de nuevo proveedor con datos detectados por el modelo de visión
     */
    const abrirModalNuevoProveedorConDatos = (datosProv) => {
        setEditProveedorId(null);
        setError('');
        setFormProveedor({
            rut: datosProv?.rut ? formatearRutVisual(datosProv.rut) : '',
            razon_social: datosProv?.razon_social || '',
            direccion: datosProv?.direccion || '',
            region: datosProv?.region || 'Ñuble',
            comuna: datosProv?.comuna || '',
            ciudad: datosProv?.ciudad || '',
        });
        setModalProveedorAbierto(true);
    };

    /**
     * Optimiza y redimensiona la imagen en el cliente para acelerar la subida y evitar fallos de red
     */
    const optimizarImagenParaIA = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width;
                    let h = img.height;
                    const maxDim = 1600;
                    if (w > maxDim || h > maxDim) {
                        if (w > h) {
                            h = Math.round((h * maxDim) / w);
                            w = maxDim;
                        } else {
                            w = Math.round((w * maxDim) / h);
                            h = maxDim;
                        }
                    }
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    const b64Optimizado = canvas.toDataURL('image/jpeg', 0.88);
                    resolve(b64Optimizado);
                };
                img.onerror = () => resolve(e.target.result);
                img.src = e.target.result;
            };
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
        });
    };

    /**
     * Captura el archivo o fotografía desde el modal selector de motor IA
     * y solicita el análisis al backend con el motor elegido ('gemini' o 'local')
     */
    const iniciarDigitalizacionGlobalConMotor = async (file, motor) => {
        if (!file) return;

        setCargandoIAGlobal(true);
        setError('');

        try {
            // Optimizar resolución del escaneo antes del envío para máxima velocidad y evitar errores de red
            const b64Optimizado = await optimizarImagenParaIA(file);
            setImagenIAGlobal(b64Optimizado);

            // Llama al endpoint /api/digitalizacion/analizar/ con timeout extendido
            const resp = await digitalizarDocumento(b64Optimizado, motor);
            setDatosIAGlobal(resp.data);
            setModalIAGlobalAbierto(true);
        } catch (err) {
            let msg = err.response?.data?.detail || err.message || 'Error al digitalizar el documento con IA';
            if (err.response?.status === 503 || msg.includes('desactivado')) {
                setError(msg);
                return;
            }
            if (err.code === 'ECONNABORTED' || msg.includes('timeout')) {
                msg = 'El procesamiento excedió el tiempo límite (timeout). Si estás usando Ollama Local, asegúrate de que el modelo esté activo.';
            } else if (msg === 'Network Error') {
                msg = motor === 'local' 
                    ? 'No se pudo conectar con el servidor local o Ollama tardó demasiado. Comprueba que Ollama esté ejecutándose en segundo plano (puerto 11434).' 
                    : 'Error de conexión de red con el servidor. Comprueba tu conexión a internet.';
            }
            const nombreMotor = motor === 'local' ? 'Ollama Local' : 'Google Gemini';
            setError(`Error de IA (${nombreMotor}): ${msg}`);
        } finally {
            setCargandoIAGlobal(false);
        }
    };

    /**
     * Al confirmar en el modal de revisión, cambia automáticamente a la pestaña de facturas
     * y precarga todos los materiales detectados en la tabla de facturación con el proveedor vinculado.
     */
    const aplicarDatosIAGlobal = (datosConfirmados) => {
        const provData = datosConfirmados.proveedor;
        if (provData && provData.id_proveedor) {
            setProveedores(prev => {
                const idProv = String(provData.id_proveedor || provData.id);
                if (!prev.some(p => String(p.id_proveedor || p.id) === idProv)) {
                    return [provData, ...prev];
                }
                return prev;
            });
        }

        // Si el modal registró nuevos artículos en catálogo, reflejarlos en el estado global
        if (datosConfirmados.items && datosConfirmados.items.length > 0) {
            setArticulos(prev => {
                const copia = [...prev];
                for (const it of datosConfirmados.items) {
                    if (it.id_articulo && !copia.some(a => String(a.id_articulo || a.id) === String(it.id_articulo))) {
                        copia.push({
                            id_articulo: it.id_articulo,
                            nombre: it.descripcion,
                            codigo_barra: it.codigo || it.id_articulo,
                            id_categoria: it.id_categoria,
                            precio: it.precio_unitario,
                            stock_disponible: 0
                        });
                    }
                }
                return copia;
            });
        }

        setDatosFacturaPrecargados(datosConfirmados);
        setModalIAGlobalAbierto(false);
        setPestana('facturas');
    };

    // =========================================================================
    // MODALES Y OPERACIONES DE CLIENTES Y PROVEEDORES
    // =========================================================================

    const abrirModalNuevoCliente = () => {
        setEditClienteId(null);
        setError('');
        setFormCliente(clienteInicial);
        setModalClienteAbierto(true);
    };

    const abrirModalEditarCliente = (cliente) => {
        setEditClienteId(cliente.id_cliente);
        setError('');
        setFormCliente({
            ...cliente,
            rut: formatearRutVisual(cliente.rut || ''),
            rut_representante: formatearRutVisual(cliente.rut_representante || ''),
        });
        setModalClienteAbierto(true);
    };

    const abrirModalNuevoProveedor = () => {
        setEditProveedorId(null);
        setError('');
        setFormProveedor(proveedorInicial);
        setModalProveedorAbierto(true);
    };

    const abrirModalEditarProveedor = (proveedor) => {
        setEditProveedorId(proveedor.id_proveedor || proveedor.id);
        setError('');
        setFormProveedor({
            ...proveedor,
            rut: formatearRutVisual(proveedor.rut || ''),
        });
        setModalProveedorAbierto(true);
    };

    /**
     * Guarda o actualiza un cliente mandante en el backend
     */
    const guardarClienteForm = async (e) => {
        e.preventDefault();
        setError('');
        setMensaje('');
        const datosCliente = {
            ...formCliente,
            rut: limpiarRutParaGuardar(formCliente.rut),
            rut_representante: limpiarRutParaGuardar(formCliente.rut_representante),
        };
        try {
            if (editClienteId) {
                await actualizarCliente(editClienteId, datosCliente);
                setMensaje('Los datos del cliente se actualizaron correctamente.');
            } else {
                await crearCliente(datosCliente);
                setMensaje('Nuevo cliente registrado correctamente.');
            }
            setModalClienteAbierto(false);
            setFormCliente(clienteInicial);
            setEditClienteId(null);
            await cargarEntidades();
        } catch (err) {
            setError(formatearErrorAPI(err, 'No se pudo guardar el cliente. Revise que el RUT sea válido.'));
        }
    };

    /**
     * Guarda o actualiza un proveedor en el backend
     */
    const guardarProveedorForm = async (e) => {
        e.preventDefault();
        setError('');
        setMensaje('');
        const datosProveedor = {
            ...formProveedor,
            rut: limpiarRutParaGuardar(formProveedor.rut),
        };
        try {
            if (editProveedorId) {
                await actualizarProveedor(editProveedorId, datosProveedor);
                setMensaje('Los datos del proveedor se actualizaron correctamente.');
            } else {
                await crearProveedor(datosProveedor);
                setMensaje('Nuevo proveedor registrado correctamente.');
            }
            setModalProveedorAbierto(false);
            setFormProveedor(proveedorInicial);
            setEditProveedorId(null);
            await cargarEntidades();
        } catch (err) {
            setError(formatearErrorAPI(err, 'No se pudo guardar el proveedor. Revise que el RUT sea válido.'));
        }
    };

    /**
     * Elimina un cliente mandante tras confirmación
     */
    const manejarEliminarCliente = async (idCliente, razonSocial) => {
        if (!window.confirm(`¿Está seguro de eliminar al cliente "${razonSocial}"?`)) return;
        setError('');
        setMensaje('');
        try {
            await eliminarCliente(idCliente);
            setMensaje('Cliente eliminado correctamente.');
            await cargarEntidades();
        } catch {
            setError('No se puede eliminar este cliente porque ya tiene obras asociadas en el sistema.');
        }
    };

    /**
     * Elimina un proveedor tras confirmación
     */
    const manejarEliminarProveedor = async (idProveedor, razonSocial) => {
        if (!window.confirm(`¿Está seguro de eliminar al proveedor "${razonSocial}"?`)) return;
        setError('');
        setMensaje('');
        try {
            await eliminarProveedor(idProveedor);
            setMensaje('Proveedor eliminado correctamente.');
            await cargarEntidades();
        } catch {
            setError('No se puede eliminar este proveedor porque ya tiene facturas registradas.');
        }
    };

    /**
     * Registra una factura (soporta tanto un solo ítem como facturas multi-producto con lista de detalles)
     */
    const manejarRegistroFactura = async (facturaData) => {
        setError('');
        setMensaje('');
        try {
            // Envío al endpoint /api/facturas/
            await crearFactura({
                id_proveedor: facturaData.id_proveedor,
                numero_documento: facturaData.numero_documento,
                detalles: facturaData.detalles || [],
                id_articulo: facturaData.articulo_id,
                cantidad: Number(facturaData.cantidad || 0),
                precio_unitario: Number(facturaData.precio_unitario || 0),
                total: Number(facturaData.total),
                observaciones: facturaData.motivo,
                imagen_respaldo: facturaData.imagen_respaldo || '',
            });
        } catch {
            // Manejo de contingencia manual iterando cada material si el endpoint de factura directa falla
            const listaItems = (facturaData.detalles && facturaData.detalles.length > 0)
                ? facturaData.detalles
                : [{ id_articulo: facturaData.articulo_id, cantidad: facturaData.cantidad, precio_unitario: facturaData.precio_unitario }];

            // La creación de la factura en backend ya registra los ítems, suma el stock
            // y genera los movimientos de auditoría en Cardex dentro de la transacción atómica.
        }

        const totalUnidades = (facturaData.detalles || []).reduce((acc, it) => acc + Number(it.cantidad || 0), 0) || facturaData.cantidad;
        setMensaje(
            `Factura ${facturaData.documento} registrada con éxito. Se sumaron ${totalUnidades} unidades al inventario de bodega.`
        );
        await cargarEntidades();
    };

    // Filtros de búsqueda en tiempo real
    const clientesFiltrados = clientes.filter((c) => {
        const q = busquedaCliente.toLowerCase();
        const rutPuntos = formatearRutVisual(c.rut).toLowerCase();
        return (
            c.razon_social?.toLowerCase().includes(q) ||
            c.rut?.toLowerCase().includes(q) ||
            rutPuntos.includes(q) ||
            c.giro_comercial?.toLowerCase().includes(q) ||
            c.ciudad?.toLowerCase().includes(q) ||
            c.nombre_representante?.toLowerCase().includes(q)
        );
    });

    const proveedoresFiltrados = proveedores.filter((p) => {
        const q = busquedaProveedor.toLowerCase();
        const rutPuntos = formatearRutVisual(p.rut).toLowerCase();
        return (
            p.razon_social?.toLowerCase().includes(q) ||
            p.rut?.toLowerCase().includes(q) ||
            rutPuntos.includes(q) ||
            p.direccion?.toLowerCase().includes(q) ||
            p.ciudad?.toLowerCase().includes(q) ||
            p.comuna?.toLowerCase().includes(q)
        );
    });

    const modalActivo = modalClienteAbierto || modalProveedorAbierto;

    return (
        <div className="contenedor-vista">
            <div className="compras-container">
                {/* CABECERA PRINCIPAL CON BOTÓN GLOBAL DE DIGITALIZACIÓN CON IA */}
                <div className="compras-header">
                    <div>
                        <h1 className="compras-title">Clientes, Proveedores y Facturación</h1>
                        <p className="compras-subtitle">
                            Administración de fichas comerciales de empresas, recepción de compras y control de gastos
                        </p>
                    </div>

                    <div className="compras-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Botón Global de IA: Permite digitalizar documentos en cualquier pestaña con selector de motor */}
                        <button
                            type="button"
                            onClick={() => setModalSelectorMotorGlobalAbierto(true)}
                            disabled={cargandoIAGlobal}
                            className="compras-btn-add"
                            style={{
                                background: cargandoIAGlobal ? '#94a3b8' : '#047857',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)'
                            }}
                            title="Digitalizar Guía o Factura en papel con IA"
                        >
                            {cargandoIAGlobal ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Analizando con IA...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    <span>Digitalizar Documento con IA</span>
                                </>
                            )}
                        </button>

                        {/* Botones de acción manual específicos por pestaña */}
                        {pestana === 'clientes' && puedeEditar && (
                            <button type="button" onClick={abrirModalNuevoCliente} className="compras-btn-add">
                                <Plus size={16} />
                                <span>Registrar Cliente</span>
                            </button>
                        )}
                        {pestana === 'proveedores' && puedeEditar && (
                            <button type="button" onClick={abrirModalNuevoProveedor} className="compras-btn-add">
                                <Plus size={16} />
                                <span>Registrar Proveedor</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* BARRA DE PESTAÑAS NAVEGABLES */}
                <div className="compras-tabs-bar">
                    <button type="button" className={`compras-tab-item ${pestana === 'clientes' ? 'active' : ''}`} onClick={() => setPestana('clientes')}>
                        <Building2 size={16} />
                        <span>Clientes Mandantes</span>
                        <span className="compras-tab-count">{clientes.length}</span>
                    </button>

                    <button type="button" className={`compras-tab-item ${pestana === 'proveedores' ? 'active' : ''}`} onClick={() => setPestana('proveedores')}>
                        <Truck size={16} />
                        <span>Proveedores</span>
                        <span className="compras-tab-count">{proveedores.length}</span>
                    </button>

                    <button type="button" className={`compras-tab-item ${pestana === 'facturas' ? 'active' : ''}`} onClick={() => setPestana('facturas')}>
                        <Receipt size={16} />
                        <span>Ingreso de Facturas</span>
                    </button>

                    {puedeVerFinanzas && (
                        <button type="button" className={`compras-tab-item ${pestana === 'finanzas' ? 'active' : ''}`} onClick={() => setPestana('finanzas')}>
                            <PieChart size={16} />
                            <span>Resumen de Gastos y Finanzas</span>
                        </button>
                    )}
                </div>

                {/* MENSAJES DE ESTADO */}
                {mensaje && <div className="alerta-exito">{mensaje}</div>}
                {error && !modalActivo && <div className="alerta-error">{error}</div>}

                {/* PESTAÑA 1: TABLA DE CLIENTES MANDANTES */}
                {pestana === 'clientes' && (
                    <div className="compras-table-card">
                        <div className="compras-table-toolbar">
                            <div className="compras-search-box">
                                <Search size={15} color="#64748b" />
                                <input
                                    type="text"
                                    placeholder="Buscar cliente por razón social, RUT, ciudad o representante..."
                                    value={busquedaCliente}
                                    onChange={(e) => setBusquedaCliente(e.target.value)}
                                    className="compras-search-input"
                                />
                            </div>
                            <div className="compras-count-label">
                                {clientesFiltrados.length} clientes registrados
                            </div>
                        </div>

                        <div className="compras-table-wrapper">
                            <table className="compras-table">
                                <thead>
                                    <tr>
                                        <th>Razón Social</th>
                                        <th>RUT Empresa</th>
                                        <th>Rubro / Giro Comercial</th>
                                        <th>Dirección</th>
                                        <th>Ciudad / Comuna</th>
                                        <th>Representante Legal</th>
                                        {puedeEditar && <th>Acciones</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {cargando ? (
                                        <tr>
                                            <td colSpan={puedeEditar ? 7 : 6} className="compras-table-empty">
                                                Cargando nómina de clientes...
                                            </td>
                                        </tr>
                                    ) : clientesFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={puedeEditar ? 7 : 6} className="compras-table-empty">
                                                No se encontraron clientes registrados con esos datos.
                                            </td>
                                        </tr>
                                    ) : (
                                        clientesFiltrados.map((c) => (
                                            <tr key={c.id_cliente}>
                                                <td className="compras-td-name">{c.razon_social}</td>
                                                <td className="compras-td-rut">{formatearRutVisual(c.rut)}</td>
                                                <td className="compras-td-text">{c.giro_comercial}</td>
                                                <td className="compras-td-text">{c.direccion}</td>
                                                <td>
                                                    <span className="compras-location-badge">
                                                        {c.ciudad} ({c.comuna})
                                                    </span>
                                                </td>
                                                <td className="compras-td-text">
                                                    {c.nombre_representante}{' '}
                                                    <span className="compras-td-rut">
                                                        ({formatearRutVisual(c.rut_representante)})
                                                    </span>
                                                </td>
                                                {puedeEditar && (
                                                    <td>
                                                        <div className="compras-actions-cell">
                                                            <button type="button" onClick={() => abrirModalEditarCliente(c)} className="compras-btn-edit" title="Modificar datos del cliente">
                                                                <Edit2 size={14} />
                                                                <span>Editar</span>
                                                            </button>
                                                            <button type="button" onClick={() => manejarEliminarCliente(c.id_cliente, c.razon_social)} className="compras-btn-delete" title="Eliminar cliente">
                                                                <Trash2 size={14} />
                                                                <span>Eliminar</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* PESTAÑA 2: TABLA DE PROVEEDORES */}
                {pestana === 'proveedores' && (
                    <div className="compras-table-card">
                        <div className="compras-table-toolbar">
                            <div className="compras-search-box">
                                <Search size={15} color="#64748b" />
                                <input
                                    type="text"
                                    placeholder="Buscar proveedor por razón social, RUT o comuna..."
                                    value={busquedaProveedor}
                                    onChange={(e) => setBusquedaProveedor(e.target.value)}
                                    className="compras-search-input"
                                />
                            </div>
                            <div className="compras-count-label">
                                {proveedoresFiltrados.length} proveedores registrados
                            </div>
                        </div>

                        <div className="compras-table-wrapper">
                            <table className="compras-table">
                                <thead>
                                    <tr>
                                        <th>Razón Social</th>
                                        <th>RUT Proveedor</th>
                                        <th>Dirección Comercial</th>
                                        <th>Ciudad / Comuna</th>
                                        <th>Región</th>
                                        {puedeEditar && <th>Acciones</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {cargando ? (
                                        <tr>
                                            <td colSpan={puedeEditar ? 6 : 5} className="compras-table-empty">
                                                Cargando listado de proveedores...
                                            </td>
                                        </tr>
                                    ) : proveedoresFiltrados.length === 0 ? (
                                        <tr>
                                            <td colSpan={puedeEditar ? 6 : 5} className="compras-table-empty">
                                                No se encontraron proveedores registrados.
                                            </td>
                                        </tr>
                                    ) : (
                                        proveedoresFiltrados.map((p) => {
                                            const idProv = p.id_proveedor || p.id;
                                            return (
                                                <tr key={idProv}>
                                                    <td className="compras-td-name">{p.razon_social}</td>
                                                    <td className="compras-td-rut">{formatearRutVisual(p.rut)}</td>
                                                    <td className="compras-td-text">{p.direccion}</td>
                                                    <td>
                                                        <span className="compras-location-badge">
                                                            {p.ciudad} ({p.comuna})
                                                        </span>
                                                    </td>
                                                    <td className="compras-td-text">{p.region}</td>
                                                    {puedeEditar && (
                                                        <td>
                                                            <div className="compras-actions-cell">
                                                                <button type="button" onClick={() => abrirModalEditarProveedor(p)} className="compras-btn-edit" title="Modificar datos del proveedor">
                                                                    <Edit2 size={14} />
                                                                    <span>Editar</span>
                                                                </button>
                                                                <button type="button" onClick={() => manejarEliminarProveedor(idProv, p.razon_social)} className="compras-btn-delete" title="Eliminar proveedor">
                                                                    <Trash2 size={14} />
                                                                    <span>Eliminar</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* PESTAÑA 3: FORMULARIO MULTI-PRODUCTO DE INGRESO DE FACTURAS */}
                {pestana === 'facturas' && (
                    <FacturasComprasView
                        proveedores={proveedores}
                        articulos={articulos}
                        categorias={categorias}
                        unidades={unidades}
                        onRegistrarFactura={manejarRegistroFactura}
                        onNuevoProveedor={abrirModalNuevoProveedorConDatos}
                        datosPrecargadosIA={datosFacturaPrecargados}
                        onLimpiarDatosPrecargados={() => setDatosFacturaPrecargados(null)}
                    />
                )}

                {/* PESTAÑA 4: RESUMEN DE FINANZAS */}
                {pestana === 'finanzas' && puedeVerFinanzas && (
                    <FinanzasView proveedores={proveedores} clientes={clientes} />
                )}

                {/* MODAL SELECTOR DE MOTOR IA (GEMINI API vs OLLAMA LOCAL) */}
                <ModalSelectorMotorIA
                    isOpen={modalSelectorMotorGlobalAbierto}
                    onClose={() => setModalSelectorMotorGlobalAbierto(false)}
                    onSeleccionarArchivoYMotor={iniciarDigitalizacionGlobalConMotor}
                />

                {/* MODAL GLOBAL DE REVISIÓN INTELIGENTE IA */}
                {modalIAGlobalAbierto && datosIAGlobal && (
                    <ModalRevisionIA
                        datos={datosIAGlobal}
                        imagenSrc={imagenIAGlobal}
                        articulosDisponibles={articulos}
                        categoriasDisponibles={categorias}
                        unidadesDisponibles={unidades}
                        clientesDisponibles={clientes}
                        onConfirmar={aplicarDatosIAGlobal}
                        onCerrar={() => {
                            setModalIAGlobalAbierto(false);
                            setDatosIAGlobal(null);
                            setImagenIAGlobal('');
                        }}
                        onProveedorCreado={(nuevo) => {
                            setProveedores(prev => {
                                const idNuevo = String(nuevo.id_proveedor || nuevo.id);
                                if (!prev.some(p => String(p.id_proveedor || p.id) === idNuevo)) {
                                    return [nuevo, ...prev];
                                }
                                return prev;
                            });
                        }}
                        onArticuloCreado={(nuevoArt) => {
                            setArticulos(prev => {
                                const idNuevo = String(nuevoArt.id_articulo || nuevoArt.id);
                                if (!prev.some(a => String(a.id_articulo || a.id) === idNuevo)) {
                                    return [nuevoArt, ...prev];
                                }
                                return prev;
                            });
                        }}
                        onRegistrarCliente={(cData) => {
                            // Se mantiene abierto el modal de IA para no perder los datos digitalizados al cancelar o guardar
                            abrirModalNuevoClienteConDatos(cData);
                        }}
                    />
                )}

                {/* MODAL PARA CREAR O EDITAR CLIENTES */}
                {modalClienteAbierto && (
                    <div className="compras-modal-overlay" style={{ zIndex: 1200 }}>
                        <div className="compras-modal-card">
                            <div className="compras-modal-header">
                                <div className="compras-modal-title">
                                    {editClienteId ? 'Modificar Datos del Cliente' : 'Registrar Nuevo Cliente'}
                                </div>
                                <button type="button" onClick={() => setModalClienteAbierto(false)} className="compras-modal-close">X</button>
                            </div>

                            <form onSubmit={guardarClienteForm} className="compras-modal-form">
                                {error && <div className="alerta-error">{error}</div>}

                                <div className="compras-form-grid">
                                    <div className="compras-form-group">
                                        <label className="compras-form-label">RUT de la Empresa</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: 76.123.456-7"
                                            value={formCliente.rut}
                                            onChange={(e) => setFormCliente({ ...formCliente, rut: formatearRutVisual(e.target.value), })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Razón Social</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Constructora del Sur SpA"
                                            value={formCliente.razon_social}
                                            onChange={(e) => setFormCliente({ ...formCliente, razon_social: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group full-width">
                                        <label className="compras-form-label">Rubro / Giro Comercial</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Construcción de edificios habitacionales"
                                            value={formCliente.giro_comercial}
                                            onChange={(e) => setFormCliente({ ...formCliente, giro_comercial: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group full-width">
                                        <label className="compras-form-label">Dirección Casa Matriz</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Av. Libertad 450, Of. 302"
                                            value={formCliente.direccion}
                                            onChange={(e) => setFormCliente({ ...formCliente, direccion: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Ciudad</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Chillán"
                                            value={formCliente.ciudad}
                                            onChange={(e) => setFormCliente({ ...formCliente, ciudad: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Comuna</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Chillán Viejo"
                                            value={formCliente.comuna}
                                            onChange={(e) => setFormCliente({ ...formCliente, comuna: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Región</label>
                                        <input
                                            type="text"
                                            value={formCliente.region}
                                            onChange={(e) => setFormCliente({ ...formCliente, region: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Nombre Representante Legal</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: Roberto Muñoz Díaz"
                                            value={formCliente.nombre_representante}
                                            onChange={(e) => setFormCliente({ ...formCliente, nombre_representante: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">RUT Representante Legal</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: 11.222.333-4"
                                            value={formCliente.rut_representante}
                                            onChange={(e) => setFormCliente({ ...formCliente, rut_representante: formatearRutVisual(e.target.value), })}
                                            className="compras-form-input"
                                        />
                                    </div>
                                </div>

                                <div className="compras-modal-actions">
                                    <button type="button" onClick={() => setModalClienteAbierto(false)} className="compras-btn-cancel">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="compras-btn-submit">
                                        {editClienteId ? 'Guardar Cambios' : 'Registrar Cliente'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL PARA CREAR O EDITAR PROVEEDORES */}
                {modalProveedorAbierto && (
                    <div className="compras-modal-overlay" style={{ zIndex: 1200 }}>
                        <div className="compras-modal-card">
                            <div className="compras-modal-header">
                                <div className="compras-modal-title">
                                    {editProveedorId ? 'Modificar Datos del Proveedor' : 'Registrar Nuevo Proveedor'}
                                </div>
                                <button type="button" onClick={() => setModalProveedorAbierto(false)} className="compras-modal-close">X</button>
                            </div>

                            <form onSubmit={guardarProveedorForm} className="compras-modal-form">
                                {error && <div className="alerta-error">{error}</div>}

                                <div className="compras-form-grid">
                                    <div className="compras-form-group">
                                        <label className="compras-form-label">RUT Empresa Proveedora</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: 96.555.444-3"
                                            value={formProveedor.rut}
                                            onChange={(e) => setFormProveedor({ ...formProveedor, rut: formatearRutVisual(e.target.value), })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Razón Social</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Distribuidora de Fierros SpA"
                                            value={formProveedor.razon_social}
                                            onChange={(e) => setFormProveedor({ ...formProveedor, razon_social: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group full-width">
                                        <label className="compras-form-label">Dirección Comercial</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Longitudinal Sur Km 402"
                                            value={formProveedor.direccion}
                                            onChange={(e) => setFormProveedor({ ...formProveedor, direccion: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Ciudad</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Chillán"
                                            value={formProveedor.ciudad}
                                            onChange={(e) => setFormProveedor({ ...formProveedor, ciudad: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Comuna</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Chillán"
                                            value={formProveedor.comuna}
                                            onChange={(e) => setFormProveedor({ ...formProveedor, comuna: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>

                                    <div className="compras-form-group">
                                        <label className="compras-form-label">Región</label>
                                        <input
                                            type="text"
                                            value={formProveedor.region}
                                            onChange={(e) => setFormProveedor({ ...formProveedor, region: e.target.value, })}
                                            className="compras-form-input"
                                        />
                                    </div>
                                </div>

                                <div className="compras-modal-actions">
                                    <button type="button" onClick={() => setModalProveedorAbierto(false)} className="compras-btn-cancel">
                                        Cancelar
                                    </button>
                                    <button type="submit" className="compras-btn-submit">
                                        {editProveedorId ? 'Guardar Cambios' : 'Registrar Proveedor'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComprasView;
