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

  // Scroll-reveal animation
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('revealed'));
  }

  // Glass Doors Password Gate + Splash Screen
  const doorOverlay = document.getElementById('glassDoorsOverlay');
  if (doorOverlay) {
    const STORAGE_KEY = 'mgs_gate_auth';
    const PASSCODE = 'Glass2026';
    const gateForm = document.getElementById('gateForm');
    const gateInput = document.getElementById('gatePassword');
    const gateError = document.getElementById('gateError');
    const splash = document.getElementById('glassSplash');
    const gate = document.getElementById('glassGate');

    const openDoors = () => {
      doorOverlay.classList.add('doors-opened');
      document.body.style.overflow = '';
      setTimeout(() => { doorOverlay.style.display = 'none'; }, 1500);
    };

    const openSplashDoors = () => {
      splash.classList.add('splash-opening');
      // After splash doors finish opening, fade gate in
      setTimeout(() => {
        splash.style.display = 'none';
        gate.classList.add('gate-visible');
      }, 1400);
    };

    // If already authenticated, skip everything
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      doorOverlay.style.display = 'none';
    } else {
      // Lock scroll while gate/splash is showing
      document.body.style.overflow = 'hidden';
      // Start splash door animation after 5 seconds
      if (splash) {
        setTimeout(openSplashDoors, 5000);
      }
    }

    if (gateForm) {
      gateForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = gateInput.value.trim();
        if (val === PASSCODE) {
          localStorage.setItem(STORAGE_KEY, '1');
          gateError.classList.remove('visible');
          openDoors();
        } else {
          gateError.classList.add('visible');
          gateInput.classList.add('gate-shake');
          gateInput.value = '';
          gateInput.focus();
          setTimeout(() => gateInput.classList.remove('gate-shake'), 450);
        }
      });
    }
  }
})();
