import { $ } from '../utils/dom.js';

export function confirmBox(title, text, okLabel, onOk) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  const heading = document.createElement('h2'); heading.textContent = title;
  const message = document.createElement('p'); message.textContent = text;
  const actions = document.createElement('div'); actions.className = 'acts';
  const cancel = document.createElement('button'); cancel.className = 'btn'; cancel.textContent = 'Cancelar'; cancel.dataset.cancel = '';
  const ok = document.createElement('button'); ok.className = 'btn primary'; ok.textContent = okLabel; ok.dataset.ok = '';
  actions.append(cancel, ok); dialog.append(heading, message, actions); overlay.append(dialog);

  document.body.appendChild(overlay);

  const close = () => overlay.remove();

  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };

  $('[data-cancel]', overlay).onclick = close;
  $('[data-ok]', overlay).onclick = () => {
    close();
    if (typeof onOk === 'function') onOk();
  };
}


