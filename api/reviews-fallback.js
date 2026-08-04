/**
 * Master Glass Solutions - static reviews fallback endpoint.
 *
 * Serves the exact same response shape as api/google-reviews.js with an empty
 * review set, so the homepage reviews section always has a safe, valid payload
 * to render even when the live Google Business Profile integration is not
 * configured or is unavailable. No secrets are involved here.
 */

var FALLBACK_REVIEW_URL = 'https://g.page/r/CZoDFY2uA41TEAI/review';
var FALLBACK_MAPS_URL = 'https://maps.google.com/?cid=6020472325090378650';

var CACHE_HEADER = 'public, s-maxage=21600, stale-while-revalidate=86400';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', CACHE_HEADER);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  res.status(200).json({
    rating: 0,
    totalReviews: 0,
    reviews: [],
    reviewUrl: process.env.GOOGLE_REVIEW_URL || FALLBACK_REVIEW_URL,
    mapsUrl: process.env.GOOGLE_MAPS_URL || FALLBACK_MAPS_URL,
    source: 'fallback',
    updatedAt: new Date().toISOString()
  });
};
