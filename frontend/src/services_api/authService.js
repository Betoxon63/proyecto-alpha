import api, {
    setAccessToken,
    setRefreshTokenCookie,
    getRefreshTokenCookie,
    clearAuthTokens,
} from './axiosConfig';

const TIEMPO_INACTIVIDAD = 15 * 60 *1000;
let temporizadorInactividad = null;

export const loginUsuario = async (correo_electronico, password) => {
    const response = await api.post('/token/', { correo_electronico, password });
    const { access, refresh, usuario } = response.data;

    setAccessToken(access);
    setRefreshTokenCookie(refresh);
    sessionStorage.setItem('alpha_usuario', JSON.stringify(usuario));

    return usuario;
};

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

export const obtenerUsuarioActual = () => {
    const data = sessionStorage.getItem('alpha_usuario');
    return data ? JSON.parse(data) : null;
};

export const iniciarMonitorInactividad = (onTimeoutCallback) => {
    const reiniciarTemporizador = () => {
        if (temporizadorInactividad) clearTimeout(temporizadorInactividad);
        temporizadorInactividad = setTimeout(async () => {
            await logoutUsuario();
            if (onTimeoutCallback) onTimeoutCallback();
        }, TIEMPO_INACTIVIDAD);
    };

    const eventos = ['mousemove', 'keydown', 'click', 'tocuhstart', 'scroll'];
    eventos.forEach((evento) => window.addEventListener(evento, reiniciarTemporizador));
    reiniciarTemporizador();

    return () => {
        if (temporizadorInactividad) clearTimeout(temporizadorInactividad);
        eventos.forEach((evento) => window.removeEventListener(evento, reiniciarTemporizador));
    };
};

export const detenerMonitorInactividad = () => {
    if (temporizadorInactividad) clearTimeout(temporizadorInactividad);
};