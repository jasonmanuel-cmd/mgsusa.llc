# Before Launch Execution Plan

**Status:** Ready to Execute  
**Priority:** CRITICAL — All items must complete before production deployment  
**Target Completion:** Within 48 hours

---

## 📋 BEFORE LAUNCH CHECKLIST

### 1. CONTENT REVIEW ✅ [IN PROGRESS]

#### 1.1 Remove All Placeholder Notices

**Location 1: Project Showcase Section** (`index.html` line 36)
```html
<small>Concept imagery shown in this prototype. Publish real Master Glass project photography for proof.</small>
```
**Action:** DELETE entirely — replace with real project images or remove placeholder text

**Location 2: Reviews/Proof Section** (`index.html` line 38)
```html
<article>
  <span class="proof-symbol">"</span>
  <p class="placeholder-label">Verified-review module</p>
  <h3>Show real client words, source, and rating.</h3>
  <p>Use only published Google reviews or written permissions. Never fabricate social proof.</p>
</article>
```
**Action:** REPLACE with real verified reviews or hide section entirely

---

#### 1.2 Verify All Text & Contact Info

- [ ] Phone: `210-370-3700` — verified and current
- [ ] Email: `contact@masterglasssolutionsusa.com` — verified and monitored
- [ ] Address: `4949 N Loop 1604 West, Suite 501, San Antonio, TX 78249` — current and correct
- [ ] Spelling & grammar review — proofread all visible text
- [ ] Brand tone consistent throughout — matches voice established in copy
- [ ] No internal placeholder text visible to users

#### 1.3 Image Strategy

**Hero Images:**
- [ ] `Residentialhero.png` — High quality, no watermarks, real Master Glass project
- [ ] `Commercialhero.png` — High quality, no watermarks, real Master Glass project

**Gallery & Project Images:**
- [ ] `Residential1.png` through `Residential5.png` — Real projects or remove
- [ ] `Commercial1.png` — Real project or remove
- [ ] All images optimized (< 300KB each)
- [ ] Images have descriptive alt text
- [ ] Images support responsive loading

---

### 2. TECH REVIEW [READY TO START]

#### 2.1 HTTPS & SSL Certificate
- [ ] **Verify:** Site loads on HTTPS
- [ ] **Check:** SSL certificate valid and not expired
- [ ] **Config:** HTTP redirects to HTTPS
- [ ] **Test:** Browser shows secure padlock icon
- [ ] **Verify:** Certificate auto-renews before expiration

