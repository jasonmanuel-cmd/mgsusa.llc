# Google Business Profile — paste-in kit

Everything here is ready to paste into the GBP dashboard. Copy from the site's
own content and structured data, not invented, so the profile and the website
agree — which is the point of the exercise.

**Drafted 2026-10-06. Revised 2026-10-12** — the three window-film services
were added to the site and to section 4, and the hours guidance in section 1
now records that the site's own structured data contradicts itself about them.

Work top to bottom; sections are in order of impact.

---

## 0. The one thing to get right first

**Primary category.** It is the single strongest ranking factor in the map
pack, more than the description, the photos or the posts. Everything else on
this page is worth less than getting this one field right.

| Field | Value |
|---|---|
| **Primary category** | `Glass repair service` |
| Secondary | `Glass & mirror shop` |
| Secondary | `Window installation service` |
| Secondary | `Shower door shop` |
| Secondary | `Contractor` |

Why `Glass repair service` over `Glass & mirror shop`: repair and emergency
work is the highest-intent search this business can win. Someone typing "glass
repair near me" at 9pm with a broken storefront is a job today; someone
browsing mirrors is a job next month. Lead with the urgent one.

> **Do not add any auto glass category.** Not `Auto glass shop`, not
> `Windshield repair`. The site says plainly: no windshields, no car windows,
> no vehicle glass, buildings only. An auto category would fill the phone with
> calls that can never be served, waste the team's time, and earn one-star
> reviews from people who were never customers.

---

## 1. Core fields

| Field | Exact value |
|---|---|
| Business name | `Master Glass Solutions` |
| Phone | `210-370-3700` |
| Website | `https://www.mgsusa.llc/` |
| Address | `4949 N Loop 1604 W Bldg 5 Suite 501, San Antonio, TX 78249` |

Type the name exactly as above. No "— Best Glass in San Antonio", no city
appended. Keyword-stuffed names are a suspension risk and are reported by
competitors routinely.

### Hours — set **Open 24 hours**

Confirmed by the owner on 2026-10-12 that 210-370-3700 is genuinely answered
around the clock, so "Open 24 hours" is honest and is what the profile should
say. That is a real competitive advantage in this trade and it should not be
hidden behind an office-hours schedule: a storefront that goes in at 9pm is
searching then, not at 9am.

This matters because Google shows an "Open now" badge against whatever is set.
Set 24 hours when nobody answers and a 3am caller gets voicemail and leaves a
one-star review. Set office hours when somebody does answer and an emergency
caller at 9pm is told the business is shut. The first mistake is louder; the
second is the one that quietly loses the job.

The site used to disagree with itself here — `index.html` and `about.html`
declared Mon–Fri 08:00–17:00 plus a Saturday morning while the other 52 pages
declared 00:00–23:59 under the same business `@id`. Fixed 2026-10-12 by
`tools/fix_hours_conflict.py`; all 75 structured-data blocks now carry the same
declaration, so the profile and the site agree. If the hours ever genuinely
change, run that script's verification pass afterwards — it reports how many
distinct declarations exist, and the answer should always be one.

---

## 2. Description (750 character limit)

Paste as-is — this is **747 characters** against the 750 limit, counted, not
estimated. There is almost no slack, so if you edit it, re-count before
pasting; GBP truncates silently rather than refusing.

```
Master Glass Solutions is an architectural glass contractor in San Antonio, serving the city, Boerne and the surrounding Hill Country since 2004. We work on buildings only: storefronts and commercial glazing, window glass replacement, shower enclosures, mirrors, glass railings, partitions and custom glass fabrication. We also install commercial window film - solar control tint, security film and perforated window graphics.

Emergency glass support runs 24/7, including weekends and holidays. If a storefront, door or window is broken, call 210-370-3700 and the crew can board up the opening the same day and return with replacement glass.

We do not service auto glass, windshields or any vehicle glass.

Call 210-370-3700 for a free estimate.
```

