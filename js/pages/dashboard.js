import { movementService } from '../services/movementService.js';
import { storageAdapter } from '../data/localStorageAdapter.js';
import { makeCell, showEmptyState } from './common.js';
import { countUp } from '../utils/dom.js';

const metrics = await movementService.getDashboardMetrics();
[['#active-count',metrics.activeCount],['#low-count',metrics.lowStockCount],['#entries-count',metrics.entriesMonth],['#exits-count',metrics.exitsMonth]].forEach(([selector,value]) => { const element=document.querySelector(selector); element.dataset.to=value; countUp(element); });
const lowList = document.querySelector('#low-stock-list');
if (!metrics.lowStockProducts.length) showEmptyState(lowList, 'Inventario en buen nivel', 'No hay productos por debajo del stock mínimo.', '✓');
for (const product of metrics.lowStockProducts) { const row = document.createElement('div'); row.className = 'stock-row'; const name = document.createElement('strong'); name.textContent = `${product.nombre} (${product.codigo})`; const stock = document.createElement('span'); stock.className = 'chip warn'; stock.textContent = `${product.stock} / ${product.min} ${product.unidad.toLowerCase()}`; row.append(name, stock); lowList.append(row); }
const chart = document.querySelector('#movement-chart');
metrics.chartData.forEach((day,index) => { const col = document.createElement('div'); col.className = 'col'; const pair = document.createElement('div'); pair.className = 'pair'; for (const [type, count] of [['e', day.entries], ['s', day.exits]]) { const bar = document.createElement('div'); bar.className = `bar ${type}`; bar.style.height = `${count / metrics.maxChartValue * 100}%`; bar.style.setProperty('--i', index); bar.title = String(count); pair.append(bar); } const label = document.createElement('span'); label.textContent = `${day.date.slice(8)}/${day.date.slice(5,7)}`; col.append(pair, label); chart.append(col); });
const recent = document.querySelector('#recent-movements');
if (!metrics.recentMovements.length) { showEmptyState(recent, 'Aún no hay movimientos', 'Tus entradas y salidas recientes aparecerán aquí.', '↔'); }
const table = document.createElement('table'); const head = table.createTHead().insertRow(); ['Fecha','Producto','Tipo','Cantidad','Motivo'].forEach(label => { const th = document.createElement('th'); th.textContent = label; head.append(th); }); const body = table.createTBody();
metrics.recentMovements.forEach((movement,index) => { const product = storageAdapter.getProductById(movement.pid); const row = body.insertRow(); row.style.setProperty('--i', index); makeCell(row, movement.fecha); makeCell(row, product?.nombre || 'Producto eliminado'); makeCell(row, movement.tipo === 'E' ? 'Entrada' : 'Salida', `movement-type ${movement.tipo === 'E' ? 'movement-type-entry' : 'movement-type-exit'}`); makeCell(row, `${movement.cant} ${product?.unidad || ''}`); makeCell(row, movement.motivo); });
if (metrics.recentMovements.length) recent.append(table);
