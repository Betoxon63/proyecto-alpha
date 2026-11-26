import React, { useState, useEffect } from 'react';
import { UserPlus, Search, ShieldCheck, Trash2, Edit2, Lock } from 'lucide-react';
import { obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario, obtenerRoles } from '../services_api/inventarioService';
import { obtenerUsuarioActual } from '../services_api/authService';
import '../styles/GestionUsuariosView.css'

// Dominio corporativo obligatorio para todas las cuentas de la empresa.
const DOMINIO_CORREO = '@fyag.cl';

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

// Agrega puntos y guion al RUT solo de forma visual.
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

// Limpia el nombre de correo permitiendo solo letras, números, puntos, guiones y guion bajo.
const limpiarNombreCorreo = (valor = '') => {
    const sinDominio = String(valor).split('@')[0];
    return sinDominio.toLowerCase().replace(/[^a-z0-9._-]/g, '');
};

// Extrae únicamente los 8 dígitos finales.
const extraerOchoDigitosCelular = (valor = '') => {
    let digitos = String(valor || '').replace(/\D/g, '');
    if (digitos.startsWith('569') && digitos.length > 8) {
        digitos = digitos.slice(3);
    } else if (digitos.startsWith('56') && digitos.length > 9) {
        digitos = digitos.slice(2);
    }
    if (digitos.startsWith('9') && digitos.length > 8) {
        digitos = digitos.slice(1);
    }
    return digitos.slice(0, 8);
};

// Telefono formateado con espacios.
const formatearDigitosInput = (valor = '') => {
    const digitos = extraerOchoDigitosCelular(valor);
    if (digitos.length <= 4) return digitos;
    return `${digitos.slice(0, 4)} ${digitos.slice(4)}`;
};

// Muestra el teléfono completo en la tabla con el formato oficial chileno.
export const formatearTelefonoVisual = (valor) => {
    if (!valor) return '-';
    const digitos = extraerOchoDigitosCelular(valor);
    if (digitos.length === 0) return '-';
    if (digitos.length <= 4) return `+56 9 ${digitos}`;
    return `+56 9 ${digitos.slice(0, 4)} ${digitos.slice(4)}`;
}

const estadoInicialFormulario = {
    nombre: '',
    rut: '',
    correo_usuario: '',
    password: '',
    telefono: '',
    id_rol: '',
    is_active: true,
};

