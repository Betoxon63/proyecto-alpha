import React from 'react';

// Muestra una etiqueta de color según la cantidad disponible del material:
// - Rojo: Agotado (0 unidades).
// - Amarillo: Stock Bajo (igual o menor al mínimo definido).
// - Verde: Stock Normal (sobre el mínimo).
const AlertaStock = ({ disponible, minimo }) => {
    const cantidad = Number(disponible || 0);
    const limiteMinimo = Number(minimo || 0);

    if (cantidad <= 0) {
        return <span className="badge-agotado">Agotado (0)</span>;
    }

    if (cantidad <= limiteMinimo) {
        return <span className="badge-critico">Stock Bajo (Mín: {limiteMinimo})</span>;
    }

    return <span className="badge-ok">Stock Normal</span>;
};

export default AlertaStock;