#### 2.2 Security Headers
- [ ] **Set:** `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [ ] **Set:** `X-Content-Type-Options: nosniff`
- [ ] **Set:** `X-Frame-Options: SAMEORIGIN`
- [ ] **Set:** `X-XSS-Protection: 1; mode=block`
- [ ] **Set:** `Content-Security-Policy` (if applicable for your setup)
- [ ] **Verify:** Test with securityheaders.com

#### 2.3 DNS Configuration
- [ ] **Verify:** A record points to correct IP
- [ ] **Verify:** www subdomain CNAME configured
- [ ] **Verify:** MX records correct for email
- [ ] **Verify:** SPF record configured
- [ ] **Verify:** DKIM configured (if using email service)
- [ ] **Test:** `nslookup mgsusa.llc` resolves correctly

#### 2.4 Forms & Email

**Contact Form (`contact.html`):**
- [ ] Form submission endpoint verified
- [ ] Email backend configured (SMTP or service)
- [ ] Confirmation email sent to `contact@masterglasssolutionsusa.com`
- [ ] Thank you page displays after submission
- [ ] No errors in submission logs
- [ ] Spam protection enabled (if available)

**Quote Request Form (`request-quote.html`):**
- [ ] All service options selectable and functional
- [ ] Form validation prevents incomplete submissions
- [ ] Confirmation email with quote details sent
- [ ] Internal notification sent to team
- [ ] CRM integration verified (if applicable)
- [ ] Redirect to thank-you page works
- [ ] Tracking event fires: `mgs:lead-submit`

**Phone CTAs:**
- [ ] All `href="tel:2103703700"` links functional
- [ ] Desktop: Prompts with call or dial pad
- [ ] Mobile: Initiates call directly
- [ ] Tracking event fires: `mgs:call-click`

#### 2.5 Backups

- [ ] Daily automated backups configured
- [ ] Backups stored off-site (not on same server)
- [ ] Backup retention: minimum 30 days
- [ ] Backup restoration tested at least once
- [ ] Disaster recovery plan documented

---

### 3. PERFORMANCE AUDIT [READY TO START]

**Run Lighthouse Audit** on all main pages:

**Homepage (`index.html`):
- [ ] Performance: ≥ 90
- [ ] Accessibility: ≥ 95
- [ ] Best Practices: ≥ 90
- [ ] SEO: ≥ 95

**Service Pages** (sample 3-4 pages):
- [ ] `residential-glass.html` — all metrics ≥ 90
- [ ] `commercial-glass.html` — all metrics ≥ 90
- [ ] `emergency-glass-repair.html` — all metrics ≥ 90

**Core Web Vitals Targets:**
- [ ] **LCP** (Largest Contentful Paint): < 2.5 seconds
- [ ] **FID** (First Input Delay): < 100 milliseconds
- [ ] **CLS** (Cumulative Layout Shift): < 0.1
- [ ] **TTFB** (Time to First Byte): < 600ms

**Optimization Checklist:**
- [ ] Images optimized and lazy-loaded
- [ ] CSS minified
- [ ] JavaScript minified and deferred
- [ ] Unused CSS removed
- [ ] Font loading optimized (`font-display: swap`)
- [ ] No render-blocking resources above the fold
- [ ] Caching headers configured
- [ ] Gzip compression enabled

---

### 4. ACCESSIBILITY AUDIT [READY TO START]

**WCAG 2.1 AA Compliance Required**

#### 4.1 Color Contrast
- [ ] Body text (#0a0a0a on #ffffff): 14.9:1 ✅ (requires 4.5:1)
- [ ] All text: ≥ 4.5:1 contrast ratio
- [ ] UI components: ≥ 3:1 contrast ratio
- [ ] Verified with WebAIM contrast checker

#### 4.2 Keyboard Navigation
- [ ] Tab order logical (header → nav → hero → sections → footer)
- [ ] All interactive elements focusable
- [ ] Focus indicator visible (outline, underline, or custom)
- [ ] No keyboard traps (can escape modals, menus)
- [ ] Skip link functional: `<a class="skip-link" href="#main">`

#### 4.3 Form Labels & Inputs
- [ ] All inputs have associated `<label>` elements
- [ ] Error messages describe the problem clearly
- [ ] Required fields marked and visually indicated
- [ ] Phone field: `type="tel"` for mobile keyboards
- [ ] Placeholder text is not a substitute for labels

#### 4.4 Touch Targets
- [ ] All buttons: ≥ 44×44 CSS pixels
- [ ] All links: ≥ 44×44 CSS pixels
- [ ] Spacing adequate (minimum 8px between targets)

#### 4.5 Semantic HTML
- [ ] `<header>`, `<nav>`, `<main>`, `<footer>` in place ✅
- [ ] Heading hierarchy logical (h1 → h2 → h3, no skips)
- [ ] Alt text: Meaningful images have descriptive alt
- [ ] Lists use `<ul>`, `<ol>`, `<li>`
- [ ] Images that are decorative have `aria-hidden="true"`

#### 4.6 Animation & Motion
- [ ] Brand reveal respects `prefers-reduced-motion` ✅
- [ ] Animations don't auto-start or distract
- [ ] No flashing content (> 3 flashes per second)
- [ ] No auto-playing video/audio without controls

#### 4.7 Screen Reader Testing
- [ ] Test with NVDA (Windows) or VoiceOver (Mac)
- [ ] All page sections announced correctly
- [ ] Forms announced with proper labels
- [ ] Links have meaningful text (not "click here")
- [ ] CTA buttons properly announced

---

### 5. SEO & METADATA [READY TO START]

#### 5.1 On-Page Optimization

**Homepage (`index.html`):** ✅
- ✅ Title: "Master Glass Solutions | Commercial & Residential Glass in Boerne & San Antonio, TX"
- ✅ Meta Description: "Premium commercial and residential glass installation..."
- ✅ Canonical URL: `https://www.mgsusa.llc/`

**All Other Pages:** 
- [ ] Each page has unique title tag
- [ ] Each page has unique meta description
- [ ] Canonical URLs set on all pages
- [ ] Meta descriptions are 150-160 characters
- [ ] Include primary keyword and CTA in meta

#### 5.2 Schema Markup

