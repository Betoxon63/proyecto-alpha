import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Truck,
  Receipt,
  Users,
  ShieldCheck,
  Search,
  AlertTriangle,
  LogOut,
} from 'lucide-react';

import DashboardView from './DashboardView';
import DespachoObra from './DespachoObra';
import FacturasComprasView from '../components/FacturasComprasView';
import GestionUsuariosView from './GestionUsuariosView';
import FinanzasView from './FinanzasView';
import SupervisorObraView from './SupervisorObraView';
import TablaCardex from '../components/TablaCardex';
import StockAlertModal from '../components/StockAlertModal';
import { obtenerArticulos, obtenerProveedores } from '../services_api/inventarioService';
import { obtenerCardex, obtenerObras } from '../services_api/obrasService';
import { logoutUsuario } from '../services_api/authService';
import logoFyag from '../assets/logo.png';
import '../styles/DesktopAdminCardexView.css';

const ETIQUETAS_ROL = {
  administracion: 'Administrador',
  encargado_bodega: 'Encargado de Bodega',
  encargado_finanza: 'Encargado de Finanzas',
  supervisor_obra: 'Supervisor de Obra',
};

export default function DesktopAdminCardexView({ usuario, onLogout }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('cardex');
  const [articulos, setArticulos] = useState([]);
  const [cardex, setCardex] = useState([]);
  const [obras, setObras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [busquedaGeneral, setBusquedaGeneral] = useState('');
  const [modalStockAbierto, setModalStockAbierto] = useState(false);

  const rol = usuario?.rol || 'administracion';
  const esAdmin = rol === 'administracion';
  const esSupervisor = rol === 'supervisor_obra';
  const esFinanzas = rol === 'encargado_finanza';

  const cargarTodo = async () => {
    try {
      const [resArt, dataCardex, dataObras, resProv] = await Promise.all([
        obtenerArticulos(),
        obtenerCardex(),
        obtenerObras(),
        obtenerProveedores().catch(() => ({ data: [] })),
      ]);
      setArticulos(resArt?.data || []);
      setCardex(Array.isArray(dataCardex) ? dataCardex : []);
      setObras(Array.isArray(dataObras) ? dataObras : []);
      setProveedores(resProv?.data || []);
    } catch {
      // Silencioso en caso de permisos restringidos por rol
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  const stockCriticoCount = articulos.filter(
    (a) => Number(a.stock_disponible) <= Number(a.stock_minimo)
  ).length;

  const obtenerIniciales = (nombre = '') => {
    const partes = nombre.trim().split(/\s+/);
    if (!partes[0]) return 'AD';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  };

  const cerrarSesion = async () => {
    await logoutUsuario();
    if (onLogout) onLogout();
    navigate('/login');
  };

  return (
    <div className="desktop-admin-layout">
      {/* 1. Sidebar Verde Corporativo FYAG SpA (Captura 5.3.2) */}
      <aside className="desktop-admin-sidebar">
        <div>
          <div className="desktop-admin-logo-box">
            <img src={logoFyag} alt="Logo FYAG SpA" className="desktop-admin-logo-img" />
            <div>
              <div className="desktop-admin-brand-title">FYAG SpA</div>
              <div className="desktop-admin-brand-sub">Control Logístico Alpha</div>
            </div>
          </div>

          <div className="desktop-admin-section-label">OPERACIONES</div>

          <nav className="desktop-admin-nav">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`desktop-admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>

            {!esSupervisor ? (
              <button
                type="button"
                onClick={() => setActiveTab('cardex')}
                className={`desktop-admin-nav-item ${activeTab === 'cardex' ? 'active' : ''}`}
              >
                <Boxes size={18} />
                <span>Inventario y Cardex</span>
              </button>
            ) : (
              <div
                title="Acceso Denegado (403): Supervisor sin permisos en Cardex"
                className="desktop-admin-nav-disabled"
              >
                <Boxes size={18} />
                <span>Inventario y Cardex (403)</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('obras')}
              className={`desktop-admin-nav-item ${activeTab === 'obras' ? 'active' : ''}`}
            >
              <Truck size={18} />
              <span>Obras y Despachos</span>
            </button>

            {!esSupervisor ? (
              <button
                type="button"
                onClick={() => setActiveTab('facturas')}
                className={`desktop-admin-nav-item ${activeTab === 'facturas' ? 'active' : ''}`}
              >
                <Receipt size={18} />
                <span>Compras y Facturas</span>
              </button>
            ) : (
              <div
                title="Acceso Denegado (403): Supervisor sin permisos en Facturación"
                className="desktop-admin-nav-disabled"
              >
                <Receipt size={18} />
                <span>Compras y Facturas (403)</span>
              </div>
            )}

            {esAdmin ? (
              <button
                type="button"
                onClick={() => setActiveTab('usuarios')}
                className={`desktop-admin-nav-item ${activeTab === 'usuarios' ? 'active' : ''}`}
              >
                <Users size={18} />
                <span>Gestión de Usuarios</span>
              </button>
            ) : (
              <div
                title="Acceso Denegado (HTTP 403): Exclusivo para Administrador"
                className="desktop-admin-nav-disabled"
              >
                <Users size={18} />
                <span>Gestión de Usuarios (403)</span>
              </div>
            )}

            <div className="desktop-admin-terminal-block">
              <div className="desktop-admin-section-label">TERMINAL BODEGA</div>
              <button
                type="button"
                onClick={() => navigate('/bodega/movimientos')}
                className="desktop-admin-btn-tablet"
              >
                <span>📱 Terminal Móvil (5.3.1)</span>
              </button>
            </div>
          </nav>
        </div>

        <div>
          <div className="desktop-admin-footer-card">
            <div className="desktop-admin-footer-title">
              <ShieldCheck size={14} />
              <span>REFRIGERACIÓN INDUSTRIAL</span>
            </div>
            <p className="desktop-admin-footer-text">
              Frío y Agroindustria SpA
              <br />
              Control y trazabilidad de materiales
            </p>
          </div>

          <div className="desktop-admin-status-line">
            <span className="desktop-admin-status-dot"></span>
            <span>Conectado a Supabase (6543)</span>
          </div>
        </div>
      </aside>

      {/* 2. Área Principal */}
      <div className="desktop-admin-main-content">
        <header className="desktop-admin-topbar">
          <div className="desktop-admin-search-wrapper">
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar insumos, obras o documentos..."
              value={busquedaGeneral}
              onChange={(e) => setBusquedaGeneral(e.target.value)}
              className="desktop-admin-search-input"
            />
          </div>

          <div className="desktop-admin-topbar-right">
            <button
              type="button"
              onClick={() => setModalStockAbierto(true)}
              className="desktop-admin-stock-pill"
              title="Ver insumos con stock crítico (HU-03)"
            >
              <AlertTriangle size={16} color="#d97706" />
              <span>{stockCriticoCount} insumos con stock crítico</span>
            </button>

            <div className="desktop-admin-user-box">
              <div className="desktop-admin-avatar">
                {obtenerIniciales(usuario?.nombre)}
              </div>
              <div>
                <div className="desktop-admin-user-name">{usuario?.nombre}</div>
                <div className="desktop-admin-user-role">
                  {ETIQUETAS_ROL[rol] || rol}
                </div>
              </div>
              <button
                type="button"
                onClick={cerrarSesion}
                className="desktop-admin-btn-logout"
                title="Cerrar sesión segura (Blacklist JWT)"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </header>

        <main className="desktop-admin-view-body">
          {activeTab === 'dashboard' && (
            <DashboardView
              articulos={articulos}
              cardex={cardex}
              obras={obras}
              onNavigateTo={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'cardex' && !esSupervisor && (
            <TablaCardex cardexInicial={cardex} obrasInicial={obras} />
          )}

          {activeTab === 'obras' &&
            (esSupervisor ? (
              <SupervisorObraView
                articulos={articulos}
                obras={obras}
                cardex={cardex}
              />
            ) : (
              <DespachoObra
                obras={obras}
                articulos={articulos}
                cardex={cardex}
              />
            ))}

          {activeTab === 'facturas' &&
            !esSupervisor &&
            (esFinanzas ? (
              <FinanzasView proveedores={proveedores} />
            ) : (
              <FacturasComprasView
                proveedores={proveedores}
                articulos={articulos}
              />
            ))}

          {activeTab === 'usuarios' && esAdmin && <GestionUsuariosView />}
        </main>
      </div>

      <StockAlertModal
        isOpen={modalStockAbierto}
        onClose={() => setModalStockAbierto(false)}
        articulos={articulos}
        onNavigateToBodega={() => navigate('/bodega/inventario')}
      />
    </div>
  );
}