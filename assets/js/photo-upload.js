/* Master Glass Solutions - photo upload helper.
   Uses the @vercel/blob client-upload pattern: the browser requests a short-lived
   client token from POST /api/blob-upload (Vercel Blob), then PUTs the raw bytes
   directly to https://vercel.com/api/blob. This avoids the serverless function
   body size limit. Exposes window.MGS.photoUpload.
   Used by the guided quote form's photo step. */

(function () {
  'use strict';

  var MAX_BYTES = 10 * 1024 * 1024; // 10 MB — keep in sync with api/blob-upload.js
  var EXT_BY_TYPE = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/gif': 'gif'
  };
  var ALLOWED = Object.keys(EXT_BY_TYPE);

  function getTurnstileToken() {
    try {
      if (window.turnstile) {
        return window.turnstile.getResponse();
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  function validateFile(file) {
    if (!file) return 'No file selected.';
    if (ALLOWED.indexOf(file.type) === -1) return 'That file type is not supported. Use JPG, PNG, WebP, HEIC, or GIF.';
    if (file.size > MAX_BYTES) return 'That photo is over 10 MB. Please choose a smaller file.';
    return '';
  }

  function buildPathname(file) {
    var ext = EXT_BY_TYPE[file.type] || 'jpg';
    var base = String(file.name || 'photo')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/\.[a-z0-9]+$/i, '')
      .slice(-100);
    if (!base) base = 'photo';
    return 'quotes/' + Date.now().toString(36) + '-' + base + '.' + ext;
  }

  function uploadFile(file, turnstileToken) {
    return new Promise(function (resolve, reject) {
      var err = validateFile(file);
      if (err) { reject(new Error(err)); return; }

      if (!window.VercelBlob || !window.VercelBlob.upload) {
        reject(new Error('The photo uploader is still loading. Please try again in a moment.'));
        return;
      }

      var token = (typeof turnstileToken === 'string' && turnstileToken) ? turnstileToken : getTurnstileToken();

      window.VercelBlob.upload(buildPathname(file), file, {
        access: 'public',
        handleUploadUrl: '/api/blob-upload',
        clientPayload: token,
        contentType: file.type
      }).then(function (blob) {
        resolve(blob.url);
      }).catch(function (e) {
        var msg = (e && e.message) ? e.message : 'Upload failed';
        if (/client token|verification|failed to/i.test(msg)) {
          msg = 'Security check failed. Please refresh the page and try again.';
        }
        var err = new Error(msg);
        err.raw = e;
        reject(err);
      });
    });
  }

  window.MGS = window.MGS || {};
  window.MGS.photoUpload = {
    validateFile: validateFile,
    uploadFile: uploadFile,
    ALLOWED: ALLOWED,
    MAX_BYTES: MAX_BYTES
  };
})();
