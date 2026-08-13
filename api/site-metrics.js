/**
 * Master Glass Solutions - Follow-Up Desk: site metrics.
 *
 * POST /api/site-metrics  (header Authorization: Bearer <session>)
 * Body: { sections?: string[], strategy?: "mobile"|"desktop", page?: "/path",
 *         refresh?: "lighthouse" }
 * -> 200 { ok: true, generatedAt, followups, reviews, traffic, lighthouse, health }
 * -> 401 bad session | 405 wrong method.
 *
 * Auth'd read-only aggregator behind the owner dashboard. Every section is
 * independent and degrades on its own: a section that has no credentials comes
 * back { status: "unconfigured", hint } and one that blows up comes back
 * { status: "error", error } — the endpoint itself still answers 200 so a dead
 * Google key can never take the whole desk down. Never cached at the edge.
 *
 * Sections
 *   followups   Blob store, always available: funnel counts, average rating,
 *               response rate, 28-day activity, "needs attention" queue.
 *   reviews     Google Places API (New) — rating + review count.
 *   traffic     GA4 Data API via a service-account JWT — views/users/sessions,
 *               28-day trend, top pages, channels, devices.
 *   lighthouse  PageSpeed Insights — category scores, lab metrics, CrUX field
 *               data, top opportunities. Cached in Blob (runs take 10-30s);
 *               `refresh: "lighthouse"` re-runs the requested page only.
 *   health      Live probe of the public site: status code, TTFB, sitemap size.
 *   storage     Read + write round-trip against the Blob store, so a desk that
 *               lists customers but cannot save them says exactly why.
 *
 * Env: FOLLOWUP_SESSION_SECRET, FOLLOWUP_BLOB_READ_WRITE_TOKEN,
 *      GOOGLE_PLACES_API_KEY, GOOGLE_PLACE_ID,
 *      GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY,
 *      PAGESPEED_API_KEY (optional — PSI works unkeyed but is rate limited).
 */

var crypto = require('crypto');

var followupStore = require('../data/followup-store');
var followupAuth = require('../data/followup-auth');
var metricsCache = require('../data/metrics-cache');

var SITE_ORIGIN = 'https://www.mgsusa.llc';
var LIGHTHOUSE_TTL_MS = 12 * 3600 * 1000;
var LIGHTHOUSE_TIMEOUT_MS = 55000;
var ALL_SECTIONS = ['followups', 'reviews', 'traffic', 'lighthouse', 'health', 'storage'];

// The pages worth watching. The desk shows whichever of these have a cached
// run and re-runs one at a time (a PSI pass is far too slow to batch).
var LIGHTHOUSE_PAGES = [
  { path: '/', label: 'Home' },
  { path: '/request-quote', label: 'Request a quote' },
  { path: '/residential-glass', label: 'Residential glass' },
  { path: '/commercial-glass', label: 'Commercial glass' },
  { path: '/san-antonio-tx', label: 'San Antonio, TX' },
  { path: '/contact', label: 'Contact' }
];

/* ---------- plumbing ---------- */

function jsonError(res, status, message) {
  res.status(status).json({ ok: false, error: message });
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (chunk) { chunks.push(chunk); });
    req.on('end', function () {
      var raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) { return resolve({}); }
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function checkSession(req) {
  var header = req.headers.authorization || '';
  var m = /^Bearer\s+(.+)$/.exec(header);
  if (!m) return false;
  return followupAuth.verifySession(m[1]) !== null;
}

function fetchWithTimeout(url, options, timeoutMs) {
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, timeoutMs || 8000);
  var opts = Object.assign({}, options || {}, { signal: controller.signal });
  return fetch(url, opts).finally(function () { clearTimeout(timer); });
}

function unconfigured(hint) {
  return { status: 'unconfigured', hint: hint };
}

function errored(message) {
  return { status: 'error', error: message };
}

function round(value, places) {
  var f = Math.pow(10, places || 0);
  return Math.round(value * f) / f;
}

function num(value) {
  var n = Number(value);
  return isFinite(n) ? n : 0;
}

