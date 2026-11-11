import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

// Access Token almacenado en la memoria volátil.
let accessTokenMemory = null;
let refreshPromise = null;

export const setAccessToken = (token) => {
    accessTokenMemory = token;
};

export const getAccessToken = () => accessTokenMemory;

export const setRefreshTokenCookie = (refreshToken) => {
    const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `alpha_refresh_token=${encodeURIComponent(refreshToken)}; max-age=28800; path=/; SameSite=Strict${secureFlag}`;
    sessionStorage.setItem('alpha_refresh_backup', refreshToken);
};

export const getRefreshTokenCookie = () => {
    const match = document.cookie.match(/(?:^|;\s*)alpha_refresh_token=([^;]*)/);
    if (match) return decodeURIComponent(match[1]);
    return sessionStorage.getItem('alpha_refresh_backup');
};

export const clearAuthTokens = () => {
    accessTokenMemory = null;
    refreshPromise = null;
    document.cookie = 'alpha_refresh_token=; max-age=0; path=/; SameSite=Strict';
    sessionStorage.removeItem('alpha_refresh_backup');
    sessionStorage.removeItem('alpha_usuario');
};

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para adjuntar el Access Token en cada petición.
api.interceptors.request.use(
    (config) => {
        if (accessTokenMemory) {
            config.headers.Authorization = `Bearer ${accessTokenMemory}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor para renovar automáticamente el Access Token usando la cookie del Refresh Token.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.congif;

        if (
            error.response &&
            error.response.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes('/token/')
        ) {
            originalRequest._retry = true;
            const refreshToken = getRefreshTokenCookie();

            if (!refreshToken) {
                clearAuthTokens();
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                if (!refreshPromise) {
                    refreshPromise = axios
                        .post(`${API_BASE_URL}/token/refresh/`, { refresh: refreshToken })
                        .then((res) => {
                            const nuevoAccess = res.data.access;
                            setAccessToken(nuevoAccess);
                            if (res.data.request) {
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