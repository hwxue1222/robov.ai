fetch('/api/robov/offer').then(response => response.ok ? response.json() : null).then(offer => {
  if (!offer?.signupEnabled) return;
  const element = document.querySelector('#signup-offer');
  if (!element) return;
  element.hidden = false;
  element.textContent = `注册成功赠送 ${offer.signupPoints} ROBOV points`;
  const language = localStorage.getItem('robov-language') || 'zh';
  if (language === 'en') element.textContent = `${offer.signupPoints} ROBOV points when you register`;
  if (language === 'ms') element.textContent = `Terima ${offer.signupPoints} mata ROBOV apabila anda mendaftar`;
  window.addEventListener('robov:language', () => {
    const lang = localStorage.getItem('robov-language') || 'zh';
    element.textContent = lang === 'ms' ? `Terima ${offer.signupPoints} mata ROBOV apabila anda mendaftar` : lang === 'en' ? `${offer.signupPoints} ROBOV points when you register` : `注册成功赠送 ${offer.signupPoints} ROBOV points`;
  });
}).catch(() => {});
