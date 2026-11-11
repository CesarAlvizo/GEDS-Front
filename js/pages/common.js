import { authService } from '../services/authService.js';
import { confirmBox } from '../components/modal.js';
import { setTheme, getTheme } from '../components/shell.js';
import { toast, toastCard } from '../components/toast.js';

if (!authService.isAuthenticated()) location.replace('login.html');
setTheme(getTheme());
const loginMessage = sessionStorage.getItem('geds_login_message');
if (loginMessage) { sessionStorage.removeItem('geds_login_message'); toastCard(loginMessage); }
document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark')));
document.querySelectorAll('[data-logout]').forEach(button => button.addEventListener('click', () => confirmBox('Cerrar sesión', '¿Deseas salir del sistema?', 'Cerrar sesión', () => { sessionStorage.setItem('geds_logout_message', 'La sesión se cerró correctamente. El acceso al sistema quedó protegido.'); authService.logout(); location.assign('login.html'); })));
document.addEventListener('click', event => {
  document.querySelectorAll('.user-menu[open]').forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const menu = document.querySelector('.user-menu[open]');
  if (menu) { menu.open = false; menu.querySelector('summary')?.focus(); }
});
const side = document.querySelector('#side');
const menu = document.querySelector('#mbtn');
const scrim = document.querySelector('#scrim');
if (side && menu && scrim) {
  menu.addEventListener('click', () => {
    if (innerWidth <= 900) {
      const isOpen = side.classList.toggle('open');
      scrim.classList.toggle('on', isOpen);
      menu.setAttribute('aria-expanded', String(isOpen));
      menu.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
      menu.classList.toggle('active', isOpen);
    } else {
      const isCollapsed = side.classList.toggle('collapsed');
      menu.setAttribute('aria-expanded', String(!isCollapsed));
      menu.setAttribute('aria-label', isCollapsed ? 'Expandir menú' : 'Contraer menú');
      menu.classList.toggle('active', isCollapsed);
    }
  });
  scrim.addEventListener('click', () => { side.classList.remove('open'); scrim.classList.remove('on'); menu.classList.remove('active'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Abrir menú'); });
}
const toastRoot = document.querySelector('#toasts');
if (toastRoot) window.addEventListener('geds:toast', event => toast(event.detail.message, event.detail.type || 'ok'));
export const notify = (message, type = 'ok') => window.dispatchEvent(new CustomEvent('geds:toast', { detail: { message, type } }));
export const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value) || 0);
export const makeCell = (row, value, className = '') => { const cell = document.createElement('td'); cell.textContent = value ?? ''; if (className) cell.className = className; row.append(cell); return cell; };
export const addOption = (select, value, label = value) => { const option = document.createElement('option'); option.value = value; option.textContent = label; select.append(option); return option; };
export function showEmptyState(host, title, message, icon = '⌕') {
  const state = document.createElement('div'); state.className = 'empty-state'; state.setAttribute('role', 'status');
  const symbol = document.createElement('span'); symbol.className = 'empty-state-icon'; symbol.setAttribute('aria-hidden', 'true'); symbol.textContent = icon;
  const heading = document.createElement('h3'); heading.textContent = title;
  const detail = document.createElement('p'); detail.textContent = message;
  state.append(symbol, heading, detail); host.replaceChildren(state);
}
