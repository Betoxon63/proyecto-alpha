/**
 * Componente: ModalSelectorMotorIA
 * 
 * Propósito:
 * Permite al usuario elegir qué motor de Inteligencia Artificial desea utilizar
 * para la digitalización de documentos (Guías de Despacho y Facturas):
 *   1. Google Gemini (API en la Nube): Rápido (3-10s), alta precisión, sin consumo de hardware local.
 *   2. Ollama Local (Edge Vision): 100% offline y privado en el equipo (qwen2.5vl:3b).
 * 
 * Además ofrece selección directa entre capturar con la cámara del dispositivo móvil
 * o seleccionar un archivo desde el explorador del equipo.
 */

import React, { useState, useRef } from 'react';
import { Sparkles, Cloud, Cpu, Camera, Upload, X, Check, Zap, ShieldCheck } from 'lucide-react';

export default function ModalSelectorMotorIA({
    isOpen,
    onClose,
    onSeleccionarArchivoYMotor // (file, motor: 'gemini' | 'local')
}) {
    const [motorSeleccionado, setMotorSeleccionado] = useState('gemini'); // 'gemini' | 'local'
    const inputCamaraRef = useRef(null);
    const inputArchivoRef = useRef(null);

    if (!isOpen) return null;

    const manejarArchivo = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        onSeleccionarArchivoYMotor(file, motorSeleccionado);
        if (inputCamaraRef.current) inputCamaraRef.current.value = '';
        if (inputArchivoRef.current) inputArchivoRef.current.value = '';
        onClose();
    };

    return (
        <div className="compras-modal-overlay" style={{ zIndex: 1050 }}>
            <div 
                className="compras-modal-card" 
                style={{ 
                    maxWidth: '560px', 
                    width: '92vw', 
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)' 
                }}
            >
                {/* CABECERA */}
                <div 
                    style={{ 
                        background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)', 
                        color: '#ffffff', 
                        padding: '18px 24px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between' 
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '8px', borderRadius: '10px' }}>
                            <Sparkles size={22} color="#ffffff" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                                Digitalizar Documento con IA
                            </h3>
                            <p style={{ margin: '3px 0 0', fontSize: '13px', opacity: 0.9 }}>
                                Selecciona el motor de procesamiento para tu documento
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: '#ffffff', 
                            cursor: 'pointer', 
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Cerrar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* CUERPO: SELECCIÓN DE MOTOR */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                        ¿Qué motor de Inteligencia Artificial deseas utilizar?
                    </p>

                    {/* OPCIÓN 1: GOOGLE GEMINI (API) */}
                    <div
                        onClick={() => setMotorSeleccionado('gemini')}
                        style={{
                            border: motorSeleccionado === 'gemini' ? '2px solid #047857' : '1.5px solid #e2e8f0',
                            background: motorSeleccionado === 'gemini' ? '#f0fdf4' : '#ffffff',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            gap: '14px',
                            alignItems: 'center'
                        }}
                    >
                        <div 
                            style={{ 
                                width: '22px', 
                                height: '22px', 
                                borderRadius: '50%', 
                                border: motorSeleccionado === 'gemini' ? '6px solid #047857' : '2px solid #cbd5e1',
                                background: '#ffffff',
                                flexShrink: 0
                            }} 
                        />
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Cloud size={18} color="#047857" />
                                <strong style={{ fontSize: '15px', color: '#0f172a' }}>Google Gemini (API en la Nube)</strong>
                            </div>
                            <span 
                                style={{ 
                                    background: '#dcfce7', 
                                    color: '#15803d', 
                                    fontSize: '11px', 
                                    fontWeight: 700, 
                                    padding: '2px 8px', 
                                    borderRadius: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <Zap size={12} /> Recomendado
                            </span>
                        </div>
                    </div>

                    {/* OPCIÓN 2: OLLAMA LOCAL */}
                    <div
                        onClick={() => setMotorSeleccionado('local')}
                        style={{
                            border: motorSeleccionado === 'local' ? '2px solid #047857' : '1.5px solid #e2e8f0',
                            background: motorSeleccionado === 'local' ? '#f0fdf4' : '#ffffff',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            gap: '14px',
                            alignItems: 'center'
                        }}
                    >
                        <div 
                            style={{ 
                                width: '22px', 
                                height: '22px', 
                                borderRadius: '50%', 
                                border: motorSeleccionado === 'local' ? '6px solid #047857' : '2px solid #cbd5e1',
                                background: '#ffffff',
                                flexShrink: 0
                            }} 
                        />
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Cpu size={18} color="#475569" />
                                <strong style={{ fontSize: '15px', color: '#0f172a' }}>Ollama Local (Offline / qwen2.5vl:3b)</strong>
                            </div>
                            <span 
                                style={{ 
                                    background: '#f1f5f9', 
                                    color: '#475569', 
                                    fontSize: '11px', 
                                    fontWeight: 700, 
                                    padding: '2px 8px', 
                                    borderRadius: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <ShieldCheck size={12} /> 100% Offline
                            </span>
                        </div>
                    </div>

                    {/* INPUTS OCULTOS DE CÁMARA Y ARCHIVO */}
                    <input 
                        type="file" 
                        ref={inputCamaraRef} 
                        accept="image/*" 
                        capture="environment" 
                        style={{ display: 'none' }} 
                        onChange={manejarArchivo} 
                    />
                    <input 
                        type="file" 
                        ref={inputArchivoRef} 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={manejarArchivo} 
                    />

                    {/* BOTONES DE ACCIÓN PARA SUBIR / CAPTURAR */}
                    <div style={{ marginTop: '10px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => inputCamaraRef.current?.click()}
                            style={{
                                flex: 1,
                                minWidth: '180px',
                                background: '#047857',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '12px 16px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)'
                            }}
                        >
                            <Camera size={18} />
                            <span>Tomar Foto (Cámara)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => inputArchivoRef.current?.click()}
                            style={{
                                flex: 1,
                                minWidth: '180px',
                                background: '#ffffff',
                                color: '#047857',
                                border: '1.5px solid #047857',
                                borderRadius: '10px',
                                padding: '12px 16px',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <Upload size={18} />
                            <span>Subir Archivo / Imagen</span>
                        </button>
                    </div>
                </div>

                {/* PIE DEL MODAL */}
                <div 
                    style={{ 
                        background: '#f8fafc', 
                        padding: '12px 24px', 
                        borderTop: '1px solid #e2e8f0', 
                        display: 'flex', 
                        justifyContent: 'flex-end' 
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '6px 12px'
                        }}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
