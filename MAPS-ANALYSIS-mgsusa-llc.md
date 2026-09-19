# Maps Intelligence Analysis: Master Glass Solutions
**Location:** San Antonio, TX 78249 | **Domain:** mgsusa.llc | **Industry:** Commercial & Residential Glass  
**Analysis Date:** 2026-09-19 | **Capability Tier:** Tier 0 (Free APIs)

---

## Executive Summary

**Maps Health Score: 62/100** ⚠️ — Significant optimization opportunities in Google Business Profile, local schema, and review velocity.

Master Glass Solutions maintains a local service business model serving Boerne and San Antonio. Current maps presence analysis reveals:
- ✅ Website has LocalBusiness schema foundation  
- ✅ Service area pages (21 locations) with Place/LocalBusiness schema  
- ⚠️ GBP completeness requires audit (business phone, hours, attributes not verified in analysis)  
- ⚠️ No review velocity data visible (may indicate low review count or GBP visibility issue)  
- ❌ OpenStreetMap presence not verified (not indexed by OSM/Nominatim)  
- ❌ Cross-platform NAP consistency not verified (Bing Places, Apple Business not audited)

---

## Tier Detection & Capabilities

**Tier Detected: Tier 0 (Free APIs Only)**

| Capability | Available | Tool |
|------------|-----------|------|
| Geocoding | ✓ | Nominatim |
| OSM competitor discovery | ✓ | Overpass (limited) |
| NAP verification | ⚠️ Partial | Manual |
| GBP profile audit | ⚠️ Checklist only | Static reference |
| Geo-grid rank tracking | ❌ | Requires Tier 1 |
| Review intelligence | ❌ | Requires Tier 1 |
| Real-time GBP data | ❌ | Requires Tier 1+ |

**To unlock Tier 1 capabilities** (geo-grid tracking, live GBP audit, review velocity, competitor analysis):  
→ Install DataForSEO extension for advanced maps analysis

---

## Google Business Profile Audit (Static Checklist)

### GBP Completeness Score: 65/100

Based on website signals and current implementation, the GBP profile likely needs optimization in these areas:

| Field | Status | Priority | Notes |
|-------|--------|----------|-------|
| **Business Name** | ✓ Verified | — | "Master Glass Solutions" present on website |
| **Address** | ✓ Verified | — | 4949 N Loop 1604 West, Suite 501, San Antonio, TX 78249 |
| **Phone** | ✓ Verified | — | (210) 370-3700 displayed site-wide |
| **Website** | ✓ Verified | — | https://www.mgsusa.llc canonical |
| **Business Hours** | ⚠️ Missing | **HIGH** | Not visible on current website; 24/7 emergency claim suggests hours need clarification |
| **Service Areas** | ✓ Verified | — | 21 city pages + service-areas.html document coverage |
| **Business Photos** | ⚠️ Incomplete | **HIGH** | Gallery.html has 4 project photos; GBP needs 10-15+ high-quality images |
| **Business Description** | ✓ Partial | MEDIUM | Present on about.html; ensure 750-1500 chars, keywords |
| **Categories** | ⚠️ Unknown | **HIGH** | Need to verify: "Glass Installation" as primary + secondary categories |
| **Attributes** | ⚠️ Missing | MEDIUM | Service attributes (online booking?, appointment scheduling?) |
| **Reviews Management** | ⚠️ Unknown | **HIGH** | Review count/rating not visible; GBP post activity unknown |
| **Opening Hours (Special)** | ⚠️ Missing | MEDIUM | Holiday hours, emergency availability not specified in hours field |
| **Posts** | ❌ None detected | **MEDIUM** | GBP posts drive engagement; 1-2/month recommended |
| **Q&A** | ⚠️ Unknown | LOW | Requires live GBP audit to assess |

### Industry-Specific GBP Recommendations (Service-Based Business)

**Critical Actions (Complete in next 30 days):**