Three deliberate choices. The last line before the phone number rules out auto
glass, because that is the most common wrong call a glass company gets and
every one costs somebody's time — and it matters more now that the profile
lists window tint. "Since 2004" is in the first sentence; longevity is the
cheapest trust signal available and this business has it. And the film services
get one clause rather than a paragraph: they are new and worth naming, but the
glazing work is what the business is known for and what most searches are for.

Note the hyphen in "window film - solar control tint" is a plain hyphen, not an
em dash. Pasting typographic punctuation into GBP fields is a reliable way to
get mojibake in the rendered profile.

---

## 3. Service areas — the nearest 20, not all 28

**Revised 2026-10-25.** This section used to say "add all 21" and list the 21
city pages that existed then. Two things are wrong with that now.

**Google caps a profile at 20 service areas.** So "all of them" was never an
instruction that could be followed — it was already one over the cap when it
was written, and the site now has 28 city pages. Something has to be left out,
and choosing deliberately beats letting Google's "suggested updates" choose.
(The cap is widely reported rather than documented by Google; the dashboard
settles it the moment you try to add a 21st.)

**A service area and a city page are different instruments.** The profile's
areas feed the map pack. A city page ranks organically on its own and does not
need the profile to claim its town. So dropping Stockdale from the profile
does not delete `/stockdale-tx` or cost it anything — the page keeps working.
**Do not delete pages to match this list.**

### Paste these 20

```
San Antonio, Stone Oak, Alamo Heights, Leon Valley, Helotes, Timberwood Park,
Live Oak, Alamo Ranch, Converse, Bulverde, Selma, Fair Oaks Ranch,
Garden Ridge, Schertz, Boerne, Somerset, Lakehills, Castroville,
New Braunfels, Canyon Lake
```

That is the 20 nearest towns to the office, every one of which has a page
behind it. Straight-line distance from `4949 N Loop 1604 W`, computed from each
page's own `Place` geo:

| | mi | | mi | | mi | | mi |
|---|---|---|---|---|---|---|---|
| Stone Oak | 5.5 | Live Oak | 11.8 | Selma | 13.7 | Boerne | 20.1 |
| Alamo Heights | 6.5 | Alamo Ranch | 12.7 | Fair Oaks Ranch | 14.1 | Somerset | 24.3 |
| Leon Valley | 6.7 | Converse | 13.3 | Garden Ridge | 14.7 | Lakehills | 24.9 |
| Helotes | 9.5 | Bulverde | 13.5 | Schertz | 15.8 | Castroville | 25.2 |
| San Antonio | 9.7 | Timberwood Park | 9.8 | | | New Braunfels | 26.4 |
| | | | | | | Canyon Lake | 27.1 |

### The eight left off, and why

Lytle 27.7 · La Vernia 28.9 · Natalia 32.4 · Seguin 34.1 · Comfort 36.0 ·
Blanco 37.7 · Wimberley 39.9 · Stockdale 41.1

All of them are further out than everything on the list, and the cut has to
fall somewhere. Stockdale is 41 miles away with under 1,500 people; Stone Oak
is 5.5 miles away, dense and affluent, and until this month had no page at all.
That asymmetry is the whole reason the page set was rebuilt — see CLAUDE.md.
Their pages stay live and keep ranking organically.

### Keeping the three lists in step

The city pages, `service-areas.html` and this list are three separate things
and only the first two are automatic. If a town is added, add a page **and**
decide whether it displaces one of the 20 here. The site may list more towns
than the profile does; that is fine and expected now that there is a cap.

---

## 4. Services

GBP lets you list services under each category. Add these; each one is a
separate chance to match a query. Descriptions are optional but worth adding
for the top five.

