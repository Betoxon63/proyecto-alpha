/**
 * @file FirmaTablet.jsx
 * @description Componente de captura de firma digital manuscrita en pantallas táctiles y tablets (HU-10, BPMN 4.4.1).
 * Implementa un lienzo HTML5 Canvas de alta precisión con soporte para eventos táctiles (Touch Events) y mouse.
 * 
 * BIBLIOTECAS UTILIZADAS:
 * - react: Hooks useRef, useState, useEffect para manipulación directa del contexto 2D del Canvas.
 * - lucide-react: Iconos vectoriales `PenTool`, `Check` y `RotateCcw` para herramientas de firma.
 * 
 * REGLAS DE NEGOCIO IMPLEMENTADAS:
 * - HU-10: Recepción conforme de insumos en faena mediante firma digitalizada del supervisor o técnico receptor.
 * - BPMN 4.4.1: Validación de entrega y custodia con generación de evidencia gráfica y timestamp.
 */

import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Check, RotateCcw } from 'lucide-react';

/**
 * Modal interactivo de firma digital táctil.
 * 
 * @component
 * @param {Object} props Propiedades del componente.
 * @param {Function} props.onConfirmarFirma Callback ejecutado al confirmar la firma con { firmaUrl, fecha, documento }.
 * @param {Function} [props.onCancelar] Callback para cerrar o cancelar el modal de firma.
 * @param {string} [props.documento] Número de guía de despacho o documento a respaldar (ej: 'GD-001540').
 * @param {string} [props.titulo] Título descriptivo visible en la cabecera del modal.
 */
const FirmaTablet = ({ onConfirmarFirma, onCancelar, documento = '', titulo = 'Firma Digital de Recepción Conforme' }) => {
    const canvasRef = useRef(null);
    const [dibujando, setDibujando] = useState(false);
    const [tieneTrazo, setTieneTrazo] = useState(false);

    // Inicialización del trazo y propiedades gráficas del contexto 2D
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    // Conversión de coordenadas de puntero (mouse o touch) respecto al viewport del canvas
    const obtenerCoordenadas = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    const iniciarTrazo = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const { x, y } = obtenerCoordenadas(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setDibujando(true);
        setTieneTrazo(true);
    };

    const trazar = (e) => {
        if (!dibujando) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const { x, y } = obtenerCoordenadas(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const terminarTrazo = () => {
        setDibujando(false);
    };

    const limpiar = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setTieneTrazo(false);
    };

    const confirmar = () => {
        const canvas = canvasRef.current;
        const dataUrl = tieneTrazo && canvas ? canvas.toDataURL('image/png') : null;
        onConfirmarFirma({
            firmaUrl: dataUrl,
            fecha: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            documento: documento
        });
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 120,
            padding: '16px'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                maxWidth: '460px',
                width: '100%',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                border: '1px solid #cbd5e1'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#dbeafe',
                        color: '#1d4ed8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <PenTool size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                            {titulo}
                        </h3>
                        {documento && (
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                Documento: <strong>{documento}</strong>
                            </span>
                        )}
                    </div>
                </div>

                <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '12px' }}>
                    Dibuje su firma con el dedo o puntero táctil en el recuadro para validar la recepción conforme.
                </p>

                <div style={{
                    border: '2px dashed #94a3b8',
                    borderRadius: '12px',
                    backgroundColor: '#f8fafc',
                    position: 'relative',
                    overflow: 'hidden',
                    marginBottom: '14px'
                }}>
                    <canvas
                        ref={canvasRef}
                        width={410}
                        height={160}
                        onMouseDown={iniciarTrazo}
                        onMouseMove={trazar}
                        onMouseUp={terminarTrazo}
                        onMouseLeave={terminarTrazo}
                        onTouchStart={iniciarTrazo}
                        onTouchMove={trazar}
                        onTouchEnd={terminarTrazo}
                        style={{ display: 'block', width: '100%', height: '160px', touchAction: 'none', cursor: 'crosshair' }}
                    />
                    {!tieneTrazo && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#94a3b8',
                            fontSize: '12px',
                            pointerEvents: 'none',
                            fontWeight: '600'
                        }}>
                            ✍️ Espacio para Firma Táctil
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                        type="button"
                        onClick={limpiar}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#475569',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}
                    >
                        <RotateCcw size={14} />
                        Limpiar
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {onCancelar && (
                            <button
                                type="button"
                                onClick={onCancelar}
                                style={{
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    color: '#64748b',
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }}
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={confirmar}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#116530',
                                border: 'none',
                                color: '#ffffff',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '700'
                            }}
                        >
                            <Check size={16} />
                            Confirmar Firma
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FirmaTablet;
