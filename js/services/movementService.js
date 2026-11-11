import { CONFIG } from '../config.js';
import { storageAdapter } from '../data/localStorageAdapter.js';
import { productService } from './productService.js';
import { apiClient } from './apiClient.js';

class MovementService {
  async getMovements(filters = {}) {
    const [list, products] = await Promise.all([
      CONFIG.USE_MOCK
        ? Promise.resolve(storageAdapter.getMovements())
        : apiClient.get(CONFIG.ENDPOINTS.MOVEMENTS.BASE),
      productService.getProducts()
    ]);
    const productsById = new Map(products.map(product => [String(product.id), product]));

    const { fromDate, toDate, category, pid, tipo } = filters;

    return list.filter(m => {
      const p = productsById.get(String(m.pid));
      const matchFrom = !fromDate || m.fecha >= fromDate;
      const matchTo = !toDate || m.fecha <= toDate;
      const matchCat = !category || (p && p.categoria === category);
      const matchProd = !pid || String(m.pid) === String(pid);
      const matchTipo = !tipo || m.tipo === tipo;

      return matchFrom && matchTo && matchCat && matchProd && matchTipo;
    });
  }

  async getRecentMovements(limit = 10) {
    const all = await this.getMovements();
    return all.slice(0, limit);
  }

  async createMovement(movementData) {
    if (CONFIG.USE_MOCK) {
      return storageAdapter.createMovement(movementData);
    } else {
      return await apiClient.post(CONFIG.ENDPOINTS.MOVEMENTS.BASE, movementData);
    }
  }

  async getDashboardMetrics() {
    const products = await productService.getProducts();
    const activeProducts = products.filter(p => p.activo);
    const lowStockProducts = activeProducts.filter(p => productService.isLowStock(p));

    const allMovements = await this.getMovements();
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthMovements = allMovements.filter(m => m.fecha.startsWith(currentMonthPrefix));
    const entriesMonth = monthMovements.filter(m => m.tipo === 'E').length;
    const exitsMonth = monthMovements.filter(m => m.tipo === 'S').length;
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

    const chartData = days.map(dayStr => {
      const entries = allMovements.filter(m => m.fecha === dayStr && m.tipo === 'E').length;
      const exits = allMovements.filter(m => m.fecha === dayStr && m.tipo === 'S').length;
      return {
        date: dayStr,
        entries,
        exits
      };
    });

    const maxChartValue = Math.max(1, ...chartData.flatMap(d => [d.entries, d.exits]));

    return {
      activeCount: activeProducts.length,
      lowStockCount: lowStockProducts.length,
      entriesMonth,
      exitsMonth,
      lowStockProducts,
      chartData,
      maxChartValue,
      recentMovements: allMovements.slice(0, 5)
    };
  }
}

export const movementService = new MovementService();


