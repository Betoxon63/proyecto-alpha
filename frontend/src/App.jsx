import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import NavbarRBAC from './components/NavbarRBAC';
import StockAlertModal from './components/StockAlertModal';
import TablaCardex from './components/TablaCardex';

import LoginView, { obtenerRutaInicial } from './pages/LoginView';
import DashboardView from './pages/DashboardView';
import CatalogoView from './pages/CatalogoView';
import TabletBodegaView from './pages/TabletBodegaView';
import DespachoObra from './pages/DespachoObra';
import SupervisorObraView from './pages/SupervisorObraView';
import ComprasView from './pages/ComprasView';
import FinanzasView from './pages/FinanzasView';
import GestionUsuariosView from './pages/GestionUsuariosView';
import DesktopAdminCardexView from './pages/DesktopAdminCardexView';

import { obtenerUsuarioActual, iniciarMonitorInactividad, } from './services_api/authService';
import { obtenerArticulos } from './services_api/inventarioService';
import { ObrasPage } from './pages/Obras';
import { BodegaDashboard } from './pages/BodegaDashboard';
import { Home } from './pages/Home';

// Verifica la sesión y los permisos del trabajador.
const RutaProtegidaRBAC = ({ usuario, rolesPermitidos, children }) => {
  if (!usuario) {
    return <Navigate to="/login" replace />
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

function AppContent() {
  const [usuario, setUsuario] = useState(() => obtenerUsuarioActual());
  const [avisoInactividad, setAvisoInactividad] = useState('');
  const [articulosGlobal, setArticulosGlobal] = useState([]);
  const [modalStockOpen, setModalStockOpen] = useState(false);
  const navigate = useNavigate();

  const CARGOS_AVISO = [
    'administracion',
    'encargado_bodega',
    'encargado_finanza',
    'supervisor_obra',
  ];

  useEffect(() => {
    if (!usuario) return;

    // Consulta los artículos para avisar si hay materiales con pocas unidades.
    if (CARGOS_AVISO.includes(usuario.rol)) {
      obtenerArticulos()
        .then((res) => setArticulosGlobal(res.data || []))
        .catch(() => {});
    }

    // Cierra la sesión si el equipo queda sin usarse durante 15 minutos.
    const limpiarMonitor = iniciarMonitorInactividad(() => {
      setUsuario(null);
      setAvisoInactividad(
        'La sesión se cerró automáticamente tras 15 minutos sin actividad.'
      );
    });
    return limpiarMonitor;
  }, [usuario]);

  const stockCriticoCount = articulosGlobal.filter(
    (a) => Number(a.stock_disponible) <= Number(a.stock_minimo)
  ).length;

  return (
    <>
      {usuario && (
        <NavbarRBAC
          usuario={usuario}
          onLogout={() => setUsuario(null)}
          onOpenStockAlerts={() => setModalStockOpen(true)}
          stockCriticoCount={stockCriticoCount}
        />
      )}

      <Routes>
        <Route
          path="/login"
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
          path="/dashboard"
          element={
            <RutaProtegidaRBAC usuario={usuario}>
              <div className="contenedor-vista">
                <DashboardView />
              </div>
            </RutaProtegidaRBAC>
          }
        />

        <Route
          path="/bodega/inventario"
          element={
            <RutaProtegidaRBAC
              usuario={usuario}
              rolesPermitidos={['administracion', 'encargado_bodega', 'encargado_finanza', 'supervisor_obra',]}>
              <CatalogoView usuario={usuario} />
            </RutaProtegidaRBAC>
          }
        />

        <Route
          path="/bodega/movimientos"
          element={
            <RutaProtegidaRBAC
              usuario={usuario}
              rolesPermitidos={['administracion', 'encargado_bodega']}
            >
              <TabletBodegaView currentUser={usuario} />
            </RutaProtegidaRBAC>
          }
        />

        <Route
          path="/cardex"
          element={
            <RutaProtegidaRBAC
              usuario={usuario}
              rolesPermitidos={['administracion', 'soporte_ti', 'encargado_bodega', 'encargado_finanza']}
            >
              <div className="contenedor-vista">
                <TablaCardex />
              </div>
            </RutaProtegidaRBAC>
          }
        />

        <Route
          path="/obras/despachos"
          element={
            <RutaProtegidaRBAC
              usuario={usuario}
              rolesPermitidos={['administracion', 'encargado_bodega', 'supervisor_obra']}
            >
              <div className="contenedor-vista">
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
          path="/obras"
          element={
            <RutaProtegidaRBAC
              usuario={usuario}
              rolesPermitidos={['administracion', 'supervisor_obra', 'encargado_bodega', 'encargado_finanza',]}
            >
              <ObrasPage usuario={usuario} />
            </RutaProtegidaRBAC>
          }
        />

        <Route
          path="/terreno/supervision"
          element={
            <RutaProtegidaRBAC
              usuario={usuario}
              rolesPermitidos={['administracion', 'supervisor_obra']}
            >
              <div className="contenedor-vista">
                <SupervisorObraView />
              </div>
            </RutaProtegidaRBAC>
          }
        />

        <Route
          path="/entidades"
          element={
            <RutaProtegidaRBAC
              usuario={usuario}
              rolesPermitidos={['administracion', 'encargado_finanza', 'encargado_bodega']}
            >
              <ComprasView usuario={usuario} />
            </RutaProtegidaRBAC>
          }
        />

        <Route
          path="/finanzas"
          element={
            <RutaProtegidaRBAC
              usuario={usuario}
              rolesPermitidos={['administracion', 'encargado_finanza']}
            >
              <div className="contenedor-vista">
                <FinanzasView />
              </div>
            </RutaProtegidaRBAC>
          }
        />

        <Route
          path="/admin/usuarios"
          element={
            <RutaProtegidaRBAC
              usuario={usuario}
              rolesPermitidos={['administracion', 'soporte_ti']}>
              <div className="contenedor-vista">
                <GestionUsuariosView />
              </div>
            </RutaProtegidaRBAC>
          }
        />

        <Route
          path="/portal-admin"
          element={
            <RutaProtegidaRBAC usuario={usuario}>
              <DesktopAdminCardexView
                usuario={usuario}
                onLogout={() => setUsuario(null)}
              />
            </RutaProtegidaRBAC>
          }
        />

        <Route
          path='/bodega/dashboard'
          element={
            <RutaProtegidaRBAC usuario={usuario} rolesPermitidos={['encargado_bodega']}>
              <BodegaDashboard />
            </RutaProtegidaRBAC>
          }
        />
        <Route path='/' element={<Home />} />

        <Route
          path="*"
          element={
            <Navigate to={usuario ? obtenerRutaInicial(usuario.rol) : '/login'} replace />
          }
        />
      </Routes>

      <StockAlertModal
        isOpen={modalStockOpen}
        onClose={() => setModalStockOpen(false)}
        articulos={articulosGlobal}
        onNavigateToBodega={() => navigate('/bodega/inventario')}
      />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}