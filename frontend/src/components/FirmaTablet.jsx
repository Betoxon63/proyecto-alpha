import React, { useRef, useState, useEffect } from "react";
import { PenTool, Check, RotateCcw } from 'lucide-react';
import '../styles/FirmaTablet.css'

const FirmaTablet = ({onConfirmarFirma, onCancelar, documento='', titulo='Firma Digital de Recepción Conforme',}) => {
    const canvasRef = useRef(null);
    const [dibujando, setDibujando] = useState(false);
    const [tieneTrazo, setTieneTrazo] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const obtenerCoordenadas = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
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
            documento,
        });
    };

    return (
        <div className="firma-modal-backdrop">
            <div className="firma-modal-card">
                <div className="firma-modal-header">
                    <div className="firma-icon-box">
                        <PenTool size={20} />
                    </div>
                    <div>
                        <h3 className="firma-modal-title">{titulo}</h3>
                        {documento && (
                            <span className="firma-modal-doc">Documento: <strong>{documento}</strong></span>
                        )}
                    </div>
                </div>

                <p className="firma-modal-instructions">Dibuje su firma con el dedo o puntero táctil en el recuadro para validar la recepción conforme.</p>

                <div className="firma-canvas-wrapper">
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
                        className="firma-canvas"
                    />
                    {!tieneTrazo && (
                        <div className="firma-canvas-placeholder">Espacio para Firma Táctil</div>
                    )}
                </div>

                <div className="firma-modal-footer">
                    <button type="button" onClick={limpiar} className="firma-btn-clear">
                        <RotateCcw size={14} />
                        <span>Limpiar</span>
                    </button>

                    <div className="firma-actions-right">
                        {onCancelar && (
                            <button type="button" onClick={onCancelar} className="firma-btn-cancel">Cancelar</button>
                        )}
                        <button type="button" onClick={confirmar} className="firma-btn-confirm">
                            <Check size={16} />
                            <span>Confirmar Firma</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FirmaTablet;