const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting social media scraper...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  try {
    // ========== FACEBOOK REVIEWS ==========
    console.log('\n📱 Scraping Facebook reviews...');
    const fbPage = await context.newPage();
    await fbPage.goto('https://www.facebook.com/profile.php?id=61590016589444', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    }).catch(e => console.log('⚠️  Facebook navigation warning:', e.message));

    // Wait for page to settle
    await fbPage.waitForTimeout(3000);

    // Try to find reviews
    const fbReviews = await fbPage.evaluate(() => {
      const reviews = [];
      // Look for review containers in multiple possible locations
      const reviewElements = document.querySelectorAll('[data-testid*="review"], .x1iyjqo2, [role="article"]');
      
      if (reviewElements.length > 0) {
        reviewElements.forEach((el, idx) => {
          if (idx < 5) {
            const text = el.innerText || el.textContent;
            if (text && text.length > 20) {
              reviews.push({
                index: idx,
                text: text.substring(0, 300),
                html: el.className
              });
            }
          }
        });
      }
      
      return {
        found: reviews.length,
        reviews: reviews,
        pageTitle: document.title,
        url: window.location.href
      };
    });

    console.log('✅ Facebook result:', JSON.stringify(fbReviews, null, 2));

    // ========== INSTAGRAM VIDEOS ==========
    console.log('\n📸 Scraping Instagram videos...');
    const igPage = await context.newPage();
    
    // Instagram blocks automated access more aggressively
    await igPage.goto('https://www.instagram.com/masterglasssolutions_/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    }).catch(e => console.log('⚠️  Instagram navigation warning:', e.message));

    await igPage.waitForTimeout(3000);

    const igVideos = await igPage.evaluate(() => {
      const videos = [];
      
      // Look for video elements
      const videoElements = document.querySelectorAll('video, [role="img"][aria-label*="Video"], a[href*="/p/"]');
      const postLinks = document.querySelectorAll('a[href*="/p/"]');
      
      // Extract post URLs (videos are usually in Reels or Posts)
      const uniqueLinks = new Set();
      postLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes('/p/')) {
          uniqueLinks.add('https://www.instagram.com' + href);
        }
      });

      return {
        foundVideos: videoElements.length,
        foundPosts: Array.from(uniqueLinks).slice(0, 5),
        pageTitle: document.title,
        url: window.location.href,
        note: 'Extract video URLs manually or use Instagram Graph API'
      };
    });

    console.log('✅ Instagram result:', JSON.stringify(igVideos, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('\n🏁 Scraper finished');
  }
})();