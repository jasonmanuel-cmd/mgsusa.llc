/**
 * Master Glass Solutions - secure Google Business Profile (GBP) reviews endpoint.
 *
 * Server-side only. Exchanges a stored refresh token for a short-lived access
 * token, lists the latest business reviews, and returns a small normalized
 * payload that the homepage (assets/reviews.js) renders. This endpoint never
 * exposes tokens, client secrets, or internal identifiers to the browser.
 *
 * Response shape:
 *   {
 *     rating, totalReviews,
 *     reviews: [{ id, author, rating, date, text, photoUrl, reviewUrl }],
 *     reviewUrl, mapsUrl, source, updatedAt
 *   }
 *
 * When configuration is missing or the request fails temporarily, it serves the
 * same shape as api/reviews-fallback.js with `source: "fallback"` and HTTP 200.
 *
 * Env vars (Vercel):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *   GOOGLE_BUSINESS_ACCOUNT_ID, GOOGLE_BUSINESS_LOCATION_ID
 *   GOOGLE_REVIEW_URL, GOOGLE_MAPS_URL
 */

var TOKEN_URL = 'https://oauth2.googleapis.com/token';
var GBP_BASE = 'https://mybusiness.googleapis.com/v4';

var STAR_MAP = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

var DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});

var FALLBACK_REVIEW_URL = 'https://g.page/r/CZoDFY2uA41TEAI/review';
var FALLBACK_MAPS_URL = 'https://maps.google.com/?cid=6020472325090378650';

var CACHE_HEADER = 'public, s-maxage=21600, stale-while-revalidate=86400';

var tokenCache = { accessToken: null, expiresAt: 0 };

function env() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    accountId: process.env.GOOGLE_BUSINESS_ACCOUNT_ID,
    locationId: process.env.GOOGLE_BUSINESS_LOCATION_ID,
    reviewUrl: process.env.GOOGLE_REVIEW_URL,
    mapsUrl: process.env.GOOGLE_MAPS_URL
  };
}

function isConfigured(cfg) {
  return Boolean(
    cfg.clientId &&
    cfg.clientSecret &&
    cfg.refreshToken &&
    cfg.accountId &&
    cfg.locationId
  );
}

async function getAccessToken(cfg) {
  var now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 60000) {
    return tokenCache.accessToken;
  }

  var body = new URLSearchParams();
  body.set('grant_type', 'refresh_token');
  body.set('client_id', cfg.clientId);
  body.set('client_secret', cfg.clientSecret);
  body.set('refresh_token', cfg.refreshToken);

  var res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!res.ok) {
    throw new Error('OAuth token request failed: ' + res.status);
  }

  var json = await res.json();
  if (!json.access_token) {
    throw new Error('OAuth token response missing access_token');
  }

  tokenCache.accessToken = json.access_token;
  tokenCache.expiresAt = now + (Number(json.expires_in) || 3600) * 1000;
  return json.access_token;
}

function formatDate(iso) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) {
    return '';
  }
  try {
    return DATE_FORMAT.format(d);
  } catch (e) {
    return d.toISOString().slice(0, 10);
  }
}

function normalize(data, cfg) {
  var list = Array.isArray(data.reviews) ? data.reviews : [];

  var reviews = list.map(function (r) {
    var reviewer = r.reviewer || {};
    var author = reviewer.displayName && reviewer.displayName.trim()
      ? reviewer.displayName.trim()
      : 'Verified Google Reviewer';
    var photoUrl = reviewer.isAnonymous || !reviewer.profilePhotoUrl
      ? null
      : reviewer.profilePhotoUrl;

    return {
      id: r.reviewId || null,
      author: author,
      rating: STAR_MAP[r.starRating] || 0,
      date: formatDate(r.createTime),
      text: (r.comment || '').trim(),
      photoUrl: photoUrl,
      reviewUrl: cfg.reviewUrl || FALLBACK_REVIEW_URL
    };
  });

  return {
    rating: typeof data.averageRating === 'number' ? Math.round(data.averageRating * 10) / 10 : 0,
    totalReviews: typeof data.totalReviewCount === 'number' ? data.totalReviewCount : 0,
    reviews: reviews,
    reviewUrl: cfg.reviewUrl || FALLBACK_REVIEW_URL,
    mapsUrl: cfg.mapsUrl || FALLBACK_MAPS_URL,
    updatedAt: new Date().toISOString()
  };
}

function fallbackPayload(cfg) {
  return {
    rating: 0,
    totalReviews: 0,
    reviews: [],
    reviewUrl: (cfg && cfg.reviewUrl) || FALLBACK_REVIEW_URL,
    mapsUrl: (cfg && cfg.mapsUrl) || FALLBACK_MAPS_URL,
    source: 'fallback',
    updatedAt: new Date().toISOString()
  };
}

function serveFallback(res, cfg) {
  res.status(200).json(fallbackPayload(cfg));
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', CACHE_HEADER);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  var cfg = env();

  if (!isConfigured(cfg)) {
    console.error('google-reviews: missing env configuration, serving fallback.');
    return serveFallback(res, cfg);
  }

  try {
    var accessToken = await getAccessToken(cfg);

    var params = new URLSearchParams({ pageSize: '50', orderBy: 'updateTime desc' });
    var url = GBP_BASE +
      '/accounts/' + encodeURIComponent(cfg.accountId) +
      '/locations/' + encodeURIComponent(cfg.locationId) +
      '/reviews?' + params.toString();

    var r = await fetch(url, {
      headers: { Authorization: 'Bearer ' + accessToken }
    });

    if (!r.ok) {
      throw new Error('GBP request failed: ' + r.status);
    }

    var data = await r.json();
    var payload = normalize(data, cfg);
    payload.source = 'google';
    res.status(200).json(payload);
  } catch (err) {
    console.error('google-reviews: request failed, serving fallback (' + err.message + ')');
    return serveFallback(res, cfg);
  }
};
