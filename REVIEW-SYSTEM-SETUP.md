# Auto Google Review System — Full Setup Guide

**Goal:** After a job is done, automatically ask every customer for a Google review — but only route *happy* customers to the public review link. Unhappy customers get a private alert to you instead of a public 1-star.

**Cost:** ~$2–5/mo at low volume (Twilio number + SMS credit).

**Time:** ~1 hour total, one-time setup.

---

## How it works (read this first)

```
Job done → you text customer the 30-second form link
        → customer rates your work (1–5) on a Google Form
        → response lands in a Google Sheet
        → Make/Zapier watches the Sheet
              ├─ Rating 4–5  → SMS text with your Google review link
              └─ Rating 1–3  → email alert to you (no public review link)
```

Everything after the customer submits the form is automatic.

---

## Prerequisites

You need these accounts (all free except Twilio SMS credit):

| # | Account | Why | Cost |
|---|---------|-----|------|
| 1 | Google Business Profile | Your review link | Free |
| 2 | Google account | Google Form + Sheets | Free |
| 3 | Make.com (or Zapier) | The automation glue | Free tier works |
| 4 | Twilio | Sends the SMS | ~$2–5/mo |

---

## STEP 1 — Get your Google review link (2 minutes)

1. Go to `https://business.google.com` and sign in to **Master Glass Solutions**.
2. In the menu, click **Home**.
3. Scroll to the **"Get more reviews"** card and click it.
4. Click **Copy link**. It looks like:
   `https://g.page/r/CXXXXXXXXXXXX/review`
5. Paste it into a notes file — you'll need it in Steps 3 and 4.

> **Verify it:** open the link in an incognito window. It should go straight to Google Maps and open the "write a review" box for your business. If it shows "page not found," you're not verified yet — finish GBP verification first.

