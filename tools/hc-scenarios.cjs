/* health-check scenarios, driven by stubbing global.fetch.
   NOTE: the sending-only-key case uses 401, which is what Resend really
   answers. The first version of this test used 422, an invented status, so it
   passed while the real behaviour -- a false "key is dead" alarm -- shipped. */
process.env.RESEND_API_KEY = 'test-key';
process.env.LEAD_FROM_EMAIL = 'quotes@mgsusa.llc';
process.env.SITE_URL = 'https://www.mgsusa.llc';
delete process.env.CRON_SECRET;
delete process.env.FOLLOWUP_BLOB_READ_WRITE_TOKEN;

var path = require('path').join(__dirname, '..', 'api', 'health-check.js');

function res() {
  return {
    _status: 0, _json: null, _body: null, _headers: {},
    setHeader: function (k, v) { this._headers[String(k).toLowerCase()] = v; },
    status: function (c) { this._status = c; return this; },
    json: function (b) { this._json = b; return this; },
    send: function (b) { this._body = b; return this; }
  };
}
function j(status, body) {
  return Promise.resolve({ status: status, json: function () { return Promise.resolve(body); } });
}
var okProbe = { ok: true, probe: true, turnstile: 'skipped', emailConfigured: true,
                emailChecked: false, from: 'quotes@mgsusa.llc' };

