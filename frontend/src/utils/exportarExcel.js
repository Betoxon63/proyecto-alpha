import ExcelJS from 'exceljs';

// Calcula el alto aproximado de cada fila.
const calcularAltoFila = (fila, columnas) => {
    let maxLineas = 1;
    columnas.forEach((col) => {
        const texto = String(fila[col.key] ?? '');
        const ancho = Math.max(10, (col.width || 18) - 2);
        const lineas = texto.split('\n').reduce((acc, parte) => acc + Math.max(1, Math.ceil(parte.length / ancho)), 0);
        if (lineas > maxLineas) maxLineas = lineas;
    });
    return Math.min(90, Math.max(22, maxLineas * 15 + 6));
};

// Genera y descarga un archivo Excel.
export async function exportarExcel({ nombreArchivo, nombreHoja = 'Reporte', titulo, subtitulo = '', columnas = [], filas = [], filaTotales = null, }) {
    if (!columnas.length) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FYAG SpA';
    workbook.created = new Date();

    const hoja = workbook.addWorksheet(nombreHoja.slice(0, 31), {
        views: [{ state: 'frozen', ySplit: 4 }],
    });

    const totalCols = columnas.length;

    // Configura los anchos de cada columna.
    columnas.forEach((col, idx) => {
        hoja.getColumn(idx + 1).width = col.width || 18;
    });

    // Banner principal con el nombre de la empresa y del reporte.
    const filaTitulo = hoja.getRow(1);
    filaTitulo.getCell(1).value = `FRÍO Y AGROINDUSTRIA SpA (FYAG) - ${titulo}`;
    hoja.mergeCells(1, 1, 1, totalCols);
    filaTitulo.height = 30;
    filaTitulo.getCell(1).font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    filaTitulo.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF116530' } };
    filaTitulo.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // Fecha de emisión, cantidad de registros y filtros aplicados.
    const fechaEmision = new Date().toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
    const textoSubtitulo = [
        `Emitido: ${fechaEmision}`,
        `Registros: ${filas.length}`,
        subtitulo,
    ].filter(Boolean).join('   |   ');

    const filaSub = hoja.getRow(2);
    filaSub.getCell(1).value = textoSubtitulo;
    hoja.mergeCells(2, 1, 2, totalCols);
    filaSub.height = 22;
    filaSub.getCell(1).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF065F46' } };
    filaSub.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
    filaSub.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

    // Espacio visual antes de la tabla.
    hoja.getRow(3).height = 8;

    // Encabezados de la tabla con filtro automático.
    const filaHeader = hoja.getRow(4);
    filaHeader.height = 26;
    columnas.forEach((col, idx) => {
        const celda = filaHeader.getCell(idx + 1);
        celda.value = col.header;
        celda.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
        celda.alignment = {
            vertical: 'middle',
            horizontal: col.alineacion || (col.formato === 'moneda' || col.formato === 'numero' ? 'right' : 'left'),
            wrapText: true,
        };
        celda.border = {
            top: { style: 'thin', color: { argb: 'FF116530' } },
            bottom: { style: 'medium', color: { argb: 'FF0D4F25' } },
            left: { style: 'thin', color: { argb: 'FF166534' } },
            right: { style: 'thin', color: { argb: 'FF166534' } },
        };
    });

    // Filas de datos con sombreado alternado y bordes suaves.
    const bordeDato = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' }},
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' }},
        left: { style: 'thin', color: { argb: 'FFE2E8F0' }},
        right: { style: 'thin', color: { argb: 'FFE2E8F0' }},
    };

    filas.forEach((registro, idxFila) => {
        const row = hoja.getRow(5 + idxFila);
        const esPar = idxFila % 2 === 1;
        row.height = calcularAltoFila(registro, columnas);

        columnas.forEach((col, idxCol) => {
            const celda = row.getCell(idxCol + 1);
            const valor = registro[col.key];
            celda.value = valor ?? '';
            celda.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF0F172A' } };
            celda.border = bordeDato;

            if (esPar) {
                celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }

            if (col.formato === 'moneda' && typeof valor === 'number') {
                celda.numFmt = '"$"#,##0';
                celda.alignment = { vertical: 'middle', horizontal: 'right' };
            } else if (col.formato === 'numero' && typeof valor === 'number') {
                celda.numFmt = '#,##0';
                celda.alignment = { vertical: 'middle', horizontal: col.alineacion || 'right' };
            } else {
                celda.alignment = {
                    vertical: 'middle',
                    horizontal: col.alineacion || 'left',
                    wrapText: true,
                };
            }
        });
    });

    // Fila opcional de totales al final del reporte.
    if (filaTotales) {
        const rowTotal = hoja.getRow(5 + filas.length);
        rowTotal.height = 25;
        columnas.forEach((col, idxCol) => {
            const celda = rowTotal.getCell(idxCol + 1);
            const valor = filaTotales[col.key];
            celda.value = valor !== undefined ? valor : '';
            celda.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF14532D' } };
            celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
            celda.border = {
                top: { style: 'medium', color: { argb: 'FF116530' } },
                bottom: { style: 'medium', color: { argb: 'FF116530' } },
                left: { style: 'thin', color: { argb: 'FFBBF7D0' } },
                right: { style: 'thin', color: { argb: 'FFBBF7D0' } },
            };

            if (col.formato === 'moneda' && typeof valor === 'number') {
                celda.numFmt = '"$"#,##0';
                celda.alignment = { vertical: 'middle', horizontal: 'right' };
            } else if (col.formato === 'numero' && typeof valor === 'number') {
                celda.numFmt = '#,##0';
                celda.alignment = { vertical: 'middle', horizontal: col.alineacion || 'right' };
            } else {
                celda.alignment = { vertical: 'middle', horizontal: col.alineacion || 'left' };
            }
        });
    }

    // Activa autofiltros en los encabezados de la tabla.
    hoja.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4, column: totalCols },
    };

    // Genera el archivo y descarga el excel.
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo.endsWith('.xlsx') ? nombreArchivo : `${nombreArchivo}.xlsx`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
}
