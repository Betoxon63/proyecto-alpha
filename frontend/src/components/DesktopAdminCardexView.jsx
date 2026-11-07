import React, { useState } from 'react';
import {
  LayoutDashboard,
  Boxes,
  Truck,
  Receipt,
  Users,
  ShieldCheck,
  Search,
  Bell,
  Calendar,
  Lock,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  FileSpreadsheet,
  Building2,
  ChevronRight,
  Filter,
  Check
} from 'lucide-react';

import DashboardView from './DashboardView';
import ObrasDespachosView from './ObrasDespachosView';
import FacturasComprasView from './FacturasComprasView';
import GestionUsuariosView from './GestionUsuariosView';
import FinanzasView from './FinanzasView';
import SupervisorObraView from './SupervisorObraView';
import '../styles/DesktopAdminCardexView.css';

export default function DesktopAdminCardexView({
  cardex,
  articulos,
  obras,
  proveedores,
  currentUser = { nombre: 'Administrador', email: 'admin@fyag.cl', rol: 'Administrador' },
  currentRoleKey = 'admin',
  onSelectRole,
  onSwitchView,
  onResetData,
  onOpenStockAlertsModal,
  onRegistrarDespacho,
  onRegistrarFactura
}) {
  const [activeTab, setActiveTab] = useState('cardex'); // 'cardex' | 'dashboard' | 'obras' | 'facturas' | 'usuarios'
  const [tipoFiltro, setTipoFiltro] = useState('Todos'); // 'Todos' | 'Entradas' | 'Salidas' | 'Mermas'
  const [obraFiltro, setObraFiltro] = useState('Todas');
  const [busquedaGeneral, setBusquedaGeneral] = useState('');
  const [rangoFecha, setRangoFecha] = useState('17/10/2026 - 17/10/2026');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Conteo de insumos en stock crítico (<= stock_minimo)
  const stockCriticoCount = articulos.filter(a => a.stock_disponible <= a.stock_minimo).length;

  // Filtrado de movimientos
  const filteredCardex = cardex.filter(item => {
    // Filtro por Tipo
    if (tipoFiltro === 'Entradas' && item.tipo_movimiento !== 'Entrada') return false;
    if (tipoFiltro === 'Salidas' && item.tipo_movimiento !== 'Salida') return false;
    if (tipoFiltro === 'Mermas' && item.tipo_movimiento !== 'Merma') return false;

    // Filtro por Obra
    if (obraFiltro !== 'Todas' && !item.obra_destino.toLowerCase().includes(obraFiltro.toLowerCase())) return false;

    // Búsqueda general
    if (busquedaGeneral.trim() !== '') {
      const q = busquedaGeneral.toLowerCase();
      const match = (
        item.articulo_nombre.toLowerCase().includes(q) ||
        item.articulo_codigo.toLowerCase().includes(q) ||
        item.id_movimiento.toLowerCase().includes(q) ||
        item.documento_respaldo.toLowerCase().includes(q) ||
        item.usuario_responsable.toLowerCase().includes(q)
      );
      if (!match) return false;
    }

    return true;
  });

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#f8fafc',
      fontFamily: 'inherit',
      color: '#0f172a'
    }}>
      
      {/* 1. SIDEBAR VERDE CORPORATIVO FYAG SpA (Captura 5.3.2) */}
      <div style={{
        width: '260px',
        minWidth: '260px',
        backgroundColor: '#1b5e20',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        minHeight: '100vh'
      }}>
        <div>
          {/* Logo Empresa idéntico a la captura 5.3.2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', paddingLeft: '8px' }}>
            {/* Ícono de asterisco de frío/refrigeración idéntico al logo de la captura */}
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="22"></line>
              <line x1="17" y1="5" x2="7" y2="19"></line>
              <line x1="22" y1="12" x2="2" y2="12"></line>
              <line x1="17" y1="19" x2="7" y2="5"></line>
            </svg>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.3px', lineHeight: 1 }}>FYAG SpA</div>
              <div style={{ fontSize: '11px', color: '#bbf7d0', fontWeight: '400', marginTop: '3px' }}>FYAG SpA - Control Logístico</div>
            </div>
          </div>

          <div style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.8px', color: '#86efac', marginBottom: '12px', paddingLeft: '12px' }}>
            OPERACIONES
          </div>

          {/* Menú de Módulos con RBAC Activo (Sección 7.1 del Informe) */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            
            {/* 1. Dashboard (Disponible para todos) */}
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: activeTab === 'dashboard' ? '#ffffff' : 'transparent',
                color: activeTab === 'dashboard' ? '#1b5e20' : '#bbf7d0',
                fontSize: '13.5px',
                fontWeight: activeTab === 'dashboard' ? '700' : '600',
                textAlign: 'left',
                boxShadow: activeTab === 'dashboard' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer'
              }}
            >
              <LayoutDashboard size={18} color={activeTab === 'dashboard' ? '#1b5e20' : '#bbf7d0'} />
              <span>Dashboard</span>
            </button>

            {/* 2. Inventario y Cardex (Admin: Auditoría total | Finanzas: Solo lectura | Bodega: Registrar mov | Supervisor: Denegado 403) */}
            {currentUser.rol !== 'Supervisor de Obras' ? (
              <button
                onClick={() => setActiveTab('cardex')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: activeTab === 'cardex' ? '#ffffff' : 'transparent',
                  color: activeTab === 'cardex' ? '#1b5e20' : '#bbf7d0',
                  fontSize: '13.5px',
                  fontWeight: activeTab === 'cardex' ? '700' : '600',
                  textAlign: 'left',
                  boxShadow: activeTab === 'cardex' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <Boxes size={18} color={activeTab === 'cardex' ? '#1b5e20' : '#bbf7d0'} />
                <span>Inventario y Cardex</span>
              </button>
            ) : (
              <div
                title="Acceso Denegado (403): El perfil Supervisor no tiene autorización para auditar el Cardex"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  opacity: 0.4,
                  fontSize: '13px',
                  color: '#94a3b8',
                  cursor: 'not-allowed'
                }}
              >
                <Boxes size={18} />
                <span>Inventario y Cardex (403)</span>
              </div>
            )}

            {/* Sub-item activo: Auditoría de Cardex con puntito */}
            {activeTab === 'cardex' && currentUser.rol !== 'Supervisor de Obras' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 14px 6px 38px',
                fontSize: '12px',
                color: '#ffffff',
                fontWeight: '500'
              }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#ffffff' }}></span>
                <span>Auditoría de Cardex</span>
              </div>
            )}

            {/* 3. Obras y Despachos (Disponible para Admin, Bodega y Supervisor) */}
            <button
              onClick={() => setActiveTab('obras')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: activeTab === 'obras' ? '#ffffff' : 'transparent',
                color: activeTab === 'obras' ? '#1b5e20' : '#bbf7d0',
                fontSize: '13.5px',
                fontWeight: activeTab === 'obras' ? '700' : '600',
                textAlign: 'left',
                boxShadow: activeTab === 'obras' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer'
              }}
            >
              <Truck size={18} color={activeTab === 'obras' ? '#1b5e20' : '#bbf7d0'} />
              <span>Obras y Despachos</span>
            </button>

            {/* 4. Compras y Facturas (Admin y Finanzas: Total | Bodega: Registrar | Supervisor: Denegado 403) */}
            {currentUser.rol !== 'Supervisor de Obras' ? (
              <button
                onClick={() => setActiveTab('facturas')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: activeTab === 'facturas' ? '#ffffff' : 'transparent',
                  color: activeTab === 'facturas' ? '#1b5e20' : '#bbf7d0',
                  fontSize: '13.5px',
                  fontWeight: activeTab === 'facturas' ? '700' : '600',
                  textAlign: 'left',
                  boxShadow: activeTab === 'facturas' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <Receipt size={18} color={activeTab === 'facturas' ? '#1b5e20' : '#bbf7d0'} />
                <span>Compras y Facturas</span>
              </button>
            ) : (
              <div
                title="Acceso Denegado (403): El perfil Supervisor no tiene autorización para acceder a Facturación"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  opacity: 0.4,
                  fontSize: '13px',
                  color: '#94a3b8',
                  cursor: 'not-allowed'
                }}
              >
                <Receipt size={18} />
                <span>Compras y Facturas (403)</span>
              </div>
            )}

            {/* 5. Gestión de Usuarios (Exclusivo Administrador. Para otros roles es Denegado 403) */}
            {currentUser.rol === 'Administrador' ? (
              <button
                onClick={() => setActiveTab('usuarios')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: activeTab === 'usuarios' ? '#ffffff' : 'transparent',
                  color: activeTab === 'usuarios' ? '#1b5e20' : '#bbf7d0',
                  fontSize: '13.5px',
                  fontWeight: activeTab === 'usuarios' ? '700' : '600',
                  textAlign: 'left',
                  boxShadow: activeTab === 'usuarios' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <Users size={18} color={activeTab === 'usuarios' ? '#1b5e20' : '#bbf7d0'} />
                <span>Gestión de Usuarios</span>
              </button>
            ) : (
              <div
                title="Acceso Denegado (HTTP 403): Solo el Administrador puede gestionar usuarios y credenciales"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  opacity: 0.4,
                  fontSize: '13px',
                  color: '#94a3b8',
                  cursor: 'not-allowed'
                }}
              >
                <Users size={18} />
                <span>Gestión de Usuarios (403)</span>
              </div>
            )}

            {/* Terminal Móvil Bodega (Vista PWA 5.3.1) */}
            <div style={{ margin: '10px 0 4px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '10px' }}>
              <div style={{ fontSize: '10px', fontWeight: '800', letterSpacing: '0.8px', color: '#86efac', marginBottom: '6px', paddingLeft: '12px' }}>
                TERMINAL BODEGA
              </div>
              <button
                onClick={() => onSwitchView && onSwitchView('tablet')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: '700',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <span>📱 Terminal Móvil (5.3.1)</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Footer Sidebar */}
        <div>
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', fontWeight: '700', color: '#86efac', marginBottom: '4px' }}>
              <ShieldCheck size={14} />
              <span>REFRIGERACIÓN INDUSTRIAL</span>
            </div>
            <p style={{ fontSize: '11px', color: '#e2e8f0', lineHeight: '1.3' }}>
              Frío y Agroindustria SpA<br />Control y trazabilidad de materiales
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#86efac', paddingLeft: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
            <span>Sistema operativo v2.4</span>
          </div>
        </div>
      </div>

      {/* 2. ÁREA PRINCIPAL DE CONTENIDO */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* TOPBAR / HEADER ADMINISTRATIVO */}
        <header style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          {/* Buscador Superior */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            borderRadius: '10px',
            padding: '8px 14px',
            width: '420px',
            gap: '10px',
            border: '1px solid transparent'
          }}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar insumos, obras o documentos..."
              value={busquedaGeneral}
              onChange={(e) => setBusquedaGeneral(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: '13px',
                width: '100%',
                color: '#1e293b'
              }}
            />
            <span style={{
              fontSize: '11px',
              backgroundColor: '#e2e8f0',
              color: '#64748b',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: '600'
            }}>
              Ctrl K
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Alerta de Stock Crítico (Captura 5.3.2) */}
            <div 
              onClick={onOpenStockAlertsModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fcd34d',
                color: '#92400e',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Ver insumos que alcanzaron umbral mínimo"
            >
              <AlertTriangle size={16} color="#d97706" />
              <span>{stockCriticoCount} insumos con stock crítico</span>
            </div>

            {/* Perfil Usuario Dinámico según Rol RBAC (Sección 7.1) */}
            <div style={{ position: 'relative' }}>
              <div 
                onClick={() => setShowProfileMenu(prev => !prev)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '10px',
                  transition: 'background-color 0.2s',
                  backgroundColor: showProfileMenu ? '#f1f5f9' : 'transparent'
                }}
                title="Haga clic para cambiar de usuario o rol"
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: currentUser.rol === 'Administrador' ? '#e2e8f0' : (currentUser.rol.includes('Bodega') ? '#dbeafe' : (currentUser.rol.includes('Finanzas') ? '#fef3c7' : '#f3e8ff')),
                  color: currentUser.rol === 'Administrador' ? '#1b5e20' : (currentUser.rol.includes('Bodega') ? '#1d4ed8' : (currentUser.rol.includes('Finanzas') ? '#b45309' : '#6b21a8')),
                  fontWeight: '800',
                  fontSize: '13.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {currentUser.iniciales}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{currentUser.nombre}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>
                      {currentUser.rol === 'Administrador' && 'Acceso completo (CRUD)'}
                      {currentUser.rol.includes('Bodega') && 'Operativo Bodega · Restringido'}
                      {currentUser.rol.includes('Finanzas') && 'Costos y Facturación'}
                      {currentUser.rol.includes('Supervisor') && 'Faena y Consulta'}
                    </span>
                    <span style={{ fontSize: '9px', opacity: 0.7 }}>▼</span>
                  </div>
                </div>
              </div>

              {/* Menú Desplegable de Usuario y Control de Acceso RBAC */}
              {showProfileMenu && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  width: '280px',
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e2e8f0',
                  padding: '12px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                      Usuario Autenticado (RBAC)
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>{currentUser.nombre}</div>
                    <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>{currentUser.rol}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10.5px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
                      CAMBIAR USUARIO / ROL:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {[
                        { key: 'admin', label: 'Administrador (AD)', desc: 'Acceso total y auditoría' },
                        { key: 'bodeguero', label: 'Carlos Muñoz (CM)', desc: 'Operativo Bodega / Tablet' },
                        { key: 'finanzas', label: 'Rodrigo Ide (RI)', desc: 'Facturación y Proveedores' },
                        { key: 'supervisor', label: 'Javier Soto (JS)', desc: 'Supervisor de Obras' }
                      ].map(r => (
                        <button
                          key={r.key}
                          onClick={() => {
                            onSelectRole && onSelectRole(r.key);
                            setShowProfileMenu(false);
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: 'none',
                            textAlign: 'left',
                            backgroundColor: currentRoleKey === r.key ? '#f0fdf4' : 'transparent',
                            color: currentRoleKey === r.key ? '#1b5e20' : '#334155',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: '700' }}>{r.label}</span>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>{r.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onSwitchView && onSwitchView('tablet');
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <span>📱 Ver Terminal Móvil Bodega (5.3.1)</span>
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm("¿Deseas restablecer todos los movimientos y catálogo al estado original?")) {
                          onResetData && onResetData();
                          setShowProfileMenu(false);
                        }
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        fontSize: '11px',
                        color: '#dc2626',
                        fontWeight: '600',
                        textAlign: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      Restablecer datos originales
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENIDO DEL PORTAL (CARDEX DE AUDITORÍA INALTERABLE Y OTRAS OPERACIONES) */}
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          
          {/* VISTA 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <DashboardView
              articulos={articulos}
              cardex={cardex}
              obras={obras}
              onNavigateTo={(tab) => setActiveTab(tab)}
            />
          )}

          {/* VISTA 2: OBRAS Y DESPACHOS (Si es Supervisor muestra su portal de faenas, existencias y firmas) */}
          {activeTab === 'obras' && (
            currentUser.rol.includes('Supervisor') ? (
              <SupervisorObraView
                articulos={articulos}
                obras={obras}
                cardex={cardex}
              />
            ) : (
              <ObrasDespachosView
                obras={obras}
                articulos={articulos}
                cardex={cardex}
                onRegistrarDespacho={onRegistrarDespacho}
              />
            )
          )}

          {/* VISTA 3: COMPRAS Y FINANZAS (Si el rol es Finanzas muestra el portal financiero completo HU-16/17/18) */}
          {activeTab === 'facturas' && (
            currentUser.rol.includes('Finanzas') ? (
              <FinanzasView
                proveedores={proveedores}
                cardex={cardex}
                articulos={articulos}
              />
            ) : (
              <FacturasComprasView
                proveedores={proveedores}
                articulos={articulos}
                onRegistrarFactura={onRegistrarFactura}
              />
            )
          )}

          {/* VISTA 4: GESTIÓN DE USUARIOS */}
          {activeTab === 'usuarios' && (
            <GestionUsuariosView />
          )}

          {/* VISTA 5: INVENTARIO Y CARDEX (AUDITORÍA APPEND-ONLY) */}
          {activeTab === 'cardex' && (
            <>
              {/* Breadcrumb */}
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Inventario y Cardex</span>
                <ChevronRight size={13} />
                <span style={{ color: '#0f172a', fontWeight: '600' }}>Auditoría</span>
              </div>

          {/* Título de la Vista */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
                Auditoría de Cardex Inalterable
              </h1>
              <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
                Trazabilidad completa de entradas, salidas y mermas
              </p>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#475569',
              fontWeight: '600'
            }}>
              <Calendar size={16} />
              <span>FECHA DE CONSULTA: <strong>17 de octubre de 2026</strong></span>
            </div>
          </div>

          {/* BANNER PROTEGIDO · APPEND-ONLY (Captura 5.3.2) */}
          <div style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#d1fae5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#065f46' }}>
                  Registro protegido · Append-Only.
                </div>
                <div style={{ fontSize: '12.5px', color: '#047857' }}>
                  Los movimientos no se pueden modificar ni eliminar. Toda corrección genera un nuevo registro.
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ffffff',
              border: '1px solid #a7f3d0',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#065f46'
            }}>
              <Lock size={14} />
              <span>Solo lectura</span>
            </div>
          </div>

          {/* BARRA DE FILTROS DE CONSULTA (Captura 5.3.2) */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            padding: '16px 20px',
            marginBottom: '20px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={15} />
                Filtros de consulta
              </span>
              <span style={{ color: '#64748b', fontWeight: '400', fontSize: '12px' }}>Consulta del día · 17 oct 2026</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1.5fr auto', gap: '16px', alignItems: 'flex-end' }}>
              
              {/* Rango de fechas */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
                  Rango de Fechas
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  fontSize: '13px'
                }}>
                  <Calendar size={16} color="#64748b" />
                  <input
                    type="text"
                    value={rangoFecha}
                    onChange={(e) => setRangoFecha(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '12.5px', color: '#1e293b' }}
                  />
                </div>
              </div>

              {/* Botones de Tipo */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
                  Tipo
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['Todos', 'Entradas', 'Salidas', 'Mermas'].map(tipo => (
                    <button
                      key={tipo}
                      onClick={() => setTipoFiltro(tipo)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        backgroundColor: tipoFiltro === tipo ? '#1b5e20' : '#f1f5f9',
                        color: tipoFiltro === tipo ? '#ffffff' : '#475569',
                        transition: 'all 0.15s'
                      }}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Obra / Destino */}
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
                  Obra / Destino
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '9px 12px'
                }}>
                  <Building2 size={16} color="#64748b" />
                  <select
                    value={obraFiltro}
                    onChange={(e) => setObraFiltro(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      width: '100%',
                      fontSize: '13px',
                      color: '#1e293b',
                      fontWeight: '500'
                    }}
                  >
                    <option value="Todas">Todas las ubicaciones</option>
                    <option value="Bodega Central">Bodega Central</option>
                    {obras.map(o => (
                      <option key={o.id} value={o.nombre}>{o.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botón Aplicar Filtros */}
              <button
                type="button"
                style={{
                  backgroundColor: '#1b5e20',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '13.5px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '40px'
                }}
              >
                <Filter size={15} />
                <span>Aplicar filtros</span>
              </button>
            </div>
          </div>

          {/* TABLA PRINCIPAL DE MOVIMIENTOS DE CARDEX (Captura 5.3.2) */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Movimientos de Cardex</span>
                <span style={{
                  fontSize: '11.5px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: '700'
                }}>
                  {filteredCardex.length} registros
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FileSpreadsheet size={15} />
                <span>Más recientes primero</span>
              </div>
            </div>

            {/* TABLA */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '11.5px', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 18px', fontWeight: '700' }}>ID Movimiento</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700' }}>Fecha/Hora</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700' }}>Usuario Responsable</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700' }}>Artículo/Descripción</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700', textAlign: 'right' }}>Cantidad</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700', textAlign: 'center' }}>Tipo Movimiento</th>
                    <th style={{ padding: '12px 18px', fontWeight: '700' }}>Obra/Destino</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCardex.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                        No se encontraron movimientos registrados con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredCardex.map((mov, idx) => {
                      const isPositive = mov.cantidad > 0;
                      return (
                        <tr 
                          key={mov.id_movimiento}
                          style={{
                            borderBottom: idx !== filteredCardex.length - 1 ? '1px solid #f1f5f9' : 'none',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                        >
                          {/* ID Movimiento */}
                          <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: '700', color: '#0f172a' }}>
                            {mov.id_movimiento}
                          </td>

                          {/* Fecha / Hora */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '600', color: '#1e293b' }}>
                              {mov.fecha_hora.split(' ')[1] || mov.fecha_hora}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {mov.fecha_hora.split(' ')[0]} · CLST
                            </div>
                          </td>

                          {/* Usuario Responsable */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{mov.usuario_responsable}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{mov.cargo}</div>
                          </td>

                          {/* Artículo / Descripción */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{mov.articulo_nombre}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{mov.articulo_detalle}</div>
                          </td>

                          {/* Cantidad */}
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <span style={{
                              fontWeight: '800',
                              fontSize: '14px',
                              color: mov.tipo_movimiento === 'Entrada' ? '#16a34a' : (mov.tipo_movimiento === 'Merma' ? '#ea580c' : '#2563eb')
                            }}>
                              {isPositive ? `+${mov.cantidad}` : mov.cantidad} {mov.unidad_medida}
                            </span>
                          </td>

                          {/* Tipo Movimiento con Badges */}
                          <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '700',
                              backgroundColor: mov.tipo_movimiento === 'Entrada' ? '#dcfce7' : (mov.tipo_movimiento === 'Merma' ? '#ffedd5' : '#dbeafe'),
                              color: mov.tipo_movimiento === 'Entrada' ? '#15803d' : (mov.tipo_movimiento === 'Merma' ? '#c2410c' : '#1d4ed8')
                            }}>
                              {mov.tipo_movimiento === 'Entrada' && <ArrowDownLeft size={13} />}
                              {mov.tipo_movimiento === 'Salida' && <ArrowUpRight size={13} />}
                              {mov.tipo_movimiento === 'Merma' && <AlertTriangle size={13} />}
                              {mov.tipo_movimiento}
                            </span>
                          </td>

                          {/* Obra / Destino y Documento */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{mov.obra_destino}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>📄 {mov.documento_respaldo}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación y Nota Append-Only al pie de tabla */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Mostrando 1–{filteredCardex.length} de {filteredCardex.length} movimientos
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  disabled
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    color: '#94a3b8',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  Anterior
                </button>
                <span style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#1b5e20',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  1
                </span>
                <button
                  type="button"
                  disabled
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    color: '#94a3b8',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>

          {/* Nota de Auditoría y Footer de Sistema */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11.5px',
            color: '#94a3b8',
            marginTop: '16px',
            padding: '0 4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={13} />
              <span>Historial íntegro · Sin edición ni eliminación de movimientos (Garantía Append-Only)</span>
            </div>
            <div>
              Hora local de Chile (CLST) · UTC-3
            </div>
          </div>
            </>
          )}

        </main>
      </div>

    </div>
  );
}
