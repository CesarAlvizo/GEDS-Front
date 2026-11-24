

export const INITIAL_CATEGORIES = [];

export const INITIAL_UNITS = [
  'Pieza',
  'Caja',
  'Paquete',
  'Kilogramo',
  'Gramo',
  'Litro',
  'Metro'
];

export const INITIAL_PROVIDERS = [];

export const INITIAL_CLIENTS = [];

export const INITIAL_USERS = [
  { id: 1, username: 'admin', nombre: 'Administrador General', rol: 'ADMIN', activo: true },
  { id: 2, username: 'farmacia_sj', nombre: 'Farmacia San José', rol: 'ADMIN', activo: true },
  { id: 3, username: 'ferre_roble', nombre: 'Ferretería El Roble', rol: 'ADMIN', activo: true }
];

export const INITIAL_PRODUCTS = [
  // Farmacia San José (usuario_id: 2)
  { id: 101, usuario_id: 2, codigo: 'MED-001', nombre: 'Paracetamol 500mg', desc: 'Caja con 20 tabletas', categoria: 'Medicamentos', unidad: 'Caja', costo: 18.5, precio: 35.0, stock: 150, min: 40, activo: true },
  { id: 102, usuario_id: 2, codigo: 'MED-002', nombre: 'Amoxicilina 500mg', desc: 'Caja con 12 cápsulas', categoria: 'Medicamentos', unidad: 'Caja', costo: 45.0, precio: 85.0, stock: 65, min: 20, activo: true },
  { id: 103, usuario_id: 2, codigo: 'MED-003', nombre: 'Alcohol Etílico 70% 500ml', desc: 'Antiséptico en botella', categoria: 'Limpieza', unidad: 'Pieza', costo: 22.0, precio: 42.0, stock: 12, min: 25, activo: true },
  { id: 104, usuario_id: 2, codigo: 'MED-004', nombre: 'Cubrebocas Tricapa', desc: 'Caja con 50 piezas', categoria: 'Limpieza', unidad: 'Caja', costo: 35.0, precio: 65.0, stock: 80, min: 30, activo: true },
  { id: 105, usuario_id: 2, codigo: 'MED-005', nombre: 'Ibuprofeno 400mg', desc: 'Caja con 10 cápsulas', categoria: 'Medicamentos', unidad: 'Caja', costo: 28.0, precio: 52.0, stock: 95, min: 30, activo: true },

  // Ferretería El Roble (usuario_id: 3)
  { id: 201, usuario_id: 3, codigo: 'FER-010', nombre: 'Taladro Percutor 650W', desc: 'Mandril de 1/2 pulgada', categoria: 'Herramientas', unidad: 'Pieza', costo: 650.0, precio: 999.0, stock: 14, min: 5, activo: true },
  { id: 202, usuario_id: 3, codigo: 'FER-011', nombre: 'Juego de Destornilladores', desc: 'Kit de 6 piezas cromo vanadio', categoria: 'Herramientas', unidad: 'Pieza', costo: 110.0, precio: 189.0, stock: 4, min: 10, activo: true },
  { id: 203, usuario_id: 3, codigo: 'FER-012', nombre: 'Tornillo para Madera 2"', desc: 'Caja de 100 piezas', categoria: 'Herramientas', unidad: 'Caja', costo: 40.0, precio: 75.0, stock: 220, min: 50, activo: true },
  { id: 204, usuario_id: 3, codigo: 'FER-013', nombre: 'Disco de Corte Metal 4-1/2"', desc: 'Extra fino 1mm', categoria: 'Herramientas', unidad: 'Pieza', costo: 15.0, precio: 32.0, stock: 350, min: 80, activo: true },
  { id: 205, usuario_id: 3, codigo: 'FER-014', nombre: 'Pintura Blanca Vinílica 19L', desc: 'Cubeta acabado mate', categoria: 'Limpieza', unidad: 'Pieza', costo: 780.0, precio: 1250.0, stock: 18, min: 8, activo: true }
];

export function generateInitialMovements() {
  return [
    // Movimientos Farmacia San José
    { id: 1001, usuario_id: 2, fecha: '2026-11-20', pid: 101, tipo: 'E', cant: 200, motivo: 'Compra a proveedor', obs: 'Lote FAR-2026-A' },
    { id: 1002, usuario_id: 2, fecha: '2026-11-21', pid: 101, tipo: 'S', cant: 50, motivo: 'Venta', obs: 'Ticket #1021' },
    { id: 1003, usuario_id: 2, fecha: '2026-11-21', pid: 102, tipo: 'E', cant: 80, motivo: 'Compra a proveedor', obs: 'Distribuidora Médica' },
    { id: 1004, usuario_id: 2, fecha: '2026-11-22', pid: 102, tipo: 'S', cant: 15, motivo: 'Venta', obs: 'Ticket #1045' },
    { id: 1005, usuario_id: 2, fecha: '2026-11-22', pid: 103, tipo: 'E', cant: 30, motivo: 'Ajuste autorizado', obs: 'Reposición' },

    // Movimientos Ferretería El Roble
    { id: 2001, usuario_id: 3, fecha: '2026-11-18', pid: 201, tipo: 'E', cant: 20, motivo: 'Compra a proveedor', obs: 'Factura FER-882' },
    { id: 2002, usuario_id: 3, fecha: '2026-11-19', pid: 201, tipo: 'S', cant: 6, motivo: 'Venta', obs: 'Obra Las Américas' },
    { id: 2003, usuario_id: 3, fecha: '2026-11-20', pid: 203, tipo: 'E', cant: 300, motivo: 'Compra a proveedor', obs: 'Insumos Industriales' },
    { id: 2004, usuario_id: 3, fecha: '2026-11-21', pid: 203, tipo: 'S', cant: 80, motivo: 'Venta', obs: 'Carpintería Moderna' },
    { id: 2005, usuario_id: 3, fecha: '2026-11-22', pid: 204, tipo: 'E', cant: 400, motivo: 'Compra a proveedor', obs: 'Aceros del Bajío' }
  ];
}

