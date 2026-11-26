import React, { useEffect, useState } from "react";
import { Search, Edit2, Trash2 } from 'lucide-react';
import { crearCategoria, actualizarCategoria, eliminarCategoria, } from "../services_api/inventarioService";

// Sub-módulo para listar, buscar, registrar, editar y eliminar categorías de bodega.
export default function CategoriasView({
    categorias = [], 
    articulos = [], 
    cargando = false, 
    puedeEscribir = false, 
    puedeEliminar = false, 
    onDatosActualizados, 
    triggerCrear = 0, 
}) {
    const [busqueda, setBusqueda] = useState('');
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [nombre, setNombre] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    // Abre el modal de nueva categoría.
    useEffect(() => {
        if (triggerCrear > 0) {
            setEditandoId(null);
            setNombre('');
            setError('');
            setModalAbierto(true);
        }
    }, [triggerCrear]);

    // Carga la categoría elegida para modificarla.
    const abrirModalEditar = (cat) => {
        setEditandoId(cat.id_categoria);
        setNombre(cat.nombre || '');
        setError('');
        setModalAbierto(true);
    };

    // Guarda los datos validando el texto ingresado.
    const guardarCategoria = async (e) => {
        e.preventDefault();

        const nombre_limpio = nombre.trim();
        if (nombre_limpio.length < 2 || nombre_limpio.length > 50) {
            setError('El nombre de la categoría debe tener entre 2 y 50 caracteres.');
            return;
        }

        setError('');
        setMensaje('');

        try {
            if (editandoId) {
                await actualizarCategoria(editandoId, { nombre: nombre_limpio });
                setMensaje('Categoría actualizada correctamente.');
            } else {
                await crearCategoria({ nombre: nombre_limpio });
                setMensaje('Nueva categoría registrada correctamente.');
            }
            setModalAbierto(false);
            setEditandoId(null);
            setNombre('');
            if (onDatosActualizados) await onDatosActualizados();
        } catch (err) {
            const dataErr = err.response?.data;
            if (dataErr && typeof dataErr === 'object') {
                setError(Object.values(dataErr).flat().join(' '));
            } else {
                setError('No se pudo guardar la categoría. Verifique que el nombre no esté repetido.');
            }
        }
    };

    // Elimina una categoría.
    const borrarCategoria = async (cat) => {
        if (!window.confirm(`¿Está seguro de eliminar la categoría "${cat.nombre}"?`)) return;
        setError('');
        setMensaje('');

        try {
            await eliminarCategoria(cat.id_categoria);
            setMensaje('Categoría eliminada correctamente.');
            if (onDatosActualizados) await onDatosActualizados();
        } catch (err) {
            const detalle = err.response?.data?.detail;
            setError(
                detalle || 
                    'No se puede eliminar esta categoría porque ya está asignada a materiales en el catálogo.'
            );
        }
    };

    // Cuenta cuántos materiales del catálogo pertenecen a cada categoría.
    const contarMateriales = (idCategoria) => 
        articulos.filter((a) => Number(a.id_categoria) === Number(idCategoria)).length;

    const categoriasFiltradas = categorias.filter((cat) => 
        (cat.nombre || '').toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="catalogo-submodulo">
            {mensaje && <div className="alerta-exito">{mensaje}</div>}
            {error && !modalAbierto && <div className="alerta-error">{error}</div>}

            <div className="catalogo-table-card">
                <div className="catalogo-toolbar">
                    <div className="catalogo-search-box">
                        <Search size={15} color="#64748b" />
                        <input
                            type="text"
                            maxLength={80}
                            placeholder="Buscar categoría por nombre..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="catalogo-search-input"
                        />
                    </div>

                    <div className="catalogo-count-label">
                        {categoriasFiltradas.length} categorías registradas
                    </div>
                </div>

                <div className="catalogo-table-wrapper">
                    <table className="catalogo-table">
                        <thead>
                            <tr>
                                <th>Nombre de la Categoría</th>
                                <th>Materiales Asociados</th>
                                <th>Estado</th>
                                {puedeEscribir && <th>Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {cargando ? (
                                <tr>
                                    <td colSpan={puedeEscribir ? 4 : 3} className="catalogo-empty">
                                        Cargando listado de categorías...
                                    </td>
                                </tr>
                            ): categoriasFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={puedeEscribir ? 4 : 3} className="catalogo-empty">
                                        No se encontraron categorías con el nombre buscado.
                                    </td>
                                </tr>
                            ) : (
                                categoriasFiltradas.map((cat) => {
                                    const totalAsociados = contarMateriales(cat.id_categoria);
                                    return(
                                        <tr key={cat.id_categoria}>
                                            <td className="catalogo-item-name">{cat.nombre}</td>
                                            <td>
                                                <span className="catalogo-category-tag">
                                                    {totalAsociados}{' '}
                                                    {totalAsociados === 1 ? 'material' : 'materiales'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`catalogo-usage-badge ${totalAsociados > 0 ? 'en-uso' : 'libre'}`}>
                                                    {totalAsociados > 0 ? 'En uso' : 'Sin materiales'}
                                                </span>
                                            </td>
                                            {puedeEscribir && (
                                                <td>
                                                    <div className="catalogo-actions-cell">
                                                        <button type="button" onClick={() => abrirModalEditar(cat)} className="catalogo-btn-edit" title="Editar categoría">
                                                            <Edit2 size={13} />
                                                            <span>Editar</span>
                                                        </button>
                                                        {puedeEliminar && (
                                                            <button type="button" onClick={() => borrarCategoria(cat)} className="catalogo-btn-delete" title="Eliminar categoría">
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
            </div>

            {modalAbierto && (
                <div className="catalogo-modal-overlay">
                    <div className="catalogo-modal-card small">
                        <div className="catalogo-modal-header">
                            <div className="catalogo-modal-title">
                                {editandoId ? 'Modificar Categoría' : 'Registrar Nueva Categoría'}
                            </div>
                            <button type="button" onClick={() => setModalAbierto(false)} className="catalogo-modal-close">X</button>
                        </div>

                        <form onSubmit={guardarCategoria} className="catalogo-modal-form">
                            {error && <div className="alerta-error">{error}</div>}

                            <div className="catalogo-field">
                                <label className="catalogo-label">Nombre de la Categoría</label>
                                <input
                                    type="text"
                                    required
                                    minLength={2}
                                    maxLength={50}
                                    placeholder="Ej: Refrigeración, Electricidad, Fitting..."
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    className="catalogo-input"
                                />
                            </div>

                            <div className="catalogo-modal-actions">
                                <button type="button" onClick={() => setModalAbierto(false)} className="catalogo-btn-cancel">Cancelar</button>
                                <button type="submit" className="catalogo-btn-save">
                                    {editandoId ? 'Guardar Cambios' : 'Registrar Categoría'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}