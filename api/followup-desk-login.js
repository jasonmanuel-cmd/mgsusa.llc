/**
 * Master Glass Solutions - Follow-Up Desk login.
 *
 * POST /api/followup-desk-login
 * Body: { passcode }
 * -> 200 { ok: true, session: "<hmac-token>" } | 401 on failure.
 *
 * Compares the passcode against FOLLOWUP_DESK_PASSCODE (timing-safe) and issues
 * a short-lived HMAC session token via data/followup-auth.js. Never cached.
 *
 * Env: FOLLOWUP_DESK_PASSCODE, FOLLOWUP_SESSION_SECRET (optional override)
 */

var crypto = require('crypto');
var followupAuth = require('../data/followup-auth');

function jsonError(res, status, message) {
  res.status(status).json({ ok: false, error: message });
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (chunk) { chunks.push(chunk); });
    req.on('end', function () {
      var raw = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function safeEqual(a, b) {
  var ba = Buffer.from(String(a || ''));
  var bb = Buffer.from(String(b || ''));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Method not allowed. Use POST.');
  }

  if (!process.env.FOLLOWUP_DESK_PASSCODE) {
    return jsonError(res, 503, 'Follow-Up Desk is not configured yet.');
  }

  var body;
  try {
    body = await readBody(req);
  } catch (e) {
    return jsonError(res, 400, e.message);
  }

  var passcode = String(body.passcode || '');
  if (!passcode) {
    return jsonError(res, 401, 'Passcode is required.');
  }

  if (!safeEqual(passcode, process.env.FOLLOWUP_DESK_PASSCODE)) {
    return jsonError(res, 401, 'Incorrect passcode.');
  }

  var session = followupAuth.signSession('owner');
  return res.status(200).json({ ok: true, session: session });
};
