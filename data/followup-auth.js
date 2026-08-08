/**
 * Master Glass Solutions - Follow-Up Desk auth helpers.
 *
 * HMAC-SHA256 signing for:
 *  - Desk session tokens (short-lived, ~24h), issued by /api/followup-desk-login.
 *  - Customer review tokens, embedded in /review?c=<token>. The payload carries
 *    the customer id + name + email so /review can prefill the form client-side
 *    (the signature is verified server-side by /api/review-submit).
 *
 * Secret: FOLLOWUP_SESSION_SECRET, defaults derived from FOLLOWUP_DESK_PASSCODE.
 * Server-only (CommonJS).
 */

var crypto = require('crypto');

function sessionSecret() {
  return process.env.FOLLOWUP_SESSION_SECRET ||
    ('mgs-followup-' + (process.env.FOLLOWUP_DESK_PASSCODE || 'mgs'));
}

function hmac(payload) {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

function signSession(sub) {
  var body = Buffer.from(JSON.stringify({
    sub: sub,
    iat: Date.now(),
    exp: Date.now() + 24 * 3600 * 1000
  })).toString('base64url');
  return body + '.' + hmac(body);
}

function verifySession(token) {
  var parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  var expected = hmac(parts[0]);
  var a = Buffer.from(parts[1]);
  var b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  var data;
  try {
    data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
  if (!data || !data.sub || !data.exp || data.exp < Date.now()) return null;
  return data.sub;
}

function createReviewToken(name, email) {
  var id = 'c_' + crypto.randomUUID().replace(/-/g, '');
  var payload = { id: id, name: name, email: email };
  var body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { id: id, token: body + '.' + hmac(body) };
}

function verifyReview(token) {
  var parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  var expected = hmac(parts[0]);
  var a = Buffer.from(parts[1]);
  var b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  var data;
  try {
    data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }
  if (!data || !data.id) return null;
  return data;
}

module.exports = { signSession: signSession, verifySession: verifySession, createReviewToken: createReviewToken, verifyReview: verifyReview };
