/**
 * Master Glass Solutions - /review page submission.
 *
 * POST /api/review-submit  (public, Turnstile optional when key set)
 * Body: { token, rating, comments? }
 * -> 200 { ok: true, redirect: "/thank-you" }
 * -> 400 bad token | 422 invalid rating | 502 customer-email failure.
 *
 * Validates the HMAC review token (from /review?c=<token>), looks up the stored
 * customer, and sends the same optional Google review invitation for every
 * rating. Private comments are stored for the owner; low ratings and any written
 * comment also trigger a private owner email. Rating never controls access to
 * the public review link. Already-rated customers short-circuit (idempotent).
 * Never cached.
 *
 * Env: RESEND_API_KEY, LEAD_FROM_EMAIL, LEAD_NOTIFICATION_EMAIL,
 *      GOOGLE_REVIEW_URL (optional override), TURNSTILE_SECRET_KEY (optional)
 */

var followupStore = require('../data/followup-store');
var followupAuth = require('../data/followup-auth');
var leadRecipients = require('../data/lead-recipients').leadRecipients;

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
    'Thanks for sharing your feedback, ' + name + '. If you would like to share an honest review publicly, ' +
    'you can use this optional Google link:\n\n' +
    'Leave a Google review: ' + url + '\n\n' +
    'Leaving a review is completely optional. Thank you for choosing Master Glass Solutions.';
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;max-width:640px;">' +
    '<p style="margin:0 0 12px;">Thanks for sharing your feedback, ' + escapeHtml(name) +
    '. If you would like to share an honest review publicly, you can use this optional Google link:</p>' +
    '<p style="margin:0 0 12px;"><a href="' + escapeHtml(url) + '" style="background:#C41E3A;color:#ffffff;' +
    'text-decoration:none;padding:10px 18px;border-radius:4px;display:inline-block;">' +
    'Leave a Google review</a></p>' +
    '<p style="margin:0 0 12px;color:#6b7280;font-size:12px;">Leaving a review is completely optional. ' +
    'If the button does not work, open this link: <a href="' + escapeHtml(url) + '">' + escapeHtml(url) + '</a></p>' +
    '<p style="margin:0;color:#6b7280;font-size:12px;">Thank you for choosing Master Glass Solutions.</p>' +
    '</div>';
  return { subject: 'Thanks for your feedback — optional Google review link', text: text, html: html };
}

function buildPrivateFeedbackAlert(customer, rating, comments) {
  var text =
    'Private post-job feedback received.\n' +
    'Rating: ' + rating + '/5\n' +
    'Name: ' + customer.name + '\n' +
    'Email: ' + customer.email +
    (comments ? '\nComments: ' + comments : '') +
    '\n\nAn optional Google review invitation was sent to this customer, as it is to every customer.' +
    (rating <= 3 ? '\nPlease follow up privately about their experience.' : '');
  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;max-width:640px;">' +
    '<h2 style="color:#C41E3A;margin:0 0 12px;">Private customer feedback</h2>' +
    '<p style="margin:0 0 12px;">A customer submitted private feedback about a glass project.</p>' +
    '<p style="margin:0 0 12px;"><strong>Rating:</strong> ' + rating + '/5' +
    '<br><strong>Name:</strong> ' + escapeHtml(customer.name) +
    '<br><strong>Email:</strong> <a href="mailto:' + escapeHtml(customer.email) + '">' + escapeHtml(customer.email) + '</a></p>' +
    (comments
      ? '<p style="margin:0 0 12px;"><strong>Private comments:</strong> ' + escapeHtml(comments) + '</p>'
      : '') +
    '<p style="margin:0 0 12px;color:#6b7280;">An optional Google review invitation was sent to this customer, ' +
    'as it is to every customer.</p>' +
    (rating <= 3
      ? '<p style="margin:0;color:#b45309;font-weight:bold;">Please follow up privately about their experience.</p>'
      : '') +
    '</div>';
  return {
    subject: (rating <= 3 ? 'Customer follow-up requested: ' : 'Private customer feedback: ') +
      customer.name + ' (' + rating + '/5)',
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
  var patch = {
    rating: rating,
    comments: comments,
    ratedAt: now,
    reviewLinkSentAt: now,
    status: 'review-link-sent',
    feedbackAlertStatus: 'not-needed'
  };

  // Every rating gets the same optional public invitation. The rating and
  // comments stay in the private follow-up record regardless of score.
  try {
    var customerMail = await sendEmail(customer.email, buildReviewLinkEmail(customer.name));
    if (customerMail.status >= 400) {
      console.error('Resend error (review-submit link)', customerMail.status, JSON.stringify(customerMail.data).slice(0, 500));
      return jsonError(res, 502, 'We could not send your review link right now. Please call 210-370-3700.');
    }
  } catch (e) {
    console.error('Review invitation send failed (review-submit)', e);
    return jsonError(res, 502, 'We could not send your review link right now. Please call 210-370-3700.');
  }

  // A low score or any written comment is also privately sent to the owner.
  // Failure of that secondary notification never removes the customer's
  // optional review link or hides the feedback from the dashboard.
  if (rating <= 3 || comments) {
    patch.feedbackAlertStatus = 'failed';
    try {
      var alert = await sendEmail(leadRecipients(), buildPrivateFeedbackAlert(customer, rating, comments));
      if (alert.status >= 400) {
        throw new Error('Resend returned ' + alert.status + ' ' + JSON.stringify(alert.data).slice(0, 300));
      }
      patch.feedbackAlertStatus = 'sent';
      patch.feedbackAlertedAt = new Date().toISOString();
      if (rating <= 3) { patch.status = 'low-rating-alerted'; }
    } catch (e) {
      console.error('Private feedback alert send failed (review-submit)', e);
      if (rating <= 3) { patch.status = 'low-rating-alert-failed'; }
    }
  }

  try {
    await followupStore.update(customer.id, patch);
  } catch (e) {
    console.error('review-submit status update failed', e);
    // The invitation and feedback alert already went out; still confirm to the customer.
  }

  return res.status(200).json({ ok: true, redirect: '/thank-you' });
};
