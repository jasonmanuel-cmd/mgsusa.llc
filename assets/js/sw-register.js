/* Master Glass Solutions — service worker registration.
 *
 * This lived as an inline snippet on 7 of 60 pages. The other 53 — every city
 * landing page among them — never registered the worker, so the visitor most
 * likely to arrive from a local search was the one least likely to get the
 * caching the worker exists to provide. It is one file loaded everywhere now,
 * so the next page added inherits it instead of needing someone to remember.
 *
 * Deliberately silent. The old snippet logged both success and failure to the
 * console on every page load, which is noise in a visitor's console and tells
 * them nothing they can act on.
 *
 * Registration is best-effort by design. If the browser has no serviceWorker,
 * if the page is on a non-secure origin, or if registration throws, nothing
 * here is allowed to surface — the site works perfectly well without a worker,
 * and a caching optimisation must never be able to break a page. Same rule as
 * the call tracker: an enhancement that can take the page down with it is not
 * an enhancement.
 */
(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  /* After load, so registration never competes with rendering or with the
     first paint on a slow connection. */
  window.addEventListener('load', function () {
    try {
      navigator.serviceWorker.register('/service-worker.js').catch(function () {
        /* Swallowed. A failed registration means no offline cache, which is
           the state every first-time visitor is in anyway. */
      });
    } catch (e) {
      /* Some browsers throw synchronously on a blocked or insecure origin. */
    }
  });
})();
