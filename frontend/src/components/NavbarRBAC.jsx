/**
 * @file NavbarRBAC.jsx
 * @description Barra de navegación global con soporte para Control de Acceso Basado en Roles (RBAC, Capítulo 7.1).
 * Oculta o presenta enlaces según los privilegios del perfil conectado y notifica en tiempo real sobre insumos críticos.
 * 
 * BIBLIOTECAS UTILIZADAS:
 * - react-router-dom: Componentes `NavLink` y hook `useNavigate` para navegación SPA sin recarga.
 * - lucide-react: Iconos vectoriales `Bell`, `Tablet`, `Boxes`, `Truck`, `Users` y `Briefcase`.
 * 
 * ROLES ADMITIDOS (RBAC):
 * - `administracion`: Acceso irrestricto a todos los módulos y gestión de usuarios.
 * - `encargado_bodega`: Acceso a catálogo, terminal de bodega, despachos y Cardex.
 * - `encargado_finanza`: Acceso a clientes, proveedores, facturas y Cardex.
 * - `supervisor_obra`: Acceso a despachos de terreno y consulta de inventario.
 */

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, Tablet, Boxes, Truck, Users, Briefcase } from 'lucide-react';
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

/**
 * Componente Navbar con filtros de visibilidad RBAC.
 * 
 * @component
 * @param {Object} props Propiedades del componente.
 * @param {Object} props.usuario Objeto del usuario autenticado con su rol.
 * @param {Function} props.onLogout Callback para limpiar el estado de sesión del usuario.
 * @param {Function} [props.onOpenStockAlerts] Callback para abrir el modal de stock crítico.
 * @param {number} [props.stockCriticoCount] Número de insumos en stock crítico para la insignia de alerta.
 */
const NavbarRBAC = ({ usuario, onLogout, onOpenStockAlerts, stockCriticoCount = 0 }) => {
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
                    Catálogo
                </NavLink>

                {['administracion', 'encargado_bodega', 'encargado_finanza'].includes(rol) && (
                    <NavLink to='/cardex' className='nav-item'>
                        Auditoría Cardex
                    </NavLink>
                )}

                {['administracion', 'encargado_bodega', 'supervisor_obra'].includes(rol) && (
                    <NavLink to='/obras/despachos' className='nav-item'>
                        Obras y Despachos
                    </NavLink>
                )}



                {['administracion', 'encargado_finanza', 'encargado_bodega'].includes(rol) && (
                    <NavLink to='/entidades' className='nav-item'>
                        Entidades y Facturas
                    </NavLink>
                )}

                {rol === 'administracion' && (
                    <NavLink to='/admin/usuarios' className='nav-item'>
                        Usuarios
                    </NavLink>
                )}
            </nav>

            <div className='navbar-user' style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {onOpenStockAlerts && (
                    <button
                        onClick={onOpenStockAlerts}
                        title="Alertas de Stock Crítico (HU-03)"
                        style={{
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '8px',
                            color: '#ffffff',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: '700'
                        }}
                    >
                        <Bell size={16} color={stockCriticoCount > 0 ? '#fde047' : '#ffffff'} />
                        {stockCriticoCount > 0 && (
                            <span style={{
                                backgroundColor: '#dc2626',
                                color: '#ffffff',
                                borderRadius: '10px',
                                padding: '1px 6px',
                                fontSize: '11px',
                                fontWeight: '800'
                            }}>
                                {stockCriticoCount}
                            </span>
                        )}
                    </button>
                )}

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