var scenarios = [
  { name: 'REGRESSION: sending-only key (Resend 401) must NOT be called dead',
    expectOk: true,
    fetch: function (u) {
      if (/submit-quote/.test(u)) return j(200, okProbe);
      if (/domains/.test(u)) return j(401, { message: 'restricted' });
      return j(200, { id: 'x' });
    } },
  { name: 'REGRESSION: restricted key (403) must NOT be called dead',
    expectOk: true,
    fetch: function (u) {
      if (/submit-quote/.test(u)) return j(200, okProbe);
      if (/domains/.test(u)) return j(403, { message: 'restricted' });
      return j(200, { id: 'x' });
    } },
  { name: 'key genuinely absent -> still a real failure',
    expectOk: false, unsetKey: true,
    fetch: function (u) {
      if (/submit-quote/.test(u)) return j(200, Object.assign({}, okProbe, { emailConfigured: false, ok: true }));
      return j(200, {});
    } },
  { name: 'domain present but pending -> real failure',
    expectOk: false,
    fetch: function (u) {
      if (/submit-quote/.test(u)) return j(200, okProbe);
      if (/domains/.test(u)) return j(200, { data: [{ name: 'mgsusa.llc', status: 'pending' }] });
      return j(200, { id: 'x' });
    } },
  { name: 'probe send refused by Resend -> real failure',
    expectOk: false,
    fetch: function (u) {
      if (/submit-quote/.test(u)) return j(200, { ok: false, probe: true, turnstile: 'skipped',
        emailConfigured: true, emailChecked: true, emailStatus: 403,
        emailError: '{"message":"domain not verified"}', from: 'quotes@mgsusa.llc' });
      if (/domains/.test(u)) return j(200, { data: [{ name: 'mgsusa.llc', status: 'verified' }] });
      return j(200, { id: 'x' });
    } },
  { name: 'all healthy',
    expectOk: true,
    fetch: function (u) {
      if (/submit-quote/.test(u)) return j(200, Object.assign({}, okProbe, { emailChecked: true, emailStatus: 200 }));
      if (/domains/.test(u)) return j(200, { data: [{ name: 'mgsusa.llc', status: 'verified' }] });
      return j(200, {});
    } },

  /* The drought notice is throttled, so the thing to assert is not "did it
     fail" but "did it mail". A drought that mails every day teaches the owner
     to ignore the thread that also carries "customers cannot submit a quote
     right now" -- so these four pin the cadence, including the day-18 case
     that was arriving daily in production. */
  { name: 'drought: day 19 (under the 30-day threshold) -> not a failure at all',
    expectOk: true, droughtDays: 19, expectAlerted: false,
    fetch: healthyExceptDrought },
  { name: 'drought: first crossing (day 30) -> reports AND mails',
    expectOk: false, droughtDays: 30, expectAlerted: true,
    fetch: healthyExceptDrought },
  { name: 'drought: day 41 (off-cadence) -> reports but stays quiet',
    expectOk: false, droughtDays: 41, expectAlerted: false, expectSuppressed: ['lead drought'],
    fetch: healthyExceptDrought },
  { name: 'drought: day 90 (threshold + 60) -> mails again',
    expectOk: false, droughtDays: 90, expectAlerted: true,
    fetch: healthyExceptDrought },
  { name: 'REGRESSION: a quiet drought must not mute a broken funnel',
    expectOk: false, droughtDays: 41, expectAlerted: true, expectSuppressed: ['lead drought'],
    fetch: function (u) {
      if (/submit-quote/.test(u)) return j(503, { error: 'nope' });
      if (/domains/.test(u)) return j(200, { data: [{ name: 'mgsusa.llc', status: 'verified' }] });
      return j(200, { id: 'x' });
    } },

  /* The deployment block exists to tell "variable never set" apart from
     "production is serving an older deployment". These two assert it reports
     what it sees, and -- the part that matters -- that it never prints a value. */
  { name: 'deployment: reports commit and that probeEmail is unset',
    expectOk: true,
    env: { VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_SHA: 'abc1234def5678' },
    expectDeployment: { env: 'production', commit: 'abc1234', probeEmail: false },
    fetch: healthyExceptDrought },
  { name: 'deployment: probeEmail true, and the address is never echoed',
    expectOk: true,
    env: { VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_SHA: 'abc1234def5678',
           HEALTH_PROBE_EMAIL: 'secret-probe@example.com' },
    expectDeployment: { env: 'production', commit: 'abc1234', probeEmail: true },
    mustNotAppear: 'secret-probe@example.com',
    fetch: healthyExceptDrought },

  /* ?format=html exists because the JSON was not reaching the person who
     needed it. These pin the three things that could make it worse than the
     JSON: a changed default, a leaked value, and unescaped upstream text. */
  { name: 'html: ?format=html renders a page, JSON stays the default',
    expectOk: true, url: '/api/health-check?format=html',
    expectHtml: { contains: ['Quote funnel monitor', 'Which deployment answered'],
                  contentType: 'text/html' },
    fetch: healthyExceptDrought },
  { name: 'html: the probe address is never rendered',
    expectOk: true, url: '/api/health-check?format=html',
    env: { HEALTH_PROBE_EMAIL: 'secret-probe@example.com' },
    expectHtml: { contains: ['Probe email'] },
    mustNotAppear: 'secret-probe@example.com',
    fetch: healthyExceptDrought },
  /* The real send is weekly, not daily. It was arriving every morning saying
     "[probe] quote funnel check" -- a success report, from the same sender and
     into the same mailbox as "customers cannot submit a quote right now". The
     daily tokenless POST is what detects the August failure and it is
     unchanged; only the message is on a cadence. These pin both halves, since
     throttling the POST as well would quietly delete the detector.

     Days are picked to divide exactly: 30 * 667 = 20010 for the default
     cadence, 7 * 2858 = 20006 for the weekly one. The scenarios that exercise
     the mechanism set HEALTH_PROBE_SEND_DAYS explicitly so they keep testing
     the mechanism when the default moves -- it has already moved once, 7 to
     30 -- and two separate cases pin what the default currently is. */
  { name: 'probe: default cadence sends on day 20010 (30 * 667)',
    expectOk: true, atMs: 20010 * 86400000,
    env: { HEALTH_PROBE_EMAIL: 'probe@example.com' },
    expectProbeSend: true,
    fetch: healthyExceptDrought },
  { name: 'probe: default cadence stays quiet the next day',
    expectOk: true, atMs: 20011 * 86400000,
    env: { HEALTH_PROBE_EMAIL: 'probe@example.com' },
    expectProbeSend: false, expectProbePosted: true,
    fetch: healthyExceptDroughtNoSend },
  { name: 'probe: the daily POST still goes out on a quiet day',
    expectOk: true, atMs: 20007 * 86400000,
    env: { HEALTH_PROBE_EMAIL: 'probe@example.com', HEALTH_PROBE_SEND_DAYS: '7' },
    expectProbeSend: false, expectProbePosted: true,
    fetch: healthyExceptDroughtNoSend },
  { name: 'probe: HEALTH_PROBE_SEND_DAYS=7 sends on its own day',
    expectOk: true, atMs: 20006 * 86400000,
    env: { HEALTH_PROBE_EMAIL: 'probe@example.com', HEALTH_PROBE_SEND_DAYS: '7' },
    expectProbeSend: true,
    fetch: healthyExceptDrought },
  { name: 'probe: HEALTH_PROBE_SEND_DAYS=1 restores the daily send',
    expectOk: true, atMs: 20007 * 86400000,
    env: { HEALTH_PROBE_EMAIL: 'probe@example.com', HEALTH_PROBE_SEND_DAYS: '1' },
    expectProbeSend: true,
    fetch: healthyExceptDrought },
  { name: 'probe: a skipped send must not advise setting a variable already set',
    expectOk: true, atMs: 20011 * 86400000,
    env: { HEALTH_PROBE_EMAIL: 'probe@example.com' },
    expectDetail: 'every 30 days', expectNotDetail: 'set HEALTH_PROBE_EMAIL',
    fetch: healthyExceptDroughtNoSend },
  { name: 'probe: genuinely unset still says to set HEALTH_PROBE_EMAIL',
    expectOk: true, atMs: 20011 * 86400000,
    expectDetail: 'set HEALTH_PROBE_EMAIL',
    fetch: function (u) {
      if (/submit-quote/.test(u)) return j(200, Object.assign({}, okProbe,
        { emailChecked: false, emailSkipped: 'unset' }));
      if (/domains/.test(u)) return j(200, { data: [{ name: 'mgsusa.llc', status: 'verified' }] });
      return j(200, { id: 'x' });
    } },
  { name: 'REGRESSION: a quiet probe day must not mute a broken funnel',
    expectOk: false, atMs: 20011 * 86400000,
    env: { HEALTH_PROBE_EMAIL: 'probe@example.com' },
    expectAlerted: true,
    fetch: function (u) {
      if (/submit-quote/.test(u)) return j(503, { error: 'nope' });
      if (/domains/.test(u)) return j(200, { data: [{ name: 'mgsusa.llc', status: 'verified' }] });
      return j(200, { id: 'x' });
    } },

  { name: 'html: REGRESSION Resend error text must be escaped, not rendered',
    expectOk: false, url: '/api/health-check?format=html',
    expectHtml: { contains: ['&lt;script&gt;'] },
    mustNotAppear: '<script>alert(1)</script>',
    fetch: function (u) {
      if (/submit-quote/.test(u)) return j(200, { ok: false, probe: true, turnstile: 'skipped',
        emailConfigured: true, emailChecked: true, emailStatus: 403,
        emailError: '<script>alert(1)</script>', from: 'quotes@mgsusa.llc' });
      if (/domains/.test(u)) return j(200, { data: [{ name: 'mgsusa.llc', status: 'verified' }] });
      return j(200, { id: 'x' });
    } }
];