- [ ] **Verify:** Schema.org markup valid (use Google Rich Results Test)
- [ ] **Check:** LocalBusiness schema complete
- [ ] **Check:** FAQPage schema has all Q&A pairs
- [ ] **Verify:** Phone, address, hours in schema
- [ ] **Check:** Logo URL correct in schema

#### 5.3 Robots & Sitemap

- [ ] **robots.txt:** Exists at `/robots.txt`
- [ ] **robots.txt:** Allows googlebot and bingbot
- [ ] **robots.txt:** Disallows staging/test directories
- [ ] **robots.txt:** Specifies sitemap location
- [ ] **sitemap.xml:** Exists at `/sitemap.xml`
- [ ] **sitemap.xml:** Includes all public pages
- [ ] **sitemap.xml:** URLs have lastmod and priority
- [ ] **Submitted:** Sitemap added to Google Search Console

#### 5.4 Open Graph & Social

- [ ] `og:title` set (same as page title)
- [ ] `og:description` set (same as meta description)
- [ ] `og:image` points to real image (1200x630px recommended)
- [ ] `og:url` is canonical URL
- [ ] `og:type` correct (website, article, etc.)
- [ ] Twitter card tags configured (if using Twitter)

#### 5.5 Analytics & Verification

- [ ] Google Search Console: Add domain property
- [ ] Google Search Console: Submit sitemap
- [ ] Google Analytics 4: Tracking code installed
- [ ] Google Analytics 4: Test tracking events firing
- [ ] Verify: Conversion tracking configured

---

### 6. MONITORING & ALERTS [READY TO CONFIGURE]

#### 6.1 Uptime Monitoring
- [ ] Service configured: Pingdom, UptimeRobot, or equivalent
- [ ] Alert threshold: Notify if down > 5 minutes
- [ ] Recipients: Add team contact emails
- [ ] Status page: Public or internal (as preferred)

#### 6.2 Error Tracking
- [ ] Service: Sentry, Rollbar, or similar
- [ ] JavaScript errors captured
- [ ] Alert on critical errors
- [ ] Error logs reviewed daily

#### 6.3 Form Submission Alerts
- [ ] Contact form: Email alert to team
- [ ] Quote request form: Email alert to team
- [ ] Phone CTA clicks: Tracked (optional but recommended)
- [ ] Thank you page: Confirmation viewed

#### 6.4 Performance Monitoring
- [ ] Core Web Vitals: Monitor continuously
- [ ] Alert: If LCP > 3 seconds
- [ ] Alert: If CLS > 0.25
- [ ] Alert: If FID > 300ms

---

## 🛠️ RECOMMENDED SKILLS TO USE

Based on the tasks above, here are the most valuable skills to accelerate completion:

### TIER 1: HIGHLY RECOMMENDED (Use immediately)

**1. `accessibility-review` ⭐⭐⭐⭐⭐**
- **Why:** Comprehensive WCAG 2.1 AA audit
- **Task:** Run on homepage + 3 service pages
- **Time Saved:** 2-3 hours of manual testing
- **Output:** Structured accessibility findings with fixes

**2. `web-quality-audit` ⭐⭐⭐⭐⭐**
- **Why:** Tests performance, accessibility, SEO, best practices all at once
- **Task:** Run on homepage
- **Time Saved:** 1-2 hours of manual checks
- **Output:** Comprehensive audit report with Lighthouse scores

**3. `seo-audit` ⭐⭐⭐⭐**
- **Why:** Full SEO scan, keyword analysis, on-page optimization
- **Task:** Run for homepage and key service pages
- **Time Saved:** 1-2 hours of manual SEO verification
- **Output:** Actionable SEO recommendations

**4. `browser-qa` ⭐⭐⭐⭐**
- **Why:** Automated cross-browser testing with screenshots
- **Task:** Run on homepage and critical pages
- **Time Saved:** 1-2 hours of manual browser testing
- **Output:** Visual regression detection, console errors, Core Web Vitals

**5. `security-review` ⭐⭐⭐⭐**
- **Why:** Comprehensive security checklist (HTTPS, headers, secrets, forms)
- **Task:** Run before deployment
- **Time Saved:** 1-2 hours of manual security verification
- **Output:** Security findings and remediation checklist

### TIER 2: VERY HELPFUL (Use if time permits)