| Service | Short description |
|---|---|
| Emergency glass repair | 24/7 board-up and glass replacement for broken storefronts, doors and windows. |
| Storefront glass | Retail and office frontage, repaired or replaced, including entry doors. |
| Window glass replacement | Single panes through full window glass replacement for homes and buildings. |
| Shower enclosures | Frameless and semi-frameless, measured on site and fitted to the opening. |
| Mirrors | Wall mirrors, vanity mirrors and custom-cut mirror to size. |
| Commercial glazing | Partitions, architectural glazing and tenant improvement glass. |
| Glass railings | Interior and exterior glass rail systems. |
| Custom glass fabrication | Table tops, shelving and one-off cuts templated on site. |
| Insulated glass units | Failed or fogged double-glazing replaced. |
| Storm damage glass | Hail and storm damage, with insurance documentation. |
| **Commercial window tinting** | Solar control film that cuts heat and glare on building glass. Buildings only. |
| **Security window film** | Safety and security film for fragment retention and forced-entry delay. |
| **Perforated window graphics** | One-way vision printed film for storefront glass. |

> **The three film services were added to the site on 2026-10-10** and are live
> at `/commercial-window-tint`, `/commercial-security-film` and
> `/perforated-window-graphics`. They are listed here so the profile and the
> site agree, which is the whole point of this document.
>
> **Window tint still takes no auto category.** It is the single most likely of
> the thirteen to pull auto-glass searches, and adding `Auto glass shop` to
> catch them would fill the phone with work that can never be served. The
> website's tint page answers "Do you tint car windows?" with a flat no in its
> first FAQ; keep the profile saying the same thing.

---

## 5. Q&A — pre-populate all ten

You can ask and answer your own questions on GBP, and should. Post each
question from a personal Google account, then answer from the business
account. Unanswered customer questions are a visible gap; pre-filled ones
control the ground.

Answers below are condensed from the site's own FAQ so the two never disagree.

**Q: Do you repair auto glass or windshields?**
> No. Master Glass Solutions is an architectural glass contractor and works on
> buildings only — homes and commercial properties. We do not repair or replace
> windshields, car windows, side mirrors or any vehicle glass, and we do not
> offer mobile auto glass service.

**Q: Do you offer emergency glass repair?**
> Yes, 24/7, including weekends and holidays. Call 210-370-3700. We can board
> up the opening the same day and return with replacement glass once it is cut.

**Q: What do I do if my glass just broke?**
> Call 210-370-3700 straight away rather than using the website form. We will
> ask about the opening size, the safety or security concern, and whether you
> need a temporary board-up tonight or a permanent repair.

**Q: How much does glass replacement cost?**
> It varies by type, size and complexity. Residential window panes typically
> run $150–$500. Commercial storefronts run $500–$2,000 and up. Call
> 210-370-3700 for a free estimate on your specific opening.

**Q: Do you work weekends?**
> Emergency work, yes — 24/7 including holidays. We have replaced a storefront
> door on a Sunday. Planned work like shower enclosures and commercial glazing
> is scheduled during the week; call early with photos and rough dimensions,
> since fabrication lead time depends on the glass and hardware.

**Q: What areas do you serve?**
> San Antonio, Boerne and the surrounding Hill Country, including Schertz,
> Converse, Helotes, Leon Valley, Alamo Heights, New Braunfels, Seguin, Canyon
> Lake, Wimberley, Blanco, Comfort and more. Call 210-370-3700 to confirm your
> location.

**Q: How long does a glass installation take?**
> A simple window or mirror is often a few hours. Custom shower enclosures and
> storefronts usually take one to three days once the glass is fabricated.

**Q: Do you do both homes and businesses?**
> Both. Residential work includes shower enclosures, mirrors, window glass and
> railings. Commercial work includes storefronts, entry doors, partitions and
> architectural glazing.

**Q: Can you replace just the glass, or do I need a whole new window?**
> In most cases just the glass. If the frame and hardware are sound, replacing
> the pane or the insulated unit is faster and cheaper than a full window.
> Call 210-370-3700 and we will tell you which applies.

**Q: How do I get an estimate?**
> Call 210-370-3700, or use the quote form at https://www.mgsusa.llc. Photos
> and rough measurements make the first conversation far more useful. If the
> glass is already broken and safety is a concern, call rather than using the
> form.

---

## 6. Photos

Ten minimum, and GBP photo views correlate with calls more than most owners
expect. The site's optimised images are the source — `assets/` has them.

Rename before uploading; the filename is a small signal and costs nothing:

