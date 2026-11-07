// Datos iniciales de catálogo, obras y movimientos de Cardex alineados al informe del Proyecto Alpha (FYAG SpA)

export const INITIAL_ARTICULOS = [
  {
    id_articulo: 1,
    codigo_barra: "780123456789",
    codigo_interno: "CU-012",
    nombre: "Tubo de cobre 1/2\"",
    categoria: "Tuberías e Insumos",
    unidad_medida: "Metros lineales",
    ubicacion: "Pasillo B - Estante 3",
    stock_disponible: 48,
    stock_minimo: 20,
    stock_comprometido: 10,
    precio: 8500,
  },
  {
    id_articulo: 2,
    codigo_barra: "780987654321",
    codigo_interno: "GAS-410",
    nombre: "Gas Refrigerante R-410a",
    categoria: "Gases Refrigerantes",
    unidad_medida: "Cilindro (11.3 kg)",
    ubicacion: "Sector Gases - Zona A",
    stock_disponible: 18,
    stock_minimo: 8,
    stock_comprometido: 4,
    precio: 95000,
  },
  {
    id_articulo: 3,
    codigo_barra: "780456789123",
    codigo_interno: "CMP-5HP",
    nombre: "Compresor Maneurop 5HP",
    categoria: "Equipos y Motores",
    unidad_medida: "Unidad",
    ubicacion: "Bodega de Alto Valor",
    stock_disponible: 2, // Stock crítico (<= stock_minimo)
    stock_minimo: 3,
    stock_comprometido: 1,
    precio: 850000,
  },
  {
    id_articulo: 4,
    codigo_barra: "780789123456",
    codigo_interno: "VLV-DAN",
    nombre: "Válvula Expansión Danfoss",
    categoria: "Válvulas y Controles",
    unidad_medida: "Unidad",
    ubicacion: "Pasillo C - Cajón 12",
    stock_disponible: 4, // Stock crítico
    stock_minimo: 5,
    stock_comprometido: 0,
    precio: 65000,
  },
  {
    id_articulo: 5,
    codigo_barra: "780321654987",
    codigo_interno: "OIL-POE1",
    nombre: "Aceite Sintético POE 1L",
    categoria: "Lubricantes",
    unidad_medida: "Litro",
    ubicacion: "Sector Químicos - Estante 1",
    stock_disponible: 15,
    stock_minimo: 6,
    stock_comprometido: 2,
    precio: 22000,
  },
  {
    id_articulo: 6,
    codigo_barra: "780654987321",
    codigo_interno: "FLT-DHR",
    nombre: "Filtro Deshidratador 3/8\"",
    categoria: "Filtros y Repuestos",
    unidad_medida: "Unidad",
    ubicacion: "Pasillo C - Cajón 04",
    stock_disponible: 1, // Stock crítico
    stock_minimo: 6,
    stock_comprometido: 0,
    precio: 14500,
  }
];

export const INITIAL_OBRAS = [
  { id: 1, nombre: "Cámara Frío AgroChillán", codigo: "OBRA-2026-01", cliente: "Agrícola del Sur S.A.", ubicacion: "Chillán Viejo" },
  { id: 2, nombre: "Planta Frigorífica Olmué", codigo: "OBRA-2026-02", cliente: "Frigoríficos Olmué SpA", ubicacion: "San Carlos" },
  { id: 3, nombre: "Packing Arándanos Ñuble", codigo: "OBRA-2026-03", cliente: "Exportadora Ñuble Fruit", ubicacion: "Bulnes" },
  { id: 4, nombre: "Mantención Frío San Nicolás", codigo: "OBRA-2026-04", cliente: "Agropecuaria Central", ubicacion: "San Nicolás" }
];

export const INITIAL_PROVEEDORES = [
  { id: 1, rut: "76.432.198-5", razon_social: "Refrigeración Industrial Chile Ltda.", giro: "Venta de insumos de frío", ciudad: "Concepción" },
  { id: 2, rut: "77.109.845-2", razon_social: "Danfoss Chile SpA", giro: "Válvulas y controles automáticos", ciudad: "Santiago" },
  { id: 3, rut: "78.223.441-K", razon_social: "Gases y Refrigerantes del Biobío", giro: "Distribución de gases R-410a y R-134a", ciudad: "Chillán" }
];

export const INITIAL_CARDEX = [
  {
    id_movimiento: "MOV-008542",
    fecha_hora: "2026-10-17 14:32",
    usuario_responsable: "Carlos Muñoz",
    cargo: "Bodeguero",
    articulo_nombre: "Gas Refrigerante R-410a",
    articulo_codigo: "GAS-410",
    articulo_detalle: "(11.3 kg)",
    cantidad: 10,
    unidad_medida: "cil",
    tipo_movimiento: "Entrada",
    obra_destino: "Bodega Central",
    documento_respaldo: "OC-002184",
    motivo: "Recepción de compra proveedor Gases del Biobío"
  },
  {
    id_movimiento: "MOV-008541",
    fecha_hora: "2026-10-17 14:18",
    usuario_responsable: "María González",
    cargo: "Jefa Bodega",
    articulo_nombre: "Compresor Maneurop 5HP",
    articulo_codigo: "CMP-5HP",
    articulo_detalle: "Refrigeración Industrial",
    cantidad: -2,
    unidad_medida: "un",
    tipo_movimiento: "Salida",
    obra_destino: "Cámara Frío AgroChillán",
    documento_respaldo: "GD-001536",
    motivo: "Despacho solicitado por supervisor para cámara de manzanas"
  },
  {
    id_movimiento: "MOV-008540",
    fecha_hora: "2026-10-17 13:56",
    usuario_responsable: "Carlos Muñoz",
    cargo: "Bodeguero",
    articulo_nombre: "Tubo de Cobre Flexible 1/2\"",
    articulo_codigo: "CU-012",
    articulo_detalle: "(15m)",
    cantidad: -3,
    unidad_medida: "m",
    tipo_movimiento: "Merma",
    obra_destino: "Bodega Central",
    documento_respaldo: "MR-000092",
    motivo: "Tramo de tubo aplastado durante la descarga. No es apto para instalación."
  },
  {
    id_movimiento: "MOV-008539",
    fecha_hora: "2026-10-17 12:41",
    usuario_responsable: "Javier Soto",
    cargo: "Encargado Obra",
    articulo_nombre: "Válvula Expansión Danfoss",
    articulo_codigo: "VLV-DAN",
    articulo_detalle: "Refrigeración Industrial",
    cantidad: -4,
    unidad_medida: "un",
    tipo_movimiento: "Salida",
    obra_destino: "Planta Frigorífica Olmué",
    documento_respaldo: "GD-001535",
    motivo: "Instalación en túnel de congelado rápido"
  },
  {
    id_movimiento: "MOV-008538",
    fecha_hora: "2026-10-17 11:25",
    usuario_responsable: "María González",
    cargo: "Jefa Bodega",
    articulo_nombre: "Aceite Sintético POE 1L",
    articulo_codigo: "OIL-POE1",
    articulo_detalle: "Refrigeración Industrial",
    cantidad: 15,
    unidad_medida: "L",
    tipo_movimiento: "Entrada",
    obra_destino: "Bodega Central",
    documento_respaldo: "OC-002181",
    motivo: "Reposición de stock mensual de lubricante"
  }
];
