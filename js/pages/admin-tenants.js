import { catalogService } from '../services/catalogService.js';
import { authService } from '../services/authService.js';
import { confirmBox } from '../components/modal.js';
import { notify } from './common.js';
import { InputSecurity } from '../utils/validators.js';

const tbody = document.querySelector('#tenants-tbody');
const kpiTotalTenants = document.querySelector('#kpi-total-tenants');
const kpiActiveTenants = document.querySelector('#kpi-active-tenants');
const kpiTotalProducts = document.querySelector('#kpi-total-products');
const kpiTotalMovements = document.querySelector('#kpi-total-movements');
const countLabel = document.querySelector('#tenants-count-label');
const searchInput = document.querySelector('#tenant-search');
const statusFilter = document.querySelector('#tenant-status-filter');

const form = document.querySelector('#tenant-form');
const nameInput = document.querySelector('#tenant-name');
const usernameInput = document.querySelector('#tenant-username');
const passwordInput = document.querySelector('#tenant-password');
const submitBtn = document.querySelector('#btn-save-tenant');

async function loadData() {
  try {
    const res = await catalogService.getUsers();
    const users = Array.isArray(res) ? res : (res.users || []);
    const stats = res.stats || {
      totalTenants: users.filter(u => u.id !== 1).length,
      activeTenants: users.filter(u => u.id !== 1 && u.activo !== 0 && u.activo !== false).length,
      totalProducts: '—',
      totalMovements: '—'
    };

    if (kpiTotalTenants) kpiTotalTenants.textContent = stats.totalTenants ?? users.filter(u => u.id !== 1).length;
    if (kpiActiveTenants) kpiActiveTenants.textContent = stats.activeTenants ?? '—';
    if (kpiTotalProducts) kpiTotalProducts.textContent = stats.totalProducts ?? '—';
    if (kpiTotalMovements) kpiTotalMovements.textContent = stats.totalMovements ?? '—';

    allTenants = users.filter(u => u.id !== 1 && u.username !== 'admin');
    filterTenants();
  } catch (err) {
    console.error('Error al cargar clientes:', err);
    notify('Error al obtener la lista de clientes', 'warn');
  }
}

let allTenants = [];

function filterTenants() {
  const query = (searchInput?.value || '').trim().toLocaleLowerCase();
  const status = statusFilter?.value || 'all';
  const tenants = allTenants.filter(user => {
    const matchesQuery = `${user.nombre || ''} ${user.username || ''}`.toLocaleLowerCase().includes(query);
    const isActive = user.activo === 1 || user.activo === true;
    const matchesStatus = status === 'all' || (status === 'active' ? isActive : !isActive);
    return matchesQuery && matchesStatus;
  });
  renderTable(tenants, allTenants.length);
}

function renderTable(tenants, total = tenants.length) {
  if (countLabel) countLabel.textContent = tenants.length === total
    ? `${total} cliente(s)`
    : `${tenants.length} de ${total} cliente(s)`;

  tbody.innerHTML = '';
  if (tenants.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-muted">
          ${total === 0 ? 'No hay clientes registrados aún. Usa el formulario para dar de alta al primer cliente.' : 'No hay clientes que coincidan con la búsqueda y el estado seleccionados.'}
        </td>
      </tr>
    `;
    return;
  }

  tenants.forEach(user => {
    const tr = document.createElement('tr');
    const isActive = (user.activo === 1 || user.activo === true);

    tr.innerHTML = `
      <td>
        <div class="fw-semibold">${user.nombre || user.username}</div>
        <div class="small text-muted">ID: #${user.id}</div>
      </td>
      <td>
        <code>${user.username}</code>
      </td>
      <td>
        <span class="badge bg-secondary-subtle text-secondary">${user.total_productos ?? '—'}</span>
      </td>
      <td>
        <span class="badge bg-secondary-subtle text-secondary">${user.total_movimientos ?? '—'}</span>
      </td>
      <td>
        <span class="chip ${isActive ? 'ok' : 'danger'}">
          ${isActive ? 'Activo' : 'Suspendido'}
        </span>
      </td>
      <td class="text-end">
        <div class="d-inline-flex gap-2">
          <button type="button" class="btn sm ${isActive ? 'ghost' : 'primary'} btn-toggle-status" data-id="${user.id}" title="${isActive ? 'Suspender acceso temporalmente' : 'Reactivar acceso'}">
            ${isActive ? 'Suspender' : 'Activar'}
          </button>
          <button type="button" class="btn sm danger btn-delete-user" data-id="${user.id}" data-name="${user.username}" title="Eliminar cuenta">
            Eliminar
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-toggle-status').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      try {
        await catalogService.toggleUserStatus(id);
        notify('Estado del cliente actualizado');
        await loadData();
      } catch (err) {
        notify(err.message || 'Error al cambiar estado', 'warn');
      }
    });
  });

  tbody.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const username = btn.dataset.name;
      confirmBox(
        'Eliminar Cliente',
        `¿Estás seguro de que deseas dar de baja la cuenta "${username}"? El cliente ya no podrá iniciar sesión.`,
        'Eliminar',
        async () => {
          try {
            await catalogService.deleteUser(id);
            notify('Cliente eliminado exitosamente');
            await loadData();
          } catch (err) {
            notify(err.message || 'Error al eliminar cliente', 'warn');
          }
        }
      );
    });
  });
}

form?.addEventListener('submit', async event => {
  event.preventDefault();

  const nameVal = InputSecurity.validateField(nameInput, { required: true, maxLength: 100 });
  const usernameVal = InputSecurity.validateField(usernameInput, { required: true, maxLength: 30 });
  const rawPass = passwordInput.value.trim();

  if (!nameVal.valid) {
    nameInput.classList.add('err');
    return;
  }
  nameInput.classList.remove('err');

  if (!usernameVal.valid) {
    usernameInput.classList.add('err');
    notify('Usuario inválido. Usa solo letras y números (mínimo 3 caracteres)', 'warn');
    return;
  }
  usernameInput.classList.remove('err');

  if (!rawPass || rawPass.length < 4) {
    passwordInput.classList.add('err');
    notify('La contraseña debe tener al menos 4 caracteres', 'warn');
    return;
  }
  passwordInput.classList.remove('err');

  submitBtn.disabled = true;

  try {
    await catalogService.createUser({
      nombre: nameVal.value,
      username: usernameVal.value.toLowerCase(),
      password: rawPass
    });
    form.reset();
    notify('¡Cliente dado de alta exitosamente!');
    await loadData();
  } catch (err) {
    notify(err.message || 'Error al registrar cliente', 'warn');
  } finally {
    submitBtn.disabled = false;
  }
});

searchInput?.addEventListener('input', filterTenants);
statusFilter?.addEventListener('change', filterTenants);

loadData();

