import React, { useEffect, useState } from "react";
import { Boxes, Search, Plus, Edit2, Trash2, Tag, Ruler, Dice1 } from 'lucide-react';
import { obtenerArticulos, crearArticulo, actualizarArticulo, eliminarArticulo, obtenerCategorias, obtenerUnidades, } from '../services_api/inventarioService';
import AlertaStock from "../components/AlertaStock";
import CategoriasView from "../components/CategoriasView";
import UnidadesView from "../components/UnidadesView";
import '../styles/CatalogoView.css'

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

const CatalogoView = ({ usuario }) => {
    const [pestana, setPestana] = useState('materiales');
    const [articulos, setArticulos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [busqueda, setBusqueda] = useState('');
<<<<<<< HEAD
=======
    const [filtroStock, setFiltroStock] = useState('Todos');

    const [modalMaterialAbierto, setModalMaterialAbierto] = useState(false);
>>>>>>> origin/main
    const [formArticulo, setFormArticulo] = useState(estadoInicialArticulo);
    const [editandoId, setEditandoId] = useState(null);
    const [triggerCrearCategoria, setTriggerCrearCategoria] = useState(0);
    const [triggerCrearUnidad, setTriggerCrearUnidad] = useState(0);


    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(true);

    const rol = usuario?.rol;
    const puedeEscribir = ['administracion', 'encargado_bodega'].includes(rol);
    const puedeEliminar = rol == 'administracion';

    // Carga los materiales, categorías y unidades desde el servidor.
    const cargarDatos = async () => {
        setCargando(true);
        try {
<<<<<<< HEAD
            const resArt = await obtenerArticulos(filtro);
            if (resArt && resArt.data) {
                setArticulos(resArt.data);
                setError('');
            }
        } catch (err) {
            console.error("Error al cargar artículos:", err);
        }

        try {
            const resCat = await obtenerCategorias();
            if (resCat && resCat.data) setCategorias(resCat.data);
        } catch (err) {
            console.error("Aviso categorías:", err);
        }

        try {
            const resUni = await obtenerUnidades();
            if (resUni && resUni.data) setUnidades(resUni.data);
        } catch (err) {
            console.error("Aviso unidades:", err);
=======
            const [resArt, resCat, resUni] = await Promise.all([ obtenerArticulos(), obtenerCategorias(), obtenerUnidades(), ]);
            setArticulos(resArt.data || []);
            setCategorias(resCat.data || []);
            setUnidades(resUni.data || []);
        } catch {
            setError('No se pudo cargar el listado de materiales de bodega.');
        } finally {
            setCargando(false);
>>>>>>> origin/main
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const cambiarPestana = (nuevaPestana) => {
        setPestana(nuevaPestana);
        setMensaje('');
        setError('');
        setTriggerCrearCategoria(0);
        setTriggerCrearUnidad(0);
    };

    const abrirModalNuevoMaterial = () => {
        setEditandoId(null);
        setError('');
        setFormArticulo(estadoInicialArticulo);
        setModalMaterialAbierto(true);
    };

    const abrirModalEditarMaterial = (art) => {
        setMensaje('');
        setError('');
        setEditandoId(art.id_articulo);
        setFormArticulo({
            codigo_barra: art.codigo_barra,
            nombre: art.nombre,
            id_categoria: art.id_categoria,
            id_unidad_medida: art.id_unidad_medida,
            ubicacion: art.ubicacion,
            stock_disponible: art.stock_disponible,
            stock_minimo: art.stock_minimo,
            stock_comprometido: art.stock_comprometido,
            precio: art.precio,
        });
        setModalMaterialAbierto(true);
    };

    // Guarda un material nuevo o actualiza uno existente.
    const guardarArticulo = async (e) => {
        e.preventDefault();
        setError('');
        setMensaje('');
        try {
            if (editandoId) {
                await actualizarArticulo(editandoId, formArticulo);
                setMensaje('Los datos del material se actualizaron correctamente.');
            } else {
                await crearArticulo(formArticulo);
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
                setError('No se pudo guardar el material. Verifique que el código de barras no esté repetido.')
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
<<<<<<< HEAD
            cargarDatos(busqueda);
        } catch {
            setError('No se puede eliminar un artículo con movimientos asociados.')
        }
    };

    const agregarCategoriaRapida = async (e) => {
        e.preventDefault();
        if (!nuevaCategoria.trim()) return;
        try {
            await crearCategoria({ nombre: nuevaCategoria });
            setNuevaCategoria('');
            const resCat = await obtenerCategorias();
            if (resCat && resCat.data) setCategorias(resCat.data);
            setMensaje('Categoría creada exitosamente.');
        } catch {
            setError('Error al crear la categoría.');
        }
    };

    const agregarUnidadRapida = async (e) => {
        e.preventDefault();
        if (!nuevaUnidad.trim()) return;
        try {
            await crearUnidad({ nombre: nuevaUnidad });
            setNuevaUnidad('');
            const resUni = await obtenerUnidades();
            if (resUni && resUni.data) setUnidades(resUni.data);
            setMensaje('Unidad de medida creada exitosamente.');
        } catch {
            setError('Error al crear la unidad de medida.');
=======
            setMensaje('Material eliminado correctamente.')
            await cargarDatos();
        } catch (err) {
            const detalle = err.response?.data?.detail;
            setError(detalle || 'No se puede eliminar un material que ya tiene registros de entradas o salidas en el historial.');
        }
    };

    // Filtra los materiales según el buscador y el botón de estado seleccionado.
    const articulosFiltrados = articulos.filter((art) => {
        const esCritico = Number(art.stock_disponible) <= Number(art.stock_minimo);
        if (filtroStock === 'Stock Normal' && esCritico) return false;
        if (filtroStock === 'Stock Bajo' && !esCritico) return false;

        if (busqueda.trim() !== '') {
            const q = busqueda.toLowerCase();
            const nombreTxt = (art.nombre || '').toLowerCase();
            const codigoTxt = String(art.codigo_barra || '').toLowerCase();
            const categoriaTxt = (art.categoria_nombre || '').toLowerCase();
            const ubicacionTxt = (art.ubicacion || '').toLowerCase();
            return(
                nombreTxt.includes(q) ||
                codigoTxt.includes(q) ||
                categoriaTxt.includes(q) ||
                ubicacionTxt.includes(q)
            );
>>>>>>> origin/main
        }
        return true;
    });

    const totalStockBajo = articulos.filter((a) => Number(a.stock_disponible) <= Number(a.stock_minimo)).length;
    const totalStockNormal = articulos.length - totalStockBajo;

    return (
        <div className="contenedor-vista">
<<<<<<< HEAD
            <div className="cabecera-seccion">
                <h2>Catálogo Maestro de Artículos</h2>
                <form onSubmit={manejarBusqueda} className="barra-busqueda">
                    <input 
                        type="text"
                        placeholder="Buscar por código de barra o nombre..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                    <button type="submit" className="btn-primario">Buscar</button>
                </form>
            </div>

            {mensaje && <div className="alerta-exito">{mensaje}</div>}
            {error && <div className="alerta-error">{error}</div>}

            {puedeEscribir && (
                <div className="panel-formularios">
                    <form onSubmit={guardarArticulo} className="card-formulario">
                        <h3>{editandoId ? 'Editar Artículo' : 'Registrar Nuevo Insumo'}</h3>
                        <div className="grid-inputs">
                            <input 
                                type="number"
                                placeholder="Código de Barras"
                                value={formArticulo.codigo_barra}
                                onChange={(e) => setFormArticulo({ ...formArticulo, codigo_barra: e.target.value })}
                                required
                            />
                            <input 
                                type="text"
                                placeholder="Nombre (Ej: Tubo de cobre 1/2)"
                                value={formArticulo.nombre}
                                onChange={(e) => setFormArticulo({ ...formArticulo, nombre: e.target.value })}
                                required
                            />
                            <select value={formArticulo.id_categoria} onChange={(e) => setFormArticulo({ ...formArticulo, id_categoria: e.target.value})} required>
                                <option value="">Seleccione Categoría...</option>
                                {categorias.map((c) => (
                                    <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                                ))}
                            </select>
                            <select value={formArticulo.id_unidad_medida} onChange={(e) => setFormArticulo({ ...formArticulo, id_unidad_medida: e.target.value})} required>
                                <option value="">Seleccione Unidad...</option>
                                {unidades.map((u) => (
                                    <option key={u.id_unidad_medida} value={u.id_unidad_medida}>{u.nombre}</option>
                                ))}
                            </select>
                            <input 
                                type="text"
                                placeholder="Ubicación (Ej: Pasillo A-2)"
                                value={formArticulo.ubicacion}
                                onChange={(e) => setFormArticulo({ ...formArticulo, ubicacion: e.target.value })}
                                required
                            />
                            <label className="campo-etiqueta">
                                Stock Disponible
                                <input 
                                    type="number"
                                    min="0"
                                    value={formArticulo.stock_disponible}
                                    onChange={(e) => setFormArticulo({ ...formArticulo, stock_disponible: Number(e.target.value) })}
                                    required
                                />
                            </label>
                            <label className="campo-etiqueta">
                                Stock Mínimo
                                <input 
                                    type="number"
                                    min="0"
                                    value={formArticulo.stock_minimo}
                                    onChange={(e) => setFormArticulo({ ...formArticulo, stock_minimo: Number(e.target.value) })}
                                    required
                                />
                            </label>
                            <label className="campo-etiqueta">
                                Stock Comprometido
                                <input 
                                    type="number"
                                    min="0"
                                    value={formArticulo.stock_comprometido}
                                    onChange={(e) => setFormArticulo({ ...formArticulo, stock_comprometido: Number(e.target.value) })}
                                    required
                                />
                            </label>
                            <label className="campo-etiqueta">
                                Precio Unitario ($)
                                <input 
                                    type="number"
                                    min="0"
                                    value={formArticulo.precio}
                                    onChange={(e) => setFormArticulo({ ...formArticulo, precio: Number(e.target.value) })}
                                    required
                                />
                            </label>
                        </div>
                        <div className="acciones-form">
                            <button type="submit" className="btn-primario">
                                {editandoId ? 'Actualizar Artículo' : 'Guardar Artículo'}
                            </button>
                            {editandoId && (
                                <button type="button" className="btn-secundario" onClick={() => {setEditandoId(null); setFormArticulo(estadoInicialArticulo); }}>Cancelar</button>
                            )}
                        </div>
                    </form>

                    <div className="card-auxiliar">
                        <h4>Agregar Categoría / Unidad</h4>
                        <form onSubmit={agregarCategoriaRapida} className="form-inline">
                            <input 
                                type="text"
                                placeholder="Nueva categoría (Ej: Refrigeración)"
                                value={nuevaCategoria}
                                onChange={(e) => setNuevaCategoria(e.target.value)}
                                required
                            />
                            <button type="submit" className="btn-secundario">+ Categoría</button>
                        </form>
                        <form onSubmit={agregarUnidadRapida} className="form-inline">
                            <input 
                                type="text"
                                placeholder="Nueva unidad (Ej: Metros lineales)"
                                value={nuevaUnidad}
                                onChange={(e) => setNuevaUnidad(e.target.value)}
                                required
                            />
                            <button type="submit" className="btn-secundario">+ Unidad</button>
                        </form>
                    </div>
                </div>
            )}

            <div className="vista-pc-tabla">
                <table className="tabla-fyag">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Insumo</th>
                            <th>Categoría</th>
                            <th>Ubicación</th>
                            <th>Disponible</th>
                            <th>Comprometido</th>
                            <th>Estado Stock</th>
                            <th>Precio</th>
                            {puedeEscribir && <th>Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {articulos.map((art) => (
                            <tr key={art.id_articulo}>
                                <td>{art.codigo_barra}</td>
                                <td><strong>{art.nombre}</strong> ({art.unidad_nombre})</td>
                                <td>{art.categoria_nombre}</td>
                                <td>{art.ubicacion}</td>
                                <td>{art.stock_disponible}</td>
                                <td>{art.stock_comprometido}</td>
                                <td>
                                    <AlertaStock disponible={art.stock_disponible} minimo={art.stock_minimo} />
                                </td>
                                <td>${art.precio.toLocaleString('es-CL')}</td>
                                {puedeEscribir && (
                                    <td>
                                        <button onClick={() => seleccionarParaEditar(art)} className="btn-tabla">Editar</button>
                                        {puedeEliminar && (
                                            <button onClick={() => borrarArticulo(art.id_articulo)} className="btn-peligro">Eliminar</button>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="vista-tablet-tarjetas">
                {articulos.map((art) => (
                    <div key={art.id_articulo} className="tarjeta-tactil">
                        <div className="tarjeta-cabecera">
                            <strong>{art.nombre}</strong>
                            <AlertaStock disponible={art.stock_disponible} minimo={art.stock_minimo} />
                        </div>
                        <p className="tarjeta-meta">
                            Código: {art.codigo_barra} | Ubicación: {art.ubicacion}
=======
            <div className="catalogo-container">
                <div className="catalogo-header">
                    <div>
                        <h1 className="catalogo-title">Catálogo de Materiales y Repuestos de Bodega</h1>
                        <p className="catalogo-subtitle">
                            Control de existencias disponibles, clasificación de bodega, precios y avisos de reposición
>>>>>>> origin/main
                        </p>
                    </div>

                    <div className="catalogo-header-actions">
                        {puedeEscribir && pestana === 'materiales' && (
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

                <div className="catalogo-tabs-bar">
                    <button type="button" className={`catalogo-tab-item ${pestana === 'materiales' ? 'active' : ''}`} onClick={() => cambiarPestana('materiales')}>
                        <Boxes size={16} />
                        <span>Materiales y Repuestos</span>
                        <span className="catalogo-tab-count">{articulos.length}</span>
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

                {pestana === 'materiales' && (
                    <>
                        {mensaje && <div className="alerta-exito">{mensaje}</div>}
                        {error && !modalMaterialAbierto && <div className="alerta-error">{error}</div>}

                        <div className="catalogo-kpi-grid">
                            <div className="catalogo-kpi-card">
                                <div className="catalogo-kpi-label">Total de Materiales en Catálogo</div>
                                <div className="catalogo-kpi-value">{articulos.length}</div>
                            </div>
                            <div className="catalogo-kpi-card">
                                <div className="catalogo-kpi-label">Con Stock Suficiente</div>
                                <div className="catalogo-kpi-value">{totalStockNormal}</div>
                            </div>
                            <div className="catalogo-kpi-card">
                                <div className="catalogo-kpi-label">Materiales por Agotarse</div>
                                <div className="catalogo-kpi-value">{totalStockBajo}</div>
                            </div>
                        </div>

                        <div className="catalogo-table-card">
                            <div className="catalogo-toolbar">
                                <div className="catalogo-search-box">
                                    <Search size={15} color="#64748b" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por código, nombre, categoría o pasillo..."
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        className="catalogo-search-input"
                                    />
                                </div>

                                <div className="catalogo-filter-group">
                                    {['Todos', 'Stock Normal', 'Stock Bajo'].map((f) => (
                                        <button
                                            key={f}
                                            type="button"
                                            onClick={() => setFiltroStock(f)}
                                            className={`catalogo-filter-btn ${filtroStock === f ? 'active' : ''}`}
                                        >{f}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="catalogo-table-wrapper">
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
                                            <th>Precio Unitario</th>
                                            {puedeEscribir && <th>Acciones</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cargando ? (
                                            <tr>
                                                <td colSpan={puedeEscribir ? 9 : 8} className="catalogo-empty">
                                                    Cargando materiales de bodega...
                                                </td>
                                            </tr>
                                        ) : articulosFiltrados.length === 0 ? (
                                            <tr>
                                                <td colSpan={puedeEscribir ? 9 : 8} className="catalogo-empty">
                                                    No se encontraron materiales con los filtros seleccionados.
                                                </td>
                                            </tr>
                                        ) : (
                                            articulosFiltrados.map((art) => (
                                                <tr key={art.id_articulo}>
                                                    <td>
                                                        <span className="catalogo-code-badge">
                                                            {art.codigo_barra}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="catalogo-item-name">{art.nombre}</div>
                                                        <div className="catalogo-item-unit">Unidad: {art.unidad_nombre}</div>
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
                                                    <td className="catalogo-price">
                                                        ${Number(art.precio || 0).toLocaleString('es-CL')}
                                                    </td>
                                                    {puedeEscribir && (
                                                        <td>
                                                            <div className="catalogo-actions-cell">
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
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

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

                {modalMaterialAbierto && (
                    <div className="catalogo-modal-overlay">
                        <div className="catalogo-modal-card">
                            <div className="catalogo-modal-header">
                                <div className="catalogo-modal-title">
                                    {editandoId ? `Modificar Material #${editandoId}` : 'Registrar Nuevo Material en Bodega'}
                                </div>
                                <button type="button" onClick={() => setModalMaterialAbierto(false)} className="catalogo-modal-close">X</button>
                            </div>

                            <form onSubmit={guardarArticulo} className="catalogo-modal-form">
                                {error && <div className="alerta-error">{error}</div>}

                                <div className="catalogo-modal-grid">
                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Código de Barras</label>
                                        <input
                                            type="number"
                                            className="catalogo-input"
                                            placeholder="Ej: 780123456789"
                                            value={formArticulo.codigo_barra}
                                            onChange={(e) => setFormArticulo({ ...formArticulo, codigo_barra: e.target.value, })}
                                            required
                                        />
                                    </div>

                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Nombre del Material</label>
                                        <input
                                            type="text"
                                            className="catalogo-input"
                                            placeholder="Ej: Tubo de cobre 1/2"
                                            value={formArticulo.nombre}
                                            onChange={(e) => setFormArticulo({ ...formArticulo, nombre: e.target.value, })}
                                            required
                                        />
                                    </div>

                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Categoría</label>
                                        <select className="catalogo-select" value={formArticulo.id_categoria} onChange={(e) => setFormArticulo({ ...formArticulo, id_categoria: e.target.value, })} required>
                                            <option value="">Seleccione categoría...</option>
                                            {categorias.map((c) => (
                                                <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Unidad de Medida</label>
                                        <select className="catalogo-select" value={formArticulo.id_unidad_medida} onChange={(e) => setFormArticulo({ ...formArticulo, id_unidad_medida: e.target.value, })} required>
                                            <option value="">Seleccione unidad...</option>
                                            {unidades.map((u) => (
                                                <option key={u.id_unidad_medida} value={u.id_unidad_medida}>{u.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="catalogo-field full-width">
                                        <label className="catalogo-label">Ubicación en Bodega</label>
                                        <input
                                            type="text"
                                            className="catalogo-input"
                                            placeholder="Ej: Pasillo A - Estante 2"
                                            value={formArticulo.ubicacion}
                                            onChange={(e) => setFormArticulo({ ...formArticulo, ubicacion: e.target.value, })}
                                            required
                                        />
                                    </div>

                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Cantidad Disponible</label>
                                        <input
                                            type="Number"
                                            min="0"
                                            className="catalogo-input"
                                            value={formArticulo.stock_disponible}
                                            onChange={(e) => setFormArticulo({ ...formArticulo, stock_disponible: Number(e.target.value), })}
                                            required
                                        />
                                    </div>

                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Cantidad Mínima (Aviso)</label>
                                        <input
                                            type="Number"
                                            min="0"
                                            className="catalogo-input"
                                            value={formArticulo.stock_minimo}
                                            onChange={(e) => setFormArticulo({ ...formArticulo, stock_minimo: Number(e.target.value), })}
                                            required
                                        />
                                    </div>

                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Reservado para Obras</label>
                                        <input
                                            type="Number"
                                            min="0"
                                            className="catalogo-input"
                                            value={formArticulo.stock_comprometido}
                                            onChange={(e) => setFormArticulo({ ...formArticulo, stock_comprometido: Number(e.target.value), })}
                                            required
                                        />
                                    </div>

                                    <div className="catalogo-field">
                                        <label className="catalogo-label">Precio Unitario ($)</label>
                                        <input
                                            type="Number"
                                            min="0"
                                            className="catalogo-input"
                                            value={formArticulo.precio}
                                            onChange={(e) => setFormArticulo({ ...formArticulo, precio: Number(e.target.value), })}
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