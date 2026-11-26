import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import NavbarRBAC from './components/NavbarRBAC';
import StockAlertModal from './components/StockAlertModal';
import TablaCardex from './components/TablaCardex';

import LoginView, { obtenerRutaInicial } from './pages/LoginView';
import DashboardView from './pages/DashboardView';
import CatalogoView from './pages/CatalogoView';
import DespachoObra from './pages/DespachoObra';
import SupervisorObraView from './pages/SupervisorObraView';
import ComprasView from './pages/ComprasView';
import FinanzasView from './pages/FinanzasView';
import SolicitudesView from './pages/SolicitudesView';
import GestionUsuariosView from './pages/GestionUsuariosView';
import DesktopAdminCardexView from './pages/DesktopAdminCardexView';
import { ObrasPage } from './pages/Obras';

import { obtenerUsuarioActual, iniciarMonitorInactividad, } from './services_api/authService';
import { obtenerArticulos } from './services_api/inventarioService';

// Cargos que pueden ver el inventario y recibir avisos de stock bajo.
const CARGOS_AVISO_STOCK = [
    'administracion',
    'encargado_bodega',
    'encargado_finanza',
    'supervisor_obra',
];

// Verifica que el trabajador haya iniciado sesión y que su cargo tenga permiso en la ruta.
const RutaProtegidaRBAC = ({ usuario, rolesPermitidos, children }) => {
    if (!usuario) {
        return <Navigate to="/login" replace />;
    }

    if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
        return (
            <div className='contenedor-vista'>
                <div className='alerta-error'>
                    No tiene acceso a esta sección. Su cargo actual solo permite ingresar a las funciones asignadas a su área de trabajo.
                </div>
            </div>
        );
    }

    return children;
};

