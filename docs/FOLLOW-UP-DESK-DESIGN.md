# Follow-Up Desk & Auto Review System — Design

**Status:** Implemented; policy-safe review flow and performance snapshot updated 2026-10-21
**Goal:** After a job is done, the owner pastes the customer's name + email into
a password-protected **Follow-Up Desk**, and the system automatically emails the
customer a private satisfaction form. Every rating receives the same optional,
neutral Google review invitation. Ratings and comments stay private; a low rating
or any written comment also alerts the owner privately. The desk tracks each
customer and surfaces GA4, Search Console and Google review data when access is configured.

**Cost:** $0/mo on top of current hosting. Reuses the existing Vercel serverless
functions + Resend email (Resend free tier covers ~3,000 emails/mo). No Twilio,
no Make/Zapier, no Google Form/Sheets.

**Replaces:** The retired Make/Twilio/Google Forms instructions in the archived
`REVIEW-SYSTEM-SETUP.md`; this is the current email workflow and owner dashboard.

---

## How it works (read this first)

```
Job done → you open the Follow-Up Desk → enter customer name + email → Send
   → customer gets a branded satisfaction email with a link to mgsusa.llc/review?c=<token>
   → they rate 1–5 and may leave a private comment on a clean branded page
         ├─ every rating → same optional Google review link email to the customer
         └─ rating ≤3 or any comment → private feedback alert to the owner
   → rating, comments and alert status update in the Follow-Up Desk
```

Everything after the customer taps the link is automatic.

---

## Flow diagram

```
[Follow-Up Desk: /followup-desk]
        │ passcode → POST /api/followup-desk-login
        ▼
POST /api/followup-add { name, email, notes? }
        │ 1) writes customer record to Blob JSON (status "sent")
        │ 2) sends satisfaction email via Resend → /review?c=<token>
        ▼
[customer opens /review?c=<token>]
        │ (name/email pre-filled from token — no typing)
        ▼
POST /api/review-submit { token, rating, comments? }
        │ every rating → Resend: same optional Google review link → customer
        │ rating ≤3 or comments → private feedback alert → owner
        │ records status "review-link-sent", "low-rating-alerted" or an alert failure
        ▼
[Follow-Up Desk shows updated status]
```

---

## What gets built

### Static pages

| Page | Access | Purpose |
|---|---|---|
| `/followup-desk.html` → `/followup-desk` | Passcode + secret URL | Owner dashboard: login gate, "add customer" form, status list |
| `/review.html` → `/review` | Public | Customer 1–5 satisfaction form (branded, prefilled from `?c=` token) |

### Serverless endpoints (`api/`)

| Endpoint | Method | Purpose |
|---|---|---|
| `api/followup-desk-login.js` | POST | Verifies `passcode` against env var; returns a short-lived signed session token (HMAC) |
| `api/followup-add.js` | POST | Auth'd. Saves customer record, sends satisfaction email, returns record |
| `api/followup-list.js` | POST | Auth'd. Returns all customer records + statuses |
| `api/review-submit.js` | POST | Public. Validates token, sends the same optional Google link for every rating, stores private feedback and alerts the owner for low scores/comments |

### Shared code (`data/`)

| File | Purpose |
|---|---|
| `data/followup-store.js` | JSON-on-Blob storage helper: `list()`, `get(id)`, `add(record)`, `update(id, patch)`. Handles read-modify-write with optimistic retry. |
| `data/followup-auth.js` | HMAC sign/verify for session tokens + customer review tokens. |

### Assets (`assets/js/`, `assets/css/`)

| File | Purpose |
|---|---|
| `assets/js/followup-desk.js` | Desk client: passcode gate, add-customer form, status table, auto-refresh |
| `assets/js/review-page.js` | `/review` client: reads `?c=`, prefills name/email, submits rating, shows thank-you |
| `assets/css/followup-desk.css` | Desk styles (reuses design tokens) |
| `assets/css/review-page.css` | Review page styles (reuses design tokens) |

---

## Data model

Stored as a JSON array on Vercel Blob at `followup/customers.json` (private blob,
read/write via `BLOB_READ_WRITE_TOKEN`, already used for photo uploads).

```json
{
  "version": 1,
  "customers": [
    {
      "id": "c_01HXXXX...",
      "token": "c_01HXXXX...-<hmac>",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "notes": "Storefront glass, San Antonio",
      "status": "sent" | "review-link-sent" | "low-rating-alerted" | "low-rating-alert-failed",
      "rating": null | 1-5,
      "comments": null | string,
      "reviewLinkSentAt": null | ISO timestamp,
      "feedbackAlertStatus": "not-needed" | "sent" | "failed",
      "feedbackAlertedAt": null | ISO timestamp,
      "createdAt": "2026-08-07T18:30:00.000Z",
      "emailedAt": "2026-08-07T18:30:01.000Z",
      "ratedAt": null | "2026-08-07T19:00:00.000Z"
    }
  ]
}
```

