import { catalogService } from '../services/catalogService.js';
import { productService } from '../services/productService.js';
import { notify, addOption } from './common.js';
import { InputSecurity } from '../utils/validators.js';

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

  const fieldRules = {
    codigo: { required: true, maxLength: 50 },
    nombre: { required: true, maxLength: 150 },
    desc: { required: false, maxLength: 500 },
    costo: { required: false, type: 'number', min: 0 },
    precio: { required: false, type: 'number', min: 0 },
    stock: { required: false, type: 'number', min: 0 },
    min: { required: true, type: 'number', min: 0 }
  };

  for (const [fieldName, rules] of Object.entries(fieldRules)) {
    const field = form.elements.namedItem(fieldName);
    if (!field) continue;
    const errorSpan = field.parentElement.querySelector('.err-t');
    const result = InputSecurity.validateField(field, rules);

    if (!result.valid) {
      field.classList.add('err');
      if (errorSpan) errorSpan.textContent = result.message;
      valid = false;
    } else {
      field.classList.remove('err');
      if (errorSpan) errorSpan.textContent = '';
      values[fieldName] = result.value;
    }
  }

  if (!valid) return;

  try {
    await productService.saveProduct({
      ...values,
      id: product?.id ?? null,
      costo: Number(values.costo) || 0,
      precio: Number(values.precio) || 0,
      stock: Number(values.stock) || 0,
      min: Number(values.min) || 0,
      activo: product?.activo ?? true
    });
    notify(product ? 'Producto actualizado' : 'Producto creado con éxito');
    location.assign('productos.html');
  } catch (error) {
    notify(error.message || 'Error al guardar el producto', 'warn');
  }
});
