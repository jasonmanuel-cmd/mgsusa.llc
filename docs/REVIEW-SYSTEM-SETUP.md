# Archived: Legacy Google Review Setup

> **Do not use this guide to configure review requests.** This retired plan used
> rating-based routing that withheld the public Google review link from some
> customers. It has been superseded by the neutral, all-customer invitation
> implemented in the Follow-Up Desk.

The old Make/Twilio/Google Forms instructions are retained no longer. The
current system is implemented in this repository:

- `api/followup-add.js` sends the private satisfaction request.
- `api/review-submit.js` emails the same optional Google review invitation for
  every rating, stores private ratings/comments, and independently alerts the
  owner about low ratings or any written comment.
- `followup-desk.html` and `assets/js/followup-desk.js` display responses and
  flag failed private-feedback alerts.
- `docs/FOLLOW-UP-DESK-DESIGN.md` documents the current flow, setup and testing.

Never use a private satisfaction score to block, delay, or selectively route a
customer's Google review invitation. Do not offer incentives for reviews.