**6. `design-review` ⭐⭐⭐**
- **Why:** Visual QA - checks consistency, contrast, hierarchy, spacing
- **Task:** Run on live site for polish pass
- **Time Saved:** 30-60 minutes of visual inspection
- **Output:** Design inconsistencies and fixes

**7. `web-perf` ⭐⭐⭐**
- **Why:** Deep performance analysis with Chrome DevTools integration
- **Task:** Diagnose why Core Web Vitals might be slow
- **Time Saved:** 1-2 hours troubleshooting performance issues
- **Output:** Specific performance bottlenecks with solutions

**8. `deploy-checklist` ⭐⭐**
- **Why:** Structured pre-deployment verification
- **Task:** Final verification 24 hours before launch
- **Time Saved:** 30 minutes of mental checklist review
- **Output:** Confirmation all items verified before going live

---

## 📊 EXECUTION PLAN

### Phase 1: Content & Design (2-4 hours)
```
1. Replace placeholder project images (or remove placeholders) — 1-2 hours
2. Populate reviews section with verified client feedback — 1-2 hours
3. Proofread all text for grammar/spelling — 30 minutes
4. Verify contact information — 15 minutes
```

### Phase 2: Technical Verification (3-5 hours)
```
1. Run security-review skill — 30 minutes
2. Configure SSL/HTTPS and security headers — 30 minutes
3. Verify DNS records — 30 minutes
4. Test all forms and email notifications — 1 hour
5. Configure backups — 30 minutes
6. Verify tracking events fire correctly — 1 hour
```

### Phase 3: Quality Assurance (4-6 hours)
```
1. Run web-quality-audit skill — 30 minutes
2. Run accessibility-review skill — 45 minutes
3. Run browser-qa skill — 30 minutes
4. Run seo-audit skill — 45 minutes
5. Run web-perf for performance diagnostics — 45 minutes
6. Manual cross-browser testing on real devices — 1-2 hours
```

### Phase 4: Final Checks (1-2 hours)
```
1. Run deploy-checklist — 30 minutes
2. Configure monitoring/alerts — 30 minutes
3. Final stakeholder review — 30 minutes
4. Ready for deployment ✅
```

---

## 📅 TIMELINE

**If running all skills in order:**
- Phase 1: Today (2-4 hours)
- Phase 2: Today (3-5 hours)
- Phase 3: Tomorrow morning (4-6 hours)
- Phase 4: Tomorrow afternoon (1-2 hours)

**Total:** ~10-17 hours of execution over 1.5 days

**Target Launch:** Tomorrow evening (48 hours from start)

---

## ✅ SIGN-OFF CHECKLIST

Before marking "Ready for Production":

```
CONTENT:
  ☐ All placeholder images replaced with real Master Glass projects
  ☐ Reviews section has verified client feedback (Google/Trustpilot)
  ☐ All placeholder text removed
  ☐ Phone, email, address verified
  ☐ Spelling and grammar check complete

SECURITY:
  ☐ HTTPS enforced
  ☐ SSL certificate valid
  ☐ Security headers configured
  ☐ No credentials in frontend code
  ☐ Forms validated and secure

PERFORMANCE:
  ☐ Lighthouse ≥ 90 on all metrics
  ☐ Core Web Vitals passing
  ☐ Mobile load time < 3s
  ☐ Desktop load time < 1.5s

ACCESSIBILITY:
  ☐ WCAG 2.1 AA compliant
  ☐ Color contrast verified
  ☐ Keyboard navigation works
  ☐ Touch targets adequate
  ☐ Screen reader tested

SEO:
  ☐ Sitemap submitted
  ☐ Schema markup valid
  ☐ Meta tags unique on all pages
  ☐ robots.txt configured
  ☐ Analytics installed

FORMS:
  ☐ Contact form works
  ☐ Quote request form works
  ☐ Email notifications working
  ☐ Tracking events firing
  ☐ Thank you pages display

MONITORING:
  ☐ Uptime monitoring active
  ☐ Error tracking active
  ☐ Form submission alerts configured
  ☐ Performance alerts configured

FINAL:
  ☐ All items above checked
  ☐ Stakeholder approval received
  ☐ Deployment plan ready
  ☐ Team briefed
  ☐ 🚀 READY TO LAUNCH!
```

---

**Next Step:** Start with Phase 1 (Content & Design) immediately. Use skills in Phase 3 to accelerate QA.

**Estimated Completion:** Tomorrow evening ✅
