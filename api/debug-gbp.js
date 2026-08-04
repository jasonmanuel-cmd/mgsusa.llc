/**
 * TEMPORARY diagnostic endpoint - remove after debugging.
 * Reports: token scopes, accounts owned, locations per account, and the
 * status of the currently-configured location's reviews.
 * No secrets are returned.
 */

var TOKEN_URL = 'https://oauth2.googleapis.com/token';

function decodeJwtPayload(token) {
  try {
    var parts = String(token).split('.');
    var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) { b64 += '='; }
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch (e) {
    return { error: String((e && e.message) || e) };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  var out = { ok: false };

  try {
    var body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('client_id', process.env.GOOGLE_CLIENT_ID);
    body.set('client_secret', process.env.GOOGLE_CLIENT_SECRET);
    body.set('refresh_token', process.env.GOOGLE_REFRESH_TOKEN);

    var tr = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    var tj = await tr.json();
    out.tokenStatus = tr.status;

    if (!tr.ok) {
      out.tokenError = (tj.error && tj.error_description) || tj.error || tr.statusText;
      return res.status(200).json(out);
    }

    var payload = decodeJwtPayload(tj.access_token);
    out.scopes = String(payload.scope || '').split(' ').filter(Boolean);
    out.tokenClientId = payload.client_id || process.env.GOOGLE_CLIENT_ID;

    var ar = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: 'Bearer ' + tj.access_token }
    });
    var aj = await ar.json();
    out.accountsStatus = ar.status;
    out.accounts = (aj.accounts || []).map(function (a) {
      return { name: a.name, accountName: a.accountName, type: a.type, state: a.state };
    });
    out.accountsError = ar.ok ? null : ((aj.error && aj.error.message) || ar.statusText);

    var acc = process.env.GOOGLE_BUSINESS_ACCOUNT_ID ||
      ((out.accounts && out.accounts[0]) ? out.accounts[0].name : null);
    out.lookupAccount = acc;

    if (acc) {
      var lr = await fetch(
        'https://mybusiness.googleapis.com/v4/accounts/' + encodeURIComponent(acc) + '/locations?pageSize=100',
        { headers: { Authorization: 'Bearer ' + tj.access_token } }
      );
      var lj = await lr.json();
      out.locationsStatus = lr.status;
      out.locations = (lj.locations || []).map(function (l) {
        var addr = l.storefrontAddress || {};
        return {
          name: l.name,
          title: l.title,
          category: l.category && l.category.displayName,
          address: (addr.addressLines || []).join(' '),
          state: l.locationState
        };
      });
      out.locationsError = lr.ok ? null : ((lj.error && lj.error.message) || lr.statusText);

      var configured = process.env.GOOGLE_BUSINESS_LOCATION_ID;
      if (configured) {
        var rr = await fetch(
          'https://mybusiness.googleapis.com/v4/accounts/' + encodeURIComponent(acc) +
            '/locations/' + encodeURIComponent(configured) + '/reviews?pageSize=5',
          { headers: { Authorization: 'Bearer ' + tj.access_token } }
        );
        out.configuredReviewsStatus = rr.status;
        var rj = await rr.json();
        out.configuredReviewsError = rr.ok ? null : ((rj.error && rj.error.message) || rr.statusText);
        if (rr.ok) {
          out.configuredReviewsCount = (rj.reviews || []).length;
          out.configuredReviewsTotal = typeof rj.totalReviewCount === 'number' ? rj.totalReviewCount : null;
        }
      }
    }

    out.ok = true;
  } catch (err) {
    out.fatal = String((err && err.message) || err);
  }

  res.status(200).json(out);
};
