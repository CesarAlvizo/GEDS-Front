import { CONFIG } from '../config.js';
import { $$ } from '../utils/dom.js';

export function getTheme() {
  return localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'light';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
  $$('[data-theme-toggle]').forEach(button => {
    const target = theme === 'dark' ? 'claro' : 'oscuro';
    button.setAttribute('aria-label', `Cambiar al modo ${target}`);
    button.title = `Cambiar al modo ${target}`;
    button.innerHTML = theme === 'dark'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.4A8.7 8.7 0 0 1 8.6 3.8 8.8 8.8 0 1 0 20.2 15.4Z"/><path d="M16.5 3.5v4m-2-2h4"/></svg>';
  });
}

export function setTheme(theme, source = null) {
  const root = document.documentElement;
  const nextTheme = theme === 'dark' ? 'dark' : 'light';
  if (!source || root.dataset.theme === nextTheme) {
    applyTheme(nextTheme);
    return;
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rect = source.getBoundingClientRect();
  root.style.setProperty('--theme-origin-x', `${rect.left + rect.width / 2}px`);
  root.style.setProperty('--theme-origin-y', `${rect.top + rect.height / 2}px`);

  if (!reducedMotion && typeof document.startViewTransition === 'function') {
    const transition = document.startViewTransition(() => applyTheme(nextTheme));
    const clearOrigin = () => {
      root.style.removeProperty('--theme-origin-x');
      root.style.removeProperty('--theme-origin-y');
    };
    transition.finished.then(clearOrigin, clearOrigin);
    return;
  }

  if (reducedMotion) {
    applyTheme(nextTheme);
    root.style.removeProperty('--theme-origin-x');
    root.style.removeProperty('--theme-origin-y');
    return;
  }

  root.classList.add('theme-switching');
  applyTheme(nextTheme);
  window.setTimeout(() => {
    root.classList.remove('theme-switching');
    root.style.removeProperty('--theme-origin-x');
    root.style.removeProperty('--theme-origin-y');
  }, 480);
}

export function initTheme() {
  setTheme(getTheme());
}


