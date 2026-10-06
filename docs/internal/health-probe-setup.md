# Health probe email — setup

**One environment variable.** Everything else is already deployed.

`HEALTH_PROBE_EMAIL` is what turns the daily funnel check from *"a key is
configured"* into *"a message actually arrived"*. Those are different claims,
and the gap between them is where the lead-email outage lived: `RESEND_API_KEY`
was set the whole time, and sends were still being rejected at the API.

---

## Why it has to be a separate address

The probe performs a **real Resend send** every day at 14:00 UTC. It must not
go to the owner's inbox — `masterglassllc@aol.com` would get a fake quote
request daily, and a monitor that trains the owner to ignore mail from the site
is worse than no monitor.

Use an address that is:

- **real** — it has to accept mail, or the probe reports a bounce as a failure
- **checked occasionally**, not constantly
- **not the lead inbox**

A Gmail plus-alias is the easiest thing that satisfies all three:
`you+mgs-probe@gmail.com` delivers to your normal inbox and can be filtered
straight to a label, so the daily message is on the record without being in
the way.

---

## Set it

1. Vercel → project **`mgsusa-llc`** → **Settings** → **Environment Variables**
2. Add:

   | Field | Value |
   |---|---|
   | Key | `HEALTH_PROBE_EMAIL` |
   | Value | the probe address |
   | Environments | **Production** (Preview too if you want preview deploys to send) |
   | Type | Plain |

3. **Redeploy.** Serverless functions read environment variables at cold start,
   so the running deployment will not pick this up on its own. Either push a
   commit or use Redeploy on the latest production deployment.

---

## Confirm it took

Open:

```
https://www.mgsusa.llc/api/health-check
```

(Still open to anyone — `CRON_SECRET` is unset. Setting it is a separate item.)

**Before:** the funnel row says

> Delivery was not exercised: set HEALTH_PROBE_EMAIL to have the probe send a
> real message.

**After:** the row reports an actual send status, and a `[probe] quote funnel
check` message lands at the probe address within a minute.

If the funnel row instead reports a status of 400 or higher, that is the
monitor doing its job — read `emailError`, which carries Resend's own words
about why the send was refused.

---

## What this does not change

- **No lead is recorded.** The probe skips `recordLeadPulse()`, so a daily
  probe never resets the lead-drought clock. A drought alert still means no
  real customer wrote in.
- **The owner is not emailed.** `sendEmail(mail, overrideTo)` sends the probe
  to the override address only; `LEAD_NOTIFICATION_EMAIL` is untouched.
- **Nothing is written to Blob.** `submit-quote` does not upload photos —
  that is `blob-upload.js`, on a separate client-token path.
- **The check stays silent when healthy.** `health-check` only emails the
  owner on failure.

---

## Still outstanding, separately

- `CRON_SECRET` — unset, so `/api/health-check` is open to the public. Fine for
  a preview, not for production.
