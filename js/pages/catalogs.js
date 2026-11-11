import { catalogService } from '../services/catalogService.js';
import { confirmBox } from '../components/modal.js';
import { notify, makeCell } from './common.js';

const tabs = [...document.querySelectorAll('[data-catalog]')];
const form = document.querySelector('#catalog-form');
const name = document.querySelector('#catalog-name'); const phone = document.querySelector('#catalog-phone'); const email = document.querySelector('#catalog-email');
const head = document.querySelector('#catalog-head'); const body = document.querySelector('#catalog-body');
let catalog = 'providers';
async function render() {
  const simple = catalog === 'categories' || catalog === 'units';
  phone.hidden = email.hidden = simple;
  name.placeholder = simple ? 'Nuevo elemento' : 'Nombre';
  head.replaceChildren(); body.replaceChildren();
  const labels = simple ? ['Nombre',''] : ['Nombre','Teléfono','Correo',''];
  const headerRow = document.createElement('tr'); labels.forEach(label => { const th = document.createElement('th'); th.textContent = label; headerRow.append(th); }); head.append(headerRow);
  const items = await catalogService.getCatalog(catalog);
  items.forEach((item, index) => {
    const row = body.insertRow();
    if (simple) makeCell(row, item);
    else { makeCell(row, item.n); makeCell(row, item.t); makeCell(row, item.c, 'muted'); }
    const actions = makeCell(row, ''); const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn sm danger'; remove.textContent = 'Eliminar';
    remove.addEventListener('click', () => confirmBox('Eliminar elemento','Esta acción quitará el registro del catálogo.','Eliminar',async () => { await catalogService.removeItem(catalog, index); notify('Elemento eliminado'); await render(); })); actions.append(remove);
  });
}
tabs.forEach(tab => tab.addEventListener('click', async () => { catalog = tab.dataset.catalog; tabs.forEach(item => item.classList.toggle('on', item === tab)); form.reset(); await render(); }));
form.addEventListener('submit', async event => {
  event.preventDefault(); const value = name.value.trim(); if (!value) { name.classList.add('err'); return; }
  await catalogService.addItem(catalog, (catalog === 'categories' || catalog === 'units') ? value : { n: value, t: phone.value.trim() || '—', c: email.value.trim() || '—' });
  form.reset(); name.classList.remove('err'); notify('Elemento agregado'); await render();
});
await render();
