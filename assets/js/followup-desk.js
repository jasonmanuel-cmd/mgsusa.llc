/*
  Master Glass Solutions — Follow-Up Desk (/followup-desk, owner dashboard).
  Passcode login → metrics dashboard + list/add customers → review-request status.

  Two data calls, both authed with the session token:
    POST /api/followup-list   customer records (polled every 30s)
    POST /api/site-metrics    traffic, Lighthouse, reviews, funnel, site health

  Every metrics section renders itself independently, so an unconfigured Google
  key only greys out its own card. Charts are hand-rolled SVG/CSS — no libraries.
  The customer's review token never reaches the DOM — not as text, not as an
  attribute — it stays in the in-memory record and only ever goes to the
  clipboard, so the page's third-party scripts can't read it.
*/
(function () {
  'use strict';

  var SESSION_KEY = 'mgs.followup.session';
  var REFRESH_MS = 30000;
  var METRICS_REFRESH_MS = 300000;

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
  var listCount = document.getElementById('list-count');
  var searchEl = document.getElementById('list-search');
  var statusEl = document.getElementById('list-status');
  var sortEl = document.getElementById('list-sort');
  var exportBtn = document.getElementById('export-csv');

  var kpiRow = document.getElementById('kpi-row');
  var storageAlert = document.getElementById('storage-alert');
  var metricsUpdated = document.getElementById('metrics-updated');
  var metricsRefreshBtn = document.getElementById('metrics-refresh');
  var trafficBody = document.getElementById('traffic-body');
  var trafficRange = document.getElementById('traffic-range');
  var lighthouseBody = document.getElementById('lighthouse-body');
  var pagesBody = document.getElementById('pages-body');
  var attentionBody = document.getElementById('attention-body');
  var reviewsBody = document.getElementById('reviews-body');
  var healthBody = document.getElementById('health-body');
  var lhPageEl = document.getElementById('lh-page');
  var lhStrategyEl = document.getElementById('lh-strategy');
  var lhRunBtn = document.getElementById('lh-run');

  var session = null;
  var refreshTimer = null;
  var metricsTimer = null;
  var customers = [];
  var metrics = null;
  var metricsLoading = false;

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

  function fmtDay(iso) {
    if (!iso) { return ''; }
    var parts = String(iso).slice(0, 10).split('-');
    if (parts.length !== 3) { return iso; }
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function fmtNum(value) {
    if (value == null || !isFinite(value)) { return '—'; }
    return Number(value).toLocaleString('en-US');
  }

  function fmtDuration(seconds) {
    if (!seconds && seconds !== 0) { return '—'; }
    var m = Math.floor(seconds / 60);
    var s = Math.round(seconds % 60);
    return m ? m + 'm ' + s + 's' : s + 's';
  }

  function fmtAgo(iso) {
    if (!iso) { return 'never'; }
    var ms = Date.now() - new Date(iso).getTime();
    if (!isFinite(ms)) { return 'unknown'; }
    var mins = Math.round(ms / 60000);
    if (mins < 1) { return 'just now'; }
    if (mins < 60) { return mins + ' min ago'; }
    var hours = Math.round(mins / 60);
    if (hours < 24) { return hours + (hours === 1 ? ' hour ago' : ' hours ago'); }
    var days = Math.round(hours / 24);
    return days + (days === 1 ? ' day ago' : ' days ago');
  }

  function pct(part, whole) {
    if (!whole) { return 0; }
    return Math.round((part / whole) * 100);
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

  // /api/followup-desk-login answers { session: "<hmac-token>" } — a bare
  // string. Older code here assumed { token }, so nothing was ever sent in the
  // Authorization header and the first data call bounced straight back to the
  // gate. Accept either shape and always store the same one.
  function normalizeSession(raw) {
    var token = typeof raw === 'string' ? raw : (raw && raw.token) || null;
    return token ? { token: String(token) } : null;
  }

  function getSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) { return null; }
      var parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        parsed = raw; // a plain token string was stored by an older build
      }
      return normalizeSession(parsed);
    } catch (e) {
      return null;
    }
  }

  function setSession(raw) {
    session = normalizeSession(raw);
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) {}
    return session;
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

  function postJson(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body || {})
    }).then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    });
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

  /* ---------- customer list ---------- */

  var STATUS_LABELS = {
    'sent': 'Sent — awaiting reply',
    'review-link-sent': 'Review link sent',
    'low-rating-alerted': 'Low rating — follow up'
  };

  function badgeClassFor(status) {
    if (status === 'review-link-sent') { return 'badge-review-link-sent'; }
    if (status === 'low-rating-alerted') { return 'badge-low-rating-alerted'; }
    return 'badge-sent';
  }

  function stars(rating) {
    var full = Math.max(0, Math.min(5, Math.round(rating || 0)));
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  function renderRow(record) {
    var status = record.status || 'sent';
    var row = document.createElement('li');
    row.className = 'customer-row';
    row.setAttribute('data-id', String(record.id || ''));

    var html = '<div class="customer-row-top">' +
      '<div><h3 class="customer-name">' + escapeHtml(record.name) + '</h3>' +
      '<p class="customer-email"><a href="mailto:' + escapeHtml(record.email) + '">' +
      escapeHtml(record.email) + '</a></p></div>' +
      '<span class="badge ' + badgeClassFor(status) + '">' +
      escapeHtml(STATUS_LABELS[status] || status) + '</span>' +
      '</div>';

    if (record.notes) {
      html += '<p class="customer-notes">' + escapeHtml(record.notes) + '</p>';
    }
    if (record.rating != null) {
      html += '<p class="customer-rating"><span class="stars" aria-hidden="true">' +
        stars(record.rating) + '</span> ' + escapeHtml(String(record.rating)) + '/5</p>';
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

    html += '<div class="customer-actions">';
    if (record.token) {
      html += '<button type="button" class="link-btn" data-copy-link>Copy review link</button>';
    }
    html += '<a class="link-btn" href="mailto:' + escapeHtml(record.email) + '">Email customer</a>';
    html += '</div>';

    row.innerHTML = html;
    return row;
  }

  function matchesSearch(record, term) {
    if (!term) { return true; }
    var haystack = [record.name, record.email, record.notes, record.comments]
      .join(' ').toLowerCase();
    return haystack.indexOf(term) !== -1;
  }

  function visibleCustomers() {
    var term = (searchEl && searchEl.value ? searchEl.value : '').trim().toLowerCase();
    var status = statusEl ? statusEl.value : 'all';
    var sort = sortEl ? sortEl.value : 'newest';

    var rows = customers.filter(function (record) {
      if (status !== 'all' && (record.status || 'sent') !== status) { return false; }
      return matchesSearch(record, term);
    });

    rows.sort(function (a, b) {
      if (sort === 'name') {
        return String(a.name || '').localeCompare(String(b.name || ''));
      }
      if (sort === 'rating-low' || sort === 'rating-high') {
        // Unrated records sink to the bottom of either rating sort.
        var ar = a.rating == null ? null : Number(a.rating);
        var br = b.rating == null ? null : Number(b.rating);
        if (ar == null && br == null) { return 0; }
        if (ar == null) { return 1; }
        if (br == null) { return -1; }
        return sort === 'rating-low' ? ar - br : br - ar;
      }
      var at = new Date(a.createdAt).getTime() || 0;
      var bt = new Date(b.createdAt).getTime() || 0;
      return sort === 'oldest' ? at - bt : bt - at;
    });

    return rows;
  }

  function renderList() {
    var rows = visibleCustomers();
    listEl.innerHTML = '';
    for (var i = 0; i < rows.length; i++) {
      listEl.appendChild(renderRow(rows[i]));
    }

    listEmpty.hidden = rows.length > 0;
    if (!rows.length) {
      listEmpty.innerHTML = customers.length
        ? '<p>No customers match this filter.</p>'
        : '<p>No customers yet. Add your first one to get started.</p>';
    }

    if (listCount) {
      listCount.textContent = rows.length === customers.length
        ? fmtNum(customers.length) + (customers.length === 1 ? ' customer' : ' customers')
        : fmtNum(rows.length) + ' of ' + fmtNum(customers.length);
    }
  }

  function loadList() {
    if (!session) { return; }
    postJson('/api/followup-list').then(function (result) {
      if (result.ok && result.data && result.data.ok) {
        customers = result.data.customers || [];
        renderList();
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

  /* ---------- charts (inline SVG / CSS, no libraries) ---------- */

  function barList(items, opts) {
    var options = opts || {};
    var max = items.reduce(function (m, item) { return Math.max(m, item.value); }, 0) || 1;
    var total = items.reduce(function (sum, item) { return sum + item.value; }, 0);

    var html = '<ul class="bar-list">';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var width = Math.max(2, Math.round((item.value / max) * 100));
      var value = options.asPercent
        ? pct(item.value, total) + '%'
        : fmtNum(item.value);
      html += '<li class="bar-row">' +
        '<div class="bar-label">' +
        '<span class="bar-name" title="' + escapeHtml(item.label) + '">' + escapeHtml(item.label) + '</span>' +
        '<span class="bar-value">' + escapeHtml(value) + '</span>' +
        '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + width + '%"></div></div>' +
        '</li>';
    }
    return html + '</ul>';
  }

  var SPARK = { w: 640, h: 150, padX: 6, padTop: 14, padBottom: 24 };

  function sparklineSvg(series, label) {
    var max = series.reduce(function (m, point) { return Math.max(m, point.views); }, 0) || 1;
    var base = SPARK.h - SPARK.padBottom;
    var span = base - SPARK.padTop;
    var stepX = (SPARK.w - SPARK.padX * 2) / Math.max(series.length - 1, 1);

    var coords = series.map(function (point, i) {
      var x = SPARK.padX + i * stepX;
      var y = base - (point.views / max) * span;
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    });

    var line = coords.map(function (c, i) {
      return (i ? 'L' : 'M') + c[0] + ' ' + c[1];
    }).join(' ');
    var area = line + ' L' + coords[coords.length - 1][0] + ' ' + base + ' L' + coords[0][0] + ' ' + base + ' Z';

    // Uniform scaling (no preserveAspectRatio="none") keeps the stroke weight
    // even and the hover dot round at every container width.
    return '<svg class="spark" viewBox="0 0 ' + SPARK.w + ' ' + SPARK.h + '" ' +
      'role="img" aria-label="' + escapeHtml(label) + '">' +
      '<line class="spark-axis" x1="0" y1="' + base + '" x2="' + SPARK.w + '" y2="' + base + '"></line>' +
      '<line class="spark-grid" x1="0" y1="' + SPARK.padTop + '" x2="' + SPARK.w + '" y2="' + SPARK.padTop + '"></line>' +
      '<path class="spark-area" d="' + area + '"></path>' +
      '<path class="spark-line" d="' + line + '"></path>' +
      '<line class="spark-guide" x1="0" y1="' + SPARK.padTop + '" x2="0" y2="' + base + '"></line>' +
      '<circle class="spark-dot" r="5" cx="0" cy="0"></circle>' +
      '</svg>';
  }

  // Crosshair + tooltip. The SVG stretches, so hit-testing works off the
  // rendered box rather than user units.
  function attachSparkHover(wrap, series) {
    var svg = wrap.querySelector('.spark');
    var tip = wrap.querySelector('.spark-tip');
    var guide = wrap.querySelector('.spark-guide');
    var dot = wrap.querySelector('.spark-dot');
    if (!svg || !tip) { return; }

    var max = series.reduce(function (m, point) { return Math.max(m, point.views); }, 0) || 1;
    var base = SPARK.h - SPARK.padBottom;
    var span = base - SPARK.padTop;
    var stepX = (SPARK.w - SPARK.padX * 2) / Math.max(series.length - 1, 1);

    // One class on the wrapper drives all three: `hidden` is an HTML-only
    // property and does nothing when set on an SVG child.
    function hide() {
      wrap.classList.remove('spark-active');
    }

    function move(event) {
      var rect = svg.getBoundingClientRect();
      if (!rect.width) { return; }
      var ratio = (event.clientX - rect.left) / rect.width;
      var index = Math.round((ratio * SPARK.w - SPARK.padX) / stepX);
      index = Math.max(0, Math.min(series.length - 1, index));
      var point = series[index];

      var x = SPARK.padX + index * stepX;
      var y = base - (point.views / max) * span;

      guide.setAttribute('x1', x);
      guide.setAttribute('x2', x);
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);

      tip.innerHTML = '<strong>' + escapeHtml(fmtDay(point.date)) + '</strong>' +
        '<span>' + escapeHtml(fmtNum(point.views)) + ' views</span>' +
        '<span>' + escapeHtml(fmtNum(point.users)) + ' visitors</span>';
      tip.style.left = Math.round((x / SPARK.w) * rect.width) + 'px';
      wrap.classList.add('spark-active');
    }

    svg.addEventListener('mousemove', move);
    svg.addEventListener('mouseleave', hide);
  }

  function scoreState(score) {
    if (score == null) { return { key: 'none', word: 'Not measured' }; }
    if (score >= 90) { return { key: 'good', word: 'Good' }; }
    if (score >= 50) { return { key: 'warn', word: 'Needs work' }; }
    return { key: 'bad', word: 'Poor' };
  }

  function gauge(label, score) {
    var state = scoreState(score);
    var value = score == null ? '—' : String(score);
    return '<div class="gauge gauge-' + state.key + '" role="img" aria-label="' +
      escapeHtml(label + ': ' + value + ' out of 100, ' + state.word) + '">' +
      '<div class="gauge-ring" style="--pct:' + (score == null ? 0 : score) + '">' +
      '<span class="gauge-num">' + escapeHtml(value) + '</span></div>' +
      '<p class="gauge-label">' + escapeHtml(label) + '</p>' +
      '<p class="gauge-state">' + escapeHtml(state.word) + '</p>' +
      '</div>';
  }

  /* ---------- metrics sections ---------- */

  function sectionMessage(section, whatFor) {
    if (!section) { return '<p class="panel-note">Not loaded yet.</p>'; }
    if (section.status === 'unconfigured') {
      return '<div class="panel-note panel-note-setup"><p><strong>Not connected yet.</strong></p>' +
        '<p>' + escapeHtml(section.hint || ('Add the credentials for ' + whatFor + ' in Vercel.')) + '</p></div>';
    }
    if (section.status === 'error') {
      return '<p class="panel-note panel-note-error">' + escapeHtml(section.error || 'Could not load this.') + '</p>';
    }
    return null;
  }

  function tile(label, value, sub, delta, accent) {
    var html = '<div class="kpi" data-accent="' + escapeHtml(accent || '') + '">' +
      '<p class="kpi-label">' + escapeHtml(label) + '</p>' +
      '<p class="kpi-value">' + escapeHtml(value) + '</p>';
    if (delta != null && isFinite(delta)) {
      var dir = delta > 0 ? 'up' : (delta < 0 ? 'down' : 'flat');
      var arrow = delta > 0 ? '▲' : (delta < 0 ? '▼' : '■');
      html += '<p class="kpi-delta kpi-delta-' + dir + '">' + arrow + ' ' +
        escapeHtml(Math.abs(delta) + '% vs prior week') + '</p>';
    }
    if (sub) {
      html += '<p class="kpi-sub">' + escapeHtml(sub) + '</p>';
    }
    return html + '</div>';
  }

  function renderKpis(data) {
    var f = data.followups || {};
    var t = data.traffic || {};
    var r = data.reviews || {};
    var h = data.health || {};

    // Each tile is tinted to match the card it comes from.
    var tiles = [];

    tiles.push(t.status === 'ok'
      ? tile('Page views', fmtNum(t.views), 'Last 28 days · ' + fmtNum(t.users) + ' visitors', t.views7Change, 'blue')
      : tile('Page views', '—', 'Google Analytics not connected', null, 'blue'));

    tiles.push(t.status === 'ok'
      ? tile('Views this week', fmtNum(t.views7), fmtNum(t.sessions) + ' sessions in 28 days', null, 'blue')
      : tile('Views this week', '—', 'Google Analytics not connected', null, 'blue'));

    if (f.status === 'ok') {
      tiles.push(tile('Follow-ups', fmtNum(f.total),
        fmtNum(f.added30) + ' in the last 30 days', null, 'red'));
      tiles.push(tile('Avg rating',
        f.avgRating == null ? '—' : f.avgRating.toFixed(1),
        f.rated ? fmtNum(f.rated) + ' of ' + fmtNum(f.emailed) + ' replied (' + f.responseRate + '%)' : 'No ratings yet',
        null, 'red'));
    }

    tiles.push(r.status === 'ok'
      ? tile('Google rating', r.rating == null ? '—' : r.rating.toFixed(1),
        fmtNum(r.totalReviews) + ' public reviews', null, 'red')
      : tile('Google rating', '—', 'Places API not connected', null, 'red'));

    if (h.status === 'ok' && h.homepage) {
      tiles.push(tile('Site status',
        h.homepage.ok ? 'Online' : 'Down',
        h.homepage.ms != null ? 'Homepage answered in ' + fmtNum(h.homepage.ms) + ' ms' : 'No response',
        null, 'teal'));
    }

    kpiRow.innerHTML = tiles.join('');
  }

  function renderTraffic(t) {
    var message = sectionMessage(t, 'Google Analytics');
    if (message) {
      trafficBody.innerHTML = message;
      return;
    }

    if (trafficRange) { trafficRange.textContent = t.range || 'Last 28 days'; }

    var series = (t.daily || []).map(function (day) {
      return { date: day.date, views: Number(day.views) || 0, users: Number(day.users) || 0 };
    });

    var html = '<div class="stat-strip">' +
      '<div><span class="stat-num">' + escapeHtml(fmtNum(t.views)) + '</span><span class="stat-cap">Views</span></div>' +
      '<div><span class="stat-num">' + escapeHtml(fmtNum(t.users)) + '</span><span class="stat-cap">Visitors</span></div>' +
      '<div><span class="stat-num">' + escapeHtml(fmtNum(t.sessions)) + '</span><span class="stat-cap">Sessions</span></div>' +
      '<div><span class="stat-num">' + escapeHtml(t.engagementRate + '%') + '</span><span class="stat-cap">Engaged</span></div>' +
      '<div><span class="stat-num">' + escapeHtml(fmtDuration(t.avgSessionSeconds)) + '</span><span class="stat-cap">Avg visit</span></div>' +
      '</div>';

    if (series.length) {
      var peak = series.reduce(function (m, p) { return Math.max(m, p.views); }, 0);
      html += '<figure class="chart-figure">' +
        '<figcaption class="chart-caption">Daily page views · peak ' + escapeHtml(fmtNum(peak)) + '</figcaption>' +
        '<div class="spark-wrap">' +
        sparklineSvg(series, 'Daily page views over the last 28 days, peak ' + fmtNum(peak)) +
        '<div class="spark-tip"></div>' +
        '</div>' +
        '<div class="chart-axis"><span>' + escapeHtml(fmtDay(series[0].date)) + '</span>' +
        '<span>' + escapeHtml(fmtDay(series[series.length - 1].date)) + '</span></div>' +
        '</figure>';

      html += '<details class="chart-data"><summary>Show the daily numbers</summary>' +
        '<table><thead><tr><th>Day</th><th>Views</th><th>Visitors</th></tr></thead><tbody>';
      for (var i = series.length - 1; i >= 0; i--) {
        html += '<tr><td>' + escapeHtml(fmtDay(series[i].date)) + '</td>' +
          '<td>' + escapeHtml(fmtNum(series[i].views)) + '</td>' +
          '<td>' + escapeHtml(fmtNum(series[i].users)) + '</td></tr>';
      }
      html += '</tbody></table></details>';
    }

    // Chart on the left, the two breakdowns stacked on the right, so the card
    // fills its width instead of running long and leaving a hole beside it.
    var side = '';
    if (t.channels && t.channels.length) {
      side += '<h3 class="panel-subhead">Where visitors come from</h3>' +
        barList(t.channels.map(function (c) {
          return { label: c.label, value: c.sessions };
        }), { asPercent: true });
    }

    if (t.devices && t.devices.length) {
      side += '<h3 class="panel-subhead">Devices</h3>' +
        barList(t.devices.map(function (d) {
          return { label: d.label.charAt(0).toUpperCase() + d.label.slice(1), value: d.sessions };
        }), { asPercent: true });
    }

    trafficBody.innerHTML = side
      ? '<div class="traffic-layout"><div class="traffic-main">' + html + '</div>' +
        '<div class="traffic-side">' + side + '</div></div>'
      : html;

    var wrap = trafficBody.querySelector('.spark-wrap');
    if (wrap && series.length) { attachSparkHover(wrap, series); }
  }

  function renderTopPages(t) {
    // Same source as the traffic card, so don't repeat its setup instructions.
    if (!t || t.status === 'unconfigured') {
      pagesBody.innerHTML = '<p class="panel-note">Connect Google Analytics to see this ' +
        '(see the traffic card above).</p>';
      return;
    }
    var message = sectionMessage(t, 'Google Analytics');
    if (message) {
      pagesBody.innerHTML = message;
      return;
    }
    if (!t.topPages || !t.topPages.length) {
      pagesBody.innerHTML = '<p class="panel-note">No page data for this window yet.</p>';
      return;
    }
    pagesBody.innerHTML = barList(t.topPages.map(function (page) {
      return { label: page.path, value: page.views };
    }));
  }

  function renderLighthouse(section) {
    var message = sectionMessage(section, 'PageSpeed Insights');
    if (message) {
      lighthouseBody.innerHTML = message;
      return;
    }

    var pages = section.pages || [];
    var wanted = lhPageEl && lhPageEl.value ? lhPageEl.value : '/';
    var page = null;
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].path === wanted) { page = pages[i]; }
    }
    if (!page) { page = pages[0]; }
    if (!page) {
      lighthouseBody.innerHTML = '<p class="panel-note">No pages configured.</p>';
      return;
    }

    if (page.status === 'error') {
      lighthouseBody.innerHTML = '<p class="panel-note panel-note-error">' + escapeHtml(page.error) + '</p>';
      return;
    }
    if (page.status === 'empty' || !page.result) {
      lighthouseBody.innerHTML = '<div class="panel-note"><p><strong>Not measured yet.</strong></p>' +
        '<p>Press <em>Run test</em> to score ' + escapeHtml(page.label) +
        ' on ' + escapeHtml(section.strategy) + '. A run takes about 30 seconds.</p></div>';
      return;
    }

    var result = page.result;
    var scores = result.scores || {};
    var html = '<div class="gauge-row">' +
      gauge('Performance', scores.performance) +
      gauge('Accessibility', scores.accessibility) +
      gauge('Best practices', scores.bestPractices) +
      gauge('SEO', scores.seo) +
      '</div>';

    var lab = result.lab || {};
    var labRows = [
      ['Largest contentful paint', lab.lcp],
      ['First contentful paint', lab.fcp],
      ['Total blocking time', lab.tbt],
      ['Cumulative layout shift', lab.cls],
      ['Speed index', lab.speedIndex]
    ].filter(function (row) { return row[1] && row[1].display; });

    if (labRows.length) {
      html += '<h3 class="panel-subhead">Lab metrics</h3><dl class="metric-grid">';
      labRows.forEach(function (row) {
        var state = scoreState(row[1].score);
        html += '<div class="metric metric-' + state.key + '">' +
          '<dt>' + escapeHtml(row[0]) + '</dt>' +
          '<dd>' + escapeHtml(row[1].display) + '</dd></div>';
      });
      html += '</dl>';
    }

    var field = result.field;
    html += '<h3 class="panel-subhead">Real visitors (Chrome field data)</h3>';
    if (field && (field.lcp || field.inp || field.cls)) {
      var fieldRows = [
        ['Largest contentful paint', field.lcp, function (v) { return (v / 1000).toFixed(1) + ' s'; }],
        ['Interaction to next paint', field.inp, function (v) { return Math.round(v) + ' ms'; }],
        ['Layout shift', field.cls, function (v) { return (v / 100).toFixed(2); }]
      ].filter(function (row) { return row[1] && row[1].percentile != null; });

      html += '<dl class="metric-grid">';
      fieldRows.forEach(function (row) {
        var category = String(row[1].category || '').toUpperCase();
        var key = category === 'FAST' ? 'good' : (category === 'AVERAGE' ? 'warn' : 'bad');
        var word = category === 'FAST' ? 'Good' : (category === 'AVERAGE' ? 'Needs work' : 'Poor');
        html += '<div class="metric metric-' + key + '">' +
          '<dt>' + escapeHtml(row[0]) + '</dt>' +
          '<dd>' + escapeHtml(row[2](row[1].percentile)) + ' <span class="metric-word">' +
          escapeHtml(word) + '</span></dd></div>';
      });
      html += '</dl>';
    } else {
      html += '<p class="panel-note">Google has not collected enough real-visitor data for this page yet. ' +
        'The lab metrics above still apply.</p>';
    }

    if (result.opportunities && result.opportunities.length) {
      html += '<h3 class="panel-subhead">Biggest wins available</h3><ul class="opp-list">';
      result.opportunities.forEach(function (opp) {
        html += '<li><span>' + escapeHtml(opp.title) + '</span><strong>save ~' +
          escapeHtml((opp.savingsMs / 1000).toFixed(1)) + 's</strong></li>';
      });
      html += '</ul>';
    }

    html += '<p class="panel-foot">' + escapeHtml(page.label) + ' · ' + escapeHtml(section.strategy) +
      ' · measured ' + escapeHtml(fmtAgo(page.cachedAt)) +
      (page.stale ? ' · out of date' : '') + '</p>';

    lighthouseBody.innerHTML = html;
  }

  function renderAttention(f) {
    var message = sectionMessage(f, 'the customer store');
    if (message) {
      attentionBody.innerHTML = message;
      return;
    }

    var html = '';
    var items = f.needsAttention || [];

    if (!items.length) {
      html += '<p class="panel-note panel-note-good">Nothing waiting. Every follow-up is either answered or still fresh.</p>';
    } else {
      html += '<ul class="attention-list">';
      items.forEach(function (item) {
        var isLow = item.reason === 'low-rating';
        html += '<li class="attention-row attention-' + (isLow ? 'low' : 'stale') + '">' +
          '<div><p class="attention-name">' + escapeHtml(item.name) + '</p>' +
          '<p class="attention-email"><a href="mailto:' + escapeHtml(item.email) + '">' +
          escapeHtml(item.email) + '</a></p></div>' +
          '<span class="badge ' + (isLow ? 'badge-low-rating-alerted' : 'badge-sent') + '">' +
          escapeHtml(isLow
            ? 'Rated ' + (item.rating == null ? '?' : item.rating) + '/5'
            : 'No reply · ' + (item.daysWaiting == null ? '?' : item.daysWaiting) + 'd') +
          '</span></li>';
      });
      html += '</ul>';
      if (f.needsAttentionTotal > items.length) {
        html += '<p class="panel-foot">Showing ' + items.length + ' of ' +
          escapeHtml(String(f.needsAttentionTotal)) + '.</p>';
      }
    }

    var dist = f.distribution || {};
    var distItems = [5, 4, 3, 2, 1].map(function (star) {
      return { label: star + ' star' + (star === 1 ? '' : 's'), value: Number(dist[star]) || 0 };
    });
    if (f.rated) {
      html += '<h3 class="panel-subhead">Rating spread</h3>' + barList(distItems);
      html += '<p class="panel-foot">' + escapeHtml(fmtNum(f.promoters)) + ' happy (4–5★) · ' +
        escapeHtml(fmtNum(f.detractors)) + ' unhappy (1–3★) · ' +
        escapeHtml(fmtNum(f.awaiting)) + ' still waiting to reply.</p>';
    }

    attentionBody.innerHTML = html;
  }

  function renderReviews(r) {
    var message = sectionMessage(r, 'the Google Places API');
    if (message) {
      reviewsBody.innerHTML = message;
      return;
    }

    var html = '<div class="stat-strip">' +
      '<div><span class="stat-num">' + escapeHtml(r.rating == null ? '—' : r.rating.toFixed(1)) +
      '</span><span class="stat-cap">Rating</span></div>' +
      '<div><span class="stat-num">' + escapeHtml(fmtNum(r.totalReviews)) +
      '</span><span class="stat-cap">Reviews</span></div>' +
      '</div>';

    if (r.latest && r.latest.length) {
      html += '<ul class="review-list">';
      r.latest.forEach(function (review) {
        html += '<li><p class="review-head"><strong>' + escapeHtml(review.author) + '</strong> ' +
          '<span class="stars" aria-hidden="true">' + stars(review.rating) + '</span> ' +
          '<span class="sr-only">' + escapeHtml(review.rating + ' out of 5') + '</span></p>';
        if (review.text) {
          html += '<p class="review-text">' + escapeHtml(review.text) + '</p>';
        }
        html += '</li>';
      });
      html += '</ul>';
    }

    if (r.reviewUrl) {
      html += '<p class="panel-foot"><a href="' + escapeHtml(r.reviewUrl) +
        '" target="_blank" rel="noopener">Open your review link</a></p>';
    }

    reviewsBody.innerHTML = html;
  }

  function renderHealth(h) {
    var message = sectionMessage(h, 'the site probe');
    if (message) {
      healthBody.innerHTML = message;
      return;
    }

    var home = h.homepage || {};
    var sitemap = h.sitemap || {};
    var state = home.ok ? 'good' : 'bad';

    var html = '<dl class="metric-grid">' +
      '<div class="metric metric-' + state + '"><dt>Homepage</dt><dd>' +
      escapeHtml(home.ok ? 'Online (' + home.status + ')' : 'Unreachable' + (home.status ? ' (' + home.status + ')' : '')) +
      '</dd></div>' +
      '<div class="metric"><dt>Response time</dt><dd>' +
      escapeHtml(home.ms == null ? '—' : fmtNum(home.ms) + ' ms') + '</dd></div>' +
      '<div class="metric"><dt>Pages in sitemap</dt><dd>' +
      escapeHtml(sitemap.pages == null ? '—' : fmtNum(sitemap.pages)) + '</dd></div>' +
      '<div class="metric"><dt>Sitemap updated</dt><dd>' +
      escapeHtml(sitemap.lastmod ? fmtDay(sitemap.lastmod) : '—') + '</dd></div>' +
      '</dl>' +
      '<p class="panel-foot">' + escapeHtml(h.origin) + ' · checked ' + escapeHtml(fmtAgo(h.checkedAt)) + '</p>';

    healthBody.innerHTML = html;
  }

  // Reads can work while writes fail (a read-only Blob token, a wedged store).
  // That shows up as "could not save" on the form with no explanation, so say
  // it once at the top of the desk instead.
  function renderStorage(s) {
    if (!storageAlert) { return; }
    if (!s || s.status === 'ok') {
      storageAlert.hidden = true;
      storageAlert.innerHTML = '';
      return;
    }
    storageAlert.innerHTML = '<div><h2>Customers are not being saved</h2>' +
      '<p>' + escapeHtml(s.error || 'The customer store is not writable.') + '</p>' +
      (s.canRead
        ? '<p>Existing customers still load, so this is the write side only — usually a Blob token without write access, or one set for Preview but not Production. Check <code>FOLLOWUP_BLOB_READ_WRITE_TOKEN</code> in Vercel and redeploy.</p>'
        : '') +
      '</div>';
    storageAlert.hidden = false;
  }

  function renderMetrics(data) {
    metrics = data;
    renderStorage(data.storage);
    renderKpis(data);
    renderTraffic(data.traffic);
    renderTopPages(data.traffic);
    renderLighthouse(data.lighthouse);
    renderAttention(data.followups);
    renderReviews(data.reviews);
    renderHealth(data.health);

    if (metricsUpdated) {
      metricsUpdated.textContent = 'Updated ' + fmtAgo(data.generatedAt);
    }
  }

  function fillPagePicker(pages) {
    if (!lhPageEl || !pages || !pages.length || lhPageEl.options.length) { return; }
    pages.forEach(function (page) {
      var option = document.createElement('option');
      option.value = page.path;
      option.textContent = page.label;
      lhPageEl.appendChild(option);
    });
  }

  function loadMetrics(options) {
    if (!session || metricsLoading) { return; }
    var opts = options || {};
    metricsLoading = true;
    if (metricsRefreshBtn) { metricsRefreshBtn.disabled = true; }
    if (metricsUpdated && !opts.silent) { metricsUpdated.textContent = 'Refreshing…'; }

    var body = {
      strategy: lhStrategyEl ? lhStrategyEl.value : 'mobile',
      page: lhPageEl && lhPageEl.value ? lhPageEl.value : '/'
    };
    if (opts.refresh) { body.refresh = opts.refresh; }
    if (opts.sections) { body.sections = opts.sections; }

    postJson('/api/site-metrics', body).then(function (result) {
      metricsLoading = false;
      if (metricsRefreshBtn) { metricsRefreshBtn.disabled = false; }

      if (result.status === 401) {
        showLogin('Session expired. Please log in again.');
        return;
      }
      if (!result.ok || !result.data || !result.data.ok) {
        if (metricsUpdated) { metricsUpdated.textContent = 'Could not load metrics'; }
        toast((result.data && result.data.error) || 'Could not load metrics.', true);
        return;
      }

      fillPagePicker(result.data.pages);
      // A partial (single-section) load must not wipe the cards it skipped.
      renderMetrics(Object.assign({}, metrics || {}, result.data));
    }).catch(function () {
      metricsLoading = false;
      if (metricsRefreshBtn) { metricsRefreshBtn.disabled = false; }
      if (metricsUpdated) { metricsUpdated.textContent = 'Could not reach the server'; }
    });
  }

  function startRefresh() {
    clearRefresh();
    refreshTimer = setInterval(function () {
      if (session) { loadList(); }
      else { clearRefresh(); }
    }, REFRESH_MS);
    metricsTimer = setInterval(function () {
      if (session) { loadMetrics({ silent: true }); }
      else { clearRefresh(); }
    }, METRICS_REFRESH_MS);
  }

  function clearRefresh() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    if (metricsTimer) {
      clearInterval(metricsTimer);
      metricsTimer = null;
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
      if (result.ok && result.data && result.data.ok && setSession(result.data.session)) {
        passcodeEl.value = '';
        loginBtn.disabled = false;
        loginBtn.textContent = 'Unlock desk';
        showDesk();
        loadList();
        loadMetrics();
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

    postJson('/api/followup-add', body).then(function (result) {
      addBtn.disabled = false;
      addBtn.textContent = 'Send satisfaction email';
      if (result.ok && result.data && result.data.ok && result.data.record) {
        custName.value = '';
        custEmail.value = '';
        custNotes.value = '';
        customers.unshift(result.data.record);
        renderList();
        toast('Satisfaction email sent.');
        loadMetrics({ sections: ['followups'], silent: true });
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

  /* ---------- list controls ---------- */

  if (searchEl) { searchEl.addEventListener('input', renderList); }
  if (statusEl) { statusEl.addEventListener('change', renderList); }
  if (sortEl) { sortEl.addEventListener('change', renderList); }

  function csvCell(value) {
    var text = value == null ? '' : String(value);
    return '"' + text.replace(/"/g, '""') + '"';
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      var rows = visibleCustomers();
      if (!rows.length) {
        toast('Nothing to export.', true);
        return;
      }
      var header = ['Name', 'Email', 'Status', 'Rating', 'Comments', 'Notes', 'Added', 'Emailed', 'Rated'];
      var lines = [header.map(csvCell).join(',')];
      rows.forEach(function (record) {
        lines.push([
          record.name, record.email, record.status, record.rating,
          record.comments, record.notes, record.createdAt, record.emailedAt, record.ratedAt
        ].map(csvCell).join(','));
      });

      var blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = 'followups-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  }

  function findCustomer(id) {
    for (var i = 0; i < customers.length; i++) {
      if (customers[i].id === id) { return customers[i]; }
    }
    return null;
  }

  listEl.addEventListener('click', function (event) {
    var button = event.target.closest('[data-copy-link]');
    if (!button) { return; }
    var row = button.closest('.customer-row');
    // The token stays in the in-memory record — never in the DOM, where the
    // page's third-party scripts (HubSpot, GA) could read it off an attribute.
    var record = row && findCustomer(row.getAttribute('data-id'));
    var token = record && record.token;
    if (!token) { return; }

    var link = window.location.origin + '/review?c=' + encodeURIComponent(token);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(function () {
        toast('Review link copied.');
      }).catch(function () {
        window.prompt('Copy this review link:', link);
      });
    } else {
      window.prompt('Copy this review link:', link);
    }
  });

  /* ---------- metrics controls ---------- */

  if (metricsRefreshBtn) {
    metricsRefreshBtn.addEventListener('click', function () {
      loadList();
      loadMetrics();
    });
  }

  if (lhPageEl) {
    lhPageEl.addEventListener('change', function () {
      if (metrics && metrics.lighthouse) { renderLighthouse(metrics.lighthouse); }
    });
  }

  if (lhStrategyEl) {
    lhStrategyEl.addEventListener('change', function () {
      loadMetrics({ sections: ['lighthouse'], silent: true });
    });
  }

  if (lhRunBtn) {
    lhRunBtn.addEventListener('click', function () {
      if (metricsLoading) { return; }
      lhRunBtn.disabled = true;
      lhRunBtn.textContent = 'Running…';
      lighthouseBody.innerHTML = '<p class="panel-loading">Running Lighthouse on ' +
        escapeHtml(lhPageEl && lhPageEl.selectedOptions.length ? lhPageEl.selectedOptions[0].textContent : 'the page') +
        '. This takes about 30 seconds…</p>';

      var done = function () {
        lhRunBtn.disabled = false;
        lhRunBtn.textContent = 'Run test';
      };

      var body = {
        sections: ['lighthouse'],
        refresh: 'lighthouse',
        strategy: lhStrategyEl ? lhStrategyEl.value : 'mobile',
        page: lhPageEl ? lhPageEl.value : '/'
      };

      postJson('/api/site-metrics', body).then(function (result) {
        done();
        if (result.status === 401) {
          showLogin('Session expired. Please log in again.');
          return;
        }
        if (!result.ok || !result.data || !result.data.ok) {
          lighthouseBody.innerHTML = '<p class="panel-note panel-note-error">' +
            escapeHtml((result.data && result.data.error) || 'The test did not finish.') + '</p>';
          return;
        }
        metrics = Object.assign({}, metrics || {}, result.data);
        renderLighthouse(metrics.lighthouse);
      }).catch(function () {
        done();
        lighthouseBody.innerHTML = '<p class="panel-note panel-note-error">' +
          'The test timed out. Try again in a minute.</p>';
      });
    });
  }

  /* ---------- passcode visibility ---------- */

  var passcodeToggle = document.getElementById('passcode-toggle');
  if (passcodeToggle && passcodeEl) {
    passcodeToggle.addEventListener('click', function () {
      var showing = passcodeEl.type === 'text';
      passcodeEl.type = showing ? 'password' : 'text';
      passcodeToggle.textContent = showing ? 'Show' : 'Hide';
      passcodeToggle.setAttribute('aria-pressed', showing ? 'false' : 'true');
      passcodeEl.focus();
    });
  }

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
      loadMetrics();
      startRefresh();
    }
  })();
})();
