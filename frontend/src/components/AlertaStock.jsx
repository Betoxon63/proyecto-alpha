/**
 * @file AlertaStock.jsx
 * @description Badge visual preventivo para el indicador de stock crítico (HU-03).
 * Muestra una insignia reactiva 'Stock Normal' o 'Stock Crítico' si `disponible <= minimo`.
 */

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