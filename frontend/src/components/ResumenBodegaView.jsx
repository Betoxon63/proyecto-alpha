import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Tag, ClipboardList, ShoppingCart } from 'lucide-react';
import AlertaStock from './AlertaStock';

// Muestra el resumen visual de bodega: indicadores de existencias, top 5 urgentes y barras por categoría.
export default function ResumenBodegaView({
    articulos = [],
    categorias = [],
    usuario = null,
}) {
    const navigate = useNavigate();

    const rol = usuario?.rol;
    const puedeVerValorizacion = ['administracion', 'encargado_finanza'].includes(rol);
    const puedeSolicitar = ['administracion', 'encargado_bodega'].includes(rol);
    const puedeIrASolicitudes = ['administracion', 'encargado_bodega', 'encargado_finanza'].includes(rol);

    // Calcula los totales generales de existencias, alertas y valorización.
    const totalAgotados = articulos.filter((a) => Number(a.stock_disponible) <= 0).length;
    const totalStockBajo = articulos.filter(
        (a) => Number(a.stock_disponible) > 0 && Number(a.stock_disponible) <= Number(a.stock_minimo)
    ).length;
    const totalUnidadesFisicas = articulos.reduce(
        (acc, a) => acc + Number(a.stock_disponible || 0),
        0
    );
    const totalUnidadesComprometidas = articulos.reduce(
        (acc, a) => acc + Number(a.stock_comprometido || 0),
        0
    );
    const valorizacionTotal = articulos.reduce(
        (acc, a) => acc + Number(a.stock_disponible || 0) * Number(a.precio || 0),
        0
    );

    // Selecciona los 5 materiales más urgentes (primero agotados en 0 y luego los de menor saldo).
    const materialesUrgentes = articulos
        .filter((a) => Number(a.stock_disponible) <= Number(a.stock_minimo))
        .sort((a, b) => Number(a.stock_disponible) - Number(b.stock_disponible))
        .slice(0, 5);

    // Agrupa la cantidad de materiales, unidades y alertas por cada categoría.
    const resumenCategorias = categorias
        .map((cat) => {
            const listaCat = articulos.filter(
                (a) => Number(a.id_categoria) === Number(cat.id_categoria)
            );
            const unidadesCat = listaCat.reduce(
                (acc, a) => acc + Number(a.stock_disponible || 0),
                0
            );
            const alertasCat = listaCat.filter(
                (a) => Number(a.stock_disponible) <= Number(a.stock_minimo)
            ).length;
            return {
                id: cat.id_categoria,
                nombre: cat.nombre,
                cantidadArticulos: listaCat.length,
                unidades: unidadesCat,
                alertas: alertasCat,
                porcentaje:
                    articulos.length > 0
                        ? Math.round((listaCat.length / articulos.length) * 100)
                        : 0,
            };
        })
        .sort((a, b) => b.cantidadArticulos - a.cantidadArticulos);

    // Abre el módulo de Solicitudes con el material y la cantidad sugerida precargados.
    const solicitarMaterial = (art, cantidadSugerida) => {
        navigate('/solicitudes', {
            state: {
                abrirCrear: true,
                articuloId: art.id_articulo,
                cantidadSugerida: cantidadSugerida > 0 ? cantidadSugerida : 1,
            },
        });
    };

    return (
        <div className="catalogo-resumen-layout">
            {/* Tarjetas de resumen numérico de existencias */}
            <div className="catalogo-resumen-kpis">
                <div className="catalogo-kpi-card">
                    <div className="catalogo-kpi-label">Unidades Libres en Bodega</div>
                    <div className="catalogo-kpi-value">
                        {totalUnidadesFisicas.toLocaleString('es-CL')}
                    </div>
                    <div className="catalogo-kpi-sub">
                        Distribuidas en {articulos.length} materiales activos
                    </div>
                </div>

                <div className="catalogo-kpi-card">
                    <div className="catalogo-kpi-label">Unidades Reservadas (Obras)</div>
                    <div className="catalogo-kpi-value">
                        {totalUnidadesComprometidas.toLocaleString('es-CL')}
                    </div>
                    <div className="catalogo-kpi-sub">Comprometidas para faenas activas</div>
                </div>

                <div className="catalogo-kpi-card peligro">
                    <div className="catalogo-kpi-label">Materiales que Requieren Reposición</div>
                    <div className="catalogo-kpi-value">{totalAgotados + totalStockBajo}</div>
                    <div className="catalogo-kpi-sub">
                        {totalAgotados} agotados y {totalStockBajo} bajo mínimo
                    </div>
                </div>

                {puedeVerValorizacion && (
                    <div className="catalogo-kpi-card valorizacion">
                        <div className="catalogo-kpi-label">Valor Total en Inventario</div>
                        <div className="catalogo-kpi-value">
                            ${valorizacionTotal.toLocaleString('es-CL')}
                        </div>
                        <div className="catalogo-kpi-sub">Capital neto en existencias</div>
                    </div>
                )}
            </div>

            <div className="catalogo-resumen-grid">
                {/* Panel izquierdo: Top 5 materiales urgentes por reponer */}
                <div className="catalogo-resumen-card">
                    <div className="catalogo-resumen-card-header">
                        <div className="catalogo-resumen-title">
                            <AlertTriangle size={18} color="#dc2626" />
                            <span>Top 5 Materiales Urgentes por Reponer</span>
                        </div>
                        {puedeIrASolicitudes && (
                            <button
                                type="button"
                                onClick={() => navigate('/solicitudes')}
                                className="catalogo-resumen-link"
                            >
                                <ClipboardList size={14} />
                                <span>Ir a Solicitudes</span>
                            </button>
                        )}
                    </div>

                    {materialesUrgentes.length === 0 ? (
                        <div className="catalogo-empty">
                            Excelente: todos los materiales tienen stock por sobre su mínimo.
                        </div>
                    ) : (
                        <div className="catalogo-urgentes-list">
                            {materialesUrgentes.map((art) => {
                                const esAgotado = Number(art.stock_disponible) <= 0;
                                const sugerido =
                                    art.faltante_reposicion !== undefined
                                        ? Number(art.faltante_reposicion)
                                        : Math.max(
                                              0,
                                              Number(art.stock_minimo || 0) +
                                                  Number(art.stock_comprometido || 0) -
                                                  Number(art.stock_disponible || 0)
                                          );

                                return (
                                    <div
                                        key={art.id_articulo}
                                        className={`catalogo-urgente-item ${
                                            esAgotado ? 'agotado' : 'bajo'
                                        }`}
                                    >
                                        <div>
                                            <div className="catalogo-item-name">{art.nombre}</div>
                                            <div className="catalogo-item-unit">
                                                {art.ubicacion} · Mínimo: {art.stock_minimo}{' '}
                                                {art.unidad_nombre}
                                            </div>
                                        </div>

                                        <div className="catalogo-urgente-right">
                                            <AlertaStock
                                                disponible={art.stock_disponible}
                                                minimo={art.stock_minimo}
                                            />
                                            <div className="catalogo-urgente-acciones">
                                                {sugerido > 0 && (
                                                    <span className="catalogo-urgente-sugerido">
                                                        Sugerido: +{sugerido} {art.unidad_nombre}
                                                    </span>
                                                )}
                                                {puedeSolicitar && (
                                                    <button
                                                        type="button"
                                                        onClick={() => solicitarMaterial(art, sugerido)}
                                                        className="catalogo-btn-pedir"
                                                        title="Enviar solicitud de reposición a Finanzas"
                                                    >
                                                        <ShoppingCart size={12} />
                                                        <span>Pedir</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Panel derecho: Distribución del catálogo por categoría */}
                <div className="catalogo-resumen-card">
                    <div className="catalogo-resumen-card-header">
                        <div className="catalogo-resumen-title">
                            <Tag size={18} color="#116530" />
                            <span>Distribución por Categoría</span>
                        </div>
                        <span className="catalogo-count-label">{categorias.length} categorías</span>
                    </div>

                    {resumenCategorias.length === 0 ? (
                        <div className="catalogo-empty">No hay categorías registradas aún.</div>
                    ) : (
                        <div className="catalogo-barras-list">
                            {resumenCategorias.map((cat) => (
                                <div key={cat.id} className="catalogo-barra-item">
                                    <div className="catalogo-barra-top">
                                        <span className="catalogo-barra-nombre">{cat.nombre}</span>
                                        <span className="catalogo-barra-meta">
                                            {cat.cantidadArticulos}{' '}
                                            {cat.cantidadArticulos === 1 ? 'ítem' : 'ítems'} (
                                            {cat.porcentaje}%) · {cat.unidades} un.
                                        </span>
                                    </div>
                                    <div className="catalogo-barra-track">
                                        <div
                                            className="catalogo-barra-fill"
                                            style={{ width: `${cat.porcentaje}%` }}
                                        />
                                    </div>
                                    {cat.alertas > 0 && (
                                        <div className="catalogo-barra-alerta">
                                            {cat.alertas}{' '}
                                            {cat.alertas === 1
                                                ? 'material requiere reposición'
                                                : 'materiales requieren reposición'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
