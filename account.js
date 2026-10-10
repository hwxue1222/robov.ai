document.querySelectorAll('.account-logout').forEach(button => button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    const response = await fetch('/api/robov/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
    if (!response.ok) throw new Error('LOGOUT_FAILED');
    window.RobovSession.clear();
    location.replace('./login.html');
  } catch { button.disabled = false; }
}));
