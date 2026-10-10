(function () {
  const $ = selector => document.querySelector(selector);
  const video = $('#scan-video');
  const cameraStatus = $('#camera-status');
  let running = false, verification = 0;
  const errorMessages = {
    NotAllowedError: '摄像头权限被拒绝，请允许访问后重试',
    NotFoundError: '没有找到摄像头，可选择二维码图片',
    NotReadableError: '摄像头被其他应用占用，请关闭后重试',
    OverconstrainedError: '所选摄像头不可用，请选择其他摄像头',
    SecurityError: '摄像头需要 HTTPS 安全连接'
  };
  const show = message => { cameraStatus.textContent = message; };
  function controls(active) {
    running = active; $('#start-camera').disabled = active || window.RobovSelectedMember.active || window.RobovSelectedMember.busy;
    $('#stop-camera').disabled = !active; $('#camera-device').disabled = !active;
    $('#camera-preview').hidden = !active;
  }
  function stop() { scanner.stop(); controls(false); }
  function fail(error) { stop(); show(errorMessages[error.name] || error.message || '无法启动摄像头，请重试'); }
  async function accept(token) {
    if (window.RobovSelectedMember.busy || window.RobovSelectedMember.active) return;
    stop(); $('#scan-token').value = ''; $('#scanned-member').textContent = '';
    const attempt = ++verification;
    const storeId = $('#staff-store').value;
    window.RobovSelectedMember.verifying(true);
    try {
    show('正在验证会员码…');
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) || token.length > 1024) throw new Error('不是有效的 ROBOV 会员码');
    const response = await fetch('/api/robov/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'scan', storeId, qrToken: token }) }).catch(error=>{if(attempt!==verification)return null;throw error;});
    if(!response)return;
    const result = await response.json();
    if (attempt !== verification || storeId !== $('#staff-store').value) return;
    if (!response.ok) throw new Error(result.error || '会员码验证失败');
    $('#scan-token').value = '';
    $('#scanned-member').textContent = result.member.displayName || 'ROBOV Member';
    $('#staff-status').textContent = '';
    window.RobovSelectedMember.set(result.memberSessionToken);
    show('会员码已验证，摄像头已关闭');
    } finally { window.RobovSelectedMember.verifying(false); }
  }
  const scanner = new window.RobovCameraScanner({ video, canvas: document.createElement('canvas'), decode: window.RobovQR.decode, onResult: accept, onError: fail, mediaDevices: navigator.mediaDevices });
  async function start() {
    if (window.RobovSelectedMember.busy || window.RobovSelectedMember.active) return;
    verification++; $('#scan-token').value = ''; $('#scanned-member').textContent = '';
    if (!window.isSecureContext) { show('摄像头需要 HTTPS 安全连接'); return; }
    if (!navigator.mediaDevices?.getUserMedia) { show('此浏览器不支持摄像头，可选择二维码图片'); return; }
    if (!$('#staff-store').value) { show('请先选择门店'); return; }
    controls(true); show('正在启动摄像头…');
    try {
      if (!await scanner.start($('#camera-device').value)) return;
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(device => device.kind === 'videoinput');
      if (!running) return;
      $('#camera-device').replaceChildren(...devices.map((device, index) => {
        const option = document.createElement('option'); option.value = device.deviceId;
        option.textContent = device.label || `Camera ${index + 1}`; return option;
      }));
      $('#camera-device').value = scanner.stream?.getVideoTracks()[0]?.getSettings().deviceId || '';
      show('摄像头已开启，等待会员二维码');
    } catch (error) { fail(error); }
  }
  $('#start-camera').addEventListener('click', start);
  $('#stop-camera').addEventListener('click', () => { verification++; stop(); show('摄像头已关闭'); });
  $('#camera-device').addEventListener('change', start);
  $('#read-qr-image').addEventListener('click', () => $('#qr-image').click());
  $('#identify-member').addEventListener('click', () => accept($('#scan-token').value.trim()).catch(fail));
  $('#qr-image').addEventListener('change', async event => {
    stop(); const selection=++verification;const file = event.target.files[0]; event.target.value = '';
    if (!file) return;
    try {
      if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024) throw new Error('请选择小于 15MB 的二维码图片');
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas'); const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const token = window.RobovQR.decode(context.getImageData(0, 0, canvas.width, canvas.height));
      if(selection!==verification)return;
      if (!token) throw new Error('未识别到二维码，请选择清晰图片');
      await accept(token);
    } catch (error) { fail(error); }
  });
  $('#staff-store').addEventListener('change', () => { verification++; stop(); $('#scan-token').value = ''; $('#scanned-member').textContent = ''; show('请重新扫描会员码'); });
  $('#scan-token').addEventListener('input', () => { verification++; $('#scanned-member').textContent = ''; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { verification++; stop(); show('摄像头已关闭'); } });
  window.addEventListener('pagehide', stop);
  window.addEventListener('robov-member-cleared', () => { verification++; stop(); show('请重新扫描会员码'); });
  window.RobovQR.icons(); controls(false);
})();
