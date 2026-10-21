/* Verify the authenticated metrics aggregator's GA4 lead-event and Search
 * Console queries with local fake Google responses (no network credentials).
 */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const Module = require('node:module');
const { Readable } = require('node:stream');

const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 });
process.env.GA4_PROPERTY_ID = '123456789';
process.env.GA4_CLIENT_EMAIL = 'metrics-reader@example.iam.gserviceaccount.com';
process.env.GA4_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' });
process.env.GSC_SITE_URL = 'sc-domain:example.com';

const apiPath = path.resolve(__dirname, '..', 'api', 'site-metrics.js');
const auth = { verifySession: token => token === 'test-session' ? { id: 'owner' } : null };
const now = new Date().toISOString();
const ModuleStore = {
  async list() {
    return [
      { id: 'historical-low', status: 'low-rating-alerted', rating: 2, createdAt: now, emailedAt: now },
      { id: 'historical-high', status: 'review-link-sent', rating: 5, createdAt: now, emailedAt: now },
      { id: 'new-low', status: 'low-rating-alerted', rating: 1, reviewLinkSentAt: now, createdAt: now, emailedAt: now },
    ];
  },
};
const cacheEntries = new Map();
const ModuleMetricsCache = {
  async read(key) {
    const entry = cacheEntries.get(key);
    return entry ? { value: entry.value, cachedAt: entry.cachedAt, stale: false } : null;
  },
  async write(key, value) {
    const entry = { value, cachedAt: new Date().toISOString() };
    cacheEntries.set(key, entry);
    return entry;
  },
};
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (parent && path.resolve(parent.filename) === apiPath) {
    if (request === '../data/followup-store') return ModuleStore;
    if (request === '../data/followup-auth') return auth;
    if (request === '../data/metrics-cache') return ModuleMetricsCache;
  }
  return originalLoad.apply(this, arguments);
};
const handler = require(apiPath);
Module._load = originalLoad;

