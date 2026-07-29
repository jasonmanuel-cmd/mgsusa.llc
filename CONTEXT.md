# Context: MGS USA / Master Glass Site

## Project Overview
Static marketing website for **MGS USA, LLC** — a commercial glass and glazing contractor serving San Antonio, TX and surrounding areas (20+ cities). Built as a static site with a Python build script (`build_site.py`) that injects content into templates.

## Ubiquitous Language

| Term | Definition |
|------|------------|
| **Service Area** | A specific city/town (e.g., "San Antonio", "New Braunfels") with its own landing page (`{city}-tx.html`) |
| **Service Line** | A category of work: Storefront Glass, Shower Enclosures, Residential Glass, Window Replacement, Mirrors |
| **Quote Request** | Lead capture form submitted via `request-quote.html` → `thank-you.html` |
| **City Page** | SEO-optimized landing page for a specific service area, generated from template + JSON data |
| **Build Script** | `build_site.py` — generates all HTML pages from templates + data files |
| **Template** | Base HTML structure with `{{PLACEHOLDERS}}` replaced at build time |

## Cross-Cutting Concerns
- **SEO/GEO**: Every city page needs unique title, meta description, JSON-LD LocalBusiness schema, and `llms.txt` entry
- **Performance**: Images must be WebP, lazy-loaded, with proper `srcset`; target LCP < 2.5s
- **Accessibility**: WCAG 2.2 AA — contrast ratios, focus order, ARIA labels on forms, semantic HTML
- **Lead Capture**: All CTAs route to `request-quote.html` with `?service=` and `?location=` query params preserved
- **Schema.org**: `LocalBusiness`, `Service`, `AreaServed`, `Review` markup on every page

## Key Data Files
- `data/services.json` — canonical list of service lines + descriptions
- `data/cities.json` — all service areas with metadata (population, county, nearby cities)
- `data/reviews.json` — testimonials for schema markup
- `templates/*.html` — Jinja2-style templates (processed by `build_site.py`)

## Build & Deploy
- `python build_site.py` → outputs to `dist/`
- Deployed to Vercel (static hosting) via `vercel.json` rewrites
- `robots.txt` + `sitemap.xml` generated at build time
- `llms.txt` maintained manually at root