/* ---------- followups (Blob store — always available) ---------- */

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildFollowups() {
  return followupStore.list().then(function (customers) {
    var list = Array.isArray(customers) ? customers : [];
    var now = Date.now();
    var DAY = 86400000;

    var counts = { sent: 0, 'review-link-sent': 0, 'low-rating-alerted': 0 };
    var ratingSum = 0;
    var ratedCount = 0;
    var promoters = 0;
    var detractors = 0;
    var emailed = 0;
    var added7 = 0;
    var added30 = 0;
    var distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    var needsAttention = [];

    // 28 buckets, oldest first, keyed by UTC day.
    var series = [];
    var index = {};
    for (var d = 27; d >= 0; d--) {
      var key = dayKey(new Date(now - d * DAY));
      var bucket = { date: key, added: 0, rated: 0 };
      index[key] = bucket;
      series.push(bucket);
    }

    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      var status = c.status || 'sent';
      counts[status] = (counts[status] || 0) + 1;
      if (c.emailedAt) { emailed++; }

      var createdMs = c.createdAt ? new Date(c.createdAt).getTime() : NaN;
      if (isFinite(createdMs)) {
        if (now - createdMs <= 7 * DAY) { added7++; }
        if (now - createdMs <= 30 * DAY) { added30++; }
        var createdBucket = index[dayKey(new Date(createdMs))];
        if (createdBucket) { createdBucket.added++; }
      }

      var rating = typeof c.rating === 'number' ? c.rating : null;
      if (rating != null) {
        ratedCount++;
        ratingSum += rating;
        if (distribution[rating] != null) { distribution[rating]++; }
        if (rating >= 4) { promoters++; } else { detractors++; }
        var ratedMs = c.ratedAt ? new Date(c.ratedAt).getTime() : NaN;
        if (isFinite(ratedMs)) {
          var ratedBucket = index[dayKey(new Date(ratedMs))];
          if (ratedBucket) { ratedBucket.rated++; }
        }
      }

      // Two things the owner should act on: an unhappy customer, or a request
      // that has sat unanswered for a week.
      var stale = rating == null && isFinite(createdMs) && (now - createdMs) > 7 * DAY;
      if (status === 'low-rating-alerted' || stale) {
        needsAttention.push({
          id: c.id || null,
          name: c.name || '',
          email: c.email || '',
          rating: rating,
          reason: status === 'low-rating-alerted' ? 'low-rating' : 'no-response',
          daysWaiting: isFinite(createdMs) ? Math.floor((now - createdMs) / DAY) : null
        });
      }
    }

    needsAttention.sort(function (a, b) {
      if (a.reason !== b.reason) { return a.reason === 'low-rating' ? -1 : 1; }
      return (b.daysWaiting || 0) - (a.daysWaiting || 0);
    });

    return {
      status: 'ok',
      total: list.length,
      emailed: emailed,
      counts: counts,
      rated: ratedCount,
      awaiting: list.length - ratedCount,
      responseRate: emailed ? round((ratedCount / emailed) * 100, 1) : 0,
      avgRating: ratedCount ? round(ratingSum / ratedCount, 2) : null,
      promoters: promoters,
      detractors: detractors,
      distribution: distribution,
      added7: added7,
      added30: added30,
      series: series,
      needsAttention: needsAttention.slice(0, 10),
      needsAttentionTotal: needsAttention.length
    };
  }).catch(function (e) {
    console.error('site-metrics followups error', e);
    return errored('Could not read the customer store.');
  });
}

/* ---------- reviews (Google Places API New) ---------- */

