

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

export const INITIAL_PRODUCTS = [];

export function generateInitialMovements() {
  return [];
}

