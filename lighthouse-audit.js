const lighthouse = require("lighthouse");
const chromeLauncher = require("chrome-launcher");

async function runLighthouse(url) {
  let chrome = null;
  try {
    chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });
    const options = {
      logLevel: "info",
      output: "json",
      port: chrome.port,
      emulatedFormFactor: "mobile"
    };
    
    const runnerResult = await lighthouse(url, options);
    return runnerResult.lhr;
  } finally {
    if (chrome) await chrome.kill();
  }
}

async function main() {
  console.log("🔍 Running Lighthouse Audit...");
  const lhr = await runLighthouse("https://www.mgsusa.llc/");
  
  console.log("\n📊 Lighthouse Scores:");
  console.log(`  Performance: ${lhr.categories.performance.score * 100}/100`);
  console.log(`  Accessibility: ${lhr.categories.accessibility.score * 100}/100`);
  console.log(`  Best Practices: ${lhr.categories["best-practices"].score * 100}/100`);
  console.log(`  SEO: ${lhr.categories.seo.score * 100}/100`);
  
  console.log("\n⚡ Core Web Vitals:");
  const metrics = lhr.audits.metrics.details.items[0];
  console.log(`  LCP: ${metrics.largestContentfulPaint}ms`);
  console.log(`  INP: ${metrics.interactionToNextPaint}ms`);
  console.log(`  CLS: ${metrics.cumulativeLayoutShift}`);
}

main().catch(console.error);
