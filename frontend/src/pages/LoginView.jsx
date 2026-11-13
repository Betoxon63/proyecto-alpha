/**
 * @file LoginView.jsx
 * @description Vista de inicio de sesión y autenticación JWT con protección ante ataques de fuerza bruta (HTTP 429).
 * Valida formato de correo, gestiona estados de carga y redirige según el perfil RBAC del usuario.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUsuario } from '../services_api/authService';

const LoginView = ({ onLoginSuccess, mensajeInactividad }) => {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [bloqueado429, setBloqueado429] = useState(false);
    const [cargando, setCargando] = useState(false);
    const navigate = useNavigate();

    const manejarSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        const correoLimpio = correo.trim();
        const regexCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!correoLimpio || !password) {
            setBloqueado429(false);
            setErrorMsg('Por favor, complete su correo electrónico y contraseña.');
            return;
        }

        if (!regexCorreo.test(correoLimpio)) {
            setBloqueado429(false);
            setErrorMsg('Ingrese un formato de correo electrónico válido (ejemplo: usuario@fyag.cl).');
            return;
        }

        setCargando(true);

        try {
            const usuario = await loginUsuario(correoLimpio, password);
            setBloqueado429(false);
            onLoginSuccess(usuario);
            navigate('/bodega/inventario');
        } catch (err) {
            if (err.response) {
                const status = err.response.status;
                const detalle = err.response.data?.detail;

                if (status === 429) {
                    setBloqueado429(true);
                    setErrorMsg(detalle || 'Se ha superado el límite de intentos permitidos. El acceso se encuentra bloqueado por 10 minutos.');
                } else if (status === 401) {
                    setBloqueado429(false);
                    setErrorMsg(detalle || 'Credenciales inválidas. Verifique su correo electrónico y contraseña.');
                } else if (status === 400) {
                    setBloqueado429(false);
                    setErrorMsg(detalle || 'Los datos ingresados no son válidos. Revise los campos e intente nuevamente.');
                } else {
                    setBloqueado429(false);
                    setErrorMsg('Ocurrió un problema en el servidor al procesar su solicitud. Intente nuevamente más tarde.');
                }
            } else {
                setBloqueado429(false);
                setErrorMsg('Error de conexión con el servidor. Verifique su conexión a internet o que el servicio esté activo.');
            }
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className='login-wrapper'>
            <div className='login-card'>
                <div className='login-header'>
                    <h1>FYAG SpA</h1>
                    <p>Sistema Logístico Proyecto Alpha</p>
                </div>

                {mensajeInactividad && !errorMsg && (
                    <div className='alerta-error'>{mensajeInactividad}</div>
                )}

                {errorMsg && (
                    <div className={`alerta-error ${bloqueado429 ? 'alerta-bloqueado' : ''}`}>{errorMsg}</div>
                )}

                <form onSubmit={manejarSubmit} className='form-grid' noValidate>
                    <label>
                        Correo Electrónico
                        <input 
                            type="email" 
                            value={correo} 
                            onChange={(e) => setCorreo(e.target.value)}
                            placeholder='usuario@fyag.cl'
                            required
                        />
                    </label>

                    <label>
                        Contraseña
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder='********'
                            required
                        />
                    </label>

                    <button type='submit' className='btn-primario' disabled={cargando}>
                        {cargando ? 'Verificando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginView;