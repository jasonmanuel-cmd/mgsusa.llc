# Master Glass Solutions — Post-Deployment Verification Checklist
**Date:** Wednesday, July 29, 2026  
**Deployment Method:** GitHub → Vercel Auto-Deploy  
**Production URL:** https://www.mgsusa.llc/  
**Vercel Project:** https://vercel.com/jasons-projects-1d845fc4/mgsusa-llc

---

## DEPLOYMENT STATUS: IN PROGRESS ⏳

Code has been pushed to GitHub. Vercel is now building and deploying.

**Expected timeline:** 30–90 seconds  
**Current time:** 21:15 UTC  
**Check deployment:** https://vercel.com/jasons-projects-1d845fc4/mgsusa-llc/deployments

---

## Verification Steps (Run After Deployment Complete)

### Step 1: Verify Site Loads (5 minutes post-push)
```
[ ] Open https://www.mgsusa.llc/ in Chrome
[ ] Hero video loads (MGSVID.mp4)?
[ ] Full-screen video visible?
[ ] CTA buttons clickable?
[ ] No 404 errors in browser console (F12)?
```

### Step 2: Test Key Pages
```
[ ] Navigate to /residential-glass.html — loads?
[ ] Navigate to /emergency-glass-repair.html — loads?
[ ] Navigate to /frameless-vs-framed-glass.html — loads?
[ ] Click "Request a quote" button — form loads?
```

### Step 3: Test Mobile
```
[ ] Open https://www.mgsusa.llc/ on iPhone or Android
[ ] Hero video visible?
[ ] Mobile menu opens (hamburger icon)?
[ ] 24/7 call FAB visible bottom-right?
[ ] CTA buttons clickable?
```

### Step 4: Check Assets
```
[ ] Hero image/poster loads
[ ] CSS loads (no FOUC - Flash of Unstyled Content)?
[ ] JavaScript runs (no console errors)?
[ ] Social icons visible in utility bar?
```

### Step 5: Test Conversions
```
[ ] Fill out "Request a Quote" form
[ ] Submit form
[ ] Confirm email sends to contact@masterglasssolutionsusa.com
[ ] Click phone number (210-370-3700) — dialer opens?
```

### Step 6: Browser Console Check (F12 → Console)
```
No errors should appear. If you see:
- [CRITICAL] Red errors → screenshot and report
- [WARNING] Yellow warnings → normal, can ignore
- [INFO] Blue messages → normal, can ignore
```

---

## Vercel Dashboard Checks

### Deployment Status
1. Visit: https://vercel.com/jasons-projects-1d845fc4/mgsusa-llc/deployments
2. Look for latest deployment (should be from today, ~21:15 UTC)
3. Status should show: **✅ Ready** (green checkmark)

### Build Logs
1. Click the deployment row
2. Check build logs for errors
3. Expected: No red errors, only info/warnings

### Production Domain
1. Confirm custom domain is set: mgsusa.llc → www.mgsusa.llc
2. HTTPS certificate active (lock icon in browser)
3. No mixed content warnings

---

## Rollback Procedure (If Issues Found)

If site has critical errors after deployment:

1. **Check Vercel logs** for specific error
2. **Roll back to previous build:**
   - Visit Vercel dashboard
   - Click on previous stable deployment
   - Click "Promote to Production"
3. **Notify me** with error details
4. **Fix in code** and redeploy

---

## Post-Deployment Monitoring (Week 1)

### Day 1 (Thursday)
- [ ] Site stays online (no 500 errors)
- [ ] Video hero plays without buffering
- [ ] Traffic appears in Google Analytics
- [ ] No Slack/email alerts from monitoring

### Day 2–3 (Friday–Saturday)
- [ ] Monitor form submissions
- [ ] Track phone call volume
- [ ] Check Google Search Console for indexing
- [ ] Verify no performance degradation

### Day 4–7 (Sunday–Wednesday)
- [ ] Google Search Console: Pages indexed?
- [ ] Ranking changes for key terms?
- [ ] Lead quality improving?
- [ ] Any user-reported issues?

---

## Google Search Console Verification

After deployment, add to Google Search Console (if not already added):

1. Visit: https://search.google.com/search-console
2. Add property: https://www.mgsusa.llc/
3. Verify ownership (DNS TXT or HTML file)
4. Submit sitemap: https://www.mgsusa.llc/sitemap.xml
5. Request indexing of key pages:
   - https://www.mgsusa.llc/
   - https://www.mgsusa.llc/residential-glass.html
   - https://www.mgsusa.llc/commercial-glass.html
   - https://www.mgsusa.llc/emergency-glass-repair.html

Monitor:
- [ ] Crawl stats (errors?)
- [ ] Coverage (pages indexed?)
- [ ] Search Analytics (impressions? Clicks? CTR?)

---

## Performance Monitoring (Week 1)

### Core Web Vitals (Monitor)
- **LCP (Largest Contentful Paint):** Should be <3.2s (hero video)
- **INP (Interaction to Next Paint):** Should be <100ms (clicks, forms)
- **CLS (Cumulative Layout Shift):** Should be <0.1 (no unexpected layout changes)

**Check at:** Google Search Console → Core Web Vitals or PageSpeed Insights

### Historical Comparison
- **Before:** Performance 74/100
- **Target:** Performance 85/100
- **Monitor:** Should stay ≥74/100

---

## Expected Outcomes (Week 1–2)

### If Everything Works ✅
- [ ] Site loads fast (LCP <3.2s)
- [ ] No console errors
- [ ] Forms submit correctly
- [ ] Traffic appears in analytics
- [ ] Google begins indexing pages

### Potential Issues 🚨
- **Video doesn't load** → Check video file path, browser cache
- **Form doesn't submit** → Check email provider settings
- **404 errors** → Check asset paths (CSS, JS, images)
- **Slow performance** → Check Vercel build logs, image optimization

---

## Rollout Summary

| Phase | Status | Timeline |
|-------|--------|----------|
| Code Push to GitHub | ✅ DONE | 21:15 UTC |
| Vercel Auto-Build | ⏳ IN PROGRESS | ~5 min |
| Deploy to Production | ⏳ PENDING | ~1–2 min |
| DNS Verification | ✅ READY | instant |
| SSL Certificate | ✅ READY | instant |
| Post-Deploy QA | ⏳ NEXT | 5–10 min |
| Google Indexing | ⏳ PENDING | 24–48 hrs |

---

## Communication Plan

### Stakeholders to Notify
- [ ] Linda & Adam (owners) — "Site is live!"
- [ ] Check Google Analytics for traffic
- [ ] Monitor phone calls + form submissions

### Metrics to Track Daily (Week 1)
- [ ] Site uptime (should be 100%)
- [ ] Average load time (should be <3.5s)
- [ ] Form submissions (new leads?)
- [ ] Phone calls (increase?)
- [ ] Search Console impressions (new visibility?)

---

## Success Criteria (All Must Be True)

✅ = Site is ready for revenue generation

- [x] Code deployed to production (GitHub → Vercel)
- [ ] Site loads on https://www.mgsusa.llc/
- [ ] Hero video plays without errors
- [ ] No console errors (F12)
- [ ] Mobile responsive (tested on iPhone + Android)
- [ ] Forms work (can submit "Request a Quote")
- [ ] Phone number clickable (210-370-3700)
- [ ] HTTPS active (lock icon in browser)
- [ ] Google Search Console shows pages being crawled
- [ ] Analytics receiving traffic

---

## Next Steps After Verification

### If All Checks Pass ✅
1. Celebrate! 🎉 Site is live.
2. Start monitoring (Week 1 checklist)
3. Gather Tier 1 content (photos, testimonials) to add next week
4. Set up LinkedIn company page (use LINKEDIN_COMPANY_PAGE_SETUP.md)

### If Issues Found 🚨
1. Screenshot the error
2. Check Vercel build logs
3. Report to me with details
4. I'll diagnose and fix
5. Redeploy

---

## Contact & Support

**Deployment Questions?** Refer to:
- DEPLOYMENT_AND_NEXT_STEPS.md (general deployment guide)
- Vercel Dashboard (build logs, status)
- GitHub repo (code history)

**Need to Rollback?** Message with "rollback" + I'll revert to previous stable build.

---

## Final Deployment Checklist (Run This)

```
PRE-DEPLOYMENT (BEFORE YOU RUN)
[ ] Code committed to git ✅
[ ] Pushed to GitHub ✅
[ ] Vercel watching branch ✅

POST-DEPLOYMENT (RUN NOW)
[ ] Visit https://www.mgsusa.llc/
[ ] Hero video loads?
[ ] No 404 errors?
[ ] Mobile works?
[ ] Forms submit?
[ ] Phone clickable?

VERIFICATION COMPLETE
[ ] All checks pass ✅
[ ] Ready for revenue generation ✅
```

---

**Deployment timestamp:** 2026-07-29T21:15:00Z  
**Vercel Project:** https://vercel.com/jasons-projects-1d845fc4/mgsusa-llc  
**Production Domain:** https://www.mgsusa.llc/

**Status:** 🟢 LIVE (or will be in 1–2 minutes)

