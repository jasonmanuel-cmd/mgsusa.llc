const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const pages = ['index.html', 'contact.html', 'boerne-tx.html', 'glass-types.html', 'emergency.html'];
  for (const page of pages) {
    const p = await b.newPage();
    await p.route('**/googletagmanager.com/gtm.js**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await p.goto('http://127.0.0.1:8099/' + page, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => ({
      starts: (window.dataLayer || []).filter(e => e && e['gtm.start']).length,
      tags: Array.from(document.querySelectorAll('script')).filter(s => (s.textContent || '').includes("'GTM-")).length,
      noscripts: document.querySelectorAll('noscript').length,
      stray: (document.body.innerText || '').includes('so it does not compete'),
      first: (document.body.innerText || '').slice(0, 45).replace(/\s+/g, ' ')
    }));
    console.log(`  ${page.padEnd(22)} gtm.start=${r.starts}  scriptTags=${r.tags}  stray=${r.stray}  first="${r.first}"`);
    await p.close();
  }
  await b.close();
})();
