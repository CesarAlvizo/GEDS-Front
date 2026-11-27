// Redirige antes de mostrar contenido privado.
try {
  const migrationKey = 'geds_secure_backend_v1';
  if (!localStorage.getItem(migrationKey)) {
    [
      'geds_products', 'geds_movements', 'geds_categories', 'geds_units',
      'geds_providers', 'geds_clients', 'geds_users', 'geds_token',
      'geds_session', 'geds_initialized_v3'
    ].forEach(key => localStorage.removeItem(key));
    sessionStorage.removeItem('geds_session');
    localStorage.setItem(migrationKey, 'true');
  }
  const session = JSON.parse(sessionStorage.getItem('geds_session') || 'null');
  if (!session) {
    window.location.replace('login.html');
  }
} catch {
  window.location.replace('login.html');
}
