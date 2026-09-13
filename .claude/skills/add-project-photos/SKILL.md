---
name: add-project-photos
description: Run the full pipeline for putting project photos onto the mgsusa.llc site — vet, dedupe, convert to WebP at budget, name, caption, wire into the slideshows and galleries, bump the service worker, verify. Use this whenever someone adds, replaces, or uploads pictures for this site, whether they say "add these photos", "put these on the site", "replace that picture", "new project pics", "I uploaded a folder", or just drops image files into the repo. Also use it when only touching image markup — srcset, sizes, thumbnails, gallery tiles, slideshow slides — because the ordering and cache rules here are what keep those changes from silently shipping broken.
---

# Adding project photos to mgsusa.llc

Photos arrive as a folder dumped at the repo root (Commercial/, Stairs/,
storefronts/ …) via GitHub's web uploader, because the owner works from a
Windows machine and cannot reach this filesystem directly. Raw phone shots,
Instagram-named JPEGs, and Windows screenshots all show up together.

The mechanical parts are scripted. The parts that need judgment — what is
publishable, what it should say — are not, and that is where the value is.

## The order is the whole trick

Two steps are easy to do in the wrong order, and both have shipped bugs:

**Encode before you write `srcset`.** Width descriptors have to match the real
files. Write them first, then re-encode, and they quietly lie — a phone gets
handed a 233 KB image because the markup claimed it was 900px wide when it was
1400. Generate every file, *then* read widths off disk.

**Bump the service worker whenever CSS or JS changes.** `service-worker.js`
serves assets cache-first. HTML is network-first. Ship new markup without
raising `CACHE_NAME`/`ASSETS_CACHE` and returning visitors get the new page
with the old stylesheet — which is how every slideshow once rendered as a
vertical column of photos down the page. It looks perfect on a hard refresh,
so testing will not catch it.

## 1. Look at every photo before publishing

Build a contact sheet and actually look at it. This is not a formality — real
things caught this way:

- **five photos carrying a competitor's watermark** ("Infinity Glass Company"),
  which would have put another company's logo on the site
- **a stock shot of the Palais des congrès de Montréal**, a Canadian landmark,
  among photos of San Antonio jobs
- a collage rather than a single image, and near-duplicate pairs

```bash
mkdir -p /tmp/sheet && i=0
find <FOLDER> -type f | sort | nl -w3 -s'|' > /tmp/sheet/manifest.txt
while IFS='|' read -r n f; do n=$(echo $n | tr -d ' ')
  convert "$f" -resize 300x300 -background '#222' -gravity center -extent 310x310 \
    -fill yellow -pointsize 26 -gravity northwest -annotate +6+4 "$n" \
    "/tmp/sheet/$(printf %02d $n).png"
done < /tmp/sheet/manifest.txt
montage /tmp/sheet/[0-9]*.png -tile 5x -geometry +3+3 -background '#111' /tmp/sheet/sheet.png
```

Read `sheet.png`, then zoom in on anything ambiguous. Do not publish another
company's branding, stock or landmark imagery presented as this company's work,
or images whose provenance you cannot place. Flag those to the owner with the
reason and leave them out — excluding is reversible, publishing is not.

People appear in a lot of these (installers working, staff behind a counter).
That is normal for trade photography and fine to publish; mention it so the
owner can pull any shot a client would object to.

## 2. Skip what is already there

List the full-size assets and compare. Owners re-upload folders wholesale, so
most batches are largely duplicates of what is live.

```bash
ls assets/*.webp | grep -v -- '-sm' | sed 's|assets/||;s|\.webp||'
```

## 3. Name to the existing convention

`Commercial8`, `Residential9`, `Storefront1`, `Emergency1`, `Stairs1`,
`Mirror1`, `SpineClinic1` — a category word plus the next free number.
Every photo needs a `NAME.webp` and a `NAME-sm.webp`; the thumbnail feeds
gallery tiles and the small end of every `srcset`.

## 4. Convert

```bash
python3 .claude/skills/add-project-photos/scripts/optimize_images.py <SRC> <Basename>
```

Caps the long edge first (1400px full / 800px thumb), then steps quality down
only as far as the byte budget needs (180 KB / 80 KB). Dimensions before
quality matters: on foliage, glass and stone, quality-only compression reaches
q44 before it hits budget and the banding is obvious.

`--check` audits everything already in `assets/`.

## 5. Write captions from the photograph

Each tile carries a kicker and a caption:

```
<span>Storefront glass</span><b>Burger King storefront glazing</b>
```

Kickers reuse existing categories — Commercial glass, Storefront glass,
Shower enclosures, Mirrors, Custom glass, Glass railings, Emergency glass,
Healthcare glass. Captions describe what is visible and specific: "Boarded
opening after glass breakage", "Frameless shower door and return panel". Name
the business when its sign is legible. Avoid inventing detail you cannot see —
the owner reads these and will correct guesses.

