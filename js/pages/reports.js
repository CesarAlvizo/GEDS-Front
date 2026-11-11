import { catalogService } from '../services/catalogService.js';
import { productService } from '../services/productService.js';
import { reportService } from '../services/reportService.js';
import { storageAdapter } from '../data/localStorageAdapter.js';
import { notify, addOption, makeCell, showEmptyState } from './common.js';

const from = document.querySelector('#report-from'); const to = document.querySelector('#report-to');
const category = document.querySelector('#report-category'); const product = document.querySelector('#report-product'); const type = document.querySelector('#report-type');
const today = new Date(); to.value = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0,10); from.value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-01`;
(await catalogService.getCatalog('categories')).forEach(item => addOption(category, item));
(await productService.getProducts()).forEach(item => addOption(product, item.id, item.nombre));
function filters() { return { fromDate: from.value, toDate: to.value, category: category.value, pid: product.value, tipo: type.value }; }
async function update() {
  const movements = await reportService.getReportData(filters());
  document.querySelector('#report-entries').textContent = `Entradas: ${movements.filter(item => item.tipo === 'E').length}`;
  document.querySelector('#report-exits').textContent = `Salidas: ${movements.filter(item => item.tipo === 'S').length}`;
  document.querySelector('#report-total').textContent = `${movements.length} registros`;
  const host = document.querySelector('#report-table'); host.replaceChildren();
  if (!movements.length) { showEmptyState(host, 'Sin movimientos para mostrar', 'No hay movimientos para los filtros seleccionados.', '↔'); return; }
  const table = document.createElement('table'); const head = table.createTHead().insertRow(); ['Fecha','Producto','Tipo','Cantidad','Motivo','Observaciones'].forEach(text => { const th = document.createElement('th'); th.textContent = text; head.append(th); });
  const body = table.createTBody(); movements.forEach((movement,index) => { const item = storageAdapter.getProductById(movement.pid); const row = body.insertRow(); row.style.setProperty('--i', index); makeCell(row, movement.fecha); makeCell(row, item?.nombre || 'Producto eliminado'); makeCell(row, movement.tipo === 'E' ? 'Entrada' : 'Salida', `movement-type ${movement.tipo === 'E' ? 'movement-type-entry' : 'movement-type-exit'}`); makeCell(row, `${movement.cant} ${item?.unidad || ''}`); makeCell(row, movement.motivo); makeCell(row, movement.obs); }); host.append(table);
}
[from,to,category,product,type].forEach(input => input.addEventListener('change', update));
document.querySelector('#report-export').addEventListener('click', async () => {
  const exported = await reportService.exportReport(filters(), 'reporte-geds.csv');
  notify(exported ? 'Reporte exportado' : 'No hay datos para exportar', exported ? 'ok' : 'warn');
});
await update();
