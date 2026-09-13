/**
 * Master Glass Solutions - /review page submission.
 *
 * POST /api/review-submit  (public, Turnstile optional when key set)
 * Body: { token, rating, comments? }
 * -> 200 { ok: true, redirect: "/thank-you" }
 * -> 400 bad token | 422 invalid rating | 502 Resend failure.
 *
 * Validates the HMAC review token (from /review?c=<token>), looks up the stored
 * customer, and routes:
 *   4-5★  -> emails the customer their Google review link; status "review-link-sent"
 *   1-3★  -> emails the owner a private low-rating alert;  status "low-rating-alerted"
 * Already-rated customers short-circuit (idempotent). Never cached.
 *
 * Env: RESEND_API_KEY, LEAD_FROM_EMAIL, LEAD_NOTIFICATION_EMAIL,
 *      GOOGLE_REVIEW_URL (optional override), TURNSTILE_SECRET_KEY (optional)
 */

var followupStore = require('../data/followup-store');
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

function verifyTurnstile(token) {
  var secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return Promise.resolve(true);
  if (!token) return Promise.resolve(false);
  return fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: secret, response: token })
  }).then(function (r) { return r.json(); }).then(function (d) {
    if (d.success !== true) {
      console.error('Turnstile verify failed (review-submit):', JSON.stringify(d['error-codes'] || d));
    }
    return d.success === true;
  }).catch(function (e) {
    console.error('Turnstile verify error (review-submit):', e && e.message);
    return false;
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

function buildReviewLinkEmail(name) {
  var url = process.env.GOOGLE_REVIEW_URL || 'https://g.page/r/CZoDFY2uA41TEAI/review';
  var text =
    'Thanks ' + name + "! We're glad the job went well. If you have a minute, " +
    'a Google review means the world to a small local business:\n\n' +
    'Leave a review: ' + url + '\n';
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;max-width:640px;">' +
    '<p style="margin:0 0 12px;">Thanks ' + escapeHtml(name) + "! We're glad the job went well. If you have a minute, " +
    'a Google review means the world to a small local business:</p>' +
    '<p style="margin:0 0 12px;"><a href="' + escapeHtml(url) + '" style="background:#C41E3A;color:#ffffff;' +
    'text-decoration:none;padding:10px 18px;border-radius:4px;display:inline-block;">' +
    'Leave a review</a></p>' +
    '<p style="margin:0;color:#6b7280;font-size:12px;">If the button doesn\'t work, open this link: ' +
    '<a href="' + escapeHtml(url) + '">' + escapeHtml(url) + '</a></p>' +
    '</div>';
  return { subject: 'Thanks for your feedback — leave us a review?', text: text, html: html };
}

function buildLowRatingAlert(customer, rating, comments) {
  var text =
    'A customer rated their job ' + rating + '/5.\n' +
    'Name: ' + customer.name + ' · Email: ' + customer.email +
    (comments ? '\nComments: ' + comments : '') +
    '\n\nFollow up BEFORE this becomes a public review.';
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;max-width:640px;">' +
    '<h2 style="color:#C41E3A;margin:0 0 12px;">Low rating alert</h2>' +
    '<p style="margin:0 0 12px;">A customer rated their job <strong>' + rating + '/5</strong>.</p>' +
    '<p style="margin:0 0 12px;"><strong>Name:</strong> ' + escapeHtml(customer.name) +
    '<br><strong>Email:</strong> <a href="mailto:' + escapeHtml(customer.email) + '">' + escapeHtml(customer.email) + '</a></p>' +
    (comments
      ? '<p style="margin:0 0 12px;"><strong>Comments:</strong> ' + escapeHtml(comments) + '</p>'
      : '') +
    '<p style="margin:0;color:#b45309;font-weight:bold;">Follow up BEFORE this becomes a public review.</p>' +
    '</div>';
  return {
    subject: 'Follow-up needed: ' + customer.name + ' rated ' + rating + '/5',
    text: text,
    html: html
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Method not allowed. Use POST.');
  }

  if (!process.env.RESEND_API_KEY) {
    return jsonError(res, 503, 'Review submissions are not configured yet.');
  }

  var body;
  try {
    body = await readBody(req);
  } catch (e) {
    return jsonError(res, 400, e.message);
  }

  var ok = await verifyTurnstile(body.turnstileToken);
  if (!ok) {
    return jsonError(res, 403, 'Verification failed. Please refresh and try again.');
  }

  var payload = followupAuth.verifyReview(body.token);
  if (!payload || !payload.id) {
    return jsonError(res, 400, 'This link is invalid or has expired.');
  }

  var rating = parseInt(body.rating, 10);
  if (!(rating >= 1 && rating <= 5)) {
    return jsonError(res, 422, 'Please select a rating from 1 to 5.');
  }

  var comments = clean(body.comments, 2000) || null;

  var customer;
  try {
    customer = await followupStore.get(payload.id);
  } catch (e) {
    console.error('review-submit store get error', e);
    return jsonError(res, 500, 'Could not look up this request.');
  }

  if (!customer) {
    return jsonError(res, 400, 'This link is invalid or has expired.');
  }

  if (customer.rating != null) {
    // Idempotent: already rated, don't email again.
    return res.status(200).json({ ok: true, redirect: '/thank-you' });
  }

  var now = new Date().toISOString();
  var patch = { rating: rating, comments: comments, ratedAt: now };

  try {
    if (rating >= 4) {
      var mail = buildReviewLinkEmail(customer.name);
      var sent = await sendEmail(customer.email, mail);
      if (sent.status >= 400) {
        console.error('Resend error (review-submit link)', sent.status, JSON.stringify(sent.data).slice(0, 500));
        return jsonError(res, 502, 'We could not send your review link right now. Please call 210-370-3700.');
      }
      patch.status = 'review-link-sent';
    } else {
      var owner = process.env.LEAD_NOTIFICATION_EMAIL || 'masterglassllc@aol.com';
      var alert = buildLowRatingAlert(customer, rating, comments);
      var sentAlert = await sendEmail(owner, alert);
      if (sentAlert.status >= 400) {
        console.error('Resend error (review-submit alert)', sentAlert.status, JSON.stringify(sentAlert.data).slice(0, 500));
        return jsonError(res, 502, 'We could not process your rating right now. Please call 210-370-3700.');
      }
      patch.status = 'low-rating-alerted';
    }
  } catch (e) {
    console.error('Email send failed (review-submit)', e);
    return jsonError(res, 502, 'We could not process your rating right now. Please call 210-370-3700.');
  }

  try {
    await followupStore.update(customer.id, patch);
  } catch (e) {
    console.error('review-submit status update failed', e);
    // The rating email already went out; still confirm to the customer.
  }

  return res.status(200).json({ ok: true, redirect: '/thank-you' });
};
