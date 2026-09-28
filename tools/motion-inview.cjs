/* Measure what a visitor actually sees: scroll in realistic steps and, at each
   step, check only the elements currently in the viewport. The earlier test
   raced to the bottom and then measured everything, including sections that
   `content-visibility: auto` had skipped -- those report their pre-transition
   style because they are not rendered, which is a property of the test, not
   of what anyone sees. */
const { chromium } = require('playwright');

const PAGES = ['index.html', 'about.html', 'resources.html', 'boerne-tx.html',
               'commercial-glass.html', 'gallery.html', 'faq.html'];

const SELECTORS = '.section-heading, .service-card, .article-card, .path-card, ' +
                  '.gallery-grid > figure, .final-cta-grid > *, .workspace-grid > *, .team-grid > article';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let bad = 0;

  for (const path of PAGES) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message.slice(0, 90)));
    await p.goto('http://127.0.0.1:8099/' + path, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(500);

    const worst = await p.evaluate(async (sel) => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const seen = [];
      const step = Math.round(window.innerHeight * 0.6);
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await sleep(1300);
        for (const el of document.querySelectorAll(sel)) {
          const r = el.getBoundingClientRect();
          const onScreen = r.top < window.innerHeight * 0.9 && r.bottom > 0;
          if (!onScreen) continue;
          const op = parseFloat(getComputedStyle(el).opacity);
          if (op < 0.95) {
            seen.push({ cls: (el.className || '').slice(0, 40), op: op.toFixed(2),
                        txt: (el.innerText || '').slice(0, 30).replace(/\s+/g, ' ') });
          }
        }
      }
      return seen;
    }, SELECTORS);

    const ok = worst.length === 0 && errs.length === 0;
    if (!ok) bad++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${path.padEnd(24)} invisible-while-on-screen: ${worst.length}`);
    worst.slice(0, 4).forEach(w => console.log(`         ${w.cls} opacity=${w.op} "${w.txt}"`));
    errs.forEach(e => console.log('         JS ERROR: ' + e));
    await ctx.close();
  }

  await b.close();
  console.log(bad ? `\n${bad} page(s) show content to a visitor while it is still invisible`
                  : '\nevery target was fully visible by the time a visitor reached it');
  process.exit(bad ? 1 : 0);
})();
