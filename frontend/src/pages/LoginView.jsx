import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { loginUsuario } from '../services_api/authService';
import logoFyag from '../assets/logo.png';
import '../styles/LoginView.css'

// Define a qué pantalla entra cada trabajador según su cargo.
export const obtenerRutaInicial = (rol) => {
    switch (rol) {
        case 'administracion':
        case 'soporte_ti':
            return '/admin/usuarios';
        case 'encargado_bodega':
            return '/bodega/inventario';
        case 'encargado_finanza':
            return '/entidades';
        case 'supervisor_obra':
            return '/obras/despachos';
        default:
            return '/bodega/inventario';
    }
};

const LoginView = ({ onLoginSuccess, mensajeInactividad }) => {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [cuentaBloqueada, setCuentaBloqueada] = useState(false);
    const [cargando, setCargando] = useState(false);
    const navigate = useNavigate();

    // Envía los datos de acceso y redirige al trabajador a su área correspondiente.
    const manejarSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        const correoLimpio = correo.trim().toLowerCase();
        const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!correoLimpio || !password) {
            setCuentaBloqueada(false);
            setErrorMsg('Por favor, ingrese su correo electrónico y contraseña.');
            return;
        }

        if (!regexCorreo.test(correoLimpio)) {
            setCuentaBloqueada(false);
            setErrorMsg('Ingrese un correo electrónico válido (ej: nombre@fyag.cl).');
            return;
        }

        setCargando(true);

        try {
            const usuario = await loginUsuario(correoLimpio, password);
            setCuentaBloqueada(false);
            onLoginSuccess(usuario);
            // Redirige automáticamente al módulo principal del cargo.
            navigate(obtenerRutaInicial(usuario.rol));
        } catch (err) {
            if (err.response) {
                const status = err.response.status;
                const detalle = err.response.data?.detail;

                if (status === 429) {
                    setCuentaBloqueada(true);
                    setErrorMsg(
                        detalle || 
                            'Se superó el límite de intentos permitidos. Por seguridad, espere 10 minutos antes de volver a intentar.'
                    );
                } else if (status === 401) {
                    setCuentaBloqueada(false);
                    setErrorMsg(detalle || 'Correo o contraseña incorrectos. Revise sus datos e intente nuevamente.');
                } else if (status === 400) {
                    setCuentaBloqueada(false);
                    setErrorMsg(detalle || 'Complete correctamente todos los campos solicitados.');
                } else {
                    setCuentaBloqueada(false);
                    setErrorMsg('Ocurrió un inconveniente al ingresar. Intente nuevamente en unos momentos.');
                }
            } else {
                setCuentaBloqueada(false);
                setErrorMsg('No fue posible conectar con el sistema. Revise su conexión a internet.');
            }
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className='login-wrapper'>
            <div className='login-card'>
                <div className='login-header'>
                    <div className='login-logo-box'>
                        <img src={logoFyag} alt="Logo FYAG SpA" className='login-logo-img' />
                    </div>
                    <h1 className='login-title'>FYAG SpA</h1>
                    <p className='login-subtitle'>Sistema de Bodega y Control de Obras</p>
                </div>

                {mensajeInactividad && !errorMsg && (
                    <div className='alerta-error'>{mensajeInactividad}</div>
                )}

                {errorMsg && (
                    <div className={`alerta-error ${cuentaBloqueada ? 'alerta-bloqueado' : ''}`}>{errorMsg}</div>
                )}

                <form onSubmit={manejarSubmit} className='login-form' noValidate>
                    <div className='login-field'>
                        <label className='login-label'>Correo Electrónico</label>
                        <input
                            type="email"
                            className='login-input'
                            maxLength={80}
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            placeholder='nombre@fyag.cl'
                            required
                        />
                    </div>

                    <div className='login-field'>
                        <label className='login-label'>Contraseña</label>
                        <input
                            type="password"
                            className='login-input'
                            maxLength={64}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder='********'
                            required
                        />
                    </div>

                    <div className='login-actions'>
                        <button type='submit' className='login-btn-submit' disabled={cargando}>
                            <LogIn size={18} />
                            <span>{cargando ? 'Ingresando...' : 'Iniciar Sesión'}</span>
                        </button>
                    </div>
                </form>

                <div className='login-footer-text'>
                    Frío y Agroindustria SpA | Acceso exclusivo para personal autorizado
                </div>
            </div>
        </div>
    );
};

export default LoginView;