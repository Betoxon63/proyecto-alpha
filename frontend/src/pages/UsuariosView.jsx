import React, { useEffect, useState } from "react";
import {
    obtenerUsuarios,
    crearUsuario,
    eliminarUsuario,
    obtenerRoles,
} from '../services_api/inventarioService';

const usuarioInicial = {
    nombre: '',
    rut: '',
    correo_electronico: '',
    password: '',
    telefono: '',
    id_rol: ','
};

const UsuariosView = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [formUsuario, setFormUsuario] = useState(usuarioInicial);
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    const cargarDatos = async () => {
        try {
            const [resUsu, resRol] = await Promise.all([obtenerUsuarios(), obtenerRoles()]);
            setUsuarios(resUsu.data);
            setRoles(resRol.data);
        } catch {
            setError('No tienes permisos o ocurrió un error al cargar usuarios.')
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const registrarTrabajador = async (e) => {
        e.preventDefault();
        setError(''),
        setMensaje('');
        try {
            await crearUsuario({ ...formUsuario, telefono: formUsuario.telefono ? Number(formUsuario.telefono) : null, });
            setMensaje('Trabajador creado y rol asignado.');
            setFormUsuario(usuarioInicial);
            cargarDatos();
        } catch (err) {
            setError(JSON.stringify(err.response?.data || 'Error al crear el trabajador.'));
        }
    };

    return (
        <div className="contenedor-vista">
            <h2>Gestión de Trabajadores y Asignación de Roles</h2>

            {mensaje && <div className="alerta-exito">{mensaje}</div>}
            {error && <div className="alerta-error">{error}</div>}

            <form onSubmit={registrarTrabajador} className="card-formulario">
                <h3>Registrar Nuevo Trabajador</h3>
                <div className="grid-inputs">
                    <input
                        type="text"
                        placeholder="Nombre Completo"
                        value={formUsuario.nombre}
                        onChange={(e) => setFormUsuario({ ...formUsuario, nombre: e.target.value })}
                        required
                    />
                    <input
                        type="text"
                        placeholder="RUT (Ej: 11111111-1)"
                        value={formUsuario.rut}
                        onChange={(e) => setFormUsuario({ ...formUsuario, rut: e.target.value })}
                        required
                    />
                    <input
                        type="email"
                        placeholder="Correo Electrónico"
                        value={formUsuario.correo_electronico}
                        onChange={(e) => setFormUsuario({ ...formUsuario, correo_electronico: e.target.value })}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Contraseña (mín. 8 caracteres)"
                        value={formUsuario.password}
                        onChange={(e) => setFormUsuario({ ...formUsuario, password: e.target.value })}
                        required
                    />
                    <input
                        type="number"
                        placeholder="Teléfono (Opcional)"
                        value={formUsuario.telefono}
                        onChange={(e) => setFormUsuario({ ...formUsuario, telefono: e.target.value })}
                    />
                    <select value={formUsuario.id_rol} onChange={(e) => setFormUsuario({ ...formUsuario, id_rol: e.target.value })} required>
                        <option value="">Asignar Rol</option>
                        {roles.map((r) => (
                            <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>
                        ))}   
                    </select>
                </div>
                <button type="submit" className="btn-primario">Crear Trabajador</button>
            </form>

            <table className="tabla-fyag">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>RUT</th>
                        <th>Correo</th>
                        <th>Rol Asignado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.map((u) => (
                        <tr key={u.id_usuario}>
                            <td><strong>{u.nombre}</strong></td>
                            <td>{u.rut}</td>
                            <td>{u.correo_electronico}</td>
                            <td>{u.rol_nombre}</td>
                            <td>
                                <button className="btn-peligro" onClick={async () => {if (window.confirm('¿Eliminar Usuario?')) {await eliminarUsuario(u.id_usuario); cargarDatos();}}}>Eliminar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UsuariosView;