## 6. Put them on the right pages

| Photos | Pages |
|---|---|
| Storefront | storefront-glass, commercial-glass |
| Commercial | commercial-glass |
| Emergency | emergency-glass-repair |
| Stairs / railings | residential-glass |
| Showers | residential-glass, shower-enclosures |
| Mirrors | residential-glass, mirrors |
| Everything | gallery |

Service pages lead with a slideshow directly under `.inner-hero`. `gallery.html`
carries the slideshow **and** keeps its grid below — 57 photos reachable only
by clicking through 57 slides would be worse than the grid. `index.html` leads
with its own hero and is left alone.

Slide markup, one per photo, inside `[data-slideshow-track]`:

```html
<div class="slideshow-slide" data-slideshow-slide role="group"
     aria-roledescription="slide" aria-label="N of TOTAL">
  <img src="assets/NAME.webp"
       srcset="assets/NAME-sm.webp 800w, assets/NAME.webp 1400w"
       sizes="(max-width: 600px) 260px, (max-width: 900px) 700px, 1180px"
       alt="CAPTION" width="W" height="H" loading="lazy" decoding="async">
  <div class="slideshow-caption"><span>KICKER</span><b>CAPTION</b></div>
</div>
```

Slides are `div`s, not list items: `role="group"` strips the implicit
`listitem` role and leaves a `<ul>` with no list children, which fails the
accessibility list check. Only the first slide is `loading="eager"` with
`fetchpriority="high"`; the rest stay lazy and the carousel warms one ahead.

Grid tiles (gallery.html) use the older form:

```html
<figure class="gallery-wide" data-bg="assets/NAME-sm.webp" data-full="assets/NAME.webp">
  <figcaption><span>KICKER</span><b>CAPTION</b></figcaption>
</figure>
```

## 7. Recompute every width descriptor from disk

Only now, with the files final:

```python
import re, glob, subprocess
w = lambda p: subprocess.run(['identify','-format','%w',p],
                             capture_output=True, text=True).stdout.strip()
for f in glob.glob('*.html'):
    s = open(f).read()
    new = re.sub(r'srcset="([^" ]+) \d+w, ([^" ]+) \d+w"',
                 lambda m: f'srcset="{m[1]} {w(m[1])}w, {m[2]} {w(m[2])}w"', s)
    if new != s: open(f,'w').write(new)
```

About `sizes`: the first tier is deliberately smaller than the slot. A phone at
DPR 3 multiplies it, so `260px` asks for 780 device px and lands on the 800px
thumbnail; ask for the honest ~360px and every phone pulls the 1400px file
instead. Capping effective density around 2× is the point.

Any `<source>` inside a `<picture>` needs the same candidates and `sizes` as
its `<img>`. A `<source srcset="one-file.webp">` with no descriptors wins
outright and pins the full-size image for everyone — that shipped once across
43 pages.

## 8. Bump the service worker

```bash
grep -n "CACHE_NAME\|ASSETS_CACHE" service-worker.js
```

Raise both versions whenever any CSS or JS changed. CSS and JS are network-first
now, so a stale copy is less likely, but images and the precache list still key
off the version.

## 9. Delete the raw uploads

Remove the uploaded folders once processed. They were 38 MB of originals that
would otherwise deploy to production and sit publicly at
`mgsusa.llc/Commercial/…`. Git history keeps them; note the commit.

## 10. Verify

```bash
python3 .claude/skills/add-project-photos/scripts/verify_site.py --since origin/main
```

Broken references, fake WebP, lying descriptors, bare `<source>` tags, and a
forgotten cache bump. Then drive the real thing in a browser — scroll each
touched page so every lazy tile fires, and step a slideshow forward:

```bash
python3 -m http.server 8080 &
```

Chromium is at `/opt/pw-browsers/chromium`; pass it as `executablePath` to
Playwright. Watch for 404s and console errors, not just visual correctness.

Lighthouse if images moved above the fold, since the first slide becomes the
LCP element:

```bash
CHROME_PATH=/opt/pw-browsers/chromium node_modules/.bin/lighthouse \
  http://localhost:8080/PAGE.html --only-categories=performance,accessibility \
  --form-factor=mobile --screenEmulation.mobile --quiet --output=json \
  --output-path=/tmp/lh.json --chrome-flags="--headless=new --no-sandbox"
```

Service pages should sit in the mid-to-high 90s. A sudden drop usually means a
single oversized file, so read `network-requests` and sort by transfer size
rather than guessing.

One known false positive: `content-visibility: auto` makes axe misread the
background behind skipped sections, so white-on-dark headings occasionally
report as failing contrast. Confirm the computed colors in the browser before
chasing it.

## Reporting back

Say which photos went where, and name what was left out and why — a watermark,
a stock landmark, a duplicate. The owner cares most about the exclusions,
because those are the ones needing a decision only they can make.
