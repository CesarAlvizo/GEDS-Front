import { catalogService } from '../services/catalogService.js';
import { productService } from '../services/productService.js';
import { notify, addOption } from './common.js';

const form = document.querySelector('#product-form');
const params = new URLSearchParams(location.search);
const id = params.get('id');
const product = id ? await productService.getProductById(id) : null;
if (id && !product) { location.replace('productos.html'); }
const [categories, units] = await Promise.all([catalogService.getCatalog('categories'), catalogService.getCatalog('units')]);
categories.forEach(value => addOption(document.querySelector('#f_categoria'), value));
units.forEach(value => addOption(document.querySelector('#f_unidad'), value));
if (product) {
  document.querySelector('#form-title').textContent = 'Editar producto';
  document.querySelector('#form-subtitle').textContent = `Modificando código ${product.codigo}`;
  for (const [key, value] of Object.entries({ codigo: product.codigo, nombre: product.nombre, desc: product.desc, categoria: product.categoria, unidad: product.unidad, costo: product.costo, precio: product.precio, stock: product.stock, min: product.min })) { const field = form.elements.namedItem(key); if (field) field.value = value ?? ''; }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  let valid = true;
  for (const name of ['codigo','nombre','min']) { const field = form.elements.namedItem(name); const error = field.parentElement.querySelector('.err-t'); const missing = !String(values[name] ?? '').trim(); field.classList.toggle('err', missing); if (error) error.textContent = missing ? 'Este campo es obligatorio' : ''; valid &&= !missing; }
  if (!valid) return;
  try { await productService.saveProduct({ ...values, id: product?.id ?? null, costo: Number(values.costo) || 0, precio: Number(values.precio) || 0, stock: Number(values.stock) || 0, min: Number(values.min) || 0, activo: product?.activo ?? true }); notify(product ? 'Producto actualizado' : 'Producto creado con éxito'); location.assign('productos.html'); }
  catch (error) { notify(error.message || 'Error al guardar el producto', 'warn'); }
});