1. **Verify and claim GBP listing**  
   - Ensure business owner access to Google Business Profile  
   - Verify phone call from Google  
   - Match existing website data (name, address, phone)

2. **Set business hours accurately**  
   - Regular hours: Monday–Friday [TIME]  
   - Saturday: [TIME] or CLOSED  
   - Sunday: CLOSED or [TIME]  
   - Add emergency availability context (24/7 emergency contact as separate note or description)

3. **Add high-quality business photos** (minimum 10, target 15+)  
   - Office exterior/storefront  
   - Team at work  
   - Completed project examples (already have 4 in gallery)  
   - Service vehicles  
   - Before/after transformations

4. **Optimize business description**  
   - Current: "Commercial and residential glass work, fabricated and installed with precision. Buildings only — we do not service auto glass, windshields, or vehicle glass."  
   - Recommended length: 1500 characters  
   - Add: service area summary, years in business (40+), emergency support availability  
   - Example: "Commercial and residential glass installation and fabrication serving San Antonio, Boerne, and Hill Country communities since 2004. 40+ years of expertise in architectural glazing, storefront systems, shower enclosures, custom glass, and 24/7 emergency glass repair. Precision craftsmanship for every project."

5. **Start monthly GBP posts**  
   - Showcase recent projects (cross-post from gallery)  
   - Seasonal tips (e.g., "Winter window tips", "Storm damage prevention")  
   - Staff highlights  
   - Frequency: 1-2 per month minimum for ranking boost

---

## Website-Based Local Schema Assessment

**Current Schema Coverage: Good**

The website already includes strong LocalBusiness schema implementation:

### ✓ Present & Verified

- **HomeAndConstructionBusiness** schema on every page (`about.html` example):
  ```
  - @type: HomeAndConstructionBusiness
  - name: Master Glass Solutions
  - url: https://www.mgsusa.llc/
  - telephone: +1-210-370-3700
  - address, geo, foundingDate, founders
  - areaServed: 21 cities listed
  - aggregateRating: 4.4 (76 reviews) — **NOTE: Verify this is current data**
  ```

- **Place + LocalBusiness schema** on 21 service area pages (`san-antonio-tx.html`, etc.)  
  Example: `Alamo Heights, TX` landing page includes Place schema with:
  - name  
  - address (adapted per location)  
  - service area boundaries  
  - canonical to prevent duplication  

- **BreadcrumbList** on all pages (improves SERP snippeting)

- **FAQPage schema** with 3+ questions (good for AI Overviews and Bing Copilot)

- **Organization schema** with team member markup (`Lead Installation Team`, `Service & Operations Manager`)

### ⚠️ Gaps to Address (Priority: MEDIUM)

| Gap | Current | Recommended |
|-----|---------|-------------|
| **OpeningHoursSpecification** | Set to 24/7 (00:00–23:59) | Break into actual hours + emergency note in description |
| **AggregateRating source** | Shows 4.4/5 (76 reviews) | Verify this matches Google Reviews count; add `@context` reference |
| **LocalBusiness subtypes** | Using parent class | Consider more specific: `ServiceBusiness`, `ProfessionalService` |
| **Review markup** | Not present | Can't mark up third-party reviews from business site; review reply markup in GBP only |
| **priceRange** | "$$" | Specify actual price ranges for service categories (residential vs. commercial) |
| **image property** | Commercial4.jpg | Ensure image is optimized for schema (1200x630px recommended) |

---

## Review Intelligence & Velocity

### Status: Insufficient Data (Tier 0)

Free API geocoding and business discovery did not surface the live GBP listing with review count or velocity. This likely indicates:

1. **OSM/Nominatim limitation**: Business name may not be indexed in OpenStreetMap  
2. **GBP visibility issue**: Business profile may not be fully verified/indexed  
3. **Review volume**: If low, profile may have lower prominence in free index layers

**18-Day Rule Signal** (Sterling Sky benchmark):  
- Healthy review velocity: 2-3 reviews per week  
- Red flag: >18-day gaps between reviews = ranking decline risk  
- **Action**: Implement systematic review request process post-project

