import { CONFIG } from '../config.js';
import { storageAdapter } from '../data/localStorageAdapter.js';
import { apiClient } from './apiClient.js';

class ProductService {
  isLowStock(product) {
    if (!product) return false;
    return Number(product.stock) <= Number(product.min);
  }

  async getProducts(filters = {}) {
    let list = [];

    if (CONFIG.USE_MOCK) {
      list = storageAdapter.getProducts();
    } else {
      list = await apiClient.get(CONFIG.ENDPOINTS.PRODUCTS.BASE);
    }

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
    if (CONFIG.USE_MOCK) {
      return storageAdapter.getProductById(id);
    } else {
      return await apiClient.get(CONFIG.ENDPOINTS.PRODUCTS.DETAIL(id));
    }
  }

  async saveProduct(productData) {
    const payload = {
      ...productData,
      costo: Number(productData.costo) || 0,
      precio: Number(productData.precio) || 0,
      stock: Number(productData.stock) || 0,
      min: Number(productData.min) || 0
    };

    if (CONFIG.USE_MOCK) {
      return storageAdapter.saveProduct(payload);
    } else {
      if (payload.id) {
        return await apiClient.put(CONFIG.ENDPOINTS.PRODUCTS.DETAIL(payload.id), payload);
      } else {
        return await apiClient.post(CONFIG.ENDPOINTS.PRODUCTS.BASE, payload);
      }
    }
  }

  async deactivateProduct(id) {
    if (CONFIG.USE_MOCK) {
      return storageAdapter.deactivateProduct(id);
    } else {
      return await apiClient.put(CONFIG.ENDPOINTS.PRODUCTS.DEACTIVATE(id), {});
    }
  }
}

export const productService = new ProductService();


