import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { logoutUsuario } from '../services_api/authService';
import logoFyag from '../assets/logo.png';
import '../styles/NavbarRBAC.css'

// Nombres legibles para mostrar debajo del nombre del trabajador.
const ETIQUETAS_ROL = {
    administracion: 'Administrador General',
    soporte_ti: 'Soporte Técnico',
    encargado_bodega: 'Encargado de Bodega',
    encargado_finanza: 'Encargado de Finanzas',
    supervisor_obra: 'Supervisor de Obra',
};

const CARGOS_AVISO_STOCK = [
    'administracion',
    'encargado_bodega',
    'encargado_finanza',
    'supervisor_obra',
];

// Obtiene las letras iniciales del trabajador.
const obtenerIniciales = (nombreCompleto = '') => {
    const partes = nombreCompleto.trim().split(/\s+/);
    if (partes.length === 0 || !partes[0]) return 'US';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
};

const NavbarRBAC = ({ usuario, onLogout, onOpenStockAlerts, stockCriticoCount = 0 }) => {
    const navigate = useNavigate();

    if (!usuario) return null;

    const rol = usuario.rol;
    const iniciales = obtenerIniciales(usuario.nombre);

    // Cierra la sesión actual y vuelve a la pantalla de ingreso.
    const manejarSalida = async () => {
        await logoutUsuario();
        onLogout();
        navigate('/login');
    };

    return (
        <header className="navbar-fyag">
            <div className="navbar-brand">
                <img src={logoFyag} alt="Logo FYAG SpA" className="navbar-logo" />
                <div className="navbar-brand-text">
                    <span className="brand-title">FYAG SpA</span>
                    <span className="brand-subtitle">Gestión de Bodega y Obras</span>
                </div>
            </div>

            <nav className="navbar-links">
                {/* Catálogo de materiales */}
                {rol !== 'soporte_ti' && (
                    <NavLink to="/bodega/inventario" className="nav-item">Catálogo de Bodega</NavLink>
                )}

                {/* Historial general de movimientos y registros */}
                {['administracion', 'soporte_ti', 'encargado_bodega', 'encargado_finanza'].includes(rol) && (
                    <NavLink to="/cardex" className="nav-item">Historial de Movimientos</NavLink>
                )}

                {/* Salida de materiales a terreno y consulta de obras */}
                {['administracion', 'encargado_bodega', 'supervisor_obra'].includes(rol) && (
                    <NavLink to="/obras/despachos" className="nav-item">Obras y Despachos</NavLink>
                )}

                {/* Clientes, proveedores y recepción de facturas */}
                {['administracion', 'encargado_finanza', 'encargado_bodega'].includes(rol) && (
                    <NavLink to="/entidades" className="nav-item">Clientes y Proveedores</NavLink>
                )}

                {/* Administración y seguimiento de obras */}
                {['administracion', 'supervisor_obra', 'encargado_bodega', 'encargado_finanza'].includes(rol) && (
                    <NavLink to="/obras" end className="nav-item">Gestión de Obras</NavLink>
                )}

                {/* Gestión de trabajadores */}
                {['administracion', 'soporte_ti'].includes(rol) && (
                    <NavLink to="/admin/usuarios" className="nav-item">Personal y Cuentas</NavLink>
                )}
            </nav>

            <div className="navbar-user">
                {/* Aviso de productos con pocas unidades */}
                {onOpenStockAlerts && CARGOS_AVISO_STOCK.includes(rol) && (
                    <button type="button" onClick={onOpenStockAlerts} title="Ver materiales con pocas unidades disponibles" className="navbar-alert-btn">
                        <Bell size={16} className={stockCriticoCount > 0 ? 'navbar-bell-active' : 'navbar-bell-normal'} />
                        {stockCriticoCount > 0 && (
                            <span className="navbar-alert-badge">{stockCriticoCount}</span>
                        )}
                    </button>
                )}

                <div className="avatar-iniciales" title={usuario.nombre}>{iniciales}</div>
                <div className="user-info">
                    <span className="user-name">{usuario.nombre}</span>
                    <span className="user-role">{ETIQUETAS_ROL[rol] || rol}</span>
                </div>
                <button type="button" onClick={manejarSalida} className="btn-logout">Salir</button>
            </div>
        </header>
    );
};

export default NavbarRBAC;