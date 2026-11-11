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
}

export const catalogService = new CatalogService();