**Status lifecycle:** `sent` → the same optional review invitation is emailed for all new ratings and its timestamp is saved in `reviewLinkSentAt`. The record is `review-link-sent` unless a low-rating owner alert is sent (`low-rating-alerted`) or fails (`low-rating-alert-failed`). Any comment also triggers a private owner alert, tracked independently in `feedbackAlertStatus`; alert failure never suppresses the customer's invitation or private stored feedback. Historical low-score records from the old gate are not counted as invited and are not automatically re-emailed.

**Tokens:** each customer gets an unguessable token (`crypto.randomUUID()` +
HMAC signature) embedded in their `/review` link. The token is the only way to
prefill/route a rating — no email/phone needed at submit time.

---

## API contracts

### `POST /api/followup-desk-login`
Body: `{ passcode }` → 200 `{ ok: true, session: "<hmac-token>" }` | 401 on failure.

### `POST /api/followup-add`  (header `Authorization: Bearer <session>`)
Body: `{ name, email, notes? }`
→ 200 `{ ok: true, record: {...} }`
→ 401 bad session | 422 validation | 502 Resend failure.

### `POST /api/followup-list`  (header `Authorization: Bearer <session>`)
→ 200 `{ ok: true, customers: [...] }` (sorted newest first).

### `POST /api/review-submit`  (public, Turnstile optional when key set)
Body: `{ token, rating, comments? }`
→ 200 `{ ok: true, redirect: "/thank-you" }`
→ 400 bad token | 422 invalid rating | 502 customer-invitation email failure.

The customer invitation is always sent regardless of rating. Low ratings and any
written comments also generate a private owner alert; that secondary email can
fail without withholding the invitation, and the dashboard records the failure.

### `POST /api/site-metrics`  (header `Authorization: Bearer <session>`)  — added 2026-08-12
Body: `{ sections?, strategy?, page?, refresh? }`
→ 200 `{ ok: true, generatedAt, followups, reviews, traffic, search, lighthouse, health, storage, pages }`
→ 401 bad session | 405 wrong method.

Read-only aggregator for the dashboard at the top of the desk. Each section is
independent and answers with its own `status`:

| Section | Source | Unconfigured behaviour |
|---|---|---|
| `followups` | the Blob store; includes ratings, response activity, review-invitation count and owner-action queue | always available |
| `reviews` | Google Places API (New) | `status: "unconfigured"` + hint |
| `traffic` | GA4 Data API (service-account JWT), including `click_to_call` and `mgs_quote_success` event counts | `status: "unconfigured"` + hint |
| `search` | Google Search Console API via the read-only service-account scope | `status: "unconfigured"` + hint |
| `lighthouse` | PageSpeed Insights, cached 12h in Blob | pages report `status: "empty"` until run |
| `health` | live fetch of `/` and `/sitemap.xml` | always available |
| `storage` | Blob read/write probe | `status: "error"` + diagnosis if unavailable |

A section that throws returns `status: "error"` — the endpoint itself still
answers 200, so one dead Google key can never blank the desk. Lighthouse runs
take 10-30s, so only the page named in `page` is re-run (`refresh: "lighthouse"`)
and the rest are served from `followup/metrics/*.json`; `vercel.json` gives the
function `maxDuration: 60`.

---

## Email templates (Resend)

All from `LEAD_FROM_EMAIL` (currently `no-reply@mgssite.com`).

**1. Satisfaction request (from `api/followup-add.js`):**
> Hi {name},
>
> Thanks for choosing Master Glass Solutions! We'd love your quick feedback on
> the job — it takes under a minute:
>
> [Rate your experience →] `https://www.mgsusa.llc/review?c={token}`

**2. Optional Google review invitation (from `api/review-submit.js`, all ratings):**
> Thanks for sharing your feedback, {name}. If you would like to share an honest
> review publicly, you can use this optional Google link:
>
> [Leave a Google review →] `https://g.page/r/CZoDFY2uA41TEAI/review`
>
> Leaving a review is completely optional.

**3. Private feedback alert (low rating or any written comment) → owner**
(`LEAD_NOTIFICATION_EMAIL`):
> Private post-job feedback received. Rating: {rating}/5.
> Name: {name} · Email: {email}
> Private comments: {comments}
>
> The same optional Google review invitation was sent regardless of rating.

No incentives, no gifts — stays Google-compliant.

---

## Security

- Desk passcode lives in `FOLLOWUP_DESK_PASSCODE` (Vercel env, server-only).
- Session tokens are HMAC-signed with a server secret (`FOLLOWUP_SESSION_SECRET`,
  defaults derived from `FOLLOWUP_DESK_PASSCODE`) and short-lived (~24h).
- Every desk API call checks the session server-side — the list/records are
  never readable without it.
- Customer review tokens are unguessable and single-purpose.
- `Cache-Control: no-store` on all four endpoints (add to `vercel.json`).
- The existing `/api/(.*)` header block in `vercel.json` caches APIs; the four
  new endpoints get explicit `no-store` header entries like `/api/chat`.

---

## Environment variables (new)

| Variable | Purpose |
|---|---|
| `FOLLOWUP_DESK_PASSCODE` | The desk login passcode (set by owner) |