function buildReviews() {
  var apiKey = process.env.GOOGLE_PLACES_API_KEY;
  var placeId = process.env.GOOGLE_PLACE_ID;
  if (!apiKey || !placeId) {
    return Promise.resolve(unconfigured('Set GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID in Vercel.'));
  }

  var url = 'https://places.googleapis.com/v1/places/' + encodeURIComponent(placeId);
  return fetchWithTimeout(url, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'rating,userRatingCount,reviews.rating,reviews.publishTime,reviews.authorAttribution.displayName,reviews.originalText.text'
    }
  }, 8000).then(function (r) {
    if (!r.ok) { throw new Error('Places API ' + r.status); }
    return r.json();
  }).then(function (data) {
    var reviews = Array.isArray(data.reviews) ? data.reviews : [];
    var latest = reviews.slice(0, 3).map(function (r) {
      var author = r.authorAttribution || {};
      return {
        author: (author.displayName || 'Google reviewer').trim(),
        rating: typeof r.rating === 'number' ? r.rating : 0,
        publishedAt: r.publishTime || null,
        text: ((r.originalText && r.originalText.text) || '').trim().slice(0, 240)
      };
    });
    return {
      status: 'ok',
      rating: typeof data.rating === 'number' ? round(data.rating, 1) : null,
      totalReviews: typeof data.userRatingCount === 'number' ? data.userRatingCount : 0,
      latest: latest,
      reviewUrl: process.env.GOOGLE_REVIEW_URL || 'https://g.page/r/CZoDFY2uA41TEAI/review'
    };
  }).catch(function (e) {
    console.error('site-metrics reviews error', e && e.message);
    return errored('Google Places did not answer.');
  });
}

/* ---------- traffic (GA4 Data API, service-account JWT) ---------- */

var gaToken = { value: null, expiresAt: 0 };

function gaConfig() {
  return {
    propertyId: (process.env.GA4_PROPERTY_ID || '').replace(/^properties\//, ''),
    clientEmail: process.env.GA4_CLIENT_EMAIL,
    // Vercel env vars keep the PEM on one line with escaped newlines.
    privateKey: (process.env.GA4_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  };
}

function gaAccessToken(cfg) {
  if (gaToken.value && gaToken.expiresAt > Date.now() + 60000) {
    return Promise.resolve(gaToken.value);
  }
  var now = Math.floor(Date.now() / 1000);
  var header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  var claim = Buffer.from(JSON.stringify({
    iss: cfg.clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  })).toString('base64url');

  var signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + claim);
  var assertion = header + '.' + claim + '.' + signer.sign(cfg.privateKey).toString('base64url');

  return fetchWithTimeout('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
      '&assertion=' + encodeURIComponent(assertion)
  }, 8000).then(function (r) {
    return r.json().then(function (d) {
      if (!r.ok || !d.access_token) {
        throw new Error('token exchange ' + r.status + ' ' + (d.error_description || d.error || ''));
      }
      gaToken = {
        value: d.access_token,
        expiresAt: Date.now() + (num(d.expires_in) || 3600) * 1000
      };
      return gaToken.value;
    });
  });
}

function gaRows(report) {
  var rows = (report && report.rows) || [];
  return rows.map(function (row) {
    return {
      key: ((row.dimensionValues || [])[0] || {}).value || '',
      values: (row.metricValues || []).map(function (m) { return num(m.value); })
    };
  });
}

