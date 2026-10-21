/*
  Master Glass Solutions — Command Center (/followup-desk, owner dashboard).
  Passcode login → add customers → watch satisfaction ratings come back.

  The session lives in sessionStorage. Customer search, filters, status stats
  and CSV export are derived from one /api/followup-list payload. Performance
  sources load separately from the authenticated /api/site-metrics endpoint.
*/
(function () {
  'use strict';

  var SESSION_KEY = 'mgs.followup.session';
  var REFRESH_MS = 30000;
  var GOOGLE_REVIEW_URL = 'https://g.page/r/CZoDFY2uA41TEAI/review';

  /* Fallback memory storage when sessionStorage is blocked */
  var memorySession = null;
  var canUseStorage = false;
  try {
    sessionStorage.setItem('_test', '1');
    sessionStorage.removeItem('_test');
    canUseStorage = true;
  } catch (e) {
    canUseStorage = false;
  }

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
  var lighthouseBtn = document.getElementById('lighthouse-run-btn');
  var lighthousePage = document.getElementById('lighthouse-page');
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
  var performanceLoading = false;
  var lighthouseLoading = false;

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
    if (canUseStorage) {
      try {
        var raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return memorySession;
      }
    }
    return memorySession;
  }

  function setSession(s) {
    session = s;
    memorySession = s;
    if (canUseStorage) {
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) {}
    }
  }

  function clearSession() {
    session = null;
    memorySession = null;
    if (canUseStorage) {
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    }
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

  // Buckets drive row badges and attention filters; invite counts are separate because a low score can be both invited and need follow-up.
  function bucketOf(record) {
    if (record.status === 'low-rating-alerted' || record.status === 'low-rating-alert-failed') {
      return 'attention';
    }
    if (record.feedbackAlertStatus === 'failed') { return 'attention'; }
    if (typeof record.rating === 'number' && record.rating < 4) { return 'attention'; }
    if (record.status === 'review-link-sent' || typeof record.rating === 'number') { return 'reviewed'; }
    return 'waiting';
  }

  var BADGES = {
    waiting: { label: 'Waiting on reply', className: 'badge-waiting' },
    reviewed: { label: 'Review link sent', className: 'badge-reviewed' },
    attention: { label: 'Needs attention', className: 'badge-attention' }
  };

  function hasReviewInvite(record) {
    // Older high ratings were invited under the prior workflow. Older low
    // ratings were not; do not count those as invited retroactively.
    return !!record.reviewLinkSentAt || record.status === 'review-link-sent' ||
      (typeof record.rating === 'number' && record.rating >= 4);
  }

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

    if (record.feedbackAlertStatus === 'failed') {
      row.appendChild(el('p', 'customer-alert-note', 'Private feedback email did not send. Review the comment and follow up if needed.'));
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

    if (hasReviewInvite(record)) {
      var google = el('a', 'row-action', 'Google review page');
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

    if (bucket === 'attention' && typeof record.rating === 'number' && record.rating < 4) {
      subject = 'Following up on your glass project';
      body = 'Hi ' + name + ',\n\n' +
        'Thanks for the honest feedback — I would like to understand what we can improve. ' +
        'When is a good time to talk?\n\n' +
        'Master Glass Solutions\n210-370-3700';
    } else if (bucket === 'attention') {
      subject = 'Following up on your feedback';
      body = 'Hi ' + name + ',\n\n' +
        'Thank you for sharing your comments about the project. I would like to make sure ' +
        'we received them and see whether there is anything you need.\n\n' +
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
    // Sent invitations intentionally overlap "Needs attention": low scores also
    // receive the same link but still deserve a private follow-up.
    var counts = { all: customers.length, waiting: 0, invited: 0, attention: 0 };
    var ratingSum = 0;
    var ratingCount = 0;

    customers.forEach(function (record) {
      var bucket = bucketOf(record);
      if (bucket === 'waiting') { counts.waiting++; }
      if (bucket === 'attention') { counts.attention++; }
      if (hasReviewInvite(record)) { counts.invited++; }
      if (typeof record.rating === 'number') {
        ratingSum += record.rating;
        ratingCount++;
      }
    });

    setText('stat-total', String(counts.all));
    setText('stat-waiting', String(counts.waiting));
    setText('stat-reviews', String(counts.invited));
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
      if (activeFilter === 'invited' && !hasReviewInvite(record)) { return false; }
      if (activeFilter === 'waiting' && bucketOf(record) !== 'waiting') { return false; }
      if (activeFilter === 'attention' && bucketOf(record) !== 'attention') { return false; }
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
    if (activeFilter === 'invited') { return 'No review invitations have been sent from this desk yet.'; }
    if (activeFilter === 'attention') { return 'No low ratings or private-alert delivery issues need attention.'; }
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

  function formatMetric(value, decimals) {
    if (value == null || value === '') { return '—'; }
    var number = Number(value);
    if (!isFinite(number)) { return '—'; }
    return number.toLocaleString('en-US', {
      minimumFractionDigits: decimals || 0,
      maximumFractionDigits: decimals || 0
    });
  }

  function setSourceStatus(statusId, contentId, message, isError) {
    var status = document.getElementById(statusId);
    var content = document.getElementById(contentId);
    if (content) { content.hidden = true; }
    if (status) {
      status.hidden = false;
      status.classList.toggle('is-error', !!isError);
      status.textContent = message;
    }
  }

  function showSourceContent(statusId, contentId) {
    var status = document.getElementById(statusId);
    var content = document.getElementById(contentId);
    if (status) { status.hidden = true; }
    if (content) { content.hidden = false; }
  }

  function renderPerformanceList(id, items, labelOf, valueOf, limit) {
    var list = document.getElementById(id);
    if (!list) { return; }
    list.innerHTML = '';
    if (!items || !items.length) {
      list.appendChild(el('li', 'performance-list-empty', 'No data in this period.'));
      return;
    }
    items.slice(0, limit || 5).forEach(function (item) {
      var row = el('li');
      row.appendChild(el('span', 'performance-list-label', labelOf(item)));
      row.appendChild(el('strong', '', valueOf(item)));
      list.appendChild(row);
    });
  }

  function compactPath(value) {
    var text = String(value || '');
    try {
      var url = new URL(text);
      text = url.pathname || '/';
    } catch (e) {}
    return text.slice(0, 100);
  }

  function renderTraffic(traffic) {
    if (!traffic || traffic.status !== 'ok') {
      setSourceStatus('ga-status', 'ga-content',
        (traffic && (traffic.hint || traffic.error)) || 'GA4 traffic data is not available.',
        !!(traffic && traffic.status === 'error'));
      return;
    }

    showSourceContent('ga-status', 'ga-content');
    setText('ga-range', (traffic.range || 'Last 28 days') + ' · updated ' + fmtTime(new Date()));
    setText('ga-sessions', formatMetric(traffic.sessions));
    setText('ga-views', formatMetric(traffic.views));

    var conversions = traffic.conversions || {};
    if (conversions.status === 'ok') {
      setText('ga-call-clicks', formatMetric(conversions.callClicks));
      setText('ga-quote-submissions', formatMetric(conversions.quoteSubmissions));
      setText('ga-note', 'Call clicks count phone-link taps, not connected calls. Quote submissions count successful form completions. Mark these events as key events in GA4 if you want them in key-event reports.');
      document.getElementById('ga-note').classList.remove('is-error');
    } else {
      setText('ga-call-clicks', '—');
      setText('ga-quote-submissions', '—');
      setText('ga-note', 'GA4 traffic loaded, but lead-event counts are unavailable.' +
        (conversions.error ? ' ' + conversions.error : ''));
      document.getElementById('ga-note').classList.add('is-error');
    }

    renderPerformanceList('ga-top-pages', traffic.topPages || [], function (item) {
      return compactPath(item.path);
    }, function (item) {
      return formatMetric(item.views) + ' views';
    });
    renderPerformanceList('ga-channels', traffic.channels || [], function (item) {
      return item.label || 'Unassigned';
    }, function (item) {
      return formatMetric(item.sessions) + ' sessions';
    });
  }

  function renderSearch(search) {
    if (!search || search.status !== 'ok') {
      setSourceStatus('search-status', 'search-content',
        (search && (search.hint || search.error)) || 'Search Console data is not available.',
        !!(search && search.status === 'error'));
      return;
    }

    showSourceContent('search-status', 'search-content');
    setText('search-range', search.range || 'Last 28 days');
    setText('search-clicks', formatMetric(search.clicks));
    setText('search-impressions', formatMetric(search.impressions));
    setText('search-ctr', formatMetric(search.ctr, 1) + '%');
    setText('search-position', formatMetric(search.avgPosition, 1));
    renderPerformanceList('search-queries', search.queries || [], function (item) {
      return item.query || '(not provided)';
    }, function (item) {
      return formatMetric(item.clicks) + ' clicks · ' + formatMetric(item.impressions) + ' impressions';
    });
    renderPerformanceList('search-pages', search.pages || [], function (item) {
      return compactPath(item.page);
    }, function (item) {
      return formatMetric(item.clicks) + ' clicks';
    });
  }

  function renderProfile(profile) {
    if (!profile || profile.status !== 'ok') {
      setSourceStatus('profile-status', 'profile-content',
        (profile && (profile.hint || profile.error)) || 'Google profile data is not available.',
        !!(profile && profile.status === 'error'));
      return;
    }

    showSourceContent('profile-status', 'profile-content');
    setText('profile-rating', profile.rating == null ? '—' : formatMetric(profile.rating, 1));
    setText('profile-review-count', formatMetric(profile.totalReviews));
  }

  function renderLighthouse(lighthouse) {
    if (!lighthouse || lighthouse.status !== 'ok') {
      setSourceStatus('lighthouse-status', 'lighthouse-content',
        (lighthouse && (lighthouse.hint || lighthouse.error)) || 'PageSpeed data is not available.',
        !!(lighthouse && lighthouse.status === 'error'));
      return;
    }

    showSourceContent('lighthouse-status', 'lighthouse-content');
    var pages = lighthouse.pages || [];
    renderPerformanceList('lighthouse-pages', pages, function (page) {
      return page.label || compactPath(page.path);
    }, function (page) {
      if (page.status === 'empty') { return 'Not tested'; }
      if (page.status !== 'ok') { return 'Test failed'; }
      var scores = (page.result && page.result.scores) || {};
      var perf = scores.performance == null ? '—' : formatMetric(scores.performance);
      var seo = scores.seo == null ? '—' : formatMetric(scores.seo);
      return 'Perf ' + perf + ' · SEO ' + seo + (page.stale ? ' · stale' : '');
    }, 10);
  }

  function runLighthouse() {
    if (!session || lighthouseLoading || performanceLoading) { return; }
    lighthouseLoading = true;
    lighthouseBtn.disabled = true;
    lighthouseBtn.textContent = 'Running…';
    var path = lighthousePage.value || '/';
    var runStatus = document.getElementById('lighthouse-run-status');
    runStatus.hidden = false;
    runStatus.classList.remove('is-error');
    runStatus.textContent = 'Running a mobile PageSpeed test… this usually takes 10–30 seconds.';

    fetch('/api/site-metrics', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        sections: ['lighthouse'],
        strategy: 'mobile',
        page: path,
        refresh: 'lighthouse'
      })
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
    }).then(function (result) {
      if (result.status === 401) {
        showLogin('Session expired. Please log in again.');
        return;
      }
      if (!result.ok || !result.data || !result.data.ok) {
        runStatus.classList.add('is-error');
        runStatus.textContent = (result.data && result.data.error) || 'Could not run the PageSpeed test.';
        return;
      }

      var report = result.data.lighthouse;
      renderLighthouse(report);
      var pageResult = report && report.pages && report.pages.find(function (page) { return page.path === path; });
      if (pageResult && pageResult.status === 'ok') {
        runStatus.textContent = 'Mobile test saved for ' + (pageResult.label || path) + '.';
      } else {
        runStatus.classList.add('is-error');
        runStatus.textContent = (pageResult && pageResult.error) || 'PageSpeed could not finish this test.';
      }
    }).catch(function () {
      runStatus.classList.add('is-error');
      runStatus.textContent = 'Could not reach the PageSpeed service.';
    }).then(function () {
      lighthouseLoading = false;
      lighthouseBtn.disabled = false;
      lighthouseBtn.textContent = 'Run test';
    });
  }

  function loadPerformance() {
    if (!session || performanceLoading) { return; }
    performanceLoading = true;

    setSourceStatus('ga-status', 'ga-content', 'Loading GA4 data…', false);
    setSourceStatus('search-status', 'search-content', 'Loading Search Console data…', false);
    setSourceStatus('profile-status', 'profile-content', 'Loading Google profile data…', false);
    setSourceStatus('lighthouse-status', 'lighthouse-content', 'Loading cached mobile checks…', false);
    lighthouseBtn.disabled = true;

    fetch('/api/site-metrics', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ sections: ['traffic', 'search', 'reviews', 'lighthouse'], strategy: 'mobile' })
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
    }).then(function (result) {
      performanceLoading = false;
      lighthouseBtn.disabled = lighthouseLoading;
      if (result.status === 401) {
        showLogin('Session expired. Please log in again.');
        return;
      }
      if (!result.ok || !result.data || !result.data.ok) {
        var message = (result.data && result.data.error) || 'Could not load performance data.';
        setSourceStatus('ga-status', 'ga-content', message, true);
        setSourceStatus('search-status', 'search-content', message, true);
        setSourceStatus('profile-status', 'profile-content', message, true);
        setSourceStatus('lighthouse-status', 'lighthouse-content', message, true);
        return;
      }
      renderTraffic(result.data.traffic);
      renderSearch(result.data.search);
      renderProfile(result.data.reviews);
      renderLighthouse(result.data.lighthouse);
    }).catch(function () {
      performanceLoading = false;
      lighthouseBtn.disabled = lighthouseLoading;
      setSourceStatus('ga-status', 'ga-content', 'Could not reach the performance data service.', true);
      setSourceStatus('search-status', 'search-content', 'Could not reach the performance data service.', true);
      setSourceStatus('profile-status', 'profile-content', 'Could not reach the performance data service.', true);
      setSourceStatus('lighthouse-status', 'lighthouse-content', 'Could not reach the performance data service.', true);
    });
  }

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
        // On a restored session the desk stays hidden until this first read
        // succeeds, so a token the server rejects never flashes the dashboard.
        if (opts && opts.revealOnSuccess) {
          showDesk();
          loadPerformance();
          startRefresh();
        }
        customers = result.data.customers || [];
        render();
        syncedEl.textContent = 'Updated ' + fmtTime(new Date());
        if (announce) { toast('Up to date.'); }
        return;
      }
      if (result.status === 401) {
        // A restored token that the server rejects is stale, not a session the
        // owner just lost — clear it quietly instead of crying "expired".
        showLogin(opts && opts.quietAuthFail
          ? ''
          : 'Session expired. Please log in again.');
        if (opts && opts.quietAuthFail) { passcodeEl.focus(); }
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
        loadPerformance();
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

  refreshBtn.addEventListener('click', function () { loadList({ announce: true }); loadPerformance(); });
  lighthouseBtn.addEventListener('click', runLighthouse);

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
      // Prove the stored token still works before revealing anything. The desk
      // and the refresh loop start from loadList's success branch.
      loadList({ revealOnSuccess: true, quietAuthFail: true });
    } else {
      passcodeEl.focus();
    }
  })();
})();
