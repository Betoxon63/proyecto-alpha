/**
 * @file App.jsx
 * @description Punto de entrada principal y enrutador central de la aplicación cliente React SPA (Vite).
 * Configura la navegación protegida mediante la Matriz RBAC, el monitor de inactividad de sesión (15 min)
 * y el modal global de alertas preventivas de inventario.
 * 
 * BIBLIOTECAS UTILIZADAS:
 * - react: Hooks useState, useEffect para gestión de estado del usuario y catálogo reactivo.
 * - react-router-dom: BrowserRouter, Routes, Route, Navigate para el sistema de rutas protegidas.
 * 
 * REGLAS DE SEGURIDAD Y NEGOCIO:
 * - Inactividad: Cierre automático de sesión tras 15 minutos sin eventos del usuario (OWASP Top 10).
 * - RBAC (Capítulo 7.1): Restricción de acceso HTTP 403 en vistas específicas según el rol del token JWT.
 * - HU-03: Detección proactiva de umbrales críticos de inventario en bodega central.
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import NavbarRBAC from './components/NavbarRBAC';
import LoginView from './pages/LoginView';
import CatalogoView from './pages/CatalogoView';
import ComprasView from './pages/ComprasView';
import UsuariosView from './pages/UsuariosView';
import DespachoObra from './pages/DespachoObra';
import TablaCardex from './components/TablaCardex';
import StockAlertModal from './components/StockAlertModal';
import { obtenerArticulos } from './services_api/inventarioService';
import { INITIAL_ARTICULOS } from './mockData';
import {
  obtenerUsuarioActual,
  iniciarMonitorInactividad,
} from './services_api/authService';

/**
 * Envoltorio de seguridad para rutas protegidas con validación de roles RBAC.
 * 
 * @component
 * @param {Object} props Propiedades del componente.
 * @param {Object} props.usuario Datos del usuario actualmente conectado.
 * @param {Array<string>} [props.rolesPermitidos] Roles autorizados para ingresar a la ruta.
 * @param {React.ReactNode} props.children Vista hija a renderizar si se aprueba la validación.
 */
const RutaProtegida = ({ usuario, rolesPermitidos, children }) => {
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }
  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return (
      <div className='contenedor-vista'>
        <div className='alerta-error'>
          Acceso Denegado (HTTP 403): Tu perfil ({usuario.rol}) no tiene permisos para acceder a este módulo.
        </div>
      </div>
    );
  }
  return children;
};

/**
 * Componente raíz de la aplicación.
 */
function App() {
  const [usuario, setUsuario] = useState(() => obtenerUsuarioActual());
  const [avisoInactividad, setAvisoInactividad] = useState('');
  const [articulos, setArticulos] = useState(INITIAL_ARTICULOS);
  const [mostrarAlertasStock, setMostrarAlertasStock] = useState(false);

  // Monitor de inactividad de sesión de usuario (15 minutos)
  useEffect(() => {
    if (!usuario) return;
    const limpiarMonitor = iniciarMonitorInactividad(() => {
      setUsuario(null);
      setAvisoInactividad('Tu sesión se cerró automáticamente tras 15 minutos de inactividad.');
    });
    return limpiarMonitor;
  }, [usuario]);

  // Consulta de catálogo para cálculo de stock crítico
  useEffect(() => {
    if (usuario) {
      obtenerArticulos()
        .then((res) => {
          if (res?.data && res.data.length > 0) setArticulos(res.data);
        })
        .catch(() => {
          // Utiliza INITIAL_ARTICULOS en caso de desconexión
        });
    }
  }, [usuario]);

  // Cálculo de conteo de existencias bajo stock mínimo
  const stockCriticoCount = articulos.filter(
    (a) => Number(a.stock_disponible) <= Number(a.stock_minimo)
  ).length;

  return (
    <BrowserRouter>
      {usuario && (
        <NavbarRBAC
          usuario={usuario}
          onLogout={() => setUsuario(null)}
          onOpenStockAlerts={() => setMostrarAlertasStock(true)}
          stockCriticoCount={stockCriticoCount}
        />
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
          path='/cardex'
          element={
            <RutaProtegida
              usuario={usuario}
              rolesPermitidos={['administracion', 'encargado_bodega', 'encargado_finanza']}
            >
              <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
                <TablaCardex />
              </div>
            </RutaProtegida>
          }
        />

        <Route
          path='/obras/despachos'
          element={
            <RutaProtegida
              usuario={usuario}
              rolesPermitidos={['administracion', 'encargado_bodega', 'supervisor_obra']}
            >
              <DespachoObra usuario={usuario} />
            </RutaProtegida>
          }
        />



        <Route
          path='/entidades'
          element={
            <RutaProtegida
              usuario={usuario}
              rolesPermitidos={['administracion', 'encargado_finanza', 'encargado_bodega']}
            >
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

      {/* Modal Preventivo de Stock Crítico */}
      <StockAlertModal
        isOpen={mostrarAlertasStock}
        onClose={() => setMostrarAlertasStock(false)}
        articulos={articulos}
        onNavigateToBodega={() => {
          setMostrarAlertasStock(false);
          window.location.href = '/bodega/inventario';
        }}
      />
    </BrowserRouter>
  );
}

export default App;
