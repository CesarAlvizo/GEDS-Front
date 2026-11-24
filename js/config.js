

export const CONFIG = {
  APP: {
    name: 'GEDS',
    fullName: 'Sistema Web de Gestión y Control de Inventario',
    institution: 'Instituto Tecnológico de Aguascalientes',
    version: '1.0.0',
    date: '10/11/2026',
    legend: 'GEDS · Sistema Web de Gestión y Control de Inventario · Instituto Tecnológico de Aguascalientes'
  },
  // Si se corre en servidor local (localhost o 127.0.0.1) se conecta a la API y BD SQLite real.
  // En GitHub Pages o cualquier hosting estático activa el modo demostración local seguro para que jamás dé errores.
  USE_MOCK: typeof window !== 'undefined' && 
    window.location.hostname !== 'localhost' && 
    window.location.hostname !== '127.0.0.1',
  API_BASE_URL: 'http://localhost:3000/api',
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      ME: '/auth/me'
    },
    PRODUCTS: {
      BASE: '/productos',
      DETAIL: (id) => `/productos/${id}`,
      DEACTIVATE: (id) => `/productos/${id}/desactivar`
    },
    MOVEMENTS: {
      BASE: '/movimientos',
      RECENT: '/movimientos/recientes'
    },
    CATALOGS: {
      BASE: '/catalogos',
      BY_NAME: (name) => `/catalogos/${name}`
    },
    REPORTS: {
      MOVEMENTS: '/reportes/movimientos',
      EXPORT: '/reportes/exportar'
    }
  },
  STORAGE_KEYS: {
    THEME: 'geds_theme',
    SESSION: 'geds_session',
    TOKEN: 'geds_token',
    PRODUCTS: 'geds_products',
    MOVEMENTS: 'geds_movements',
    CATEGORIES: 'geds_categories',
    UNITS: 'geds_units',
    PROVIDERS: 'geds_providers',
    CLIENTS: 'geds_clients',
    USERS: 'geds_users',
    INITIALIZED: 'geds_initialized_v2'
  }
};


