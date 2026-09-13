/**
 * Master Glass Solutions - Follow-Up Desk: list customers.
 *
 * POST /api/followup-list  (header Authorization: Bearer <session>)
 * -> 200 { ok: true, customers: [...] } (sorted newest first).
 * -> 401 bad session | 500 store error.
 *
 * Auth'd. Returns all customer records + statuses from the Blob JSON store.
 * Never cached.
 *
 * Env: FOLLOWUP_BLOB_READ_WRITE_TOKEN
 */

var followupStore = require('../data/followup-store');
var followupAuth = require('../data/followup-auth');

function jsonError(res, status, message) {
  res.status(status).json({ ok: false, error: message });
}

function checkSession(req) {
  var header = req.headers.authorization || '';
  var m = /^Bearer\s+(.+)$/.exec(header);
  if (!m) return false;
  return followupAuth.verifySession(m[1]) !== null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Method not allowed. Use POST.');
  }

  if (!checkSession(req)) {
    return jsonError(res, 401, 'Unauthorized. Please log in again.');
  }

  try {
    var customers = await followupStore.list();
    customers.sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return res.status(200).json({ ok: true, customers: customers });
  } catch (e) {
    console.error('followup-list error', e);
    return jsonError(res, 500, 'Could not load customers.');
  }
};
