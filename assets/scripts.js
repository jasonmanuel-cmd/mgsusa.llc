/* Lightweight interaction layer: no third-party scripts required for the visual prototype.
   Error handling to prevent console pollution from missing elements. */
(function() {
  'use strict';
  
  try {
    // Mobile menu toggle
    const toggle = document.querySelector('[data-menu-toggle]');
    const mobileNav = document.querySelector('[data-mobile-nav]');
    if (toggle && mobileNav) {
      toggle.addEventListener('click', function() {
        const open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        toggle.setAttribute('aria-label', open ? 'Open navigation' : 'Close navigation');
        mobileNav.classList.toggle('is-open', !open);
        document.body.classList.toggle('menu-open', !open);
      });
      mobileNav.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
          toggle.setAttribute('aria-expanded', 'false');
          toggle.setAttribute('aria-label', 'Open navigation');
          mobileNav.classList.remove('is-open');
          document.body.classList.remove('menu-open');
        });
      });
    }
  } catch (e) {
    console.error('Menu toggle initialization failed:', e);
  }
  
  try {
    // Year footer
    document.querySelectorAll('[data-year]').forEach(function(el) { 
      el.textContent = new Date().getFullYear(); 
    });
  } catch (e) {
    console.error('Year footer update failed:', e);
  }
  
  try {
    // Tracking-ready hooks. Replace these CustomEvents with GTM/GA4 and CRM events at launch.
    document.querySelectorAll('a[href^="tel:"]').forEach(function(link) {
      link.addEventListener('click', function() {
        if (window.CustomEvent) {
          window.dispatchEvent(new CustomEvent('mgs:call-click', { detail: { href: link.href, page: location.pathname } }));
        }
      });
    });
    
    document.querySelectorAll('[data-lead-form]').forEach(function(form) {
      form.addEventListener('submit', function() {
        if (window.CustomEvent) {
          window.dispatchEvent(new CustomEvent('mgs:lead-submit', { detail: { service: form.querySelector('[name="service"]')?.value || '', page: location.pathname } }));
        }
      });
    });
  } catch (e) {
    console.error('Event tracking initialization failed:', e);
  }

  try {
    // Scroll-reveal animation with IntersectionObserver
    const revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length > 0 && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) { 
          if (e.isIntersecting) { 
            e.target.classList.add('revealed'); 
            io.unobserve(e.target); 
          } 
        });
      }, { threshold: 0.12 });
      revealEls.forEach(function(el) { io.observe(el); });
    } else if (revealEls.length > 0) {
      revealEls.forEach(function(el) { el.classList.add('revealed'); });
    }
  } catch (e) {
    console.error('Scroll reveal animation failed:', e);
  }

  try {
    // Brand reveal animation - welcoming door opening with logo (only if element exists)
    var brandReveal = document.getElementById('brandReveal');
    if (brandReveal) {
      // Auto-open doors after 2.5 seconds
      setTimeout(function() {
        brandReveal.classList.add('brand-reveal-opened');
        // Hide the reveal screen after animation completes
        setTimeout(function() {
          brandReveal.style.opacity = '0';
          setTimeout(function() {
            brandReveal.style.display = 'none';
            document.body.style.overflow = '';
          }, 600);
        }, 1800);
      }, 2500);
    }
  } catch (e) {
    console.error('Brand reveal animation failed:', e);
  }

  try {
    // Lightbox: project photos are shown cropped (center/cover) in the grid.
    // Clicking one opens it uncropped (object-fit: contain) in a native <dialog>.
    var figures = [].slice.call(document.querySelectorAll('.gallery-grid figure'));
    var items = figures.map(function(fig) {
      var match = (getComputedStyle(fig).backgroundImage || '').match(/url\(["']?([^"')]+)["']?\)/);
      var cap = fig.querySelector('figcaption');
      var tagEl = cap && cap.querySelector('span');
      var labelEl = cap && cap.querySelector('b');
      return {
        el: fig,
        src: match ? match[1] : '',
        tag: tagEl ? tagEl.textContent : '',
        label: labelEl ? labelEl.textContent : ''
      };
    }).filter(function(item) { return item.src; });

    if (items.length && typeof HTMLDialogElement === 'function') {
      var dialog = document.createElement('dialog');
      dialog.className = 'lightbox';
      dialog.innerHTML =
        '<button class="lightbox-close" type="button" aria-label="Close image viewer">&times;</button>' +
        '<button class="lightbox-nav lightbox-prev" type="button" aria-label="Previous image">&#8249;</button>' +
        '<button class="lightbox-nav lightbox-next" type="button" aria-label="Next image">&#8250;</button>' +
        '<figure class="lightbox-figure"><img class="lightbox-img" alt="">' +
        '<figcaption class="lightbox-cap"><span></span><b></b></figcaption></figure>';
      document.body.appendChild(dialog);

      var lbImg = dialog.querySelector('.lightbox-img');
      var lbTag = dialog.querySelector('.lightbox-cap span');
      var lbLabel = dialog.querySelector('.lightbox-cap b');
      var current = 0;

      function showItem(i) {
        current = (i + items.length) % items.length;
        var item = items[current];
        lbImg.src = item.src;
        lbImg.alt = item.label || item.tag;
        lbTag.textContent = item.tag;
        lbLabel.textContent = item.label;
      }

      function openItem(i) {
        showItem(i);
        document.body.classList.add('lightbox-open');
        dialog.showModal();
      }

      if (items.length < 2) {
        dialog.querySelector('.lightbox-prev').hidden = true;
        dialog.querySelector('.lightbox-next').hidden = true;
      }

      items.forEach(function(item, i) {
        item.el.classList.add('is-zoomable');
        item.el.setAttribute('role', 'button');
        item.el.setAttribute('tabindex', '0');
        item.el.setAttribute('aria-label', 'View larger image: ' + (item.label || item.tag));
        item.el.addEventListener('click', function() { openItem(i); });
        item.el.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openItem(i); }
        });
      });

      dialog.querySelector('.lightbox-close').addEventListener('click', function() { dialog.close(); });
      dialog.querySelector('.lightbox-prev').addEventListener('click', function() { showItem(current - 1); });
      dialog.querySelector('.lightbox-next').addEventListener('click', function() { showItem(current + 1); });
      // Click on the backdrop (the dialog element itself) closes the viewer.
      dialog.addEventListener('click', function(e) { if (e.target === dialog) dialog.close(); });
      dialog.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); showItem(current - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); showItem(current + 1); }
      });
      // Keep the scroll lock in sync however the viewer was dismissed (close
      // button, backdrop click, or ESC). Engines differ on which of
      // 'close'/'toggle' they fire, so listen for both and read dialog.open.
      function syncScrollLock() {
        document.body.classList.toggle('lightbox-open', dialog.open);
      }
      dialog.addEventListener('close', syncScrollLock);
      dialog.addEventListener('toggle', syncScrollLock);
    }
  } catch (e) {
    console.error('Lightbox initialization failed:', e);
  }
})();
