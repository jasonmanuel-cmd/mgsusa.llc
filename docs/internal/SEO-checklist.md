# MGSUSA.llc — Remaining SEO/GEO/AEO Checklist

This checklist covers the work that cannot be done from the code repo alone. Each item needs either Google Business Profile access, account credentials, or a live-site verification pass. Mark items done as you go.

---

## 1. Google Business Profile (GBP) — Highest Impact

The GBP is the #1 local-pack and map-pack ranking signal. These items need the GBP account login (or a manager invite).

### 1.1 Profile completeness

- [ ] **Business name** matches the site exactly: `Master Glass Solutions` (no keyword stuffing like "Master Glass Solutions - Best Glass in San Antonio")
- [ ] **Primary category** is set to `Glass Company` or `Window Contractor`. Add secondary categories if applicable: `Door Repair Service`, `Storefront Contractor`, `Home Improvement Contractor`
- [ ] **Address**: `4949 N Loop 1604 West, Suite 501, San Antonio, TX 78249` — must match the site's structured data exactly
- [ ] **Service areas** populated: Boerne, San Antonio, Alamo Heights, Leon Valley, Helotes, Converse, Schertz, Comfort, Timberwood Park, Canyon Lake, Wimberley, Blanco, New Braunfels, Seguin, La Vernia, Stockdale, Lakehills, Castroville, Lytle, Natalia, Somerset — add all 21 cities
- [ ] **Phone**: `210-370-3700` — matches site. Enable phone number click-to-call.
- [ ] **Website URL**: `https://www.mgsusa.llc/` — must match; verify it resolves
- [ ] **Hours**: Set to 24/7 for emergency glass repair, or at minimum set standard business hours and note "Emergency services available 24/7" in the description
- [ ] **Description** (750 chars max): Write a tight description that echoes the site's headline and includes key services. Example draft:

  > Master Glass Solutions provides commercial and residential glass installation, fabrication, repair, storefront systems, shower enclosures, mirrors, window replacement, and 24/7 emergency board-up for buildings. Founded 2004. Based in San Antonio, serving Boerne and 21 Hill Country communities. Buildings only — no auto glass or windshields. Call 210-370-3700.

- [ ] **Attributes**: Enable all that apply — `Emergency services`, `Licensed`, `Insured`, `Women-owned` (if applicable), `Veteran-owned` (if applicable), `Free Wi-Fi` (only if true), `Staffed 24/7` if the emergency line is truly staffed

### 1.2 Photos

- [ ] Upload at least 10 photos: logo, exterior/office, team, representative project photos from the site's gallery
- [ ] Use the site's webp assets as the source — they're already optimized
- [ ] Name files descriptively before upload: `master-glass-solutions-san-antonio-storefront.jpg`, `master-glass-solutions-boerne-shower-enclosure.jpg` — filenames are a minor ranking signal

### 1.3 Reviews management

- [ ] **Enable the review link**: `https://search.google.com/local/writereview?placeid=ChIJ...` (get the place ID from the GBP dashboard). Put this link in the site's review page and request-quote thank-you page.
- [ ] **Respond to all existing reviews**: There are 76 reviews with a 4.4 average. Respond to the most recent 20 if not already done — Google favors businesses that actively respond.
- [ ] **Review response template (positive)**: Thank them by name, mention the specific service, mention the city to reinforce local relevance.
- [ ] **Review response template (critical/1-3 star)**: Acknowledge, apologize, offer to take it offline. Do NOT argue publicly.
- [ ] **Set up review request automation**: The `api/review-submit.js` endpoint already exists — verify it sends the Google review link email. Test it with a real submission.

### 1.4 Google Posts

- [ ] Create 1-2 Google Posts per month (service updates, promotions, project completions). Posts expire after 6 months but signal freshness.
- [ ] Post types to use: `Update` (service announcement), `Offer` (seasonal promotion), `Event` (community project)
- [ ] Each post should include a photo, a clear CTA, and a link back to the relevant site page

### 1.5 Q&A

