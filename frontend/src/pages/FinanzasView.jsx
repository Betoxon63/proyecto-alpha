import React, { useState, useEffect } from 'react';
import { Search, Download, Calendar } from 'lucide-react';
import { obtenerFacturas } from '../services_api/inventarioService';
import { exportarExcel } from '../utils/exportarExcel';
import '../styles/FinanzasView.css';

// Meses para filtrar.
const NOMBRES_MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Formatea la fecha (Ej: "2026-11" a "Noviembre 2026").
const formatearMes = (claveMes) => {
    const [anio, mes] = String(claveMes || '').split('-');
    const indice = Number(mes) - 1;
    if (!anio || indice < 0 || indice > 11) return claveMes;
    return `${NOMBRES_MESES[indice]} ${anio}`;
};

// Pantalla de resumen de gastos en facturas de compra.
export default function FinanzasView() {
    const [facturas, setFacturas] = useState([]);
    const [mesSeleccionado, setMesSeleccionado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // Consulta todas las facturas guardadas en el servidor.
    const cargarFacturas = async () => {
        setCargando(true);
        setErrorMsg('');
        try {
            const resFac = await obtenerFacturas();
            const lista = Array.isArray(resFac.data) ? resFac.data : [];

            const adaptadas = lista.map((f) => {
                const totalFac = Number(f.total || 0);
                const netoFac = Math.round(totalFac / 1.19);
                const ivaFac = totalFac - netoFac;
                const primerDetalle = f.detalles?.[0];
                const unidadTxt = primerDetalle?.unidad_nombre ? ` ${primerDetalle.unidad_nombre}` : 'x';
                const textoDetalle = primerDetalle
                    ? `${primerDetalle.cantidad}${unidadTxt} | ${primerDetalle.articulo_nombre}`
                    : f.observaciones || 'Compra de materiales';
                
                return {
                    id_factura: f.id_factura,
                    documento: `FAC-${f.numero_documento}`,
                    fecha: f.fecha_ingreso || '',
                    claveMes: String(f.fecha_ingreso || '').slice(0, 7),
                    proveedor: f.proveedor_nombre || 'Proveedor',
                    detalle: textoDetalle,
                    neto: netoFac,
                    iva: ivaFac,
                    total: totalFac,
                    estado: 'Registrada',
                };
            });

            setFacturas(adaptadas);
        } catch {
            setErrorMsg('No se pudo cargar el listado de facturas de compra.');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarFacturas();
    }, []);

    // Genera una lista de meses disponibles según las fechas de las facturas registradas.
    const mesesDisponibles = Array.from(
        new Set(facturas.map((f) => f.claveMes).filter((m) => m.length === 7))
    ).sort((a, b) => b.localeCompare(a));

    // Filtra las facturas por el mes elegido.
    const facturasFiltradas = facturas.filter((f) => {
        if (mesSeleccionado !== 'todos' && f.claveMes !== mesSeleccionado) {
            return false;
        }
        if (busqueda.trim() !== '') {
            const q = busqueda.toLowerCase();
            return (
                f.documento.toLowerCase().includes(q) ||
                f.proveedor.toLowerCase().includes(q) ||
                f.detalle.toLowerCase().includes(q) ||
                f.fecha.toLowerCase().includes(q)
            );
        }
        return true;
    });

    // Suma los totales de las facturas filtradas.
    const totalNeto = facturasFiltradas.reduce((acc, f) => acc + f.neto, 0);
    const totalIva = facturasFiltradas.reduce((acc, f) => acc + f.iva, 0);
    const totalGastos = facturasFiltradas.reduce((acc, f) => acc + f.total, 0);

    // Descarga las facturas visibles en un archivo Excel.
    const exportarFacturasExcel = async () => {
        await exportarExcel({
            nombreArchivo: `gastos_facturas_${mesSeleccionado}.xlsx`,
            nombreHoja: 'Gastos Facturas',
            titulo: 'Control de Gastos en Facturas de Compra',
            subtitulo: `Período: ${etiquetaPeriodo}`,
            columnas: [
                { header: 'N° Factura', key: 'documento', width: 15, alineacion: 'center' },
                { header: 'Fecha Emisión', key: 'fecha', width: 15, alineacion: 'center' },
                { header: 'Proveedor', key: 'proveedor', width: 32 },
                { header: 'Materiales / Detalle', key: 'detalle', width: 38 },
                { header: 'Valor Neto', key: 'neto', width: 16, formato: 'moneda' },
                { header: 'IVA (19%)', key: 'iva', width: 15, formato: 'moneda' },
                { header: 'Total Factura', key: 'total', width: 17, formato: 'moneda' },
                { header: 'Estado', key: 'estado', width: 14, alineacion: 'center' },
            ],
            filas: facturasFiltradas.map((f) => ({
                documento: f.documento,
                fecha: f.fecha,
                proveedor: f.proveedor,
                detalle: f.detalle,
                neto: Number(f.neto || 0),
                iva: Number(f.iva || 0),
                total: Number(f.total || 0),
                estado: f.estado,
            })),
            filaTotales: {
                detalle: `TOTALES (${etiquetaPeriodo.toUpperCase()})`,
                neto: totalNeto,
                iva: totalIva,
                total: totalGastos,
            },
        });
    };

    const etiquetaPeriodo = mesSeleccionado === 'todos' ? 'Acumulado total' : formatearMes(mesSeleccionado);

    return (
        <div className="finanzas-container">
            {errorMsg && <div className="alerta-error">{errorMsg}</div>}

            {/* Tarjetas de resumen de gastos según el período seleccionado */}
            <div className="finanzas-cards-grid-3">
                <div className='finanzas-metric-card'>
                    <div className='finanzas-metric-label'>TOTAL NETO EN MATERIALES</div>
                    <div className='finanzas-metric-val-main'>
                        ${totalNeto.toLocaleString('es-CL')}
                    </div>
                    <div className='finanzas-metric-subtext-green'>
                        Compras con descuentos aplicados
                    </div>
                </div>

                <div className='finanzas-metric-card'>
                    <div className='finanzas-metric-label'>CRÉDITO FISCAL (IVA 19%)</div>
                    <div className='finanzas-metric-val-muted'>
                        ${totalIva.toLocaleString('es-CL')}
                    </div>
                    <div className='finanzas-metric-subtext'>
                        IVA recuperable | {etiquetaPeriodo}
                    </div>
                </div>

                <div className='finanzas-metric-card-highlight'>
                    <div className='finanzas-metric-label-green'>TOTAL GASTOS ({etiquetaPeriodo.toUpperCase()})</div>
                    <div className='finanzas-metric-val-total'>
                        ${totalGastos.toLocaleString('es-CL')}
                    </div>
                    <div className='finanzas-metric-subtext-green'>
                        {facturasFiltradas.length}{' '}
                        {facturasFiltradas.length === 1 ? 'factura registrada' : 'facturas registradas'}
                    </div>
                </div>
            </div>

            {/* Tabla principal */}
            <div className='finanzas-table-card'>
                <div className='finanzas-toolbar'>
                    <div className='finanzas-toolbar-left'>
                        <div className='finanzas-search-box'>
                            <Search size={15} color='#64748b' />
                            <input
                                type='text'
                                maxLength={80}
                                placeholder='Buscar por N° factura, proveedor o material...'
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className='finanzas-search-input'
                            />
                        </div>

                        <div className='finanzas-period-box'>
                            <Calendar size={15} color='#64748b' />
                            <select value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)} className='finanzas-period-select' aria-label='Filtrar gastos por mes'>
                                <option value="todos">Todos los períodos</option>
                                {mesesDisponibles.map((mes) => (
                                    <option key={mes} value={mes}>
                                        {formatearMes(mes)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className='finanzas-toolbar-right'>
                        <span className='finanzas-table-meta'>
                            {facturasFiltradas.length} facturas mostradas
                        </span>
                        <button type='button' onClick={exportarFacturasExcel} disabled={facturasFiltradas.length === 0} className='finanzas-btn-export'>
                            <Download size={14} />
                            <span>Exportar Excel</span>
                        </button>
                    </div>
                </div>

                <div className='finanzas-table-scroll'>
                    <table className='finanzas-table'>
                        <thead>
                            <tr className='finanzas-thead-tr'>
                                <th className='finanzas-th'>N° Factura</th>
                                <th className='finanzas-th'>Fecha Emisión</th>
                                <th className='finanzas-th'>Proveedor</th>
                                <th className='finanzas-th'>Materiales / Detalle</th>
                                <th className='finanzas-th-right'>Valor Neto</th>
                                <th className='finanzas-th-right'>IVA (19%)</th>
                                <th className='finanzas-th-right'>Total Factura</th>
                                <th className='finanzas-th-center'>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cargando ? (
                                <tr>
                                    <td colSpan={8} className='finanzas-empty-row'>
                                        Cargando facturas registradas...
                                    </td>
                                </tr>
                            ) : facturasFiltradas.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className='finanzas-empty-row'>
                                        No hay facturas registradas para los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                facturasFiltradas.map((f) => (
                                    <tr key={f.id_factura} className='finanzas-tr'>
                                        <td className='finanzas-td-mono'>{f.documento}</td>
                                        <td className='finanzas-td-muted'>{f.fecha}</td>
                                        <td className='finanzas-td-bold'>{f.proveedor}</td>
                                        <td className='finanzas-td-normal'>{f.detalle}</td>
                                        <td className='finanzas-td-right'>
                                            ${f.neto.toLocaleString('es-CL')}
                                        </td>
                                        <td className='finanzas-td-right-muted'>
                                            ${f.iva.toLocaleString('es-CL')}
                                        </td>
                                        <td className='finanzas-td-total'>
                                            ${f.total.toLocaleString('es-CL')}
                                        </td>
                                        <td className='finanzas-td-center'>
                                            <span className='finanzas-status-badge paid'>
                                                {f.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}