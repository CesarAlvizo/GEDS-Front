import { authService } from '../services/authService.js';
import { setTheme, getTheme } from '../components/shell.js';
import { toastCard } from '../components/toast.js';

setTheme(getTheme());
document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
if (authService.isAuthenticated()) location.replace('dashboard.html');
const logoutMessage = sessionStorage.getItem('geds_logout_message');
if (logoutMessage) { sessionStorage.removeItem('geds_logout_message'); toastCard(logoutMessage); }
const form = document.querySelector('#login-form');
const error = document.querySelector('#login-error');
const button = document.querySelector('#login-submit');
const password = document.querySelector('#password');
const passwordToggle = document.querySelector('#password-toggle');
passwordToggle.addEventListener('click', () => {
  const showPassword = password.type === 'password';
  password.type = showPassword ? 'text' : 'password';
  passwordToggle.setAttribute('aria-label', showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
  passwordToggle.querySelector('.eye-open').hidden = showPassword;
  passwordToggle.querySelector('.eye-closed').hidden = !showPassword;
});
form.addEventListener('submit', async event => {
  event.preventDefault(); error.hidden = true; button.disabled = true; button.classList.add('load');
  try {
    const user = await authService.login(document.querySelector('#username').value.trim(), document.querySelector('#password').value);
    sessionStorage.setItem('geds_login_message', `Sesión iniciada correctamente como ${user.nombre || 'Administrador'}.`);
    location.assign('dashboard.html');
  } catch { error.hidden = false; button.disabled = false; button.classList.remove('load'); }
});
