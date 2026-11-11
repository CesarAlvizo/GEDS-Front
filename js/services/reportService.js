import { movementService } from './movementService.js';
import { productService } from './productService.js';
import { formatDate } from '../utils/formatters.js';
import { exportToCSV } from '../utils/export.js';

class ReportService {
  async getReportData(filters) {
    return await movementService.getMovements(filters);
  }

  async exportReport(filters, filename = 'reporte-geds.csv') {
    const list = await this.getReportData(filters);
    if (!list || !list.length) {
      return false;
    }

    const products = await productService.getProducts();
    const productsById = new Map(products.map(product => [String(product.id), product]));

    const headers = ['Fecha', 'Producto', 'Categoría', 'Tipo', 'Cantidad', 'Unidad', 'Motivo', 'Observaciones'];
    const rows = [headers];

    list.forEach(m => {
      const p = productsById.get(String(m.pid)) || { nombre: 'Desconocido', categoria: '—', unidad: 'pza' };
      rows.push([
        formatDate(m.fecha),
        p.nombre,
        p.categoria,
        m.tipo === 'E' ? 'Entrada' : 'Salida',
        m.cant,
        p.unidad,
        m.motivo || '',
        m.obs || ''
      ]);
    });

    return exportToCSV(filename, rows);
  }
}

export const reportService = new ReportService();