Reused (already set): `RESEND_API_KEY`, `LEAD_FROM_EMAIL`, `LEAD_NOTIFICATION_EMAIL`,
`GOOGLE_REVIEW_URL`, `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID`, and
`BLOB_READ_WRITE_TOKEN`. `GOOGLE_REVIEW_URL` overrides the hardcoded `g.page`
link if the owner ever changes it; Places credentials power the profile rating
and count card.

**Dashboard extras (all optional).** Leave any of these unset and that card shows
a setup hint instead of numbers — nothing else on the desk is affected.

| Variable | Purpose |
|---|---|
| `GA4_PROPERTY_ID` | GA4 property behind the `G-C7XXMF1P52` tag, e.g. `123456789` |
| `GA4_CLIENT_EMAIL` | Service-account address, added as a **Viewer** on that property |
| `GA4_PRIVATE_KEY` | That account's PEM key, pasted with `\n` escapes; reused for Search Console with a separate read-only OAuth scope |
| `GSC_SITE_URL` | Search Console property, e.g. `sc-domain:mgsusa.llc` or `https://www.mgsusa.llc/` |
| `PAGESPEED_API_KEY` | Raises the PageSpeed quota; PSI works unkeyed but is rate limited |

Setting up Google reporting access: Google Cloud console → **APIs & Services →
Credentials → Create service account** (no project roles needed) → **Keys → Add
key → JSON**. Add its email as a Viewer on the GA4 property and as a user with
access to the matching Search Console property. Enable the **Google Analytics
Data API** and **Google Search Console API** on that Cloud project. Copy
`client_email` and `private_key` into `GA4_CLIENT_EMAIL` and `GA4_PRIVATE_KEY`,
then set `GA4_PROPERTY_ID` and `GSC_SITE_URL` in Vercel. For an `sc-domain:`
property use that exact prefix; for a URL-prefix property use its exact URL.
The dashboard counts lead events even if they are not configured as GA4 key
events; mark `click_to_call` and `mgs_quote_success` as key events in GA4 if you
want them included in GA4 key-event reporting. `click_to_call` measures a tap,
not a completed phone call.

---

## Day-to-day use (~20 seconds per job)

1. Open `https://www.mgsusa.llc/followup-desk`, enter passcode.
2. Type customer name + email (optional notes), click **Send**.
3. Done — the system emails the customer, and updates status as they respond.

**Tips:** send same-day while the job is fresh; attach the desk link to the
invoice/final-payment workflow; check the desk weekly for low ratings or failed
private-feedback notifications.

**Website performance** surfaces GA4 sessions, page views, phone-link taps,
successful quote submissions, top pages and channels; Search Console impressions,
clicks, CTR, position, queries and landing pages; Google review score; and cached
mobile PageSpeed scores. Run a new PageSpeed test for a selected page from the
desk (results are cached for 12 hours). Phone-link taps are not completed calls.
Search Console data is delayed and uses 28 complete days. The customer list can
be searched, filtered and exported to CSV.

---

## Review-request policy

- Every customer receives the same neutral, optional Google review invitation,
  regardless of their private rating or comments.
- Private ratings and written comments remain available to the owner; low scores
  and all written comments also trigger a private owner email.
- Never offer money, gifts, discounts or other incentives for a review.
- Do not block, delay or selectively route a public review invitation based on
  satisfaction. `REVIEW-SYSTEM-SETUP.md` is an archived, superseded guide; do not
  follow its former rating gate.

---

## Verification and rollout

**Code checks run locally:** `tools/review-flow-check.cjs` exercises all five
ratings, private comments and alert failures; `tools/site-metrics-check.cjs`
checks GA4 event counts and Search Console reporting with stub responses;
`tools/call-tracking-check.cjs` checks attribution, deduplication and the
single GA4/GTM delivery path. `tools/form-required-check.py` verifies the quote
forms. Live email delivery, external Google credentials, browser automation and
deployment still require the configured production/preview environment.

**Before rollout:**

1. In Vercel, set `FOLLOWUP_DESK_PASSCODE`, `RESEND_API_KEY`,
   `LEAD_NOTIFICATION_EMAIL`, and `FOLLOWUP_BLOB_READ_WRITE_TOKEN`; verify the
   sender domain used by `LEAD_FROM_EMAIL`.
2. Optionally connect GA4, Search Console and Places credentials using the
   variables above. Mark `click_to_call` and `mgs_quote_success` as GA4 key
events in GA4 Admin if they should appear in key-event reports.
3. Deploy a preview and test login, add customer, neutral invitations for all
   five ratings, private comments, low-score alerts and the dashboard cards.
   Confirm the existing quote, chat and upload endpoints still work.
4. Only after preview passes, deploy to production and verify the live profile,
   analytics and email delivery with the owner.

The code changes are implemented in this repository; no Vercel deployment or
live account configuration was performed as part of this work.

---

## Out of scope (future)

- CSV bulk upload into the desk.
- Scheduled sends ("email me 2 days after the job").
- Marking a lead from the quote form as "job done" to auto-create the customer
  (needs a datastore on the quote path).