function buildTraffic() {
  var cfg = gaConfig();
  if (!cfg.propertyId || !cfg.clientEmail || !cfg.privateKey) {
    return Promise.resolve(unconfigured(
      'Create a Google service account with Analytics read access, add it as a Viewer on the GA4 property, then set GA4_PROPERTY_ID, GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY in Vercel.'
    ));
  }

  var body = {
    requests: [
      {
        dateRanges: [{ startDate: '28daysAgo', endDate: 'yesterday' }],
        metrics: [
          { name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'sessions' },
          { name: 'engagementRate' }, { name: 'averageSessionDuration' }
        ]
      },
      {
        dateRanges: [{ startDate: '27daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        limit: 40
      },
      {
        dateRanges: [{ startDate: '28daysAgo', endDate: 'yesterday' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 8
      },
      {
        dateRanges: [{ startDate: '28daysAgo', endDate: 'yesterday' }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 6
      },
      {
        dateRanges: [{ startDate: '28daysAgo', endDate: 'yesterday' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 4
      }
    ]
  };

  return gaAccessToken(cfg).then(function (accessToken) {
    return fetchWithTimeout(
      'https://analyticsdata.googleapis.com/v1beta/properties/' + encodeURIComponent(cfg.propertyId) + ':batchRunReports',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      },
      12000
    );
  }).then(function (r) {
    return r.json().then(function (d) {
      if (!r.ok) {
        throw new Error('GA4 ' + r.status + ' ' + ((d.error && d.error.message) || ''));
      }
      return d;
    });
  }).then(function (data) {
    var reports = data.reports || [];
    var totalsRow = ((reports[0] && reports[0].rows) || [])[0];
    var totals = (totalsRow && totalsRow.metricValues || []).map(function (m) { return num(m.value); });

    var daily = gaRows(reports[1]).map(function (row) {
      // GA4 hands back YYYYMMDD.
      var k = row.key;
      return {
        date: k.length === 8 ? k.slice(0, 4) + '-' + k.slice(4, 6) + '-' + k.slice(6, 8) : k,
        views: row.values[0] || 0,
        users: row.values[1] || 0
      };
    });

    var last7 = daily.slice(-7).reduce(function (sum, day) { return sum + day.views; }, 0);
    var prev7 = daily.slice(-14, -7).reduce(function (sum, day) { return sum + day.views; }, 0);

    return {
      status: 'ok',
      range: 'Last 28 days',
      views: totals[0] || 0,
      users: totals[1] || 0,
      sessions: totals[2] || 0,
      engagementRate: round((totals[3] || 0) * 100, 1),
      avgSessionSeconds: Math.round(totals[4] || 0),
      views7: last7,
      views7Change: prev7 ? round(((last7 - prev7) / prev7) * 100, 1) : null,
      daily: daily,
      topPages: gaRows(reports[2]).map(function (row) {
        return { path: row.key, views: row.values[0] || 0 };
      }),
      channels: gaRows(reports[3]).map(function (row) {
        return { label: row.key || 'Unassigned', sessions: row.values[0] || 0 };
      }),
      devices: gaRows(reports[4]).map(function (row) {
        return { label: row.key || 'unknown', sessions: row.values[0] || 0 };
      })
    };
  }).catch(function (e) {
    console.error('site-metrics traffic error', e && e.message);
    return errored('Google Analytics did not answer: ' + (e && e.message ? e.message : 'unknown error'));
  });
}

/* ---------- lighthouse (PageSpeed Insights) ---------- */

function lighthouseKey(path, strategy) {
  return 'lighthouse-' + strategy + '-' + (path === '/' ? 'home' : path.replace(/^\//, '').replace(/\//g, '-'));
}

function pickAudit(audits, id) {
  var audit = audits[id];
  if (!audit) { return null; }
  return {
    display: audit.displayValue || null,
    value: typeof audit.numericValue === 'number' ? round(audit.numericValue, 3) : null,
    score: typeof audit.score === 'number' ? round(audit.score * 100) : null
  };
}

function fieldMetric(metrics, id) {
  var m = metrics && metrics[id];
  if (!m) { return null; }
  return { percentile: m.percentile, category: m.category };
}

function runLighthouse(path, strategy) {
  var target = SITE_ORIGIN + path;
  var url = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed' +
    '?url=' + encodeURIComponent(target) +
    '&strategy=' + encodeURIComponent(strategy) +
    '&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO' +
    (process.env.PAGESPEED_API_KEY ? '&key=' + encodeURIComponent(process.env.PAGESPEED_API_KEY) : '');

  return fetchWithTimeout(url, {}, LIGHTHOUSE_TIMEOUT_MS).then(function (r) {
    return r.json().then(function (d) {
      if (!r.ok) {
        throw new Error('PSI ' + r.status + ' ' + ((d.error && d.error.message) || ''));
      }
      return d;
    });
  }).then(function (data) {
    var lh = data.lighthouseResult || {};
    var categories = lh.categories || {};
    var audits = lh.audits || {};

    function score(name) {
      var c = categories[name];
      return c && typeof c.score === 'number' ? Math.round(c.score * 100) : null;
    }

    // Failing performance audits, biggest estimated saving first.
    var opportunities = Object.keys(audits).map(function (id) {
      return audits[id];
    }).filter(function (a) {
      return a && a.details && a.details.type === 'opportunity' &&
        a.details.overallSavingsMs > 100 && a.score != null && a.score < 0.9;
    }).sort(function (a, b) {
      return b.details.overallSavingsMs - a.details.overallSavingsMs;
    }).slice(0, 4).map(function (a) {
      return { title: a.title, savingsMs: Math.round(a.details.overallSavingsMs) };
    });

    var loading = data.loadingExperience || {};

    return {
      scores: {
        performance: score('performance'),
        accessibility: score('accessibility'),
        bestPractices: score('best-practices'),
        seo: score('seo')
      },
      lab: {
        fcp: pickAudit(audits, 'first-contentful-paint'),
        lcp: pickAudit(audits, 'largest-contentful-paint'),
        tbt: pickAudit(audits, 'total-blocking-time'),
        cls: pickAudit(audits, 'cumulative-layout-shift'),
        speedIndex: pickAudit(audits, 'speed-index')
      },
      field: loading.metrics ? {
        overall: loading.overall_category || null,
        lcp: fieldMetric(loading.metrics, 'LARGEST_CONTENTFUL_PAINT_MS'),
        inp: fieldMetric(loading.metrics, 'INTERACTION_TO_NEXT_PAINT'),
        cls: fieldMetric(loading.metrics, 'CUMULATIVE_LAYOUT_SHIFT_SCORE')
      } : null,
      opportunities: opportunities,
      fetchedAt: lh.fetchTime || new Date().toISOString()
    };
  });
}

function buildLighthouse(options) {
  var strategy = options.strategy === 'desktop' ? 'desktop' : 'mobile';
  var refreshPath = options.refresh === 'lighthouse' ? options.page : null;
  var known = LIGHTHOUSE_PAGES.map(function (p) { return p.path; });
  if (refreshPath && known.indexOf(refreshPath) === -1) { refreshPath = '/'; }

  var jobs = LIGHTHOUSE_PAGES.map(function (page) {
    if (page.path === refreshPath) {
      return runLighthouse(page.path, strategy).then(function (result) {
        return metricsCache.write(lighthouseKey(page.path, strategy), result).then(function (written) {
          return {
            path: page.path,
            label: page.label,
            status: 'ok',
            cachedAt: (written && written.cachedAt) || new Date().toISOString(),
            result: result
          };
        });
      }).catch(function (e) {
        console.error('site-metrics lighthouse run failed for ' + page.path, e && e.message);
        return {
          path: page.path,
          label: page.label,
          status: 'error',
          error: 'PageSpeed did not finish: ' + (e && e.message ? e.message : 'timed out')
        };
      });
    }

    return metricsCache.read(lighthouseKey(page.path, strategy), LIGHTHOUSE_TTL_MS).then(function (entry) {
      if (!entry) {
        return { path: page.path, label: page.label, status: 'empty' };
      }
      return {
        path: page.path,
        label: page.label,
        status: 'ok',
        cachedAt: entry.cachedAt,
        stale: entry.stale,
        result: entry.value
      };
    });
  });

  return Promise.all(jobs).then(function (pages) {
    return {
      status: 'ok',
      strategy: strategy,
      ttlHours: LIGHTHOUSE_TTL_MS / 3600000,
      keyed: Boolean(process.env.PAGESPEED_API_KEY),
      pages: pages
    };
  }).catch(function (e) {
    console.error('site-metrics lighthouse error', e);
    return errored('Could not read stored Lighthouse runs.');
  });
}

/* ---------- health (live probe of the public site) ---------- */

function buildHealth() {
  var started = Date.now();

  var homepage = fetchWithTimeout(SITE_ORIGIN + '/', { redirect: 'follow' }, 8000)
    .then(function (r) {
      return { status: r.status, ok: r.ok, ms: Date.now() - started };
    })
    .catch(function (e) {
      return { status: null, ok: false, ms: null, error: e && e.message };
    });

  var sitemap = fetchWithTimeout(SITE_ORIGIN + '/sitemap.xml', {}, 8000)
    .then(function (r) {
      if (!r.ok) { throw new Error('sitemap ' + r.status); }
      return r.text();
    })
    .then(function (xml) {
      var urls = xml.match(/<loc>/g);
      var lastmods = xml.match(/<lastmod>([^<]+)<\/lastmod>/g) || [];
      var newest = lastmods.map(function (tag) {
        return tag.replace(/<\/?lastmod>/g, '');
      }).sort().pop() || null;
      return { pages: urls ? urls.length : 0, lastmod: newest };
    })
    .catch(function () {
      return { pages: null, lastmod: null };
    });

  return Promise.all([homepage, sitemap]).then(function (parts) {
    return {
      status: 'ok',
      origin: SITE_ORIGIN,
      homepage: parts[0],
      sitemap: parts[1],
      checkedAt: new Date().toISOString()
    };
  }).catch(function (e) {
    console.error('site-metrics health error', e);
    return errored('Could not probe the site.');
  });
}

/* ---------- storage (can the desk actually save?) ---------- */

/**
 * Reads and writes are separate failure modes: the desk can list customers
 * perfectly while every save dies on a read-only token or a write conflict.
 * Probe both against the real cache blob so "it isn't saving" turns into a
 * named cause on the dashboard instead of a generic 500 on the form.
 */
function buildStorage() {
  var configured = Boolean(process.env.FOLLOWUP_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN);
  if (!configured) {
    return Promise.resolve({
      status: 'error',
      canRead: false,
      canWrite: false,
      error: 'No Blob token. Set FOLLOWUP_BLOB_READ_WRITE_TOKEN in Vercel (Project → Storage → connect a Blob store), then redeploy.'
    });
  }

  var dedicated = Boolean(process.env.FOLLOWUP_BLOB_READ_WRITE_TOKEN);
  var readOk = false;
  var count = null;

  return followupStore.list().then(function (customers) {
    readOk = true;
    count = Array.isArray(customers) ? customers.length : 0;
  }).catch(function (e) {
    console.error('site-metrics storage read failed', e && e.message);
  }).then(function () {
    // Round-trip through the metrics cache: same store, same token, same
    // put() options as the customer write, but nothing important to lose.
    var probe = { at: new Date().toISOString() };
    return metricsCache.write('storage-probe', probe).then(function (written) {
      if (!written) { throw new Error('write returned nothing'); }
      return metricsCache.read('storage-probe');
    }).then(function (back) {
      var roundTripped = Boolean(back && back.value && back.value.at === probe.at);
      return {
        status: readOk && roundTripped ? 'ok' : 'error',
        canRead: readOk,
        canWrite: roundTripped,
        dedicatedToken: dedicated,
        customers: count,
        error: readOk && roundTripped ? null
          : (!readOk ? 'The store could not be read.' : 'The store accepted no writes.')
      };
    });
  }).catch(function (e) {
    var detail = (e && (e.name ? e.name + ': ' : '') + (e.message || '')) || 'unknown error';
    return {
      status: 'error',
      canRead: readOk,
      canWrite: false,
      dedicatedToken: dedicated,
      customers: count,
      error: 'Saving is failing — ' + detail
    };
  });
}

/* ---------- handler ---------- */

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    return jsonError(res, 405, 'Method not allowed. Use POST.');
  }

  if (!checkSession(req)) {
    return jsonError(res, 401, 'Unauthorized. Please log in again.');
  }

  var body;
  try {
    body = await readBody(req);
  } catch (e) {
    return jsonError(res, 400, e.message);
  }

  var requested = Array.isArray(body.sections) && body.sections.length
    ? ALL_SECTIONS.filter(function (name) { return body.sections.indexOf(name) !== -1; })
    : ALL_SECTIONS;

  var builders = {
    followups: buildFollowups,
    reviews: buildReviews,
    traffic: buildTraffic,
    lighthouse: function () {
      return buildLighthouse({
        strategy: body.strategy,
        page: typeof body.page === 'string' ? body.page : '/',
        refresh: body.refresh
      });
    },
    health: buildHealth,
    storage: buildStorage
  };

  var payload = { ok: true, generatedAt: new Date().toISOString(), sections: requested };

  var results = await Promise.all(requested.map(function (name) {
    try {
      return builders[name]();
    } catch (e) {
      console.error('site-metrics ' + name + ' threw', e);
      return Promise.resolve(errored('Section failed to run.'));
    }
  }));

  requested.forEach(function (name, i) {
    payload[name] = results[i];
  });

  payload.pages = LIGHTHOUSE_PAGES;

  return res.status(200).json(payload);
};
