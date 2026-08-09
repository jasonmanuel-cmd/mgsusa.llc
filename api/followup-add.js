/**
 * Master Glass Solutions - Follow-Up Desk: add customer.
 *
 * POST /api/followup-add  (header Authorization: Bearer <session>)
 * Body: { name, email, notes? }
 * -> 200 { ok: true, record: {...} }
 * -> 401 bad session | 422 validation | 502 Resend failure.
 *
 * Auth'd. Saves the customer record to Blob JSON (status "sent"), then emails
 * the customer a branded satisfaction link to /review?c=<token>. Never cached.
 *
 * Env: RESEND_API_KEY, LEAD_FROM_EMAIL, BLOB_READ_WRITE_TOKEN
 */

var followupStore = require('../data/followup-store');
var followupAuth = require('../data/followup-auth');

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function checkSession(req) {
  var header = req.headers.authorization || '';
  var m = /^Bearer\s+(.+)$/.exec(header);
  if (!m) return false;
  return followupAuth.verifySession(m[1]) !== null;
}

function sendEmail(to, mail) {
  var from = process.env.LEAD_FROM_EMAIL || 'no-reply@mgssite.com';
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.RESEND_API_KEY
    },
    body: JSON.stringify({ from: from, to: to, subject: mail.subject, text: mail.text, html: mail.html })
  }).then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); });
}

function buildSatisfactionEmail(name, token) {
  var url = 'https://www.mgsusa.llc/review?c=' + encodeURIComponent(token);
  var text =
    'Hi ' + name + ',\n\n' +
    "Thanks for choosing Master Glass Solutions! We'd love your quick feedback on " +
    'the job — it takes under a minute:\n\n' +
    'Rate your experience: ' + url + '\n';
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;max-width:640px;">' +
    '<p style="margin:0 0 12px;">Hi ' + escapeHtml(name) + ',</p>' +
    '<p style="margin:0 0 12px;">Thanks for choosing Master Glass Solutions! We\'d love your quick ' +
    'feedback on the job — it takes under a minute:</p>' +
    '<p style="margin:0 0 12px;"><a href="' + escapeHtml(url) + '" style="background:#C41E3A;color:#ffffff;' +
    'text-decoration:none;padding:10px 18px;border-radius:4px;display:inline-block;">' +
    'Rate your experience</a></p>' +
    '<p style="margin:0;color:#6b7280;font-size:12px;">If the button doesn\'t work, open this link: ' +
    '<a href="' + escapeHtml(url) + '">' + escapeHtml(url) + '</a></p>' +
    '</div>';
  return { subject: 'How was your glass project?', text: text, html: html };
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

  if (!process.env.RESEND_API_KEY) {
    return jsonError(res, 503, 'Email sending is not configured yet.');
  }

  var body;
  try {
    body = await readBody(req);
  } catch (e) {
    return jsonError(res, 400, e.message);
  }

  var name = clean(body.name, 200);
  var email = clean(body.email, 254);
  var notes = clean(body.notes, 2000);

  var errors = [];
  if (!name) errors.push('Customer name is required.');
  if (!email || !EMAIL_RE.test(email)) errors.push('A valid email is required.');

  if (errors.length) {
    return res.status(422).json({ ok: false, errors: errors });
  }

  var signed = followupAuth.createReviewToken({ name: name, email: email });
  var now = new Date().toISOString();

  var record = {
    id: signed.id,
    token: signed.token,
    name: name,
    email: email,
    notes: notes || null,
    status: 'sent',
    rating: null,
    comments: null,
    createdAt: now,
    emailedAt: null,
    ratedAt: null
  };

  try {
    record = await followupStore.add(record);
  } catch (e) {
    console.error('followup-add store error', e);
    return jsonError(res, 500, 'Could not save the customer record.');
  }

  var mail = buildSatisfactionEmail(name, record.token);
  try {
    var sent = await sendEmail(record.email, mail);
    if (sent.status >= 400) {
      console.error('Resend error (followup-add)', sent.status, JSON.stringify(sent.data).slice(0, 500));
      return jsonError(res, 502, 'We could not email the customer right now. Try again.');
    }
    try {
      record = await followupStore.update(record.id, { emailedAt: now });
    } catch (e) {
      console.error('followup-add emailedAt update failed', e);
    }
    return res.status(200).json({ ok: true, record: record });
  } catch (e) {
    console.error('Email send failed (followup-add)', e);
    return jsonError(res, 502, 'We could not email the customer right now. Try again.');
  }
};
