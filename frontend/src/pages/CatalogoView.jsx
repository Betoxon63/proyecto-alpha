import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Boxes, Search, Plus, Edit2, Trash2, Tag, Ruler, BarChart3, Lock, ShoppingCart, Download } from 'lucide-react';
import { obtenerArticulos, crearArticulo, actualizarArticulo, eliminarArticulo, obtenerCategorias, obtenerUnidades, } from '../services_api/inventarioService';
import AlertaStock from "../components/AlertaStock";
import ResumenBodegaView from "../components/ResumenBodegaView";
import CategoriasView from "../components/CategoriasView";
import UnidadesView from "../components/UnidadesView";
import { exportarExcel } from "../utils/exportarExcel";
import '../styles/CatalogoView.css'

// Valores iniciales vacios.
const estadoInicialArticulo = {
    codigo_barra: '',
    nombre: '',
    id_categoria: '',
    id_unidad_medida: '',
    ubicacion: '',
    stock_disponible: 0,
    stock_minimo: 5,
    stock_comprometido: 0,
    precio: 0,
};

// Pantalla principal del Catálogo de Bodega.
const CatalogoView = ({ usuario }) => {
    const navigate = useNavigate();
    const [pestana, setPestana] = useState('materiales');
    const [articulos, setArticulos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [unidades, setUnidades] = useState([]);

    // Filtros de la tabla de materiales.
    const [busqueda, setBusqueda] = useState('');
    const [filtroStock, setFiltroStock] = useState('Todos');
    const [filtroCategoria, setFiltroCategoria] = useState('');

    // Control de ventanas emergentes.
    const [modalMaterialAbierto, setModalMaterialAbierto] = useState(false);
    const [formArticulo, setFormArticulo] = useState(estadoInicialArticulo);
    const [editandoId, setEditandoId] = useState(null);
    const [triggerCrearCategoria, setTriggerCrearCategoria] = useState(0);
    const [triggerCrearUnidad, setTriggerCrearUnidad] = useState(0);

    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(true);

    // Permisos según el cargo.
    const rol = usuario?.rol;
    const puedeEscribir = ['administracion', 'encargado_bodega'].includes(rol);
    const puedeEliminar = rol === 'administracion';
    const puedeVerPrecios = rol !== 'supervisor_obra';
    const bloquearStockYPrecio = Boolean(editandoId) && rol === 'encargado_bodega';

    // Carga los materiales, categorías y unidades desde el servidor.
    const cargarDatos = async () => {
        setCargando(true);
        try {
            const [resArt, resCat, resUni] = await Promise.all([ obtenerArticulos(), obtenerCategorias(), obtenerUnidades(), ]);
            setArticulos(resArt.data || []);
            setCategorias(resCat.data || []);
            setUnidades(resUni.data || []);
            window.dispatchEvent(new Event('fyag_inventario_actualizado'));
        } catch {
            setError('No se pudo cargar el listado de materiales de bodega.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    // Cambia entre pestañas limpiando avisos anteriores.
    const cambiarPestana = (nuevaPestana) => {
        setPestana(nuevaPestana);
        setMensaje('');
        setError('');
        setTriggerCrearCategoria(0);
        setTriggerCrearUnidad(0);
    };

    // Abre el modal vacío para registrar un material nuevo.
    const abrirModalNuevoMaterial = () => {
        setEditandoId(null);
        setError('');
        setFormArticulo(estadoInicialArticulo);
        setModalMaterialAbierto(true);
    };

    // Abre el modal cargando los datos del material elegido para modificarlos.
    const abrirModalEditarMaterial = (art) => {
        setMensaje('');
        setError('');
        setEditandoId(art.id_articulo);
        setFormArticulo({
            codigo_barra: String(art.codigo_barra || ''),
            nombre: art.nombre || '',
            id_categoria: art.id_categoria || '',
            id_unidad_medida: art.id_unidad_medida || '',
            ubicacion: art.ubicacion || '',
            stock_disponible: Number(art.stock_disponible || 0),
            stock_minimo: Number(art.stock_minimo || 0),
            stock_comprometido: Number(art.stock_comprometido || 0),
            precio: Number(art.precio || 0),
        });
        setModalMaterialAbierto(true);
    };

    // Lleva a la pantalla de Solicitudes con el material y la cantidad sugerida precargados.
    const irASolicitarMaterial = (art) => {
        const sugerido =
            art.faltante_reposicion !== undefined && Number(art.faltante_reposicion) > 0
                ? Number(art.faltante_reposicion)
                : Math.max(
                    1,
                    Number(art.stock_minimo || 0) +
                        Number(art.stock_comprometido || 0) -
                        Number(art.stock_disponible || 0)
                );
        
        navigate('/solicitudes', {
            state: {
                abrirCrear: true,
                articuloId: art.id_articulo,
                cantidadSugerida: sugerido,
            },
        });
    };

    // Valida los campos y guarda un material nuevo o actualizado en el servidor.
    const guardarArticulo = async (e) => {
        e.preventDefault();
        setError('');
        setMensaje('');

        const codigoLimpio = String(formArticulo.codigo_barra || '').replace(/\D/g, '');
        const nombreLimpio = formArticulo.nombre.trim();
        const ubicacionLimpia = formArticulo.ubicacion.trim();

        if (!codigoLimpio || codigoLimpio.length > 15 || Number(codigoLimpio) <= 0) {
            setError('El código de barras debe ser un número positivo de hasta 15 dígitos.');
            return;
        }
        if (nombreLimpio.length < 3 || nombreLimpio.length > 100) {
            setError('El nombre del material debe tener entre 3 y 100 caracteres.');
            return;
        }
        if (ubicacionLimpia.length < 2 || ubicacionLimpia.length > 80) {
            setError('La ubicación en bodega debe tener entre 2 y 80 caracteres.');
            return;
        }

        const datosEnviar = {
            codigo_barra: Number(codigoLimpio),
            nombre: nombreLimpio,
            id_categoria: Number(formArticulo.id_categoria),
            id_unidad_medida: Number(formArticulo.id_unidad_medida),
            ubicacion: ubicacionLimpia,
            stock_disponible: Number(formArticulo.stock_disponible || 0),
            stock_minimo: Number(formArticulo.stock_minimo || 0),
            stock_comprometido: Number(formArticulo.stock_comprometido || 0),
            precio: Number(formArticulo.precio || 0),
        };

        try {
            if (editandoId) {
                await actualizarArticulo(editandoId, datosEnviar);
                setMensaje('Los datos del material se actualizaron correctamente.');
            } else {
                await crearArticulo(datosEnviar);
                setMensaje('Nuevo material registrado en la bodega.');
            }
            setModalMaterialAbierto(false);
            setFormArticulo(estadoInicialArticulo);
            setEditandoId(null);
            await cargarDatos();
        } catch (err) {
            const dataErr = err.response?.data;
            if (dataErr && typeof dataErr === 'object') {
                const detalle = Object.values(dataErr).flat().join(' ');
                setError(detalle);
            } else {
                setError('No se pudo guardar el material. Verifique que el código de barras no esté repetido.');
            }
        }
    };

    // Elimina un material si no tiene movimientos registrados en el historial.
    const borrarArticulo = async (id, nombre) => {
        if (!window.confirm(`¿Está seguro de eliminar el material "${nombre}"?`)) return;
        setMensaje('');
        setError('');
        try {
            await eliminarArticulo(id);
            setMensaje('Material eliminado correctamente.')
            await cargarDatos();
        } catch (err) {
            const detalle = err.response?.data?.detail;
            setError(
                detalle || 
                    'No se puede eliminar un material que ya tiene registros de entradas o salidas en el historial.'
            );
        }
    };

    // Contadores compactos para mostrar junto a los filtros de estado.
    const totalAgotados = articulos.filter((a) => Number(a.stock_disponible) <= 0).length;
    const totalStockBajo = articulos.filter(
        (a) => Number(a.stock_disponible) > 0 && Number(a.stock_disponible) <= Number(a.stock_minimo)
    ).length;
    const totalStockNormal = articulos.length - totalAgotados - totalStockBajo;

    const opcionesFiltroStock = [
        { clave: 'Todos', etiqueta: `Todos (${articulos.length})` },
        { clave: 'Stock Normal', etiqueta: `Normal (${totalStockNormal})` },
        { clave: 'Stock Bajo', etiqueta: `Stock Bajo (${totalStockBajo})` },
        { clave: 'Agotados', etiqueta: `Agotados (${totalAgotados})` },
    ]

    // Filtra la tabla combinando buscador, categoría y nivel de stock.
    const articulosFiltrados = articulos.filter((art) => {
        const disponible = Number(art.stock_disponible || 0);
        const minimo = Number(art.stock_minimo || 0);

        if (filtroStock === 'Agotados' && disponible > 0) return false;
        if (filtroStock === 'Stock Bajo' && (disponible <= 0 || disponible > minimo)) return false;
        if (filtroStock === 'Stock Normal' && disponible <= minimo) return false;

        if (filtroCategoria && String(art.id_categoria) !== String(filtroCategoria)) {
            return false;
        }

        if (busqueda.trim() !== '') {
            const q = busqueda.toLowerCase();
            const nombreTxt = (art.nombre || '').toLowerCase();
            const codigoTxt = String(art.codigo_barra || '').toLowerCase();
            const categoriaTxt = (art.categoria_nombre || '').toLowerCase();
            const ubicacionTxt = (art.ubicacion || '').toLowerCase();
            return (
                nombreTxt.includes(q) ||
                codigoTxt.includes(q) ||
                categoriaTxt.includes(q) ||
                ubicacionTxt.includes(q)
            );
        }
        return true;
    });

    // Descarga el catálogo en formato Excel.
    const exportarCatalogoExcel = async () => {
        const columnas = [
            { header: 'Código Barras', key: 'codigo', width: 18, alineacion: 'center' },
            { header: 'Material / Repuesto', key: 'nombre', width: 34 },
            { header: 'Categoría', key: 'categoria', width: 20 },
            { header: 'Unidad', key: 'unidad', width: 14, alineacion: 'center' },
            { header: 'Ubicación', key: 'ubicacion', width: 24 },
            { header: 'Disponible', key: 'disponible', width: 13, formato: 'numero' },
            { header: 'Mínimo', key: 'minimo', width: 11, formato: 'numero' },
            { header: 'Reservado', key: 'comprometido', width: 12, formato: 'numero' },
            { header: 'Estado Stock', key: 'estado', width: 15, alineacion: 'center' },
        ];
        if (puedeVerPrecios) {
            columnas.push(
                { header: 'Precio Unitario', key: 'precio', width: 16, formato: 'moneda' },
                { header: 'Valor Inventario', key: 'valor', width: 18, formato: 'moneda' }
            );
        }

        const totalDisponible = articulosFiltrados.reduce(
            (acc, a) => acc + Number(a.stock_disponible || 0),
            0
        );
        const totalValor = articulosFiltrados.reduce(
            (acc, a) => acc + Number(a.stock_disponible || 0) * Number(a.precio || 0),
            0
        );

        await exportarExcel({
            nombreArchivo: `catalogo_bodega_fyag_${new Date().toLocaleDateString('en-CA')}.xlsx`,
            nombreHoja: 'Catálogo Bodega',
            titulo: 'Catálogo de Materiales y Existencias en Bodega',
            subtitulo: filtroStock !== 'Todos' ? `Filtro: ${filtroStock}` : '',
            columnas,
            filas: articulosFiltrados.map((a) => {
                const disp = Number(a.stock_disponible || 0);
                const min = Number(a.stock_minimo || 0);
                const precio = Number(a.precio || 0);
                const estadoTxt = disp <= 0 ? 'Agotado' : disp <= min ? 'Stock Bajo' : 'Stock Normal';
                return {
                    codigo: String(a.codigo_barra || ''),
                    nombre: a.nombre || '',
                    categoria: a.categoria_nombre || '',
                    unidad: a.unidad_nombre || '',
                    ubicacion: a.ubicacion || '',
                    disponible: disp,
                    minimo: min,
                    comprometido: Number(a.stock_comprometido || 0),
                    estado: estadoTxt,
                    ...(puedeVerPrecios ? { precio, valor: disp * precio } : {}),
                };
            }),
            filaTotales: {
                ubicacion: 'TOTALES',
                disponible: totalDisponible,
                ...(puedeVerPrecios ? { valor: totalValor } : {}),
            },
        });
    };

    const totalColumnasTabla = 7 + (puedeVerPrecios ? 1 : 0) + (puedeEscribir ? 1 : 0);

    return (
        <div className="contenedor-vista">
            <div className="catalogo-container">
                {/* Cabecera principal */}
                <div className="catalogo-header">
                    <div>
                        <h1 className="catalogo-title">Catálogo de Materiales y Repuestos de Bodega</h1>
                        <p className="catalogo-subtitle">
                            Control de existencias disponibles, clasificación de bodega y avisos de reposición
                        </p>
                    </div>

                    <div className="catalogo-header-actions">
                        {pestana === 'materiales' && (
                            <button type="button" onClick={exportarCatalogoExcel} disabled={articulosFiltrados.length === 0} className="catalogo-btn-export">
                                <Download size={15} />
                                <span>Exportar Excel</span>
                            </button>
                        )}

                        {puedeEscribir && (pestana === 'materiales' || pestana === 'resumen') && (
                            <button type="button" onClick={abrirModalNuevoMaterial} className="catalogo-btn-add">
                                <Plus size={16} />
                                <span>Registrar Material</span>
                            </button>
                        )}
                        {puedeEscribir && pestana === 'categorias' && (
                            <button type="button" onClick={() => setTriggerCrearCategoria((prev) => prev + 1)} className="catalogo-btn-add">
                                <Plus size={16} />
                                <span>Registrar Categoría</span>
                            </button>
                        )}
                        {puedeEscribir && pestana === 'unidades' && (
                            <button type="button" onClick={() => setTriggerCrearUnidad((prev) => prev + 1)} className="catalogo-btn-add">
                                <Plus size={16} />
                                <span>Registrar Unidad</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Pestañas del módulo */}
                <div className="catalogo-tabs-bar">
                    <button type="button" className={`catalogo-tab-item ${pestana === 'materiales' ? 'active' : ''}`} onClick={() => cambiarPestana('materiales')}>
                        <Boxes size={16} />
                        <span>Materiales y Repuestos</span>
                        <span className="catalogo-tab-count">{articulos.length}</span>
                    </button>

                    <button type="button" className={`catalogo-tab-item ${pestana === 'resumen' ? 'active' : ''}`} onClick={() => cambiarPestana('resumen')}>
                        <BarChart3 size={16} />
                        <span>Resumen de Bodega</span>
                        {totalAgotados + totalStockBajo > 0 && (
                            <span className="catalogo-tab-count alerta-count">{totalAgotados + totalStockBajo}</span>
                        )}
                    </button>

                    <button type="button" className={`catalogo-tab-item ${pestana === 'categorias' ? 'active' : ''}`} onClick={() => cambiarPestana('categorias')}>
                        <Tag size={16} />
                        <span>Categorías de Bodega</span>
                        <span className="catalogo-tab-count">{categorias.length}</span>
                    </button>

                    <button type="button" className={`catalogo-tab-item ${pestana === 'unidades' ? 'active' : ''}`} onClick={() => cambiarPestana('unidades')}>
                        <Ruler size={16} />
                        <span>Unidades de Medida</span>
                        <span className="catalogo-tab-count">{unidades.length}</span>
                    </button>
                </div>

                {/* TABLA DE MATERIALES */}
                {pestana === 'materiales' && (
                    <>
                        {mensaje && <div className="alerta-exito">{mensaje}</div>}
                        {error && !modalMaterialAbierto && <div className="alerta-error">{error}</div>}

                        <div className="catalogo-table-card">
                            <div className="catalogo-toolbar">
                                <div className="catalogo-toolbar-left">
                                    <div className="catalogo-search-box">
                                        <Search size={15} color="#64748b" />
                                        <input
                                            type="text"
                                            maxLength={80}
                                            placeholder="Buscar por código, nombre, categoría o pasillo..."
                                            value={busqueda}
                                            onChange={(e) => setBusqueda(e.target.value)}
                                            className="catalogo-search-input"
                                        />
                                    </div>

                                    <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="catalogo-category-filter" aria-label="Filtrar por categoría">
                                        <option value="">Todas las categorías</option>
                                        {categorias.map((c) => (
                                            <option key={c.id_categoria} value={c.id_categoria}>
                                                {c.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="catalogo-filter-group">
                                    {opcionesFiltroStock.map((op) => (
                                        <button
                                            key={op.clave}
                                            type="button"
                                            onClick={() => setFiltroStock(op.clave)}
                                            className={`catalogo-filter-btn ${
                                                op.clave === 'Agotados' ? 'peligro' : ''
                                            } ${filtroStock === op.clave ? 'active' : ''}`}
                                        >
                                            {op.etiqueta}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tabla de escritorio */}
                            <div className="catalogo-table-wrapper catalogo-desktop-table">
                                <table className="catalogo-table">
                                    <thead>
                                        <tr>
                                            <th>Código</th>
                                            <th>Material / Repuesto</th>
                                            <th>Categoría</th>
                                            <th>Ubicación</th>
                                            <th>Disponible</th>
                                            <th>Reservado</th>
                                            <th>Estado de Stock</th>
                                            {puedeVerPrecios && <th>Precio Unitario</th>}
                                            {puedeEscribir && <th>Acciones</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cargando ? (
                                            <tr>
                                                <td colSpan={totalColumnasTabla} className="catalogo-empty">
                                                    Cargando materiales de bodega...
                                                </td>
                                            </tr>
                                        ) : articulosFiltrados.length === 0 ? (
                                            <tr>
                                                <td colSpan={totalColumnasTabla} className="catalogo-empty">
                                                    No se encontraron materiales con los filtros seleccionados.
                                                </td>
                                            </tr>
                                        ) : (
                                            articulosFiltrados.map((art) => {
                                                const requiereReposicion =
                                                    Number(art.stock_disponible) <= Number(art.stock_minimo);
                                                return (
                                                    <tr key={art.id_articulo}>
                                                        <td>
                                                            <span className="catalogo-code-badge">
                                                                {art.codigo_barra}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="catalogo-item-name">{art.nombre}</div>
                                                            <div className="catalogo-item-unit">
                                                                Unidad: {art.unidad_nombre}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="catalogo-category-tag">
                                                                {art.categoria_nombre}
                                                            </span>
                                                        </td>
                                                        <td>{art.ubicacion}</td>
                                                        <td className="catalogo-qty-bold">{art.stock_disponible}</td>
                                                        <td>{art.stock_comprometido}</td>
                                                        <td>
                                                            <AlertaStock
                                                                disponible={art.stock_disponible}
                                                                minimo={art.stock_minimo}
                                                            />
                                                        </td>
                                                        {puedeVerPrecios && (
                                                            <td className="catalogo-price">
                                                                ${Number(art.precio || 0).toLocaleString('es-CL')}
                                                            </td>
                                                        )}
                                                        {puedeEscribir && (
                                                            <td>
                                                                <div className="catalogo-actions-cell">
                                                                    {requiereReposicion && (
                                                                        <button type="button" onClick={() => irASolicitarMaterial(art)} className="catalogo-btn-pedir" title="Solicitar reposición a Finanzas">
                                                                            <ShoppingCart size={13} />
                                                                            <span>Pedir</span>
                                                                        </button>
                                                                    )}
                                                                    <button type="button" onClick={() => abrirModalEditarMaterial(art)} className="catalogo-btn-edit" title="Modificar datos del material">
                                                                        <Edit2 size={13} />
                                                                        <span>Editar</span>
                                                                    </button>
                                                                    {puedeEliminar && (
                                                                        <button type="button" onClick={() => borrarArticulo(art.id_articulo, art.nombre)} className="catalogo-btn-delete" title="Eliminar material">
                                                                            <Trash2 size={13} />
                                                                            <span>Eliminar</span>
                                                                        </button>
                                                                    )}
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

                            {/* Tarjetas táctiles para tablets y celulares */}
                            <div className="catalogo-mobile-cards">
                                {cargando ? (
                                    <div className="catalogo-empty">Cargando materiales de bodega...</div>
                                ) : articulosFiltrados.length === 0 ? (
                                    <div className="catalogo-empty">
                                        No se encontraron materiales con los filtros seleccionados.
                                    </div>
                                ) : (
                                    articulosFiltrados.map((art) => {
                                        const requiereReposicion =
                                            Number(art.stock_disponible) <= Number(art.stock_minimo);
                                        return (
                                            <div key={art.id_articulo} className="catalogo-mobile-card">
                                                <div className="catalogo-mobile-card-top">
                                                    <div>
                                                        <span className="catalogo-code-badge">{art.codigo_barra}</span>
                                                        <div className="catalogo-item-name" style={{ marginTop: 6 }}>
                                                            {art.nombre}
                                                        </div>
                                                    </div>
                                                    <AlertaStock
                                                        disponible={art.stock_disponible}
                                                        minimo={art.stock_minimo}
                                                    />
                                                </div>

                                                <div className="catalogo-mobile-meta">
                                                    <span>{art.categoria_nombre}</span>
                                                    <span>·</span>
                                                    <span>{art.ubicacion}</span>
                                                </div>

                                                <div className="catalogo-mobile-stats">
                                                    <div>
                                                        <small>Disponible</small>
                                                        <strong>
                                                            {art.stock_disponible} {art.unidad_nombre}
                                                        </strong>
                                                    </div>
                                                    <div>
                                                        <small>Reservado</small>
                                                        <strong>{art.stock_comprometido}</strong>
                                                    </div>
                                                    {puedeVerPrecios && (
                                                        <div>
                                                            <small>Precio</small>
                                                            <strong className="catalogo-price">
                                                                ${Number(art.precio || 0).toLocaleString('es-CL')}
                                                            </strong>
                                                        </div>
                                                    )}
                                                </div>

                                                {puedeEscribir && (
                                                    <div className="catalogo-mobile-actions">
                                                        {requiereReposicion && (
                                                            <button type="button" onClick={() => irASolicitarMaterial(art)} className="catalogo-btn-pedir">
                                                                <ShoppingCart size={14} />
                                                                <span>Pedir</span>
                                                            </button>
                                                        )}
                                                        <button type="button" onClick={() => abrirModalEditarMaterial(art)} className="catalogo-btn-edit">
                                                            <Edit2 size={14} />
                                                            <span>Editar</span>
                                                        </button>
                                                        {puedeEliminar && (
                                                            <button type="button" onClick={() => borrarArticulo(art.id_articulo, art.nombre)} className="catalogo-btn-delete">
                                                                <Trash2 size={14} />
                                                                <span>Eliminar</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* RESUMEN DE BODEGA */}
                {pestana === 'resumen' && (
                    <ResumenBodegaView
                        articulos={articulos}
                        categorias={categorias}
                        usuario={usuario}
                    />
                )}

                {/* CATEGORÍAS */}
                {pestana === 'categorias' && (
                    <CategoriasView
                        categorias={categorias}
                        articulos={articulos}
                        cargando={cargando}
                        puedeEscribir={puedeEscribir}
                        puedeEliminar={puedeEliminar}
                        onDatosActualizados={cargarDatos}
                        triggerCrear={triggerCrearCategoria}
                    />
                )}

                {/* UNIDADES */}
                {pestana === 'unidades' && (
                    <UnidadesView
                        unidades={unidades}
                        articulos={articulos}
                        cargando={cargando}
                        puedeEscribir={puedeEscribir}
                        puedeEliminar={puedeEliminar}
                        onDatosActualizados={cargarDatos}
                        triggerCrear={triggerCrearUnidad}
                    />
                )}

                {/* REGISTRAR O EDITAR MATERIAL */}
                {modalMaterialAbierto && (
                    <div className="catalogo-modal-overlay">
                        <div className="catalogo-modal-card">
                            <div className="catalogo-modal-header">
                                <div className="catalogo-modal-title">
                                    {editandoId
                                        ? `Modificar Material #${editandoId}`
                                        : 'Registrar Nuevo Material en Bodega'}
                                </div>
                                <button type="button" onClick={() => setModalMaterialAbierto(false)} className="catalogo-modal-close">X</button>
                            </div>

                            <form onSubmit={guardarArticulo} className="catalogo-modal-form">
                                {error && <div className="alerta-error">{error}</div>}

                                {bloquearStockYPrecio && (
                                    <div className="catalogo-lock-notice">
                                        <Lock size={15} />
                                        <span>
                                            Para proteger el control de bodega, el stock y el precio solo se actualizan al confirmar recepciones de compra, despachos, mermas o por Administración.
                                        </span>
                                    </div>
                                )}

                                <div className="catalogo-modal-grid">
                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Código de Barras</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={15}
                                            className="catalogo-input"
                                            placeholder="Ej: 780123456789"
                                            value={formArticulo.codigo_barra}
                                            onChange={(e) =>
                                                setFormArticulo({
                                                    ...formArticulo,
                                                    codigo_barra: e.target.value.replace(/\D/g, '').slice(0, 15),
                                                })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Nombre del Material</label>
                                        <input
                                            type="text"
                                            minLength={3}
                                            maxLength={100}
                                            className="catalogo-input"
                                            placeholder="Ej: Tubo de cobre 1/2"
                                            value={formArticulo.nombre}
                                            onChange={(e) =>
                                                setFormArticulo({ ...formArticulo, nombre: e.target.value })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Categoría</label>
                                        <select
                                            className="catalogo-select"
                                            value={formArticulo.id_categoria}
                                            onChange={(e) =>
                                                setFormArticulo({
                                                    ...formArticulo,
                                                    id_categoria: e.target.value,
                                                })
                                            }
                                            required
                                        >
                                            <option value="">Seleccione categoría...</option>
                                            {categorias.map((c) => (
                                                <option key={c.id_categoria} value={c.id_categoria}>
                                                    {c.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Unidad de Medida</label>
                                        <select
                                            className="catalogo-select"
                                            value={formArticulo.id_unidad_medida}
                                            onChange={(e) =>
                                                setFormArticulo({
                                                    ...formArticulo,
                                                    id_unidad_medida: e.target.value,
                                                })
                                            }
                                            required
                                        >
                                            <option value="">Seleccione unidad...</option>
                                            {unidades.map((u) => (
                                                <option key={u.id_unidad_medida} value={u.id_unidad_medida}>
                                                    {u.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="catalogo-field full-width">
                                        <label className="catalogo-label">Ubicación en Bodega</label>
                                        <input
                                            type="text"
                                            minLength={2}
                                            maxLength={80}
                                            className="catalogo-input"
                                            placeholder="Ej: Pasillo A - Estante 2"
                                            value={formArticulo.ubicacion}
                                            onChange={(e) =>
                                                setFormArticulo({ ...formArticulo, ubicacion: e.target.value })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Cantidad Disponible</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="1000000"
                                            disabled={bloquearStockYPrecio}
                                            className="catalogo-input"
                                            value={formArticulo.stock_disponible}
                                            onChange={(e) =>
                                                setFormArticulo({
                                                    ...formArticulo,
                                                    stock_disponible: e.target.value === '' ? '' : Number(e.target.value),
                                                })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Cantidad Mínima (Aviso)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="1000000"
                                            className="catalogo-input"
                                            value={formArticulo.stock_minimo}
                                            onChange={(e) =>
                                                setFormArticulo({
                                                    ...formArticulo,
                                                    stock_minimo: e.target.value === '' ? '' : Number(e.target.value),
                                                })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Reservado para Obras</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="1000000"
                                            disabled={bloquearStockYPrecio}
                                            className="catalogo-input"
                                            value={formArticulo.stock_comprometido}
                                            onChange={(e) =>
                                                setFormArticulo({
                                                    ...formArticulo,
                                                    stock_comprometido: e.target.value === '' ? '' : Number(e.target.value),
                                                })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Precio Unitario ($)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="999999999"
                                            disabled={bloquearStockYPrecio}
                                            className="catalogo-input"
                                            value={formArticulo.precio}
                                            onChange={(e) =>
                                                setFormArticulo({
                                                    ...formArticulo,
                                                    precio: e.target.value === '' ? '' : Number(e.target.value),
                                                })
                                            }
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="catalogo-modal-actions">
                                    <button type="button" onClick={() => setModalMaterialAbierto(false)} className="catalogo-btn-cancel">Cancelar</button>
                                    <button type="submit" className="catalogo-btn-save">
                                        {editandoId ? 'Guardar Cambios' : 'Registrar Material'}
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

export default CatalogoView;