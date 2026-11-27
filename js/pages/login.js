import { authService } from '../services/authService.js';
import { setTheme, getTheme } from '../components/shell.js';
import { toastCard } from '../components/toast.js';
import { InputSecurity } from '../utils/validators.js';
import { CONFIG } from '../config.js';

setTheme(getTheme());
document.querySelector('[data-theme-toggle]')?.addEventListener('click', event => setTheme(getTheme() === 'dark' ? 'light' : 'dark', event.currentTarget));

const currentUser = authService.getCurrentUser();
if (currentUser) location.replace('dashboard.html');

const logoutMessage = sessionStorage.getItem('geds_logout_message');
if (logoutMessage) { sessionStorage.removeItem('geds_logout_message'); toastCard(logoutMessage); }
const form = document.querySelector('#login-form');
const error = document.querySelector('#login-error');
const button = document.querySelector('#login-submit');
const usernameInput = document.querySelector('#username');
const password = document.querySelector('#password');
const passwordToggle = document.querySelector('#password-toggle');
const demoLogin = document.querySelector('#demo-login');

if (CONFIG.PUBLIC_DEMO) {
  document.querySelector('.sub').textContent = 'Explora GEDS con información ficticia. Tus cambios de demostración se guardan solo en este navegador.';
  form.querySelectorAll('.field, #login-submit').forEach(element => { element.hidden = true; element.style.display = 'none'; });
  passwordToggle.hidden = true;
  passwordToggle.style.display = 'none';
  demoLogin.hidden = false;
  demoLogin.style.display = 'inline-flex';
  document.querySelector('#demo-disclaimer').hidden = false;
  document.querySelector('.lp-chip').replaceChildren(Object.assign(document.createElement('span'), { textContent: 'Demostración pública · datos ficticios' }));
  document.querySelectorAll('.lp-feat-text span').forEach(element => {
    if (element.textContent.includes('Toma decisiones con datos')) element.textContent = 'Explora reportes con movimientos de ejemplo.';
  });
  demoLogin.addEventListener('click', () => {
    authService.loginDemo();
    location.assign('dashboard.html');
  });
}

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
    await authService.login(usernameVal.value, cleanPassword);
    location.assign('dashboard.html');
  } catch (err) {
    error.textContent = err.message || 'Usuario o contraseña incorrectos.';
    error.hidden = false;
    button.disabled = false;
    button.classList.remove('load');
  }
});
