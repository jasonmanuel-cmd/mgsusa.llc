/**
 * Master Glass Solutions - quote funnel monitor.
 *
 * GET /api/health-check   (Vercel cron, daily)
 *
 * Exists because the quote form silently refused every submission for roughly
 * 25 days and nothing noticed. The widget failure was diagnosed on Aug 12 and
 * fixed for the chat the same night; the quote form kept the same broken gate
 * until Sep 6. An empty inbox looked exactly like a quiet week.
 *
 * Two checks, both aimed at that failure:
 *
 *   funnel   POSTs a synthetic quote to the live /api/submit-quote with NO
 *            Turnstile token -- the exact shape that used to be rejected. It
 *            runs in probe mode, so it exercises routing, validation and the
 *            Turnstile verdict without putting a fake lead in the inbox.
 *
 *   drought  Reads the timestamp submit-quote leaves after each real lead and
 *            flags a stretch of silence. Cruder, but it would also have caught
 *            this, and it catches failures further out than the form itself --
 *            DNS, a dead Resend key, a page that stopped rendering.
 *
 * Silent while healthy. It emails the owner only when something is wrong, so
 * an arriving message always means something needs attention.
 *
 * Env: CRON_SECRET (required in production; the cron sends it as a bearer
 *      token), RESEND_API_KEY, LEAD_NOTIFICATION_EMAIL, LEAD_FROM_EMAIL,
 *      SITE_URL (default https://www.mgsusa.llc),
 *      LEAD_DROUGHT_DAYS (default 7),
 *      FOLLOWUP_BLOB_READ_WRITE_TOKEN for the drought check.
 */

var metricsCache = require('../data/metrics-cache');

var DEFAULT_SITE = 'https://www.mgsusa.llc';
var DEFAULT_DROUGHT_DAYS = 7;
var PROBE_TIMEOUT_MS = 15000;

function siteUrl() {
  return (process.env.SITE_URL || DEFAULT_SITE).replace(/\/+$/, '');
}

function droughtDays() {
  var n = parseInt(process.env.LEAD_DROUGHT_DAYS || '', 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DROUGHT_DAYS;
}

/* The cron carries CRON_SECRET as a bearer token. Without the check anyone
   could trigger alert mail, which would teach the owner to ignore it. */
function authorized(req) {
  var secret = process.env.CRON_SECRET;
  if (!secret) return true;               // unset: usable in preview/local
  var header = req.headers.authorization || '';
  var m = /^Bearer\s+(.+)$/.exec(header);
  return !!m && m[1] === secret;
}

/* A submission that is valid in every way except that Turnstile gave us
   nothing -- which is precisely what a customer sends when the widget fails
   to load, and precisely what used to be refused. */
function probePayload() {
  return {
    kind: 'quote',
    probe: true,
    'first-name': 'Health',
    'last-name': 'Check',
    email: 'health-check@mgsusa.llc',
    phone: '210-370-3700',
    service: 'commercial-glass',
    location: 'San Antonio, TX',
    timeline: 'planning',
    details: 'Automated funnel probe. Not a real request.',
    consent: true,
    page: '/api/health-check'
  };
}

async function checkFunnel() {
  var url = siteUrl() + '/api/submit-quote';
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, PROBE_TIMEOUT_MS);
  try {
    var r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(probePayload()),
      signal: controller.signal
    });
    var data = null;
    try { data = await r.json(); } catch (e) { /* non-JSON body */ }

    if (r.status !== 200 || !data || data.ok !== true) {
      return {
        ok: false,
        detail: 'A tokenless quote was refused with HTTP ' + r.status + '. ' +
          'This is the failure that lost leads through August: the funnel is ' +
          'rejecting customers whose Turnstile widget did not load. ' +
          (data && data.error ? 'Server said: ' + data.error : '')
      };
    }
    if (data.emailConfigured === false) {
      return { ok: false, detail: 'The funnel accepts submissions but RESEND_API_KEY is not set, so no lead email can be delivered.' };
    }
    return {
      ok: true,
      detail: 'Tokenless submission accepted (Turnstile verdict: ' + (data.turnstile || 'unknown') + ').',
      turnstile: data.turnstile || null
    };
  } catch (e) {
    var why = e && e.name === 'AbortError'
      ? 'no response within ' + (PROBE_TIMEOUT_MS / 1000) + 's'
      : (e && e.message) || 'unknown error';
    return { ok: false, detail: 'Could not reach ' + url + ' (' + why + ').' };
  } finally {
    clearTimeout(timer);
  }
}

