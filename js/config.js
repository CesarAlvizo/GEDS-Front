

const hostname = typeof window === 'undefined' ? '' : window.location.hostname.toLowerCase();
const isGitHubPages = hostname === 'github.io' || hostname.endsWith('.github.io');

export const CONFIG = {
  APP: {
    name: 'GEDS',
    fullName: 'Sistema Web de Gestión y Control de Inventario',
    institution: 'Instituto Tecnológico de Aguascalientes',
    version: '1.0.0',
    date: '10/11/2026',
    legend: 'GEDS · Sistema Web de Gestión y Control de Inventario · Instituto Tecnológico de Aguascalientes'
  },
  // Demo en Pages; SQLite en localhost.
  PUBLIC_DEMO: isGitHubPages,
  API_BASE_URL: '/api',
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
    SESSION: 'geds_session'
  }
};


