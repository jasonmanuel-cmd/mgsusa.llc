/**
 * Master Glass Solutions - photo upload (Vercel Blob).
 *
 * POST /api/blob-upload
 * Body: { fileName: string, fileType: string, turnstileToken?: string }
 * Returns a Blob uploadUrl + URL pattern. The client PUTs the raw bytes to
 * uploadUrl, then the final public URL is uploadedUrl.replace('?download=1','').
 *
 * Limits: images only (jpeg/png/webp/heic/heif/gif), max 10 MB, client upload
 * must not exceed Vercel's function size limit (so verify size server-side).
 *
 * Env: BLOB_READ_WRITE_TOKEN, TURNSTILE_SECRET_KEY (optional)
 */

var ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/gif': 'gif'
};
var MAX_BYTES = 10 * 1024 * 1024; // 10 MB

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

function sanitizeFileName(name) {
  return String(name || 'photo')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .slice(-120);
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

  var ext = ALLOWED_TYPES[body.fileType];
  if (!ext) {
    return jsonError(res, 415, 'Only JPG, PNG, WebP, HEIC, and GIF images are supported.');
  }

  var ok = await verifyTurnstile(body.turnstileToken);
  if (!ok) {
    return jsonError(res, 403, 'Verification failed. Please refresh and try again.');
  }

  var safeName = sanitizeFileName(body.fileName);
  var pathname = 'quotes/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safeName;
  if (!/\.(jpg|png|webp|heic|heif|gif)$/i.test(pathname)) {
    pathname += '.' + ext;
  }

  try {
    var blob = await fetch('https://api.vercel.com/v3/blob/upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.BLOB_READ_WRITE_TOKEN
      },
      body: JSON.stringify({
        pathname: pathname,
        maxDurationSeconds: 300,
        allowMultiple: false
      })
    }).then(function (r) { return r.json(); });

    if (!blob.uploadUrl || !blob.url || blob.url.length === 0) {
      console.error('Blob create failed', JSON.stringify(blob).slice(0, 500));
      return jsonError(res, 502, 'Upload service error. Please try again or submit without photos.');
    }

    // Vercel Blob is signed by default; make a public URL we can send to Resend.
    var publicUrl = blob.url + '?download=1';

    return res.status(200).json({
      ok: true,
      uploadUrl: blob.uploadUrl,
      url: publicUrl
    });
  } catch (e) {
    console.error('Blob create error', e);
    return jsonError(res, 502, 'Upload service error. Please try again or submit without photos.');
  }
};
