/**
 * Master Glass Solutions - static reviews fallback endpoint.
 *
 * Serves the exact same response shape as api/google-reviews.js, so the
 * homepage reviews section always has a safe, valid payload to render even when
 * the live Google Business Profile integration is not configured or is
 * unavailable. No secrets are involved here.
 *
 * The rating/count carry the same baseline the page JSON-LD declares (see
 * data/reviews-baseline.js) so the visible block and the structured data agree
 * even on this path. Review *text* is never faked here -- reviews[] stays empty
 * and the UI links out to Google for the quotes themselves.
 */

var reviewsBaseline = require('../data/reviews-baseline');

var FALLBACK_REVIEW_URL = 'https://g.page/r/CZoDFY2uA41TEBM/review';
var FALLBACK_MAPS_URL = 'https://maps.google.com/?cid=6020472325090378650';

var CACHE_HEADER = 'public, s-maxage=21600, stale-while-revalidate=86400';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', CACHE_HEADER);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  var base = reviewsBaseline.baseline();

  res.status(200).json({
    rating: base.rating,
    totalReviews: base.totalReviews,
    reviews: [],
    reviewUrl: process.env.GOOGLE_REVIEW_URL || FALLBACK_REVIEW_URL,
    mapsUrl: process.env.GOOGLE_MAPS_URL || FALLBACK_MAPS_URL,
    source: 'fallback',
    updatedAt: new Date().toISOString()
  });
};
