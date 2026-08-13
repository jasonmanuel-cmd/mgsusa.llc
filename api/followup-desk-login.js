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

/* Passcode matching.
 *
 * The configured passcode is typed by hand on a phone as often as on a desktop,
 * so compare a normalized form: zero-width characters stripped, the various
 * unicode dashes and no-break spaces folded to ASCII (iOS smart punctuation and
 * copy-paste from a contact card both produce them), and the ends trimmed —
 * including on the env var, where a trailing newline is easy to paste in and
 * impossible to see in the Vercel dashboard.
 *
 * When the passcode is a phone number, separators are also ignored, so
 * "210-370-3700", "2103703700" and "(210) 370-3700" all unlock. Formatting
 * carries no secrecy, so accepting every spelling of the same digits costs
 * nothing and removes the most likely reason for a correct passcode to bounce.
 */
function normalizePasscode(value) {
  return String(value == null ? '' : value)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .trim();
}

var PHONE_LIKE = /^[+()\-.\s\d]+$/;

function digitsOnly(value) {
  return value.replace(/\D/g, '');
}

function passcodeMatches(submitted, configured) {
  var typed = normalizePasscode(submitted);
  var expected = normalizePasscode(configured);
  if (!typed || !expected) return false;
  if (safeEqual(typed, expected)) return true;
  if (PHONE_LIKE.test(expected) && digitsOnly(expected).length >= 7) {
    return safeEqual(digitsOnly(typed), digitsOnly(expected));
  }
  return false;
}

/* Per-IP throttle on failed attempts.
 *
 * A phone number is only ten digits, so the login needs a ceiling on guess rate.
 * Counters live in the lambda's memory — per warm instance rather than global,
 * the same trade-off documented in api/chat.js. Successful logins clear the
 * counter, so the owner never throttles themselves by typing it right.
 */
var FAIL_WINDOW_MS = 15 * 60 * 1000;
var MAX_FAILS = 8;
var MAX_TRACKED_IPS = 5000;

var failsByIp = new Map();

function clientIp(req) {
  var xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.headers['x-real-ip'] ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown';
}

function recentFails(ip, now) {
  var times = (failsByIp.get(ip) || []).filter(function (t) {
    return now - t < FAIL_WINDOW_MS;
  });
  if (times.length) failsByIp.set(ip, times);
  else failsByIp.delete(ip);
  return times;
}

// 0 when allowed, otherwise the seconds to wait before trying again.
function lockoutRetryAfter(ip, now) {
  var times = recentFails(ip, now);
  if (times.length < MAX_FAILS) return 0;
  return Math.max(1, Math.ceil((FAIL_WINDOW_MS - (now - times[0])) / 1000));
}

function recordFail(ip, now) {
  if (!failsByIp.has(ip) && failsByIp.size >= MAX_TRACKED_IPS) {
    failsByIp.forEach(function (times, key) {
      if (!times.length || now - times[times.length - 1] >= FAIL_WINDOW_MS) {
        failsByIp.delete(key);
      }
    });
  }
  var times = recentFails(ip, now);
  times.push(now);
  failsByIp.set(ip, times);
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

  var ip = clientIp(req);
  var now = Date.now();

  var retryAfter = lockoutRetryAfter(ip, now);
  if (retryAfter) {
    res.setHeader('Retry-After', String(retryAfter));
    return jsonError(res, 429, 'Too many attempts. Try again in ' +
      Math.ceil(retryAfter / 60) + ' minute(s).');
  }

  var body;
  try {
    body = await readBody(req);
  } catch (e) {
    return jsonError(res, 400, e.message);
  }

  var passcode = String(body.passcode || '');
  if (!passcode.trim()) {
    return jsonError(res, 401, 'Passcode is required.');
  }

  if (!passcodeMatches(passcode, process.env.FOLLOWUP_DESK_PASSCODE)) {
    recordFail(ip, now);
    return jsonError(res, 401, 'Incorrect passcode.');
  }

  failsByIp.delete(ip);
  var session = followupAuth.signSession('owner');
  return res.status(200).json({ ok: true, session: session });
};
