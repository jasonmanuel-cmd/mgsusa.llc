/**
 * TEMPORARY diagnostic - delete once Turnstile is confirmed working.
 *
 * GET /api/_turnstile-check
 *
 * Sends a deliberately invalid token to Cloudflare siteverify and reports only
 * the returned error codes. The secret is never returned, logged, or echoed.
 *
 *   errorCodes ["invalid-input-response"] -> secret is VALID (token was the
 *                                            only problem, which is expected)
 *   errorCodes ["invalid-input-secret"]   -> the configured secret is wrong,
 *                                            or does not match the site key
 */

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  var secret = process.env.TURNSTILE_SECRET_KEY;
  // Site keys are public (they ship in the page HTML), so echoing is safe.
  var siteKeyEnv = process.env.TURNSTILE_SITE_KEY || null;
  var HARDCODED_SITE_KEY = '0x4AAAAAAEGumU2z9QHnLmlL';

  if (!secret) {
    return res.status(200).json({ secretConfigured: false, siteKeyEnv: siteKeyEnv });
  }

  try {
    var r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secret, response: 'dummy-invalid-token' })
    });
    var d = await r.json();
    return res.status(200).json({
      secretConfigured: true,
      siteKeyEnv: siteKeyEnv,
      siteKeyInJs: HARDCODED_SITE_KEY,
      siteKeysMatch: siteKeyEnv ? (siteKeyEnv.trim() === HARDCODED_SITE_KEY) : null,
      // length only - helps spot a truncated or whitespace-padded value
      secretLength: String(secret).length,
      secretHasWhitespace: /\s/.test(String(secret)),
      httpStatus: r.status,
      success: d.success,
      errorCodes: d['error-codes'] || []
    });
  } catch (e) {
    return res.status(200).json({ secretConfigured: true, fetchError: e && e.message });
  }
};
