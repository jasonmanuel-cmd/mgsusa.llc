/* Compare paint timings with the motion layer against the same page without
   it, on a throttled mobile profile. Catches a render-blocking regression
   without a full Lighthouse install. */
const { chromium } = require('playwright');

async function measure(b, path, blockMotion) {
  const runs = [];
  for (let i = 0; i < 3; i++) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    if (blockMotion) await p.route('**/motion.{css,js}', r => r.abort());
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, downloadThroughput: 1.6*1024*1024/8, uploadThroughput: 750*1024/8, latency: 150 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await p.goto('http://127.0.0.1:8099/' + path, { waitUntil: 'load' });
    await p.waitForTimeout(2200);
    const m = await p.evaluate(() => {
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      const lcps = performance.getEntriesByType('largest-contentful-paint');
      return { fcp: fcp ? fcp.startTime : null,
               lcp: lcps.length ? lcps[lcps.length-1].startTime : null };
    });
    runs.push(m);
    await ctx.close();
  }
  const med = k => Math.round(runs.map(r=>r[k]).filter(Boolean).sort((a,b)=>a-b)[1] || 0);
  return { fcp: med('fcp'), lcp: med('lcp') };
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  for (const path of ['index.html', 'commercial-glass.html']) {
    const withM = await measure(b, path, false);
    const without = await measure(b, path, true);
    console.log(`\n  ${path}   (median of 3, 4x CPU throttle, ~1.6Mbps)`);
    console.log(`    FCP  without motion ${String(without.fcp).padStart(5)}ms   with ${String(withM.fcp).padStart(5)}ms   delta ${withM.fcp - without.fcp >= 0 ? '+' : ''}${withM.fcp - without.fcp}ms`);
    console.log(`    LCP  without motion ${String(without.lcp).padStart(5)}ms   with ${String(withM.lcp).padStart(5)}ms   delta ${withM.lcp - without.lcp >= 0 ? '+' : ''}${withM.lcp - without.lcp}ms`);
  }
  await b.close();
})();
