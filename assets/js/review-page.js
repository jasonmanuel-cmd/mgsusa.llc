/* 
  Master Glass Solutions — /review page (customer satisfaction form).
  Decodes the signed review token (?c=...), captures a star rating, runs
  Cloudflare Turnstile (optional at runtime), submits to /api/review-submit.
*/
(function () {
  'use strict';

  var SESSION_KEY = 'mgs.review.session';
  var TURNSTILE_SITE_KEY = '0x4AAAAAAEGumU2z9QHnLmlL';
  var TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';

  var form = document.getElementById('review-form');
  var intro = document.getElementById('review-intro');
  var prefill = document.getElementById('review-prefill');
  var nameEl = document.getElementById('review-name');
  var emailEl = document.getElementById('review-email');
  var commentsEl = document.getElementById('review-comments');
  var errorEl = document.getElementById('review-error');
  var submitBtn = document.getElementById('review-submit');
  var turnstileWrap = document.getElementById('turnstile-widget');

  var rating = 0;
  var turnstileToken = null;
  var turnstileReady = false;
  var pageToken = null;

  /* ---------- helpers ---------- */

  function base64UrlDecode(str) {
    var b64 = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) { b64 += '='; }
    return decodeURIComponent(escape(atob(b64)));
  }

  function getToken() {
    try {
      return new URLSearchParams(window.location.search).get('c') || null;
    } catch (e) {
      return null;
    }
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  function setFormEnabled(on) {
    submitBtn.disabled = !on;
    if (!on) { submitBtn.setAttribute('aria-busy', 'true'); }
    else { submitBtn.removeAttribute('aria-busy'); }
  }

  function showDone(message) {
    var done = document.createElement('div');
    done.className = 'review-done';
    done.innerHTML =
      '<span class="review-check" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span>' +
      '<h2>Thank you!</h2>' +
      '<p>' + message + '</p>';
    var card = document.querySelector('.review-card');
    card.replaceChildren(done);
  }

  /* ---------- star rating ---------- */

  function paintStars() {
    var buttons = document.querySelectorAll('.star-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', String(Number(buttons[i].getAttribute('data-rating')) <= rating));
    }
  }

  function setRating(value) {
    rating = Number(value);
    paintStars();
    submitBtn.disabled = !(rating > 0 && canSubmit());
  }

  function canSubmit() {
    if (turnstileReady && !turnstileToken) { return false; }
    return true;
  }

  /* ---------- turnstile ---------- */

  window.onTurnstileLoad = function () {
    if (!window.turnstile || !turnstileWrap) { return; }
    turnstileReady = true;
    try {
      window.turnstile.render(turnstileWrap, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: function (token) { turnstileToken = token; clearError(); submitBtn.disabled = !(rating > 0); },
        'expired-callback': function () { turnstileToken = null; submitBtn.disabled = !(rating > 0); },
        'error-callback': function () { turnstileToken = null; submitBtn.disabled = !(rating > 0); }
      });
    } catch (e) {
      turnstileReady = false;
    }
  };

  function loadTurnstile() {
    if (window.turnstile) {
      window.onTurnstileLoad();
      return;
    }
    var s = document.createElement('script');
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.onerror = function () { turnstileReady = false; };
    document.head.appendChild(s);
  }

  /* ---------- submit ---------- */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();

    if (rating < 1 || rating > 5) {
      showError('Please choose a rating from 1 to 5 stars.');
      return;
    }
    if (turnstileReady && !turnstileToken) {
      showError('Please complete the security check.');
      return;
    }

    setFormEnabled(false);
    submitBtn.textContent = 'Sending…';

    var body = {
      token: pageToken,
      rating: rating,
      comments: commentsEl ? commentsEl.value.trim() : ''
    };
    if (turnstileToken) { body.turnstileToken = turnstileToken; }

    fetch('/api/review-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    }).then(function (result) {
      if (result.ok && result.data && result.data.ok) {
        try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e2) {}
        window.location.href = result.data.redirect || '/thank-you';
        return;
      }
      setFormEnabled(true);
      submitBtn.textContent = 'Send feedback';
      showError((result.data && result.data.error) || 'Something went wrong. Please try again.');
    }).catch(function () {
      setFormEnabled(true);
      submitBtn.textContent = 'Send feedback';
      showError('Could not reach the server. Please check your connection and try again.');
    });
  });

  /* ---------- init ---------- */

  (function init() {
    document.querySelectorAll('.star-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setRating(btn.getAttribute('data-rating'));
      });
    });

    pageToken = getToken();
    if (!pageToken) {
      intro.textContent = 'This feedback link is invalid or expired. Please contact us directly.';
      form.hidden = true;
      return;
    }

    try {
      var payload = JSON.parse(base64UrlDecode(pageToken.split('.')[0]));
      if (payload && payload.name) { nameEl.textContent = payload.name; }
      if (payload && payload.email) { emailEl.textContent = payload.email; }
      if (payload && (payload.name || payload.email)) { prefill.hidden = false; }
    } catch (e) {
      /* keep form usable even if prefill fails */
    }

    loadTurnstile();
  })();
})();