let batchBody = null;
let eventBody = null;
const searchBodies = [];
const psiCalls = [];
const scopes = [];
function response(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

global.fetch = async (url, options = {}) => {
  if (url === 'https://oauth2.googleapis.com/token') {
    const form = new URLSearchParams(options.body);
    const assertion = form.get('assertion').split('.')[1];
    const claim = JSON.parse(Buffer.from(assertion, 'base64url').toString('utf8'));
    scopes.push(claim.scope);
    return response({ access_token: 'mock-google-access-token', expires_in: 3600 });
  }

  if (url.endsWith(':batchRunReports')) {
    batchBody = JSON.parse(options.body);
    return response({
      reports: [
        { rows: [{ metricValues: [
          { value: '1240' }, { value: '410' }, { value: '520' }, { value: '0.61' }, { value: '98' },
        ] }] },
        { rows: [{ dimensionValues: [{ value: '20261018' }], metricValues: [{ value: '47' }, { value: '30' }] }] },
        { rows: [{ dimensionValues: [{ value: '/request-quote' }], metricValues: [{ value: '210' }] }] },
        { rows: [{ dimensionValues: [{ value: 'Organic Search' }], metricValues: [{ value: '260' }] }] },
        { rows: [{ dimensionValues: [{ value: 'mobile' }], metricValues: [{ value: '390' }] }] },
      ],
    });
  }

  if (url.endsWith(':runReport')) {
    eventBody = JSON.parse(options.body);
    return response({
      rows: [
        { dimensionValues: [{ value: 'click_to_call' }], metricValues: [{ value: '13' }] },
        { dimensionValues: [{ value: 'mgs_quote_success' }], metricValues: [{ value: '4' }] },
      ],
    });
  }

  if (url.startsWith('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')) {
    const parsed = new URL(url);
    psiCalls.push({ target: parsed.searchParams.get('url'), strategy: parsed.searchParams.get('strategy') });
    return response({
      lighthouseResult: {
        fetchTime: now,
        categories: {
          performance: { score: 0.82 },
          accessibility: { score: 0.96 },
          'best-practices': { score: 0.91 },
          seo: { score: 1 },
        },
        audits: {
          'first-contentful-paint': { displayValue: '1.2 s', numericValue: 1200 },
          'largest-contentful-paint': { displayValue: '2.4 s', numericValue: 2400 },
          'total-blocking-time': { displayValue: '100 ms', numericValue: 100 },
          'cumulative-layout-shift': { displayValue: '0.02', numericValue: 0.02 },
          'speed-index': { displayValue: '2.0 s', numericValue: 2000 },
        },
      },
    });
  }

  if (url.includes('/searchAnalytics/query')) {
    const body = JSON.parse(options.body);
    searchBodies.push({ url, body });
    if (!body.dimensions) {
      return response({ rows: [{ clicks: 28, impressions: 875, ctr: 0.032, position: 7.2 }] });
    }
    if (body.dimensions[0] === 'query') {
      return response({ rows: [{ keys: ['glass repair san antonio'], clicks: 9, impressions: 175, ctr: 0.051, position: 5.8 }] });
    }
    if (body.dimensions[0] === 'page') {
      return response({ rows: [{ keys: ['https://www.mgsusa.llc/request-quote'], clicks: 11, impressions: 210, ctr: 0.052, position: 4.1 }] });
    }
  }

  throw new Error('Unexpected URL: ' + url);
};

function req(body) {
  const request = Readable.from([Buffer.from(JSON.stringify(body))]);
  request.method = 'POST';
  request.headers = { authorization: 'Bearer test-session', 'content-type': 'application/json' };
  return request;
}

function res() {
  return {
    _status: 0,
    _json: null,
    setHeader() {},
    status(code) { this._status = code; return this; },
    json(body) { this._json = body; return this; },
  };
}

(async () => {
  try {
    const result = res();
    await handler(req({ sections: ['traffic', 'search'] }), result);
    assert.equal(result._status, 200);
    assert.equal(result._json.ok, true);
    assert.equal(batchBody.requests.length, 5, 'GA4 batch stays within its five-report limit');
    assert.deepEqual(eventBody.dimensions, [{ name: 'eventName' }]);
    assert.deepEqual(eventBody.metrics, [{ name: 'eventCount' }]);
    assert.deepEqual(eventBody.dimensionFilter.filter.inListFilter.values, ['click_to_call', 'mgs_quote_success']);
    assert.equal(result._json.traffic.conversions.status, 'ok');
    assert.equal(result._json.traffic.conversions.callClicks, 13);
    assert.equal(result._json.traffic.conversions.quoteSubmissions, 4);
    assert.equal(result._json.traffic.sessions, 520);

    assert.equal(searchBodies.length, 3);
    assert.ok(searchBodies.every(item => item.url.includes('sc-domain%3Aexample.com')));
    assert.equal(searchBodies.find(item => item.body.dimensions && item.body.dimensions[0] === 'query').body.rowLimit, 10);
    assert.equal(searchBodies.find(item => item.body.dimensions && item.body.dimensions[0] === 'page').body.rowLimit, 8);
    assert.equal(result._json.search.status, 'ok');
    assert.equal(result._json.search.clicks, 28);
    assert.equal(result._json.search.impressions, 875);
    assert.equal(result._json.search.ctr, 3.2);
    assert.equal(result._json.search.avgPosition, 7.2);
    assert.equal(result._json.search.queries[0].query, 'glass repair san antonio');
    assert.equal(result._json.search.pages[0].page, 'https://www.mgsusa.llc/request-quote');
    assert.ok(scopes.includes('https://www.googleapis.com/auth/analytics.readonly'));
    assert.ok(scopes.includes('https://www.googleapis.com/auth/webmasters.readonly'));

    const followups = res();
    await handler(req({ sections: ['followups'] }), followups);
    assert.equal(followups._json.followups.reviewLinksSent, 2,
      'historical low-score records stay uncounted, while new low scores with an invite timestamp count');

    const lighthouse = res();
    await handler(req({
      sections: ['lighthouse'], strategy: 'mobile', page: '/contact', refresh: 'lighthouse',
    }), lighthouse);
    assert.equal(psiCalls.length, 1, 'refresh tests only one selected page');
    assert.deepEqual(psiCalls[0], { target: 'https://www.mgsusa.llc/contact', strategy: 'mobile' });
    const selectedPage = lighthouse._json.lighthouse.pages.find(page => page.path === '/contact');
    assert.equal(selectedPage.status, 'ok');
    assert.equal(selectedPage.result.scores.performance, 82);
    assert.ok(lighthouse._json.lighthouse.pages.filter(page => page.path !== '/contact')
      .every(page => page.status === 'empty'), 'other pages are served from cache instead of re-tested');

    console.log('PASS  GA4 queries count phone clicks and successful quote events');
    console.log('PASS  GA4 batch report stays within the five-report API limit');
    console.log('PASS  Search Console returns clicks, impressions, CTR, position, queries and pages');
    console.log('PASS  review-invitation totals preserve the historical rating-gate boundary');
    console.log('PASS  mobile PageSpeed refresh re-tests only the selected page and caches its result');
    console.log('PASS  read-only service-account scopes are separated and requested');
    console.log('\nall site-metrics checks passed');
  } catch (error) {
    console.error('FAIL  site-metrics check');
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
})();
