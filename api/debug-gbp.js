/**
 * TEMPORARY diagnostic endpoint - remove after debugging.
 * Reports: token scopes (via tokeninfo), locations under the configured
 * account, and the status of the currently-configured location's reviews.
 * No secrets are returned.
 */

var TOKEN_URL = 'https://oauth2.googleapis.com/token';

async function readJson(res) {
  var text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return { rawHtmlHead: text.slice(0, 200) };
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
    var tj = await readJson(tr);
    out.tokenStatus = tr.status;

    if (!tr.ok) {
      out.tokenError = (tj.error && tj.error_description) || tj.error || tr.statusText;
      return res.status(200).json(out);
    }

    var ti = await readJson(await fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(tj.access_token)));
    out.scopes = String(ti.scope || '').split(' ').filter(Boolean);
    out.scopeMissing = !/business\.manage/.test(String(ti.scope || ''));
    out.tokeninfoStatus = ti.error ? ti.error : 'ok';

    var acc = process.env.GOOGLE_BUSINESS_ACCOUNT_ID;
    out.lookupAccount = acc;

    if (!acc) {
      out.error = 'GOOGLE_BUSINESS_ACCOUNT_ID missing';
      return res.status(200).json(out);
    }

    var lr = await fetch(
      'https://mybusiness.googleapis.com/v4/accounts/' + encodeURIComponent(acc) + '/locations?pageSize=100',
      { headers: { Authorization: 'Bearer ' + tj.access_token } }
    );
    var lj = await readJson(lr);
    out.locationsStatus = lr.status;
    out.locations = (lj.locations || []).map(function (l) {
      var addr = l.storefrontAddress || {};
      return {
        name: l.name,
        title: l.title,
        category: l.category && l.category.displayName,
        address: (addr.addressLines || []).join(' '),
        state: l.locationState,
        profileUrl: l.profile && l.profile.googleUrl
      };
    });
    out.locationsError = lr.ok ? null : ((lj.error && lj.error.message) || lj.rawHtmlHead || lr.statusText);

    var configured = process.env.GOOGLE_BUSINESS_LOCATION_ID;
    if (configured) {
      var rr = await fetch(
        'https://mybusiness.googleapis.com/v4/accounts/' + encodeURIComponent(acc) +
          '/locations/' + encodeURIComponent(configured) + '/reviews?pageSize=5',
        { headers: { Authorization: 'Bearer ' + tj.access_token } }
      );
      out.configuredReviewsStatus = rr.status;
      var rj = await readJson(rr);
      out.configuredReviewsError = rr.ok ? null : ((rj.error && rj.error.message) || rj.rawHtmlHead || rr.statusText);
      if (rr.ok) {
        out.configuredReviewsCount = (rj.reviews || []).length;
        out.configuredReviewsTotal = typeof rj.totalReviewCount === 'number' ? rj.totalReviewCount : null;
        out.configuredReviewsAvg = rj.averageRating;
      }
    }

    out.ok = true;
  } catch (err) {
    out.fatal = String((err && err.message) || err);
  }

  res.status(200).json(out);
};
