import { CONFIG } from '../config.js';
import { $$ } from '../utils/dom.js';

export function getTheme() {
  return localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'light';
}

export function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
  $$('[data-theme-toggle]').forEach(btn => {
    btn.textContent = theme === 'dark' ? '☀' : '◐';
  });
}

export function initTheme() {
  setTheme(getTheme());
}


