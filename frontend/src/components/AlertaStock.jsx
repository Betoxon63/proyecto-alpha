import React from 'react';

const AlertaStock = ({ disponible, minimo }) => {
    const esCritico = disponible <= minimo;

    if (!esCritico) {
        return <span className='badge-ok'>Stock Normal</span>;
    }

    return (
        <span className='badge-critico'>Stock Crítico (Mín: {minimo})</span>
    );
};

export default AlertaStock;