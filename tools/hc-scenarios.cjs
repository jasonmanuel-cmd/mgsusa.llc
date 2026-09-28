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
    } }
];

(async function () {
  var failures = 0;
  for (var i = 0; i < scenarios.length; i++) {
    var s = scenarios[i];
    delete require.cache[require.resolve(path)];
    if (s.unsetKey) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = 'test-key';
    global.fetch = s.fetch;
    var handler = require(path);
    var r = res();
    await handler({ method: 'GET', headers: {} }, r);
    var pass = r._json.ok === s.expectOk;
    if (!pass) failures++;
    console.log('\n' + (pass ? 'PASS' : '*** FAIL ***') + '  ' + s.name);
    console.log('        expected ok=' + s.expectOk + ', got ok=' + r._json.ok + ', alerted=' + r._json.alerted);
    r._json.checks.forEach(function (c) {
      console.log('        [' + (c.ok ? ' ok ' : 'FAIL') + '] ' + c.name + ': ' + c.detail.slice(0, 150));
    });
  }
  console.log('\n' + (failures ? failures + ' SCENARIO(S) FAILED' : 'all ' + scenarios.length + ' scenarios behaved as expected'));
  process.exit(failures ? 1 : 0);
})();