**Alternative link (only if your account doesn't show the card):** go to your GBP Dashboard → the specific listing → **Reviews** tab → look for "Get more reviews" / the shareable link icon.

---

## STEP 2 — Build the Google Form (10 minutes)

1. Go to `https://forms.google.com` → **Blank form**.
2. Name it: **Master Glass Solutions — How was your job?**
3. Turn OFF the Form Settings that would hurt you:
   - **Settings → Responses:** collect email addresses = **OFF** (don't force a Google login).
   - **Settings → Presentation:** "Show link to submit another response" = **OFF**.
   - Under Settings → **Quiz:** leave it OFF (we don't need scoring; we'll read the rating from a regular question).
4. Build these questions exactly:

   **Q1 — Rating (required)**
   - Question: `How would you rate your experience with Master Glass Solutions?`
   - Type: **Multiple choice**
   - Options: `5 – Excellent`, `4 – Good`, `3 – OK`, `2 – Poor`, `1 – Very poor`
   - Toggle **Required** ON.

   **Q2 — Phone number (required)**
   - Question: `Your cell phone number (so we can text you a thank-you link)`
   - Type: **Short answer**
   - Toggle **Required** ON.
   - Tip: set **Response validation → Number → Greater than → 1000000000** so people can't paste junk text.

   **Q3 — Name (optional)**
   - Question: `Your name`
   - Type: **Short answer**
   - Required OFF.

   **Q4 — Comments (optional)**
   - Question: `Anything we should know about your job?`
   - Type: **Paragraph**
   - Required OFF.

5. Click the **Send** button → **Link** tab → **Copy link**. This is the link you'll text each customer after a job. Keep it saved somewhere handy (add it to your phone's quick notes).

> **Why two steps?** Google's policy says don't selectively ask only happy customers for reviews, and don't incentivize them. The satisfaction gate asks *everyone*; only satisfied customers get the public review link. Negative feedback comes straight to you so you can fix it privately.

---

## STEP 3 — Connect the Form to a Google Sheet (2 minutes)

1. Open your form → click the **Responses** tab.
2. Click the **Link to Sheets** icon (spreadsheet symbol) → **Create a new spreadsheet** → **Create**.
3. Note the spreadsheet name (something like `How was your job (Responses)`).
4. Give it a quick test: open the form link, submit a test response with a rating. You should see the row appear in the Sheet within a few seconds. This confirms Step 3 worked.

---

## STEP 4 — Set up Twilio (15 minutes)

Twilio is what actually sends the text message. Skip this step only if you want email-only delivery (see Appendix A).

1. Go to `https://twilio.com` → **Sign up** (email, password, phone verification).
2. After login you land on the **Console dashboard** — don't close this page yet. You'll see:
   - **Account SID** (long string starting with `AC...`)
   - **Auth Token** (hide it — copy it into your notes file for Step 5)
3. **Add funds** (required — trial accounts can't text real customers):
   - Console → **Billing** → **Add funds** → add ~$20. This covers ~2,000 texts at ~$0.008 each.
4. **Buy a phone number:**
   - Console → **Phone Numbers → Manage → Buy a number**.
   - Pick the **San Antonio / 210** area code if available (or any US number).
   - Cost: ~$1.15/month, billed from your balance.
5. **Upgrade from trial:**
   - Console → **Settings → Account info** → **Upgrade** and finish the quick verification.
   - Trial accounts can ONLY text numbers you manually verified; upgraded accounts can text any US number. You need the upgrade for this to work on real customers.

**Write down:** Account SID, Auth Token, and your new Twilio phone number. You'll paste all three into Make in Step 5.

---

## STEP 5 — Build the automation in Make.com (30 minutes)

We're using **Make** (formerly Integromat). Every module listed below has a field with the same name.

### 5a. Create your account
1. Go to `https://make.com` → sign up (Google sign-in is fastest).
2. Click **Create a new scenario**.
3. Name it: **Auto Google Review Request**.

### 5b. Module 1 — Google Sheets trigger
1. Click the **+** (or the empty module slot) → search **Google Sheets** → choose **Watch Rows**.
2. **Connect:** click **Add** → it opens Google sign-in → pick the Google account that owns your response Sheet → **Allow**.
3. **Fields:**
   - Spreadsheet: pick `How was your job (Responses)` (or whatever it's named).
   - Sheet: pick the tab name (usually `Sheet1` / `Form Responses 1`).
   - Table contains headers: **Yes**.
   - Limit to: `1` (process one new row per run).
4. Set the **schedule** (the clock icon at the bottom-left of the module):
   - Check the row in the Sheet every **1 minute** (free plan minimum). Don't worry about the "runs per month" number — Google Sheets rows only trigger when there's actually a new one.
5. Click **OK**. Make will now list the header names of your Sheet as fields (Rating, Phone number, Name, etc.) — this confirms the connection works.

### 5c. Module 2 — Router (splits happy vs unhappy)
1. Click the **+** after the Sheets module → search **Router** → **Add a router**.
2. The router creates two (or more) parallel paths. Now click the **+** under the router **path 1** and add the Twilio module; then click the **+** under **path 2** and add the email module. Build both branches below.

### 5d. Path 1 (rating 4–5) — Twilio SMS
1. **+** under router path 1 → search **Twilio** → **Send SMS** (or **Create a Message**).
2. **Connect:** click **Add** → enter your **Account SID** and **Auth Token** from Step 4 → **Save**.
3. **Fields:**
   - From: your Twilio phone number (format `+1210XXXXXXX`).
   - To: the **Phone number** field from your Google Sheet (`{{6.Your cell phone number...}}` or similar token). Make usually auto-inserts it.
   - Body:
     ```
     Hi {{Name}}, thanks for choosing Master Glass Solutions!
     If you're happy with your job, we'd love a quick Google review — it takes under a minute:
     https://g.page/r/CXXXXXXXXXXXX/review
     ```
     *(Replace the `g.page` link with YOUR link from Step 1.)*
4. Click **OK**.

### 5e. Path 2 (rating 1–3) — private alert to you
1. **+** under router path 2 → search **Email** → **Gmail** → **Send an Email** (connect your business Gmail, or use the generic **Email → Send an Email** with any SMTP you have).
2. **Fields:**
   - To: `masterglassllc@aol.com`
   - Subject: `Low rating alert — {{Name}} ({{Rating}})`
   - Content:
     ```
     A customer rated their job:

     Rating: {{Rating}}
     Name: {{Name}}
     Phone: {{Phone number}}
     Comments: {{Anything we should know about your job?}}

     Follow up BEFORE this turns into a public 1-star review.
     ```
3. Click **OK**.

### 5f. Route by rating
1. Click the **route 1** label (between the router and the Twilio module) — the gear/condition icon.
2. Set the filter condition: **Rating** → **Greater than or equal to** → `4`.
3. Click **OK**. (Route 2 gets the inverse automatically — everything below 4.)

### 5g. Save, name, activate
1. Click **Save** (bottom left), then the pencil to name the scenario: **Auto Google Review Request**.
2. Click the **schedule** toggle at the bottom so it shows **ON** (it must be running).
3. **Important — run it once manually first:** click **Run once**. It will sit at "Checking for updates." Wait ~30s. If it finds your test row, it'll light up green and send the SMS. Watch the Sheet test row get processed.

---

## STEP 6 — Test the whole system (5 minutes)

Do this before any real customer sees it.

1. Open your form link (from Step 2) in a private/incognito browser window.
2. Submit a **5 – Excellent** response with YOUR cell phone as the phone number.
3. Within ~1–2 minutes you should receive the SMS with the Google review link.
4. Tap the link → confirm it opens your business's review box.
5. Repeat with a **2 – Poor** response → within a minute you should get the **low rating alert** email at `masterglassllc@aol.com`, and NO text.
6. Delete the two test rows from the Sheet (right-click row → Delete) so real responses aren't confused with tests. Or clear them before you go live.

**If the SMS didn't arrive:** see Troubleshooting below.

---

## STEP 7 — Day-to-day use (your part, ~30 seconds per job)

After a job is finished and paid:

1. Text the customer the form link (from Step 2). Suggested wording:
   > "Hey {name}, thank you again for trusting Master Glass Solutions! Just a quick 30-second survey on how the job went — please: {form link}"
2. Done. Everything after they tap it is automatic:
   - happy → they get your Google review link by text
   - unhappy → you get a private alert and can call them to make it right

**Tips for higher review volume:**
- Send the form link the SAME DAY the job completes, while it's fresh.
- Attach it to the invoice/final payment confirmation so it's automatic even when you're busy.
- Say the survey is to "make sure everything is perfect" — you'll get more replies, and the public reviews follow.

---

## Compliance notes (read once)

- **Never offer money/gifts/discounts for a Google review.** Google will remove reviews and can suspend the profile.
- **Don't hand-pick only happy customers** to send the public link. Asking everyone through the gate keeps you compliant and still keeps negative feedback private.
- Don't ask customers to "edit" or "remove" a bad review.
- The rating question is framed as service feedback, not a review request — the Google review link only goes out on 4–5.

---

## Cost summary

| Item | Cost |
|------|------|
| Twilio phone number | ~$1.15/month |
| SMS (~100 texts/mo) | ~$0.80/month |
| Make.com (free plan) | $0 |
| Google Form + Sheets | $0 |
| **Total** | **~$2–5/month** |

Make's free plan gives 1,000 operations/month — more than enough for this. If you later outgrow it, upgrade or move to Zapier.

---

## Troubleshooting

**No SMS but email works / nothing fires at all**
- Make scenario must show the schedule toggle **ON**.
- Check the scenario **History** (tab on the left) — it shows the last run and which module errored. Click the red/yellow module for the error message.
- Sheets trigger needs a *new* row. A row that existed before you turned on the scenario won't fire — that's normal. Add a fresh test row.

**"Invalid 'To' phone number" error from Twilio**
- The Sheet phone field must be a full US number `(210) 555-1234` or `2105551234`. Twilio auto-formats US numbers; make sure there's no text mixed in (the validation rule in Q2 helps).

**"Invalid Account SID or Auth Token"**
- Copy the Auth Token again from the Twilio console — it's hidden by default (there's a "reveal" eye icon). Reconnect the Twilio module in Make.

**SMS shows as "undelivered"**
- You're on a Twilio **trial** account and the number isn't verified, or the balance ran out. Finish the **Upgrade** in Twilio Console → Settings → Account info, and keep ~$10+ in balance.

**Form shows "submit another response"**
- Turn it OFF in the form's Settings → Presentation (Step 2). If you missed it, customers can spam duplicates.

**Customer says the review link is broken**
- Open the `g.page` link incognito. If GBP isn't fully verified, the link 404s. Re-verify the profile, then re-copy the link from "Get more reviews."

---

## Appendix A — Email-only version (skip Twilio)

If you don't want to pay for SMS, swap the Twilio module for a second **Email** module:

- **Path 1 (4–5):** Email to customer → subject `Thanks!` → body = your Google review link. Requires you to collect their email in the form (add an optional "Email" question) — or have them fill their email in the form.
- **Path 2 (1–3):** Same private alert as above.

Email converts worse than SMS (nobody checks), so SMS is strongly recommended — but this path costs $0/mo.

---

## Appendix B — Optional: add a /review page to the site

If you want a branded landing page to put the form link on (nicer for text messages), ask the dev to add a `/review` page to the site that embeds or redirects to the Google Form link. Short link like `https://www.mgsusa.llc/review` is easy for customers to type/click.
