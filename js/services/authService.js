import { CONFIG } from '../config.js';
import { storageAdapter } from '../data/localStorageAdapter.js';
import { apiClient } from './apiClient.js';

class AuthService {
  async login(username, password) {
    if (CONFIG.USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 600));

      if (username === 'admin' && password === 'admin') {
        const user = {
          id: 1,
          username: 'admin',
          nombre: 'Administrador General',
          rol: 'ADMIN',
          avatar: 'AD'
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
      storageAdapter.setSession(data.user || { username, rol: 'ADMIN' });
      return data.user;
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


