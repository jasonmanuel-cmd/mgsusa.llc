/* Project slideshow - Master Glass Solutions.
   Progressive enhancement over a plain list of slides: without JS the markup
   is a scrollable strip of figures, so the photos are still reachable.

   Notes for future edits:
   - Only the first slide is eager. The rest carry loading="lazy" and are
     nudged one ahead of the viewer, so a visitor who never advances pays for
     one image instead of fifty.
   - Autoplay honours prefers-reduced-motion, pauses on hover, focus and when
     the tab is hidden, and has a visible pause control (WCAG 2.2.2).
   - Pages with more than DOTS_MAX slides show a counter instead of dots;
     fifty-seven dots is not a control, it is confetti. */
(function () {
  'use strict';

  var AUTOPLAY_MS = 3000;
  var DOTS_MAX = 12;
  var SWIPE_MIN = 40;

  function reducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  function init(root) {
    var track = root.querySelector('[data-slideshow-track]');
    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-slideshow-slide]'));
    if (!track || slides.length < 2) { return; }

    var status = root.querySelector('[data-slideshow-status]');
    var dotsWrap = root.querySelector('[data-slideshow-dots]');
    var counter = root.querySelector('[data-slideshow-count]');
    var toggle = root.querySelector('[data-slideshow-toggle]');
    var index = 0;
    var timer = null;
    var userPaused = false;
    var suspended = false;
    var dots = [];

    if (dotsWrap && slides.length <= DOTS_MAX) {
      slides.forEach(function (_, i) {
        var d = document.createElement('button');
        d.type = 'button';
        d.className = 'slideshow-dot';
        d.setAttribute('role', 'tab');
        d.setAttribute('aria-label', 'Show project ' + (i + 1));
        d.addEventListener('click', function () { takeOver(); goTo(i); });
        dotsWrap.appendChild(d);
        dots.push(d);
      });
    } else if (dotsWrap) {
      dotsWrap.remove();
    }

    /* Keep the next slide one step ahead of the viewer. */
    function warm(i) {
      [i, i + 1].forEach(function (n) {
        var s = slides[n];
        if (!s) { return; }
        var img = s.querySelector('img');
        if (img && img.loading === 'lazy') { img.loading = 'eager'; }
      });
    }

    function render() {
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      slides.forEach(function (s, i) {
        s.setAttribute('aria-hidden', i === index ? 'false' : 'true');
        /* Off-screen slides must not be tab stops. */
        s.querySelectorAll('a, button').forEach(function (el) {
          el.tabIndex = i === index ? 0 : -1;
        });
      });
      dots.forEach(function (d, i) {
        d.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
      if (counter) { counter.textContent = (index + 1) + ' / ' + slides.length; }
      if (status) { status.textContent = 'Project ' + (index + 1) + ' of ' + slides.length; }
      warm(index);
    }

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      render();
    }
    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }

    /* Two separate ideas, deliberately not merged: userPaused is what the
       visitor asked for with the toggle, suspended is a temporary hold while
       they hover, focus or leave the tab. Collapsing them into one flag makes
       the toggle read the hover state and do the opposite of its own label. */
    function wanted() {
      return !userPaused && !suspended && !reducedMotion() && slides.length > 1;
    }
    function sync() {
      var run = wanted();
      if (run && !timer) { timer = setInterval(next, AUTOPLAY_MS); }
      else if (!run && timer) { clearInterval(timer); timer = null; }
      if (toggle) {
        toggle.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
        toggle.setAttribute('data-state', userPaused ? 'paused' : 'playing');
      }
    }
    function suspend() { suspended = true; sync(); }
    function resume() { suspended = false; sync(); }
    /* Stepping through by hand is a decision to stop the carousel moving. */
    function takeOver() { userPaused = true; sync(); }

    var prevBtn = root.querySelector('[data-slideshow-prev]');
    var nextBtn = root.querySelector('[data-slideshow-next]');
    if (prevBtn) { prevBtn.addEventListener('click', function () { takeOver(); prev(); }); }
    if (nextBtn) { nextBtn.addEventListener('click', function () { takeOver(); next(); }); }
    if (toggle) {
      toggle.addEventListener('click', function () { userPaused = !userPaused; sync(); });
    }

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { takeOver(); prev(); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { takeOver(); next(); e.preventDefault(); }
    });

    root.addEventListener('mouseenter', suspend);
    root.addEventListener('mouseleave', resume);
    root.addEventListener('focusin', suspend);
    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) { resume(); }
    });
    document.addEventListener('visibilitychange', function () {
      document.hidden ? suspend() : resume();
    });

    var startX = null;
    root.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (startX === null) { return; }
      var dx = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) < SWIPE_MIN) { return; }
      stop();
      dx < 0 ? next() : prev();
    }, { passive: true });

    root.classList.add('is-ready');
    render();
    sync();
  }

  function boot() {
    document.querySelectorAll('[data-slideshow]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
