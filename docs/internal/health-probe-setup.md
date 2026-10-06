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

## If it still says "Delivery was not exercised"

**Read the `deployment` block first — it tells you which of the two causes it is.**
`/api/health-check` now reports:

```json
"deployment": {
  "env": "production",
  "commit": "fc9ae30",
  "configured": { "probeEmail": false, "cronSecret": false,
                  "droughtDays": 30, "droughtRepeatDays": 30 }
}
```

- `commit` is not the commit you expected → **production is serving an older
  deployment.** The variable is irrelevant until that is fixed; re-checking it
  will waste your time. Promote or redeploy to production.
- `commit` matches and `probeEmail` is `false` → **the variable genuinely is not
  reaching the function.** Now the three causes below apply.
- `probeEmail` is `true` but the funnel row still says delivery was not
  exercised → the two functions somehow see different environments, which should
  not happen in one deployment. Worth reporting rather than working around.

It reports names and booleans only, never values: the endpoint is public while
`CRON_SECRET` is unset, and a test asserts the address is never echoed.

That string is only reachable when `process.env.HEALTH_PROBE_EMAIL` is empty in
the function serving the live site. In order of likelihood:

1. **The redeploy did not land on production.** A preview redeploy, or one that
   was never promoted, leaves the production alias pointing at the old
   deployment. The production one carries a **Current** badge in Deployments.
2. **The variable is not targeting Production.** The env list shows which
   environments each variable applies to.
3. **Typo in the key.** `process.env.HEALTH_PROBE_EMAIL` is an exact match — a
   trailing space or `HEALTH_PROBE_MAIL` reads as unset.

To see what production actually has, hit the probe directly and skip
`health-check` entirely:

```bash
curl -s https://www.mgsusa.llc/api/submit-quote \
  -H 'Content-Type: application/json' \
  -d '{"kind":"quote","probe":true,"first-name":"Health","last-name":"Check",
       "email":"health-check@mgsusa.llc","phone":"210-370-3700",
       "service":"commercial-glass","location":"San Antonio, TX",
       "timeline":"planning","details":"Automated funnel probe. Not a real request.",
       "consent":true,"page":"/api/health-check"}'
```

`emailChecked:false` means the variable is not reaching the function.
`emailChecked:true` with a status means it works, and `health-check` was
reading a stale deployment.

---

## Still outstanding, separately

- `CRON_SECRET` — unset, so `/api/health-check` is open to the public. Fine for
  a preview, not for production.
