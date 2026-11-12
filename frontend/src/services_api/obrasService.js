import api from './axiosConfig'; 

export const obraService = {
    getAll: async () => {
        const response = await api.get('/obras/');
        return response.data;
    },
    create: async (data) => {
        const response = await api.post('/obras/', data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/obras/${id}/`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/obras/${id}/`);
        return response.data;
    }
};