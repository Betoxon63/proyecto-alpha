import React, { useEffect, useState } from "react";
import { obtenerArticulos, crearArticulo, actualizarArticulo, eliminarArticulo, obtenerCategorias, crearCategoria, obtenerUnidades, crearUnidad, } from '../services_api/inventarioService';
import AlertaStock from "../components/AlertaStock";

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
    const [formArticulo, setFormArticulo] = useState(estadoInicialArticulo);
    const [editandoId, setEditandoId] = useState(null);
    const [nuevaCategoria, setNuevaCategoria] = useState('');
    const [nuevaUnidad, setNuevaUnidad] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    const rol = usuario?.rol;
    const puedeEscribir = ['administracion', 'encargado_bodega'].includes(rol);
    const puedeEliminar = rol == 'administracion';

    const cargarDatos = async (filtro = '') => {
        try {
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
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const manejarBusqueda = (e) => {
        e.preventDefault();
        cargarDatos(busqueda);
    };

    const guardarArticulo = async (e) => {
        e.preventDefault();
        setError('');
        setMensaje('');
        try {
            if (editandoId) {
                await actualizarArticulo(editandoId, formArticulo);
                setMensaje('Artículo actualizado correctamente.');
            } else {
                await crearArticulo(formArticulo);
                setMensaje('Artículo registrado en el catálogo maestro.');
            }
            setFormArticulo(estadoInicialArticulo);
            setEditandoId(null);
            cargarDatos(busqueda);
        } catch (err) {
            setError(JSON.stringify(err.response?.data || 'Error al guardar el artículo.'));
        }
    };

    const seleccionarParaEditar = (art) => {
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

    const borrarArticulo = async (id) => {
        if (!window.confirm('¿confirmar eliminación del artículo?')) return;
        try {
            await eliminarArticulo(id);
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
        }
    };

    return (
        <div className="contenedor-vista">
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
                        </p>
                        <div className="tarjeta-saldos">
                            <span>Disponible: <strong>{art.stock_disponible} {art.unidad_nombre}</strong></span>
                            <span>Comprometido: <strong>{art.stock_comprometido}</strong></span>
                            <span>Precio: <strong>{art.precio.toLocaleString('es-CL')}</strong></span>
                        </div>
                        {puedeEscribir && (
                            <div className="tarjeta-botones">
                                <button onClick={() => seleccionarParaEditar(art)} className="btn-primario">Editar Insumo</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CatalogoView;