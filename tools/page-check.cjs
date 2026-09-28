const { chromium } = require('playwright');

const PAGES = ['index.html', 'about.html', 'resources.html', 'contact.html',
               'glass-types.html', 'hill-country-glass.html', 'commercial-glass.html'];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  let problems = 0;
  for (const page of PAGES) {
    const p = await b.newPage({ viewport: { width: 390, height: 800 } });
    const bad = [];
    p.on('response', r => {
      const u = r.url();
      if (r.status() >= 400 && !u.includes('googletagmanager') && !u.includes('cloudflare')
          && !u.includes('hubspot') && !u.includes('vercel') && !u.includes('google'))
        bad.push(r.status() + ' ' + u.replace('http://127.0.0.1:8099', ''));
    });
    p.on('pageerror', e => bad.push('JS ERROR: ' + e.message.slice(0, 90)));
    await p.goto('http://127.0.0.1:8099/' + page, { waitUntil: 'domcontentloaded' });
    // scroll so every lazy image fires
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await p.waitForTimeout(1200);
    const imgs = await p.evaluate(() => Array.from(document.images)
      .filter(i => i.currentSrc && !i.complete || (i.naturalWidth === 0 && i.currentSrc))
      .map(i => i.currentSrc.split('/').pop()));
    const gtm = await p.evaluate(() => (window.dataLayer || []).filter(e => e && e['gtm.start']).length);
    const stray = await p.evaluate(() => (document.body.innerText || '').includes('so it does not compete'));
    const ok = bad.length === 0 && imgs.length === 0 && gtm <= 1 && !stray;
    if (!ok) problems++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${page.padEnd(26)} gtm=${gtm} brokenImgs=${imgs.length} bad=${bad.length}${stray ? ' STRAY-TEXT' : ''}`);
    bad.slice(0, 4).forEach(x => console.log('         ' + x));
    imgs.slice(0, 4).forEach(x => console.log('         broken image: ' + x));
    await p.close();
  }
  console.log(problems ? `\n${problems} page(s) with problems` : '\nall pages clean');
  await b.close();
  process.exit(problems ? 1 : 0);
})();
