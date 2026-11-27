import { CONFIG } from '../config.js';
import { apiClient } from './apiClient.js';

class CatalogService {
  async getCatalog(name) {
    if (CONFIG.PUBLIC_DEMO) return (await import('../data/publicDemoStore.js')).demoStore.getCatalog(name);
    return await apiClient.get(`/catalogos/${encodeURIComponent(name)}`);
  }

  async addItem(name, item) {
    if (CONFIG.PUBLIC_DEMO) return (await import('../data/publicDemoStore.js')).demoStore.addItem(name, item);
    return await apiClient.post(`/catalogos/${encodeURIComponent(name)}`, item);
  }

  async removeItem(name, indexOrId) {
    if (CONFIG.PUBLIC_DEMO) return (await import('../data/publicDemoStore.js')).demoStore.removeItem(name, indexOrId);
    return await apiClient.delete(`/catalogos/${encodeURIComponent(name)}/${encodeURIComponent(indexOrId)}`);
  }

}

export const catalogService = new CatalogService();


