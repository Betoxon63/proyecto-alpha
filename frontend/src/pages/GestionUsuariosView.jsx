import React, { useState, useEffect } from 'react';
import { UserPlus, Search, ShieldCheck, Trash2, Edit2 } from 'lucide-react';
import { obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario, obtenerRoles } from '../services_api/inventarioService';
import '../styles/GestionUsuariosView.css'

// Nombres claros de los cargos para mostrar en pantalla.
const ETIQUETAS_ROL = {
    administracion: 'Administrador General',
    soporte_ti: 'Soporte Técnico',
    encargado_bodega: 'Encargado de Bodega',
    encargado_finanza: 'Encargado de Finanzas',
    supervisor_obra: 'Supervisor de Obra',
};

// Colores de etiqueta según el rol.
const CLASE_BADGE_ROL = {
    administracion: 'usuarios-role-badge admin',
    soporte_ti: 'usuarios-role-badge soporte',
    encargado_bodega: 'usuarios-role-badge bodega',
    encargado_finanza: 'usuarios-role-badge finanzas',
    supervisor_obra: 'usuarios-role-badge supervisor',
};

// Agrega puntos y guion al RUT.
export const formatearRutVisual = (valor = '') => {
    const limpio = String(valor).replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
    if (limpio.length <= 1) return limpio;
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    const cuerpoConPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${cuerpoConPuntos}-${dv}`;
};

// Quita puntos del RUT antes de enviarlo a la base de datos.
export const limpiarRutParaGuardar = (valor = '') => {
    const limpio = String(valor).replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
    if (limpio.length <= 1) return limpio;
    return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
};

const estadoInicialFormulario = {
    nombre: '',
    rut: '',
    correo_electronico: '',
    password: '',
    telefono: '',
    id_rol: '',
    is_active: true,
};

export default function GestionUsuariosView() {
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [formUsuario, setFormUsuario] = useState(estadoInicialFormulario);
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [exitoMsg, setExitoMsg] = useState('');

    // Obtiene la lista actualizada de trabajadores y cargos desde el servidor.
    const cargarDatos = async () => {
        setCargando(true);
        setErrorMsg('');
        try {
            const [resUsuarios, resRoles] = await Promise.all([ obtenerUsuarios(), obtenerRoles(), ]);
            setUsuarios(resUsuarios.data);
            setRoles(resRoles.data);
            if (resRoles.data.length > 0 && !formUsuario.id_rol) {
                setFormUsuario((prev) => ({ ...prev, id_rol: resRoles.data[0].id_rol }));
            }
        } catch {
            setErrorMsg('No se pudo cargar la nómina de trabajadores.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    // Abre la ventana vacía para registrar un trabajador nuevo.
    const abrirModalCrear = () => {
        setEditandoId(null);
        setErrorMsg('');
        setFormUsuario({ ...estadoInicialFormulario, id_rol: roles[0]?.id_rol || '', });
        setShowModal(true);
    };

    // Abre la ventana cargando los datos del trabajador seleccionado para corregirlos.
    const abrirModalEditar = (usuario) => {
        setEditandoId(usuario.id_usuario);
        setErrorMsg('');
        setFormUsuario({
            nombre: usuario.nombre || '',
            rut: formatearRutVisual(usuario.rut || ''),
            correo_electronico: usuario.correo_electronico || '',
            password: '',
            telefono: usuario.telefono ? String(usuario.telefono) : '',
            id_rol: usuario.id_rol || '',
            is_active: usuario.is_active !== false,
        });
        setShowModal(true);
    };

    // Guardar un trabajador nuevo o aplica los cambios de uno existente.
    const handleGuardarUsuario = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setExitoMsg('');

        // Prepara los datos limpiando el RUT.
        const datosEnviar = {
            nombre: formUsuario.nombre.trim(),
            rut: limpiarRutParaGuardar(formUsuario.rut),
            correo_electronico: formUsuario.correo_electronico.trim(),
            telefono: formUsuario.telefono ? Number(formUsuario.telefono) : null,
            id_rol: Number(formUsuario.id_rol),
            is_active: formUsuario.is_active,
        };

        // Solo enviamos la contraseña si es un usuario nuevo o si se cambio.
        if (!editandoId || (formUsuario.password && formUsuario.password.trim() !== '')) {
            datosEnviar.password = formUsuario.password;
        }

        try {
            if (editandoId) {
                await actualizarUsuario(editandoId, datosEnviar);
                setExitoMsg('Los datos del trabajador se actualizaron correctamente.');
            } else {
                await crearUsuario(datosEnviar);
                setExitoMsg('Nuevo trabajador registrado correctamente.');
            }
            setShowModal(false);
            setEditandoId(null);
            await cargarDatos();
        } catch (err) {
            const dataErr = err.response?.data;
            if (dataErr && typeof dataErr === 'object') {
                const detalle = Object.values(dataErr).flat().join(' ');
                setErrorMsg(detalle);
            } else {
                setErrorMsg('No se pudieron guardar los datos. Revise que el RUT sea válido.');
            }
        }
    };

    // Elimina un trabajador.
    const handleEliminarUsuario = async (idUsuario, nombre) => {
        if (!window.confirm(`¿Está seguro de eliminar la cuenta de "${nombre}"?`)) return;
        setErrorMsg('');
        setExitoMsg('');
        try {
            await eliminarUsuario(idUsuario);
            setExitoMsg('Cuenta de trabajador eliminada correctamente.');
            await cargarDatos();
        } catch {
            setErrorMsg('No se puede eliminar a este trabajador porque ya tiene movimientos registrados en el historial. Puede desactivar su cuenta desde el botón Editar.');
        }
    };

    // Filtrar la tabla según lo que se escriba en el buscador.
    const filteredUsuarios = usuarios.filter((u) => {
        const q = searchTerm.toLowerCase();
        const rolEtiqueta = (ETIQUETAS_ROL[u.rol_nombre] || u.rol_nombre || '').toLowerCase();
        const rutConPuntos = formatearRutVisual(u.rut).toLowerCase();
        return (
            u.nombre?.toLowerCase().includes(q) ||
            u.rut?.toLowerCase().includes(q) ||
            rutConPuntos.includes(q) ||
            u.correo_electronico?.toLowerCase().includes(q) ||
            rolEtiqueta.includes(q)
        );
    });

    return (
        <div className="usuarios-container">
            <div className="usuarios-header">
                <div>
                    <h1 className="usuarios-title">Personal y Cuentas de Acceso</h1>
                    <p className="usuarios-subtitle">Registro de trabajadores, corrección de datos y asignación de cargos en la empresa</p>
                </div>

                <button type="button" onClick={abrirModalCrear} className="usuarios-btn-add">
                    <UserPlus size={16} />
                    <span>Registrar Trabajador</span>
                </button>
            </div>

            {exitoMsg && <div className="alerta-exito">{exitoMsg}</div>}
            {errorMsg && !showModal && <div className="alerta-error">{errorMsg}</div>}

            {/* Resumen de lo que puede hacer cada cargo */}
            <div className="usuarios-rbac-card">
                <div className="usuarios-rbac-title">
                    <ShieldCheck size={18} color="#1b5e20" />
                    <span>Funciones según el Cargo Asignado</span>
                </div>

                <div className="usuarios-rbac-grid">
                    <div className="usuarios-rbac-item">
                        <div className="usuarios-rbac-role">Administrador General</div>
                        <div className="usuarios-rbac-scope admin">Control Total</div>
                        <div className="usuarios-rbac-desc">Acceso a todas las áreas, personal e historial</div>
                    </div>

                    <div className="usuarios-rbac-item">
                        <div className="usuarios-rbac-role">Soporte Técnico</div>
                        <div className="usuarios-rbac-scope soporte">Gestión de Cuentas</div>
                        <div className="usuarios-rbac-desc">Creación y corrección de cuentas del personal</div>
                    </div>

                    <div className="usuarios-rbac-item">
                        <div className="usuarios-rbac-role">Encargado de Bodega</div>
                        <div className="usuarios-rbac-scope bodega">Operación de Bodega</div>
                        <div className="usuarios-rbac-desc">Catálogo, ingreso de compras, salidas y mermas</div>
                    </div>

                    <div className="usuarios-rbac-item">
                        <div className="usuarios-rbac-role">Encargado de Finanzas</div>
                        <div className="usuarios-rbac-scope finanzas">Clientes y Facturas</div>
                        <div className="usuarios-rbac-desc">Proveedores, clientes y revisión de gastos</div>
                    </div>

                    <div className="usuarios-rbac-item">
                        <div className="usuarios-rbac-role">Supervisor de Obra</div>
                        <div className="usuarios-rbac-scope supervisor">Consulta en Terreno</div>
                        <div className="usuarios-rbac-desc">Revisión de stock disponible y recepción en obra</div>
                    </div>
                </div>
            </div>

            {/* Tabla principal de trabajadores */}
            <div className="usuarios-table-card">
                <div className="usuarios-table-toolbar">
                    <div className="usuarios-search-box">
                        <Search size={15} color="#64748b" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, RUT, correo o cargo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="usuarios-search-input"
                        />
                    </div>

                    <div className="usuarios-count-label">{filteredUsuarios.length} trabajadores registrados</div>
                </div>

                <div className="usuarios-table-wrapper">
                    <table className="usuarios-table">
                        <thead>
                            <tr>
                                <th>Nombre del Trabajador</th>
                                <th>RUT</th>
                                <th>Correo Electrónico</th>
                                <th>Teléfono</th>
                                <th>Cargo Asignado</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cargando ? (
                                <tr>
                                    <td colSpan={7} className="usuarios-table-empty">
                                        Cargando nómina de trabajadores...
                                    </td>
                                </tr>
                            ) : filteredUsuarios.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="usuarios-table-empty">
                                        No se encontraron trabajadores con los datos buscados.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsuarios.map((u) => (
                                    <tr key={u.id_usuario}>
                                        <td className="usuarios-td-name">{u.nombre}</td>
                                        <td className="usuarios-td-rut">{formatearRutVisual(u.rut)}</td>
                                        <td className="usuarios-td-email">{u.correo_electronico}</td>
                                        <td className="usuarios-td-phone">{u.telefono || '-'}</td>
                                        <td>
                                            <span className={CLASE_BADGE_ROL[u.rol_nombre] || 'usuarios-role-badge'}>
                                                {ETIQUETAS_ROL[u.rol_nombre] || u.rol_nombre}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={u.is_active ? 'usuarios-status-active' : 'usuarios-status-inactive'}>
                                                <span className={u.is_active ? 'usuarios-status-dot' : 'usuarios-status-dot inactive'}></span>
                                                {u.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="usuarios-actions-cell">
                                                <button
                                                    type="button"
                                                    onClick={() => abrirModalEditar(u)}
                                                    className="usuarios-btn-edit"
                                                    title="Modificar datos del trabajador"
                                                >
                                                    <Edit2 size={14} />
                                                    <span>Editar</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleEliminarUsuario(u.id_usuario, u.nombre)}
                                                    className="usuarios-btn-delete"
                                                    title="Eliminar cuenta"
                                                >
                                                    <Trash2 size={14} />
                                                    <span>Eliminar</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Ventana emergente para Crear o Editar un trabajador */}
            {showModal && (
                <div className="usuarios-modal-overlay">
                    <div className="usuarios-modal-card">
                        <div className="usuarios-modal-header">
                            <div className="usuarios-modal-title">
                                {editandoId ? 'Modificar Datos del Trabajador' : 'Registrar Nuevo Trabajador'}
                            </div>
                            <button type="button" onClick={() => setShowModal(false)} className="usuarios-modal-close">X</button>
                        </div>

                        <form onSubmit={handleGuardarUsuario} className="usuarios-modal-form">
                            {errorMsg && <div className="alerta-error">{errorMsg}</div>}

                            <div className="usuarios-form-group">
                                <label className="usuarios-form-label">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Francisco Palma"
                                    value={formUsuario.nombre}
                                    onChange={(e) => setFormUsuario({ ...formUsuario, nombre: e.target.value})}
                                    className="usuarios-form-input"
                                />
                            </div>

                            <div className="usuarios-form-group">
                                <label className="usuarios-form-label">RUT del Trabajador</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: 12.345.678-9"
                                    value={formUsuario.rut}
                                    onChange={(e) => setFormUsuario({ ...formUsuario, rut: formatearRutVisual(e.target.value), })}
                                    className="usuarios-form-input"
                                />
                            </div>

                            <div className="usuarios-form-group">
                                <label className="usuarios-form-label">Correo Electrónico</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="nombre@fyag.cl"
                                    value={formUsuario.correo_electronico}
                                    onChange={(e) => setFormUsuario({ ...formUsuario, correo_electronico: e.target.value})}
                                    className="usuarios-form-input"
                                />
                            </div>

                            <div className="usuarios-form-group">
                                <label className="usuarios-form-label">{editandoId ? 'Nueva Contraseña (dejar en blanco para mantener la actual)' : 'Contraseña de Acceso (mínimo 8 caracteres)'}</label>
                                <input
                                    type="password"
                                    required={!editandoId}
                                    minLength={8}
                                    placeholder={editandoId ? 'Sin Cambios' : '********'}
                                    value={formUsuario.password}
                                    onChange={(e) => setFormUsuario({ ...formUsuario, password: e.target.value})}
                                    className="usuarios-form-input"
                                />
                            </div>

                            <div className="usuarios-form-group">
                                <label className="usuarios-form-label">Teléfono de Contacto (Opcional)</label>
                                <input
                                    type="number"
                                    placeholder="Ej: 987654321"
                                    value={formUsuario.telefono}
                                    onChange={(e) => setFormUsuario({ ...formUsuario, telefono: e.target.value})}
                                    className="usuarios-form-input"
                                />
                            </div>

                            <div className="usuarios-form-group">
                                <label className="usuarios-form-label">Cargo en la Empresa</label>
                                <select
                                    required
                                    value={formUsuario.id_rol}
                                    onChange={(e) => setFormUsuario({ ...formUsuario, id_rol: e.target.value })}
                                    className="usuarios-form-select"
                                >
                                    <option value="">Seleccione un cargo...</option>
                                    {roles.map((r) => (
                                        <option key={r.id_rol} value={r.id_rol}>{ETIQUETAS_ROL[r.nombre] || r.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {editandoId && (
                                <div className="usuarios-form-group">
                                    <label className="usuarios-form-label">Estado de la Cuenta</label>
                                    <select
                                        value={formUsuario.is_active ? 'activo' : 'inactivo'}
                                        onChange={(e) => setFormUsuario({ ...formUsuario, is_active: e.target.value === 'activo', })}
                                        className="usuarios-form-select"
                                    >
                                        <option value="activo">Activo (Puede iniciar sesión)</option>
                                        <option value="inactivo">Inactivo (Acceso suspendido)</option>
                                    </select>
                                </div>
                            )}

                            <div className="usuarios-modal-actions">
                                <button type="button" onClick={() => setShowModal(false)} className="usuarios-btn-cancel">Cancelar</button>
                                <button type="submit" className="usuarios-btn-submit">{editandoId ? 'Guardar Cambios' : 'Registrar Trabajador'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};