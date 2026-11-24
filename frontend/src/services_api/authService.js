import api, { setAccessToken, setRefreshTokenCookie, getRefreshTokenCookie, clearAuthTokens, } from './axiosConfig';

// Tiempo máximo sin uso antes de cerrar la sesión automáticamente.
const TIEMPO_INACTIVIDAD = 15 * 60 *1000;
let temporizadorInactividad = null;

// Envía el correo y la contraseña al servidor, guarda los permisos de sesión y devuelve los datos del trabajador.
export const loginUsuario = async (correo_electronico, password) => {
    const response = await api.post('/token/', { correo_electronico, password });
    const { access, refresh, usuario } = response.data;

    setAccessToken(access);
    setRefreshTokenCookie(refresh);
    sessionStorage.setItem('alpha_usuario', JSON.stringify(usuario));

    return usuario;
};

// Avisa al servidor para invalidar la sesión actual y borra todos los datos locales del navegador.
export const logoutUsuario = async () => {
    const refresh = getRefreshTokenCookie();
    if (refresh) {
        try {
            await api.post('/token/logout/', { refresh });
        } catch {
            // Si el token ya expiró se limpia localmente.
        }
    }
    detenerMonitorInactividad();
    clearAuthTokens();
};

// Recupera los datos del trabajador conectado mientras la pestaña siga abierta.
export const obtenerUsuarioActual = () => {
    const data = sessionStorage.getItem('alpha_usuario');
    if (!data) return null;
    try {
        return JSON.parse(data);
    } catch {
        sessionStorage.removeItem('alpha_usuario');
        return null;
    }
};

// Vigila el movimiento del mouse, teclado o pantalla táctil para cerrar la sesión tras 15 minutos sin uso.
export const iniciarMonitorInactividad = (onTimeoutCallback) => {
    const reiniciarTemporizador = () => {
        if (temporizadorInactividad) clearTimeout(temporizadorInactividad);
        temporizadorInactividad = setTimeout(async () => {
            await logoutUsuario();
            if (onTimeoutCallback) onTimeoutCallback();
        }, TIEMPO_INACTIVIDAD);
    };

    const eventos = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    eventos.forEach((evento) => window.addEventListener(evento, reiniciarTemporizador));
    reiniciarTemporizador();

    return () => {
        if (temporizadorInactividad) clearTimeout(temporizadorInactividad);
        eventos.forEach((evento) => window.removeEventListener(evento, reiniciarTemporizador));
    };
};

// Detiene el contador de inactividad cuando el trabajador cierra sesión manualmente.
export const detenerMonitorInactividad = () => {
    if (temporizadorInactividad) clearTimeout(temporizadorInactividad);
};