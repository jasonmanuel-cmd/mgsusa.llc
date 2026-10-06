# Master Glass Solutions — mgsusa.llc

Static HTML marketing site for a San Antonio, TX glass company, deployed on
Vercel with a handful of Node serverless functions in `api/`. **No framework, no
build step, no bundler** — pages are hand-edited HTML, JS is vanilla, served as-is.
The one build script (`npm run build:vendor`) only re-bundles the Vercel Blob
client into `assets/vendor/blob-client.js` with esbuild.

## Layout

- `*.html` (50 pages) at the repo root — services, ~25 `<city>-tx.html` local
  landing pages, legal pages, `followup-desk.html`, `review.html`.
- `api/` — serverless functions (see table below).
- `data/` — UMD modules shared by browser and functions: exposed as `window.MGS.*`
  in the browser, `module.exports` on Vercel. Includes the followup store/auth helpers
  and `metrics-cache.js` (server-only Blob TTL cache for dashboard reads).
- `assets/js/`, `assets/css/` — per-feature client code and styles.
  `slideshow.js` drives the project carousel that sits under the hero on every
  service page.
- `service-worker.js` — cache-first for images, network-first for HTML, CSS and JS.
- `.claude/skills/add-project-photos/` — the photo pipeline as a runnable skill,
  with `optimize_images.py` and `verify_site.py` in its `scripts/`.
- `vercel.json` — `cleanUrls`, `.html` → extensionless redirects for every page,
  and per-endpoint `Cache-Control` headers.

## Serverless endpoints

| Endpoint | Purpose |
|---|---|
| `api/chat.js` | Project Assistant chat; **OpenRouter** provider (was OpenAI), grounded in `data/company-knowledge.js`. **No Turnstile** — it was removed after the widget failed to load and 403'd every message; guarded instead by a per-IP rate limit (10/min, 60/hr, in-lambda memory) |
| `api/submit-quote.js` | Quote form: validate → Blob photo upload → Resend lead email |
| `api/blob-upload.js` | Single-photo client upload token handler |
| `api/google-reviews.js` | Google **Places API (New)** proxy; server-side key only |
| `api/reviews-fallback.js` | Static empty-review payload, same shape |
| `api/followup-desk-login.js` | Passcode → HMAC session token |
| `api/followup-add.js` | Auth'd: save customer, send satisfaction email |
| `api/followup-list.js` | Auth'd: list customer records (pure read, cache disabled). The desk's "Export customer list" tile turns this into a CSV client-side — quoted, formula-injection guarded, BOM for Excel, and deliberately without the review token |
| `api/review-submit.js` | Public: 4–5★ → Google review link email; 1–3★ → private owner alert |
| `api/health-check.js` | Daily Vercel cron (14:00 UTC). Three checks: POSTs a tokenless synthetic quote to the live `/api/submit-quote` in probe mode, asks Resend whether the `LEAD_FROM_EMAIL` domain is verified, and flags a lead drought. Silent when healthy; emails the owner only on failure, falling back to `onboarding@resend.dev` when the normal sender is the thing that broke. Guarded by `CRON_SECRET` |
| `api/site-metrics.js` | Auth'd: dashboard aggregator — follow-up funnel, Google rating, GA4 traffic, Lighthouse/PSI, live site probe. `maxDuration: 60` (a PSI run takes 10-30s) |

All write/auth endpoints get `Cache-Control: no-store` in `vercel.json`; the
generic `/api/(.*)` rule caches for 6h with a 24h stale-while-revalidate window.

## Environment variables (Vercel)

`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`,
`RESEND_API_KEY`, `LEAD_FROM_EMAIL`, `LEAD_NOTIFICATION_EMAIL`,
`BLOB_READ_WRITE_TOKEN`, `FOLLOWUP_BLOB_READ_WRITE_TOKEN` (dedicated store),
`FOLLOWUP_DESK_PASSCODE`, `FOLLOWUP_SESSION_SECRET`, `TURNSTILE_SECRET_KEY`,
`GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID`, `GOOGLE_REVIEW_URL`, `GOOGLE_MAPS_URL`.

Monitoring, all optional — the cron degrades rather than failing: `CRON_SECRET`
(sent by the Vercel cron as a bearer token; unset means the endpoint is open,
fine for preview but not production), `SITE_URL` (default
`https://www.mgsusa.llc`), `LEAD_DROUGHT_DAYS` (default 7), `HEALTH_PROBE_EMAIL`
(an address that is safe to receive a daily test message; setting it makes the
funnel probe perform a real Resend send instead of only reporting that a key
exists — the difference between "configured" and "actually delivers").