async function checkDrought() {
  var days = droughtDays();
  var entry = await metricsCache.read('lead-pulse', days * 24 * 60 * 60 * 1000);

  // No baseline yet is not a fault -- it just means no lead has landed since
  // this shipped. Saying so beats crying wolf on day one.
  if (!entry) {
    return { ok: true, detail: 'No lead recorded yet, so there is nothing to compare against.', unknown: true };
  }
  var ageDays = entry.ageMs == null ? null : Math.floor(entry.ageMs / 86400000);
  if (entry.stale) {
    return {
      ok: false,
      detail: 'No quote request in ' + ageDays + ' days (last one ' + entry.cachedAt + '). ' +
        'That may just be a quiet stretch, but it is also what a broken form looks like from the inside.'
    };
  }
  return { ok: true, detail: 'Last quote request ' + ageDays + ' day(s) ago.' };
}

function alertEmail(failures, checks) {
  var lines = failures.map(function (f) { return '- ' + f.name + ': ' + f.detail; });
  var text =
    'The quote funnel monitor found a problem.\n\n' +
    lines.join('\n') + '\n\n' +
    'Checked ' + siteUrl() + ' at ' + new Date().toISOString() + '.\n\n' +
    'Full results:\n' +
    checks.map(function (c) { return '- ' + c.name + ': ' + (c.ok ? 'ok' : 'FAILED') + ' - ' + c.detail; }).join('\n') +
    '\n\nIf the funnel check failed, customers cannot submit a quote right now.\n';
  return {
    subject: 'Quote funnel alert: ' + failures.map(function (f) { return f.name; }).join(', '),
    text: text,
    html: '<p><strong>The quote funnel monitor found a problem.</strong></p><ul>' +
      failures.map(function (f) {
        return '<li><strong>' + f.name + ':</strong> ' + f.detail + '</li>';
      }).join('') +
      '</ul><p>Checked ' + siteUrl() + ' at ' + new Date().toISOString() + '.</p>'
  };
}

function sendAlert(mail) {
  if (!process.env.RESEND_API_KEY) return Promise.resolve({ status: 0, skipped: true });
  var from = process.env.LEAD_FROM_EMAIL || 'quotes@mgsusa.llc';
  var to = process.env.LEAD_NOTIFICATION_EMAIL || 'masterglassllc@aol.com';
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.RESEND_API_KEY
    },
    body: JSON.stringify({ from: from, to: to, subject: mail.subject, text: mail.text, html: mail.html })
  }).then(function (r) { return { status: r.status }; })
    .catch(function (e) { return { status: 0, error: e && e.message }; });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (!authorized(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized.' });
  }

  var funnel = await checkFunnel();
  var drought = await checkDrought();
  var checks = [
    { name: 'funnel', ok: funnel.ok, detail: funnel.detail },
    { name: 'lead drought', ok: drought.ok, detail: drought.detail }
  ];
  var failures = checks.filter(function (c) { return !c.ok; });

  var alerted = false;
  if (failures.length) {
    console.error('health-check failures', JSON.stringify(failures));
    var result = await sendAlert(alertEmail(failures, checks));
    alerted = result.status >= 200 && result.status < 300;
    if (!alerted) {
      console.error('health-check could not send its alert', JSON.stringify(result));
    }
  }

  // 200 even when a check fails: this is a report, and a non-2xx would just
  // make Vercel's cron log look like the monitor itself is broken.
  return res.status(200).json({
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    site: siteUrl(),
    turnstile: funnel.turnstile || null,
    checks: checks,
    alerted: alerted
  });
};
