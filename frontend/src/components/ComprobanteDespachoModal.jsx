import React from "react";
import { Printer, X, CheckCircle } from "lucide-react";

// Limpia símbolos especiales antes de mostrar texto en la hoja de impresión.
const escaparTexto = (valor) => String(valor ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Ventana emergente para revisar e imprimir el comprobante de un despacho emitido.
export default function ComprobanteDespachoModal({ comprobante, onClose }) {
    if (!comprobante) return null;

    // Abre una vista lista para imprimir o guardar como PDF.
    const imprimirComprobante = () => {
        const ventana = window.open('', '_blank', 'width=760,height=680');
        if (!ventana) return;

        const bloqueFirma = comprobante.firmaUrl
            ? `<img src="${comprobante.firmaUrl}" alt="Firma de recepción" style="max-height:85px;border-bottom:1px solid #334155;padding-bottom:4px;" />
               <div style="font-size:11px;color:#475569;margin-top:4px;">Firmado digitalmente a las ${escaparTexto(comprobante.firmaHora)}</div>`
            : `<div style="height:60px;border-bottom:1px solid #334155;width:220px;margin:0 auto 6px;"></div>
               <div style="font-size:11px;color:#475569;">Firma de recepción conforme</div>`;
        
        ventana.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8" />
                <title>Comprobante ${escaparTexto(comprobante.guia)}</title>
                <style>
                    body { font-family: Arial, sans-serif; color: #0f172a; margin: 28px; }
                    .top { display: flex; justify-content: space-between; border-bottom: 2px solid #116530; padding-bottom: 12px; margin-bottom: 18px; }
                    .brand { font-size: 20px; font-weight: 800; color: #116530; }
                    .sub { font-size: 12px; color: #475569; }
                    .doc { text-align: right; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 18px; font-size: 13px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 13px; }
                    th { background: #f1f5f9; text-align: left; padding: 10px; border: 1px solid #cbd5e1; }
                    td { padding: 10px; border: 1px solid #cbd5e1; }
                    .firmas { display: flex; justify-content: space-around; text-align: center; margin-top: 34px; }
                    .firma-col { width: 42%; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="top">
                    <div>
                        <div class="brand">Frío y Agroindustria SpA (FYAG)</div>
                        <div class="sub">Arturo Prat 152, Chillán · Comprobante de Entrega de Bodega</div>
                    </div>
                    <div class="doc">
                        <strong>Guía: ${escaparTexto(comprobante.guia)}</strong><br />
                        <span class="sub">Fecha: ${escaparTexto(comprobante.fecha)}</span>
                    </div>
                </div>

                <div class="grid">
                    <div><strong>Obra:</strong> ${escaparTexto(comprobante.obraNombre)}</div>
                    <div><strong>Cliente:</strong> ${escaparTexto(comprobante.cliente)}</div>
                    <div><strong>Entregado por:</strong> ${escaparTexto(comprobante.entregadoPor)}</div>
                    <div><strong>Recibido por:</strong> ${escaparTexto(comprobante.tecnicoReceptor)}</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Material / Repuesto</th>
                            <th>Cantidad Entregada</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>${escaparTexto(comprobante.articuloCodigo)}</td>
                            <td>${escaparTexto(comprobante.articuloNombre)}</td>
                            <td><strong>${escaparTexto(comprobante.cantidad)} ${escaparTexto(comprobante.unidad)}</strong></td>
                        </tr>
                    </tbody>
                </table>

                <div class="firmas">
                    <div class="firma-col">
                        <div style="height:60px;border-bottom:1px solid #334155;width:220px;margin:0 auto 6px;"></div>
                        <strong>${escaparTexto(comprobante.entregadoPor)}</strong><br />
                        <span class="sub">Entrega Bodega FYAG</span>
                    </div>
                    <div class="firma-col">
                        ${bloqueFirma}
                        <strong>${escaparTexto(comprobante.tecnicoReceptor)}</strong>
                    </div>
                </div>
            </body>
            </html>
        `);
        ventana.document.close();
        ventana.focus();
        ventana.print();
    };

    return (
        <div className="despachos-modal-overlay">
            <div className="despachos-modal-card">
                <div className="despachos-modal-header">
                    <div className="despachos-modal-title">
                        <CheckCircle size={18} />
                        <span>Comprobante de Despacho | {comprobante.guia}</span>
                    </div>
                    <button type="button" onClick={onClose} className="despachos-modal-close">
                        <X size={18} />
                    </button>
                </div>

                <div className="despachos-modal-body">
                    <div className="despachos-comprobante-grid">
                        <div>
                            <small>Obra de Destino</small>
                            <strong>{comprobante.obraNombre}</strong>
                        </div>
                        <div>
                            <small>Fecha y Hora</small>
                            <strong>{comprobante.fecha}</strong>
                        </div>
                        <div>
                            <small>Entregado por</small>
                            <strong>{comprobante.entregadoPor}</strong>
                        </div>
                        <div>
                            <small>Recibido por</small>
                            <strong>{comprobante.tecnicoReceptor}</strong>
                        </div>
                    </div>

                    <div className="despachos-comprobante-item">
                        <div>
                            <div className="despachos-item-name">{comprobante.articuloNombre}</div>
                            <div className="despachos-item-meta">Cód: {comprobante.articuloCodigo}</div>
                        </div>
                        <div className="despachos-item-qty">
                            {comprobante.cantidad} {comprobante.unidad}
                        </div>
                    </div>

                    {comprobante.firmaUrl && (
                        <div className="despachos-comprobante-firma">
                            <small>Firma digital capturada ({comprobante.firmaHora})</small>
                            <img src={comprobante.firmaUrl} alt="Firma de recepción" />
                        </div>
                    )}

                    <div className="despachos-modal-actions">
                        <button type="button" onClick={onClose} className="despachos-btn-cancel">Cerrar</button>
                        <button type="button" onClick={imprimirComprobante} className="despachos-btn-print">
                            <Printer size={15} />
                            <span>Imprimir / Guardar PDF</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
