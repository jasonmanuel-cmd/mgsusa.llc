/* Master Glass Solutions - AI website assistant (chat widget).
   Renders a floating launcher + dialog, talks to POST /api/chat (OpenAI),
   shows quick questions, persists the conversation per session, and fires
   GA4 events. Positioned clear of the mobile call FAB. */

(function () {
  'use strict';

  var STORAGE_KEY = 'mgs-chat-history-v1';
  var TURNSTILE_SITE_KEY = '0x4AAAAAAEGumU2z9QHnLmlL';
  var PHONE = '210-370-3700';
  var EMERGENCY_URL = '/emergency-glass-repair';

  function getServiceOptions() {
    return (window.MGS && window.MGS.serviceOptions) || null;
  }

  function getKnowledge() {
    return (window.MGS && window.MGS.companyKnowledge) || null;
  }

  // Turnstile tokens are single-use. The chat sends repeatedly, so we hold one
  // fresh token, hand it over, then reset the widget to mint the next one.
  var tsWidgetId = null;
  var tsToken = '';
  var tsWaiters = [];

  function setTurnstileToken(token) {
    tsToken = token || '';
    if (!tsToken) return;
    var waiting = tsWaiters.splice(0, tsWaiters.length);
    for (var i = 0; i < waiting.length; i++) waiting[i](tsToken);
  }

  function getTurnstileToken() {
    if (tsToken) return tsToken;
    try {
      if (!window.turnstile) return '';
      return (tsWidgetId == null
        ? window.turnstile.getResponse()
        : window.turnstile.getResponse(tsWidgetId)) || '';
    } catch (e) { /* ignore */ }
    return '';
  }

  // Resolves with a token, or '' once timed out so the request still goes
  // through and the server decides (fails closed) instead of hanging.
  function awaitTurnstileToken(timeoutMs) {
    var existing = getTurnstileToken();
    if (existing || !TURNSTILE_SITE_KEY || !window.turnstile) {
      return Promise.resolve(existing);
    }
    return new Promise(function (resolve) {
      var settled = false;
      function onToken(token) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(token || '');
      }
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        var idx = tsWaiters.indexOf(onToken);
        if (idx > -1) tsWaiters.splice(idx, 1);
        resolve('');
      }, timeoutMs || 8000);
      tsWaiters.push(onToken);
    });
  }

  function resetTurnstile() {
    tsToken = '';
    try {
      if (window.turnstile && tsWidgetId != null) window.turnstile.reset(tsWidgetId);
    } catch (e) { /* ignore */ }
  }

  function track(event, params) {
    try {
      if (window.gtag) {
        window.gtag('event', event, params || {});
      } else if (window.dataLayer) {
        window.dataLayer.push({ event: event, ...(params || {}) });
      }
    } catch (e) { /* ignore */ }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function nl2br(s) {
    return escapeHtml(s).replace(/\n/g, '<br>');
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  onReady(function () {
    var opts = getServiceOptions();
    var quickQuestions = (opts && opts.quickQuestions) || [];
    var knowledge = getKnowledge();
    var phone = (knowledge && knowledge.contact && knowledge.contact.phone) || PHONE;
    var emergencyUrl = (knowledge && knowledge.emergencyUrl) || EMERGENCY_URL;

    var root = document.createElement('div');
    root.className = 'mgs-chat';
    root.innerHTML =
      '<button type="button" class="mgs-chat__launcher" aria-expanded="false" aria-controls="mgs-chat-panel" aria-haspopup="dialog">' +
        '<span class="mgs-chat__launcher-icon" aria-hidden="true"></span>' +
        '<span class="mgs-chat__launcher-label">Chat with us</span>' +
        '<span class="mgs-chat__launcher-dot" aria-hidden="true"></span>' +
      '</button>' +
      '<div id="mgs-chat-panel" class="mgs-chat__panel" role="dialog" aria-modal="true" aria-label="Ask Master Glass Solutions a question" hidden>' +
        '<div class="mgs-chat__header">' +
          '<div class="mgs-chat__title">Ask our glass team</div>' +
          '<button type="button" class="mgs-chat__close" aria-label="Close chat">' +
            '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="mgs-chat__body" tabindex="-1">' +
          '<div class="mgs-chat__messages" role="log" aria-live="polite" aria-relevant="additions"></div>' +
          '<div class="mgs-chat__quick"></div>' +
        '</div>' +
        '<form class="mgs-chat__composer" novalidate>' +
          '<label class="visually-hidden" for="mgs-chat-input">Type your question</label>' +
          '<textarea id="mgs-chat-input" class="mgs-chat__input" rows="1" placeholder="Type your question…" autocomplete="off"></textarea>' +
          '<button type="submit" class="mgs-chat__send" aria-label="Send message">' +
            '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18"><path d="M1 9l16-7-6 15-3-6-7-2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
          '</button>' +
        '</form>' +
        '<div class="mgs-chat__verify"></div>' +
        '<div class="mgs-chat__footer">' +
          '<a href="tel:' + phone.replace(/[^+\d]/g, '') + '">Call ' + phone + '</a> ' +
          '<a href="/request-quote">Get a quote</a>' +
        '</div>' +
      '</div>';

    document.body.appendChild(root);

    var launcher = root.querySelector('.mgs-chat__launcher');
    var panel = root.querySelector('.mgs-chat__panel');
    var closeBtn = root.querySelector('.mgs-chat__close');
    var body = root.querySelector('.mgs-chat__body');
    var messagesEl = root.querySelector('.mgs-chat__messages');
    var quickEl = root.querySelector('.mgs-chat__quick');
    var form = root.querySelector('.mgs-chat__composer');
    var input = root.querySelector('.mgs-chat__input');
    var sendBtn = root.querySelector('.mgs-chat__send');
    var open = false;
    var history = [];
    var busy = false;

    try {
      var saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(saved) && saved.length && saved.length <= 40) {
        history = saved;
      }
    } catch (e) { history = []; }

    function scrollBottom() {
      body.scrollTop = body.scrollHeight;
    }

    function addMessage(role, content) {
      var el = document.createElement('div');
      el.className = 'mgs-chat__msg mgs-chat__msg--' + role;
      el.innerHTML = nl2br(content);
      messagesEl.appendChild(el);
      scrollBottom();
      return el;
    }

    function addError(msg) {
      var el = document.createElement('div');
      el.className = 'mgs-chat__error';
      el.textContent = msg;
      messagesEl.appendChild(el);
      scrollBottom();
    }

    function renderQuick() {
      quickEl.innerHTML = '';
      if (busy || history.length > 0) return;
      quickQuestions.forEach(function (q) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'mgs-chat__quick-btn';
        b.textContent = q;
        b.addEventListener('click', function () {
          input.value = q;
          submit();
        });
        quickEl.appendChild(b);
      });
    }

    function renderHistory() {
      messagesEl.innerHTML = '';
      history.forEach(function (m) {
        addMessage(m.role, m.content);
      });
      if (history.length === 0) {
        addMessage('assistant', 'Hi! How can we help with your glass project? Ask about services, pricing, service areas, or emergencies — or tap a question below.');
      }
    }

    function persist() {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-40)));
      } catch (e) { /* ignore */ }
    }

    function setBusy(b) {
      busy = b;
      sendBtn.disabled = b;
      input.disabled = b;
      if (b) {
        input.setAttribute('aria-busy', 'true');
        var el = document.createElement('div');
        el.className = 'mgs-chat__typing';
        el.setAttribute('aria-label', 'Assistant is typing');
        el.textContent = 'Typing…';
        messagesEl.appendChild(el);
        scrollBottom();
      } else {
        input.removeAttribute('aria-busy');
        var t = messagesEl.querySelector('.mgs-chat__typing');
        if (t) t.remove();
      }
    }

    function submit() {
      var text = input.value.trim();
      if (!text || busy) return;
      input.value = '';
      input.style.height = '';

      var detected = (getServiceOptions() && getServiceOptions().isEmergencyText) ? getServiceOptions().isEmergencyText(text) : false;
      history.push({ role: 'user', content: text });
      addMessage('user', text);

      if (detected) {
        var em = document.createElement('div');
        em.className = 'mgs-chat__emergency';
        em.innerHTML =
          'This sounds urgent. Please call <a href="tel:' + phone.replace(/[^+\d]/g, '') + '"><strong>' + phone + '</strong></a> for 24/7 emergency service, or view our <a href="' + emergencyUrl + '">emergency repair page</a>. If anyone is injured or there is a life-safety hazard, call 911 first.';
        messagesEl.appendChild(em);
        history.push({ role: 'assistant', content: 'This sounds urgent. Please call ' + phone + ' for 24/7 emergency service. If anyone is injured or there is a life-safety hazard, call 911 first.' });
        scrollBottom();
      }

      persist();
      track('mgs_chat_message', { role: 'user', emergency: detected });

      setBusy(true);
      awaitTurnstileToken(8000).then(function (token) {
        return fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history.slice(-20),
            turnstileToken: token
          })
        });
      }).then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) throw new Error((data && data.error) || 'Request failed.');
          return data;
        });
      }).then(function (data) {
        history.push({ role: 'assistant', content: data.reply });
        addMessage('assistant', data.reply);
        persist();
        track('mgs_chat_message', { role: 'assistant' });
      }).catch(function (e) {
        addError('Sorry — the assistant is having trouble right now. Please try again, call ' + phone + ', or use the quote form.');
      }).then(function () {
        // Whether it succeeded or not, that token is spent — mint a new one.
        resetTurnstile();
        setBusy(false);
        renderQuick();
        input.focus();
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submit();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
      // Auto-grow textarea up to ~5 rows
      setTimeout(function () {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      }, 0);
    });

    // Turnstile only renders reliably in a visible container, so mount it the
    // first time the panel opens instead of into the hidden panel on load.
    // (It used to mount on the launcher button, which inflated the button.)
    function ensureTurnstile() {
      if (!TURNSTILE_SITE_KEY || tsWidgetId !== null) return;
      var verifyEl = root.querySelector('.mgs-chat__verify');
      if (!window.turnstile || !verifyEl || panel.hidden) return;
      try {
        tsWidgetId = window.turnstile.render(verifyEl, {
          sitekey: TURNSTILE_SITE_KEY,
          action: 'turnstile-spin-v2',
          callback: function (token) {
            setTurnstileToken(token);
            track('mgs_chat_turnstile_verified', {});
          },
          'expired-callback': function () { tsToken = ''; },
          'error-callback': function () { tsToken = ''; }
        });
      } catch (e) { /* ignore */ }
    }

    function openPanel() {
      if (open) return;
      open = true;
      panel.hidden = false;
      ensureTurnstile();
      launcher.setAttribute('aria-expanded', 'true');
      renderHistory();
      renderQuick();
      scrollBottom();
      track('mgs_chat_open', {});
      body.focus();
    }

    function closePanel() {
      if (!open) return;
      open = false;
      panel.hidden = true;
      launcher.setAttribute('aria-expanded', 'false');
      launcher.focus();
    }

    launcher.addEventListener('click', openPanel);
    closeBtn.addEventListener('click', closePanel);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) closePanel();
    });

    // Close on backdrop click
    panel.addEventListener('click', function (e) {
      if (e.target === panel) closePanel();
    });

    if (TURNSTILE_SITE_KEY) {
      try {
        var s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        s.async = true;
        s.defer = true;
        s.onload = function () { ensureTurnstile(); };
        document.head.appendChild(s);
      } catch (e) { /* ignore */ }
    }
  });
})();
