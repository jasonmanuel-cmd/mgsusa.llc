/* Does the quote wizard still work on current main, after the SEO/GTM work?
   Last recorded lead was 2026-09-17; GTM went in on 09-19. Worth proving the
   form itself is not the reason the leads stopped. */
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const page of ['request-quote.html', 'contact.html', 'commercial-quote.html', 'residential-quote.html']) {
    const p = await b.newPage();
    const errors = [];
    p.on('pageerror', e => errors.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 120)); });
    let posted = null;
    await p.route('**/api/submit-quote', r => {
      posted = JSON.parse(r.request().postData() || '{}');
      r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, redirect: '/thank-you', kind: 'quote' }) });
    });
    await p.route('**/googletagmanager.com/**', r => r.fulfill({ status: 200, body: '' }));
    await p.route('**/challenges.cloudflare.com/**', r => r.fulfill({ status: 200, body: '' }));

    let reached = 'did not start';
    try {
      await p.goto('http://127.0.0.1:8099/' + page, { waitUntil: 'domcontentloaded' });
      await p.waitForSelector('.quote-wizard', { timeout: 8000 });
      reached = 'wizard rendered';
      await p.click('.quote-wizard__card'); await p.click('.quote-wizard__next');
      await p.click('.quote-wizard__option'); await p.click('.quote-wizard__next');
      await p.fill('[name="location"]', 'San Antonio'); await p.click('.quote-wizard__next');
      if (await p.locator('.quote-wizard__step:not([hidden]) .quote-wizard__option').count())
        await p.click('.quote-wizard__step:not([hidden]) .quote-wizard__option');
      await p.click('.quote-wizard__next');
      if (await p.locator('[name="details"]').count()) {
        await p.fill('[name="details"]', 'Test run'); await p.click('.quote-wizard__next');
      }
      await p.fill('[name="first-name"]', 'Test'); await p.fill('[name="last-name"]', 'User');
      await p.fill('[name="email"]', 'test@example.com');
      await p.click('.quote-wizard__next');
      const c = p.locator('[name="consent"]'); if (await c.count()) await c.check();
      reached = 'reached review step';
      await p.click('.quote-wizard__submit');
      await p.waitForTimeout(1500);
      reached = posted ? 'SUBMITTED OK' : 'submit clicked but nothing posted';
    } catch (e) {
      reached += ' -> FAILED: ' + e.message.split('\n')[0].slice(0, 110);
    }
    console.log('\n=== ' + page);
    console.log('  outcome:      ' + reached);
    console.log('  final url:    ' + p.url().replace('http://127.0.0.1:8099', ''));
    if (posted) console.log('  posted:       ' + posted['first-name'] + ' / ' + posted.email + ' / ' + posted.service);
    console.log('  js errors:    ' + (errors.length ? errors.slice(0, 3).join(' | ') : 'none'));
    await p.close();
  }
  await b.close();
})();