Dashboard-only, all optional — the matching card shows a setup hint instead of data:
`GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY` (service account with
Viewer on the GA4 property; the PEM goes in with `\n` escapes) and
`PAGESPEED_API_KEY` (PSI works unkeyed but is rate limited).

The Turnstile **site** key is inlined in `assets/js/quote-form.js` and
`assets/js/review-page.js` — change it in both when it rotates. Secrets stay in
Vercel. `TURNSTILE_SECRET_KEY` is still verified by `submit-quote` and
`blob-upload`; the chat no longer uses it.

**Known risk:** the quote form and review page share the site key
`0x4AAAAAAEGumU2z9QHnLmlL`, the same one whose widget failure broke the chat.
`quote-form.js` blocks submission when no token is minted, so if that key is
misconfigured the quote form is silently dropping leads — worth verifying in the
Cloudflare Turnstile dashboard (allowed hostnames must include the live domain).

## Conventions

- **CSS:** edit `assets/design-tokens.css` (source of truth) and
  `assets/styles.css`, then re-inline tokens and regenerate `assets/styles.min.css`
  — that's what pages actually load. Never patch the `.min` file directly.
- **Bump the service worker on any CSS or JS change.** `service-worker.js`
  caches by version; raise `CACHE_NAME` *and* `ASSETS_CACHE` together. HTML is
  network-first, so skipping this hands returning visitors new markup with an
  old stylesheet — that is how every slideshow once rendered as a vertical
  column of photos. A hard refresh looks fine, so testing will not catch it.
  `styles.min.css` is also requested as `?v=N`; raise that when the file changes.
- **Site-wide changes** (nav, footer, tracking snippets, social links) must be
  applied across all 50 HTML pages — e.g. the HubSpot snippet is on all 50.
- **Photos:** run the `add-project-photos` skill rather than doing it by hand.
  Budgets are 1400px/180 KB full and 800px/80 KB for `-sm` thumbnails, and
  every photo needs both. Encode first, then write `srcset` width descriptors
  from the files on disk — writing them first and re-encoding after makes them
  lie. A `<source>` needs descriptors and `sizes`, or a `media` query; a bare
  one-URL srcset beats the `<img>` and pins the full-size file for everyone.
