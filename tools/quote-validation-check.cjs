/* What submit-quote will and will not accept, after the required fields were
 * cut from eight to four.
 *
 * The case that matters is the first one: the smallest submission the relaxed
 * forms can now produce must be accepted. If the server still demanded a last
 * name or a location, relaxing the HTML would have converted silent
 * abandonment into a 422 *after* the customer finished typing, which is worse
 * than the problem it was meant to fix.
 *
 * Driven through the real handler with a stubbed fetch, so it exercises
 * routing, validation and the email build rather than a copy of them.
 */
process.env.RESEND_API_KEY = 'test-key';
process.env.LEAD_FROM_EMAIL = 'no-reply@mgsusa.llc';
process.env.LEAD_NOTIFICATION_EMAIL = 'owner@example.com';
delete process.env.TURNSTILE_SECRET_KEY;
delete process.env.FOLLOWUP_BLOB_READ_WRITE_TOKEN;

const path = '/home/user/mgsusa.llc/api/submit-quote.js';

let lastSend = null;
global.fetch = (url, opts) => {
  if (/resend\.com\/emails/.test(url)) {
    lastSend = JSON.parse(opts.body);
    return Promise.resolve({ status: 200, json: () => Promise.resolve({ id: 'x' }) });
  }
  return Promise.resolve({ status: 200, json: () => Promise.resolve({ success: true }) });
};

function res() {
  return {
    _status: 0, _json: null,
    setHeader() {}, status(c) { this._status = c; return this; },
    json(b) { this._json = b; return this; },
  };
}

/* submit-quote reads the raw request stream rather than a pre-parsed
   req.body, so the harness has to hand it a real readable or every case fails
   on "req.on is not a function" and tells you nothing about validation. */
const { Readable } = require('node:stream');
function req(body) {
  const r = Readable.from([Buffer.from(JSON.stringify(body))]);
  r.method = 'POST';
  r.headers = { 'content-type': 'application/json' };
  return r;
}

const MINIMAL = {
  kind: 'quote', 'first-name': 'Dana', email: 'dana@example.com',
  service: 'Emergency glass repair', consent: true,
};

const cases = [
  ['REGRESSION: the smallest submission the new form allows is accepted',
   MINIMAL, 200],
  ['full submission still accepted',
   { ...MINIMAL, 'last-name': 'Reyes', phone: '210-370-3700',
     location: 'Boerne', timeline: 'Within 2 weeks', details: 'Broken pane.' }, 200],
  ['no first name -> rejected', { ...MINIMAL, 'first-name': '' }, 422],
  ['no email -> rejected', { ...MINIMAL, email: '' }, 422],
  ['malformed email -> rejected', { ...MINIMAL, email: 'dana-at-example' }, 422],
  ['no service -> rejected', { ...MINIMAL, service: '' }, 422],
  ['no consent -> rejected', { ...MINIMAL, consent: false }, 422],
  ['a bad phone is still caught when one is given',
   { ...MINIMAL, phone: 'call me maybe' }, 422],
];

(async () => {
  let failures = 0;
  for (const [name, body, want] of cases) {
    delete require.cache[require.resolve(path)];
    const handler = require(path);
    const r = res();
    lastSend = null;
    await handler(req(body), r);
    const ok = r._status === want;
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : '*** FAIL ***'}  ${name}`);
    if (!ok) console.log(`        got ${r._status} wanted ${want} :: ${JSON.stringify(r._json).slice(0, 170)}`);
  }

  // The minimal lead must still read like a lead, not like a broken form.
  delete require.cache[require.resolve(path)];
  const handler = require(path);
  await handler(req(MINIMAL), res());
  const checks = [
    ['subject has no trailing space before the dash-name',
     !/ {2,}/.test(lastSend.subject) && !lastSend.subject.endsWith(' ')],
    ['subject names the customer', lastSend.subject.includes('Dana')],
    ['missing location reads "Not provided"', lastSend.html.includes('Not provided')],
    ['missing details reads "(none)"', lastSend.text.includes('(none)')],
    ['recipients came through as a list', Array.isArray(lastSend.to)],
  ];
  for (const [label, ok] of checks) {
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : '*** FAIL ***'}  ${label}`);
  }
  console.log(`\n  subject: ${JSON.stringify(lastSend.subject)}`);
  console.log(`  to:      ${JSON.stringify(lastSend.to)}`);

  console.log(failures ? `\n${failures} FAILED` : `\nall ${cases.length + checks.length} checks passed`);
  process.exit(failures ? 1 : 0);
})();
