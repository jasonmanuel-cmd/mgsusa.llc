# Master Glass Solutions — Multi-Domain & Citation Audit

## Secondary domains — sanantonioglasssolutions.com & masterglasssolutionsusa.com

Both secondary domains are configured correctly:

- **Canonical tags** on both domains point to `https://www.mgsusa.llc/` — correct, consolidates ranking signals to the primary domain
- **robots.txt** on both domains is identical to the primary — references the same sitemaps, same AI-crawler allowances
- **Content is identical** — both serve the same 51,726-byte HTML as mgsusa.llc
- **No duplicate content penalty risk** — canonicals handle consolidation

### What's missing on secondary domains (same gap as primary, inherited from identical setup)

Both secondary domains serve the same HTML as mgsusa.llc, so whatever structured data is on the primary is also on the secondaries. The new content pages (glass-types, storm-damage-glass, commercial-glass-guide, glass-cleaning-maintenance, hill-country-glass) and the llms.txt enhancements are NOT automatically on the secondary domains — they would need to be deployed there separately if those domains are served from a different source.

**If the secondary domains are Vercel deployments of the same repo:** they already have everything automatically — no action needed.

**If the secondary domains are static clones hosted elsewhere:** they only have whatever was pushed at clone time. The new pages and llms updates since then would be missing. Verify by checking if the new URLs resolve on the secondary domains.

## Stale/bad citation found

**Source:** sanantonioemergencyhomeservices.com/listings/master-glass-solutions/
**Issues:**
- Wrong phone: (210) 655-4527 (correct is 210-370-3700)
- Wrong address: San Antonio, TX 78217 (correct is 78249)
- Wrong website: www.infinityglasscompany.com (should be www.mgsusa.llc)
- Review count off by 3: shows 79 (should be 76)
- The listing claims to be "VERIFIED" — but with wrong data

This is a bad NAP citation that actively hurts local search consistency. It needs to be corrected or removed.

**Action:** This is account-side — someone with the business email needs to claim the listing on that directory and correct the info, or request removal. It's on the Operative/youroptive.com platform.

## Google Business Profile — placeholder

No GBP audit was done because it requires account access. The checklist (SEO-checklist.md in the repo) covers the full GBP optimization workflow.

## Rich Results validation — placeholder

No live validation was done. The schema on all pages has been verified programmatically (256 valid JSON-LD blocks, 0 invalid). A live Google Rich Results Test pass is listed in the checklist as a manual verification step.

---

## Summary of what's done vs. what's left

### Code-side — DONE
- 5 new content pages created, schema-verified, pushed
- llms.txt enhanced with pricing, distances, response times
- llms-full.txt updated with all new page content
- Sitemap updated
- Multi-domain canonicals and robots.txt verified correct

### Account-side — TODO (in checklist)
- GBP optimization (checklist §1)
- Local citations: claim/correct Yelp, BBB, Angi, HomeAdvisor, Bing Places, Apple Maps (checklist §2)
- Correct stale citation on sanantonioemergencyhomeservices.com
- Rich Results Test validation (checklist §3)
- Monthly maintenance (checklist §7)
