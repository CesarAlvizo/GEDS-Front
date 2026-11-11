import { productService } from '../services/productService.js';
import { movementService } from '../services/movementService.js';
import { storageAdapter } from '../data/localStorageAdapter.js';
import { notify, addOption, makeCell, showEmptyState } from './common.js';

const form = document.querySelector('#movement-form');
const typeButtons = [...document.querySelectorAll('#movement-type button')];
const productSelect = document.querySelector('#movement-product');
const quantity = document.querySelector('#movement-quantity');
const date = document.querySelector('#movement-date');
const reason = document.querySelector('#movement-reason');
const notes = document.querySelector('#movement-notes');
const hint = document.querySelector('#stock-hint');
const error = document.querySelector('#movement-error');
const historyHost = document.querySelector('#movement-history');
let movementType = 'E';
const localDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,10);
date.value = localDate;
const products = (await productService.getProducts()).filter(product => product.activo);
products.forEach(product => addOption(productSelect, product.id, `${product.codigo} · ${product.nombre}`));
const reasons = { E: ['Compra a proveedor','Ajuste autorizado','Devolución'], S: ['Venta','Ajuste autorizado','Merma'] };
function updateReasons() { reason.replaceChildren(...reasons[movementType].map(value => { const option = document.createElement('option'); option.value = value; option.textContent = value; return option; })); }
async function updateHint() { const product = await productService.getProductById(productSelect.value); hint.textContent = product ? `Existencia actual: ${product.stock} ${product.unidad.toLowerCase()}` : ''; }
async function renderHistory() {
  const movements = await movementService.getRecentMovements(10); historyHost.replaceChildren();
  if (!movements.length) { showEmptyState(historyHost, 'Aún no hay movimientos', 'Cuando registres una entrada o salida, aparecerá aquí.', '↔'); return; }
  const table = document.createElement('table'); const head = table.createTHead().insertRow(); ['Fecha','Producto','Tipo','Cantidad','Motivo'].forEach(text => { const th = document.createElement('th'); th.textContent = text; head.append(th); });
  const body = table.createTBody(); movements.forEach(movement => { const product = storageAdapter.getProductById(movement.pid); const row = body.insertRow(); makeCell(row, movement.fecha); makeCell(row, product?.nombre || 'Producto eliminado'); makeCell(row, movement.tipo === 'E' ? 'Entrada' : 'Salida', `movement-type ${movement.tipo === 'E' ? 'movement-type-entry' : 'movement-type-exit'}`); makeCell(row, `${movement.cant} ${product?.unidad || ''}`); makeCell(row, movement.motivo); }); historyHost.append(table);
}
typeButtons.forEach(button => button.addEventListener('click', () => { movementType = button.dataset.type; typeButtons.forEach(item => item.classList.toggle('on', item === button)); updateReasons(); error.textContent = ''; }));
productSelect.addEventListener('change', updateHint); updateReasons(); await updateHint(); await renderHistory();
form.addEventListener('submit', async event => {
  event.preventDefault(); error.textContent = ''; quantity.classList.remove('err');
  const product = await productService.getProductById(productSelect.value); const amount = Number(quantity.value);
  if (!product) { error.textContent = 'Selecciona un producto válido.'; return; }
  if (!(amount > 0)) { quantity.classList.add('err'); error.textContent = 'La cantidad debe ser mayor que cero.'; return; }
  if (movementType === 'S' && amount > product.stock) { quantity.classList.add('err'); error.textContent = `Cantidad insuficiente: solo hay ${product.stock} ${product.unidad.toLowerCase()}.`; return; }
  try { await movementService.createMovement({ pid: product.id, tipo: movementType, cant: amount, fecha: date.value || localDate, motivo: reason.value, obs: notes.value.trim() }); quantity.value = ''; notes.value = ''; await updateHint(); await renderHistory(); notify(movementType === 'E' ? 'Entrada registrada' : 'Salida registrada'); }
  catch (failure) { quantity.classList.add('err'); error.textContent = failure.message || 'Error al registrar el movimiento.'; }
});
