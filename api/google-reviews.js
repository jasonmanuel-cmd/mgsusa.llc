/**
 * Master Glass Solutions - secure Google reviews endpoint (Places API New).
 *
 * Server-side only. Calls the Places API (New) with a server-side API key so
 * the key never reaches the browser, and returns a small normalized payload
 * that the homepage (assets/reviews.js) renders. No OAuth refresh token or
 * business-account dependency is required.
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
 *   GOOGLE_PLACES_API_KEY
 *   GOOGLE_PLACE_ID
 *   GOOGLE_REVIEW_URL, GOOGLE_MAPS_URL (optional, defaulted below)
 */

var PLACES_BASE = 'https://places.googleapis.com/v1/places/';

var DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago',
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});

var FALLBACK_REVIEW_URL = 'https://g.page/r/CZoDFY2uA41TEAI/review';
var FALLBACK_MAPS_URL = 'https://maps.google.com/?cid=6020472325090378650';

var CACHE_HEADER = 'public, s-maxage=21600, stale-while-revalidate=86400';

function env() {
  return {
    apiKey: process.env.GOOGLE_PLACES_API_KEY,
    placeId: process.env.GOOGLE_PLACE_ID,
    reviewUrl: process.env.GOOGLE_REVIEW_URL,
    mapsUrl: process.env.GOOGLE_MAPS_URL
  };
}

function isConfigured(cfg) {
  return Boolean(cfg.apiKey && cfg.placeId);
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

  var reviews = list.map(function (r, i) {
    var author = r.authorAttribution || {};
    return {
      id: r.name || null,
      author: author.displayName && author.displayName.trim()
        ? author.displayName.trim()
        : 'Verified Google Reviewer',
      rating: typeof r.rating === 'number' ? r.rating : 0,
      date: formatDate(r.publishTime),
      text: ((r.originalText && r.originalText.text) || (r.text && r.text.text) || '').trim(),
      photoUrl: author.photoUri || null,
      reviewUrl: r.googleMapsUri || null
    };
  });

  return {
    rating: typeof data.rating === 'number' ? Math.round(data.rating * 10) / 10 : 0,
    totalReviews: typeof data.userRatingCount === 'number' ? data.userRatingCount : 0,
    reviews: reviews,
    reviewUrl: (cfg && cfg.reviewUrl) || FALLBACK_REVIEW_URL,
    mapsUrl: (cfg && cfg.mapsUrl) || FALLBACK_MAPS_URL,
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
    console.error('google-reviews: missing GOOGLE_PLACES_API_KEY or GOOGLE_PLACE_ID, serving fallback.');
    return serveFallback(res, cfg);
  }

  try {
    var url = PLACES_BASE + encodeURIComponent(cfg.placeId);

    var r = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': cfg.apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,rating,userRatingCount,reviews.rating,reviews.publishTime,reviews.originalText.text,reviews.authorAttribution.displayName,reviews.authorAttribution.photoUri,reviews.googleMapsUri'
      }
    });

    if (!r.ok) {
      throw new Error('Places API request failed: ' + r.status);
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
