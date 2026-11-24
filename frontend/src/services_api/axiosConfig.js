import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

// Access Token almacenado en la memoria volátil.
let accessTokenMemory = null;
let refreshPromise = null;

// Guarda el permiso de acceso actual en memoria.
export const setAccessToken = (token) => {
    accessTokenMemory = token;
};

// Obtiene el permiso de acceso actual en memoria.
export const getAccessToken = () => accessTokenMemory;

// Guarda el permiso de renovación de jornada (8 horas) en una cookie segura del navegador.
export const setRefreshTokenCookie = (refreshToken) => {
    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `alpha_refresh_token=${encodeURIComponent(refreshToken)}; max-age=28800; path=/; SameSite=Strict${secureFlag}`;
    sessionStorage.setItem('alpha_refresh_backup', refreshToken);
};

// Lee el permiso de renovación guardado para mantener la sesión activa al recargar la página.
export const getRefreshTokenCookie = () => {
    const match = document.cookie.match(/(?:^|;\s*)alpha_refresh_token=([^;]*)/);
    if (match) return decodeURIComponent(match[1]);
    return sessionStorage.getItem('alpha_refresh_backup');
};

// Borra todos los datos y permisos de sesión cuando el trabajador sale o su jornada expira.
export const clearAuthTokens = () => {
    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
    accessTokenMemory = null;
    refreshPromise = null;
    document.cookie = `alpha_refresh_token=; max-age=0; path=/; SameSite=Strict${secureFlag}`;
    sessionStorage.removeItem('alpha_refresh_backup');
    sessionStorage.removeItem('alpha_usuario');
    // Elimina respaldos antiguos del historial si existieran de versiones previas.
    localStorage.removeItem('fyag_cardex_alpha');
};

// Cliente principal encargado de enviar y recibir datos con el servidor.
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Antes de enviar cada petición, adjunta automáticamente el permiso de acceso del trabajador.
api.interceptors.request.use(
    (config) => {
        if (accessTokenMemory) {
            config.headers.Authorization = `Bearer ${accessTokenMemory}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // No intenta renovar si el error ocurrió directamente en las rutas de inicio de sesión.
        if (!originalRequest || (originalRequest.url && originalRequest.url.includes('/token/'))) {
            return Promise.reject(error);
        }

        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = getRefreshTokenCookie();

            if (!refreshToken) {
                clearAuthTokens();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                // Evita pedir varias renovaciones simultáneas si se cargan varias tablas al mismo tiempo.
                if (!refreshPromise) {
                    refreshPromise = axios
                        .post(`${API_BASE_URL}/token/refresh/`, { refresh: refreshToken })
                        .then((res) => {
                            const nuevoAccess = res.data.access;
                            setAccessToken(nuevoAccess);
                            if (res.data.refresh) {
                                setRefreshTokenCookie(res.data.refresh);
                            }
                            return nuevoAccess;
                        })
                        .finally(() => {
                            refreshPromise = null;
                        });
                }

                const nuevoToken = await refreshPromise;
                originalRequest.headers.Authorization = `Bearer ${nuevoToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                clearAuthTokens();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;