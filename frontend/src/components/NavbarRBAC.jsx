import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logoutUsuario } from '../services_api/authService';

const ETIQUETAS_ROL = {
    administracion: 'Administrador',
    encargado_bodega: 'Encargado de Bodega',
    encargado_finanza: 'Encargado de Finanzas',
    supervisor_obra: 'Supervisor de Obra',
};

const obtenerIniciales = (nombreCompleto = '') => {
    const partes = nombreCompleto.trim().split(/\s+/);
    if (partes.length === 0 || !partes[0]) return 'US';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
};

const NavbarRBAC = ({ usuario, onLogout }) => {
    const navigate = useNavigate();

    if (!usuario) return null;

    const rol = usuario.rol;
    const iniciales = obtenerIniciales(usuario.nombre);

    const manejarSalida = async () => {
        await logoutUsuario();
        onLogout();
        navigate('/login');
    };

    return (
        <header className='navbar-fyag'>
            <div className='navbar-brand'>
                <span className='brand-title'>FYAG SpA</span>
                <span className='brand-subtitle'>Control Logístico Alpha</span>
            </div>

            <nav className='navbar-links'>
                <NavLink to='/bodega/inventario' className='nav-item'>
                    Catálogo e Inventario
                </NavLink>

                {['administracion', 'encargado_finanza', 'encargado_bodega'].includes(rol) && (
                    <NavLink to='/entidades' className='nav-item'>
                        Clientes y Proveedores
                    </NavLink>
                )}

                {rol === 'administracion' && (
                    <NavLink to='/admin/usuarios' className='nav-item'>
                        Gestión de Usuarios
                    </NavLink>
                )}
            </nav>

            <div className='navbar-user'>
                <div className='avatar-iniciales' title={usuario.nombre}>
                    {iniciales}
                </div>
                <div className='user-info'>
                    <span className='user-name'>{usuario.nombre}</span>
                    <span className='user-role'>{ETIQUETAS_ROL[rol] || rol}</span>
                </div>
                <button onClick={manejarSalida} className='btn-logout'>
                    Salir
                </button>
            </div>
        </header>
    );
};

export default NavbarRBAC;