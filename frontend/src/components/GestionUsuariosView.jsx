import React, { useState } from 'react';
import { 
  Users, 
  Shield, 
  UserPlus, 
  Lock, 
  CheckCircle, 
  XCircle, 
  Search,
  KeyRound,
  ShieldCheck,
  Edit2
} from 'lucide-react';

export default function GestionUsuariosView() {
  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: 'Administrador General', rut: '16.482.910-3', email: 'admin@fyag.cl', rol: 'Administrador', estado: 'Activo', ultimo_login: '17/10/2026 14:30' },
    { id: 2, nombre: 'Carlos Muñoz', rut: '18.723.441-2', email: 'cmunoz@fyag.cl', rol: 'Encargado de Bodega', estado: 'Activo', ultimo_login: '17/10/2026 14:32' },
    { id: 3, nombre: 'María González', rut: '17.391.228-K', email: 'mgonzalez@fyag.cl', rol: 'Encargado de Bodega', estado: 'Activo', ultimo_login: '17/10/2026 14:18' },
    { id: 4, nombre: 'Rodrigo Ide', rut: '15.892.114-8', email: 'ride@fyag.cl', rol: 'Encargado de Finanzas', estado: 'Activo', ultimo_login: '17/10/2026 11:05' },
    { id: 5, nombre: 'Javier Soto', rut: '19.230.155-4', email: 'jsoto@fyag.cl', rol: 'Supervisor de Obra', estado: 'Activo', ultimo_login: '17/10/2026 12:41' }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: '',
    rut: '',
    email: '',
    rol: 'Encargado de Bodega'
  });

  const handleCrearUsuario = (e) => {
    e.preventDefault();
    if (!nuevoUsuario.nombre || !nuevoUsuario.rut || !nuevoUsuario.email) {
      alert("Por favor completa todos los campos.");
      return;
    }

    setUsuarios(prev => [
      ...prev,
      {
        id: prev.length + 1,
        ...nuevoUsuario,
        estado: 'Activo',
        ultimo_login: 'Nunca'
      }
    ]);

    setNuevoUsuario({ nombre: '', rut: '', email: '', rol: 'Encargado de Bodega' });
    setShowAddModal(false);
  };

  const filteredUsuarios = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.rol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            Gestión de Usuarios y Roles (HU-15 / Matriz RBAC)
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Administración de perfiles, credenciales seguras con PBKDF2 y control de privilegios de acceso
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            backgroundColor: '#1b5e20',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 16px',
            fontSize: '13.5px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <UserPlus size={16} />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Matriz RBAC Informativa (Sección 7.1 del Informe) */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        padding: '18px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} color="#1b5e20" />
          <span>Matriz de Privilegios por Perfil Operativo (RBAC)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>Administrador</div>
            <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>Acceso Total (CRUD)</div>
            <div style={{ fontSize: '10.5px', color: '#64748b' }}>Usuarios, Cardex, Finanzas, Catálogo</div>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>Encargado de Bodega</div>
            <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '2px' }}>Operativo Móvil</div>
            <div style={{ fontSize: '10.5px', color: '#64748b' }}>Ingresos, despachos, mermas justificadas</div>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>Encargado de Finanzas</div>
            <div style={{ fontSize: '11px', color: '#d97706', marginTop: '2px' }}>Gestión de Costos</div>
            <div style={{ fontSize: '10.5px', color: '#64748b' }}>Facturas, descuentos y proveedores</div>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>Supervisor de Obra</div>
            <div style={{ fontSize: '11px', color: '#7c3aed', marginTop: '2px' }}>Consulta en Terreno</div>
            <div style={{ fontSize: '10.5px', color: '#64748b' }}>Stock disponible y firma recepción</div>
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios Registrados */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {/* Barra de Búsqueda de Usuario */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '6px 12px',
            width: '320px',
            gap: '8px'
          }}>
            <Search size={15} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por nombre, RUT o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '12.5px',
                width: '100%',
                color: '#1e293b'
              }}
            />
          </div>

          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {filteredUsuarios.length} usuarios registrados
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', fontSize: '11.5px', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '12px 18px', fontWeight: '700' }}>Nombre Trabajador</th>
              <th style={{ padding: '12px 18px', fontWeight: '700' }}>RUT</th>
              <th style={{ padding: '12px 18px', fontWeight: '700' }}>Correo Electrónico</th>
              <th style={{ padding: '12px 18px', fontWeight: '700' }}>Rol Asignado (RBAC)</th>
              <th style={{ padding: '12px 18px', fontWeight: '700' }}>Estado</th>
              <th style={{ padding: '12px 18px', fontWeight: '700' }}>Último Acceso</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsuarios.map((u, idx) => (
              <tr 
                key={u.id}
                style={{
                  borderBottom: idx !== filteredUsuarios.length - 1 ? '1px solid #f1f5f9' : 'none',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
              >
                <td style={{ padding: '14px 18px', fontWeight: '700', color: '#0f172a' }}>
                  {u.nombre}
                </td>
                <td style={{ padding: '14px 18px', color: '#475569', fontFamily: 'monospace' }}>
                  {u.rut}
                </td>
                <td style={{ padding: '14px 18px', color: '#475569' }}>
                  {u.email}
                </td>
                <td style={{ padding: '14px 18px' }}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    backgroundColor: u.rol === 'Administrador' ? '#dcfce7' : (u.rol === 'Encargado de Bodega' ? '#dbeafe' : '#fef3c7'),
                    color: u.rol === 'Administrador' ? '#15803d' : (u.rol === 'Encargado de Bodega' ? '#1d4ed8' : '#b45309')
                  }}>
                    {u.rol}
                  </span>
                </td>
                <td style={{ padding: '14px 18px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '12px', fontWeight: '600' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
                    {u.estado}
                  </span>
                </td>
                <td style={{ padding: '14px 18px', fontSize: '11.5px', color: '#64748b' }}>
                  {u.ultimo_login}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal para Crear Usuario */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #cbd5e1'
          }}>
            <div style={{ backgroundColor: '#1b5e20', padding: '16px 20px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '800' }}>Registrar Nuevo Usuario</div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <form onSubmit={handleCrearUsuario} style={{ padding: '20px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Francisco Palma"
                  value={nuevoUsuario.nombre}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>RUT (Módulo 11)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: 19.823.112-4"
                  value={nuevoUsuario.rut}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rut: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Correo Institucional</label>
                <input
                  type="email"
                  required
                  placeholder="fpalma@fyag.cl"
                  value={nuevoUsuario.email}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>Rol Asignado (RBAC)</label>
                <select
                  value={nuevoUsuario.rol}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                >
                  <option value="Encargado de Bodega">Encargado de Bodega</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Encargado de Finanzas">Encargado de Finanzas</option>
                  <option value="Supervisor de Obra">Supervisor de Obra</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '600' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#1b5e20', color: '#fff', fontWeight: '700' }}
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