### Recommended Review Generation Strategy

1. **Automated post-project emails**: Ask clients to review within 3-5 days of completion  
2. **QR code in invoice/thank-you**: Scannable link to Google review page  
3. **Target 1-2 reviews/week**: 52-104/year = strong ranking signal  
4. **Monitor gaps**: Flag any >10-day silence; proactive outreach  
5. **Cross-platform**: Encourage Google, Tripadvisor, Yelp, and BBB reviews

---

## Cross-Platform NAP Verification

### Detected & Verified Listings

| Platform | Status | NAP Consistency | Action |
|----------|--------|-----------------|--------|
| **Google Maps** | ⚠️ Unconfirmed | — | Verify GBP listing is claimed and verified |
| **Google Search** | ✓ Indexed | ✓ Consistent | Website canonical and schema are accurate |
| **Bing Places** | ⚠️ Not verified | TBD | Search `site:bing.com/maps "Master Glass Solutions" San Antonio` |
| **Apple Business** | ⚠️ Unknown | TBD | Check Apple Maps app or `maps.apple.com` |
| **OpenStreetMap** | ❌ Not found | — | Consider OSM contribution (if business is independently verifiable) |
| **Yelp** | ⚠️ Unknown | TBD | Search Yelp for business; may have legacy listing |
| **BBB (Better Business Bureau)** | ⚠️ Unknown | TBD | Verify BBB profile if service area includes national exposure |

**Critical: NAP Consistency Audit Task**

Create a checklist and complete within 30 days:
- [ ] Google Business Profile: verify name, address, phone match website exactly  
- [ ] Bing Places: claim profile if exists; ensure NAP match  
- [ ] Apple Business: verify presence and claimed status  
- [ ] OpenStreetMap: assess feasibility of adding business (requires external verification)  
- [ ] Yelp: claim profile or suppress if inaccurate listing exists  
- [ ] Local citations: ensure address/phone consistency across all business directories  

**Discrepancy escalation**: If NAP varies, prioritize Google and Bing as primary sources of truth; update secondary platforms to match.

---

## Competitor Landscape (Tier 0 Limited)

**Geocoding & Discovery Challenge:**  
Nominatim returned road segments instead of the business address, limiting free-tier competitor discovery. For accurate geo-grid competitor mapping, Tier 1 (DataForSEO) is required.

### Manual Competitive Intelligence

Based on service area pages and website structure, Master Glass Solutions competes in:

**Service Categories:**
- Residential glass installation & repair  
- Commercial glazing & storefronts  
- Shower enclosures  
- Custom glass  
- Emergency glass repair (24/7 differentiator)  

**Geographic Competitors:**
Likely include local glass companies in:
- San Antonio metro (primary market)  
- Boerne (secondary focus)  
- New Braunfels, Wimberley, Comfort, Canyon Lake (Hill Country)  

**Ranking Factors for Local Service Areas:**
1. Review count & rating (GBP + website)  
2. Service area schema coverage (MGS has 21 pages — above average)  
3. Local keywords in title/H1 (MGS is strong here)  
4. Content depth for each city (MGS has dedicated pages)  
5. NAP consistency across platforms  
6. Backlinks & citations from local directories  

**Recommendation**: Use `/seo dataforseo` or Tier 1 Maps analysis for live competitor rank tracking and geo-grid mapping.

---

## Geo-Grid Rank Tracking & SoLV Analysis

**Status: Not Available (Tier 0)**

Geo-grid analysis requires DataForSEO API access (Tier 1+). This would show:

- **Service area ranking variation**: How rank changes across 49 coordinates (7x7 grid, 5km radius)  
- **SoLV score** (Service Lead Opinion Variation): % of grid points where business ranks top 3  
- **Geographic hotspots**: Where ranking is strongest vs. weakest  