- [ ] Pre-populate 5-10 Q&A pairs on the GBP listing using the most common questions from the FAQ page. Answer each in the business's own voice.
- [ ] Monitor for new user-submitted questions and answer within 24 hours.

---

## 2. Local Citations — Build Consistent NAP Across Directories

Citations (directory listings) are the #2 local ranking signal after GBP. The goal: same business name, address, and phone across every directory.

**NAP to use everywhere:**
- Name: `Master Glass Solutions`
- Address: `4949 N Loop 1604 West, Suite 501, San Antonio, TX 78249`
- Phone: `210-370-3700`
- Website: `https://www.mgsusa.llc/`

### 2.1 Tier 1 — Must have

- [ ] **Google Business Profile** — done (see section 1)
- [ ] **Bing Places** — `bingplaces.com`. Claim or create the listing. Same NAP. Bing powers Yahoo local search too.
- [ ] **Apple Maps** — `businessconnect.apple.com`. Claim the listing. Apple Maps is the default maps app on iOS.
- [ ] **Yelp for Business** — `biz.yelp.com`. Create a business owner account. Claim or create the listing. Upload photos. Respond to reviews. Yelp ranks in local packs.
- [ ] **Better Business Bureau (BBB)** — `bbb.org`. Apply for accreditation if not already accredited. If accredited, verify the profile is complete and up to date. BBB accreditation is a strong trust signal.
- [ ] **Angi (formerly Angie's List)** — `angi.com`. Create a pro account. List the business. Angi appears in Google local results.
- [ ] **HomeAdvisor** — `homeadvisor.com`. Create a pro account. Same NAP. HomeAdvisor is a Google local pack contender.

### 2.2 Tier 2 — Strong local signal

- [ ] **YellowPages** — `yellowpages.com`. Claim the listing if it exists; create if not.
- [ ] **Foursquare** — `foursquare.com`. Claim or create. Foursquare data feeds Apple Maps, Nokia, and others.
- [ ] **Nextdoor** — `nextdoor.com`. Create a business page. Nextdoor is hyper-local and drives neighborhood-level referrals in Hill Country communities.
- [ ] **Manta** — `manta.com`. Create a business profile. Manta appears in local search results.
- [ ] **Local.com** — `local.com`. Claim or create.
- [ ] **Superpages** — `superpages.com`. Claim or create.

### 2.3 Tier 3 — Industry-specific and niche

- [ ] **Glass Association / Industry directories**: Check if the Glass Association of North America (GANA) or Texas Glass Association has a member directory. List if eligible.
- [ ] **Chamber of Commerce**: Boerne Chamber of Commerce, San Antonio Chamber — join and get listed. Chamber memberships are high-authority local citations.
- [ ] **Home Builders Association (HBA)**: If the company works with builders, list with the local HBA (San Antonio HBA, Boerne HBA).
- [ ] **Houzz** — `houzz.com`. Create a pro profile. Houzz is a major platform for residential remodelers and appears in Google results.
- [ ] **BuildZoom** — `buildzoom.com`. Create a profile if licensed. BuildZoom verifies contractor licenses publicly.
- [ ] **Texas SSL / Contractor license lookup**: Verify the license number is visible on the site and on BuildZoom. (The site says "fully licensed and insured" — ensure there's a license number somewhere visible.)

### 2.4 Tier 4 — Social and review platforms

- [ ] **Facebook Business Page** — `facebook.com/masterglasssolutionsusa` (already exists per sameAs in schema). Verify it's claimed, has correct NAP in the About section, and has recent activity.
- [ ] **Instagram** — `instagram.com/masterglasssolutions_/` (already exists). Verify profile bio has the phone number and website link.
- [ ] **LinkedIn** — Create or claim a company page. Link to the website.
- [ ] **TikTok** — Optional, but if there's a presence, ensure NAP consistency.

### 2.5 Citation audit

- [ ] **Search for existing citations**: Run a search for `"Master Glass Solutions" "78249"` and `"Master Glass Solutions San Antonio"` to find existing directory listings you may not know about.
- [ ] **Audit NAP consistency**: For every existing citation found, verify name, address, and phone match exactly. Fix any discrepancies.
- [ ] **Track in a spreadsheet**: Columns: Platform | URL | NAP matches? | Date claimed | Date last updated | Notes

---

## 3. Rich Results Test — Validate Structured Data Against Live Site

These need the deployed site to be live (Vercel deploy must be finished).

### 3.1 Run Google Rich Results Test

Go to: `https://search.google.com/test/rich-results`

For each URL below, paste the live URL and run the test. Capture the screenshot or result.

- [ ] `https://www.mgsusa.llc/` — Should show: `Organization`, `WebSite`, `FAQPage`, `VideoObject`, `Review`, `AggregateRating`
- [ ] `https://www.mgsusa.llc/residential-glass` — Should show: `FAQPage`, `Service`, `HomeAndConstructionBusiness`, `AggregateRating`
- [ ] `https://www.mgsusa.llc/commercial-glass` — Same schema types
- [ ] `https://www.mgsusa.llc/emergency-glass-repair` — Same schema types
- [ ] `https://www.mgsusa.llc/storefront-glass` — Same schema types
- [ ] `https://www.mgsusa.llc/shower-enclosures` — Same schema types
- [ ] `https://www.mgsusa.llc/mirrors` — Same schema types
- [ ] `https://www.mgsusa.llc/window-glass-replacement` — Same schema types
- [ ] `https://www.mgsusa.llc/custom-glass` — Same schema types
- [ ] `https://www.mgsusa.llc/reviews` — Should show: `Review` (multiple), `AggregateRating`
- [ ] `https://www.mgsusa.llc/faq` — Should show: `FAQPage` with speakable
- [ ] `https://www.mgsusa.llc/service-areas` — Should show: `FAQPage` with speakable
- [ ] `https://www.mgsusa.llc/about` — Should show: `FAQPage` with speakable
- [ ] `https://www.mgsusa.llc/quote-process` — Should show: `FAQPage` with speakable
- [ ] `https://www.mgsusa.llc/boerne-tx` — Should show: `Place`, `LocalBusiness`, `Service`, `FAQPage` with speakable
- [ ] `https://www.mgsusa.llc/san-antonio-tx` — Same as above

### 3.2 Fix any failures

- [ ] If any page fails validation, note the error, fix it in the codebase, commit, push, and re-test.
- [ ] Common failure modes: missing required fields, wrong data types, invalid phone format, aggregateRating that doesn't match visible reviews.

### 3.3 Schema.org validator

- [ ] Go to `https://validator.schema.org/` and run the same URLs through it as a secondary check. The Schema.org validator is more permissive than Google's but catches structural issues.

---

## 4. llms.txt Enhancement — Extend GEO/AEO Signals

The `llms.txt` and `llms-full.txt` files already exist at `.well-known/llms.txt` and are referenced in robots.txt. These can be extended further. Edit the files in the repo and push.

### 4.1 Add to llms.txt

- [ ] **Pricing table**: Estimated price ranges for major services (e.g., shower enclosure $800-$2,500+, storefront $1,500-$5,000+, emergency board-up $200-$500+ emergency call-out). AI engines use this for direct answers.
- [ ] **Service area detail**: Add the 21 cities with approximate distance from San Antonio office (e.g., "Boerne — 35 miles north of San Antonio office").
- [ ] **Average response times**: "Same-day for emergencies in San Antonio metro. Next-day for planned quotes. Hill Country projects typically scheduled within 3-5 business days."
- [ ] **License/insurance detail**: If there's a license number, add it: "Texas Glass Contractor License #XXXXX" — this is a trust signal for AI engines.
- [ ] **Insurance coverage note**: "We work with most major homeowner's insurance carriers for storm and damage-related glass replacement."

### 4.2 Add to llms-full.txt

- [ ] **Full service descriptions**: Copy the full service page copy for each of the 8 services into llms-full.txt (it may already be there — check).
- [ ] **Full FAQ content**: Copy the complete FAQ list from faq.html.
- [ ] **Testimonial/Review text**: Include the full review text from reviews.html (already partially there — verify completeness).
- [ ] **Founder bios**: Include the full founder bios from the about page (Adam's PPG background, Linda's role).
- [ ] **Project case studies**: Include 3-5 detailed project descriptions from the gallery.

---

## 5. Content Gaps — Create New SEO Pages

These are new HTML pages to add to the repo. Each targets a specific long-tail keyword that the current site doesn't cover.

### 5.1 Glass types comparison page

- [ ] Create `/glass-types` — Compare tempered, laminated, insulated, low-E, and annealed glass. Target keyword: "types of glass for homes San Antonio" and "tempered vs laminated glass."
- [ ] Include a comparison table.
- [ ] Add FAQPage schema with 4-6 questions.
- [ ] Add HomeAndConstructionBusiness + aggregateRating schema.

### 5.2 Storm damage glass repair page

- [ ] Create `/storm-damage-glass` — Target keyword: "storm damage glass repair San Antonio" and "hail damage window replacement."
- [ ] Include insurance claim guidance (the site mentions insurance — expand on it).
- [ ] Add FAQPage schema.
- [ ] This is seasonally relevant and captures emergency-intent searches.

### 5.3 Commercial glass guide for San Antonio businesses

- [ ] Create `/commercial-glass-guide` — Target keyword: "commercial glass storefront San Antonio" and "storefront glass installation cost."
- [ ] Include storefront types, ADA compliance notes, and cost ranges.
- [ ] Add FAQPage schema.

### 5.4 How to clean and maintain glass surfaces

- [ ] Create `/glass-cleaning-maintenance` — Target keyword: "how to clean shower glass" and "hard water stain removal glass."
- [ ] This is a high-volume informational query that can capture top-of-funnel traffic.
- [ ] Add FAQPage schema.

### 5.5 Hill Country glass challenges (Boerne-specific content)

- [ ] Create `/hill-country-glass` — Target keyword: "glass for Hill Country homes" and "Boerne custom glass."
- [ ] Discuss limestone/concrete construction, wide openings, thermal considerations, and the specific glass needs for Hill Country architecture.
- [ ] This is a strong local differentiation play.
- [ ] Add FAQPage schema.

---

## 6. Post-Deploy Verification

After every push to main, wait for the Vercel deploy to complete (typically 1-2 minutes), then verify.

- [ ] `https://www.mgsusa.llc/` loads without errors
- [ ] `https://www.mgsusa.llc/sitemap.xml` is accessible
- [ ] `https://www.mgsusa.llc/sitemap-images.xml` is accessible
- [ ] `https://www.mgsusa.llc/llms.txt` is accessible
- [ ] `https://www.mgsusa.llc/.well-known/llms.txt` is accessible (same file, different path)
- [ ] Submit sitemap to Google Search Console: `https://search.google.com/search-console` → Sitemaps → add `sitemap.xml` and `sitemap-images.xml`
- [ ] Check Google Search Console for indexing errors after 24-48 hours

---

## 7. Ongoing — Monthly Maintenance

- [ ] **Review new Google reviews** within 48 hours of posting; respond to each.
- [ ] **Check GBP insights**: Track how many views, searches, and actions the listing gets. Look for trends month over month.
- [ ] **Check Search Console** for queries bringing traffic, indexing status, and any manual actions.
- [ ] **Update aggregateRating** in all schema blocks if the review count changes (currently 76 reviews, 4.4 rating — must stay in sync with visible reviews).
- [ ] **Add 1-2 new Google Posts** per month.
- [ ] **Add project photos** from recent jobs — either via the photo pipeline or manually.

---

## Ownership

- Items 1 (GBP) and 2 (citations) — need Google/Bing/Yelp/BBB account access. Owner: the business owner or a designated marketing person.
- Items 3 (Rich Results) — anyone with the live URL can run.
- Items 4 and 5 (llms.txt, new pages) — code changes, same workflow as everything else: edit, commit, push.
- Item 6 (post-deploy) — automated on Vercel; manual verification is a one-time thing per deploy.
