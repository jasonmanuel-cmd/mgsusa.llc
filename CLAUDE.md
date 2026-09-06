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
| `api/site-metrics.js` | Auth'd: dashboard aggregator — follow-up funnel, Google rating, GA4 traffic, Lighthouse/PSI, live site probe. `maxDuration: 60` (a PSI run takes 10-30s) |

All write/auth endpoints get `Cache-Control: no-store` in `vercel.json`; the
generic `/api/(.*)` rule caches for 6h with a 24h stale-while-revalidate window.

## Environment variables (Vercel)

`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`,
`RESEND_API_KEY`, `LEAD_FROM_EMAIL`, `LEAD_NOTIFICATION_EMAIL`,
`BLOB_READ_WRITE_TOKEN`, `FOLLOWUP_BLOB_READ_WRITE_TOKEN` (dedicated store),
`FOLLOWUP_DESK_PASSCODE`, `FOLLOWUP_SESSION_SECRET`, `TURNSTILE_SECRET_KEY`,
`GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID`, `GOOGLE_REVIEW_URL`, `GOOGLE_MAPS_URL`.

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
- **Graceful degradation** is the house style: `/api/submit-quote` 503 falls back
  to Formspree, reviews fall back to a static payload, chat degrades to phone/quote CTAs.
- Commit messages follow `type(scope): summary`.

## Local preview

```bash
python3 -m http.server 8080
```

Static pages render; anything under `api/` needs a Vercel deploy (or preview) to respond.

## Reference docs

- `README.md` — detailed reviews/chat/quote docs. **Partly stale:** it still
  references a deleted `build_site.py`, a missing `strategy/` directory, and names
  OpenAI as the chat provider.
- `FOLLOW-UP-DESK-DESIGN.md` — the implemented design for the Follow-Up Desk.
- `REVIEW-SYSTEM-SETUP.md` — the older Twilio/Make/Google-Forms plan, **superseded**
  by the Follow-Up Desk. Kept for its compliance notes.

## Repo state notes

- `main` is the live branch. `master` is an unrelated legacy history (a submodule
  wrapper repo, last touched 2026-08-02) — do not merge it into `main`.
- `test-blob-e2e.cjs` and `test-real-module.cjs` at the root are tracked debugging
  scratch scripts, not a test suite. There is no automated test or CI setup;
  the only Actions workflow is the Copilot PR reviewer.
- Verification is manual and worth doing: `python3 -m http.server 8080`, then
  Chromium at `/opt/pw-browsers/chromium` via Playwright, plus
  `.claude/skills/add-project-photos/scripts/verify_site.py --since origin/main`.
  Lighthouse runs locally too; service pages should sit in the mid-to-high 90s
  on mobile. `content-visibility: auto` makes axe misread backgrounds behind
  skipped sections, so the odd contrast "failure" is a false positive — check
  the computed colours before chasing one.
- A CLA bot (`open-cla`) marks every PR red because commits are authored by
  `@claude`. It does not block merging.
