/* The motion layer's one unacceptable failure is content stuck invisible.
   Test that directly, in three states: normally, with JS disabled, and with
   reduced motion requested. In every case every target must end up visible. */
const { chromium } = require('playwright');

const PAGES = ['index.html', 'commercial-glass.html', 'about.html', 'resources.html',
               'gallery.html', 'boerne-tx.html', 'contact.html', 'faq.html'];

const SELECTORS = '.section-heading, .service-card, .article-card, .path-card, ' +
                  '.gallery-grid > figure, .final-cta-grid > *, .workspace-grid > *, .team-grid > article';

async function audit(browser, opts) {
  const ctx = await browser.newContext({
    javaScriptEnabled: opts.js !== false,
    reducedMotion: opts.reduced ? 'reduce' : 'no-preference',
    viewport: { width: 1280, height: 900 }
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 90)));
  await p.goto('http://127.0.0.1:8099/' + opts.path, { waitUntil: 'domcontentloaded' });
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y); await new Promise(r => setTimeout(r, 55));
    }
  }).catch(() => {});
  await p.waitForTimeout(1400);

  const r = await p.evaluate((sel) => {
    const els = Array.from(document.querySelectorAll(sel));
    const hidden = els.filter(el => {
      const cs = getComputedStyle(el);
      return parseFloat(cs.opacity) < 0.95 || cs.visibility === 'hidden';
    });
    return {
      total: els.length,
      hidden: hidden.length,
      sample: hidden.slice(0, 3).map(e => (e.className || e.tagName) + ' :: ' + (e.innerText || '').slice(0, 28).replace(/\s+/g, ' ')),
      ready: document.documentElement.classList.contains('motion-ready'),
      bar: !!document.querySelector('.mgs-progress')
    };
  }, SELECTORS).catch(() => ({ total: 0, hidden: 0, sample: [], ready: false, bar: false }));

  await ctx.close();
  return { ...r, errs };
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    let bad = 0;

  /* Only the two states where NOTHING may ever be hidden, whatever the
     scroll position. The normal, motion-on path is measured by
     motion-inview.cjs instead: scrolling straight to the bottom and then
     reading styles reports sections that `content-visibility: auto` has
     skipped, which says nothing about what a visitor sees. */
  for (const [label, opts] of [
    ['JS disabled     ', { js: false }],
    ['reduced motion  ', { reduced: true }]
  ]) {
    console.log('\n### ' + label.trim());
    for (const path of PAGES) {
      const r = await audit(b, { ...opts, path });
      const ok = r.hidden === 0 && r.errs.length === 0;
      if (!ok) bad++;
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${path.padEnd(24)} targets=${String(r.total).padStart(3)} hidden=${r.hidden} ready=${r.ready} bar=${r.bar}`);
      r.sample.forEach(s => console.log('         still hidden: ' + s));
      r.errs.forEach(e => console.log('         JS ERROR: ' + e));
    }
  }
  await b.close();
  console.log(bad ? `\n${bad} FAILURE(S)` : '\nno content left invisible in any mode');
  process.exit(bad ? 1 : 0);
})();
