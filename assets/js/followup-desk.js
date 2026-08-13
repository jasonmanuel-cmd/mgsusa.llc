/*
  Master Glass Solutions — Command Center (/followup-desk, owner dashboard).
  Passcode login → add customers → watch satisfaction ratings come back.

  The session lives in sessionStorage. Everything on screen is derived from the
  one /api/followup-list payload, so search, filters, stats and the CSV export
  cost no extra requests.
*/
(function () {
  'use strict';

  var SESSION_KEY = 'mgs.followup.session';
  var REFRESH_MS = 30000;

  var GOOGLE_REVIEW_URL = 'https://g.page/r/CZoDFY2uA41TEAI/review';

  var loginGate = document.getElementById('login-gate');
  var deskApp = document.getElementById('desk-app');
  var loginForm = document.getElementById('login-form');
  var passcodeEl = document.getElementById('passcode');
  var revealBtn = document.getElementById('reveal-btn');
  var loginError = document.getElementById('login-error');
  var loginBtn = document.getElementById('login-btn');
  var addForm = document.getElementById('add-form');
  var custName = document.getElementById('cust-name');
  var custEmail = document.getElementById('cust-email');
  var custNotes = document.getElementById('cust-notes');
  var addError = document.getElementById('add-error');
  var addBtn = document.getElementById('add-btn');
  var logoutBtn = document.getElementById('logout-btn');
  var refreshBtn = document.getElementById('refresh-btn');
  var exportBtn = document.getElementById('export-btn');
  var listEl = document.getElementById('customer-list');
  var listEmpty = document.getElementById('list-empty');
  var listCount = document.getElementById('list-count');
  var searchInput = document.getElementById('search-input');
  var filterRow = document.querySelector('.filter-row');
  var greetingEl = document.getElementById('desk-greeting');
  var dateEl = document.getElementById('desk-date');
  var syncedEl = document.getElementById('desk-synced');

  var session = null;
  var refreshTimer = null;
  var customers = [];
  var activeFilter = 'all';
  var searchTerm = '';

  /* ---------- helpers ---------- */

  function showError(el, msg) {
    el.textContent = msg;
    el.hidden = false;
  }

  function clearError(el) {
    el.hidden = true;
    el.textContent = '';
  }

  function fmtDate(iso) {
    if (!iso) { return null; }
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
      });
    } catch (e) {
      return iso;
    }
  }

  function fmtTime(date) {
    try {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  function toast(msg, isError) {
    var existing = document.querySelector('.desk-toast');
    if (existing) { existing.remove(); }
    var t = document.createElement('div');
    t.className = 'desk-toast' + (isError ? ' desk-toast-error' : ' desk-toast-success');
    t.textContent = msg;
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }

  function getSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setSession(s) {
    session = s;
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {}
  }

  function clearSession() {
    session = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function authHeaders() {
    var headers = { 'Content-Type': 'application/json' };
    if (session && session.token) {
      headers.Authorization = 'Bearer ' + session.token;
    }
    return headers;
  }

  function reviewUrl(record) {
    if (!record || !record.token) { return null; }
    return location.origin + '/review?c=' + encodeURIComponent(record.token);
  }

  /* ---------- state / view switching ---------- */

  function showDesk() {
    loginGate.hidden = true;
    deskApp.hidden = false;
    setGreeting();
  }

  function showLogin(msg) {
    clearSession();
    clearRefresh();
    customers = [];
    deskApp.hidden = true;
    loginGate.hidden = false;
    loginBtn.disabled = false;
    loginBtn.textContent = 'Unlock the desk';
    if (msg) { showError(loginError, msg); }
    if (passcodeEl) { passcodeEl.focus(); }
  }

  function setGreeting() {
    var now = new Date();
    var hour = now.getHours();
    var part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    greetingEl.textContent = part + ' — welcome to your Command Center.';
    try {
      dateEl.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
      }).toUpperCase();
    } catch (e) {
      dateEl.textContent = 'YOUR COMMAND CENTER';
    }
  }

  /* ---------- classification ---------- */

  // A record's bucket drives its badge, its stat tile and the filter chips.
  function bucketOf(record) {
    if (record.status === 'low-rating-alerted') { return 'attention'; }
    if (record.status === 'review-link-sent') { return 'reviewed'; }
    if (typeof record.rating === 'number') {
      return record.rating >= 4 ? 'reviewed' : 'attention';
    }
    return 'waiting';
  }

  var BADGES = {
    waiting: { label: 'Waiting on reply', className: 'badge-waiting' },
    reviewed: { label: 'Sent to Google', className: 'badge-reviewed' },
    attention: { label: 'Needs attention', className: 'badge-attention' }
  };

  function stars(rating) {
    var n = Math.max(0, Math.min(5, Math.round(rating)));
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  /* ---------- rendering ---------- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text != null) { node.textContent = text; }
    return node;
  }

  function renderRow(record) {
    var bucket = bucketOf(record);
    var badge = BADGES[bucket];

    var row = el('li', 'customer-row customer-row-' + bucket);
    row.setAttribute('data-id', record.id || '');

    var top = el('div', 'customer-row-top');
    var who = el('div', 'customer-who');
    who.appendChild(el('h3', 'customer-name', record.name || 'Unnamed customer'));
    who.appendChild(el('p', 'customer-email', record.email || ''));
    top.appendChild(who);
    top.appendChild(el('span', 'badge ' + badge.className, badge.label));
    row.appendChild(top);

    if (typeof record.rating === 'number') {
      var ratingRow = el('p', 'customer-rating');
      ratingRow.appendChild(el('span', 'customer-stars', stars(record.rating)));
      ratingRow.appendChild(el('span', 'customer-rating-num', record.rating + ' of 5'));
      row.appendChild(ratingRow);
    }

    if (record.comments) {
      row.appendChild(el('p', 'customer-comments', '“' + record.comments + '”'));
    }

    if (record.notes) {
      row.appendChild(el('p', 'customer-notes', record.notes));
    }

    var meta = [];
    var added = fmtDate(record.createdAt);
    if (added) { meta.push('Added ' + added); }
    var emailed = fmtDate(record.emailedAt);
    if (emailed) { meta.push('Emailed ' + emailed); }
    var rated = fmtDate(record.ratedAt);
    if (rated) { meta.push('Rated ' + rated); }
    if (meta.length) {
      row.appendChild(el('p', 'customer-meta', meta.join(' · ')));
    }

    row.appendChild(buildActions(record, bucket));
    return row;
  }

  function buildActions(record, bucket) {
    var actions = el('div', 'customer-actions');
    var url = reviewUrl(record);

    if (url) {
      var copy = el('button', 'row-action', 'Copy rating link');
      copy.type = 'button';
      copy.addEventListener('click', function () { copyText(url, copy); });
      actions.appendChild(copy);

      var open = el('a', 'row-action', 'Open rating page');
      open.href = url;
      open.target = '_blank';
      open.rel = 'noopener';
      actions.appendChild(open);
    }

    if (record.email) {
      var mail = el('a', 'row-action', bucket === 'attention' ? 'Email this customer' : 'Email again');
      mail.href = buildMailto(record, bucket, url);
      actions.appendChild(mail);
    }

    if (bucket === 'attention') {
      var call = el('a', 'row-action row-action-alert', 'Make this right');
      call.href = 'tel:2103703700';
      actions.appendChild(call);
    }

    if (bucket === 'reviewed') {
      var google = el('a', 'row-action', 'Your Google page');
      google.href = GOOGLE_REVIEW_URL;
      google.target = '_blank';
      google.rel = 'noopener';
      actions.appendChild(google);
    }

    return actions;
  }

  function buildMailto(record, bucket, url) {
    var name = record.name || 'there';
    var subject;
    var body;

    if (bucket === 'attention') {
      subject = 'Following up on your glass project';
      body = 'Hi ' + name + ',\n\n' +
        'Thanks for the honest feedback — I would like to put it right. ' +
        'When is a good time to talk?\n\n' +
        'Master Glass Solutions\n210-370-3700';
    } else {
      subject = 'How was your glass project?';
      body = 'Hi ' + name + ',\n\n' +
        'Thanks again for choosing Master Glass Solutions. If you have a minute, ' +
        'we would love your feedback:\n\n' +
        (url || GOOGLE_REVIEW_URL) + '\n\n' +
        'Master Glass Solutions\n210-370-3700';
    }

    return 'mailto:' + encodeURIComponent(record.email) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  function copyText(text, btn) {
    var original = btn.textContent;
    function done(ok) {
      btn.textContent = ok ? 'Copied' : 'Press Ctrl+C';
      setTimeout(function () { btn.textContent = original; }, 1800);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallbackCopy(text, done); });
      return;
    }
    fallbackCopy(text, done);
  }

  // execCommand is deprecated but still the only option on non-secure origins
  // and older mobile browsers, which the owner may well be on.
  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    done(ok);
  }

  /* ---------- stats, filters, search ---------- */

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) { node.textContent = value; }
  }

  function renderStats() {
    var counts = { all: customers.length, waiting: 0, reviewed: 0, attention: 0 };
    var ratingSum = 0;
    var ratingCount = 0;

    customers.forEach(function (record) {
      counts[bucketOf(record)]++;
      if (typeof record.rating === 'number') {
        ratingSum += record.rating;
        ratingCount++;
      }
    });

    setText('stat-total', String(counts.all));
    setText('stat-waiting', String(counts.waiting));
    setText('stat-reviews', String(counts.reviewed));
    setText('stat-attention', String(counts.attention));

    if (ratingCount) {
      setText('stat-average', (ratingSum / ratingCount).toFixed(1));
      setText('stat-average-meta', 'From ' + ratingCount + (ratingCount === 1 ? ' rating' : ' ratings'));
    } else {
      setText('stat-average', '—');
      setText('stat-average-meta', 'No ratings yet');
    }

    setText('stat-total-meta', counts.all === 1 ? '1 follow-up sent' : counts.all + ' follow-ups sent');

    Object.keys(counts).forEach(function (key) {
      var node = filterRow.querySelector('[data-count="' + key + '"]');
      if (node) { node.textContent = String(counts[key]); }
    });
  }

  function matchesSearch(record) {
    if (!searchTerm) { return true; }
    var haystack = [record.name, record.email, record.notes, record.comments]
      .join(' ').toLowerCase();
    return haystack.indexOf(searchTerm) !== -1;
  }

  function visibleCustomers() {
    return customers.filter(function (record) {
      if (activeFilter !== 'all' && bucketOf(record) !== activeFilter) { return false; }
      return matchesSearch(record);
    });
  }

  function emptyMessage() {
    if (!customers.length) {
      return 'No customers yet. Add your first one on the left — they will get a ' +
        'satisfaction email straight away.';
    }
    if (searchTerm) {
      return 'Nothing matches “' + searchInput.value.trim() + '”.';
    }
    if (activeFilter === 'waiting') { return 'Nobody is waiting on a reply right now.'; }
    if (activeFilter === 'reviewed') { return 'No happy ratings back yet.'; }
    if (activeFilter === 'attention') { return 'Nothing needs your attention. Every rating so far is 4 stars or better.'; }
    return 'Nothing to show.';
  }

  function renderList() {
    var rows = visibleCustomers();

    listEl.innerHTML = '';
    listEmpty.hidden = rows.length > 0;
    listEmpty.textContent = rows.length ? '' : emptyMessage();

    var fragment = document.createDocumentFragment();
    rows.forEach(function (record) { fragment.appendChild(renderRow(record)); });
    listEl.appendChild(fragment);

    if (!customers.length) {
      listCount.textContent = 'Nobody added yet';
    } else if (rows.length === customers.length) {
      listCount.textContent = 'Showing all ' + customers.length +
        (customers.length === 1 ? ' customer' : ' customers');
    } else {
      listCount.textContent = 'Showing ' + rows.length + ' of ' + customers.length;
    }
  }

  function render() {
    renderStats();
    renderList();
  }

  /* ---------- CSV export ---------- */

  function csvCell(value) {
    var text = value == null ? '' : String(value);
    // Leading =, +, - or @ makes a spreadsheet treat the cell as a formula.
    if (/^[=+\-@]/.test(text)) { text = "'" + text; }
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function exportCsv() {
    if (!customers.length) {
      toast('Nothing to export yet.', true);
      return;
    }

    var header = ['Name', 'Email', 'Status', 'Rating', 'Comments', 'Notes', 'Added', 'Emailed', 'Rated'];
    var lines = [header.map(csvCell).join(',')];

    customers.forEach(function (record) {
      lines.push([
        record.name,
        record.email,
        BADGES[bucketOf(record)].label,
        typeof record.rating === 'number' ? record.rating : '',
        record.comments,
        record.notes,
        record.createdAt,
        record.emailedAt,
        record.ratedAt
      ].map(csvCell).join(','));
    });

    // The BOM keeps Excel from mangling accented names.
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'mgs-customers-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Customer list downloaded.');
  }

  /* ---------- data ---------- */

  function loadList(opts) {
    if (!session) { return; }
    var announce = opts && opts.announce;

    if (announce) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Refreshing…';
    }

    fetch('/api/followup-list', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({})
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
    }).then(function (result) {
      if (announce) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh';
      }
      if (result.ok && result.data && result.data.ok) {
        customers = result.data.customers || [];
        render();
        syncedEl.textContent = 'Updated ' + fmtTime(new Date());
        if (announce) { toast('Up to date.'); }
        return;
      }
      if (result.status === 401) {
        showLogin('Session expired. Please log in again.');
        return;
      }
      toast((result.data && result.data.error) || 'Could not load customers.', true);
    }).catch(function () {
      if (announce) {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh';
      }
      toast('Could not reach the server.', true);
    });
  }

  function startRefresh() {
    clearRefresh();
    refreshTimer = setInterval(function () {
      if (session) { loadList(); }
      else { clearRefresh(); }
    }, REFRESH_MS);
  }

  function clearRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  /* ---------- login ---------- */

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError(loginError);
    var passcode = passcodeEl.value.trim();
    if (!passcode) {
      showError(loginError, 'Please enter the passcode.');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Unlocking…';

    fetch('/api/followup-desk-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: passcode })
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
    }).then(function (result) {
      if (result.ok && result.data && result.data.ok && result.data.session) {
        setSession({ token: result.data.session });
        passcodeEl.value = '';
        loginBtn.disabled = false;
        loginBtn.textContent = 'Unlock the desk';
        showDesk();
        loadList();
        startRefresh();
        return;
      }
      loginBtn.disabled = false;
      loginBtn.textContent = 'Unlock the desk';
      showError(loginError, (result.data && result.data.error) || 'Incorrect passcode.');
    }).catch(function () {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Unlock the desk';
      showError(loginError, 'Could not reach the server. Please try again.');
    });
  });

  revealBtn.addEventListener('click', function () {
    var showing = passcodeEl.type === 'text';
    passcodeEl.type = showing ? 'password' : 'text';
    revealBtn.textContent = showing ? 'Show' : 'Hide';
    revealBtn.setAttribute('aria-pressed', showing ? 'false' : 'true');
    revealBtn.setAttribute('aria-label', showing ? 'Show passcode' : 'Hide passcode');
    passcodeEl.focus();
  });

  /* ---------- add customer ---------- */

  addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError(addError);

    var name = custName.value.trim();
    var email = custEmail.value.trim();
    var notes = custNotes.value.trim();

    if (!name) {
      showError(addError, 'Please enter the customer\'s name.');
      custName.focus();
      return;
    }
    if (!email) {
      showError(addError, 'Please enter the customer\'s email.');
      custEmail.focus();
      return;
    }

    addBtn.disabled = true;
    addBtn.textContent = 'Sending…';

    var body = { name: name, email: email };
    if (notes) { body.notes = notes; }

    fetch('/api/followup-add', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
    }).then(function (result) {
      addBtn.disabled = false;
      addBtn.textContent = 'Send satisfaction email';
      if (result.ok && result.data && result.data.ok && result.data.record) {
        custName.value = '';
        custEmail.value = '';
        custNotes.value = '';
        customers.unshift(result.data.record);
        render();
        toast('Satisfaction email sent to ' + result.data.record.name + '.');
        return;
      }
      if (result.status === 401) {
        showLogin('Session expired. Please log in again.');
        return;
      }
      var err = (result.data && result.data.error) || 'Could not add customer.';
      if (result.data && result.data.errors && result.data.errors.length) {
        err = result.data.errors.join(' ');
      }
      showError(addError, err);
    }).catch(function () {
      addBtn.disabled = false;
      addBtn.textContent = 'Send satisfaction email';
      showError(addError, 'Could not reach the server. Please try again.');
    });
  });

  /* ---------- toolbar ---------- */

  logoutBtn.addEventListener('click', function () { showLogin(); });

  refreshBtn.addEventListener('click', function () { loadList({ announce: true }); });

  exportBtn.addEventListener('click', exportCsv);

  filterRow.addEventListener('click', function (e) {
    var btn = e.target.closest('.filter-chip');
    if (!btn) { return; }
    activeFilter = btn.getAttribute('data-filter');
    filterRow.querySelectorAll('.filter-chip').forEach(function (chip) {
      var on = chip === btn;
      chip.classList.toggle('is-active', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    renderList();
  });

  searchInput.addEventListener('input', function () {
    searchTerm = searchInput.value.trim().toLowerCase();
    renderList();
  });

  /* ---------- init ---------- */

  (function init() {
    session = getSession();
    if (session && session.token) {
      showDesk();
      loadList();
      startRefresh();
    } else {
      passcodeEl.focus();
    }
  })();
})();
