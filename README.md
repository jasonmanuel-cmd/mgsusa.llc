# Master Glass Solutions — Website Prototype

A mobile-first, static HTML concept build plus full strategy, SEO/AEO plan, copy system, and sitemap.

## Preview locally

```bash
cd /home/user/master-glass-site
python3 -m http.server 8080
```

Open `http://localhost:8080/`.

## Editing pages

There is no generator. Every page is hand-edited HTML at the repo root, served
as-is. A change to the nav, footer or a tracking snippet has to be applied to
all of them -- see the site-wide rule in `CLAUDE.md`. Photos go through the
`add-project-photos` skill rather than being added by hand.

After any CSS or JS change, raise `CACHE_NAME` and `ASSETS_CACHE` in
`service-worker.js` together, and the `?v=N` on the stylesheet link. Skipping
that hands returning visitors new markup with an old stylesheet.

## Quote form fallback

The guided forms post to `/api/submit-quote`. All five `#quote-form` pages also
carry the external action `https://formspree.io/f/maqrkdvg`; if the API is
unreachable or returns 401/403/404 or a 5xx response, `quote-form.js` uses a
native form submission to that endpoint instead of posting back to the static
page. Without an external action, the customer stays on the page with their
answers and gets a click-to-call link plus a prefilled email. `tools/form-required-check.py`
checks that the fallback action stays wired on every quote form. The Formspree
endpoint should still be tested after deployment because it is an external
service.

## Google Reviews (serverless)

The homepage "CUSTOMER REVIEWS" section and `/reviews` page are backed by two
Vercel serverless functions that proxy the **Google Places API (New)**. The
site stays fully static — no framework, no runtime dependencies, native
`fetch` only.

- `api/google-reviews.js` — server-side Places API (New) call for the
  configured `GOOGLE_PLACE_ID`, response normalization, and graceful fallback.
  Responds with `source: "google"` on success or `source: "fallback"` (HTTP
  200) when the API is unreachable or unconfigured. The API key lives only in
  the server function and never reaches the browser.
- `api/reviews-fallback.js` — static empty-reviews fallback with the same
  shape, used for dry-run/local testing.

Both endpoints send
`Cache-Control: public, s-maxage=21600, stale-while-revalidate=86400` so the
edge caches reviews for 6 hours with a 24h stale-while-revalidate window.

### Required Vercel environment variables

| Variable | Purpose |
|---|---|
| `GOOGLE_PLACES_API_KEY` | Places API (New) server-side API key |
| `GOOGLE_PLACE_ID` | The business's Google Place ID, e.g. `ChIJCQD4Q0GLXIYRMXiLuAHlNh4` |
| `GOOGLE_REVIEW_URL` | Direct review link, e.g. `https://g.page/r/CZoDFY2uA41TEAI/review` |
| `GOOGLE_MAPS_URL` | Public Maps link, e.g. `https://maps.google.com/?cid=6020472325090378650` |

Until `GOOGLE_PLACES_API_KEY`/`GOOGLE_PLACE_ID` are set, the API returns the
fallback payload and the homepage shows the "temporarily unavailable" message.
No placeholder credentials are ever shipped.

### Setting up Places API access (one-time)

