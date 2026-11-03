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
        setCargando(true);

        try {
            const usuario = await loginUsuario(correo, password);
            setBloqueado429(false);
            onLoginSuccess(usuario);
            navigate('/bodega/inventario');
        } catch (err) {
            const status = err.response?.status;
            const detalle = err.response?.data?.detail;

            if (status === 429) {
                setBloqueado429(true);
                setErrorMsg(
                    detalle || 'Demasiados intentos fallidos (HTTP 429). Acceso bloqueado por 10 minutos.'
                );
            } else if (status === 401) {
                setBloqueado429(false);
                setErrorMsg('Credenciales inválidas (HTTP 401). Verifique su correo o contraseña.');
            } else {
                setErrorMsg('Error de conexión con el servidor.');
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

                {mensajeInactividad && (
                    <div className='alerta-error'>{mensajeInactividad}</div>
                )}

                {errorMsg && (
                    <div className={`alerta-error ${bloqueado429 ? 'alerta-bloqueado' : ''}`}>{errorMsg}</div>
                )}

                <form onSubmit={manejarSubmit} className='form-grid'>
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