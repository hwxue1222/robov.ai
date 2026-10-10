fetch('/api/robov/offer').then(response => response.ok ? response.json() : null).then(offer => {
  if (!offer?.signupEnabled) return;
  const element = document.querySelector('#signup-offer');
  if (!element) return;
  element.hidden = false;
  element.textContent = `注册成功赠送 ${offer.signupPoints} points`;
  const language = localStorage.getItem('robov-language') || 'zh';
  if (language === 'en') element.textContent = `Receive ${offer.signupPoints} points when you register`;
  if (language === 'ms') element.textContent = `Terima ${offer.signupPoints} mata apabila anda mendaftar`;
  window.addEventListener('robov:language', () => {
    const lang = localStorage.getItem('robov-language') || 'zh';
    element.textContent = lang === 'ms' ? `Terima ${offer.signupPoints} mata apabila anda mendaftar` : lang === 'en' ? `Receive ${offer.signupPoints} points when you register` : `注册成功赠送 ${offer.signupPoints} points`;
  });
}).catch(() => {});
