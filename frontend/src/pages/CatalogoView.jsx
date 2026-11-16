import React, { useEffect, useState } from "react";
import { Boxes, Search, PlusCircle, Edit2, Trash2, Tag } from 'lucide-react';
import { obtenerArticulos, crearArticulo, actualizarArticulo, eliminarArticulo, obtenerCategorias, crearCategoria, obtenerUnidades, crearUnidad, } from '../services_api/inventarioService';
import AlertaStock from "../components/AlertaStock";
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
    const [articulos, setArticulos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [filtroStock, setFiltroStock] = useState('Todos');
    const [formArticulo, setFormArticulo] = useState(estadoInicialArticulo);
    const [editandoId, setEditandoId] = useState(null);
    const [nuevaCategoria, setNuevaCategoria] = useState('');
    const [nuevaUnidad, setNuevaUnidad] = useState('');
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
            const [resArt, resCat, resUni] = await Promise.all([
                obtenerArticulos(),
                obtenerCategorias(),
                obtenerUnidades(),
            ]);
            setArticulos(resArt.data || []);
            setCategorias(resCat.data || []);
            setUnidades(resUni.data || []);
        } catch {
            setError('No se pudo cargar el listado de materiales de bodega.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

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

    // Carga los datos del material seleccionado en el formulario para editarlo.
    const seleccionarParaEditar = (art) => {
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
        } catch {
            setError('No se puede eliminar un material que ya tiene registros de entradas o salidas en el historial.');
        }
    };

    // Permite crear rápidamente una nueva categoría de materiales.
    const agregarCategoriaRapida = async (e) => {
        e.preventDefault();
        if (!nuevaCategoria.trim()) return;
        setError('');
        setMensaje('');
        try {
            await crearCategoria({ nombre: nuevaCategoria.trim() });
            setNuevaCategoria('');
            setMensaje('Nueva categoría agregada correctamente.');
            await cargarDatos();
        } catch {
            setError('No se pudo crear la categoría (verifique que no exista una con el mismo nombre).');
        }
    };

    // Permite crear rápidamente una nueva unidad de medida.
    const agregarUnidadRapida = async (e) => {
        e.preventDefault();
        if (!nuevaUnidad.trim()) return;
        setError('');
        setMensaje('');
        try {
            await crearUnidad({ nombre: nuevaUnidad.trim() });
            setNuevaUnidad('');
            setMensaje('Nueva unidad de medida agregada correctamente.');
            await cargarDatos();
        } catch {
            setError('No se pudo crear la unidad de medida (verifique que no esté repetida).');
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
        }
        return true;
    });

    const totalStockBajo = articulos.filter((a) => Number(a.stock_disponible) <= Number(a.stock_minimo)).length;
    const totalStockNormal = articulos.length - totalStockBajo;

    return (
        <div className="contenedor-vista">
            <div className="catalogo-container">
                <div className="catalogo-header">
                    <div>
                        <h1 className="catalogo-title">Catálogo de Materiales y Repuestos de Bodega</h1>
                        <p className="catalogo-subtitle">
                            Control de existencias disponibles, ubicaciones en bodega, precios y avisos de reposición
                        </p>
                    </div>
                </div>

                {mensaje && <div className="alerta-exito">{mensaje}</div>}
                {error && <div className="alerta-error">{error}</div>}

                <div className="catalogo-kpi-grid">
                    <div className="catalogo-kpi-card">
                        <div className="catalogo-kpi-label">Total de Materiales en Catálogo</div>
                        <div className="catalogo-kpi-value">{articulos.length}</div>
                    </div>
                    <div className="catalogo-kpi-card">
                        <div className="catalogo-kpi-label">Con Stock Suficiente</div>
                        <div className="catalogo-kpi-value">{totalStockNormal}</div>
                    </div>
                    <div className="catalogo-kpi-card alerta">
                        <div className="catalogo-kpi-label">Materiales por Agotarse</div>
                        <div className="catalogo-kpi-value">{totalStockBajo}</div>
                    </div>
                </div>

                {puedeEscribir && (
                    <div className="catalogo-forms-layout">
                        <form onSubmit={guardarArticulo} className="catalogo-card">
                            <h3 className="catalogo-card-title">
                                <Boxes size={18} color="#1b5e20" />
                                <span>{editandoId ? `Modificar Material #${editandoId}` : 'Registrar Nuevo Material en Bodega'}</span>
                            </h3>

                            <div className="catalogo-form-grid">
                                <div className="catalogo-field">
                                    <label className="catalogo-label">Código de Barras</label>
                                    <input
                                        type="number"
                                        className="catalogo-input"
                                        placeholder="Ej: 780123456789"
                                        value={formArticulo.codigo_barra}
                                        onChange={(e) => setFormArticulo({ ...formArticulo, codigo_barra: e.target.value })}
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
                                        onChange={(e) => setFormArticulo({ ...formArticulo, nombre: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="catalogo-field">
                                    <label className="catalogo-label">Categoría</label>
                                    <select className="catalogo-select" value={formArticulo.id_categoria} onChange={(e) => setFormArticulo({ ...formArticulo, id_categoria: e.target.value })} required>
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
                                    <select className="catalogo-select" value={formArticulo.id_unidad_medida} onChange={(e) => setFormArticulo({ ...formArticulo, id_unidad_medida: e.target.value })} required>
                                        <option value="">Seleccione unidad...</option>
                                        {unidades.map((u) => (
                                            <option key={u.id_unidad_medida} value={u.id_unidad_medida}>
                                                {u.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="catalogo-field">
                                    <label className="catalogo-label">Ubicación en Bodega</label>
                                    <input
                                        type="text"
                                        className="catalogo-input"
                                        placeholder="Ej: Pasillo A - Estante 2"
                                        value={formArticulo.ubicacion}
                                        onChange={(e) => setFormArticulo({ ...formArticulo, ubicacion: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="catalogo-field">
                                    <label className="catalogo-label">Cantidad Disponible</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="catalogo-input"
                                        value={formArticulo.stock_disponible}
                                        onChange={(e) => setFormArticulo({ ...formArticulo, stock_disponible: Number(e.target.value) })}
                                        required
                                    />
                                </div>

                                <div className="catalogo-field">
                                    <label className="catalogo-label">Cantidad Mínima (Aviso)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="catalogo-input"
                                        value={formArticulo.stock_minimo}
                                        onChange={(e) => setFormArticulo({ ...formArticulo, stock_minimo: Number(e.target.value) })}
                                        required
                                    />
                                </div>

                                <div className="catalogo-field">
                                    <label className="catalogo-label">Reservado para Obras</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="catalogo-input"
                                        value={formArticulo.stock_comprometido}
                                        onChange={(e) => setFormArticulo({ ...formArticulo, stock_comprometido: Number(e.target.value) })}
                                        required
                                    />
                                </div>

                                <div className="catalogo-field">
                                    <label className="catalogo-label">Precio Unitario ($)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="catalogo-input"
                                        value={formArticulo.precio}
                                        onChange={(e) => setFormArticulo({ ...formArticulo, precio: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="catalogo-form-actions">
                                <button type="submit" className="catalogo-btn-save">
                                    <PlusCircle size={16} />
                                    <span>{editandoId ? 'Guardar Cambios' : 'Guardar Material'}</span>
                                </button>
                                {editandoId && (
                                    <button
                                        type="button"
                                        className="catalogo-btn-cancel"
                                        onClick={() => {
                                            setEditandoId(null);
                                            setFormArticulo(estadoInicialArticulo);
                                        }}
                                    >Cancelar</button>
                                )}
                            </div>
                        </form>

                        <div className="catalogo-card catalogo-aux-stack">
                            <h3 className="catalogo-card-title">
                                <Tag size={18} color="#1b5e20" />
                                <span>Clasificación de Bodega</span>
                            </h3>

                            <form onSubmit={agregarCategoriaRapida} className="catalogo-aux-form">
                                <label className="catalogo-label">Nueva Categoría de Material</label>
                                <div className="catalogo-aux-row">
                                        <input
                                            type="text"
                                            className="catalogo-input"
                                            placeholder="Ej: Refrigeración"
                                            value={nuevaCategoria}
                                            onChange={(e) => setNuevaCategoria(e.target.value)}
                                            required
                                        />
                                        <button type="submit" className="catalogo-btn-aux">
                                            + Categoría
                                        </button>
                                    </div>
                            </form>

                            <form onSubmit={agregarUnidadRapida} className="catalogo-aux-form">
                                <label className="catalogo-label">Nueva Unidad de Medida</label>
                                <div className="catalogo-aux-row">
                                        <input
                                            type="text"
                                            className="catalogo-input"
                                            placeholder="Ej: Metros lineales"
                                            value={nuevaUnidad}
                                            onChange={(e) => setNuevaUnidad(e.target.value)}
                                            required
                                        />
                                        <button type="submit" className="catalogo-btn-aux">
                                            + Unidad
                                        </button>
                                    </div>
                            </form>
                        </div>
                    </div>
                )}

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
                                    {puedeEscribir && <th>Opciones</th>}
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
                                                <span className="catalogo-category-tag">{art.categoria_nombre}</span>
                                            </td>
                                            <td>{art.ubicacion}</td>
                                            <td className="catalogo-qty-bold">{art.stock_disponible}</td>
                                            <td>{art.stock_comprometido}</td>
                                            <td>
                                                <AlertaStock disponible={art.stock_disponible} minimo={art.stock_minimo} />
                                            </td>
                                            <td className="catalogo-price">
                                                ${Number(art.precio || 0).toLocaleString('es-CL')}
                                            </td>
                                            {puedeEscribir && (
                                                <td>
                                                    <div className="catalogo-actions-cell">
                                                        <button type="button" onClick={() => seleccionarParaEditar(art)} className="catalogo-btn-edit">
                                                            <Edit2 size={13} />
                                                            <span>Editar</span>
                                                        </button>
                                                        {puedeEliminar && (
                                                            <button type="button" onClick={() => borrarArticulo(art.id_articulo, art.nombre)} className="catalogo-btn-delete">
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
            </div>
        </div>
    );
};

export default CatalogoView;