/* Exercise the public review submission handler with stubbed storage and mail.
 * All five ratings must receive the same optional Google-review invitation;
 * a low score or any private comment also reaches the owner independently.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { Readable } = require('node:stream');

process.env.RESEND_API_KEY = 'test-key';
process.env.LEAD_FROM_EMAIL = 'no-reply@example.com';
process.env.GOOGLE_REVIEW_URL = 'https://example.com/review';
process.env.LEAD_NOTIFICATION_EMAIL = 'owner@example.com';
delete process.env.TURNSTILE_SECRET_KEY;

const apiPath = path.resolve(__dirname, '..', 'api', 'review-submit.js');
let customer = null;
let updated = null;
const store = {
  async get() { return customer && { ...customer }; },
  async update(id, patch) {
    updated = { ...patch };
    customer = { ...customer, ...patch };
    return customer;
  },
};
const auth = { verifyReview: token => token === 'test-token' ? { id: 'c-1' } : null };
const recipients = { leadRecipients: () => ['owner@example.com'] };

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (parent && path.resolve(parent.filename) === apiPath) {
    if (request === '../data/followup-store') return store;
    if (request === '../data/followup-auth') return auth;
    if (request === '../data/lead-recipients') return recipients;
  }
  return originalLoad.apply(this, arguments);
};
const handler = require(apiPath);
Module._load = originalLoad;

let sentEmails = [];
let failOwnerEmail = false;
global.fetch = async (url, options) => {
  assert.match(url, /api\.resend\.com\/emails/);
  const payload = JSON.parse(options.body);
  sentEmails.push(payload);
  const owner = JSON.stringify(payload.to).includes('owner@example.com');
  return {
    status: owner && failOwnerEmail ? 503 : 201,
    json: async () => owner && failOwnerEmail ? { error: 'test alert failure' } : { id: 'test-message' },
  };
};

function req(body) {
  const request = Readable.from([Buffer.from(JSON.stringify(body))]);
  request.method = 'POST';
  request.headers = { 'content-type': 'application/json' };
  return request;
}

function res() {
  return {
    _status: 0,
    _json: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this._status = code; return this; },
    json(body) { this._json = body; return this; },
  };
}

async function submit(rating, comments) {
  customer = {
    id: 'c-1', name: 'Dana Reyes', email: 'dana@example.com', rating: null,
    comments: null, status: 'sent',
  };
  updated = null;
  sentEmails = [];
  const body = { token: 'test-token', rating };
  if (comments !== undefined) body.comments = comments;
  const response = res();
  await handler(req(body), response);
  return { response, emails: sentEmails.slice(), patch: updated };
}

(async () => {
  let failures = 0;
  function check(label, fn) {
    try {
      fn();
      console.log(`PASS  ${label}`);
    } catch (error) {
      failures++;
      console.log(`FAIL  ${label}\n      ${error.message}`);
    }
  }

  const invitations = [];
  for (let rating = 1; rating <= 5; rating++) {
    const result = await submit(rating);
    const customerMail = result.emails.find(mail => JSON.stringify(mail.to).includes('dana@example.com'));
    invitations.push(customerMail && customerMail.text);
    check(`${rating}/5 receives the optional review invitation`, () => {
      assert.equal(result.response._status, 200);
      assert.ok(customerMail);
      assert.match(customerMail.text, /https:\/\/example\.com\/review/);
      assert.match(customerMail.text, /optional/i);
      assert.equal(result.patch.rating, rating);
      assert.ok(result.patch.reviewLinkSentAt);
    });
    check(`${rating}/5 is not sent review-gated copy`, () => {
      assert.doesNotMatch(customerMail.text, /glad the job went well|happy customer|before this becomes public/i);
    });
    check(`${rating}/5 owner alert follows the private-feedback rule`, () => {
      const ownerMail = result.emails.find(mail => JSON.stringify(mail.to).includes('owner@example.com'));
      assert.equal(Boolean(ownerMail), rating <= 3);
      if (rating <= 3) {
        assert.match(ownerMail.text, /follow up privately/i);
        assert.equal(result.patch.status, 'low-rating-alerted');
      } else {
        assert.equal(result.patch.status, 'review-link-sent');
      }
    });
  }
  check('all five ratings receive identical Google review link copy', () => {
    assert.equal(new Set(invitations).size, 1);
  });

  const originalSubmission = await submit(4);
  const duplicateResponse = res();
  await handler(req({ token: 'test-token', rating: 4 }), duplicateResponse);
  check('a duplicate rating submission does not send the invitation twice', () => {
    assert.equal(duplicateResponse._status, 200);
    assert.equal(originalSubmission.emails.length, 1);
    assert.equal(sentEmails.length, 1);
  });

  const commented = await submit(5, '<script>private note</script>');
  check('private comments at any rating are emailed to owner and stored', () => {
    const ownerMail = commented.emails.find(mail => JSON.stringify(mail.to).includes('owner@example.com'));
    assert.ok(ownerMail);
    assert.match(ownerMail.text, /private note/);
    assert.match(ownerMail.html, /&lt;script&gt;/);
    assert.equal(commented.patch.comments, '<script>private note</script>');
    assert.equal(commented.patch.feedbackAlertStatus, 'sent');
    assert.equal(commented.patch.status, 'review-link-sent');
  });

  failOwnerEmail = true;
  const originalConsoleError = console.error;
  console.error = () => {};
  let alertFailure;
  try {
    alertFailure = await submit(2);
  } finally {
    console.error = originalConsoleError;
    failOwnerEmail = false;
  }
  check('failed private alert does not suppress invitation or lose low rating', () => {
    assert.equal(alertFailure.response._status, 200);
    assert.equal(alertFailure.emails.filter(mail => JSON.stringify(mail.to).includes('dana@example.com')).length, 1);
    assert.equal(alertFailure.patch.status, 'low-rating-alert-failed');
    assert.equal(alertFailure.patch.feedbackAlertStatus, 'failed');
  });

  const page = fs.readFileSync(path.join(__dirname, '..', 'review.html'), 'utf8');
  check('customer-facing form explains equal invitations and private comments', () => {
    assert.match(page, /same optional Google review link to every customer, whatever the rating/i);
    assert.match(page, /know privately/i);
  });

  console.log(failures ? `\n${failures} failure(s)` : '\nall review-flow checks passed');
  process.exit(failures ? 1 : 0);
})();
