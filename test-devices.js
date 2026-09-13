const { chromium } = require('playwright');

const devices = {
  'iPhone 13': { width: 390, height: 844, deviceScaleFactor: 3, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15' },
  'iPhone SE': { width: 375, height: 667, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15' },
  'Pixel 6': { width: 412, height: 915, deviceScaleFactor: 2.75, userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 6)' },
  'iPad Air': { width: 820, height: 1180, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15' },
  'Galaxy Tab S7': { width: 1024, height: 1024, deviceScaleFactor: 1.5, userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-T875)' },
  'Desktop': { width: 1920, height: 1080, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
};

async function testDevices() {
  const browser = await chromium.launch();
  const results = {};

  for (const [deviceName, deviceConfig] of Object.entries(devices)) {
    try {
      console.log(`\n📱 Testing ${deviceName}...`);
      const context = await browser.createContext({
        viewport: { width: deviceConfig.width, height: deviceConfig.height },
        deviceScaleFactor: deviceConfig.deviceScaleFactor,
        userAgent: deviceConfig.userAgent
      });
      
      const page = await context.newPage();
      
      // Navigate and wait for images
      await page.goto('https://www.mgsusa.llc/', { waitUntil: 'networkidle' });
      
      // Get page metrics
      const metrics = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img, video'));
        return {
          totalImages: images.length,
          loadedImages: images.filter(img => {
            if (img.tagName === 'VIDEO') return img.readyState >= 2;
            return img.complete && img.naturalHeight !== 0;
          }).length,
          pageTitle: document.title,
          bodyHeight: document.body.scrollHeight
        };
      });
      
      // Take screenshot
      await page.screenshot({ path: `C:\\Users\\blunt\\Desktop\\test-${deviceName.replace(/\s+/g, '-')}.png` });
      
      results[deviceName] = {
        ...metrics,
        viewport: `${deviceConfig.width}x${deviceConfig.height}`,
        imageLoadSuccess: metrics.loadedImages === metrics.totalImages
      };
      
      console.log(`  ✅ ${deviceName}: ${metrics.loadedImages}/${metrics.totalImages} images loaded`);
      
      await context.close();
    } catch (error) {
      console.error(`  ❌ Error testing ${deviceName}:`, error.message);
      results[deviceName] = { error: error.message };
    }
  }

  await browser.close();
  return results;
}

testDevices().then(results => {
  console.log('\n📊 Device Testing Results:');
  console.log(JSON.stringify(results, null, 2));
});
