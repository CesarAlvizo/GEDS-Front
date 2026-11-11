

export const CONFIG = {
  APP: {
    name: 'GEDS',
    fullName: 'Sistema Web de Gestión y Control de Inventario',
    institution: 'Instituto Tecnológico de Aguascalientes',
    version: '1.0.0',
    date: '10/11/2026',
    legend: 'GEDS · Sistema Web de Gestión y Control de Inventario · Instituto Tecnológico de Aguascalientes'
  },
  USE_MOCK: true,
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
    INITIALIZED: 'geds_initialized_v2'
  }
};