// Pantalla principal para listar, registrar, editar y eliminar cuentas del personal.
export default function GestionUsuariosView({ usuarioActual }) {
    const sesion = usuarioActual || obtenerUsuarioActual();
    const esAdmin = sesion?.rol === 'administracion';
    const esSoporte = sesion?.rol === 'soporte_ti';

    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [formUsuario, setFormUsuario] = useState(estadoInicialFormulario);
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [exitoMsg, setExitoMsg] = useState('');

    // Obtiene la lista actualizada de trabajadores y cargos disponibles desde el servidor.
    const cargarDatos = async () => {
        setCargando(true);
        setErrorMsg('');
        try {
            const [resUsuarios, resRoles] = await Promise.all([
                obtenerUsuarios(),
                obtenerRoles(),
            ]);
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
        setFormUsuario({ 
            ...estadoInicialFormulario,
            id_rol: roles[0]?.id_rol || '',
        });
        setShowModal(true);
    };

    // Abre la ventana cargando los datos del trabajador seleccionado para corregirlos.
    const abrirModalEditar = (usuario) => {
        setEditandoId(usuario.id_usuario);
        setErrorMsg('');
        setFormUsuario({
            nombre: usuario.nombre || '',
            rut: formatearRutVisual(usuario.rut || ''),
            correo_usuario: limpiarNombreCorreo(usuario.correo_electronico || ''),
            password: '',
            telefono: usuario.telefono ? formatearDigitosInput(usuario.telefono) : '',
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

        const nombreLimpio = formUsuario.nombre.trim();
        if (nombreLimpio.length < 3 || nombreLimpio.length > 80) {
            setErrorMsg('El nombre completo debe tener entre 3 y 80 caracteres.');
            return;
        }

        const nombreCorreo = limpiarNombreCorreo(formUsuario.correo_usuario);
        if (nombreCorreo.length < 2 || nombreCorreo.length > 40) {
            setErrorMsg('El nombre del correo debe tener entre 2 y 40 caracteres.');
            return;
        }

        if (formUsuario.password && formUsuario.password.length > 64) {
            setErrorMsg('La contraseña no puede superar los 64 caracteres.');
            return;
        }

        // Si se escribió un teléfono, comprueba que estén completos los 8 digítos después de +56 9.
        const digitosTelefono = extraerOchoDigitosCelular(formUsuario.telefono);
        if (digitosTelefono.length > 0 && digitosTelefono.length !== 8) {
            setErrorMsg('Ingrese un número de teléfono válido.');
            return;
        }

        // Prepara los datos.
        const datosEnviar = {
            nombre: nombreLimpio,
            rut: limpiarRutParaGuardar(formUsuario.rut),
            correo_electronico: `${nombreCorreo}${DOMINIO_CORREO}`,
            telefono: digitosTelefono.length === 8 ? Number(`9${digitosTelefono}`) : null,
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
                setErrorMsg('No se pudieron guardar los datos. Revise que el RUT y el correo sean válidos.');
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
        } catch (err) {
            const detalleServidor = err.response?.data?.detail;
            setErrorMsg(
                detalleServidor ||
                    'No se puede eliminar a este trabajador porque ya tiene movimientos registrados en el historial. Puede desactivar su cuenta desde el botón Editar.'
            );
        }
    };

    // Filtrar la tabla según lo que se escriba en el buscador.
    const filteredUsuarios = usuarios.filter((u) => {
        const q = searchTerm.toLowerCase();
        const rolEtiqueta = (ETIQUETAS_ROL[u.rol_nombre] || u.rol_nombre || '').toLowerCase();
        const rutConPuntos = formatearRutVisual(u.rut).toLowerCase();
        const telefonoFormateado = formatearTelefonoVisual(u.telefono).toLowerCase();
        return (
            u.nombre?.toLowerCase().includes(q) ||
            u.rut?.toLowerCase().includes(q) ||
            rutConPuntos.includes(q) ||
            u.correo_electronico?.toLowerCase().includes(q) ||
            telefonoFormateado.includes(q) ||
            rolEtiqueta.includes(q)
        );
    });

    // Bloquea la edición de una cuenta propia.
    const editandoPropioSoporte = esSoporte && editandoId === sesion?.id_usuario;

    return (
        <div className="usuarios-container">
            <div className="usuarios-header">
                <div>
                    <h1 className="usuarios-title">Personal y Cuentas de Acceso</h1>
                    <p className="usuarios-subtitle">
                        Registro de trabajadores, corrección de datos y asignación de cargos en la empresa
                    </p>
                </div>

                <button type="button" onClick={abrirModalCrear} className="usuarios-btn-add">
                    <UserPlus size={16} />
                    <span>Registrar Trabajador</span>
                </button>
            </div>

            {exitoMsg && <div className="alerta-exito">{exitoMsg}</div>}
            {errorMsg && !showModal && <div className="alerta-error">{errorMsg}</div>}

            {/* Resumen de las atribuciones vigentes de cada cargo */}
            <div className="usuarios-rbac-card">
                <div className="usuarios-rbac-title">
                    <ShieldCheck size={18} color="#1b5e20" />
                    <span>Funciones según el Cargo Asignado</span>
                </div>

                <div className="usuarios-rbac-grid">
                    <div className="usuarios-rbac-item">
                        <div className="usuarios-rbac-role">Administrador General</div>
                        <div className="usuarios-rbac-scope admin">Control Total</div>
                        <div className="usuarios-rbac-desc">Acceso completo a bodega, obras, finanzas y personal</div>
                    </div>

                    <div className="usuarios-rbac-item">
                        <div className="usuarios-rbac-role">Soporte Técnico</div>
                        <div className="usuarios-rbac-scope soporte">Gestión de Cuentas</div>
                        <div className="usuarios-rbac-desc">Creación y corrección de cuentas del personal</div>
                    </div>

                    <div className="usuarios-rbac-item">
                        <div className="usuarios-rbac-role">Encargado de Bodega</div>
                        <div className="usuarios-rbac-scope bodega">Operación de Bodega</div>
                        <div className="usuarios-rbac-desc">Catálogo, solicitudes de compra, recepción física, despachos y mermas</div>
                    </div>

                    <div className="usuarios-rbac-item">
                        <div className="usuarios-rbac-role">Encargado de Finanzas</div>
                        <div className="usuarios-rbac-scope finanzas">Clientes y Facturas</div>
                        <div className="usuarios-rbac-desc">Clientes, proveedores, aprobación de compras, facturas y gastos</div>
                    </div>

                    <div className="usuarios-rbac-item">
                        <div className="usuarios-rbac-role">Supervisor de Obra</div>
                        <div className="usuarios-rbac-scope supervisor">Consulta en Terreno</div>
                        <div className="usuarios-rbac-desc">Crea y gestiona sus obras, consulta stock y firma recepciones</div>
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
                            maxLength={80}
                            placeholder="Buscar por nombre, RUT, correo, teléfono o cargo..."
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
                                filteredUsuarios.map((u) => {
                                    const esCuentaAdmin = u.rol_nombre === 'administracion';
                                    const esPropiaCuenta = u.id_usuario === sesion?.id_usuario;
                                    const puedeEditar = esAdmin || (esSoporte && !esCuentaAdmin);
                                    const puedeEliminar = esAdmin && !esPropiaCuenta;

                                    return (
                                        <tr key={u.id_usuario}>
                                            <td className="usuarios-td-name">{u.nombre}</td>
                                            <td className="usuarios-td-rut">{formatearRutVisual(u.rut)}</td>
                                            <td className="usuarios-td-email">{u.correo_electronico}</td>
                                            <td className="usuarios-td-phone">{formatearTelefonoVisual(u.telefono)}</td>
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
                                                    {puedeEditar ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => abrirModalEditar(u)}
                                                            className="usuarios-btn-edit"
                                                            title="Modificar datos del trabajador"
                                                        >
                                                            <Edit2 size={14} />
                                                            <span>Editar</span>
                                                        </button>
                                                    ) : (
                                                        <span
                                                            className="usuarios-protected-badge"
                                                            title="Solo Administración puede modificar cuentas de Administrador"
                                                        >
                                                            <Lock size={12} />
                                                            <span>Solo Admin</span>
                                                        </span>
                                                    )}

                                                    {puedeEliminar && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEliminarUsuario(u.id_usuario, u.nombre)}
                                                            className="usuarios-btn-delete"
                                                            title="Eliminar Cuenta"
                                                        >
                                                            <Trash2 size={14} />
                                                            <span>Eliminar</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
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
                                    minLength={3}
                                    maxLength={80}
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
                                    maxLength={12}
                                    placeholder="Ej: 12.345.678-9"
                                    value={formUsuario.rut}
                                    onChange={(e) => setFormUsuario({ ...formUsuario, rut: formatearRutVisual(e.target.value), })}
                                    className="usuarios-form-input"
                                />
                            </div>

                            <div className="usuarios-form-group">
                                <label className="usuarios-form-label">Correo Electrónico</label>
                                <div className="usuarios-input-addon">
                                    <input
                                        type="text"
                                        required
                                        minLength={2}
                                        maxLength={40}
                                        placeholder="Ej: fpalma"
                                        value={formUsuario.correo_usuario}
                                        onChange={(e) => setFormUsuario({ ...formUsuario, correo_usuario: limpiarNombreCorreo(e.target.value),})}
                                        className="usuarios-addon-input"
                                    />
                                    <span className="usuarios-addon-tag">{DOMINIO_CORREO}</span>
                                </div>
                                <small className="usuarios-input-hint">
                                    Escriba solo el nombre antes del arroba; {DOMINIO_CORREO} se agregará automáticamente.
                                </small>
                            </div>

                            <div className="usuarios-form-group">
                                <label className="usuarios-form-label">{editandoId ? 'Nueva Contraseña (dejar en blanco para mantener la actual)' : 'Contraseña de Acceso (mínimo 8 caracteres)'}</label>
                                <input
                                    type="password"
                                    required={!editandoId}
                                    minLength={8}
                                    maxLength={64}
                                    placeholder={editandoId ? 'Sin Cambios' : '********'}
                                    value={formUsuario.password}
                                    onChange={(e) => setFormUsuario({ ...formUsuario, password: e.target.value})}
                                    className="usuarios-form-input"
                                />
                            </div>

                            <div className="usuarios-form-group">
                                <label className="usuarios-form-label">Teléfono de Contacto (Opcional)</label>
                                <div className="usuarios-input-addon">
                                    <span className="usuarios-addon-tag prefix">+56 9</span>
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={9}
                                        placeholder="Ej: 8765 4321"
                                        value={formUsuario.telefono}
                                        onChange={(e) => setFormUsuario({ ...formUsuario, telefono: formatearDigitosInput(e.target.value)})}
                                        className="usuarios-addon-input"
                                    />
                                </div>
                            </div>

                            <div className="usuarios-form-group">
                                <label className="usuarios-form-label">Cargo en la Empresa</label>
                                <select
                                    required
                                    disabled={editandoPropioSoporte}
                                    value={formUsuario.id_rol}
                                    onChange={(e) => setFormUsuario({ ...formUsuario, id_rol: e.target.value })}
                                    className="usuarios-form-select"
                                >
                                    <option value="">Seleccione un cargo...</option>
                                    {roles.map((r) => (
                                        <option key={r.id_rol} value={r.id_rol}>
                                            {ETIQUETAS_ROL[r.nombre] || r.nombre}
                                        </option>
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