/* 
  Master Glass Solutions — Follow-Up Desk (/followup-desk, owner dashboard).
  Passcode login → list/add customers → view review-request status.
  Session is kept in sessionStorage; the customer token is NEVER rendered.
*/
(function () {
  'use strict';

  var SESSION_KEY = 'mgs.followup.session';
  var REFRESH_MS = 30000;

  var loginGate = document.getElementById('login-gate');
  var deskApp = document.getElementById('desk-app');
  var loginForm = document.getElementById('login-form');
  var passcodeEl = document.getElementById('passcode');
  var loginError = document.getElementById('login-error');
  var loginBtn = document.getElementById('login-btn');
  var addForm = document.getElementById('add-form');
  var custName = document.getElementById('cust-name');
  var custEmail = document.getElementById('cust-email');
  var custNotes = document.getElementById('cust-notes');
  var addError = document.getElementById('add-error');
  var addBtn = document.getElementById('add-btn');
  var logoutBtn = document.getElementById('logout-btn');
  var listEl = document.getElementById('customer-list');
  var listEmpty = document.getElementById('list-empty');

  var session = null;
  var refreshTimer = null;

  /* ---------- helpers ---------- */

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

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
      var d = new Date(iso);
      return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
      });
    } catch (e) {
      return iso;
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

  /* ---------- state / view switching ---------- */

  function showDesk() {
    loginGate.hidden = true;
    deskApp.hidden = false;
  }

  function showLogin(msg) {
    clearSession();
    clearRefresh();
    deskApp.hidden = true;
    loginGate.hidden = false;
    if (msg) { showError(loginError, msg); }
    if (passcodeEl) { passcodeEl.focus(); }
  }

  function authHeaders() {
    var headers = { 'Content-Type': 'application/json' };
    if (session && session.token) {
      headers.Authorization = 'Bearer ' + session.token;
    }
    return headers;
  }

  /* ---------- status badges ---------- */

  var STATUS_LABELS = {
    'sent': 'Sent — awaiting reply',
    'review-link-sent': 'Review link sent',
    'low-rating-alerted': 'Low rating — follow up'
  };

  function renderRow(record) {
    var status = STATUS_LABELS[record.status] || record.status || 'sent';
    var badgeClass = record.status === 'review-link-sent' ? 'badge-review-link-sent'
      : record.status === 'low-rating-alerted' ? 'badge-low-rating-alerted'
      : 'badge-sent';

    var row = document.createElement('li');
    row.className = 'customer-row';
    row.setAttribute('data-id', escapeHtml(record.id || ''));

    var html = '<div class="customer-row-top">' +
      '<div><h3 class="customer-name">' + escapeHtml(record.name) + '</h3>' +
      '<p class="customer-email">' + escapeHtml(record.email) + '</p></div>' +
      '<span class="badge ' + badgeClass + '">' + escapeHtml(status) + '</span>' +
      '</div>';

    if (record.notes) {
      html += '<p class="customer-notes">' + escapeHtml(record.notes) + '</p>';
    }
    if (typeof record.rating === 'number' || record.rating != null) {
      html += '<p class="customer-rating">Rating: ' + String(record.rating) + '/5</p>';
    }
    if (record.comments) {
      html += '<p class="customer-comments">&ldquo;' + escapeHtml(record.comments) + '&rdquo;</p>';
    }

    var meta = [];
    var added = fmtDate(record.createdAt);
    if (added) { meta.push('Added ' + added); }
    if (record.emailedAt) {
      var emailed = fmtDate(record.emailedAt);
      if (emailed) { meta.push('Emailed ' + emailed); }
    }
    if (record.ratedAt) {
      var rated = fmtDate(record.ratedAt);
      if (rated) { meta.push('Rated ' + rated); }
    }
    if (meta.length) {
      html += '<p class="customer-meta">' + escapeHtml(meta.join(' · ')) + '</p>';
    }

    row.innerHTML = html;
    return row;
  }

  function renderList(customers) {
    listEl.innerHTML = '';
    listEmpty.hidden = !(customers && customers.length);
    if (!customers || !customers.length) { return; }
    for (var i = 0; i < customers.length; i++) {
      listEl.appendChild(renderRow(customers[i]));
    }
  }

  /* ---------- data ---------- */

  function loadList() {
    if (!session) { return; }
    fetch('/api/followup-list', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({})
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
    }).then(function (result) {
      if (result.ok && result.data && result.data.ok) {
        renderList(result.data.customers || []);
        return;
      }
      if (result.status === 401) {
        showLogin('Session expired. Please log in again.');
        return;
      }
      toast((result.data && result.data.error) || 'Could not load customers.', true);
    }).catch(function () {
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
        setSession(result.data.session);
        passcodeEl.value = '';
        showDesk();
        loadList();
        startRefresh();
        return;
      }
      loginBtn.disabled = false;
      loginBtn.textContent = 'Unlock desk';
      showError(loginError, (result.data && result.data.error) || 'Incorrect passcode.');
    }).catch(function () {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Unlock desk';
      showError(loginError, 'Could not reach the server. Please try again.');
    });
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
        listEmpty.hidden = true;
        listEl.prepend(renderRow(result.data.record));
        toast('Satisfaction email sent.');
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

  /* ---------- logout ---------- */

  logoutBtn.addEventListener('click', function () {
    showLogin();
  });

  /* ---------- init ---------- */

  (function init() {
    session = getSession();
    if (session && session.token) {
      showDesk();
      loadList();
      startRefresh();
    }
  })();
})();