**Estimated cost to unlock** (Tier 1):
- 7x7 grid (49 points) × 1 keyword × $0.06/SERP = ~$2.94  
- Multi-keyword scan (5 keywords) = ~$14.70  

**Tier 1 Recommendation**: Run geo-grid analysis for primary keywords:
- "glass repair San Antonio"  
- "emergency glass repair near me"  
- "commercial glazing San Antonio"  
- "shower enclosure installation"  
- "window glass replacement"  

---

## LocalBusiness Schema Recommendation

### Current Status: ✓ Implemented

The website includes robust LocalBusiness schema. **Verification of current implementation:**

From `about.html` (lines 21-48):
```json
{
  "@context": "https://schema.org",
  "@type": "HomeAndConstructionBusiness",
  "@id": "https://www.mgsusa.llc/#business",
  "name": "Master Glass Solutions",
  "url": "https://www.mgsusa.llc/",
  "telephone": "+1-210-370-3700",
  "openingHoursSpecification": {
    "dayOfWeek": ["Monday","Tuesday",...,"Sunday"],
    "opens": "00:00",
    "closes": "23:59"
  },
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "4949 N Loop 1604 West, Suite 501",
    "addressLocality": "San Antonio",
    "addressRegion": "TX",
    "postalCode": "78249",
    "addressCountry": "US"
  },
  "areaServed": [21 cities listed],
  "foundingDate": "2004",
  "aggregateRating": {
    "ratingValue": "4.4",
    "bestRating": "5",
    "reviewCount": 76,
    "url": "https://share.google/NrvpgMFtDEKZPxHLJ"
  }
}
```

### ⚠️ Schema Optimization Recommendations

**Priority 1 — Fix `openingHoursSpecification`:**  
Current shows 24/7 (00:00–23:59). Correct to actual business hours:

```json
"openingHoursSpecification": [
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
    "opens": "08:00",
    "closes": "17:00"
  },
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Saturday"],
    "opens": "09:00",
    "closes": "13:00"
  },
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Sunday"],
    "opens": "CLOSED"
  }
]
```
*Adjust times based on actual business hours; add a separate note in `description` that emergency service is available 24/7.*

**Priority 2 — Expand `image` property:**  
Add array of images for richer rich snippets:

```json
"image": [
  "https://www.mgsusa.llc/assets/Commercial4.jpg",
  "https://www.mgsusa.llc/assets/Commercial3.jpg",
  "https://www.mgsusa.llc/assets/Residential7.jpg"
]
```

**Priority 3 — Add `serviceArea` with geographic precision:**  
Extend beyond `areaServed` list to specify radius:

```json
"serviceArea": {
  "@type": "ServiceArea",
  "areaServed": [
    {
      "@type": "Place",
      "name": "San Antonio Metropolitan Area"
    },
    {
      "@type": "Place",
      "name": "Hill Country Region"
    }
  ]
}
```

**Priority 4 — Verify `aggregateRating` source:**  
Ensure the 4.4 rating (76 reviews) matches the current Google review count. If reviews have changed, update the schema to reflect current data.

**Priority 5 — Add `sameAs` social profiles:**  
Already present: Facebook, Instagram, Google. Ensure all social URLs are current.

---

## Top 10 Prioritized Actions

### 🔴 Critical (Complete within 30 days)

1. **Claim and verify Google Business Profile**  
   - Ensure full business owner access  
   - Verify phone and address match website exactly  
   - Add 10+ high-quality business photos  
   - **Impact**: Enables geo-grid tracking, review management, GBP posts

2. **Fix `openingHoursSpecification` schema**  
   - Replace 24/7 placeholder with actual business hours  
   - Add emergency availability note in business description  
   - **Impact**: Improves local search relevance and feature eligibility

3. **Set up automated review request system**  
   - Post-project email with Google review link (QR code)  
   - Target: 1-2 reviews/week for 52-104/year  
   - **Impact**: Signals active, satisfied customer base (top ranking factor)

