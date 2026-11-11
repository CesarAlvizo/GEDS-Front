import { $ } from '../utils/dom.js';

export function toast(msg, icon = 'check') {
  let container = $('#toasts');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toasts';
    container.className = 'toasts';
    document.body.appendChild(container);
  }

  const t = document.createElement('div');
  t.className = 'toast';
  const symbol = document.createElement('span');
  symbol.setAttribute('aria-hidden', 'true');
  symbol.textContent = icon === 'warn' ? '!' : icon === 'dl' ? '↓' : '✓';
  const message = document.createElement('span');
  message.textContent = msg;
  t.append(symbol, message);
  container.appendChild(t);

  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

export function toastCard(text, duration = 5000) {
  let container = $('#toasts');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toasts';
    container.className = 'toasts';
    document.body.appendChild(container);
  }

  const card = document.createElement('article');
  card.className = 'toast-card';
  const icon = document.createElement('span');
  icon.className = 'toast-card-icon';
  icon.textContent = '✓';
  const message = document.createElement('p');
  message.className = 'toast-card-text';
  message.textContent = text;
  card.append(icon, message);

  container.appendChild(card);

  setTimeout(() => {
    card.classList.add('out');
    setTimeout(() => card.remove(), 350);
  }, duration);
}

