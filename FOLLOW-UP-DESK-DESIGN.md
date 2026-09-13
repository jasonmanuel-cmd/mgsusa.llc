# Follow-Up Desk & Auto Review System — Design

**Status:** Approved for implementation (2026-08-07)
**Goal:** After a job is done, the owner pastes the customer's name + email into
a password-protected **Follow-Up Desk**, and the system automatically emails the
customer a satisfaction form. Happy customers (4-5★) automatically get the
Google review link; unhappy customers (1-3★) trigger a private alert instead of
a public bad review. The desk tracks every customer's status.

**Cost:** $0/mo on top of current hosting. Reuses the existing Vercel serverless
functions + Resend email (Resend free tier covers ~3,000 emails/mo). No Twilio,
no Make/Zapier, no Google Form/Sheets.

**Replaces:** The Twilio/SMS flow in `REVIEW-SYSTEM-SETUP.md`. This is the
email-only variant with a built-in dashboard instead of a Google Sheet.

---

## How it works (read this first)

```
Job done → you open the Follow-Up Desk → enter customer name + email → Send
   → customer gets a branded satisfaction email with a link to mgsusa.llc/review?c=<token>
   → they rate 1–5 on a clean branded page
         ├─ 4–5★ → they instantly get an email with YOUR Google review link
         │          (https://g.page/r/CZoDFY2uA41TEAI/review)
         └─ 1–3★ → you get a private low-rating alert (no public review requested)
   → status auto-updates in the Follow-Up Desk
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
        │ 4-5★ → Resend: Google review link email → customer; status "review-link-sent"
        │ 1-3★ → Resend: private low-rating alert → owner;  status "low-rating-alerted"
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
| `api/review-submit.js` | POST | Public. Validates token, routes on rating, updates status, sends the right email |

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
      "status": "sent" | "review-link-sent" | "low-rating-alerted",
      "rating": null | 1-5,
      "comments": null | string,
      "createdAt": "2026-08-07T18:30:00.000Z",
      "emailedAt": "2026-08-07T18:30:01.000Z",
      "ratedAt": null | "2026-08-07T19:00:00.000Z"
    }
  ]
}
```

**Status lifecycle:** `sent` → (`review-link-sent` on 4–5★ | `low-rating-alerted` on 1–3★).

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
→ 400 bad token | 422 invalid rating | 502 Resend failure.

### `POST /api/site-metrics`  (header `Authorization: Bearer <session>`)  — added 2026-08-12
Body: `{ sections?, strategy?, page?, refresh? }`
→ 200 `{ ok: true, generatedAt, followups, reviews, traffic, lighthouse, health, pages }`
→ 401 bad session | 405 wrong method.

Read-only aggregator for the dashboard at the top of the desk. Each section is
independent and answers with its own `status`:

| Section | Source | Unconfigured behaviour |
|---|---|---|
| `followups` | the Blob store | always available |
| `reviews` | Google Places API (New) | `status: "unconfigured"` + hint |
| `traffic` | GA4 Data API (service-account JWT) | `status: "unconfigured"` + hint |
| `lighthouse` | PageSpeed Insights, cached 12h in Blob | pages report `status: "empty"` until run |
| `health` | live fetch of `/` and `/sitemap.xml` | always available |

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

**2. Google review link (from `api/review-submit.js`, rating 4–5):**
> Thanks {name}! We're glad the job went well. If you have a minute, a Google
> review means the world to a small local business:
>
> [Leave a review →] `https://g.page/r/CZoDFY2uA41TEAI/review`

**3. Low-rating alert (from `api/review-submit.js`, rating 1–3) → owner**
(`LEAD_NOTIFICATION_EMAIL`):
> A customer rated their job {rating}/5.
> Name: {name} · Email: {email}
> Comments: {comments}
>
> Follow up BEFORE this becomes a public review.

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
`GOOGLE_REVIEW_URL`, `BLOB_READ_WRITE_TOKEN`. `GOOGLE_REVIEW_URL` overrides the
hardcoded `g.page` link if the owner ever changes it.

