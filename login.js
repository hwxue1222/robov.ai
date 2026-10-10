(async () => {
  const $ = selector => document.querySelector(selector);
  let mode = new URLSearchParams(location.search).get('mode') === 'employee' ? 'employee' : 'member';
  let signup = new URLSearchParams(location.search).get('action') === 'register' && mode === 'member';
  function render() {
    document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.mode === mode)));
    $('#login-title').textContent = signup ? '注册会员' : mode === 'employee' ? '员工登录' : '会员登录';
    $('#login-submit').textContent = signup ? '创建会员账号' : '登录';
    $('#identifier-label').textContent = signup ? '邮箱' : '邮箱或用户名';
    $('#signup-name').hidden = !signup;
    $('#signup-toggle').hidden = mode === 'employee';
    $('#signup-toggle').textContent = signup ? '已有账号，返回登录' : '注册会员';
    $('#login-password').autocomplete = signup ? 'new-password' : 'current-password';
    $('#login-status').textContent = '';
  }
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => { mode = button.dataset.mode; signup = false; render(); }));
  $('#signup-toggle').addEventListener('click', () => { signup = !signup; render(); });
  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault(); $('#login-submit').disabled = true; $('#login-status').textContent = '正在登录…';
    try {
      const identifier = $('#login-identifier').value.trim();
      const response = await fetch('/api/robov/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: signup ? 'register' : 'login', mode, identifier, email: identifier, password: $('#login-password').value, displayName: $('#login-name').value.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'LOGIN_FAILED');
      location.assign(mode === 'employee' ? './staff.html' : './robov.html');
    } catch (error) { $('#login-status').textContent = error.message; $('#login-submit').disabled = false; }
  });
  render();
  try {
    const response = await fetch('/api/robov/session');
    const { user } = await response.json();
    if (response.ok && user) location.replace(user.isEmployee ? './staff.html' : './robov.html');
  } catch { /* The sign-in form remains available when session lookup fails. */ }
})();