// Controla la sesión activa, la barra lateral desplegable y el mapa completo de pantallas.
function AppContent() {
    const [usuario, setUsuario] = useState(() => obtenerUsuarioActual());
    const [avisoInactividad, setAvisoInactividad] = useState('');
    const [articulosGlobal, setArticulosGlobal] = useState([]);
    const [modalStockOpen, setModalStockOpen] = useState(false);
    // Controla si la barra lateral está expandida o colapsada en modo compacto.
    const [sidebarExpandida, setSidebarExpandida] = useState(false);
    const navigate = useNavigate();

    // Consulta el inventaio actual para mantener actualizado el contador de alertas de la barra lateral.
    const recargarAlertasStock = useCallback((rolUsuario) => {
        if (!rolUsuario || !CARGOS_AVISO_STOCK.includes(rolUsuario)) {
            setArticulosGlobal([]);
            return;
        }
        obtenerArticulos()
            .then((res) => setArticulosGlobal(res.data || []))
            .catch(() => setArticulosGlobal([]));
    }, []);

    // Cada vez que cambia el usuario, carga alertas de stock y activa el cierre por inactividad.
    useEffect(() => {
        if (!usuario) {
            setArticulosGlobal([]);
            setModalStockOpen(false);
            return;
        }

        recargarAlertasStock(usuario.rol);

        const manejarActualizacionStock = () => recargarAlertasStock(usuario.rol);
        window.addEventListener('fyag_inventario_actualizado', manejarActualizacionStock);

        // Cierra la sesión automáticamente tras 15 minutos sin actividad en pantalla.
        const limpiarMonitor = iniciarMonitorInactividad(() => {
            setUsuario(null);
            setAvisoInactividad(
                'La sesión se cerró automáticamente tras 15 minutos sin actividad.'
            );
        });

        return () => {
            window.removeEventListener('fyag_inventario_actualizado', manejarActualizacionStock);
            limpiarMonitor();
        };
    }, [usuario, recargarAlertasStock]);

    // Limpia los datos en memoria al cerrar sesión manualmente.
    const manejarLogout = () => {
        setUsuario(null);
        setArticulosGlobal([]);
        setModalStockOpen(false);
    };

    // Cuenta cuántos materiales tienen unidaddes iguales o menores a su mínimo permitido.
    const stockCriticoCount = articulosGlobal.filter(
        (a) => Number(a.stock_disponible) <= Number(a.stock_minimo)
    ).length;

    // Define todas las pantallas disponibles y qué cargos pueden entrar a cada una.
    const rutasContenido = (
        <Routes>
            <Route
                path='/login'
                element={
                    usuario ? (
                        <Navigate to={obtenerRutaInicial(usuario.rol)} replace />
                    ) : (
                        <LoginView
                            onLoginSuccess={(u) => {
                                setAvisoInactividad('');
                                setUsuario(u);
                            }}
                            mensajeInactividad={avisoInactividad}
                        />
                    )
                }
            />

            <Route
                path='/dashboard'
                element={
                    <RutaProtegidaRBAC
                        usuario={usuario}
                        rolesPermitidos={[
                            'administracion',
                            'encargado_bodega',
                            'encargado_finanza',
                            'supervisor_obra',
                        ]}
                    >
                        <div className='contenedor-vista'>
                            <DashboardView />
                        </div>
                    </RutaProtegidaRBAC>
                }
            />

            <Route
                path='/bodega/inventario'
                element={
                    <RutaProtegidaRBAC
                        usuario={usuario}
                        rolesPermitidos={[
                            'administracion',
                            'encargado_bodega',
                            'encargado_finanza',
                            'supervisor_obra',
                        ]}
                    >
                        <CatalogoView usuario={usuario} />
                    </RutaProtegidaRBAC>
                }
            />

            <Route
                path='/solicitudes'
                element={
                    <RutaProtegidaRBAC
                        usuario={usuario}
                        rolesPermitidos={[
                            'administracion',
                            'encargado_bodega',
                            'encargado_finanza',
                        ]}
                    >
                        <SolicitudesView usuario={usuario} />
                    </RutaProtegidaRBAC>
                }
            />

            <Route
                path='/cardex'
                element={
                    <RutaProtegidaRBAC
                        usuario={usuario}
                        rolesPermitidos={[
                            'administracion',
                            'encargado_bodega',
                            'encargado_finanza',
                        ]}
                    >
                        <div className='contenedor-vista'>
                            <TablaCardex usuario={usuario} />
                        </div>
                    </RutaProtegidaRBAC>
                }
            />

            <Route
                path='/obras/despachos'
                element={
                    <RutaProtegidaRBAC
                        usuario={usuario}
                        rolesPermitidos={['administracion', 'encargado_bodega', 'supervisor_obra']}
                    >
                        <div className='contenedor-vista'>
                            {usuario?.rol === 'supervisor_obra' ? (
                                <SupervisorObraView />
                            ) : (
                                <DespachoObra usuario={usuario} />
                            )}
                        </div>
                    </RutaProtegidaRBAC>
                }
            />

            <Route
                path='/obras'
                element={
                    <RutaProtegidaRBAC
                        usuario={usuario}
                        rolesPermitidos={[
                            'administracion',
                            'encargado_bodega',
                            'encargado_finanza',
                            'supervisor_obra',
                        ]}
                    >
                        <ObrasPage usuario={usuario} />
                    </RutaProtegidaRBAC>
                }
            />

            <Route
                path='/terreno/supervision'
                element={
                    <RutaProtegidaRBAC
                        usuario={usuario}
                        rolesPermitidos={['administracion', 'supervisor_obra']}
                    >
                        <div className='contenedor-vista'>
                            <SupervisorObraView />
                        </div>
                    </RutaProtegidaRBAC>
                }
            />

            <Route
                path='/entidades'
                element={
                    <RutaProtegidaRBAC
                        usuario={usuario}
                        rolesPermitidos={['administracion', 'encargado_finanza']}
                    >
                        <ComprasView usuario={usuario} />
                    </RutaProtegidaRBAC>
                }
            />

            <Route
                path='/finanzas'
                element={
                    <RutaProtegidaRBAC
                        usuario={usuario}
                        rolesPermitidos={['administracion', 'encargado_finanza']}
                    >
                        <div className='contenedor-vista'>
                            <FinanzasView />
                        </div>
                    </RutaProtegidaRBAC>
                }
            />

            <Route
                path='/admin/usuarios'
                element={
                    <RutaProtegidaRBAC
                        usuario={usuario}
                        rolesPermitidos={['administracion', 'soporte_ti']}
                    >
                        <div className='contenedor-vista'>
                            <GestionUsuariosView usuarioActual={usuario} />
                        </div>
                    </RutaProtegidaRBAC>
                }
            />

            <Route
                path='/portal-admin'
                element={
                    <RutaProtegidaRBAC usuario={usuario} rolesPermitidos={['administracion']}>
                        <DesktopAdminCardexView
                            usuario={usuario}
                            onLogout={manejarLogout}
                        />
                    </RutaProtegidaRBAC>
                }
            />

            {/* Cualquier ruta desconocida redirige a la pantalla principal del cargo o al login. */}
            <Route
                path='*'
                element={
                    <Navigate to={usuario ? obtenerRutaInicial(usuario.rol) : '/login'} replace />
                }
            />
        </Routes> 
    );

    // Si no hay sesión abierta, muestra únicamente las rutas (pantalla de inicio de sesión).
    if (!usuario) {
        return rutasContenido;
    }

    return (
        <div className='app-shell'>
            <NavbarRBAC
                usuario={usuario}
                onLogout={manejarLogout}
                onOpenStockAlerts={() => setModalStockOpen(true)}
                stockCriticoCount={stockCriticoCount}
                expandida={sidebarExpandida}
                onToggleExpandida={() => setSidebarExpandida((prev) => !prev)}
            />

            <main className={`app-main ${sidebarExpandida ? 'sidebar-expandida' : 'sidebar-colapsada'}`}>
                {rutasContenido}
            </main>

            <StockAlertModal
                isOpen={modalStockOpen}
                onClose={() => setModalStockOpen(false)}
                articulos={articulosGlobal}
                usuario={usuario}
                onNavigateToBodega={() => navigate('/bodega/inventario')}
            />
        </div>
    );
}

// Envuelve toda la aplicación dentro del enrutador del navegador.
export default function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}