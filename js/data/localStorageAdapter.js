class LocalStorageAdapter {
  constructor() {
    this.keys = { SESSION: 'geds_session' };
    this.removeLegacyDemoData();
  }

  removeLegacyDemoData() {
    const migrationKey = 'geds_secure_backend_v1';
    if (localStorage.getItem(migrationKey)) return;
    [
      'geds_products', 'geds_movements', 'geds_categories', 'geds_units',
      'geds_providers', 'geds_clients', 'geds_users', 'geds_token',
      this.keys.SESSION, 'geds_initialized_v3'
    ].forEach(key => localStorage.removeItem(key));
    sessionStorage.removeItem(this.keys.SESSION);
    localStorage.setItem(migrationKey, 'true');
  }
  getSession() {
    const raw = sessionStorage.getItem(this.keys.SESSION);
    try {
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session?.id) return null;
      const safeSession = { id: session.id, rol: session.rol || 'ADMIN' };
      if (JSON.stringify(session) !== JSON.stringify(safeSession)) {
        sessionStorage.setItem(this.keys.SESSION, JSON.stringify(safeSession));
      }
      return safeSession;
    } catch {
      return null;
    }
  }

  setSession(user) {
    if (user) {
      sessionStorage.setItem(this.keys.SESSION, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(this.keys.SESSION);
      localStorage.removeItem('geds_token');
    }
  }
}

export const storageAdapter = new LocalStorageAdapter();


