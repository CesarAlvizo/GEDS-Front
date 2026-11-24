import { CONFIG } from '../config.js';
import { storageAdapter } from '../data/localStorageAdapter.js';
import { apiClient } from './apiClient.js';

class AuthService {
  async login(username, password) {
    if (CONFIG.USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300));

      const users = storageAdapter.getCatalog('users') || [];
      // Cuentas demo soportadas en mock
      let found = users.find(u => u.username === username);
      if (!found && username === 'admin' && password === 'admin') {
        found = { id: 1, username: 'admin', nombre: 'Super Administrador', rol: 'SUPERADMIN', activo: true };
      } else if (!found && username === 'farmacia_sj' && password === 'cliente123') {
        found = { id: 2, username: 'farmacia_sj', nombre: 'Farmacia San José', rol: 'ADMIN', activo: true };
      } else if (!found && username === 'ferre_roble' && password === 'cliente123') {
        found = { id: 3, username: 'ferre_roble', nombre: 'Ferretería El Roble', rol: 'ADMIN', activo: true };
      }

      if (found) {
        const user = {
          id: found.id,
          username: found.username,
          nombre: found.nombre,
          rol: found.id === 1 ? 'SUPERADMIN' : 'ADMIN',
          avatar: found.username.slice(0, 2).toUpperCase()
        };
        storageAdapter.setSession(user);
        return user;
      } else {
        throw new Error('Usuario o contraseña incorrectos');
      }
    } else {
      const data = await apiClient.post(CONFIG.ENDPOINTS.AUTH.LOGIN, { username, password });
      if (data && data.token) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, data.token);
      }
      const role = (data.user?.id === 1 || data.user?.username === 'admin') ? 'SUPERADMIN' : (data.user?.rol || 'ADMIN');
      const user = { ...(data.user || { username }), rol: role };
      storageAdapter.setSession(user);
      return user;
    }
  }

  logout() {
    if (!CONFIG.USE_MOCK) {
      apiClient.post(CONFIG.ENDPOINTS.AUTH.LOGOUT, {}).catch(() => {});
    }
    storageAdapter.setSession(null);
  }

  isAuthenticated() {
    return Boolean(storageAdapter.getSession());
  }

  getCurrentUser() {
    return storageAdapter.getSession();
  }
}

export const authService = new AuthService();


