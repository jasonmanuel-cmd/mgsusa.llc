/**
 * Master Glass Solutions - photo upload (Vercel Blob, client-upload pattern).
 *
 * POST /api/blob-upload
 * Body: { type: 'blob.generate-client-token',
 *         payload: { pathname, clientPayload, multipart } }
 *
 * This route issues a short-lived client token via @vercel/blob's handleUpload().
 * The browser then PUTs the raw file bytes directly to https://vercel.com/api/blob,
 * so uploads are NOT limited by the serverless function body size limit (4.5 MB).
 *
 * The Turnstile response token is passed through clientPayload and checked here,
 * but a failed check no longer refuses the upload. Photos hang off a quote
 * request, and a customer whose Turnstile widget is broken was getting a 403
 * per photo after an 8 second wait -- which reads as "this form is broken" and
 * costs the lead. Abuse is bounded instead by the per-IP rate limit below,
 * alongside the allowed content types and size cap that the signed token
 * already enforces server-side.
 *
 * Env: BLOB_READ_WRITE_TOKEN, TURNSTILE_SECRET_KEY (optional)
 */

const { handleUpload } = require('@vercel/blob/client');

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

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

function verifyTurnstile(token) {
  var secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return Promise.resolve('skipped');
  if (!token) return Promise.resolve('missing');
  return fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: secret, response: token })
  }).then(function (r) { return r.json(); }).then(function (d) {
    return d.success === true ? 'passed' : 'failed';
  }).catch(function () { return 'unavailable'; });
}

/* What actually bounds abuse now. Six photos per quote is the form's cap, so
   these limits leave a real customer -- even one who retries a couple of
   uploads -- well clear, while stopping a script from using this as free
   image hosting. In lambda memory, same as api/chat.js. */
var MINUTE_MS = 60 * 1000;
var HOUR_MS = 60 * MINUTE_MS;
var MAX_PER_MINUTE = 15;
var MAX_PER_HOUR = 60;
var MAX_TRACKED_IPS = 5000;
var hitsByIp = new Map();

function clientIp(req) {
  var fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function rateLimitRetryAfter(ip, now) {
  var times = (hitsByIp.get(ip) || []).filter(function (t) { return now - t < HOUR_MS; });
  var inMinute = times.filter(function (t) { return now - t < MINUTE_MS; });
  if (inMinute.length >= MAX_PER_MINUTE) {
    hitsByIp.set(ip, times);
    return Math.max(1, Math.ceil((MINUTE_MS - (now - inMinute[0])) / 1000));
  }
  if (times.length >= MAX_PER_HOUR) {
    hitsByIp.set(ip, times);
    return Math.max(1, Math.ceil((HOUR_MS - (now - times[0])) / 1000));
  }
  times.push(now);
  hitsByIp.set(ip, times);
  if (hitsByIp.size > MAX_TRACKED_IPS) {
    hitsByIp.forEach(function (v, k) {
      if (!v.length || now - v[v.length - 1] > HOUR_MS) hitsByIp.delete(k);
    });
  }
  return 0;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Method not allowed. Use POST.');
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return jsonError(res, 503, 'Photo uploads are not configured yet. You can still submit the form without photos.');
  }

  var retryAfter = rateLimitRetryAfter(clientIp(req), Date.now());
  if (retryAfter) {
    res.setHeader('Retry-After', String(retryAfter));
    return jsonError(res, 429,
      'Too many photo uploads at once. Please wait a moment, or submit the form without photos and email them to us.');
  }

  var body;
  try {
    body = await readBody(req);
  } catch (e) {
    return jsonError(res, 400, e.message);
  }

  try {
    var result = await handleUpload({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      request: req,
      body: body,
      onBeforeGenerateToken: async function (pathname, clientPayload) {
        var verdict = await verifyTurnstile(clientPayload);
        if (verdict !== 'passed' && verdict !== 'skipped') {
          // Logged, not enforced: the content type and size cap below still
          // apply, and the rate limit above is what keeps volume sane.
          console.warn('blob-upload: unverified photo upload (' + verdict + ')');
        }
        return {
          access: 'public',
          addRandomSuffix: true,
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_BYTES
        };
      }
    });
    return res.status(200).json(result);
  } catch (e) {
    console.error('blob-upload error', e && e.message);
    var status = (e && e.status) || 400;
    return jsonError(res, status, (e && e.message) || 'Upload service error. Please try again or submit without photos.');
  }
};
