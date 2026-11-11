import { catalogService } from '../services/catalogService.js';
import { productService } from '../services/productService.js';
import { confirmBox } from '../components/modal.js';
import { notify, addOption, makeCell, money, showEmptyState } from './common.js';

const search = document.querySelector('#product-search');
const category = document.querySelector('#product-category');
const low = document.querySelector('#product-low');
const tableHost = document.querySelector('#product-table');
const categories = await catalogService.getCatalog('categories');
categories.forEach(value => addOption(category, value));
low.checked = new URLSearchParams(location.search).has('low');
const head = ['Código','Producto','Categoría','Unidad','Precio','Stock','Estado',''];
async function render() {
  const products = await productService.getProducts({ query: search.value, category: category.value, onlyLowStock: low.checked });
  tableHost.replaceChildren();
  if (!products.length) { showEmptyState(tableHost, 'Sin productos para mostrar', 'No se encontraron productos con los filtros seleccionados.'); return; }
  const table = document.createElement('table'); const header = table.createTHead().insertRow();
  head.forEach(label => { const th = document.createElement('th'); th.textContent = label; header.append(th); });
  const body = table.createTBody();
  products.forEach((product,index) => {
    const row = body.insertRow(); makeCell(row, product.codigo, 'muted'); makeCell(row, product.nombre); makeCell(row, product.categoria); makeCell(row, product.unidad); makeCell(row, money(product.precio), 'num');
    row.style.setProperty('--i', index);
    const stock = makeCell(row, `${product.stock} / mín ${product.min}`); stock.className = productService.isLowStock(product) ? 'text-warning' : '';
    const status = makeCell(row, !product.activo ? 'Inactivo' : productService.isLowStock(product) ? 'Stock bajo' : 'Disponible'); status.className = product.activo ? (productService.isLowStock(product) ? 'text-warning' : 'text-success') : 'muted';
    const actions = makeCell(row, '');
    const edit = document.createElement('a'); edit.className = 'btn sm'; edit.href = `producto-form.html?id=${encodeURIComponent(product.id)}`; edit.textContent = 'Editar'; actions.append(edit);
    if (product.activo) { const deactivate = document.createElement('button'); deactivate.className = 'btn sm danger'; deactivate.textContent = 'Desactivar'; deactivate.addEventListener('click', () => confirmBox('Desactivar producto', `¿Deseas desactivar ${product.nombre}?`, 'Desactivar', async () => { await productService.deactivateProduct(product.id); notify('Producto desactivado'); await render(); })); actions.append(deactivate); }
  });
  tableHost.append(table);
}
search.addEventListener('input', render); category.addEventListener('change', render); low.addEventListener('change', render);
await render();
