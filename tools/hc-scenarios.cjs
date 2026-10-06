/* health-check scenarios, driven by stubbing global.fetch.
   NOTE: the sending-only-key case uses 401, which is what Resend really
   answers. The first version of this test used 422, an invented status, so it
   passed while the real behaviour -- a false "key is dead" alarm -- shipped. */
process.env.RESEND_API_KEY = 'test-key';
process.env.LEAD_FROM_EMAIL = 'quotes@mgsusa.llc';
process.env.SITE_URL = 'https://www.mgsusa.llc';
delete process.env.CRON_SECRET;
delete process.env.FOLLOWUP_BLOB_READ_WRITE_TOKEN;

var path = '/home/user/mgsusa.llc/api/health-check.js';

function res() {
  return {
    _status: 0, _json: null,
    setHeader: function () {},
    status: function (c) { this._status = c; return this; },
    json: function (b) { this._json = b; return this; }
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
  { name: 'drought: first crossing (day 7) -> reports AND mails',
    expectOk: false, droughtDays: 7, expectAlerted: true,
    fetch: healthyExceptDrought },
  { name: 'drought: day 18 (off-cadence) -> reports but stays quiet',
    expectOk: false, droughtDays: 18, expectAlerted: false, expectSuppressed: ['lead drought'],
    fetch: healthyExceptDrought },
  { name: 'drought: day 21 (threshold + 14) -> mails again',
    expectOk: false, droughtDays: 21, expectAlerted: true,
    fetch: healthyExceptDrought },
  { name: 'REGRESSION: a quiet drought must not mute a broken funnel',
    expectOk: false, droughtDays: 18, expectAlerted: true, expectSuppressed: ['lead drought'],
    fetch: function (u) {
      if (/submit-quote/.test(u)) return j(503, { error: 'nope' });
      if (/domains/.test(u)) return j(200, { data: [{ name: 'mgsusa.llc', status: 'verified' }] });
      return j(200, { id: 'x' });
    } }
];

function healthyExceptDrought(u) {
  if (/submit-quote/.test(u)) return j(200, Object.assign({}, okProbe, { emailChecked: true, emailStatus: 200 }));
  if (/domains/.test(u)) return j(200, { data: [{ name: 'mgsusa.llc', status: 'verified' }] });
  return j(200, { id: 'x' });
}

/* The drought reads through data/metrics-cache, which needs a Blob token this
   harness deliberately does not have. Stubbing the module's read is what lets
   the cadence be tested at all: without it every scenario lands on "no lead
   recorded yet" and the throttle is never exercised. */
var metricsCache = require('/home/user/mgsusa.llc/data/metrics-cache');
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
    global.fetch = s.fetch;
    var handler = require(path);
    var r = res();
    await handler({ method: 'GET', headers: {} }, r);

    var why = [];
    if (r._json.ok !== s.expectOk) why.push('ok=' + r._json.ok + ' wanted ' + s.expectOk);
    if (s.expectAlerted != null && r._json.alerted !== s.expectAlerted) {
      why.push('alerted=' + r._json.alerted + ' wanted ' + s.expectAlerted);
    }
    if (s.expectSuppressed &&
        (r._json.suppressed || []).join(',') !== s.expectSuppressed.join(',')) {
      why.push('suppressed=[' + (r._json.suppressed || []).join(',') + '] wanted [' + s.expectSuppressed.join(',') + ']');
    }
    if (why.length) failures++;
    console.log('\n' + (why.length ? '*** FAIL ***' : 'PASS') + '  ' + s.name);
    console.log('        ok=' + r._json.ok + ', alerted=' + r._json.alerted +
                ', suppressed=[' + (r._json.suppressed || []).join(',') + ']' +
                (why.length ? '  <-- ' + why.join('; ') : ''));
    r._json.checks.forEach(function (c) {
      console.log('        [' + (c.ok ? ' ok ' : 'FAIL') + '] ' + c.name + ': ' + c.detail.slice(0, 150));
    });
  }
  metricsCache.read = realRead;
  console.log('\n' + (failures ? failures + ' SCENARIO(S) FAILED' : 'all ' + scenarios.length + ' scenarios behaved as expected'));
  process.exit(failures ? 1 : 0);
})();
