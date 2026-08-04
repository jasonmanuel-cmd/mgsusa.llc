# Master Glass Solutions — Website Prototype

A mobile-first, static HTML concept build plus full strategy, SEO/AEO plan, copy system, and sitemap.

## Preview locally

```bash
cd /home/user/master-glass-site
python3 -m http.server 8080
```

Open `http://localhost:8080/`.

## Rebuild after copy/data changes

The service pages are generated from `build_site.py`:

```bash
python3 build_site.py
```

Then regenerate `sitemap.xml` or add the sitemap generator to a deployment script.

## Production handoff essentials

- Replace all concept images in `assets/` with consented, original Master Glass Solutions project photography.
- Connect forms to a secure CRM/form endpoint. The current forms demonstrate fields and conversion logic only.
- Configure extensionless rewrite rules or amend canonical URLs for the final host.
- Connect real, visible reviews before adding Review/AggregateRating markup.
- Add a privacy policy, consent management, spam protection, analytics/GTM, and legacy URL redirects.

Full strategy: `strategy/MASTER-GLASS-STRATEGY.md`.

## Google Reviews (serverless)

The homepage "CUSTOMER REVIEWS" section and `/reviews` page are backed by two
Vercel serverless functions that proxy the Google Business Profile (GBP) API.
The site stays fully static — no framework, no runtime dependencies, native
`fetch` only.

- `api/google-reviews.js` — OAuth token refresh (cached in memory), GBP
  `v4.accounts.locations.reviews` list call, response normalization, and
  graceful fallback. Responds with `source: "google"` on success or
  `source: "fallback"` (HTTP 200) when GBP is unreachable or unconfigured.
- `api/reviews-fallback.js` — static empty-reviews fallback with the same
  shape, used for dry-run/local testing.

Both endpoints send
`Cache-Control: public, s-maxage=21600, stale-while-revalidate=86400` so the
edge caches reviews for 6 hours with a 24h stale-while-revalidate window.

### Required Vercel environment variables

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Long-lived OAuth refresh token |
| `GOOGLE_BUSINESS_ACCOUNT_ID` | Numeric GBP account ID |
| `GOOGLE_BUSINESS_LOCATION_ID` | GBP location ID |
| `GOOGLE_REVIEW_URL` | Direct review link, e.g. `https://g.page/r/CZoDFY2uA41TEAI/review` |
| `GOOGLE_MAPS_URL` | Public Maps link, e.g. `https://maps.google.com/?cid=6020472325090378650` |

Until `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REFRESH_TOKEN` are set,
the API returns the fallback payload and the homepage shows the "temporarily
unavailable" message. No placeholder credentials are ever shipped.

### Setting up GBP API access (one-time)

1. In [Google Cloud Console](https://console.cloud.google.com), create a
   project and enable the **My Business API** (or My Business Business
   Information API).
2. Configure the OAuth consent screen (External), then create an OAuth client
   ID of type **Desktop app** (or Web app with any redirect URI).
3. Visit the consent URL below, approve, and capture the authorization code.
   Use the web client ID/secret if you created a Web app, or the Desktop ID if
   not. The scope is `https://www.googleapis.com/auth/business.manage`
   (`plus.business.manage` also works):
   `https://accounts.google.com/o/oauth2/auth?access_type=offline&prompt=consent&client_id=CLIENT_ID&redirect_uri=REDIRECT_URI&response_type=code&scope=https://www.googleapis.com/auth/business.manage`
4. Exchange the code for tokens (this yields the refresh token):
   `https://oauth2.googleapis.com/token` with `grant_type=authorization_code`,
   `client_id`, `client_secret`, `code`, and `redirect_uri`.
5. Verify your GBP account/location IDs by listing locations:
   `GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts`
   and
   `GET https://mybusiness.googleapis.com/v4/accounts/{account}/locations`.
6. Add all seven variables in Vercel → Project → Settings → Environment
   Variables and redeploy.

### Data layer

Click tracking fires `window.dataLayer.push` events (`review_button_click`
and `google_reviews_click`) with
`business_name: "Master Glass Solutions"` and
`button_location: "homepage_reviews_section"`.

## CSS architecture

- `assets/design-tokens.css` — design tokens (colors, type, spacing, motion). Source of truth,
  but **not fetched at runtime**: its `:root` block is inlined into the stylesheets below so the
  browser does not pay for a render-blocking `@import`. Edit here, then re-inline.
- `assets/styles.css` — flattened, deduplicated source stylesheet (one rule per line).
- `assets/styles.min.css` — what pages load; regenerate from styles.css by stripping newlines.

Edit styles.css, then regenerate the min file. Do not append overrides to the min file directly.
