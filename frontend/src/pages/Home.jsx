import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoEmpresa from '../assets/logo.png';

export const Home = () => {
    const navigate = useNavigate();

    return (
        <div
            style={{
                minHeight: '100vh',
                backgroundColor: '#f4f7f6',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <header
                style={{
                    backgroundColor: '#115e2a',
                    color: '#ffffff',
                    padding: '12px 32px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img
                        src={logoEmpresa}
                        alt="Logo JG Frío y Agroindustria"
                        style={{
                            height: '44px',
                            width: 'auto',
                            backgroundColor: '#ffffff',
                            borderRadius: '6px',
                            padding: '3px',
                        }}
                    />
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '18px', lineHeight: '1.2' }}>
                            FYAG SpA
                        </div>
                        <div style={{ fontSize: '12px', color: '#d1e7dd' }}>
                            Frío y Agroindustria Ltda.
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/login')}
                    style={{
                        backgroundColor: '#ffffff',
                        color: '#115e2a',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 20px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'transform 0.15s ease, background-color 0.2s ease',
                    }}
                    onMouseOver={(e) => (e.target.style.backgroundColor = '#e9f5ee')}
                    onMouseOut={(e) => (e.target.style.backgroundColor = '#ffffff')}
                >
                    Acceder a la Intranet
                </button>
            </header>

            {/* Contenido Principal */}
            <main
                style={{
                    flex: 1,
                    maxWidth: '1050px',
                    width: '100%',
                    margin: '0 auto',
                    padding: '48px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                }}
            >
                {/* Encabezado de sección */}
                <div style={{ marginBottom: '28px', textAlign: 'center' }}>
                    <h1
                        style={{
                            fontSize: '28px',
                            fontWeight: '800',
                            color: '#111827',
                            margin: '0 0 8px 0',
                            letterSpacing: '0.5px',
                        }}
                    >
                        BIENVENIDO A JG FRÍO Y AGROINDUSTRIA
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '15px', margin: 0 }}>
                        Refrigeración industrial, proyectos y servicio técnico en Chillán y todo el país
                    </p>
                </div>

                {/* Tarjeta blanca principal (estilo idéntico a las cards del sistema) */}
                <div
                    style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '14px',
                        padding: '36px 40px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                        border: '1px solid #e5e7eb',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            marginBottom: '24px',
                            paddingBottom: '20px',
                            borderBottom: '1px solid #f0f2f5',
                        }}
                    >
                        <img
                            src={logoEmpresa}
                            alt="Logo corporativo"
                            style={{ height: '56px', width: 'auto' }}
                        />
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', color: '#115e2a', fontWeight: '700' }}>
                                Nuestra Empresa
                            </h2>
                            <span style={{ fontSize: '13px', color: '#6b7280' }}>
                                35 años de trayectoria en el sector agroindustrial
                            </span>
                        </div>
                    </div>

                    <div style={{ fontSize: '15.5px', lineHeight: '1.75', color: '#374151' }}>
                        <p style={{ marginBottom: '18px' }}>
                            <strong style={{ color: '#111827' }}>FRIO Y AGROINDUSTRIA LTDA.</strong> Es la
                            continuación de una empresa familiar que, durante sus 35 años de experiencia,
                            ha desarrollado e implementado proyectos, servicio técnico y contratos de
                            mantención en diferentes áreas de la agroindustria, a distintas compañías e
                            instituciones.
                        </p>

                        <p style={{ marginBottom: '18px' }}>
                            La calidad de nuestros productos y servicios ha sido respaldada y avalada por
                            nuestros clientes en todos los años de existencia de nuestra empresa, lo que
                            nos convierte en una de las más consolidadas en el área de la refrigeración
                            industrial.
                        </p>

                        <p style={{ marginBottom: '18px' }}>
                            Contamos con el personal técnico, de ventas y administrativo idóneo que nos
                            permite ofrecer un excelente servicio además de soluciones adecuadas a cada
                            una de las necesidades y requerimientos de nuestros clientes logrando de esta
                            manera su satisfacción total.
                        </p>

                        <p style={{ marginBottom: '32px' }}>
                            Contamos con infraestructura de 541 mt2, y con vehículos que nos permite
                            llegar en forma rápida a todos los sectores dentro y fuera de la ciudad de
                            Chillán.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};