1. In [Google Cloud Console](https://console.cloud.google.com), create a
   project, enable **Places API (New)**, and create an API key.
2. Restrict the key to the **Places API** only (API restrictions) and to your
   domains (Website/HTTP referrer or IP restrictions) so it cannot be used
   elsewhere.
3. Find the business's place ID: search in Google Maps and use the URL's
   `?cid=` value via the Places API, or query
   `POST https://places.googleapis.com/v1/places:searchText` with the
   business name and read the returned `id`.
4. Add all four variables in Vercel → Project → Settings → Environment
   Variables and redeploy.

### Data layer

Click tracking fires `window.dataLayer.push` events (`review_button_click`
and `google_reviews_click`) with
`business_name: "Master Glass Solutions"` and
`button_location: "homepage_reviews_section"`.

## Follow-Up Desk and performance dashboard

The private owner dashboard at `/followup-desk` sends satisfaction requests and
tracks responses. Every submitted rating receives the same optional Google
review invitation; ratings/comments stay private, and low ratings or written
comments also alert the owner. The former rating gate is retired. See
`docs/FOLLOW-UP-DESK-DESIGN.md` for current behavior and account setup.

The authenticated dashboard can show GA4 sessions/pages plus `click_to_call`
and `mgs_quote_success` event counts, Search Console clicks/queries, the Google
review score, and cached mobile PageSpeed scores. Phone-click events are intent,
not completed calls; GA4 key-event settings still need to be configured in the
property. Data sources show setup hints until credentials/property access are
added in Vercel: `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY`,
`GSC_SITE_URL`, `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID`, and optionally
`PAGESPEED_API_KEY`.

Local regression checks for the neutral review flow, single-path call event
tracking, and the GA4/Search Console API requests are `tools/review-flow-check.cjs`,
`tools/call-tracking-check.cjs`, and `tools/site-metrics-check.cjs`.

## CSS architecture

- `assets/design-tokens.css` — design tokens (colors, type, spacing, motion). Source of truth,
  but **not fetched at runtime**: its `:root` block is inlined into the stylesheets below so the
  browser does not pay for a render-blocking `@import`. Edit here, then re-inline.
- `assets/styles.css` — flattened, deduplicated source stylesheet (one rule per line).
- `assets/styles.min.css` — what pages load; regenerate from styles.css by stripping newlines.

Edit styles.css, then regenerate the min file. Do not append overrides to the min file directly.

## Project Assistant & guided quote form

The site ships an AI chat assistant (`assets/js/project-assistant.js`) and a
guided multi-step quote wizard (`assets/js/quote-form.js`) that progressively
enhance static `#quote-form` markup. Everything stays vanilla — no framework,
no build step.

### Files

- `data/service-options.js`, `data/service-areas.js`,
  `data/company-knowledge.js` — single source of truth for the wizard, the
  assistant, and the API. UMD format: exposed as `window.MGS.*` in the browser
  and `module.exports` on Vercel Node functions.
- `assets/js/project-assistant.js` — chat widget. Auto-mounts on
  `DOMContentLoaded`, creates `.mgs-chat` root with launcher + dialog panel,
  renders Cloudflare Turnstile on the launcher, stores history in
  `localStorage` under `mgs-chat-history-v1`.
- `assets/js/quote-form.js` — upgrades `#quote-form` into a step wizard,
  handles photo uploads and Turnstile, posts to `/api/submit-quote`, and emits
  GA4 `mgs_quote_*` events. Fields are moved (not cloned) into
  `.quote-wizard__original`. On network errors or API 401/403/404/5xx responses,
  it submits natively to the configured Formspree action. Without an action, it
  keeps the visitor's answers on-page and offers phone/email rescue.
- `assets/js/photo-upload.js` — client helper exposing `window.MGS.photoUpload`
  for the wizard's photo steps.
- `assets/css/project-assistant.css` — all chat + wizard styles. The wizard
  overrides `styles.css` `.lead-form [aria-live="polite"]` so the step titles
  stay visible. z-index: chat/wizard wrapper 120 (above header 100 and the
  mobile call FAB 110).

### Serverless endpoints

- `api/chat.js` — `POST /api/chat`, streams **OpenRouter** replies, grounded
  with `data/company-knowledge.js`. No Turnstile: it was removed after the
  widget failed to load and 403'd every message, and a per-IP rate limit
  guards it instead.
- `api/submit-quote.js` — `POST /api/submit-quote`, validates, uploads photos
  to Blob, sends lead email via Resend, verifies Turnstile.
- `api/blob-upload.js` — `POST /api/blob-upload`, uploads a single photo to
  Blob with auth token.

All three are served `Cache-Control: no-store` via `vercel.json`.

### Required Vercel environment variables

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Chat completions |
| `OPENAI_MODEL` | Model id, e.g. `gpt-4o-mini` |
| `RESEND_API_KEY` | Lead email delivery |
| `LEAD_NOTIFICATION_EMAIL` | Where leads are emailed |
| `LEAD_FROM_EMAIL` | Sender address for lead emails |
| `BLOB_READ_WRITE_TOKEN` | Photo uploads to Vercel Blob |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Bot protection |
| `COMPANY_PHONE` | `(210) 370-3700` used in fallbacks/emails |

The site key is inlined into the JS (`TURNSTILE_SITE_KEY` in
`project-assistant.js` and `quote-form.js`). When the public key changes, edit
the constant in both files and re-inline; keep `TURNSTILE_SECRET_KEY` in Vercel
only.

### Pages wired

- Wizard + assistant: `request-quote.html`, `residential-quote.html`,
  `commercial-quote.html`, `contact.html`,
  `glass-project-planning-checklist.html`.
- Assistant only: `index.html`, `privacy-policy.html`, `thank-you.html`.

### Local testing

```bash
python3 -m http.server 8080
```

The wizard and assistant load and render from static files. Quote submissions
fall back to the configured Formspree action when `/api/submit-quote` is
unreachable or returns 401/403/404 or 5xx; the chat needs the deployed API to reply.
