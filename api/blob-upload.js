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
 * The Turnstile response token is passed through clientPayload and verified here
 * (in onBeforeGenerateToken) BEFORE any client token is issued. Allowed content
 * types and the size cap are enforced server-side by the signed token.
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
  if (!secret) return Promise.resolve(true);
  if (!token) return Promise.resolve(false);
  return fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: secret, response: token })
  }).then(function (r) { return r.json(); }).then(function (d) {
    return d.success === true;
  }).catch(function () { return false; });
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
        var ok = await verifyTurnstile(clientPayload);
        if (!ok) {
          var err = new Error('Verification failed. Please refresh and try again.');
          err.status = 403;
          throw err;
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
