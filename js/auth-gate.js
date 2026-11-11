// Run synchronously in each protected page's <head> to prevent dashboard content
// from appearing before the client-side session check completes.
try {
  const session = JSON.parse(localStorage.getItem('geds_session') || 'null');
  if (!session) window.location.replace('login.html');
} catch {
  window.location.replace('login.html');
}
