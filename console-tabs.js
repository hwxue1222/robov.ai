(function () {
  const groups = {
    operations: ['console-scan', 'console-transactions', 'interaction-form'],
    activities: ['activity-management'],
    policy: ['earn-policy-panel'],
    invitations: ['invitation-management'],
    members: ['member-activity-panel', 'reward-admin'],
    users: ['staff-account-management'],
    refunds: ['refund-form'],
    profile: ['user-profile']
  };
  const buttons = Array.from(document.querySelectorAll('[data-console-tab]'));
  let selected = 'operations';
  const panels = key => groups[key].map(id => document.getElementById(id));
  function render() {
    for (const button of buttons) button.hidden = panels(button.dataset.consoleTab).every(panel => panel.hidden);
    if (buttons.find(button => button.dataset.consoleTab === selected).hidden) selected = 'operations';
    for (const button of buttons) {
      const active = button.dataset.consoleTab === selected;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      for (const panel of panels(button.dataset.consoleTab)) panel.toggleAttribute('data-console-inactive', !active);
    }
  }
  function activate(button) {
    if (button.hidden) return;
    const next = button.dataset.consoleTab;
    if (selected === 'operations' && next !== selected) {
      const stop = document.getElementById('stop-camera');
      if (!stop.disabled) stop.click();
    }
    selected = next;
    render();
  }
  const observer = new MutationObserver(render);
  for (const button of buttons) {
    button.setAttribute('aria-controls', groups[button.dataset.consoleTab].join(' '));
    for (const panel of panels(button.dataset.consoleTab)) {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      observer.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
    }
    button.addEventListener('click', () => activate(button));
    button.addEventListener('keydown', event => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const visible = buttons.filter(item => !item.hidden), index = visible.indexOf(button);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? visible.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + visible.length) % visible.length;
      visible[next].focus();
      activate(visible[next]);
    });
  }
  render();
})();
