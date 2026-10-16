/* Motion layer — mgsusa.llc
 *
 * Partner to assets/css/motion.css. Its whole job is to decide what should
 * rise into view, and to prove it can do so before anything is hidden.
 *
 * The order matters and is the point: .motion-ready goes on <html> only after
 * this script has run, found its targets, and confirmed IntersectionObserver
 * exists. Until that class is present every hiding rule in the stylesheet is
 * inert, so a blocked script, an old browser or a JS error leaves the page
 * exactly as it renders today rather than leaving half of it invisible. That
 * failure -- content stuck at opacity 0 waiting for an observer that never
 * fires -- is the one this ordering exists to make impossible.
 */
(function () {
  'use strict';

  var root = document.documentElement;

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  /* Targets, in the order a visitor meets them. Each entry is a selector and
     whether its matches should stagger as a group -- cards in a grid look
     wrong arriving together and worse arriving one by one down a long page,
     so the stagger is capped below. */
  var TARGETS = [
    { sel: '.section-heading', stagger: false },
    { sel: '.service-card', stagger: true },
    { sel: '.article-card', stagger: true },
    { sel: '.path-card', stagger: true },
    { sel: '.gallery-grid > figure', stagger: true },
    { sel: '.check-list li', stagger: true },
    { sel: '.faq-item', stagger: true },
    { sel: '.final-cta-grid > *', stagger: true },
    { sel: '.split-info > *', stagger: true },
    { sel: '.workspace-grid > *', stagger: true },
    { sel: '.team-grid > article', stagger: true }
  ];

  var STAGGER_MS = 55;
  var STAGGER_MAX = 4;   // past the fourth item the delay is just latency
  var marked = [];

  TARGETS.forEach(function (t) {
    var groups = {};
    var nodes = document.querySelectorAll(t.sel);
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.hasAttribute('data-rise')) continue;

      /* Anything already on screen at load must not be hidden: hiding it and
         fading it back in is a flash of missing content, and it is what the
         reader is looking at. Reveal those immediately instead. */
      var top = el.getBoundingClientRect().top;
      el.setAttribute('data-rise', '');
      marked.push(el);

      if (top < (window.innerHeight || 0) * 0.92) {
        el.classList.add('is-in');
        continue;
      }

      if (t.stagger) {
        var key = el.parentNode ? (el.parentNode.__mgsKey || (el.parentNode.__mgsKey = 'g' + Math.random())) : 'x';
        groups[key] = (groups[key] || 0) + 1;
        var n = Math.min(groups[key] - 1, STAGGER_MAX);
        el.style.setProperty('--rise-delay', (n * STAGGER_MS) + 'ms');
      }
    }
  });

  if (!marked.length) return;

  // Only now is it safe for the stylesheet to hide anything.
  root.classList.add('motion-ready');

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  marked.forEach(function (el) {
    if (!el.classList.contains('is-in')) io.observe(el);
  });

  /* A safety net. If anything is still hidden a few seconds later -- an
     observer that never fired, a container that never became visible, a
     browser quirk -- show it. Invisible content is always the worse bug. */
  setTimeout(function () {
    marked.forEach(function (el) { el.classList.add('is-in'); });
  }, 4000);

  // Reading progress. The bar animates itself from CSS scroll-timeline where
  // that exists, and hides itself where it does not, so this only inserts it.
  if (CSS && CSS.supports && CSS.supports('animation-timeline: scroll()')) {
    var bar = document.createElement('div');
    bar.className = 'mgs-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
  }

  // 21st.dev Spotlight: tracks cursor coordinates for optical glass reflection
  if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
    document.addEventListener('pointermove', function (e) {
      var card = e.target && e.target.closest && e.target.closest(
        '.service-card, .path-card, .hero-panel a, .trust-grid > div, .gallery-grid > figure, .article-card'
      );
      if (!card) return;
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', (e.clientX - rect.left) + 'px');
      card.style.setProperty('--mouse-y', (e.clientY - rect.top) + 'px');
    }, { passive: true });
  }

  // 21st.dev Rolling Digit Ticker: smooth ease-out count-up upon scroll into view
  var countTargets = document.querySelectorAll('.trust-grid span b, .hero-proof span, [data-counter]');
  if (countTargets.length && 'IntersectionObserver' in window) {
    var counterIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        counterIo.unobserve(e.target);
        runCountUp(e.target);
      });
    }, { threshold: 0.15 });

    for (var c = 0; c < countTargets.length; c++) {
      var targetEl = countTargets[c];
      var raw = targetEl.textContent.trim();
      if (/^\d+/.test(raw)) {
        targetEl.setAttribute('data-target-text', raw);
        counterIo.observe(targetEl);
      }
    }
  }

  function runCountUp(el) {
    var fullText = el.getAttribute('data-target-text') || el.textContent.trim();
    var match = fullText.match(/^(\d+)(.*)$/);
    if (!match) return;
    var targetNum = parseInt(match[1], 10);
    var suffix = match[2];
    var duration = 1250;
    var start = null;

    function frame(now) {
      if (!start) start = now;
      var progress = Math.min((now - start) / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);
      var current = Math.floor(ease * targetNum);
      el.textContent = current + suffix;
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = fullText;
      }
    }
    requestAnimationFrame(frame);
  }

  // 21st.dev Before/After Comparison Sliders
  var compareSliders = document.querySelectorAll('[data-compare]');
  for (var i = 0; i < compareSliders.length; i++) {
    (function (slider) {
      var range = slider.querySelector('.mgs-compare-range');
      if (!range) return;

      function updatePos(val) {
        val = Math.max(0, Math.min(100, val));
        slider.style.setProperty('--compare-pos', val + '%');
        range.value = val;
      }

      range.addEventListener('input', function () {
        updatePos(parseFloat(range.value));
      });

      if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
        var isDragging = false;
        range.addEventListener('pointerdown', function () { isDragging = true; });
        window.addEventListener('pointerup', function () { isDragging = false; });

        slider.addEventListener('pointermove', function (e) {
          if (isDragging) return;
          var rect = slider.getBoundingClientRect();
          var x = e.clientX - rect.left;
          var percent = (x / rect.width) * 100;
          updatePos(percent);
        }, { passive: true });

        slider.addEventListener('pointerleave', function () {
          if (!isDragging) {
            updatePos(50);
          }
        });
      }
    })(compareSliders[i]);
  }

  // 21st.dev Interactive Glass Configurator (Option C: Specification-Only)
  var configurators = document.querySelectorAll('[data-configurator]');
  for (var k = 0; k < configurators.length; k++) {
    (function (cfg) {
      var state = {
        service: 'shower',
        glass: 'starphire',
        finish: 'black'
      };

      var DATA = {
        shower: {
          title: 'Custom Shower Enclosure',
          paramService: 'Shower enclosure',
          specs: {
            clear: { name: 'Standard Clear Tempered' },
            starphire: { name: '⅜″ Ultra-Clear Starphire (Low-Iron)' },
            heavy: { name: '½″ Heavy Architectural Tempered' },
            frosted: { name: '⅜″ Acid-Etched / Frosted Privacy' }
          },
          leadTime: '5–7 business days',
          included: 'PPG-Certified Glazing, 10-Yr Hardware Warranty'
        },
        storefront: {
          title: 'Commercial Storefront System',
          paramService: 'Storefront glass',
          specs: {
            clear: { name: 'Standard Clear Storefront IGU' },
            starphire: { name: 'Starphire Low-Iron Storefront' },
            heavy: { name: '½″ Heavy All-Glass Entry Doors' },
            frosted: { name: 'Privacy Tint / Obscure Healthcare' }
          },
          leadTime: '7–10 business days',
          included: 'Commercial Exit Hardware, ADA Compliance Review'
        },
        mirror: {
          title: 'Custom Architectural Mirrors',
          paramService: 'Mirror',
          specs: {
            clear: { name: '¼″ Polished Edge Flat Mirror' },
            starphire: { name: 'Low-Iron Starphire True-Color Mirror' },
            heavy: { name: '⅜″ Heavy Beveled Vanity Mirror' },
            frosted: { name: 'Custom Backlit / Sandblasted Accent' }
          },
          leadTime: '3–5 business days',
          included: 'Mastic & Safety Backing, J-Mold or French Cleat'
        },
        window: {
          title: 'Window Glass Replacement',
          paramService: 'Window glass replacement',
          specs: {
            clear: { name: 'Double-Pane Clear Insulated Unit' },
            starphire: { name: 'High-Performance Low-E Argon' },
            heavy: { name: 'Laminated Acoustic / Impact Glass' },
            frosted: { name: 'Obscure / Rain Glass Bathroom Window' }
          },
          leadTime: '3–5 business days',
          included: 'Precision Laser Measurement, Old Glass Haul-Away'
        }
      };

      var FINISH_NAMES = {
        black: 'Matte Black',
        brass: 'Brushed Brass / Satin Gold',
        chrome: 'Polished Chrome',
        nickel: 'Brushed Nickel'
      };

      var specTitleEl = cfg.querySelector('[data-config-spec-title]');
      var specGlassEl = cfg.querySelector('[data-config-spec-glass]');
      var specFinishEl = cfg.querySelector('[data-config-spec-finish]');
      var specLeadEl = cfg.querySelector('[data-config-spec-lead]');
      var specIncludeEl = cfg.querySelector('[data-config-spec-include]');
      var ctaEl = cfg.querySelector('[data-config-cta]');

      function render() {
        var sData = DATA[state.service] || DATA.shower;
        var gData = sData.specs[state.glass] || sData.specs.clear;
        var fName = FINISH_NAMES[state.finish] || 'Matte Black';

        if (specTitleEl) specTitleEl.textContent = sData.title;
        if (specGlassEl) specGlassEl.textContent = gData.name;
        if (specFinishEl) specFinishEl.textContent = fName;
        if (specLeadEl) specLeadEl.textContent = sData.leadTime;
        if (specIncludeEl) specIncludeEl.textContent = sData.included;

        if (ctaEl) {
          var queryDetails = 'Configured Spec: ' + sData.title + ' (' + gData.name + '), Finish: ' + fName + ', Typical Lead: ' + sData.leadTime;
          var href = '/request-quote?service=' + encodeURIComponent(sData.paramService) + '&details=' + encodeURIComponent(queryDetails);
          ctaEl.setAttribute('href', href);
        }
      }

      cfg.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('[data-config-key]');
        if (!btn) return;
        var group = btn.getAttribute('data-config-group');
        var key = btn.getAttribute('data-config-key');
        if (!group || !key) return;

        state[group] = key;
        var siblings = cfg.querySelectorAll('[data-config-group="' + group + '"]');
        for (var i = 0; i < siblings.length; i++) {
          siblings[i].classList.remove('is-active');
        }
        btn.classList.add('is-active');
        render();
      });

      render();
    })(configurators[k]);
  }
})();
