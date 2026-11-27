import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, Building2, FileSpreadsheet, ArrowDownLeft, ArrowUpRight, AlertTriangle, UserCheck, Search, Download, Calendar, RotateCcw, ClipboardList, FileText, Boxes, Filter } from "lucide-react";
import { obtenerCardex, obtenerObras } from "../services_api/obrasService";
import { obtenerUsuarioActual } from "../services_api/authService";
import '../styles/TablaCardex.css';

// Nombres de los cargos.
const CARGOS = {
    administracion: 'Administrador General',
    soporte_ti: 'Soporte Técnico',
    encargado_bodega: 'Encargado de Bodega',
    encargado_finanza: 'Encargado de Finanzas',
    supervisor_obra: 'Supervisor de Obra',
}

// Protege cada celda antes de guardarla en una planilla CSV.
const limpiarCeldaCSV = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;

// Convierte la fecha.
const convertirFecha = (iso) => {
    const partes = String(iso || '').split('-');
    if (partes.length !== 3) return '';
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

// Determina su un registro corresponde a un movimiento físico de stock o a un aviso administrativo.
const esRegistroInventario = (mov) => {
    if (mov.grupo) return mov.grupo === 'Inventario';
    const tipo = (mov.tipo_movimiento || '').toLowerCase();
    return Boolean(
        mov.id_articulo && (tipo.includes('entrada') || tipo.includes('salida') || tipo.includes('merma') || tipo.includes('devoluci'))
    );
};

// Pantalla principal del historial de movimientos.
export default function TablaCardex({ usuario = null, cardexInicial = null, obrasInicial = null }) {
    const sesion = usuario || obtenerUsuarioActual();
    const esBodega = sesion?.rol === 'encargado_bodega';

    const [movimientos, setMovimientos] = useState(cardexInicial || []);
    const [obras, setObras] = useState(obrasInicial || []);
    const [grupoFiltro, setGrupoFiltro] = useState('Todos');
    const [tipoFiltro, setTipoFiltro] = useState('Todos');
    const [obraFiltro, setObraFiltro] = useState('Todas');
    const [fechaFiltro, setFechaFiltro] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Carga el historial de movimientos y la lista de obras desde el servidor.
    useEffect(() => {
        if (cardexInicial) {
            setMovimientos(cardexInicial);
            if (obrasInicial) setObras(obrasInicial);
            return;
        }

        setCargando(true);
        setErrorMsg('');
        Promise.all([obtenerCardex(), obtenerObras().catch(() => [])]).then(([dataCardex, dataObras]) => {
                setMovimientos(Array.isArray(dataCardex) ? dataCardex : []);
                setObras(Array.isArray(dataObras) ? dataObras : []);
            }).catch(() => {
                setErrorMsg('No se pudo cargar el historial de movimientos.');
            }).finally(() => setCargando(false));
    }, [cardexInicial, obrasInicial]);

    const totalInventario = movimientos.filter((m) => esRegistroInventario(m)).length;
    const totalAuditoria = movimientos.length - totalInventario;

    const cambiarGrupo = (nuevoGrupo) => {
        setGrupoFiltro(nuevoGrupo);
        setTipoFiltro('Todos');
    };

    // Botones de filtro por tipo según rol.
    const opcionesTipo = (() => {
        const opcionesInventario = [
            { valor: 'Entradas', etiqueta: 'Entradas de Stock' },
            { valor: 'Salidas', etiqueta: 'Salidas a Obras' },
            { valor: 'Mermas', etiqueta: 'Mermas Justificadas' },
            { valor: 'Devoluciones', etiqueta: 'Devoluciones' },
        ];
        const opcionesAuditoria = [
            { valor: 'Solicitudes', etiqueta: 'Solicitudes y Compras' },
            { valor: 'Obras', etiqueta: 'Obras y Servicios' },
            { valor: 'Catálogo', etiqueta: 'Catálogo, Categorías y Unidades' },
            { valor: 'Entidades', etiqueta: 'Clientes y Proveedores' },
            ...(!esBodega ? [{ valor: 'Personal', etiqueta: 'Cuentas de Personal' }] : []),
        ];

        if (grupoFiltro === 'Inventario') {
            return [{ valor: 'Todos', etiqueta: 'Todos los movimientos' }, ...opcionesInventario];
        }
        if (grupoFiltro === 'Administración') {
            return [{ valor: 'Todos', etiqueta: 'Toda la auditoría' }, ...opcionesAuditoria];
        }
        return [
            { valor: 'Todos', etiqueta: 'Todos los tipos' },
            ...opcionesInventario,
            ...opcionesAuditoria,
        ];
    })();

    // Aplica todos los filtros activos sobre los registros cargados.
    const filtrados = movimientos.filter((item) => {
        const esInv = esRegistroInventario(item);
        if (grupoFiltro === 'Inventario' && !esInv) return false;
        if (grupoFiltro === 'Administración' && esInv) return false;

        const tipo = (item.tipo_movimiento || '').toLowerCase();
        if (tipoFiltro === 'Entradas' && !tipo.includes('entrada') && !tipo.includes('ingreso')) return false;
        if (tipoFiltro === 'Salidas' && !tipo.includes('salida') && !tipo.includes('egreso')) return false;
        if (tipoFiltro === 'Mermas' && !tipo.includes('merma')) return false;
        if (tipoFiltro === 'Devoluciones' && !tipo.includes('devoluci')) return false;
        if (tipoFiltro === 'Solicitudes' && !tipo.includes('solicitud') && !tipo.includes('compra')) return false;
        if (tipoFiltro === 'Obras' && !tipo.includes('obra') && !tipo.includes('servicio')) return false;
        if (
            tipoFiltro === 'Catálogo' &&
            !tipo.includes('artículo') &&
            !tipo.includes('categoría') &&
            !tipo.includes('unidad')
        ) {
            return false;
        }
        if (tipoFiltro === 'Entidades' && !tipo.includes('cliente') && !tipo.includes('proveedor')) return false;
        if (tipoFiltro === 'Personal' && !tipo.includes('usuario')) return false;

        if (obraFiltro !== 'Todas') {
            if (obraFiltro.startsWith('obra:')) {
                const idBuscado = Number(obraFiltro.replace('obra:', ''));
                const coincideId = item.id_obra && Number(item.id_obra) === idBuscado;
                const coincideTexto = (item.obra_destino || '').includes(`Obra #${idBuscado}`);
                if (!coincideId && !coincideTexto) return false;
            } else {
                const destino = (item.obra_destino || 'Bodega Central').toLowerCase();
                if (!destino.includes(obraFiltro.toLowerCase())) return false;
            }
        }

        if (fechaFiltro) {
            const fechaLocal = convertirFecha(fechaFiltro);
            const textoFecha = item.fecha_hora || item.fecha || '';
            if (!textoFecha.includes(fechaLocal) && !textoFecha.includes(fechaFiltro)) return false;
        }

        if (busqueda.trim() !== '') {
            const q = busqueda.toLowerCase();
            const coincide =
                (item.articulo_nombre && item.articulo_nombre.toLowerCase().includes(q)) ||
                (item.articulo_codigo && String(item.articulo_codigo).toLowerCase().includes(q)) ||
                (item.id_movimiento && String(item.id_movimiento).toLowerCase().includes(q)) ||
                (item.motivo && item.motivo.toLowerCase().includes(q)) ||
                (item.usuario_responsable && item.usuario_responsable.toLowerCase().includes(q));
            if (!coincide) return false;
        }
        return true;
    });

    // Descarga en una plantilla compatible con Excel los registros actualmente visibles.
    const exportarPlantilla = () => {
        const encabezados = [
            'Codigo Registro',
            'Fecha y Hora',
            'Realizado Por',
            'Grupo',
            'Elemento / Seccion',
            'Cantidad',
            'Tipo de Accion',
            'Área o Destino',
            'Detalle del Registro',
        ];

        const filas = filtrados.map((m) => [
            limpiarCeldaCSV(m.id_movimiento || `REG-${m.id_movimiento_articulo}`),
            limpiarCeldaCSV(m.fecha_hora || m.fecha || ''),
            limpiarCeldaCSV(m.usuario_responsable || ''),
            limpiarCeldaCSV(esRegistroInventario(m) ? 'Inventario' : 'Administración'),
            limpiarCeldaCSV(m.articulo_nombre || ''),
            esRegistroInventario(m) ? m.cantidad : 0,
            limpiarCeldaCSV(m.tipo_movimiento || ''),
            limpiarCeldaCSV(m.obra_destino || 'Bodega Central'),
            limpiarCeldaCSV(m.motivo || m.documento_respaldo || ''),
        ]);

        const contenido = '\uFEFF' + [encabezados.join(','), ...filas.map((e) => e.join(','))].join('\n');
        const archivo = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(archivo);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `historial_fyag_${new Date().toLocaleDateString('en-CA')}.csv`;
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="cardex-container">
            <div className="cardex-header">
                <div>
                    <h1 className="cardex-title">Historial General de Movimientos</h1>
                    <p className="cardex-subtitle">
                        Registro completo e inalterable de movimientos de bodega y auditoría del sistema
                    </p>
                </div>

                <button type="button" onClick={exportarPlantilla} disabled={filtrados.length === 0} className="cardex-btn-export">
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

            <div className="cardex-tabs-bar">
                <button type="button" onClick={() => cambiarGrupo('Todos')} className={`cardex-tab-item ${grupoFiltro === 'Todos' ? 'active' : ''}`}>
                    <FileSpreadsheet size={15} />
                    <span>Todos los Registros</span>
                    <span className="cardex-tab-count">{movimientos.length}</span>
                </button>

                <button type="button" onClick={() => cambiarGrupo('Inventario')} className={`cardex-tab-item ${grupoFiltro === 'Inventario' ? 'active' : ''}`}>
                    <Boxes size={15} />
                    <span>Movimientos de Inventario</span>
                    <span className="cardex-tab-count">{totalInventario}</span>
                </button>

                <button type="button" onClick={() => cambiarGrupo('Administración')} className={`cardex-tab-item ${grupoFiltro === 'Administración' ? 'active' : ''}`}>
                    <FileText size={15} />
                    <span>Auditoría del Sistema</span>
                    <span className="cardex-tab-count">{totalAuditoria}</span>
                </button>
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
                                maxLength={80}
                                placeholder="Material, trabajador, código o detalle..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="cardex-filter-input"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="cardex-filters-label">Filtrar por Fecha</label>
                        <div className="cardex-input-box">
                            <Calendar size={16} color="#64748b" />
                            <input
                                type="date"
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
                            <select value={obraFiltro} onChange={(e) => setObraFiltro(e.target.value)} className="cardex-filter-select">
                                <option value="Todas">Todas las áreas</option>
                                <option value="Bodega Central">Bodega Central</option>
                                <option value="Administración">Administración</option>
                                {obras.map((o) => {
                                    const idObra = o.id_obra || o.id;
                                    const nombreObra = o.nombre || `Obra #${idObra}`;
                                    return (
                                        <option key={idObra} value={`obra:${idObra}`}>
                                            {nombreObra}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="cardex-filters-label">Tipo de Registro</label>
                        <div className="cardex-input-box">
                            <Filter size={16} color="#64748b" />
                            <select
                                value={tipoFiltro}
                                onChange={(e) => setTipoFiltro(e.target.value)}
                                className="cardex-filter-select"
                            >
                                {opcionesTipo.map((op) => (
                                    <option key={op.valor} value={op.valor}>
                                        {op.etiqueta}
                                    </option>
                                ))}
                            </select>
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
                                    <td colSpan={8} className="cardex-table-empty">
                                        Cargando historial de movimientos...
                                    </td>
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
                                    const tipoLower = tipoTexto.toLowerCase();
                                    const esInv = esRegistroInventario(mov);
                                    const esUsuario = tipoLower.includes('usuario');
                                    const esSolicitud = tipoLower.includes('solicitud') || tipoLower.includes('compra');
                                    const esMerma = tipoLower.includes('merma');
                                    const esDevolucion = tipoLower.includes('devoluci');
                                    const esEntrada = esInv && Number(mov.cantidad) > 0;

                                    let claseCantidad = 'cardex-qty admin';
                                    let claseBadge = 'cardex-mov-badge admin';
                                    let icono = <FileText size={12} />;

                                    if (!esInv) {
                                        if (esUsuario) icono = <UserCheck size={12} />;
                                        else if (esSolicitud) icono = <ClipboardList size={12} />;
                                    } else if (esMerma) {
                                        claseCantidad = 'cardex-qty merma';
                                        claseBadge = 'cardex-mov-badge merma';
                                        icono = <AlertTriangle size={12} />;
                                    } else if (esDevolucion) {
                                        claseCantidad = esEntrada ? 'cardex-qty entrada' : 'cardex-qty salida';
                                        claseBadge = 'cardex-mov-badge devolucion';
                                        icono = <RotateCcw size={12} />;
                                    } else if (esEntrada) {
                                        claseCantidad = 'cardex-qty entrada';
                                        claseBadge = 'cardex-mov-badge entrada';
                                        icono = <ArrowDownLeft size={12} />;
                                    } else {
                                        claseCantidad = 'cardex-qty salida';
                                        claseBadge = 'cardex-mov-badge salida';
                                        icono = <ArrowUpRight size={12} />;
                                    }

                                    return (
                                        <tr key={mov.id_movimiento_articulo || mov.id_movimiento || idx}>
                                            <td className="cardex-td-id">
                                                {mov.id_movimiento || `REG-${mov.id_movimiento_articulo}`}
                                            </td>
                                            <td className="cardex-td-date">
                                                {mov.fecha_hora || mov.fecha || 'Reciente'}
                                            </td>
                                            <td>
                                                <div className="cardex-td-bold">
                                                    {mov.usuario_responsable || 'Trabajador'}
                                                </div>
                                                <div className="cardex-td-sub">
                                                    {CARGOS[mov.cargo] || mov.cargo || 'Operaciones'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="cardex-td-bold">{mov.articulo_nombre}</div>
                                                <div className="cardex-td-sub">
                                                    {mov.articulo_codigo} · {mov.articulo_detalle || 'General'}
                                                </div>
                                            </td>
                                            <td className={claseCantidad}>
                                                {esInv
                                                    ? `${mov.cantidad > 0 ? `+${mov.cantidad}` : mov.cantidad} ${
                                                          mov.unidad_medida || 'un'
                                                      }`
                                                    : '—'}
                                            </td>
                                            <td className="text-center">
                                                <span className={claseBadge}>
                                                    {icono}
                                                    <span>{tipoTexto}</span>
                                                </span>
                                            </td>
                                            <td className="cardex-td-destino">
                                                {mov.obra_destino || 'Bodega Central'}
                                            </td>
                                            <td>
                                                <span className="cardex-doc-chip">
                                                    {mov.motivo || mov.documento_respaldo || 'Sin detalle'}
                                                </span>
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