**Dashboard extras (all optional).** Leave any of these unset and that card shows
a setup hint instead of numbers — nothing else on the desk is affected.

| Variable | Purpose |
|---|---|
| `GA4_PROPERTY_ID` | GA4 property behind the `G-C7XXMF1P52` tag, e.g. `123456789` |
| `GA4_CLIENT_EMAIL` | Service-account address, added as a **Viewer** on that property |
| `GA4_PRIVATE_KEY` | That account's PEM key, pasted with `\n` escapes |
| `PAGESPEED_API_KEY` | Raises the PageSpeed quota; PSI works unkeyed but is rate limited |

Setting up GA4 access: Google Cloud console → **APIs & Services → Credentials →
Create service account** (no project roles needed) → **Keys → Add key → JSON**;
then in GA4 → **Admin → Property access management**, add the service-account
email as a Viewer. Enable the **Google Analytics Data API** on the project. Copy
`client_email` and `private_key` out of the JSON into the two env vars.

---

## Day-to-day use (~20 seconds per job)

1. Open `https://www.mgsusa.llc/followup-desk`, enter passcode.
2. Type customer name + email (optional notes), click **Send**.
3. Done — the system emails the customer, and updates status as they respond.

**Tips:** send same-day while the job is fresh; attach the desk link to the
invoice/final-payment workflow; check the desk weekly to catch any
`low-rating-alerted` follow-ups.

**The dashboard above the form** answers "how is the site doing?" at a glance:
page views and where visitors came from, the pages they land on, Lighthouse
scores per page (press **Run test** — it takes ~30s and the result is kept for
12 hours), the Google rating, and a live up/down check. **Needs attention** is
the one to read first: it lists unhappy customers and anyone who has not replied
in over a week. The customer list can be searched, filtered by status, sorted,
and exported to CSV; **Copy review link** puts a customer's personal rating link
on the clipboard for texting.

---

## Compliance (unchanged from REVIEW-SYSTEM-SETUP.md)

- Never offer money/gifts/discounts for a Google review.
- Ask everyone through the gate — only 4–5★ get the public review link.
- Don't hand-pick only happy customers (the desk doesn't — it asks whoever the
  owner enters after any job).
- Negative feedback stays private and comes to the owner first.

---

## Testing plan

1. **Local:** `python3 -m http.server 8080` — pages render; API needs deploy.
2. **Staging/preview deploy:** set `FOLLOWUP_DESK_PASSCODE`, deploy, then:
   - Desk login: wrong passcode → 401; right passcode → session.
   - Add customer → satisfaction email arrives; record shows `sent`.
   - Open `/review?c=<token>` → name/email prefilled.
   - Submit 5★ → review-link email arrives; status `review-link-sent`.
   - Add second customer → submit 2★ → owner alert arrives; no public link; status `low-rating-alerted`.
   - Desk list shows both customers with correct statuses.
3. **Prod:** repeat on the live domain; then live fire with a friendly customer.
4. **Regression:** confirm existing `/api/submit-quote`, `/api/chat`,
   `/api/blob-upload` still work after the `vercel.json` header additions.

---

## Rollout steps

1. Create `data/followup-store.js`, `data/followup-auth.js`.
2. Create the four API endpoints.
3. Create `/review` + `/followup-desk` pages and assets.
4. Wire `vercel.json`: clean URLs for `/review` and `/followup-desk`, `no-store`
   headers for the four endpoints, add `reviews.html`-style redirect for
   `/followup-desk.html`.
5. Set `FOLLOWUP_DESK_PASSCODE` in Vercel (Production + Preview).
6. Deploy, run the testing plan, go live.

---

## Out of scope (future)

- CSV bulk upload into the desk.
- Scheduled sends ("email me 2 days after the job").
- Marking a lead from the quote form as "job done" to auto-create the customer
  (needs a datastore on the quote path).
