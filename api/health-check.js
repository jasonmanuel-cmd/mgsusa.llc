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
 *            flags a stretch of silence. Cruder, but it catches failures
 *            further out than the form itself -- DNS, a dead Resend key, a page
 *            that stopped rendering. Unlike the other two it is a hint, not a
 *            verdict: leads here arrive weeks apart even when everything works,
 *            so it waits 30 days and then mails monthly, not daily.
 *
 * Silent while healthy. It emails the owner only when something is wrong, so
 * an arriving message always means something needs attention. That promise is
 * the whole value of the endpoint, and it is why the two checks that mean
 * "customers are being turned away right now" mail on every failing run while
 * the one that means "it has been quiet" does not.
 *
 * Env: CRON_SECRET (required in production; the cron sends it as a bearer
 *      token), RESEND_API_KEY, LEAD_NOTIFICATION_EMAIL, LEAD_FROM_EMAIL,
 *      SITE_URL (default https://www.mgsusa.llc),
 *      LEAD_DROUGHT_DAYS (default 30),
 *      LEAD_DROUGHT_REPEAT_DAYS (default 30; how often the drought notice
 *      repeats while it lasts),
 *      HEALTH_PROBE_EMAIL (optional; enables the probe's real send),
 *      FOLLOWUP_BLOB_READ_WRITE_TOKEN for the drought check.
 */

var metricsCache = require('../data/metrics-cache');

var DEFAULT_SITE = 'https://www.mgsusa.llc';

/* 30 days, not 7.
   Seven was set before anyone had measured how often a lead actually arrives
   here. At roughly a hundred visitors a week, they arrive far less often than
   weekly -- the drought that prompted this ran 19 days with the funnel testing
   clean on every single run. A threshold a business sits below most of the time
   does not detect anything; it just reports the weather, and it was mailing that
   report daily.

   The trade is real and worth naming: the August outage lost about 25 days of
   leads, and a 30-day threshold would have caught it later than a 7-day one.
   What makes that acceptable is that the drought is no longer the detector. The
   funnel probe POSTs a tokenless quote to the live endpoint every day and mails
   the moment it is refused, and with HEALTH_PROBE_EMAIL set it proves the mail
   actually leaves. Those catch the August failure on day one. The drought is the
   backstop behind them now -- for the failures nothing else sees, like the page
   quietly ceasing to render -- and a backstop should be slow and quiet, because
   a loud one drowns out the detectors in front of it. */
var DEFAULT_DROUGHT_DAYS = 30;
var DEFAULT_DROUGHT_REPEAT_DAYS = 30;
var PROBE_TIMEOUT_MS = 15000;
var FALLBACK_SENDER = 'onboarding@resend.dev';

function siteUrl() {
  return (process.env.SITE_URL || DEFAULT_SITE).replace(/\/+$/, '');
}

function droughtDays() {
  var n = parseInt(process.env.LEAD_DROUGHT_DAYS || '', 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DROUGHT_DAYS;
}

function droughtRepeatDays() {
  var n = parseInt(process.env.LEAD_DROUGHT_REPEAT_DAYS || '', 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DROUGHT_REPEAT_DAYS;
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
    /* A 401 or 403 here does NOT mean the key is dead.
       Resend answers exactly that to a restricted, sending-only key -- which
       is the recommended way to hold one -- and such a key still sends mail
       perfectly well. The first version of this check called that a revoked
       key and told the owner lead email was down while leads were in fact
       being delivered; the alert saying so was itself sent with the very key
       it was declaring dead. Crying wolf here is worse than staying quiet,
       because it trains her to ignore the one message that means something.

       Listing domains is a convenience, not proof of anything. The only
       honest proof that the key can send is a send, which is what the funnel
       probe does when HEALTH_PROBE_EMAIL is set. So: report, never fail. */
    if (r.status !== 200) {
      var why = (r.status === 401 || r.status === 403)
        ? 'the key is restricted to sending and cannot list domains, which is normal and fine'
        : 'Resend answered HTTP ' + r.status;
      return {
        ok: true,
        unknown: true,
        detail: 'Could not confirm the sending domain: ' + why + '. ' +
          'This says nothing about whether mail is going out -- set HEALTH_PROBE_EMAIL ' +
          'to have the daily probe prove delivery with a real send.'
      };
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

/* Unlike the other two, a drought is not an outage. It is one explanation for
   a number, and the likeliest explanation is usually that the week was quiet:
   at a hundred-odd visitors a week, a fortnight with no quote request is well
   within normal. So it reports every day but only *mails* on the day it first
   crosses the threshold and weekly after that.

   The reason is the same one written all over this file. A daily email about a
   condition the owner cannot act on is how she learns that mail from the site
   is noise -- and the one message that matters, "customers cannot submit a
   quote right now", arrives in the same thread wearing the same subject. An
   alert that is always firing is indistinguishable from one that never fires.

   The schedule needs no stored state: the cron runs once a day and the age in
   days goes up by one each run, so testing the age against the repeat interval
   gives first-crossing-then-weekly on its own. If a run is missed the next
   mail is a week later rather than the next day, which for an informational
   notice is the right way to be wrong. */
function droughtShouldNotify(ageDays, threshold) {
  if (ageDays == null || ageDays < threshold) return false;
  return (ageDays - threshold) % droughtRepeatDays() === 0;
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
    var repeat = droughtRepeatDays();
    return {
      ok: false,
      notify: droughtShouldNotify(ageDays, days),
      detail: 'No quote request in ' + ageDays + ' days (last one ' + entry.cachedAt + '). ' +
        'That may just be a quiet stretch, but it is also what a broken form looks like from the inside. ' +
        'This notice repeats every ' + repeat + ' days while the drought lasts, not daily.'
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

/* Which deployment answered, and which of the monitor's optional variables it
   can see. Added after three rounds of not being able to tell two causes apart.

   "Delivery was not exercised" is reported when HEALTH_PROBE_EMAIL is empty in
   the function that answered -- and that happens either because the variable was
   never set for Production, or because the production alias is still serving an
   older deployment that predates it. Those need opposite fixes, and the old
   response could not distinguish them: identical output, different problem.

   `commit` settles it. If it does not match the commit that was supposed to
   carry the change, the deployment is stale and no amount of re-checking the
   variable will help. If it matches and probeEmail is still false, the variable
   genuinely is not reaching the function.

   Names and booleans only, never values. The endpoint is public whenever
   CRON_SECRET is unset, so this must not become a way to read configuration:
   knowing that HEALTH_PROBE_EMAIL exists tells an outsider nothing, while
   knowing the address would hand them somewhere to aim at. */
function deploymentInfo() {
  var sha = process.env.VERCEL_GIT_COMMIT_SHA || '';
  return {
    env: process.env.VERCEL_ENV || 'unknown',
    commit: sha ? sha.slice(0, 7) : 'unknown',
    configured: {
      probeEmail: !!process.env.HEALTH_PROBE_EMAIL,
      cronSecret: !!process.env.CRON_SECRET,
      droughtDays: droughtDays(),
      droughtRepeatDays: droughtRepeatDays()
    }
  };
}

/* ?format=html renders the same findings as a page instead of JSON.
   JSON stays the default, because the cron and the scenario harness read it.

   This exists because the JSON was not reaching the person who needed it. The
   answer to "why is the probe not sending" sat in one nested object, and three
   separate attempts to copy it out of a raw JSON response on a phone arrived
   empty. A monitor whose output cannot be read is not reporting anything. */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function wantsHtml(req) {
  var q = (req && req.query && req.query.format) || '';
  if (!q && req && typeof req.url === 'string') {
    var m = /[?&]format=([^&]+)/.exec(req.url);
    if (m) { try { q = decodeURIComponent(m[1]); } catch (e) { q = m[1]; } }
  }
  return String(q).toLowerCase() === 'html';
}

/* Every interpolation goes through esc(). Check details are not all ours:
   `emailError` carries Resend's own response text straight into the string, so
   an upstream error body containing markup would otherwise be rendered as
   markup on a page we told someone to open. */
function renderHtml(p) {
  var cfg = p.deployment.configured;
  var failed = p.checks.filter(function (c) { return !c.ok; });

  var verdict = failed.length
    ? (failed.length === 1 ? '1 thing needs attention'
                           : failed.length + ' things need attention')
    : 'Everything the monitor can see is working';

  var probeLine = cfg.probeEmail
    ? 'Set. The daily probe sends a real message through Resend, so delivery is proven end to end.'
    : 'Not set. The probe confirms the form accepts a submission, but never sends a message '
      + '— so it cannot prove email actually arrives. Add HEALTH_PROBE_EMAIL in Vercel, '
      + 'targeting Production, then redeploy.';

  var cronLine = cfg.cronSecret
    ? 'Set, so only the Vercel cron can run this check.'
    : 'Not set, so this page is public to anyone who knows the URL.';

  var rows = p.checks.map(function (c) {
    return '<tr class="' + (c.ok ? 'ok' : 'bad') + '">'
      + '<td class="s">' + (c.ok ? '&#10003;' : '&#10007;') + '</td>'
      + '<td><strong>' + esc(c.name) + '</strong><br><span class="d">' + esc(c.detail) + '</span></td>'
      + '</tr>';
  }).join('');

  var mailed = failed.length
    ? (p.alerted ? 'An alert was emailed to the owner.'
                 : (p.suppressed.length
                    ? 'No email sent — ' + esc(p.suppressed.join(', ')) + ' is on a slower schedule than daily.'
                    : 'No email sent, and one was expected. Check the function logs.'))
    : 'No email sent, which is correct — this check is silent while healthy.';

  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="robots" content="noindex,nofollow">'
    + '<title>Quote funnel monitor</title><style>'
    + ':root{color-scheme:light dark}'
    + 'body{font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
    + 'margin:0;padding:20px 16px 48px;max-width:46rem;background:#fff;color:#1a1a1a}'
    + '@media(prefers-color-scheme:dark){body{background:#131313;color:#ececec}'
    + '.card{background:#1d1d1d;border-color:#333}.d{color:#aaa}}'
    + 'h1{font-size:1.3rem;margin:0 0 .15em}'
    + '.when{color:#777;font-size:.85rem;margin:0 0 1.4em}'
    + '.verdict{font-size:1.05rem;font-weight:600;padding:.7em .9em;border-radius:8px;'
    + 'margin:0 0 1.4em;border-left:4px solid}'
    + '.good{background:#e9f7ee;border-color:#1d8b4a;color:#10572f}'
    + '.warn{background:#fdecec;border-color:#c62828;color:#7d1a1a}'
    + '@media(prefers-color-scheme:dark){.good{background:#14301f;color:#9fe0b8}'
    + '.warn{background:#331717;color:#f3b4b4}}'
    + 'h2{font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:#777;'
    + 'margin:1.8em 0 .5em;font-weight:600}'
    + 'table{border-collapse:collapse;width:100%}'
    + 'td{padding:.6em .4em;vertical-align:top;border-top:1px solid #e4e4e4}'
    + '@media(prefers-color-scheme:dark){td{border-color:#303030}}'
    + 'td.s{width:1.6em;font-size:1.05rem;text-align:center}'
    + 'tr.ok td.s{color:#1d8b4a}tr.bad td.s{color:#c62828}'
    + '.d{color:#555;font-size:.9rem}'
    + '.card{border:1px solid #e4e4e4;border-radius:8px;padding:.3em .9em;background:#fafafa}'
    + '.card p{margin:.75em 0}.k{color:#777;font-size:.82rem;display:block}'
    + 'code{font:.9em ui-monospace,SFMono-Regular,Menlo,monospace;'
    + 'background:rgba(127,127,127,.16);padding:.1em .35em;border-radius:3px}'
    + '.foot{color:#888;font-size:.8rem;margin-top:2.2em;border-top:1px solid #e4e4e4;padding-top:1em}'
    + '</style></head><body>'
    + '<h1>Quote funnel monitor</h1>'
    + '<p class="when">' + esc(p.site) + ' &middot; checked ' + esc(p.checkedAt) + '</p>'
    + '<p class="verdict ' + (failed.length ? 'warn' : 'good') + '">' + esc(verdict) + '</p>'
    + '<h2>What this run found</h2><table>' + rows + '</table>'
    + '<p class="d" style="margin-top:.9em">' + mailed + '</p>'
    + '<h2>Which deployment answered</h2><div class="card">'
    + '<p><span class="k">Environment</span><code>' + esc(p.deployment.env) + '</code></p>'
    + '<p><span class="k">Commit</span><code>' + esc(p.deployment.commit) + '</code>'
    + ' &mdash; if this is not the commit you expected, production is serving an older '
    + 'deployment and nothing else here can be trusted yet.</p></div>'
    + '<h2>Monitor configuration</h2><div class="card">'
    + '<p><span class="k">Probe email (HEALTH_PROBE_EMAIL)</span>' + probeLine + '</p>'
    + '<p><span class="k">Cron secret (CRON_SECRET)</span>' + cronLine + '</p>'
    + '<p><span class="k">Lead drought</span>Flagged after <code>' + esc(cfg.droughtDays)
    + '</code> days with no quote request, then repeated every <code>'
    + esc(cfg.droughtRepeatDays) + '</code> days while it lasts.</p></div>'
    + '<p class="foot">Configured values are never shown on this page — only whether '
    + 'each one is set. Add <code>?format=html</code> to this URL for this view; '
    + 'omit it for the raw JSON.</p>'
    + '</body></html>';
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
    { name: 'funnel', ok: funnel.ok, detail: funnel.detail, notify: funnel.notify },
    { name: 'sending domain', ok: sending.ok, detail: sending.detail, notify: sending.notify },
    { name: 'lead drought', ok: drought.ok, detail: drought.detail, notify: drought.notify }
  ];
  var failures = checks.filter(function (c) { return !c.ok; });

  /* "Failed" and "worth an email" are not the same question, and conflating
     them is what filled the inbox. A failing check defaults to mailing -- an
     outage should shout on every run until it is fixed -- but a check may opt
     out by setting notify:false, as the drought does between its weekly
     notices. The response reports every failure either way, so the endpoint
     stays the honest full picture even on a day it sends nothing. */
  var notifiable = failures.filter(function (c) { return c.notify !== false; });
  var suppressed = failures.filter(function (c) { return c.notify === false; });

  var alerted = false;
  if (failures.length) {
    console.error('health-check failures', JSON.stringify(failures));
  }
  if (notifiable.length) {
    var result = await sendAlert(alertEmail(notifiable, checks));
    alerted = result.status >= 200 && result.status < 300;
    if (!alerted) {
      console.error('health-check could not send its alert', JSON.stringify(result));
    }
  }

  var payload = {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    site: siteUrl(),
    deployment: deploymentInfo(),
    turnstile: funnel.turnstile || null,
    checks: checks,
    alerted: alerted,
    suppressed: suppressed.map(function (c) { return c.name; })
  };

  // 200 even when a check fails: this is a report, and a non-2xx would just
  // make Vercel's cron log look like the monitor itself is broken.
  if (wantsHtml(req)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(renderHtml(payload));
  }
  return res.status(200).json(payload);
};
