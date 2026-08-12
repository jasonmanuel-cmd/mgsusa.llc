/**
 * Master Glass Solutions - Follow-Up Desk metrics cache.
 *
 * Tiny JSON-on-Vercel-Blob cache for expensive dashboard reads (PageSpeed
 * Insights runs mostly — a single Lighthouse pass takes 10-30s, so the desk
 * serves the last stored result and only re-runs on demand).
 *
 * One private blob per key at followup/metrics/<key>.json holding
 * { key, cachedAt, value }. Reads never throw: a miss, a parse failure, or a
 * missing token all come back as null so the dashboard can degrade to "not
 * measured yet" instead of erroring.
 *
 * Env: FOLLOWUP_BLOB_READ_WRITE_TOKEN (falls back to BLOB_READ_WRITE_TOKEN).
 * Server-only (CommonJS).
 */

var { get: blobGet, put: blobPut } = require('@vercel/blob');

var PREFIX = 'followup/metrics/';

function token() {
  return process.env.FOLLOWUP_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || null;
}

// Keys come from our own code, but they land in a blob path — keep them tame.
function safeKey(key) {
  return String(key || 'unknown').replace(/[^a-z0-9._-]+/gi, '-').slice(0, 120);
}

function pathFor(key) {
  return PREFIX + safeKey(key) + '.json';
}

/**
 * Read a cached entry. Returns { value, cachedAt, ageMs, stale } or null.
 * `maxAgeMs` only flags staleness — the caller decides whether to use it.
 */
async function read(key, maxAgeMs) {
  var t = token();
  if (!t) { return null; }
  try {
    var result = await blobGet(pathFor(key), { access: 'private', token: t, useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) { return null; }
    var text = await new Response(result.stream).text();
    var parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || !('value' in parsed)) { return null; }
    var cachedAt = parsed.cachedAt || null;
    var ageMs = cachedAt ? Date.now() - new Date(cachedAt).getTime() : null;
    return {
      value: parsed.value,
      cachedAt: cachedAt,
      ageMs: ageMs,
      stale: maxAgeMs != null && (ageMs == null || ageMs > maxAgeMs)
    };
  } catch (e) {
    return null;
  }
}

/** Store a value. Returns the entry written, or null when the write failed. */
async function write(key, value) {
  var t = token();
  if (!t) { return null; }
  var entry = { key: safeKey(key), cachedAt: new Date().toISOString(), value: value };
  try {
    await blobPut(pathFor(key), JSON.stringify(entry), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      token: t
    });
    return { value: value, cachedAt: entry.cachedAt, ageMs: 0, stale: false };
  } catch (e) {
    console.error('metrics-cache write failed for ' + safeKey(key), e && e.message);
    return null;
  }
}

module.exports = { read: read, write: write };
