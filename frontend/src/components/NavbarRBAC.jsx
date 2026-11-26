import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, Package, ClipboardList, History, Truck, Briefcase, Building2, Users, LogOut, Menu, X, ChevronLeft, ChevronRight, } from 'lucide-react';
import { logoutUsuario } from '../services_api/authService';
import logoFyag from '../assets/logo.png';
import '../styles/NavbarRBAC.css'

// Nombres claros de los cargos para mostrar en la tarjeta del usuario.
const ETIQUETAS_ROL = {
    administracion: 'Administrador General',
    soporte_ti: 'Soporte Técnico',
    encargado_bodega: 'Encargado de Bodega',
    encargado_finanza: 'Encargado de Finanzas',
    supervisor_obra: 'Supervisor de Obra',
};

// Cargos autorizados para recibir avisos visuales de materiales con pocas unidades.
const CARGOS_AVISO_STOCK = [
    'administracion',
    'encargado_bodega',
    'encargado_finanza',
    'supervisor_obra',
];

// Obtiene las dos letras iniciales del trabajador para círculo de perfil.
const obtenerIniciales = (nombreCompleto = '') => {
    const partes = nombreCompleto.trim().split(/\s+/);
    if (partes.length === 0 || !partes[0]) return 'US';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
};

// Barra lateral desplegable que muestra únicamente las secciones permitidas según el cargo.
const NavbarRBAC = ({ 
    usuario, 
    onLogout, 
    onOpenStockAlerts, 
    stockCriticoCount = 0,
    expandida = false,
    onToggleExpandida,
}) => {
    const navigate = useNavigate();
    // Controla la apertura del menú deslizable cuando se usa en el celular o tablet.
    const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

    if (!usuario) return null;

    const rol = usuario.rol;
    const iniciales = obtenerIniciales(usuario.nombre);
    const puedeVerAlertas = onOpenStockAlerts && CARGOS_AVISO_STOCK.includes(rol);

    // Lista centralizada de enlaces con su ícono y los cargos que tienen permiso para verlos.
    const opcionesMenu = [
        {
            ruta: '/bodega/inventario',
            etiqueta: 'Catálogo de Bodega',
            icono: Package,
            roles: ['administracion', 'encargado_bodega', 'encargado_finanza', 'supervisor_obra'],
        },
        {
            ruta: '/solicitudes',
            etiqueta: 'Solicitudes de Compra',
            icono: ClipboardList,
            roles: ['administracion', 'encargado_bodega', 'encargado_finanza'],
        },
        {
            ruta: '/cardex',
            etiqueta: 'Historial de Movimientos',
            icono: History,
            roles: ['administracion', 'encargado_bodega', 'encargado_finanza'],
        },
        {
            ruta: '/obras/despachos',
            etiqueta: 'Obras y Despachos',
            icono: Truck,
            roles: ['administracion', 'encargado_bodega', 'supervisor_obra'],
        },
        {
            ruta: '/obras',
            etiqueta: 'Gestión de Obras',
            icono: Briefcase,
            end: true,
            roles: ['administracion', 'encargado_bodega', 'encargado_finanza', 'supervisor_obra'],
        },
        {
            ruta: '/entidades',
            etiqueta: 'Clientes y Proveedores',
            icono: Building2,
            roles: ['administracion', 'encargado_finanza'],
        },
        {
            ruta: '/admin/usuarios',
            etiqueta: 'Personal y Cuentas',
            icono: Users,
            roles: ['administracion', 'soporte_ti'],
        },
    ];

    const opcionesVisibles = opcionesMenu.filter((item) => item.roles.includes(rol));

    // Cierra la sesión actual de forma segura y vuelve al inicio de sesión.
    const manejarSalida = async () => {
        setMenuMovilAbierto(false);
        await logoutUsuario();
        onLogout();
        navigate('/login');
    };

    return (
        <>
            {/* Barra superior compacta visible solo en tablet o celular para abrir el menú lateral */}
            <header className='sidebar-mobile-topbar'>
                <button
                    type='button'
                    className='sidebar-mobile-trigger'
                    onClick={() => setMenuMovilAbierto(true)}
                    aria-label='Abrir menú de navegación'
                >
                    <Menu size={22} />
                    <span>Menú</span>
                </button>

                <div className='sidebar-mobile-brand'>
                    <img src={logoFyag} alt="Logo FYAG SpA" className='sidebar-logo-sm' />
                    <span>FYAG SpA</span>
                </div>

                {puedeVerAlertas ? (
                    <button
                        type='button'
                        onClick={onOpenStockAlerts}
                        className='sidebar-mobile-alert'
                        title='Ver materiales con pocas unidades disponibles'
                    >
                        <Bell
                            size={18}
                            className={stockCriticoCount > 0 ? 'navbar-bell-active' : 'navbar-bell-normal'}
                        />
                        {stockCriticoCount > 0 && (
                            <span className='navbar-alert-badge'>{stockCriticoCount}</span>
                        )}
                    </button>
                ) : (
                    <div className='sidebar-mobile-spacer' />
                )}
            </header>

            {/* Fondo semitransparente que cierra el menú al tocar afuera en dispositivos móviles */}
            {menuMovilAbierto && (
                <div
                    className='sidebar-backdrop'
                    onClick={() => setMenuMovilAbierto(false)}
                />
            )}

            {/* Barra lateral principal */}
            <aside
                className={`sidebar-fyag ${expandida ? 'expandida' : 'colapsada'} ${
                    menuMovilAbierto ? 'movil-abierta' : ''
                }`}
            >
                {/* Botón visible en el borde derecho (solo escritorio) para expandir o contraer el menú */}
                <button
                    type='button'
                    className='sidebar-toggle-btn'
                    onClick={onToggleExpandida}
                    title={expandida ? 'Contraer menú lateral' : 'Desplegar menú lateral'}
                    aria-label={expandida ? 'Contraer menú lateral' : 'Desplegar menú lateral'}
                >
                    {expandida ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>

                {/* Encabezado con el logo y nombre de la empresa */}
                <div className='sidebar-header'>
                    <div className='sidebar-brand'>
                        <img src={logoFyag} alt="Logo FYAG SpA" className='sidebar-logo' />
                        <div className='sidebar-brand-text'>
                            <span className='brand-title'>FYAG SpA</span>
                            <span className='brand-subtitle'>Bodega y Obras</span>
                        </div>
                    </div>

                    {/* Botón de cierre visible únicamente en celular o tablet */}
                    <button
                        type='button'
                        className='sidebar-mobile-close'
                        onClick={() => setMenuMovilAbierto(false)}
                        aria-label='Cerrar menú'
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Enlaces principales filtrados según el cargo del trabajador */}
                <nav className='sidebar-nav'>
                    {opcionesVisibles.map((item) => {
                        const Icono = item.icono;
                        return (
                            <NavLink
                                key={item.ruta}
                                to={item.ruta}
                                end={item.end}
                                className="sidebar-link"
                                title={!expandida ? item.etiqueta : undefined}
                                onClick={() => setMenuMovilAbierto(false)}
                            >
                                <Icono size={20} className='sidebar-link-icon' />
                                <span className='sidebar-link-text'>{item.etiqueta}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Sección inferior con alertas de stock, perfil del trabajador y cierre de sesión */}
                <div className='sidebar-footer'>
                    {puedeVerAlertas && (
                        <button
                            type='button'
                            onClick={() => {
                                setMenuMovilAbierto(false);
                                onOpenStockAlerts();
                            }}
                            title='Ver materiales con pocas unidades disponibles'
                            className='sidebar-alert-btn'
                        >
                            <div className='sidebar-alert-icon-wrap'>
                                <Bell
                                    size={19}
                                    className={stockCriticoCount > 0 ? 'navbar-bell-active' : 'navbar-bell-normal'}
                                />
                                {stockCriticoCount > 0 && (
                                    <span className='sidebar-alert-dot'>{stockCriticoCount}</span>
                                )}
                            </div>
                            <span className='sidebar-alert-label'>
                                Alertas de Stock
                                {stockCriticoCount > 0 ? ` (${stockCriticoCount})` : ''}
                            </span>
                        </button>
                    )}

                    <div className='sidebar-user-card' title={`${usuario.nombre} | ${ETIQUETAS_ROL[rol] || rol}`}>
                        <div className='avatar-iniciales'>{iniciales}</div>
                        <div className='sidebar-user-info'>
                            <span className='user-name'>{usuario.nombre}</span>
                            <span className='user-role'>{ETIQUETAS_ROL[rol] || rol}</span>
                        </div>
                    </div>

                    <button
                        type='button'
                        onClick={manejarSalida}
                        className='sidebar-logout-btn'
                        title='Cerrar sesión'
                    >
                        <LogOut size={18} className='sidebar-link-icon' />
                        <span className='sidebar-link-text'>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default NavbarRBAC;