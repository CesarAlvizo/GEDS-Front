import { catalogService } from '../services/catalogService.js';
import { authService } from '../services/authService.js';
import { confirmBox } from '../components/modal.js';
import { notify, makeCell } from './common.js';
import { InputSecurity } from '../utils/validators.js';

const currentUser = authService.getCurrentUser();
const isSuperAdmin = currentUser && (currentUser.rol === 'SUPERADMIN' || currentUser.id === 1);

// Ocultar pestaña de Administradores a clientes normales
const userTab = document.querySelector('[data-catalog="users"]');
if (userTab && !isSuperAdmin) {
  userTab.remove();
}

const tabs = [...document.querySelectorAll('[data-catalog]')];
const form = document.querySelector('#catalog-form');
const name = document.querySelector('#catalog-name'); const phone = document.querySelector('#catalog-phone'); const email = document.querySelector('#catalog-email');
const head = document.querySelector('#catalog-head'); const body = document.querySelector('#catalog-body');
let catalog = 'providers';
async function render() {
  const isUsers = catalog === 'users';
  const simple = catalog === 'categories' || catalog === 'units';
  
  phone.hidden = email.hidden = simple;
  if (isUsers) {
    name.placeholder = 'Nombre del cliente (ej. Ferretería Juárez)';
    phone.placeholder = 'Usuario para login (ej. ferre_juarez)';
    email.placeholder = 'Contraseña temporal';
    phone.hidden = email.hidden = false;
  } else {
    name.placeholder = simple ? 'Nuevo elemento' : 'Nombre';
    phone.placeholder = 'Teléfono';
    email.placeholder = 'Correo';
  }

  head.replaceChildren(); body.replaceChildren();
  const labels = isUsers 
    ? ['Empresa / Cliente', 'Usuario para Login', 'Rol', ''] 
    : (simple ? ['Nombre',''] : ['Nombre','Teléfono','Correo','']);
  
  const headerRow = document.createElement('tr'); 
  labels.forEach(label => { const th = document.createElement('th'); th.textContent = label; headerRow.append(th); }); 
  head.append(headerRow);

  let items = [];
  if (isUsers) {
    const res = await catalogService.getUsers();
    items = Array.isArray(res) ? res : (res.users || []);
  } else {
    items = await catalogService.getCatalog(catalog);
  }
  items.forEach((item, index) => {
    const row = body.insertRow();
    if (isUsers) {
      makeCell(row, item.nombre || item.username);
      makeCell(row, item.username);
      makeCell(row, 'Administrador de Almacén', 'chip ok');
      const actions = makeCell(row, '');
      if (item.id !== 1) { // No permitir borrar el admin raíz
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn sm danger';
        remove.textContent = 'Eliminar';
        remove.addEventListener('click', () => confirmBox('Eliminar acceso', `¿Deseas dar de baja la cuenta de "${item.username}"?`, 'Eliminar', async () => {
          await catalogService.deleteUser(item.id);
          notify('Cliente eliminado');
          await render();
        }));
        actions.append(remove);
      }
    } else if (simple) {
      makeCell(row, item);
      const actions = makeCell(row, ''); const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn sm danger'; remove.textContent = 'Eliminar';
      remove.addEventListener('click', () => confirmBox('Eliminar elemento','Esta acción quitará el registro del catálogo.','Eliminar',async () => { await catalogService.removeItem(catalog, index); notify('Elemento eliminado'); await render(); })); actions.append(remove);
    } else {
      makeCell(row, item.n || item.nombre); makeCell(row, item.t || item.telefono || '—'); makeCell(row, item.c || item.correo || '—', 'muted');
      const actions = makeCell(row, ''); const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn sm danger'; remove.textContent = 'Eliminar';
      remove.addEventListener('click', () => confirmBox('Eliminar elemento','Esta acción quitará el registro del catálogo.','Eliminar',async () => { await catalogService.removeItem(catalog, index); notify('Elemento eliminado'); await render(); })); actions.append(remove);
    }
  });
}
tabs.forEach(tab => tab.addEventListener('click', async () => { catalog = tab.dataset.catalog; tabs.forEach(item => item.classList.toggle('on', item === tab)); form.reset(); await render(); }));
form.addEventListener('submit', async event => {
  event.preventDefault();
  const nameValidation = InputSecurity.validateField(name, { required: true, maxLength: 100 });
  if (!nameValidation.valid) {
    name.classList.add('err');
    return;
  }
  name.classList.remove('err');
  const value = nameValidation.value;
  const isSimple = (catalog === 'categories' || catalog === 'units');

  if (catalog === 'users') {
    const usernameVal = InputSecurity.sanitize(phone.value).trim().toLowerCase();
    const passwordVal = email.value.trim();

    if (!usernameVal || !passwordVal) {
      notify('El usuario y la contraseña son requeridos', 'warn');
      return;
    }

    try {
      await catalogService.createUser({
        nombre: value,
        username: usernameVal,
        password: passwordVal
      });
      form.reset();
      notify('Administrador cliente creado exitosamente');
      await render();
    } catch (err) {
      notify(err.message || 'Error al crear administrador', 'warn');
    }
    return;
  }

  const cleanPhone = InputSecurity.sanitize(phone.value).slice(0, 50);
  const cleanEmail = InputSecurity.sanitize(email.value).slice(0, 100);

  const payload = isSimple ? value : { n: value, t: cleanPhone || '—', c: cleanEmail || '—' };

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
