import { movementService } from './movementService.js';
import { productService } from './productService.js';
import { exportToCSV } from '../utils/export.js';
import { exportToExcel } from '../utils/exportExcel.js';

class ReportService {
  async getReportData(filters) {
    return await movementService.getMovements(filters);
  }

  async prepareExport(filters) {
    const list = await this.getReportData(filters);
    if (!list || !list.length) {
      return null;
    }

    const products = await productService.getProducts();
    const productsById = new Map(products.map(product => [String(product.id), product]));

    const headers = ['Folio', 'Fecha', 'Código', 'Producto', 'Categoría', 'Movimiento', 'Cantidad', 'Unidad', 'Motivo', 'Observaciones'];
    const rows = [];

    list.forEach(m => {
      const p = productsById.get(String(m.pid)) || { codigo: '', nombre: 'Desconocido', categoria: '—', unidad: 'pza' };
      rows.push([
        m.id,
        m.fecha,
        p.codigo,
        p.nombre,
        p.categoria,
        m.tipo === 'E' ? 'Entrada' : 'Salida',
        Number(m.cant),
        p.unidad,
        m.motivo || '',
        m.obs || ''
      ]);
    });

    const from = String(filters.fromDate || 'inicio').replace(/[^\d-]/g, '') || 'inicio';
    const to = String(filters.toDate || 'hoy').replace(/[^\d-]/g, '') || 'hoy';
    const movementType = filters.tipo === 'E' ? 'Entradas' : filters.tipo === 'S' ? 'Salidas' : 'Todos los movimientos';
    const category = filters.category || 'Todas las categorías';
    const product = filters.pid ? productsById.get(String(filters.pid))?.nombre || 'Producto seleccionado' : 'Todos los productos';

    return {
      filename: `GEDS-reporte-${from}-a-${to}`,
      period: `Periodo: ${filters.fromDate || 'Sin límite inicial'} a ${filters.toDate || 'Sin límite final'}  ·  ${movementType}  ·  ${category}  ·  ${product}`,
      headers,
      rows,
      summary: {
        total: list.length,
        entries: list.filter(movement => movement.tipo === 'E').length,
        exits: list.filter(movement => movement.tipo === 'S').length
      }
    };
  }

  async exportReport(filters) {
    const report = await this.prepareExport(filters);
    if (!report) return false;
    return exportToCSV(`${report.filename}.csv`, [report.headers, ...report.rows]);
  }

  async exportExcelReport(filters) {
    const report = await this.prepareExport(filters);
    if (!report) return false;
    return exportToExcel(`${report.filename}.xlsx`, report);
  }
}

export const reportService = new ReportService();


