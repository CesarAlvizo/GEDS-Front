import { CONFIG } from '../config.js';
import { storageAdapter } from '../data/localStorageAdapter.js';
import { apiClient } from './apiClient.js';

class AuthService {
  async login(username, password) {
    if (CONFIG.PUBLIC_DEMO) {
      return this.loginDemo();
    }
    const data = await apiClient.post(CONFIG.ENDPOINTS.AUTH.LOGIN, { username, password });
    const user = { id: data.user?.id, rol: data.user?.rol || 'ADMIN' };
    storageAdapter.setSession(user);
    return user;
  }

  loginDemo() {
    const user = { id: 'demo', rol: 'ADMIN' };
    storageAdapter.setSession(user);
    return user;
  }

  logout() {
    if (CONFIG.PUBLIC_DEMO) {
      storageAdapter.setSession(null);
      return;
    }
    apiClient.post(CONFIG.ENDPOINTS.AUTH.LOGOUT, {}).catch(() => {});
    storageAdapter.setSession(null);
  }

  isAuthenticated() {
    return Boolean(storageAdapter.getSession()?.id);
  }

  getCurrentUser() {
    return storageAdapter.getSession();
  }
}

export const authService = new AuthService();
