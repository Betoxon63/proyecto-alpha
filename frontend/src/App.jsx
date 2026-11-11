<<<<<<< HEAD
import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
=======
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
>>>>>>> c655e6916b0cda5c9573a4e770885e7deb67bb33
