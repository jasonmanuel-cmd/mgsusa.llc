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

## CSS architecture

- `assets/design-tokens.css` — design tokens (colors, type, spacing, motion). Single source of truth for values.
- `assets/styles.css` — flattened, deduplicated source stylesheet (one rule per line).
- `assets/styles.min.css` — what pages load; regenerate from styles.css by stripping newlines.

Edit styles.css, then regenerate the min file. Do not append overrides to the min file directly.
