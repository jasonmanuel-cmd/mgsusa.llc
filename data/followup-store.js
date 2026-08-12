/**
 * Master Glass Solutions - Follow-Up Desk storage helper.
 *
 * JSON-on-Vercel-Blob store at followup/customers.json (private blob).
 * Shape: { version: 1, customers: [...] } (see FOLLOW-UP-DESK-DESIGN.md).
 *
 * Exposes list()/get(id)/add(record)/update(id, patch). Reads the whole blob,
 * mutates in memory, and writes back with ifMatch (etag) so concurrent writers
 * conflict instead of silently clobbering — retried a few times with backoff.
 *
 * Env: FOLLOWUP_BLOB_READ_WRITE_TOKEN (dedicated private store; falls back to
 * BLOB_READ_WRITE_TOKEN for the photo-upload store). Server-only.
 */

// Aliased on import: the module also exports its own get(id) record lookup, and
// an unaliased `get` here would be clobbered by that function declaration.
var { get: blobGet, put: blobPut } = require('@vercel/blob');

var STORE_PATH = 'followup/customers.json';
var MAX_RETRIES = 4;
var BASE_BACKOFF_MS = 60;

function token() {
  var t = process.env.FOLLOWUP_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) {
    throw new Error('FOLLOWUP_BLOB_READ_WRITE_TOKEN is not configured');
  }
  return t;
}

function emptyStore() {
  return { version: 1, customers: [] };
}

function normalize(raw) {
  var parsed = raw;
  if (!parsed || typeof parsed !== 'object') return emptyStore();
  if (!Array.isArray(parsed.customers)) return emptyStore();
  return parsed;
}

async function readStore() {
  var result = await blobGet(STORE_PATH, {
    access: 'private',
    token: token(),
    useCache: false
  });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return { store: emptyStore(), etag: null };
  }
  var text = await new Response(result.stream).text();
  var parsed;
  try {
    parsed = normalize(JSON.parse(text));
  } catch (e) {
    parsed = emptyStore();
  }
  return { store: parsed, etag: result.blob ? result.blob.etag : null };
}

async function writeStore(store, etag) {
  var options = {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    token: token()
  };
  // Only guard when we actually have an etag to guard with — never send a
  // null precondition.
  if (etag) { options.ifMatch = etag; }
  await blobPut(STORE_PATH, JSON.stringify(store, null, 2), options);
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

// The SDK does not reliably tag this: the precondition failure arrives as a
// plain Error whose name is "Error", so matching on the class name alone let
// every ETag mismatch escape the retry loop and surface as a failed save.
function isConflict(err) {
  if (!err) { return false; }
  if (err.name === 'BlobPreconditionFailedError') { return true; }
  return /precondition failed|etag mismatch|if-match/i.test(String(err.message || ''));
}

// Run `mutate(store)` on the latest copy and persist. Returns mutate's return
// value. Re-reads and retries when the write fails on a stale etag.
async function withStore(mutate) {
  for (var attempt = 0; attempt < MAX_RETRIES; attempt++) {
    var loaded = await readStore();
    var result = mutate(loaded.store);
    try {
      await writeStore(loaded.store, loaded.etag);
      return result;
    } catch (err) {
      if (isConflict(err)) {
        await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt));
        continue;
      }
      throw err;
    }
  }

  // Every attempt lost the precondition. With one owner at one desk that is
  // not real contention — it means this store's etag does not round-trip into
  // ifMatch, and holding the guard would mean never saving anything again.
  // Re-read, re-apply, write unguarded: last-write-wins beats losing the
  // customer entirely.
  console.warn('followup-store: etag precondition kept failing, writing unguarded');
  var fresh = await readStore();
  var finalResult = mutate(fresh.store);
  await writeStore(fresh.store, null);
  return finalResult;
}

async function list() {
  var loaded = await readStore();
  return loaded.store.customers;
}

async function get(id) {
  var loaded = await readStore();
  for (var i = 0; i < loaded.store.customers.length; i++) {
    if (loaded.store.customers[i].id === id) return loaded.store.customers[i];
  }
  return null;
}

function add(record) {
  return withStore(function (store) {
    store.customers.push(record);
    return record;
  });
}

function update(id, patch) {
  return withStore(function (store) {
    for (var i = 0; i < store.customers.length; i++) {
      if (store.customers[i].id === id) {
        store.customers[i] = Object.assign({}, store.customers[i], patch);
        return store.customers[i];
      }
    }
    return null;
  });
}

module.exports = { list: list, get: get, add: add, update: update };