function healthyExceptDrought(u) {
  if (/submit-quote/.test(u)) return j(200, Object.assign({}, okProbe, { emailChecked: true, emailStatus: 200 }));
  if (/domains/.test(u)) return j(200, { data: [{ name: 'mgsusa.llc', status: 'verified' }] });
  return j(200, { id: 'x' });
}

/* What submit-quote answers on a day the caller asked it not to send: the
   funnel was exercised, no message went out, and the reason is the schedule
   rather than a missing variable. */
function healthyExceptDroughtNoSend(u) {
  if (/submit-quote/.test(u)) return j(200, Object.assign({}, okProbe,
    { emailChecked: false, emailSkipped: 'schedule' }));
  if (/domains/.test(u)) return j(200, { data: [{ name: 'mgsusa.llc', status: 'verified' }] });
  return j(200, { id: 'x' });
}

/* The drought reads through data/metrics-cache, which needs a Blob token this
   harness deliberately does not have. Stubbing the module's read is what lets
   the cadence be tested at all: without it every scenario lands on "no lead
   recorded yet" and the throttle is never exercised. */
var metricsCache = require('../data/metrics-cache');
var realRead = metricsCache.read;

function stubDrought(ageDays) {
  if (ageDays == null) { metricsCache.read = realRead; return; }
  metricsCache.read = function (key, maxAgeMs) {
    var ageMs = ageDays * 86400000 + 3600000;   // a bit past midnight, as in life
    return Promise.resolve({
      value: {},
      cachedAt: new Date(Date.now() - ageMs).toISOString(),
      ageMs: ageMs,
      stale: maxAgeMs != null && ageMs > maxAgeMs
    });
  };
}