- **Brand red:** `--color-brand` (#E63946) fails AA as small text — 4.16:1 both
  on white and with white on it. Small text uses `--color-brand-hover`
  (#D62828), which passes ~4.96:1 either way. On near-black, the brighter
  `--metal` is the legible one. Keep #E63946 for fills and large text.
- **Never let a bot check refuse a lead.** Turnstile blocking the quote form
  cost roughly 25 days of submissions: the widget failed, no token was minted,
  and both the client gate and the server's 403 turned real customers away.
  Verification is advisory now — an unverified lead arrives with an
  `[unverified]` subject prefix and per-IP rate limits bound abuse instead.
  `/api/health-check` exists to catch a regression here.
- **A configured integration is not a working one.** `RESEND_API_KEY` being set
  says nothing about whether Resend will *accept* the send: an unverified From
  domain is refused at the API, `submit-quote` answers 502, and the owner's
  inbox stays empty while every page looks fine. Health checks here assert
  delivery, not configuration.
- **Graceful degradation** is the house style: reviews fall back to a static
  payload, chat degrades to phone/quote CTAs, and a quote the API cannot take
  falls back rather than vanishing. **A fallback nobody wired up is worse than
  none** — the quote forms carry no `action`, and for months `nativeFallback()`
  posted them to the static page they sit on, so every 500/502/503 deleted the
  lead in silence while the code claimed it went to Formspree. `quote-form.js`
  now submits natively only when the form has an `action` that leaves the page;
  otherwise it keeps the customer put and hands them their request back with a
  phone number and a prefilled email. To turn the Formspree net on, put
  `action="https://formspree.io/f/<id>"` on the five `#quote-form` forms.
  Related: `form.dispatchEvent(new Event('submit'))` runs listeners but never
  navigates — use `form.submit()` when you mean to post.
- **Motion layer.** `assets/css/motion.css` + `assets/js/motion.js`, loaded on
  all 54 real pages (not `emergency.html`, a redirect stub, nor the Google
  verification file). It is purely additive: it changes no colour, type,
  spacing or layout, and attaches to markup that already exists. The rule that
  makes it safe is the ordering — `motion.js` adds `.motion-ready` to `<html>`
  only after it has found its targets and confirmed IntersectionObserver, and
  every hiding rule in the CSS is scoped under that class. So with the script
  blocked, JS off, or reduced motion requested, nothing is ever hidden. There
  is also a 4s failsafe that reveals anything still hidden. Never write a
  `[data-rise]` rule that hides outside `.motion-ready`.
  Note `.section` sets `content-visibility: auto`, so scrolling straight to the
  bottom and then reading computed styles reports skipped sections as
  un-transitioned — that is a measurement artifact, not a bug. Check motion
  with `tools/motion-inview.cjs` (measures in-viewport, as a visitor sees it);
  `tools/motion-check.cjs` covers the JS-off and reduced-motion cases, where
  nothing may ever be hidden.
- **Review markup must match what the page shows.** `data/reviews-baseline.js`
  holds the rating and count the JSON-LD declares, and both review endpoints
  read from it, so the visible block and the structured data agree even when
  the Places API is down. Before, the fallback returned 0/0 and the section
  collapsed to "temporarily unavailable" while the markup still claimed 76
  reviews — the mismatch Google's self-serving review policy targets. Review
  *text* is never faked; quotes render only when they come live from Google.
  `REVIEWS_BASELINE_RATING` / `REVIEWS_BASELINE_COUNT` override without a deploy.
- **A city page's `Place` is the city; its `LocalBusiness` is the company.**
  `LocalBusiness` geo is the San Antonio office (29.5604, -98.5322) and must
  match `postalAddress`. `Place` geo is that city's own coordinates and must
  match its `hasMap`. Setting both to the office address looks like a NAP fix
  and is not: it leaves `Place` contradicting its own map link on 21 pages.
  `tools/fix_place_geo.py` restores `Place` geo from `hasMap`.
- Commit messages follow `type(scope): summary`.

## Local preview

```bash
python3 -m http.server 8080
```

Static pages render; anything under `api/` needs a Vercel deploy (or preview) to respond.

## Reference docs

- `README.md` — detailed reviews/chat/quote docs. Corrected 2026-10-06: the
  dead `build_site.py` and `strategy/` references are gone, the chat provider
  reads OpenRouter, and the Formspree claim is replaced with what the fallback
  actually does.
- `FOLLOW-UP-DESK-DESIGN.md` — the implemented design for the Follow-Up Desk.
- `REVIEW-SYSTEM-SETUP.md` — the older Twilio/Make/Google-Forms plan, **superseded**
  by the Follow-Up Desk. Kept for its compliance notes.

## Repo state notes

- `main` is the only branch, and the live one. A `master` branch holding an
  unrelated legacy history (a submodule wrapper repo) was deleted 2026-10-06;
  if it ever reappears, it is not an ancestor of this project and must not be
  merged into `main`.
- There is no automated test or CI setup; the only Actions workflow is the
  Copilot PR reviewer. Checks are the scripts in `tools/` and the
  `add-project-photos` skill's `verify_site.py`, run by hand.
- **One** Vercel project builds this repo: `mgsusa-llc`, from the root. Keep it
  that way — a second project (`web`, pointing at an Astro concept folder)
  existed briefly and failed every build, so do not add a sub-folder with its
  own `package.json` that invites another. Commits from 2026-10-06 and earlier
  still carry a red `Vercel – web` status; commit statuses are immutable, so
  that is frozen history, not a current failure.
- Six domains serve this one project, `mgsusa.llc` plus
  `masterglasssolutionsusa.com`, `sanantonioglasssolutions.com` and their `www`
  forms. They all serve identical content and every canonical points at
  `mgsusa.llc`, which is what consolidates them. There is no per-domain build.
- Verification is manual and worth doing: `python3 -m http.server 8080`, then
  Chromium at `/opt/pw-browsers/chromium` via Playwright, plus
  `.claude/skills/add-project-photos/scripts/verify_site.py --since origin/main`.
  Lighthouse runs locally too; service pages should sit in the mid-to-high 90s
  on mobile. `content-visibility: auto` makes axe misread backgrounds behind
  skipped sections, so the odd contrast "failure" is a false positive — check
  the computed colours before chasing one.
- A CLA bot (`open-cla`) marks every PR red because commits are authored by
  `@claude`. It does not block merging.
