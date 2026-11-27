import { CONFIG } from '../config.js';
import { apiClient } from './apiClient.js';

class ProductService {
  isLowStock(product) {
    if (!product) return false;
    return Number(product.stock) <= Number(product.min);
  }

  async getProducts(filters = {}) {
    const list = CONFIG.PUBLIC_DEMO
      ? await (await import('../data/publicDemoStore.js')).demoStore.getProducts()
      : await apiClient.get('/productos');

    const { query = '', category = '', onlyLowStock = false } = filters;
    const q = query.trim().toLowerCase();

    return list.filter(p => {
      const matchQuery = !q || (p.nombre + ' ' + p.codigo).toLowerCase().includes(q);
      const matchCategory = !category || p.categoria === category;
      const matchLowStock = !onlyLowStock || this.isLowStock(p);
      return matchQuery && matchCategory && matchLowStock;
    });
  }

  async getProductById(id) {
    if (CONFIG.PUBLIC_DEMO) return (await import('../data/publicDemoStore.js')).demoStore.getProductById(id);
    return await apiClient.get(`/productos/${encodeURIComponent(id)}`);
  }

  async saveProduct(productData) {
    const payload = {
      ...productData,
      costo: Number(productData.costo) || 0,
      precio: Number(productData.precio) || 0,
      stock: Number(productData.stock) || 0,
      min: Number(productData.min) || 0
    };

    if (CONFIG.PUBLIC_DEMO) return (await import('../data/publicDemoStore.js')).demoStore.saveProduct(payload);
    if (payload.id) return await apiClient.put(`/productos/${encodeURIComponent(payload.id)}`, payload);
    return await apiClient.post('/productos', payload);
  }

  async deactivateProduct(id) {
    if (CONFIG.PUBLIC_DEMO) return (await import('../data/publicDemoStore.js')).demoStore.deactivateProduct(id);
    return await apiClient.put(`/productos/${encodeURIComponent(id)}/desactivar`, {});
  }
}

export const productService = new ProductService();


