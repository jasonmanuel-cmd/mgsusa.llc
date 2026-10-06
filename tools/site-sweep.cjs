/* Whole-site visual and functional sweep.
 *
 * Checks the things that actually break on a static site after a lot of edits:
 * horizontal overflow at phone width (the most common and most invisible one
 * when you only ever look at a desktop), images that 404 or fail to decode,
 * JS errors, content left invisible, and GTM double-firing.
 *
 * Third-party hosts the sandbox proxy blocks (HubSpot, GTM, Cloudflare) are
 * filtered out -- those are this environment, not the site.
 */
const { chromium } = require('playwright');

const PAGES = [
  'index.html', 'about.html', 'contact.html', 'gallery.html', 'resources.html',
  'faq.html', 'reviews.html', 'service-areas.html', 'quote-process.html',
  'commercial-glass.html', 'residential-glass.html', 'storefront-glass.html',
  'shower-enclosures.html', 'emergency-glass-repair.html', 'mirrors.html',
  'custom-glass.html', 'window-glass-replacement.html',
  'glass-types.html', 'storm-damage-glass.html', 'commercial-glass-guide.html',
  'glass-cleaning-maintenance.html', 'hill-country-glass.html',
  'san-antonio-tx.html', 'boerne-tx.html', 'natalia-tx.html',
  'castroville-tx.html', 'canyon-lake-tx.html', 'stockdale-tx.html',
  'request-quote.html', 'commercial-quote.html', 'residential-quote.html',
  'thank-you.html', 'privacy-policy.html', 'terms-and-conditions.html',
  'frameless-vs-framed-glass.html', 'glass-project-planning-checklist.html',
];

/* Hosts the sandbox proxy blocks, plus the paths that only exist on a real
   Vercel deploy (_vercel/* is injected at the edge; /api/* is serverless).
   On `python3 -m http.server` those 404 by definition and say nothing about
   the site. */
const THIRD_PARTY = /googletagmanager|hs-scripts|hs-banner|hsforms|cloudflare|vercel|google-analytics|gstatic|googleapis/;
const LOCAL_ONLY = /\/_vercel\/|\/api\//;

async function check(browser, page, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const p = await ctx.newPage();
  const errs = [], bad = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 90)));
  p.on('response', r => {
    const u = r.url();
    if (r.status() >= 400 && !THIRD_PARTY.test(u) && !LOCAL_ONLY.test(u)) bad.push(r.status() + ' ' + u.split('/').pop());
  });

  await p.goto('http://127.0.0.1:8099/' + page, { waitUntil: 'domcontentloaded' });
  /* Visibility is sampled while scrolling, on elements currently on screen.
     Scrolling to the bottom and then reading computed styles reports every
     section that `content-visibility: auto` has skipped as un-transitioned --
     which measures the test, not the page. That mistake is why an earlier run
     of this file reported 58 failures on a site that was fine. */
  const hiddenSeen = await p.evaluate(async () => {
    const sel = '.section-heading, .service-card, .article-card, .city-depth, .gallery-grid > figure';
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const seen = [];
    for (let y = 0; y <= document.body.scrollHeight; y += Math.round(window.innerHeight * 0.6)) {
      window.scrollTo(0, y);
      await sleep(900);
      for (const el of document.querySelectorAll(sel)) {
        const b = el.getBoundingClientRect();
        if (b.top < window.innerHeight * 0.9 && b.bottom > 0 &&
            parseFloat(getComputedStyle(el).opacity) < 0.95) {
          seen.push((el.className || '').toString().slice(0, 30));
        }
      }
    }
    window.scrollTo(0, 0);
    return seen;
  });
  await p.waitForTimeout(600);

  const r = await p.evaluate(() => {
    const de = document.documentElement;
    // Which element, if any, is sticking out past the viewport?
    let widest = null, overflowBy = 0;
    if (de.scrollWidth > de.clientWidth + 1) {
      for (const el of document.querySelectorAll('body *')) {
        const b = el.getBoundingClientRect();
        const over = Math.round(b.right - de.clientWidth);
        if (over > overflowBy) {
          overflowBy = over;
          widest = (el.tagName.toLowerCase() + '.' + (el.className || '').toString().split(' ')[0]).slice(0, 44);
        }
      }
    }
    const brokenImgs = Array.from(document.images)
      .filter(i => i.currentSrc && i.complete && i.naturalWidth === 0)
      .map(i => i.currentSrc.split('/').pop());
    return {
      overflow: de.scrollWidth - de.clientWidth,
      widest, overflowBy,
      brokenImgs,
      gtm: (window.dataLayer || []).filter(e => e && e['gtm.start']).length,
      title: document.title,
      h1: (document.querySelector('h1') || {}).textContent ?
          document.querySelector('h1').textContent.trim().slice(0, 48) : '(no h1)',
    };
  });

  await ctx.close();
  return { ...r, hidden: hiddenSeen.length, errs, bad };
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let problems = 0;

  for (const width of [390, 1280]) {
    console.log(`\n===== ${width}px =====`);
    for (const page of PAGES) {
      const r = await check(b, page, width);
      const issues = [];
      if (r.overflow > 1) issues.push(`H-OVERFLOW ${r.overflow}px (${r.widest} +${r.overflowBy})`);
      if (r.brokenImgs.length) issues.push(`BROKEN IMG ${r.brokenImgs.slice(0, 2).join(',')}`);
      if (r.hidden) issues.push(`HIDDEN ${r.hidden}`);
      if (r.gtm > 1) issues.push(`GTM x${r.gtm}`);
      if (r.errs.length) issues.push('JS ' + r.errs[0]);
      if (r.bad.length) issues.push(r.bad[0]);
      if (issues.length) { problems++; console.log(`  FAIL ${page.padEnd(36)} ${issues.join(' | ')}`); }
      else console.log(`  ok   ${page.padEnd(36)} "${r.h1}"`);
    }
  }
  await b.close();
  console.log(problems ? `\n${problems} problem(s)` : `\nall ${PAGES.length} pages clean at both widths`);
  process.exit(problems ? 1 : 0);
})();