(async function () {
  var failures = 0;
  for (var i = 0; i < scenarios.length; i++) {
    var s = scenarios[i];
    delete require.cache[require.resolve(path)];
    if (s.unsetKey) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = 'test-key';
    stubDrought(s.droughtDays);
    // Scenario-scoped env, cleared afterwards so one case cannot leak into the
    // next -- a stale HEALTH_PROBE_EMAIL would make a later case pass for the
    // wrong reason.
    var envKeys = Object.keys(s.env || {});
    envKeys.forEach(function (k) { process.env[k] = s.env[k]; });

    /* Record what was actually POSTed to submit-quote. The probe cadence is
       decided here and acted on there, so asserting only on the response would
       pass even if the flag were never sent -- the stub answers the same
       either way. */
    var probeBody = null;
    global.fetch = function (u, opts) {
      if (/submit-quote/.test(u) && opts && opts.body) {
        try { probeBody = JSON.parse(opts.body); } catch (e) { probeBody = 'unparseable'; }
      }
      return s.fetch(u, opts);
    };

    /* A fixed clock, because "is today a send day" is a function of the date.
       Left real for every other scenario so none of them silently depends on
       one. */
    var realNow = Date.now;
    if (s.atMs != null) Date.now = function () { return s.atMs; };

    var handler = require(path);
    var r = res();
    try {
      await handler({ method: 'GET', headers: {}, url: s.url || '/api/health-check' }, r);
    } finally {
      Date.now = realNow;
    }

    var why = [];
    var html = r._body;

    if (s.expectProbePosted && !probeBody) {
      why.push('no POST reached submit-quote at all');
    }
    if (s.expectProbeSend != null) {
      if (!probeBody) why.push('no probe body captured');
      else if (probeBody.probeSend !== s.expectProbeSend) {
        why.push('probeSend=' + probeBody.probeSend + ' wanted ' + s.expectProbeSend);
      }
    }
    if (s.expectDetail || s.expectNotDetail) {
      var funnelDetail = ((r._json && r._json.checks || []).filter(
        function (c) { return c.name === 'funnel'; })[0] || {}).detail || '';
      if (s.expectDetail && funnelDetail.indexOf(s.expectDetail) === -1) {
        why.push('funnel detail missing "' + s.expectDetail + '" (got: ' +
                 funnelDetail.slice(0, 120) + ')');
      }
      if (s.expectNotDetail && funnelDetail.indexOf(s.expectNotDetail) !== -1) {
        why.push('funnel detail wrongly contains "' + s.expectNotDetail + '"');
      }
    }

    if (s.expectHtml) {
      // HTML mode: nothing should have gone out as JSON, or the default flipped
      // and the cron is now parsing a web page.
      if (r._json) why.push('rendered HTML but ALSO sent JSON');
      if (!html) why.push('?format=html sent no body');
      var ct = r._headers['content-type'] || '';
      if (s.expectHtml.contentType && ct.indexOf(s.expectHtml.contentType) === -1) {
        why.push('content-type="' + ct + '" wanted ' + s.expectHtml.contentType);
      }
      (s.expectHtml.contains || []).forEach(function (needle) {
        if (!html || html.indexOf(needle) === -1) why.push('missing "' + needle + '"');
      });
      // The same ok/fail verdict, asserted through what the page actually says.
      var saysHealthy = !!html && html.indexOf('Everything the monitor can see is working') !== -1;
      if (saysHealthy !== s.expectOk) {
        why.push('page reads ' + (saysHealthy ? 'healthy' : 'unhealthy') + ', wanted ok=' + s.expectOk);
      }
    } else {
      if (r._body) why.push('sent an HTML body when JSON was expected');
      if (r._json.ok !== s.expectOk) why.push('ok=' + r._json.ok + ' wanted ' + s.expectOk);
      if (s.expectAlerted != null && r._json.alerted !== s.expectAlerted) {
        why.push('alerted=' + r._json.alerted + ' wanted ' + s.expectAlerted);
      }
      if (s.expectSuppressed &&
          (r._json.suppressed || []).join(',') !== s.expectSuppressed.join(',')) {
        why.push('suppressed=[' + (r._json.suppressed || []).join(',') + '] wanted [' + s.expectSuppressed.join(',') + ']');
      }
      if (s.expectDeployment) {
        var d = r._json.deployment || {};
        var want = s.expectDeployment;
        if (d.env !== want.env) why.push('deployment.env=' + d.env + ' wanted ' + want.env);
        if (d.commit !== want.commit) why.push('deployment.commit=' + d.commit + ' wanted ' + want.commit);
        if ((d.configured || {}).probeEmail !== want.probeEmail) {
          why.push('probeEmail=' + (d.configured || {}).probeEmail + ' wanted ' + want.probeEmail);
        }
      }
    }

    // Checked against whichever representation went out. The response is public
    // when CRON_SECRET is unset, so a configured value leaking into it is a real
    // defect -- and on the HTML path unescaped upstream text is the same defect
    // wearing different clothes.
    if (s.mustNotAppear) {
      var sent = (html || '') + JSON.stringify(r._json || null);
      if (sent.indexOf(s.mustNotAppear) !== -1) {
        why.push('LEAKED "' + s.mustNotAppear.slice(0, 30) + '" into the response');
      }
    }

    if (why.length) failures++;
    console.log('\n' + (why.length ? '*** FAIL ***' : 'PASS') + '  ' + s.name);
    if (html) {
      console.log('        html ' + html.length + ' bytes, content-type=' +
                  (r._headers['content-type'] || '(unset)') +
                  (why.length ? '  <-- ' + why.join('; ') : ''));
    } else {
      console.log('        ok=' + r._json.ok + ', alerted=' + r._json.alerted +
                  ', suppressed=[' + (r._json.suppressed || []).join(',') + ']' +
                  (why.length ? '  <-- ' + why.join('; ') : ''));
      if (r._json.deployment) {
        console.log('        deployment: ' + JSON.stringify(r._json.deployment));
      }
      r._json.checks.forEach(function (c) {
        console.log('        [' + (c.ok ? ' ok ' : 'FAIL') + '] ' + c.name + ': ' + c.detail.slice(0, 150));
      });
    }
    envKeys.forEach(function (k) { delete process.env[k]; });
  }
  metricsCache.read = realRead;
  console.log('\n' + (failures ? failures + ' SCENARIO(S) FAILED' : 'all ' + scenarios.length + ' scenarios behaved as expected'));
  process.exit(failures ? 1 : 0);
})();
