/* Master Glass Solutions — click-to-call tracking.
 *
 * Fifty-seven pages carry a tel: link and nothing counted a single one of
 * them. Five analytics systems were loaded — GTM, GA4, HubSpot, Vercel and
 * Simple Analytics — and none measured the one action that is actually the
 * conversion for this business. "Why am I not getting calls?" was unanswerable
 * because nobody could say whether the site produced zero calls or twenty.
 *
 * THE RULE: this must never interfere with the call.
 *
 * Same principle as the Turnstile gate that once refused real leads — a
 * measurement convenience must not stand between a customer and the business.
 * So: no preventDefault, no await, no navigation rewriting. The listener is
 * passive and capture-phase, every send is fire-and-forget inside try/catch,
 * and if every analytics global is missing the click proceeds untouched. A
 * tracking failure costs a data point; blocking a tap costs a job.
 *
 * It reports where the tap came from, not just that one happened. "Nineteen
 * calls, sixteen from the sticky mobile button" is a decision you can act on;
 * "nineteen calls" is not.
 */
(function () {
  'use strict';

  var EVENT = 'click_to_call';
  var DEDUPE_MS = 1200;      // a double-tap on mobile is one intent, not two
  var lastKey = '';
  var lastAt = 0;

  /* Where on the page the tap happened. Ordered most-specific first, because a
     link can match several of these and the narrowest answer is the useful one. */
  function sourceOf(el) {
    if (el.closest('.mobile-call-fab')) return 'sticky_mobile_button';
    if (el.closest('.utility')) return 'utility_bar';
    if (el.closest('.site-header')) return 'header';
    if (el.closest('.mobile-nav')) return 'mobile_nav';
    if (el.closest('.inner-hero, .hero-home, .hero-actions')) return 'hero';
    if (el.closest('.final-cta')) return 'final_cta';
    if (el.closest('footer')) return 'footer';
    if (el.closest('.emergency-band-inline, .emergency-actions')) return 'emergency_band';
    return 'content';
  }

  function digits(href) {
    return String(href || '').replace(/^tel:/i, '').replace(/[^0-9+]/g, '');
  }

  /* Sent to every analytics layer that happens to be present. They are checked
     independently rather than as a chain: whichever ones load, all of them get
     it, and a thrown error in one cannot stop the others. */
  function send(params) {
    try { if (window.gtag) window.gtag('event', EVENT, params); } catch (e) {}
    try {
      if (window.dataLayer && window.dataLayer.push) {
        window.dataLayer.push(Object.assign({ event: EVENT }, params));
      }
    } catch (e) {}
    try { if (window.va) window.va('event', { name: EVENT, data: params }); } catch (e) {}
    try {
      if (window.sa_event) window.sa_event(EVENT, params);
    } catch (e) {}
  }

  function onClick(ev) {
    try {
      var el = ev.target && ev.target.closest ? ev.target.closest('a[href^="tel:"]') : null;
      if (!el) return;

      var num = digits(el.getAttribute('href'));
      var src = sourceOf(el);
      var key = src + '|' + num;
      var now = Date.now();
      if (key === lastKey && now - lastAt < DEDUPE_MS) return;
      lastKey = key; lastAt = now;

      send({
        source: src,
        phone_number: num,
        page_path: location.pathname,
        page_title: document.title,
        link_text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)
      });
    } catch (e) {
      /* Swallowed on purpose. Whatever went wrong here, the tap still needs to
         dial — the default action was never prevented and nothing above this
         line can stop it. */
    }
  }

  /* Capture phase so the event is seen even if something downstream stops
     propagation; passive so the browser never waits on this to start dialling. */
  document.addEventListener('click', onClick, { capture: true, passive: true });

  /* Long-press / context menu on a phone link is intent too, and on desktop it
     is often how someone copies the number. Same dedupe, same payload. */
  document.addEventListener('contextmenu', onClick, { capture: true, passive: true });
})();
