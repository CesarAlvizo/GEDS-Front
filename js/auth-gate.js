// Run synchronously in each protected page's <head> to prevent content
// from appearing before the client-side session check completes.
try {
  const session = JSON.parse(localStorage.getItem('geds_session') || 'null');
  if (!session) {
    window.location.replace('login.html');
  } else {
    const isSuperAdmin = (session.rol === 'SUPERADMIN' || session.id === 1);
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Si un cliente intenta entrar a la consola de SuperAdmin, lo regresamos al dashboard
    if (currentPage === 'admin-tenants.html' && !isSuperAdmin) {
      window.location.replace('dashboard.html');
    }
  }
} catch {
  window.location.replace('login.html');
}
