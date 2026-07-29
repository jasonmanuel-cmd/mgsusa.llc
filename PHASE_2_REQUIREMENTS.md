# MGSUSA.LLC — PHASE 2 REQUIREMENTS
**Wednesday, July 29, 2026**

---

## THREE NEW IMPLEMENTATION TASKS (For Tomorrow)

### TASK 1: HERO VIDEO AS SPLASH PAGE (10 SEC INTRO)

**CURRENT STATE:**
- Video hero is inline on main page
- Loads automatically, no pause/skip

**NEW DESIGN:**
✅ Create full-screen splash page overlay (10 seconds)
✅ Video plays automatically on site load
✅ After 10 sec, splash fades → reveals main page
✅ Optional: Add skip button ("Enter Site" CTA)
✅ Optional: Mute button on splash

**TECHNICAL:**
- Use `<video>` element with autoplay + muted
- CSS overlay (position: fixed, z-index: 9999)
- Fade transition after 10s (or on skip click)
- Ensure mobile responsive (landscape/portrait)
- No audio on splash (muted)

**FILE LOCATION:**
- `splash.html` (new) OR inline in `index.html`
- Add `splash.css` for styling
- Add `splash.js` for 10-sec timer + fade logic

**PRIORITY:** HIGH (First impression)

---

### TASK 2: FOOTER REDESIGN (VERTICAL → HORIZONTAL)

**CURRENT STATE:**
- Footer is tall/vertical stack
- Information organized top-to-bottom

**NEW DESIGN:**
✅ Convert to horizontal layout (left-to-right)
✅ All footer info in single row across bottom
✅ Reduce footer height significantly
✅ Compress all sections into compact format

**LAYOUT EXAMPLE:**
```
┌────────────────────────────────────────────────────────────┐
│ Logo | Contact | Hours | Social | Privacy | © Year        │
└────────────────────────────────────────────────────────────┘
```

**SECTIONS TO INCLUDE:**
- Logo (left)
- Quick links (Contact, Hours, About)
- Social media icons (LinkedIn, Facebook, etc.)
- Privacy/Legal (right)
- Copyright year (right)

**TECHNICAL:**
- Use flexbox (display: flex; flex-direction: row)
- Responsive: Stack on mobile (flex-wrap: wrap)
- Max-height: ~60-80px
- Padding: Minimal
- Font size: Slightly smaller for fit

**FILE LOCATION:**
- Update `footer.html` (or inline in `index.html`)
- Update `footer.css` with horizontal flex styles

**PRIORITY:** HIGH (Visual polish + navigation)

---

### TASK 3: FLOATING LOGO BACKGROUND (WATERMARK PATTERN)

**CURRENT STATE:**
- No background logo
- Clean white/solid background

**NEW DESIGN:**
✅ Master Glass Solutions logo placed periodically in background
✅ Logo floats/appears throughout entire page
✅ Watermark style (low opacity, behind content)
✅ Multiple instances across page (not just footer)

**PLACEMENT STRATEGY:**
- Grid pattern: logos at intervals (e.g., every 400px)
- Random opacity (0.03–0.08) for subtle effect
- Positioned behind main content (z-index: low)
- Rotate logos slightly (±5–10deg) for variety
- Responsive: Adjust spacing on mobile/tablet

**TECHNICAL OPTIONS:**
- a) CSS background-image (repeating-linear-gradient pattern)
- b) JavaScript: Insert `<img>` elements at intervals
- c) SVG pattern (`<pattern>` element)

**RECOMMENDED:** CSS background-image (most performant)

**EXAMPLE CSS:**
```css
body {
  background-image: url('logo.svg');
  background-repeat: repeat;
  background-size: 200px 200px;
  background-attachment: fixed;
  opacity: 0.05;
}
```

**FILE LOCATION:**
- Add to `main.css` (body background)
- May need to adjust z-index on content sections
- Test on all pages for consistency

**PRIORITY:** MEDIUM (Brand reinforcement + visual depth)

---

## OWNER INFORMATION CHECKLIST (To Gather Tomorrow from Linda & Adam)

### TIER 1 CONTENT (CRITICAL - This Week)

**TEAM PHOTOS**
- [ ] 2 professional headshots (Linda + Adam)
- [ ] Format: JPG, 300x300px minimum
- [ ] Style: Professional/approachable (not overly formal)
- [ ] Use: Team section + About page

**CUSTOMER TESTIMONIALS**
- [ ] 2-5 real customer quotes (names + optional photos)
- [ ] Format: Short (1-2 sentences)
- [ ] Example: "Jason's team fixed our emergency window in 2 hours. Highly recommend!"
- [ ] Use: Homepage + Testimonials page

**PROJECT PHOTOS (Before/After)**
- [ ] 3-5 high-quality project images
- [ ] Format: JPG, 1200x800px minimum
- [ ] Style: Clear before/after pairs preferred
- [ ] Use: Portfolio/Projects section

**TEAM BIOS**
- [ ] 2-3 sentence bios (Linda + Adam)
- [ ] Include: Years in business, specialty, personal touch
- [ ] Example: "Adam has 15+ years of glass expertise. When not installing frames, he's..."
- [ ] Use: Team page

**IMPACT:** +20-30% conversion rate improvement

---

### TIER 2 CONTENT (IMPORTANT - Next 1-2 Weeks)

**SERVICE DETAILS**
- [ ] What's included in each service
- [ ] Timeline/turnaround (e.g., "2-hour emergency response")
- [ ] Pricing framework (or "call for quote")
- [ ] Warranty info

**EMERGENCY REPAIR PROCESS**
- [ ] Step-by-step: Call → Assess → Quote → Install
- [ ] Response time guarantee
- [ ] Available hours (24/7? Business hours?)

**CERTIFICATIONS & LICENSES**
- [ ] List all relevant certifications
- [ ] License numbers (if public)
- [ ] Insurance info (if relevant to display)

**CUSTOMER FAQs**
- [ ] 5-10 common questions + answers
- [ ] Examples: "Do you work on weekends?", "What's your warranty?", "Emergency response time?"

**IMPACT:** +8-12% SEO ranking improvement

---

### TIER 3 CONTENT (NICE-TO-HAVE - Weeks 2-4)

**VIDEO TESTIMONIALS**
- [ ] 2-3 customer testimonials (30-60 sec each)
- [ ] Mobile phone video OK (vertical format)
- [ ] Format: MP4, uploaded to YouTube then embedded

**COMPANY ORIGIN STORY**
- [ ] "How Master Glass Solutions started"
- [ ] Paragraph or short article (200-300 words)
- [ ] Personal touch (why glass, mission, founding story)

**LINKEDIN COMPANY PAGE**
- [ ] See LINKEDIN_COMPANY_PAGE_SETUP.md for details
- [ ] Logo, banner, company description, industry tags

**VIDEO INTRO SCRIPT**
- [ ] 30-sec intro for social media
- [ ] "Hi, I'm Adam/Linda, and here's what we do..."

**IMPACT:** +25-50% engagement improvement

---

## SUMMARY FOR TOMORROW

| IMPLEMENT | GATHER FROM LINDA & ADAM |
|-----------|--------------------------|
| 1. Hero video splash | 1. Team photos (2) |
| 2. Horizontal footer | 2. Testimonials (2-5) |
| 3. Floating logo bg | 3. Project photos (3-5) |
| | 4. Team bios (2) |
| | 5. Service details |
| | 6. Emergency process |
| | 7. FAQs |
| | 8. Certifications |

---

**STATUS:** Ready for Phase 2 implementation once content arrives.
