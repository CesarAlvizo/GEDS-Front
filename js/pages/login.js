import { authService } from '../services/authService.js';
import { setTheme, getTheme } from '../components/shell.js';
import { toastCard } from '../components/toast.js';
import { InputSecurity } from '../utils/validators.js';

setTheme(getTheme());
document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));

const currentUser = authService.getCurrentUser();
if (currentUser) {
  if (currentUser.rol === 'SUPERADMIN' || currentUser.id === 1) {
    location.replace('admin-tenants.html');
  } else {
    location.replace('dashboard.html');
  }
}

const logoutMessage = sessionStorage.getItem('geds_logout_message');
if (logoutMessage) { sessionStorage.removeItem('geds_logout_message'); toastCard(logoutMessage); }
const form = document.querySelector('#login-form');
const error = document.querySelector('#login-error');
const button = document.querySelector('#login-submit');
const usernameInput = document.querySelector('#username');
const password = document.querySelector('#password');
const passwordToggle = document.querySelector('#password-toggle');

// Autollenado rápido de credenciales demo
document.querySelectorAll('.demo-quick-fill').forEach(btn => {
  btn.addEventListener('click', () => {
    usernameInput.value = btn.dataset.u || '';
    password.value = btn.dataset.p || '';
    error.hidden = true;
    usernameInput.focus();
  });
});

passwordToggle.addEventListener('click', () => {
  const showPassword = password.type === 'password';
  password.type = showPassword ? 'text' : 'password';
  passwordToggle.setAttribute('aria-label', showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
  passwordToggle.querySelector('.eye-open').hidden = showPassword;
  passwordToggle.querySelector('.eye-closed').hidden = !showPassword;
});
form.addEventListener('submit', async event => {
  event.preventDefault(); error.hidden = true; button.disabled = true; button.classList.add('load');

  const usernameVal = InputSecurity.validateField(usernameInput, { required: true, maxLength: 50 });
  const cleanPassword = InputSecurity.sanitize(password.value);

  if (!usernameVal.valid || !cleanPassword) {
    error.textContent = 'Ingresa usuario y contraseña válidos.';
    error.hidden = false;
    button.disabled = false;
    button.classList.remove('load');
    return;
  }

  try {
    const user = await authService.login(usernameVal.value, cleanPassword);
    if (user.rol === 'SUPERADMIN' || user.id === 1) {
      location.assign('admin-tenants.html');
    } else {
      location.assign('dashboard.html');
    }
  } catch (err) {
    error.textContent = err.message || 'Usuario o contraseña incorrectos.';
    error.hidden = false;
    button.disabled = false;
    button.classList.remove('load');
  }
});
