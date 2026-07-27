/* Lightweight interaction layer: no third-party scripts required for the visual prototype. */
(() => {
  const toggle = document.querySelector('[data-menu-toggle]');
  const mobileNav = document.querySelector('[data-mobile-nav]');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.setAttribute('aria-label', open ? 'Open navigation' : 'Close navigation');
      mobileNav.classList.toggle('is-open', !open);
      document.body.classList.toggle('menu-open', !open);
    });
    mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation');
      mobileNav.classList.remove('is-open');
      document.body.classList.remove('menu-open');
    }));
  }
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
  // Tracking-ready hooks. Replace these CustomEvents with GTM/GA4 and CRM events at launch.
  document.querySelectorAll('a[href^="tel:"]').forEach(link => link.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('mgs:call-click', { detail: { href: link.href, page: location.pathname } }));
  }));
  document.querySelectorAll('[data-lead-form]').forEach(form => form.addEventListener('submit', () => {
    window.dispatchEvent(new CustomEvent('mgs:lead-submit', { detail: { service: form.querySelector('[name="service"]')?.value || '', page: location.pathname } }));
  }));
})();
