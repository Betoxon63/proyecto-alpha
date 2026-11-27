import React, { useEffect, useState } from "react";
import { Search, Edit2, Trash2 } from 'lucide-react';
import { crearTipoServicio, actualizarTipoServicio, eliminarTipoServicio } from '../services_api/obrasService';

// Sub-módulo encargado de administrar los tipos de servicio de las obras.
export default function TiposServicioView({ tiposServicio = [], obras = [], cargando = false, onDatosActualizados, triggerCrear = 0 }) {
    const [busqueda, setBusqueda] = useState('');
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [nombre, setNombre] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    // Abre el formulario.
    useEffect(() => {
        if (triggerCrear > 0) {
            setEditandoId(null);
            setNombre('');
            setError('');
            setModalAbierto(true);
        }
    }, [triggerCrear]);

    // Carga el tipo de servicio elegido para su edición.
    const abrirModalEditar = (tipo) => {
        setEditandoId(tipo.id_tipo_servicio);
        setNombre(tipo.nombre || '');
        setError('');
        setModalAbierto(true);
    };

    // Valida el nombre y guarda el tipo de servicio en el servidor.
    const guardarTipo = async (e) => {
        e.preventDefault();
        const nombreLimpio = nombre.trim();
        if (nombreLimpio.length < 2 || nombreLimpio.length > 60) {
            setError('El nombre del servicio debe tener entre 2 y 60 caracteres.');
            return;
        }

        setError('');
        setMensaje('');

        try {
            if (editandoId) {
                await actualizarTipoServicio(editandoId, { nombre: nombreLimpio });
                setMensaje('Tipo de servicio actualizado correctamente.');
            } else {
                await crearTipoServicio({ nombre: nombreLimpio });
                setMensaje('Nuevo tipo de servicio registrado correctamente.');
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
                setError('No se pudo guardar el tipo de servicio. Verifique que no esté repetido.');
            }
        }
    };

    // Gestiona le eliminación de un tipo de servicio.
    const borrarTipo = async (tipo) => {
        if (!window.confirm(`¿Está seguro de eliminar el tipo de servicio "${tipo.nombre}"?`)) return;
        setError('');
        setMensaje('');

        try {
            await eliminarTipoServicio(tipo.id_tipo_servicio);
            setMensaje('Tipo de servicio eliminado correctamente.');
            if (onDatosActualizados) await onDatosActualizados();
        } catch (err) {
            const detalle = err.response?.data?.detail;
            setError(
                detalle ||
                    'No se puede eliminar este tipo de servicio porque ya está asignado a una o más obras.'
            );
        }
    };

    // Cuenta cuántas obras utilizan cada tipo de servicio.
    const contarObras = (idTipo) => obras.filter((o) => Number(o.id_tipo_servicio) === Number(idTipo)).length;
    const tiposFiltrados = tiposServicio.filter((t) => (t.nombre || '').toLowerCase().includes(busqueda.toLowerCase()));

    return (
        <div className="obras-submodulo">
            {mensaje && <div className="alerta-exito">{mensaje}</div>}
            {error && !modalAbierto && <div className="alerta-error">{error}</div>}

            <div className="obras-table-card">
                <div className="obras-toolbar">
                    <div className="obras-search-box">
                        <Search size={15} color="#64748b" />
                        <input
                            type="text"
                            maxLength={80}
                            placeholder="Buscar tipo de servicio por nombre..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="obras-search-input"
                        />
                    </div>

                    <span className="obras-count-label">
                        {tiposFiltrados.length} tipos de servicio registrados
                    </span>
                </div>

                <div className="obras-table-wrapper">
                    <table className="obras-table">
                        <thead>
                            <tr>
                                <th>Nombre del Tipo de Servicio</th>
                                <th>Obras Asociadas</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cargando ? (
                                <tr>
                                    <td colSpan={4} className="obras-empty">
                                        Cargando tipos de servicio...
                                    </td>
                                </tr>
                            ) : tiposFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="obras-empty">
                                        No se encontraron tipos de servicio con el nombre buscado.
                                    </td>
                                </tr>
                            ) : (
                                tiposFiltrados.map((tipo) => {
                                    const totalAsociadas = contarObras(tipo.id_tipo_servicio);
                                    return (
                                        <tr key={tipo.id_tipo_servicio}>
                                            <td className="obras-client-name">{tipo.nombre}</td>
                                            <td>
                                                <span className="obras-service-tag">
                                                    {totalAsociadas}{' '}
                                                    {totalAsociadas === 1 ? 'obra' : 'obras'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`obras-usage-badge ${totalAsociadas > 0 ? 'en-uso' : 'libre'}`}>
                                                    {totalAsociadas > 0 ? 'En uso' : 'Sin obras'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="obras-actions-cell">
                                                    <button type="button" onClick={() => abrirModalEditar(tipo)} className="obras-btn-edit" title="Editar tipo de servicio">
                                                        <Edit2 size={13} />
                                                        <span>Editar</span>
                                                    </button>
                                                    <button type="button" onClick={() => borrarTipo(tipo)} className="obras-btn-delete" title="Eliminar tipo de servicio">
                                                        <Trash2 size={13} />
                                                        <span>Eliminar</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalAbierto && (
                <div className="obras-modal-overlay">
                    <div className="obras-modal-card small">
                        <div className="obras-modal-header">
                            <div className="obras-modal-title">
                                {editandoId ? 'Modificar Tipo de Servicio' : 'Registrar Tipo de Servicio'}
                            </div>
                            <button type="button" onClick={() => setModalAbierto(false)} className="obras-modal-close">X</button>
                        </div>

                        <form onSubmit={guardarTipo} className="obras-modal-form">
                            {error && <div className="alerta-error">{error}</div>}

                            <div className="obras-field">
                                <label className="obras-label">Nombre del Servicio</label>
                                <input
                                    type="text"
                                    required
                                    minLength={2}
                                    maxLength={60}
                                    placeholder="Ej: Climatización, Mantención, Emergencia..."
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    className="obras-input"
                                />
                            </div>

                            <div className="obras-modal-actions">
                                <button type="button" onClick={() => setModalAbierto(false)} className="obras-btn-cancel">Cancelar</button>
                                <button type="submit" className="obras-btn-save">
                                    {editandoId ? 'Guardar Cambios' : 'Registrar Servicio'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}