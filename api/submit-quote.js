/**
 * Master Glass Solutions - quote / checklist form submission.
 *
 * POST /api/submit-quote
 * Body: {
 *   kind: 'quote' | 'checklist',
 *   first-name, last-name, email, phone, service, projectType,
 *   location, timeline, details, business, consent,
 *   photos: string[] (Vercel Blob URLs),
 *   page, turnstileToken
 * }
 *
 * Verifies Cloudflare Turnstile (when TURNSTILE_SECRET_KEY is set), validates,
 * and sends a formatted lead email via Resend. Never cached (no-store).
 *
 * Env: RESEND_API_KEY, LEAD_NOTIFICATION_EMAIL, LEAD_FROM_EMAIL,
 *      TURNSTILE_SECRET_KEY (optional; skip verification when unset)
 */

var serviceOptions = require('../data/service-options');

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var PHONE_RE = /^[+()\-.\s\d]{7,20}$/;

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

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clean(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max || 2000);
}

function validateQuote(body) {
  var errors = [];
  var d = {
    firstName: clean(body['first-name'], 120),
    lastName: clean(body['last-name'], 120),
    email: clean(body.email, 254),
    phone: clean(body.phone, 40),
    service: clean(body.service, 200),
    projectType: clean(body.projectType, 200),
    location: clean(body.location, 200),
    timeline: clean(body.timeline, 120),
    details: clean(body.details, 4000),
    business: clean(body.business, 200),
    consent: body.consent === true || body.consent === 'true' || body.consent === 'on',
    photos: Array.isArray(body.photos) ? body.photos.filter(function (u) { return typeof u === 'string' && /^https:\/\//.test(u); }).slice(0, 6) : []
  };

  if (!d.firstName) errors.push('First name is required.');
  if (!d.lastName) errors.push('Last name is required.');
  if (!d.email || !EMAIL_RE.test(d.email)) errors.push('A valid email is required.');
  if (d.phone && !PHONE_RE.test(d.phone)) errors.push('Please enter a valid phone number.');
  if (!d.service) errors.push('Please choose a service.');
  if (!d.location) errors.push('Property location is required.');
  if (!d.consent) errors.push('Consent is required so we can follow up about your project.');
  if (!d.consent && body.kind !== 'checklist') errors.push('Consent is required.');

  return { data: d, errors: errors };
}

function validateChecklist(body) {
  var errors = [];
  var d = {
    firstName: clean(body['first-name'], 120),
    email: clean(body.email, 254),
    service: clean(body.service, 200),
    location: clean(body.location, 200),
    consent: body.consent === true || body.consent === 'true' || body.consent === 'on'
  };
  if (!d.firstName) errors.push('First name is required.');
  if (!d.email || !EMAIL_RE.test(d.email)) errors.push('A valid email is required.');
  if (!d.consent) errors.push('Consent is required to send the checklist.');

  return { data: d, errors: errors };
}

function buildQuoteEmail(d, page) {
  var serviceLabel = d.service || d.projectType || '';
  var serviceInfo = serviceOptions.getByLabel(serviceLabel) || serviceOptions.getService(d.projectType) || null;

  var rows = [
    ['Name', d.firstName + ' ' + d.lastName],
    ['Email', '<a href="mailto:' + escapeHtml(d.email) + '">' + escapeHtml(d.email) + '</a>'],
    ['Phone', escapeHtml(d.phone) || 'Not provided'],
    ['Service', escapeHtml(serviceLabel)],
    ['Project type', escapeHtml(d.projectType) || '-'],
    ['Location', escapeHtml(d.location)],
    ['Timeline', escapeHtml(d.timeline) || 'Not selected'],
    ['Company / property', escapeHtml(d.business) || '-'],
    ['Source page', escapeHtml(page) || '-']
  ];

  var photoHtml = '';
  if (d.photos.length) {
    photoHtml = '<h3>Photos (' + d.photos.length + ')</h3><ul>' + d.photos.map(function (u) {
      return '<li><a href="' + escapeHtml(u) + '">' + escapeHtml(u) + '</a></li>';
    }).join('') + '</ul>';
  }

  var rowsHtml = rows.map(function (r) {
    return '<tr><td style="padding:6px 12px 6px 0;vertical-align:top;color:#4b5563;white-space:nowrap;"><strong>' + r[0] + '</strong></td>' +
      '<td style="padding:6px 0;color:#111827;">' + r[1] + '</td></tr>';
  }).join('');

  var text = 'New quote request\n\n' +
    rows.map(function (r) { return r[0] + ': ' + r[1].replace(/<[^>]+>/g, ''); }).join('\n') +
    '\n\nDetails:\n' + (d.details || '(none)') +
    (d.photos.length ? '\n\nPhotos:\n' + d.photos.join('\n') : '');

  return {
    subject: 'New quote request: ' + serviceLabel + ' - ' + d.firstName + ' ' + d.lastName,
    text: text,
    html:
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;max-width:640px;">' +
      '<h2 style="color:#C41E3A;margin:0 0 16px;">New quote request</h2>' +
      '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' + rowsHtml + '</table>' +
      '<h3 style="margin:16px 0 6px;">Details</h3>' +
      '<p style="margin:0;white-space:pre-wrap;">' + escapeHtml(d.details || '(none)') + '</p>' +
      photoHtml +
      '</div>'
  };
}

function buildChecklistEmail(d, page) {
  var rows = [
    ['First name', escapeHtml(d.firstName)],
    ['Email', '<a href="mailto:' + escapeHtml(d.email) + '">' + escapeHtml(d.email) + '</a>'],
    ['Project type', escapeHtml(d.service) || '-'],
    ['City', escapeHtml(d.location) || '-'],
    ['Source page', escapeHtml(page) || '-']
  ];
  var rowsHtml = rows.map(function (r) {
    return '<tr><td style="padding:6px 12px 6px 0;vertical-align:top;color:#4b5563;white-space:nowrap;"><strong>' + r[0] + '</strong></td>' +
      '<td style="padding:6px 0;color:#111827;">' + r[1] + '</td></tr>';
  }).join('');
  return {
    subject: 'Planning checklist request: ' + d.firstName,
    text: 'Planning checklist request\n\n' + rows.map(function (r) { return r[0] + ': ' + r[1].replace(/<[^>]+>/g, ''); }).join('\n'),
    html:
      '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;max-width:640px;">' +
      '<h2 style="color:#C41E3A;margin:0 0 16px;">Planning checklist request</h2>' +
      '<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' + rowsHtml + '</table>' +
      '</div>'
  };
}

function sendEmail(mail) {
  var from = process.env.LEAD_FROM_EMAIL || 'quotes@mgsusa.llc';
  var to = process.env.LEAD_NOTIFICATION_EMAIL || 'masterglassllc@aol.com';
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.RESEND_API_KEY
    },
    body: JSON.stringify({ from: from, to: to, subject: mail.subject, text: mail.text, html: mail.html })
  }).then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Method not allowed. Use POST.');
  }

  if (!process.env.RESEND_API_KEY) {
    return jsonError(res, 503, 'Form submission is not configured yet. Please call 210-370-3700 or email ' + process.env.LEAD_NOTIFICATION_EMAIL || 'masterglassllc@aol.com');
  }

  var body;
  try {
    body = await readBody(req);
  } catch (e) {
    return jsonError(res, 400, e.message);
  }

  var kind = body.kind === 'checklist' ? 'checklist' : 'quote';
  var result = kind === 'checklist' ? validateChecklist(body) : validateQuote(body);

  if (result.errors.length) {
    return res.status(422).json({ ok: false, errors: result.errors });
  }

  var ok = await verifyTurnstile(body.turnstileToken);
  if (!ok) {
    return jsonError(res, 403, 'Verification failed. Please refresh and try again.');
  }

  var mail = kind === 'checklist'
    ? buildChecklistEmail(result.data, body.page)
    : buildQuoteEmail(result.data, body.page);

  try {
    var sent = await sendEmail(mail);
    if (sent.status >= 400) {
      console.error('Resend error', sent.status, JSON.stringify(sent.data).slice(0, 500));
      return jsonError(res, 502, 'We could not send your request right now. Please call 210-370-3700.');
    }
    return res.status(200).json({ ok: true, redirect: '/thank-you', kind: kind });
  } catch (e) {
    console.error('Email send failed', e);
    return jsonError(res, 502, 'We could not send your request right now. Please call 210-370-3700.');
  }
};
