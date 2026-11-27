import { movementService } from '../services/movementService.js';
import { makeCell, showEmptyState } from './common.js';
import { countUp } from '../utils/dom.js';

const metrics = await movementService.getDashboardMetrics();
[['#active-count',metrics.activeCount],['#low-count',metrics.lowStockCount],['#entries-count',metrics.entriesMonth],['#exits-count',metrics.exitsMonth]].forEach(([selector,value]) => { const element=document.querySelector(selector); element.dataset.to=value; countUp(element); });
const lowList = document.querySelector('#low-stock-list');
if (!metrics.lowStockProducts.length) showEmptyState(lowList, 'Inventario en buen nivel', 'No hay productos por debajo del stock mínimo.', '✓');
const allLowStockLink = document.querySelector('#low-stock-all');
allLowStockLink.textContent = `Ver todas (${metrics.lowStockCount})`;
const urgency = product => Number(product.min) > 0 ? Number(product.stock) / Number(product.min) : (Number(product.stock) <= 0 ? 0 : Infinity);
const priorityAlerts = [...metrics.lowStockProducts].sort((a, b) => urgency(a) - urgency(b)).slice(0, 5);
for (const product of priorityAlerts) { const row = document.createElement('div'); row.className = 'stock-row'; const name = document.createElement('strong'); name.textContent = `${product.nombre} (${product.codigo})`; const stock = document.createElement('span'); stock.className = 'chip warn'; stock.textContent = `${product.stock} / ${product.min} ${product.unidad.toLowerCase()}`; row.append(name, stock); lowList.append(row); }
const chart = document.querySelector('#movement-chart');
metrics.chartData.forEach((day, index) => {
  const col = document.createElement('div');
  col.className = 'col';
  const counts = document.createElement('span');
  counts.className = 'chart-counts';
  counts.textContent = `E ${day.entries} · S ${day.exits}`;
  counts.setAttribute('aria-label', `${day.entries} entradas y ${day.exits} salidas`);
  const pair = document.createElement('div');
  pair.className = 'pair';
  for (const [type, count, label] of [['e', day.entries, 'Entrada'], ['s', day.exits, 'Salida']]) {
    const bar = document.createElement('div');
    bar.className = `bar ${type}${count ? '' : ' zero'}`;
    bar.style.height = `${count ? count / metrics.maxChartValue * 100 : 1.5}%`;
    bar.style.setProperty('--i', index);
    bar.title = `${label}: ${count}`;
    bar.setAttribute('aria-label', `${label}: ${count}`);
    pair.append(bar);
  }
  const dateLabel = document.createElement('span');
  dateLabel.className = 'chart-date';
  dateLabel.textContent = `${day.date.slice(8)}/${day.date.slice(5, 7)}`;
  col.append(counts, pair, dateLabel);
  chart.append(col);
});
const recent = document.querySelector('#recent-movements');
if (!metrics.recentMovements.length) { showEmptyState(recent, 'Aún no hay movimientos', 'Tus entradas y salidas recientes aparecerán aquí.', '↔'); }
const table = document.createElement('table'); const head = table.createTHead().insertRow(); ['Fecha','Producto','Tipo','Cantidad','Motivo'].forEach(label => { const th = document.createElement('th'); th.textContent = label; head.append(th); }); const body = table.createTBody();
const allProds = await (await import('../services/productService.js')).productService.getProducts();
const prodLookup = new Map(allProds.map(p => [Number(p.id), p]));
metrics.recentMovements.forEach((movement,index) => { const product = prodLookup.get(Number(movement.pid)); const row = body.insertRow(); row.style.setProperty('--i', index); makeCell(row, movement.fecha); makeCell(row, product?.nombre || 'Producto eliminado'); makeCell(row, movement.tipo === 'E' ? 'Entrada' : 'Salida', `movement-type ${movement.tipo === 'E' ? 'movement-type-entry' : 'movement-type-exit'}`); makeCell(row, `${movement.cant} ${product?.unidad || ''}`); makeCell(row, movement.motivo); });
if (metrics.recentMovements.length) recent.append(table);
