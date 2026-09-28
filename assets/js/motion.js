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
})();