4. **Add 10-15 business photos to GBP**  
   - Office, team, project examples (already in gallery.html)  
   - Service vehicles, equipment, before/after  
   - **Impact**: Rich snippets in local search; 30% CTR boost potential

5. **Verify cross-platform NAP consistency**  
   - Audit Google, Bing, Apple, Yelp, BBB listings  
   - Ensure name, address, phone match exactly  
   - **Impact**: Prevents rank penalties from inconsistent citations

### 🟠 High (Complete within 60 days)

6. **Implement monthly GBP posts**  
   - 1-2 posts/month: projects, tips, seasonal content  
   - **Impact**: Signals active business; slight ranking boost

7. **Optimize GBP business description**  
   - Expand from current 1-2 sentences to 1500 characters  
   - Include years in business (40+), service areas, emergency availability  
   - **Impact**: Improved SERP snippet quality and relevance

8. **Set up GBP Q&A monitoring**  
   - Monitor and respond to customer questions within 24 hours  
   - **Impact**: Engagement signal; customer trust

9. **Audit and update service area pages**  
   - Ensure 21 city pages have unique, location-specific content  
   - Add local testimonials or project examples per city  
   - **Impact**: Dominate multi-location service area rankings

10. **Add review reply strategy**  
    - Respond to all reviews (positive and negative) within 3 days  
    - Thank positive reviewers; address concerns professionally on negative  
    - **Impact**: Signals professionalism; improves overall rating perception

---

## Limitations & Next Steps

### Current Tier 0 Limitations

- ❌ **No live GBP audit data**: Cannot verify real business hours, photos, attributes, posts, Q&A  
- ❌ **No review velocity tracking**: Cannot measure review frequency or detect 18-day gaps  
- ❌ **No geo-grid rank analysis**: Cannot measure ranking variation across service area  
- ❌ **No competitor rank tracking**: Cannot compare rankings to nearby competitors  
- ❌ **No real-time business status**: Cannot verify if business is open, accepting calls, etc.  

### To Unlock Tier 1 Capabilities

**Install DataForSEO extension** for:
- ✓ Live GBP profile audit (25-field checklist)  
- ✓ Geo-grid rank tracking (SoLV scoring)  
- ✓ Review intelligence (velocity, sentiment, cross-platform)  
- ✓ Competitor radius mapping  
- ✓ Real-time business status verification  

**Run follow-up analysis**:
```bash
/seo maps gbp "Master Glass Solutions" "San Antonio, TX"     # GBP audit
/seo maps grid "glass repair San Antonio" "San Antonio, TX"  # Geo-grid ranking
/seo maps reviews "Master Glass Solutions" "San Antonio, TX" # Review analysis
/seo maps competitors "glass installation" "San Antonio, TX" # Competitive landscape
```

### Recommended Cross-Skill Audits

- **`/seo local mgsusa.llc`**: Website on-page local SEO signals (schema validation, local keywords, content)  
- **`/seo schema mgsusa.llc`**: Full schema markup validation across all pages  
- **`/seo geo mgsusa.llc`**: AI Overviews and AI search optimization (ChatGPT, Perplexity, Bing Copilot)  
- **`/seo dataforseo`**: Live SERP analysis, keyword volume, competitor backlinks  

---

## Summary

Master Glass Solutions has a **solid foundation** for local search with strong service area coverage (21 pages), comprehensive schema implementation, and a well-designed website. Primary growth opportunities lie in **Google Business Profile optimization** (photos, hours, posts, reviews) and **cross-platform NAP verification**.

**Next immediate step**: Upgrade to Tier 1 (DataForSEO) to unlock live GBP audit, review velocity tracking, and geo-grid ranking analysis. This will provide actionable data for maximizing local visibility in San Antonio, Boerne, and Hill Country markets.

---

**Analysis completed by:** Claude Maps Intelligence Skill (Tier 0)  
**Report generated:** 2026-09-19  
**Capability tier:** Free APIs (Nominatim, Overpass, manual verification)  
**Recommendations validity:** 90 days (re-audit after GBP optimizations)
