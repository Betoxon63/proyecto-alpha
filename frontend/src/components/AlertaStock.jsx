import React from 'react';

// Muestra una etiqueta verde si hay suficiente stock o amarilla si llegó al mínimo recomendado.
const AlertaStock = ({ disponible, minimo }) => {
    const esCritico = Number(disponible) <= Number(minimo);

    if (!esCritico) {
        return <span className='badge-ok'>Stock Normal</span>;
    }

    return (
        <span className='badge-critico'>Stock Bajo (Mín: {minimo})</span>
    );
};

export default AlertaStock;