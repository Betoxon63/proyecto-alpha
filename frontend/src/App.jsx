import React, { Children, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavbarRBAC from './components/NavbarRBAC';
import LoginView from './pages/LoginView';
import CatalogoView from './pages/CatalogoView';
import ComprasView from './pages/ComprasView';
import UsuariosView from './pages/UsuariosView';
import {
  obtenerUsuarioActual,
  iniciarMonitorInactividad,
} from './services_api/authService';

const RutaProtegida = ({ usuario, rolesPermitidos, children }) => {
  if (!usuario) {
    return <Navigate to="/login" replace />
  }
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return (
      <div className='contenedor-vista'>
        <div className='alerta-error'>Acceso Denegado (HTTP 403): Tu perfil ({usuario.rol}) no tiene permisos para acceder a este módulo.</div>
      </div>
    );
  }
  return children;
};

function App() {
  const [usuario, setUsuario] = useState(() => obtenerUsuarioActual());
  const [avisoInactividad, setAvisoInactividad] = useState('');

  useEffect(() => {
    if (!usuario) return;
    const limpiarMonitor = iniciarMonitorInactividad(() => {
      setUsuario(null);
      setAvisoInactividad('Tu sesión se cerró automáticamente tras 15 minutos de inactividad.');
    });
    return limpiarMonitor;
  }, [usuario]);

  return (
    <BrowserRouter>
      {usuario && (
        <NavbarRBAC usuario={usuario} onLogout={() => setUsuario(null)} />
      )}
      <Routes>
        <Route
          path='/login'
          element={
            usuario ? (
              <Navigate to="/bodega/inventario" replace />
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
          path='/bodega/inventario'
          element={
            <RutaProtegida usuario={usuario}>
              <CatalogoView usuario={usuario} />
            </RutaProtegida>
          }
        />

        <Route
          path='/entidades'
          element={
            <RutaProtegida usuario={usuario} rolesPermitidos={['administracion', 'encargado_finanza', 'encargado_bodega']}>
              <ComprasView usuario={usuario} />
            </RutaProtegida>
          }
        />

        <Route
          path='/admin/usuarios'
          element={
            <RutaProtegida usuario={usuario} rolesPermitidos={['administracion']}>
              <UsuariosView />
            </RutaProtegida>
          }
        />

        <Route
          path='*'
          element={<Navigate to={usuario ? '/bodega/inventario' : '/login'} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
