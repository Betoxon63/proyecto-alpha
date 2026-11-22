import React, { useEffect, useState } from 'react';
import api from '../services_api/axiosConfig';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export const BodegaDashboard = () => {
    const [stats, setStats] = useState({ ingresos: [], egresos: [] });
    const [error, setError] = useState('');

    useEffect(() => {
        const cargarEstadisticas = async () => {
            try {
                const response = await api.get('/cardex/estadisticas_mes/');
                setStats({
                    ingresos: response.data.ingresos || [],
                    egresos: response.data.egresos || [],
                });
            } catch (err) {
                console.error("Error al cargar estadísticas:", err);
                setError('No se pudo cargar la información del dashboard.');
            }
        };

        cargarEstadisticas();
    }, []);


    const dataIngresos = {
        labels: stats.ingresos.map((item) => item.articulo),
        datasets: [
            {
                label: 'Unidades Ingresadas',
                data: stats.ingresos.map((item) => item.total),
                backgroundColor: 'rgba(40, 167, 69, 0.75)',
                borderColor: 'rgba(40, 167, 69, 1)',
                borderWidth: 1,
            },
        ],
    };


    const dataEgresos = {
        labels: stats.egresos.map((item) => item.articulo),
        datasets: [
            {
                label: 'Unidades Egresadas',
                data: stats.egresos.map((item) => item.total),
                backgroundColor: 'rgba(220, 53, 69, 0.75)',
                borderColor: 'rgba(220, 53, 69, 1)',
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { stepSize: 1 } 
            }
        }
    };

    return (
        <div className="contenedor-vista">
            <h2>Dashboard</h2>
            <p className="subtitulo-vista">Movimientos de artículos en los últimos 30 días</p>

            {error && <div className="alerta-error">{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', marginTop: '20px' }}>
                <div className="card-formulario" style={{ background: '#fff', padding: '20px', borderRadius: '8px' }}>
                    <h3>Ingresos por Artículo</h3>
                    {stats.ingresos.length > 0 ? (
                        <Bar data={dataIngresos} options={options} />
                    ) : (
                        <p style={{ color: '#666', marginTop: '15px' }}>No hay ingresos registrados en los últimos 30 días.</p>
                    )}
                </div>

                <div className="card-formulario" style={{ background: '#fff', padding: '20px', borderRadius: '8px' }}>
                    <h3>Egresos por Artículo</h3>
                    {stats.egresos.length > 0 ? (
                        <Bar data={dataEgresos} options={options} />
                    ) : (
                        <p style={{ color: '#666', marginTop: '15px' }}>No hay egresos registrados en los últimos 30 días.</p>
                    )}
                </div>
            </div>
        </div>
    );
};