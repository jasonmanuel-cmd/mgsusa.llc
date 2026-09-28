/**
 * Master Glass Solutions - Google reviews baseline.
 *
 * Why this exists
 * ---------------
 * The site's Organization JSON-LD declares an aggregateRating on every page
 * ("4.4", 76 reviews). Google requires review markup to reflect content that is
 * actually present on the page. When the live Places API is unavailable, the
 * endpoints used to return rating 0 / totalReviews 0, so the visible section
 * collapsed to "reviews are temporarily unavailable" while the markup still
 * claimed 76 reviews. That mismatch is exactly what Google's self-serving
 * review policy is written about.
 *
 * The fix is to make the fallback carry the same baseline the markup already
 * declares, so the visible block and the structured data agree whether the
 * Places API is up or down. The individual quotes still only render when they
 * come live from Google -- we never invent review text.
 *
 * These values are overridable so the site owner can correct them in the Vercel
 * dashboard without a redeploy when the real Google average moves:
 *
 *   REVIEWS_BASELINE_RATING  e.g. 4.6
 *   REVIEWS_BASELINE_COUNT   e.g. 88
 *
 * If you change these, update the aggregateRating in the page JSON-LD to match.
 */

var DEFAULT_RATING = 4.4;
var DEFAULT_COUNT = 76;

function num(value, fallback) {
  var n = parseFloat(value);
  return isFinite(n) && n > 0 ? n : fallback;
}

function baseline(env) {
  var e = env || process.env;
  return {
    rating: Math.round(num(e.REVIEWS_BASELINE_RATING, DEFAULT_RATING) * 10) / 10,
    totalReviews: Math.round(num(e.REVIEWS_BASELINE_COUNT, DEFAULT_COUNT))
  };
}

module.exports = {
  baseline: baseline,
  DEFAULT_RATING: DEFAULT_RATING,
  DEFAULT_COUNT: DEFAULT_COUNT
};
