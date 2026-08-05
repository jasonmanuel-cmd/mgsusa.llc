/* Master Glass Solutions - photo upload helper.
   Uploads a selected image via POST /api/blob-upload (Vercel Blob) then PUTs
   the raw bytes to the returned uploadUrl. Exposes window.MGS.photoUpload.
   Used by the guided quote form's photo step. */

(function () {
  'use strict';

  var MAX_BYTES = 10 * 1024 * 1024; // 10 MB — keep in sync with api/blob-upload.js
  var ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'];

  function getTurnstileToken() {
    try {
      if (window.turnstile) {
        return window.turnstile.getResponse();
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  function api(url, options) {
    return fetch(url, options).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) {
          var err = new Error((data && data.error) || ('Request failed (' + r.status + ')'));
          err.status = r.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  function validateFile(file) {
    if (!file) return 'No file selected.';
    if (ALLOWED.indexOf(file.type) === -1) return 'That file type is not supported. Use JPG, PNG, WebP, HEIC, or GIF.';
    if (file.size > MAX_BYTES) return 'That photo is over 10 MB. Please choose a smaller file.';
    return '';
  }

  function uploadFile(file) {
    return new Promise(function (resolve, reject) {
      var err = validateFile(file);
      if (err) { reject(new Error(err)); return; }

      api('/api/blob-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          turnstileToken: getTurnstileToken()
        })
      }).then(function (data) {
        // The signed URL is public (permanent) with the download=1 query param
        // appended server-side; we store the plain URL for the form payload.
        var publicUrl = data.url.split('?download=1')[0];
        return fetch(data.uploadUrl, { method: 'PUT', body: file }).then(function () {
          return publicUrl;
        });
      }).then(resolve).catch(reject);
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
