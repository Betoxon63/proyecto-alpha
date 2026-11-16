import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, Building2, FileSpreadsheet, ArrowDownLeft, ArrowUpRight, AlertTriangle, UserCheck, Search, Download, Calendar } from "lucide-react";
import { obtenerCardex, obtenerObras } from "../services_api/obrasService";
import '../styles/TablaCardex.css';

// Nombres de los cargos.
const CARGOS = {
    administracion: 'Administrador General',
    soporte_ti: 'Soporte Técnico',
    encargado_bodega: 'Encargado de Bodega',
    encargado_finanza: 'Encargado de Finanzas',
    supervisor_obra: 'Supervisor de Obra',
}

export default function TablaCardex({ cardexInicial = null, obrasInicial = null }) {
    const [movimientos, setMovimientos] = useState(cardexInicial || []);
    const [obras, setObras] = useState(obrasInicial || []);
    const [tipoFiltro, setTipoFiltro] = useState('Todos');
    const [obraFiltro, setObraFiltro] = useState('Todas');
    const [fechaFiltro, setFechaFiltro] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Carga todos los registros de movimientos y cambios desde el servidor.
    useEffect(() => {
        if (cardexInicial) {
            setMovimientos(cardexInicial);
            if (obrasInicial) setObras(obrasInicial);
            return;
        }

        setCargando(true);
        setErrorMsg('');
        Promise.all([obtenerCardex(), obtenerObras()]).then(([dataCardex, dataObras]) => {
                setMovimientos(Array.isArray(dataCardex) ? dataCardex : []);
                setObras(Array.isArray(dataObras) ? dataObras : []);
            }).catch(() => {
                setErrorMsg('No se pudo cargar el historial de movimientos.');
            }).finally(() => setCargando(false));
    }, [cardexInicial, obrasInicial]);

    // Filtra los registros según el botón seleccionado (Entradas, Salidas, Mermas o Personal).
    const filtrados = movimientos.filter((item) => {
        const tipo = (item.tipo_movimiento || '').toLowerCase();
        if (tipoFiltro === 'Entradas' && !tipo.includes('entrada') && !tipo.includes('ingreso')) return false;
        if (tipoFiltro === 'Salidas' && !tipo.includes('salida') && !tipo.includes('egreso')) return false;
        if (tipoFiltro === 'Mermas' && !tipo.includes('merma')) return false;
        if (tipoFiltro === 'Obras' && !tipo.includes('obra')) return false;
        if (tipoFiltro === 'Personal' && !tipo.includes('usuario')) return false;

        if (obraFiltro !== 'Todas') {
            const destino = item.obra_destino || 'Bodega Central';
            if (!destino.toLowerCase().includes(obraFiltro.toLowerCase())) return false;
        }

        if (fechaFiltro.trim() !== '') {
            const fechaTexto = item.fecha_hora || item.fecha || '';
            if (!fechaTexto.includes(fechaFiltro)) return false;
        }

        if (busqueda.trim() !== '') {
            const q = busqueda.toLowerCase();
            const match =
                (item.articulo_nombre && item.articulo_nombre.toLowerCase().includes(q)) ||
                (item.articulo_codigo && String(item.articulo_codigo).toLowerCase().includes(q)) ||
                (item.id_movimiento && String(item.id_movimiento).toLowerCase().includes(q)) ||
                (item.motivo && item.motivo.toLowerCase().includes(q)) ||
                (item.usuario_responsable && item.usuario_responsable.toLowerCase().includes(q));
            if (!match) return false;
        }
        return true;
    });

    // Descarga una plantilla compatible con Excel con los movimientos visibles en pantalla.
    const exportarPlantilla = () => {
        const encabezados = [
            'Codigo Registro',
            'Fecha y Hora',
            'Realizado Por',
            'Elemento / Seccion',
            'Cantidad',
            'Tipo de Accion',
            'Area o Destino',
            'Detalle del Registro',
        ];

        const filas = filtrados.map((m) => [
            m.id_movimiento || `REG-${m.id_movimiento_articulo}`,
            m.fecha_hora || m.fecha,
            `"${m.usuario_responsable || ''}"`,
            `"${m.articulo_nombre || ''}"`,
            m.cantidad,
            m.tipo_movimiento || '',
            `"${m.obra_destino || 'Bodega Central'}"`,
            `"${m.motivo || m.documento_respaldo || ''}"`,
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [encabezados.join(','), ...filas.map((e) => e.join(','))].join('\n');
        const link = document.createElement('a');
        link.setAttribute('href', encodedURI(csvContent));
        link.setAttribute('download', `historial_fyag_${new Date().toISOString().substring(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="cardex-container">
            <div className="cardex-header">
                <div>
                    <h1 className="cardex-title">Historial General de Movimientos</h1>
                    <p className="cardex-subtitle">
                        Registro completo de entradas, salidas a obras, mermas y modificaciones en cuentas del personal
                    </p>
                </div>

                <button type="button" onClick={exportarPlantilla} className="cardex-btn-export">
                    <Download size={15} />
                    <span>Descargar Planilla</span>
                </button>
            </div>

            {errorMsg && <div className="alerta-error">{errorMsg}</div>}

            <div className="cardex-banner-append">
                <div className="cardex-banner-info">
                    <div className="cardex-banner-icon">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <div className="cardex-banner-title">Historial permanente y protegido</div>
                        <div className="cardex-banner-desc">
                            Por seguridad de la empresa, ningún movimiento registrado puede borrarse. Cualquier ajuste queda anotado como un nuevo registro.
                        </div>
                    </div>
                </div>

                <div className="cardex-badge-readonly">
                    <Lock size={14} />
                    <span>Registro seguro</span>
                </div>
            </div>

            {/* Filtro de búsqueda */}
            <div className="cardex-filters-card">
                <div className="cardex-filters-grid">
                    <div>
                        <label className="cardex-filters-label">Buscar en el Historial</label>
                        <div className="cardex-input-box">
                            <Search size={16} color="#64748b" />
                            <input
                                type="text"
                                placeholder="Material, trabajador, RUT o detalle..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="cardex-filter-input"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="cardex-filters-label">Filtrar por Fecha</label>
                        <div className="cardex-input-box">
                            <Search size={16} color="#64748b" />
                            <input
                                type="text"
                                placeholder="Ej: 12/11/2026"
                                value={fechaFiltro}
                                onChange={(e) => setFechaFiltro(e.target.value)}
                                className="cardex-filter-input"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="cardex-filters-label">Área o Destino</label>
                        <div className="cardex-input-box">
                            <Building2 size={16} color="#64748b" />
                            <select
                                value={obraFiltro}
                                onChange={(e) => setObraFiltro(e.target.value)}
                                className="cardex-filter-select"
                            >
                                <option value="Todas">Todas las áreas</option>
                                <option value="Bodega Central">Bodega Central</option>
                                <option value="Administración / TI">Administración / TI</option>
                                {obras.map((o) => {
                                    const idObra = o.id_obra || o.id;
                                    const nombreObra = o.nombre || `Obra #${idObra}`;
                                    return (
                                        <option key={idObra} value={nombreObra}>{nombreObra}</option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    <div className="cardex-filter-types-wrapper">
                        <label className="cardex-filters-label">Tipo de Registro</label>
                        <div className="cardex-type-group">
                            {['Todos', 'Entradas', 'Salidas', 'Mermas', 'Obras', 'Personal'].map((tipo) => (
                                <button
                                    key={tipo}
                                    type="button"
                                    onClick={() => setTipoFiltro(tipo)}
                                    className={`cardex-type-btn ${tipoFiltro === tipo ? 'active' : ''}`}
                                >{tipo}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabla de registros */}
            <div className="cardex-table-card">
                <div className="cardex-table-header">
                    <div className="cardex-table-header-left">
                        <span className="cardex-table-title">Registros del Sistema</span>
                        <span className="cardex-count-badge">{filtrados.length} movimientos</span>
                    </div>

                    <div className="cardex-table-order">
                        <FileSpreadsheet size={14} />
                        <span>Ordenados del más reciente al más antiguo</span>
                    </div>
                </div>

                <div className="cardex-table-scroll">
                    <table className="cardex-table">
                        <thead>
                            <tr>
                                <th>N° Registro</th>
                                <th>Fecha y Hora</th>
                                <th>Realizado Por</th>
                                <th>Material o Sección</th>
                                <th className="text-right">Cantidad</th>
                                <th className="text-center">Tipo de Acción</th>
                                <th>Área / Destino</th>
                                <th>Detalle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cargando ? (
                                <tr>
                                    <td colSpan={8} className="cardex-table-empty">Cargando historial de movimientos...</td>
                                </tr>
                            ) : filtrados.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="cardex-table-empty">
                                        No se encontraron registros con los filtros seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                filtrados.map((mov, idx) => {
                                    const tipoTexto = mov.tipo_movimiento || 'Movimiento';
                                    const esUsuario = tipoTexto.toLowerCase().includes('usuario');
                                    const esMerma = tipoTexto.toLowerCase().includes('merma');
                                    const esEntrada =
                                        !esUsuario &&
                                        (tipoTexto.toLowerCase().includes('entrada') ||
                                            tipoTexto.toLowerCase().includes('ingreso') ||
                                            mov.cantidad > 0);
                                    
                                    const claseCantidad = esUsuario
                                        ? 'cardex-qty entrada'
                                        : esMerma
                                        ? 'cardex-qty merma'
                                        : esEntrada
                                        ? 'cardex-qty entrada'
                                        : 'cardex-qty salida';
                                    
                                    const claseBadge = esUsuario
                                        ? 'cardex-mov-badge entrada'
                                        : esMerma
                                        ? 'cardex-mov-badge merma'
                                        : esEntrada
                                        ? 'cardex-mov-badge entrada'
                                        : 'cardex-mov-badge salida';
                                    
                                    return (
                                        <tr key={mov.id_movimiento_articulo || mov.id_movimiento || idx}>
                                            <td className="cardex-td-id">
                                                {mov.id_movimiento || `REG-${mov.id_movimiento_articulo}`}
                                            </td>
                                            <td className="cardex-td-date">
                                                {mov.fecha_hora || mov.fecha || 'Reciente'}
                                            </td>
                                            <td>
                                                <div className="cardex-td-bold">{mov.usuario_responsable || 'Trabajador'}</div>
                                                <div className="cardex-td-sub">{CARGOS[mov.cargo] || mov.cargo || 'Operaciones'}</div>
                                            </td>
                                            <td>
                                                <div className="cardex-td-bold">{mov.articulo_nombre}</div>
                                                <div className="cardex-td-sub">{mov.articulo_codigo} {mov.articulo_detalle || 'General'}</div>
                                            </td>
                                            <td className={claseCantidad}>
                                                {esUsuario ? '1 cuenta' : `${mov.cantidad > 0 ? `+${mov.cantidad}` : mov.cantidad} ${mov.unidad_medida || 'un'}`}
                                            </td>
                                            <td className="text-center">
                                                <span className={claseBadge}>
                                                    {esUsuario ? (
                                                        <UserCheck size={12} />
                                                    ) : esMerma ? (
                                                        <AlertTriangle size={12} />
                                                    ) : esEntrada ? (
                                                        <ArrowDownLeft size={12} />
                                                    ) : (
                                                        <ArrowUpRight size={12} />
                                                    )}
                                                    <span>{tipoTexto}</span>
                                                </span>
                                            </td>
                                            <td className="cardex-td-destino">{mov.obra_destino || 'Bodega Central'}</td>
                                            <td>
                                                <span className="cardex-doc-chip">{mov.motivo || mov.documento_respaldo || 'Sin detalle'}</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="cardex-footer-note">
                    <div className="cardex-footer-lock">
                        <Lock size={13} />
                        <span>Todos los movimientos y cambios quedan respaldados automáticamente</span>
                    </div>
                    <span>Frío y Agroindustria SpA</span>
                </div>
            </div>
        </div>
    );
}