```
master-glass-solutions-san-antonio-storefront.jpg
master-glass-solutions-san-antonio-office.jpg
master-glass-solutions-commercial-glazing-san-antonio.jpg
master-glass-solutions-frameless-shower-enclosure.jpg
master-glass-solutions-emergency-board-up.jpg
master-glass-solutions-glass-railing.jpg
master-glass-solutions-custom-mirror.jpg
master-glass-solutions-window-glass-replacement.jpg
```

Good sources already in the repo: `Homehero`, `Commercial1`–`Commercial5`,
`Residential6`/`Residential8`, `Emergency1`–`Emergency4`, `insidemgs` (the
office interior, good for the "team"/"interior" slot).

Set the **logo** and a **cover photo**. The cover is what shows in the map pack.

---

## 7. Posts — first month

One to two a month is enough. Each needs a photo, a short body and a button.
These are written for October–November; adjust the season when reusing.

**Post 1 — Update · button: Call now**
> Storm season damage? We replace hail- and wind-damaged glass for homes and
> businesses across San Antonio and the Hill Country, and we can board up a
> broken opening the same day. Insurance documentation provided.
> 📞 210-370-3700

**Post 2 — Update · button: Learn more → https://www.mgsusa.llc/storefront-glass**
> Holiday retail season starts now. A cracked or cloudy storefront is the first
> thing a customer sees. We repair and replace storefront glass and entry doors
> across San Antonio — most jobs scheduled within the week.

**Post 3 — Update · button: Learn more → https://www.mgsusa.llc/shower-enclosures**
> Planning a bathroom remodel? Frameless shower enclosures are measured on site
> and fitted to the opening you actually have, not a stock size. Call
> 210-370-3700 to talk through the configuration before you order the tile.

**Post 4 — Update · button: Call now**
> Broken glass does not keep business hours. Our emergency line runs 24/7,
> including weekends and holidays — we have replaced a storefront door on a
> Sunday. 📞 210-370-3700

**Post 5 — Update · button: Learn more → https://www.mgsusa.llc/commercial-window-tint**
> New: commercial window film. Solar control film cuts the heat and glare
> coming through the glass a building already has — no reglazing, no shutdown.
> We also install security film for fragment retention and forced-entry delay,
> and perforated one-way vision graphics for storefronts. Commercial buildings
> only; we do not film vehicle glass.

---

## 8. Reviews

**5 reviews averaging 5.0** (corrected 2026-10-20 — this section said "76
reviews at 4.4" until then, a number that was in the site's `aggregateRating`
on 54 pages and matched nothing on the profile). Five perfect reviews is a
thin but clean base, and the thing most likely to move the map pack is simply
having more of them. It also raises the stakes on everything else in this
document: at five reviews, one angry customer is 17% of the rating, which is
why no service gets advertised here that the company does not perform.

Two actions:

1. **Respond to the recent ones.** Thank by name, name the service, name the
   city — "Thanks David — glad the storefront in Schertz came out well."
   That last part puts the city and service next to the review, which is
   exactly the association you want. Respond to criticism calmly and offer to
   take it offline; never argue.

2. **Ask every finished job.** The direct review link is already in the code
   (`api/review-submit.js`):
   ```
   https://g.page/r/CZoDFY2uA41TEAI/review
   ```
   That opens the review box directly. The Follow-Up Desk already has the
   machinery to send it after a job.

Recency counts, not just the total. Twenty reviews this quarter beats eighty
from three years ago.

---

## 9. Order to do this in

1. Primary category — five minutes, biggest effect
2. Name, phone, website, address exactly as above
3. Description
4. 21 service areas
5. Photos, logo, cover
6. Services list
7. Ten Q&A pairs
8. First post
9. Start asking every finished job for a review

Steps 1–4 are most of the value and take under half an hour.

---

## What this will not do

It will not show up next week. GBP changes typically take two to six weeks to
settle in the map pack, and review velocity compounds over months. The site had
104 visitors in the week this was written; the map pack is where a local glass
company's calls actually come from, which is why this comes before more pages.
