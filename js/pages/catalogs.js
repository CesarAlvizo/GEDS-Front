import { catalogService } from '../services/catalogService.js';
import { confirmBox } from '../components/modal.js';
import { notify, makeCell } from './common.js';
import { InputSecurity } from '../utils/validators.js';

const tabs = [...document.querySelectorAll('[data-catalog]')];
const form = document.querySelector('#catalog-form');
const name = document.querySelector('#catalog-name');
const phone = document.querySelector('#catalog-phone');
const email = document.querySelector('#catalog-email');
const head = document.querySelector('#catalog-head');
const body = document.querySelector('#catalog-body');
let catalog = 'providers';

async function render() {
  const simple = catalog === 'categories' || catalog === 'units';
  phone.hidden = email.hidden = simple;
  name.placeholder = simple ? 'Nuevo elemento' : 'Nombre';
  phone.placeholder = 'Teléfono';
  email.placeholder = 'Correo';

  head.replaceChildren();
  body.replaceChildren();
  const labels = simple ? ['Nombre', ''] : ['Nombre', 'Teléfono', 'Correo', ''];
  const headerRow = document.createElement('tr');
  labels.forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headerRow.append(th);
  });
  head.append(headerRow);

  const items = await catalogService.getCatalog(catalog);
  items.forEach((item, index) => {
    const row = body.insertRow();
    if (simple) {
      makeCell(row, item);
    } else {
      makeCell(row, item.n || item.nombre);
      makeCell(row, item.t || item.telefono || '—');
      makeCell(row, item.c || item.correo || '—', 'muted');
    }
    const actions = makeCell(row, '');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn sm danger';
    remove.textContent = 'Eliminar';
    remove.addEventListener('click', () => confirmBox(
      'Eliminar elemento',
      'Esta acción quitará el registro del catálogo.',
      'Eliminar',
      async () => {
        await catalogService.removeItem(catalog, index);
        notify('Elemento eliminado');
        await render();
      }
    ));
    actions.append(remove);
  });
}

tabs.forEach(tab => tab.addEventListener('click', async () => {
  catalog = tab.dataset.catalog;
  tabs.forEach(item => item.classList.toggle('on', item === tab));
  form.reset();
  await render();
}));

form.addEventListener('submit', async event => {
  event.preventDefault();
  const nameValidation = InputSecurity.validateField(name, { required: true, maxLength: 100 });
  if (!nameValidation.valid) {
    name.classList.add('err');
    return;
  }
  name.classList.remove('err');

  const simple = catalog === 'categories' || catalog === 'units';
  const payload = simple
    ? nameValidation.value
    : {
        n: nameValidation.value,
        t: InputSecurity.sanitize(phone.value).slice(0, 50) || '—',
        c: InputSecurity.sanitize(email.value).slice(0, 100) || '—'
      };

  try {
    await catalogService.addItem(catalog, payload);
    form.reset();
    notify('Elemento agregado');
    await render();
  } catch (err) {
    notify(err.message || 'Error al agregar elemento', 'warn');
  }
});

await render();
