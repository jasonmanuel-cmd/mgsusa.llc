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
 * Three checks, all aimed at that failure:
 *
 *   funnel   POSTs a synthetic quote to the live /api/submit-quote with NO
 *            Turnstile token -- the exact shape that used to be rejected. It
 *            runs in probe mode, so it exercises routing, validation and the
 *            Turnstile verdict without putting a fake lead in the inbox. Set
 *            HEALTH_PROBE_EMAIL and the probe also performs a real Resend
 *            send to that address, which is the only way to prove delivery
 *            end to end.
 *
 *   sending  Asks Resend whether the domain in LEAD_FROM_EMAIL is verified on
 *            the account. Added after a second silent outage with the same
 *            shape as the first: a valid RESEND_API_KEY says nothing about
 *            whether Resend will accept the send, and an unverified From
 *            domain means every lead is rejected at the API while the site
 *            looks perfectly healthy from outside. Costs one GET and sends
 *            no mail, so it works with nothing else configured.
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
 *      HEALTH_PROBE_EMAIL (optional; enables the probe's real send),
 *      FOLLOWUP_BLOB_READ_WRITE_TOKEN for the drought check.
 */

var metricsCache = require('../data/metrics-cache');

var DEFAULT_SITE = 'https://www.mgsusa.llc';
var DEFAULT_DROUGHT_DAYS = 7;
var PROBE_TIMEOUT_MS = 15000;
var FALLBACK_SENDER = 'onboarding@resend.dev';

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

    if (r.status !== 200 || !data) {
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

    /* The submission was accepted; the remaining question is whether the mail
       leaves. Keep the two apart in the wording -- "the form is broken" and
       "the form works but nothing arrives" call for very different fixes, and
       reporting the second as the first sends the owner after the wrong one. */
    var accepted = 'Tokenless submission accepted (Turnstile verdict: ' + (data.turnstile || 'unknown') + ').';
    if (data.emailChecked === false) {
      return {
        ok: true,
        detail: accepted + ' Delivery was not exercised: set HEALTH_PROBE_EMAIL to have the probe send a real message.',
        turnstile: data.turnstile || null
      };
    }
    if (data.emailChecked === true && data.ok !== true) {
      return {
        ok: false,
        detail: 'The form accepts submissions, but Resend refused the send with HTTP ' +
          (data.emailStatus == null ? '?' : data.emailStatus) + ', so the lead never reaches the inbox. ' +
          (data.emailError ? 'Resend said: ' + data.emailError + ' ' : '') +
          'Check that the From domain (' + (data.from || 'unknown') + ') is verified in Resend.',
        turnstile: data.turnstile || null
      };
    }
    if (data.ok !== true) {
      return { ok: false, detail: 'The probe reported a failure it did not explain: ' + JSON.stringify(data).slice(0, 300) };
    }
    return {
      ok: true,
      detail: accepted + ' Test message delivered through Resend.',
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

/* Resend will only send from a domain that has been added to the account and
   passed its DNS checks. Everything else can be perfect -- form, validation,
   API key, deploy -- and every lead still dies at the API with a 403. From
   outside that looks exactly like a quiet week, which is the failure mode this
   whole endpoint exists to end. One GET, no mail sent, no extra config. */
async function checkSending() {
  var from = process.env.LEAD_FROM_EMAIL || 'quotes@mgsusa.llc';
  var domain = (from.split('@')[1] || '').trim().toLowerCase();

  if (!process.env.RESEND_API_KEY) {
    return { ok: false, detail: 'RESEND_API_KEY is not set, so no lead email can be sent at all.' };
  }
  if (!domain) {
    return { ok: false, detail: 'LEAD_FROM_EMAIL ("' + from + '") has no domain part, so Resend cannot accept it.' };
  }

  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, PROBE_TIMEOUT_MS);
  try {
    var r = await fetch('https://api.resend.com/domains', {
      headers: { 'Authorization': 'Bearer ' + process.env.RESEND_API_KEY },
      signal: controller.signal
    });
    if (r.status === 401 || r.status === 403) {
      return { ok: false, detail: 'Resend rejected RESEND_API_KEY with HTTP ' + r.status + '. Lead email cannot be sent until the key is replaced.' };
    }

    // A restricted (sending-only) key cannot list domains. That is a fine way
    // to run, so treat it as unknown rather than broken -- the probe's real
    // send still covers this ground when HEALTH_PROBE_EMAIL is set.
    if (r.status !== 200) {
      return { ok: true, unknown: true, detail: 'Could not read the domain list (HTTP ' + r.status + '); the API key may be sending-only.' };
    }

    var body = await r.json();
    var list = Array.isArray(body && body.data) ? body.data : [];
    var names = list.map(function (d) { return String(d && d.name || '').toLowerCase(); });
    var match = list[names.indexOf(domain)];

    /* Resend verifies an exact domain, so only an exact name proves the send
       will be accepted. A parent domain is a near miss worth naming, but
       calling it a pass would be the same false confidence that let this bug
       run -- and calling it a failure would cry wolf if Resend does allow it.
       Say what we found and leave the check unjudged. */
    if (!match) {
      var parent = names.filter(function (n) { return n && domain.slice(-(n.length + 1)) === '.' + n; })[0];
      if (parent) {
        return {
          ok: true,
          unknown: true,
          detail: 'Lead email is sent from ' + from + '. The Resend account has "' + parent + '" but not "' + domain +
            '" itself, and Resend verifies exact domains -- worth confirming a test send arrives.'
        };
      }
    }

    if (!match) {
      return {
        ok: false,
        detail: 'Lead email is sent from ' + from + ', but "' + domain + '" is not a domain on this Resend account' +
          (list.length ? ' (it has: ' + list.map(function (d) { return d.name; }).join(', ') + ')' : ' (the account has no domains at all)') +
          '. Resend refuses every one of those sends, so quote requests never reach the inbox. Add and verify the domain in Resend, or point LEAD_FROM_EMAIL at one that is already verified.'
      };
    }
    if (String(match.status || '').toLowerCase() !== 'verified') {
      return {
        ok: false,
        detail: '"' + match.name + '" is on the Resend account but its status is "' + match.status + '", not verified. ' +
          'Until its DNS records pass, Resend refuses every send from ' + from + '.'
      };
    }
    return { ok: true, detail: 'Sending domain "' + match.name + '" is verified in Resend.' };
  } catch (e) {
    var why = e && e.name === 'AbortError' ? 'timed out' : (e && e.message) || 'unknown error';
    return { ok: true, unknown: true, detail: 'Could not reach the Resend API to check the sending domain (' + why + ').' };
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
    '\n\nIf the funnel check failed, customers cannot submit a quote right now.\n' +
    'If the sending domain check failed, they can submit one but it never reaches you.\n';
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

function postAlert(mail, from) {
  var to = process.env.LEAD_NOTIFICATION_EMAIL || 'masterglassllc@aol.com';
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.RESEND_API_KEY
    },
    body: JSON.stringify({ from: from, to: to, subject: mail.subject, text: mail.text, html: mail.html })
  }).then(function (r) { return { status: r.status, from: from }; })
    .catch(function (e) { return { status: 0, from: from, error: e && e.message }; });
}

/* The alert goes out through the same From address the leads use, which is a
   problem exactly when that address is what broke: an alarm wired through the
   failing circuit never rings. So if the normal sender is refused, try again
   from Resend's own sandbox address, which needs no DNS of ours. It can only
   reach the account owner's own email, so it is not a general fallback -- but
   a message that reaches one inbox beats silence. */
async function sendAlert(mail) {
  if (!process.env.RESEND_API_KEY) return { status: 0, skipped: true };
  var from = process.env.LEAD_FROM_EMAIL || 'quotes@mgsusa.llc';
  var first = await postAlert(mail, from);
  if (first.status >= 200 && first.status < 300) return first;
  if (from === FALLBACK_SENDER) return first;

  console.error('health-check alert refused from ' + from + ' (HTTP ' + first.status + '); retrying from ' + FALLBACK_SENDER);
  var second = await postAlert(mail, FALLBACK_SENDER);
  second.retried = true;
  second.firstStatus = first.status;
  return second;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (!authorized(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized.' });
  }

  var funnel = await checkFunnel();
  var sending = await checkSending();
  var drought = await checkDrought();
  var checks = [
    { name: 'funnel', ok: funnel.ok, detail: funnel.detail },
    { name: 'sending domain', ok: sending.ok, detail: sending.detail },
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
