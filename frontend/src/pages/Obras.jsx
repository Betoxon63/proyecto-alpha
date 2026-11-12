import React, { useEffect, useState } from 'react';
import { obraService } from '../services_api/obrasService';
import axios from 'axios'; 
import api from '../services_api/axiosConfig';

export const ObrasPage = () => {
    const [obras, setObras] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [tiposServicio, setTiposServicio] = useState([]);
    
    const [formObra, setFormObra] = useState({
        fecha_inicio: '',
        id_cliente: '',
        tecnico_asociado: '',
        id_tipo_servicio: '',
        estado: 'Activa'
    });
    
    const [editId, setEditId] = useState(null);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    const cargarDatos = async () => {
        try {
            // Usamos la instancia 'api' directamente, aprovechando los interceptors de autenticación
            const [resObras, resClientes, resTipos] = await Promise.all([
                api.get('/obras/'),
                api.get('/clientes/'),
                api.get('/tipos-servicio/')
            ]);
            setObras(resObras.data);
            setClientes(resClientes.data);
            setTiposServicio(resTipos.data);
        } catch (err) {
            setError('Error al cargar la información del servidor.');
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const guardarObra = async (e) => {
        e.preventDefault();
        setMensaje('');
        setError('');
        try {
            if (editId) {
                await obraService.update(editId, formObra);
                setMensaje('Obra actualizada con éxito');
            } else {
                await obraService.create(formObra);
                setMensaje('Obra registrada con éxito');
            }
            setFormObra({ fecha_inicio: '', id_cliente: '', tecnico_asociado: '', id_tipo_servicio: '', estado: 'Activa' });
            setEditId(null);
            cargarDatos();
        } catch (err) {
            setError('Hubo un error al guardar la obra.');
        }
    };

    const handleEdit = (obra) => {
        setFormObra({
            fecha_inicio: obra.fecha_inicio,
            id_cliente: obra.id_cliente,
            tecnico_asociado: obra.tecnico_asociado,
            id_tipo_servicio: obra.id_tipo_servicio,
            estado: obra.estado
        });
        setEditId(obra.id_obra);
    };

    const eliminarObra = async (id) => {
        try {
            await obraService.delete(id);
            setMensaje('Obra eliminada con éxito');
            cargarDatos();
        } catch (err) {
            setError('No se pudo eliminar la obra (puede tener registros dependientes).');
        }
    };

    return (
        <div className="contenedor-vista">
            <h2>Gestión de Obras y Proyectos</h2>

            {mensaje && <div className="alerta-exito">{mensaje}</div>}
            {error && <div className="alerta-error">{error}</div>}

            <form onSubmit={guardarObra} className="card-formulario">
                <h3>{editId ? 'Editar Obra' : 'Registrar Nueva Obra'}</h3>
                <div className="grid-inputs">
                    <input
                        type="date"
                        value={formObra.fecha_inicio}
                        onChange={(e) => setFormObra({ ...formObra, fecha_inicio: e.target.value })}
                        required
                    />
                    
                    <select 
                        value={formObra.id_cliente} 
                        onChange={(e) => setFormObra({ ...formObra, id_cliente: e.target.value })} 
                        required
                    >
                        <option value="">Seleccione Cliente</option>
                        {clientes.map((c) => (
                            <option key={c.id_cliente} value={c.id_cliente}>{c.razon_social} ({c.rut})</option>
                        ))}
                    </select>

                    <input
                        type="text"
                        placeholder="Técnico Asociado"
                        value={formObra.tecnico_asociado}
                        onChange={(e) => setFormObra({ ...formObra, tecnico_asociado: e.target.value })}
                        required
                    />

                    <select 
                        value={formObra.id_tipo_servicio} 
                        onChange={(e) => setFormObra({ ...formObra, id_tipo_servicio: e.target.value })} 
                        required
                    >
                        <option value="">Tipo de Servicio</option>
                        {tiposServicio.map((t) => (
                            <option key={t.id_tipo_servicio} value={t.id_tipo_servicio}>{t.nombre}</option>
                        ))}
                    </select>

                    <select
                        value={formObra.estado}
                        onChange={(e) => setFormObra({ ...formObra, estado: e.target.value })}
                        required
                    >
                        <option value="Activa">Activa</option>
                        <option value="Finalizada">Finalizada</option>
                        <option value="Suspendida">Suspendida</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button type="submit" className="btn-primario">
                        {editId ? 'Actualizar Obra' : 'Crear Obra'}
                    </button>
                    {editId && (
                        <button
                            type="button"
                            className="btn-secundario"
                            onClick={() => {
                                setEditId(null);
                                setFormObra({ fecha_inicio: '', id_cliente: '', tecnico_asociado: '', id_tipo_servicio: '', estado: 'Activa' });
                            }}
                        >
                            Cancelar
                        </button>
                    )}
                </div>
            </form>

            <table className="tabla-fyag">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Fecha Inicio</th>
                        <th>Cliente</th>
                        <th>Técnico</th>
                        <th>Servicio</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {obras.map((o) => (
                        <tr key={o.id_obra}>
                            <td><strong>#{o.id_obra}</strong></td>
                            <td>{o.fecha_inicio}</td>
                            <td>{o.cliente_razon_social || o.razon_social || o.id_cliente}</td>
                            <td>{o.tecnico_asociado}</td>
                            <td>{o.tipo_servicio_nombre || o.id_tipo_servicio}</td>
                            <td>{o.estado}</td>
                            <td>
                                <button 
                                    className="btn-secundario" 
                                    style={{ marginRight: '8px' }} 
                                    onClick={() => handleEdit(o)}
                                >
                                    Editar
                                </button>
                                <button 
                                    className="btn-peligro" 
                                    onClick={async () => {
                                        if (window.confirm('¿Eliminar Obra?')) {
                                            await eliminarObra(o.id_obra);
                                        }
                                    }}
                                >
                                    Eliminar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};