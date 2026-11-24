import { CONFIG } from '../config.js';
import { storageAdapter } from '../data/localStorageAdapter.js';
import { apiClient } from './apiClient.js';

class CatalogService {
  async getCatalog(name) {
    if (CONFIG.USE_MOCK) {
      return storageAdapter.getCatalog(name);
    } else {
      return await apiClient.get(CONFIG.ENDPOINTS.CATALOGS.BY_NAME(name));
    }
  }

  async addItem(name, item) {
    if (CONFIG.USE_MOCK) {
      return storageAdapter.addCatalogItem(name, item);
    } else {
      return await apiClient.post(CONFIG.ENDPOINTS.CATALOGS.BY_NAME(name), item);
    }
  }

  async removeItem(name, indexOrId) {
    if (CONFIG.USE_MOCK) {
      return storageAdapter.removeCatalogItem(name, indexOrId);
    } else {
      return await apiClient.delete(`${CONFIG.ENDPOINTS.CATALOGS.BY_NAME(name)}/${indexOrId}`);
    }
  }

  // Métodos para la gestión de usuarios administradores clientes
  async getUsers() {
    if (CONFIG.USE_MOCK) {
      return storageAdapter.getCatalog('users');
    } else {
      return await apiClient.get('/usuarios');
    }
  }

  async createUser(userData) {
    if (CONFIG.USE_MOCK) {
      const users = storageAdapter.getCatalog('users');
      const newUser = { id: Date.now(), ...userData, rol: 'ADMIN', activo: true };
      users.push(newUser);
      storageAdapter.saveCatalog('users', users);
      return newUser;
    } else {
      return await apiClient.post('/usuarios', userData);
    }
  }

  async deleteUser(id) {
    if (CONFIG.USE_MOCK) {
      const users = storageAdapter.getCatalog('users').filter(u => String(u.id) !== String(id));
      storageAdapter.saveCatalog('users', users);
      return true;
    } else {
      return await apiClient.delete(`/usuarios/${id}`);
    }
  }
}

export const catalogService = new CatalogService();


