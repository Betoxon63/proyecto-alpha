import React, { useEffect, useState } from "react";
import { Search, Edit2, Trash2 } from 'lucide-react';
import { crearUnidad, actualizarUnidad, eliminarUnidad, } from "../services_api/inventarioService";

export default function UnidadesView({unidades = [], articulos = [], cargando = false, puedeEscribir = false, puedeEliminar = false, onDatosActualizados, triggerCrear = 0, }) {
    const [busqueda, setBusqueda] = useState('');
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [nombre, setNombre] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    // Abre el modal de nueva unidad cuando se presiona el botón superior de la vista principal.
    useEffect(() => {
        if (triggerCrear > 0) {
            setEditandoId(null);
            setNombre('');
            setError('');
            setModalAbierto(true);
        }
    }, [triggerCrear]);

    const abrirModalEditar = (uni) => {
        setEditandoId(uni.id_unidad_medida);
        setNombre(uni.nombre || '');
        setError('');
        setModalAbierto(true);
    };

    const guardarUnidad = async (e) => {
        e.preventDefault();
        if (!nombre.trim()) return;
        setError('');
        setMensaje('');

        try {
            if (editandoId) {
                await actualizarUnidad(editandoId, { nombre: nombre.trim() });
                setMensaje('Unidad de medida actualizada correctamente.');
            } else {
                await crearUnidad({ nombre: nombre.trim() });
                setMensaje('Nueva unidad de medida registrada correctamente.');
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
                setError('No se pudo guardar la unidad de medida. Verifique que no esté repetida.');
            }
        }
    };

    const borrarUnidad = async (uni) => {
        if (!window.confirm(`¿Está seguro de eliminar la unidad de medida "${uni.nombre}"?`)) return;
        setError('');
        setMensaje('');

        try {
            await eliminarUnidad(uni.id_unidad_medida);
            setMensaje('Unidad de medida eliminada correctamente.');
            if (onDatosActualizados) await onDatosActualizados();
        } catch (err) {
            const detalle = err.response?.data?.detail;
            setError(detalle || 'No se puede eliminar esta unidad de medida porque ya está siendo usada por materiales en el catálogo.');
        }
    };

    const contarMateriales = (idUnidad) => articulos.filter((a) => Number(a.id_unidad_medida) === Number(idUnidad)).length;
    const unidadesFiltradas = unidades.filter((uni) => (uni.nombre || '').toLowerCase().includes(busqueda.toLowerCase()));

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
                            placeholder="Buscar unidad de medida..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="catalogo-search-input"
                        />
                    </div>

                    <div className="catalogo-count-label">
                        {unidadesFiltradas.length} unidades registradas
                    </div>
                </div>

                <div className="catalogo-table-wrapper">
                    <table className="catalogo-table">
                        <thead>
                            <tr>
                                <th>Nombre de la Unidad de Medida</th>
                                <th>Materiales Asociados</th>
                                <th>Estado</th>
                                {puedeEscribir && <th>Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {cargando ? (
                                <tr>
                                    <td colSpan={puedeEscribir ? 4 : 3} className="catalogo-empty">
                                        Cargando unidades de medida...
                                    </td>
                                </tr>
                            ): unidadesFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={puedeEscribir ? 4 : 3} className="catalogo-empty">
                                        No se encontraron unidades de medida con el nombre buscado.
                                    </td>
                                </tr>
                            ) : (
                                unidadesFiltradas.map((uni) => {
                                    const totalAsociados = contarMateriales(uni.id_unidad_medida);
                                    return(
                                        <tr key={uni.id_unidad_medida}>
                                            <td className="catalogo-item-name">{uni.nombre}</td>
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
                                                        <button type="button" onClick={() => abrirModalEditar(uni)} className="catalogo-btn-edit" title="Editar unidad de medida">
                                                            <Edit2 size={13} />
                                                            <span>Editar</span>
                                                        </button>
                                                        {puedeEliminar && (
                                                            <button type="button" onClick={() => borrarUnidad(uni)} className="catalogo-btn-delete" title="Eliminar unidad de medida">
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
                                {editandoId ? 'Modificar Unidad de Medida' : 'Registrar Nueva Unidad de Medida'}
                            </div>
                            <button type="button" onClick={() => setModalAbierto(false)} className="catalogo-modal-close">X</button>
                        </div>

                        <form onSubmit={guardarUnidad} className="catalogo-modal-form">
                            {error && <div className="alerta-error">{error}</div>}

                            <div className="catalogo-field">
                                <label className="catalogo-label">Nombre de la Unidad</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Unidad, Metros lineales, Cilindro, Litros..."
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    className="catalogo-input"
                                />
                            </div>

                            <div className="catalogo-modal-actions">
                                <button type="button" onClick={() => setModalAbierto(false)} className="catalogo-btn-cancel">Cancelar</button>
                                <button type="submit" className="catalogo-btn-save">
                                    {editandoId ? 'Guardar Cambios' : 'Registrar Unidad'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}