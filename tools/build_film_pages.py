#!/usr/bin/env python3
"""Build the three commercial window-film service pages from an existing one.

Generated rather than hand-written because a service page here is ~36 KB of
minified HTML carrying five JSON-LD blocks, the site header, the mobile nav,
the footer, GTM, HubSpot, Vercel Analytics, Simple Analytics and the motion
layer. Hand-copying that three times is how a page ends up with a stale
canonical pointing at the page it was copied from -- which search engines
honour, so the new page never ranks and nobody can see why.

The donor is storefront-glass.html. Everything structural comes from it
verbatim: header, nav, footer, scripts, and the business JSON-LD block, which
describes the company and is identical site-wide. Only the page-specific parts
are authored here.

Two deliberate honesty constraints, both worth keeping if this is re-run:

  * The project carousel is kept but retitled "Recent commercial projects".
    Its 13 photos are real glazing jobs with accurate captions. Re-captioning
    them as film or tint work would be inventing a portfolio, and the whole
    reason the review markup in this repo is wired the way it is, is that
    claiming work you cannot show is the thing that costs trust. Replace the
    slides with real film photos when there are some -- via the
    add-project-photos skill, not by hand.

  * Every page says plainly that this is building glass only, no vehicles.
    "Window tint" is overwhelmingly an auto-glass search term, so the tint
    page will attract that traffic whether or not it wants it. Saying no on
    the page, in the FAQ and in the JSON-LD costs one sentence and saves the
    phone calls that can never be served -- the same reason the GBP kit
    refuses to add an auto category.

Usage: build_film_pages.py [--apply]
"""

import io
import json
import re
import sys

DONOR = 'storefront-glass.html'
BASE = 'https://www.mgsusa.llc'


# --------------------------------------------------------------------------
# Page content. Prose matches the donor's register: plain, declarative,
# explains the trade-off rather than selling past it.
# --------------------------------------------------------------------------

PAGES = [
    {
        'slug': 'commercial-security-film',
        'hero_img': 'Commercial3',
        'og_img': 'Commercial3.jpg',
        'title': 'Commercial Security Window Film | San Antonio &amp; Boerne',
        'description': ('Safety and security window film for San Antonio & Boerne commercial '
                        'buildings. Fragment retention and forced-entry delay. Call (210) 370-3700.'),
        'eyebrow': 'SECURITY WINDOW FILM • SAN ANTONIO + BOERNE',
        'h1': 'Commercial Security Window Film in San Antonio &amp; Boerne, TX',
        'hero_p': ('Security film does not make glass unbreakable, and anyone who tells you it does '
                   'is selling something. What it does is hold a broken pane together in its frame '
                   '&mdash; long enough to turn a two-second smash into a noisy, conspicuous minute.'),
        'service_type': 'Security Window Film Installation',
        'service_name': 'Commercial Security Window Film',
        'at_a_glance_h2': 'What is security window film?',
        'lead': ('Security window film is a thick optically clear polyester laminate bonded to the '
                 'interior face of glass you already have. The glass still breaks. The film keeps '
                 'the fragments bonded to one another and, where an attachment system is used, keeps '
                 'the whole pane anchored to the frame.'),
        'body_p': ('It is installed on existing glazing, so it is usually the least disruptive option '
                   'for an occupied building &mdash; no frame work, no glass order, no opening left '
                   'unsecured overnight. We install on commercial buildings only: storefronts, offices, '
                   'clinics, schools and industrial properties. No vehicle glass of any kind.'),
        'when_items': [
            'Your storefront or ground-floor glass has been hit before, or sits somewhere that invites it.',
            'You want to slow a smash-and-grab without bars, roll shutters or replacing the glazing.',
            'A tenant agreement, insurer or corporate standard calls for glass retention.',
            'You need fragment containment in an occupied space &mdash; lobby, clinic, classroom or office.',
        ],
        'steps': [
            ('Share the essentials', 'Tell us the property, roughly how many panes, their approximate '
                                     'sizes, and what you are protecting against &mdash; break-in, '
                                     'storm debris or injury from flying glass. Those lead to different films.'),
            ('Align on the scope', 'We confirm thickness, whether an attachment system is warranted, '
                                   'and the condition of the existing frames and glazing beads, which '
                                   'decide what the film can actually be anchored to.'),
            ('Install with the building running', 'Most film work happens around occupancy rather than '
                                                  'shutting a space down. We agree access and sequence '
                                                  'before anyone arrives.'),
        ],
        'cost_lead': ('Security film cost is driven more by thickness and anchoring than by area. '
                      'A 4 mil safety film and a 14 mil film with a wet-glaze attachment system are '
                      'different products doing different jobs, at different prices.'),
        'cost_body': ('Pane count and size, working height, frame condition, and whether the glass is '
                      'annealed, tempered or insulated all move the number. Share photos and rough '
                      'dimensions and the first conversation can be specific rather than theoretical.'),
        'faq': [
            ('Does security film make glass bulletproof?',
             'No. Security film is not ballistic glazing and should never be sold as it. It is a '
             'delay and containment product: the glass still breaks, but it stays together and stays '
             'in the frame, which turns a quick smash-and-grab into a slow, loud, visible effort that '
             'most people abandon. If you need genuine ballistic protection, that is a different '
             'product and a different budget, and we will say so.'),
            ('Do you install security film on vehicles?',
             'No. Master Glass Solutions works on buildings only &mdash; commercial and residential '
             'property. We do not install film on cars, trucks, windshields or any vehicle glass, and '
             'we do not offer mobile auto service.'),
            ('How long does security film last?',
             'Interior-applied film on commercial glazing is generally expected to last well over a '
             'decade, and manufacturers warrant it in that range. Exposure, orientation and glass '
             'type all matter. Failure usually shows as edge lift or haze long before the film stops '
             'doing its job.'),
        ],
        'cta_h2': 'Let&rsquo;s talk about what your glass actually needs to resist.',
        'cta_p': ('Send the property details and a few photos, or call and describe the opening. '
                  'If film is the wrong answer for your situation, we will tell you that too.'),
        'related': [
            ('/commercial-window-tint', 'Commercial window tint', 'Solar and glare control for the same glass.'),
            ('/commercial-glass', 'Commercial glass', 'Glazing, storefronts and architectural glass.'),
            ('/commercial-quote', 'Commercial estimate', 'Send property and project details through.'),
        ],
    },
    {
        'slug': 'commercial-window-tint',
        'hero_img': 'Commercial5',
        'og_img': 'Commercial5.jpg',
        'title': 'Commercial Window Tinting | San Antonio &amp; Boerne, TX',
        'description': ('Commercial window tinting for San Antonio & Boerne buildings &mdash; heat, '
                        'glare and UV control. Buildings only, no auto glass. Call (210) 370-3700.'),
        'eyebrow': 'COMMERCIAL WINDOW TINT • SAN ANTONIO + BOERNE',
        'h1': 'Commercial Window Tinting in San Antonio &amp; Boerne, TX',
        'hero_p': ('A west-facing glass wall in a South Texas summer is a heating element. Solar '
                   'control film cuts the heat and glare coming through the glass you already have, '
                   'without touching the glazing itself.'),
        'service_type': 'Commercial Window Tinting',
        'service_name': 'Commercial Window Tinting',
        'at_a_glance_h2': 'What is commercial window tint?',
        'lead': ('Commercial window tint &mdash; properly, solar control film &mdash; is a thin '
                 'coated film applied to existing glass to reject solar heat, cut glare and block '
                 'effectively all UV. It is the cheapest way to change how a building handles the '
                 'sun short of replacing the glazing.'),
        'body_p': ('We install on commercial and residential buildings only. We do not tint cars, '
                   'trucks or any vehicle glass &mdash; that is a different trade with different '
                   'film, different law and different tooling, and sending you to a building glazier '
                   'for it would waste your afternoon.'),
        'when_items': [
            'West or south elevations are cooking in the afternoon and the HVAC cannot keep up.',
            'Glare is making screens unreadable, or a retail display unviewable.',
            'Merchandise, flooring or artwork is fading from UV through the glass.',
            'You want a more uniform exterior appearance across a mixed or patched facade.',
        ],
        'steps': [
            ('Share the essentials', 'Tell us the building, which elevations are the problem, roughly '
                                     'how much glass, and whether the issue is heat, glare, fading or '
                                     'appearance. Those point at different films.'),
            ('Align on the film', 'Visible light, heat rejection and reflectivity trade against each '
                                  'other &mdash; you cannot max all three. We will tell you which one '
                                  'you are actually buying and what it costs the others.'),
            ('Install around occupancy', 'Film goes on the interior face, so work is scheduled around '
                                         'how the building is used rather than closing it.'),
        ],
        'cost_lead': ('Tint cost tracks the film grade and the difficulty of reaching the glass far '
                      'more than the square footage. A ground-floor storefront run and a fourth-floor '
                      'curtain wall are not the same job.'),
        'cost_body': ('Film type, total area, working height, the number of separate panes, and the '
                      'existing glass make-up all matter. Photos of the elevations and a rough pane '
                      'count make the first conversation a real one.'),
        'faq': [
            ('Do you tint car windows?',
             'No. Master Glass Solutions is an architectural glass contractor and works on buildings '
             'only. We do not tint cars, trucks, windshields or any vehicle glass, and we do not '
             'offer mobile auto service. For a vehicle you want an auto tint shop, not us.'),
            ('Will window film make the offices dark?',
             'Not necessarily. Spectrally selective films reject a large share of solar heat while '
             'passing most of the visible light, so a space can get substantially cooler without '
             'getting noticeably dimmer. Darker and more reflective films reject more heat for less '
             'money &mdash; the trade is appearance and daylight, which is a decision worth making '
             'deliberately rather than discovering afterwards.'),
            ('Can window film crack my glass?',
             'It can, and it is worth understanding before you buy. Film changes how a pane absorbs '
             'solar energy, and on some combinations &mdash; particularly annealed glass in certain '
             'sizes, or units already carrying a flaw or an edge chip &mdash; that raises the risk of '
             'thermal stress fracture. Matching the film to the glass make-up is the part that '
             'prevents it, which is why we ask what the existing glazing is before quoting.'),
        ],
        'cta_h2': 'Let&rsquo;s get the sun under control.',
        'cta_p': ('Tell us which elevations are the problem and roughly how much glass is involved. '
                  'Buildings only &mdash; for vehicle glass, an auto tint shop is the right call.'),
        'related': [
            ('/commercial-security-film', 'Security window film', 'Fragment retention and forced-entry delay.'),
            ('/perforated-window-graphics', 'Perforated window graphics', 'One-way vision film for storefronts.'),
            ('/commercial-quote', 'Commercial estimate', 'Send property and project details through.'),
        ],
    },
    {
        'slug': 'perforated-window-graphics',
        'hero_img': 'Storefront1',
        'og_img': 'Commercial2.jpg',
        'title': 'Perforated Window Graphics &amp; Film | San Antonio Storefronts',
        'description': ('Perforated one-way vision window graphics for San Antonio & Boerne '
                        'storefronts. Advertise outside, see out from inside. Call (210) 370-3700.'),
        'eyebrow': 'PERFORATED WINDOW GRAPHICS • SAN ANTONIO + BOERNE',
        'h1': 'Perforated Window Graphics for San Antonio Storefronts',
        'hero_p': ('Perforated film turns a shop window into a billboard from the pavement and leaves '
                   'it a window from the inside. The trick is the holes: roughly half the material is '
                   'not there at all.'),
        'service_type': 'Perforated Window Graphics Installation',
        'service_name': 'Perforated Window Graphics',
        'at_a_glance_h2': 'What is perforated window film?',
        'lead': ('Perforated window film &mdash; often called one-way vision film &mdash; is a printed '
                 'vinyl punched through with a regular pattern of small holes, typically around half '
                 'the surface area. From outside, where it is bright, the eye reads the printed '
                 'graphic. From inside, where it is darker, the eye reads straight through the holes.'),
        'body_p': ('It is how a storefront can carry full-window advertising without blinding the '
                   'staff or hiding the shop. Applied to commercial building glass only &mdash; '
                   'storefronts, offices and retail frontage. Not vehicle glass.'),
        'when_items': [
            'You want full-window branding without giving up daylight or the view out.',
            'A ground-floor office needs daytime privacy while keeping an outward view.',
            'A vacant or fitting-out unit needs to look intentional rather than empty.',
            'Seasonal or promotional graphics need to go up and come down without damaging the glass.',
        ],
        'steps': [
            ('Share the essentials', 'Send the storefront photos, the opening dimensions, and what the '
                                     'graphic needs to do &mdash; sell something, screen a view, or '
                                     'dress a unit that is not open yet.'),
            ('Confirm artwork and coverage', 'We measure the glass, confirm which panes are getting '
                                             'film, and coordinate the printed artwork to the measured '
                                             'sizes rather than to a drawing.'),
            ('Install and check it from the street', 'The only test that counts is how it reads from '
                                                     'the pavement in daylight, so that is where we '
                                                     'check it before leaving.'),
        ],
        'cost_lead': ('Perforated graphics cost is mostly print area and install complexity. Coverage, '
                      'the number of separate panes, and whether existing film has to come off first '
                      'are the main drivers.'),
        'cost_body': ('Artwork that already exists at the right size costs less than artwork that has '
                      'to be built. Send the storefront photos and the rough dimensions, and say '
                      'whether you have print-ready files.'),
        'faq': [
            ('Can people see in through perforated window film?',
             'During the day, very little &mdash; the exterior is brighter, so the printed surface '
             'dominates and the holes read as part of the image. After dark the relationship reverses: '
             'with interior lights on and the street dark, the film becomes much easier to see through '
             'from outside. It is a daytime privacy product, not a blackout, and anyone who tells you '
             'otherwise has not stood outside one at night.'),
            ('Will it damage the glass or the frames?',
             'No. It is applied to the interior or exterior face with a pressure-sensitive adhesive '
             'and is removable. Seasonal and promotional graphics come down without harming properly '
             'maintained glazing. Very old or already-damaged film can leave adhesive behind, which '
             'is a cleaning job rather than a glass one.'),
            ('Do you handle the printed artwork?',
             'We measure the glass and coordinate the print to those measurements, which is the step '
             'that stops a graphic arriving at the wrong size for the opening it has to fit. If you '
             'have print-ready files, send them with the enquiry. If you do not, say so and we will '
             'talk through what is needed before anything goes to print.'),
        ],
        'cta_h2': 'Let&rsquo;s make the window work harder.',
        'cta_p': ('Send storefront photos and rough dimensions. We will come back on coverage, '
                  'artwork and what it reads like from the street.'),
        'related': [
            ('/commercial-window-tint', 'Commercial window tint', 'Heat and glare control for the same glass.'),
            ('/storefront-glass', 'Storefront glass', 'Repair and replacement of the glazing itself.'),
            ('/commercial-quote', 'Commercial estimate', 'Send property and project details through.'),
        ],
    },
]


# --------------------------------------------------------------------------
# Section builders
# --------------------------------------------------------------------------

ARROW = ('<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
         'stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>')
TICK = ('<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        'stroke-width="2"><path d="m5 13 4 4L19 7"/></svg>')
PHONE = ('<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
         'stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg>')
EB = '<span></span>'


def quote_url(p):
    """Where this page's CTAs send people.

    The film pages are commercial-only, so they all go to /commercial-quote and
    that stays the default. A page serving both markets -- glass railings, for
    one -- must be able to point at the general form instead, or half its
    visitors land on a form asking for property-management details they do not
    have.
    """
    return p.get('quote_url', '/commercial-quote')


def hero(p):
    img = p['hero_img']
    return (
        '<section class="inner-hero">'
        '<div class="inner-hero-image">'
        '<picture>'
        f'<source type="image/webp" srcset="assets/{img}-sm.webp 800w, assets/{img}.webp 1400w" '
        'sizes="(max-width: 600px) 260px, (max-width: 900px) 700px, 1400px">'
        f'<img src="assets/{img}.webp" srcset="assets/{img}-sm.webp 800w, assets/{img}.webp 1400w" '
        'sizes="(max-width: 600px) 260px, (max-width: 900px) 700px, 1400px" '
        'alt="Master Glass Solutions project photo" aria-hidden="true" width="1400" height="1050" '
        'fetchpriority="high" decoding="async">'
        '</picture></div>'
        '<div class="shell inner-hero-content">'
        f'<p class="eyebrow">{EB}{p["eyebrow"]}</p>'
        f'<h1>{p["h1"]}</h1>'
        f'<p>{p["hero_p"]}</p>'
        '<div class="hero-actions">'
        f'<a class="btn btn-light" href="{quote_url(p)}">Request a quote {ARROW}</a>'
        f'<a class="btn btn-ghost" href="tel:2103703700">{PHONE} Call 210-370-3700</a>'
        '</div></div></section>'
    )


def answer(p):
    return (
        '<section class="section answer-section"><div class="shell answer-grid"><div>'
        f'<p class="eyebrow">{EB}AT A GLANCE</p><h2>{p["at_a_glance_h2"]}</h2>'
        '</div><div>'
        f'<p class="lead">{p["lead"]}</p><p>{p["body_p"]}</p>'
        f'<a class="text-link" href="{quote_url(p)}">Tell us about your project {ARROW}</a>'
        '</div></div></section>'
    )


def when_how(p):
    items = ''.join(f'<li>{TICK}{t}</li>' for t in p['when_items'])
    steps = ''.join(
        f'<li><span>0{i+1}</span><div><h3>{h}</h3><p>{b}</p></div></li>'
        for i, (h, b) in enumerate(p['steps'])
    )
    return (
        '<section class="section section-cream"><div class="shell split-info">'
        f'<div class="when-block"><p class="eyebrow">{EB}WHEN YOU MAY NEED THIS</p>'
        f'<h2>Start here when&hellip;</h2><ul class="check-list">{items}</ul></div>'
        f'<div class="how-block"><p class="eyebrow">{EB}HOW IT WORKS</p>'
        f'<h2>A clearer next step.</h2><ol class="compact-steps">{steps}</ol></div>'
        '</div></section>'
    )


def related(p):
    cards = ''.join(
        f'<a class="related-service" href="{href}"><h3>{title}</h3><p>{desc}</p>'
        f'<span>{ARROW}</span></a>'
        for href, title, desc in p['related']
    )
    return (
        '<section class="section related-section"><div class="shell">'
        f'<div class="section-heading split-heading"><p class="eyebrow">{EB}RELATED GLASS SERVICES</p>'
        '<div><h2>The right answer may be part of a bigger scope.</h2>'
        '<p>Explore the focused service page that matches the work in front of you.</p></div></div>'
        f'<div class="related-grid">{cards}</div></div></section>'
    )


def cost(p):
    return (
        '<section class="section cost-section"><div class="shell cost-grid"><div>'
        f'<p class="numbered">COST</p><p class="eyebrow">{EB}ESTIMATE CONTEXT</p>'
        '<h2>What influences the investment?</h2></div><div>'
        f'<p class="lead">{p["cost_lead"]}</p><p>{p["cost_body"]}</p>'
        f'<a class="btn btn-dark" href="{quote_url(p)}">Request a tailored quote {ARROW}</a>'
        '</div></div></section>'
    )


def faq_section(p):
    items = ''.join(
        f'<details><summary>{q}<span>+</span></summary>'
        f'<div class="faq-answer"><p>{a}</p></div></details>'
        for q, a in p['faq']
    )
    return (
        '<section class="section faq-section"><div class="shell faq-layout"><div>'
        f'<p class="eyebrow">{EB}FAQ</p><h2>Service questions, answered directly.</h2>'
        '<p class="section-intro">These answers provide a fast starting point before you reach out.</p>'
        f'<a class="text-link" href="/faq">See every question {ARROW}</a></div>'
        f'<div class="faq-list">{items}</div></div></section>'
    )


def final_cta(p):
    return (
        '<section class="section final-cta"><div class="final-rule"></div>'
        '<div class="shell final-cta-grid"><div>'
        f'<p class="eyebrow">{EB}MASTER GLASS SOLUTIONS</p><h2>{p["cta_h2"]}</h2></div><div>'
        f'<p>{p["cta_p"]}</p><div class="hero-actions">'
        f'<a class="btn btn-light" href="{quote_url(p)}">Start your quote {ARROW}</a>'
        f'<a class="btn btn-ghost" href="tel:2103703700">{PHONE} Call 210-370-3700</a>'
        '</div></div></div></section>'
    )


# --------------------------------------------------------------------------
# Assembly
# --------------------------------------------------------------------------

def strip_tags(s):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s)).strip()


def unescape_min(s):
    return (s.replace('&amp;', '&').replace('&mdash;', '—')
             .replace('&rsquo;', '’').replace('&hellip;', '…')
             .replace('&lt;', '<').replace('&gt;', '>'))


def build(donor, p):
    url = f'{BASE}/{p["slug"]}'
    out = donor

    # ---- head meta -------------------------------------------------------
    out = re.sub(r'<title>.*?</title>', f'<title>{p["title"]}</title>', out, count=1, flags=re.S)
    out = re.sub(r'(<meta name="description" content=")[^"]*(")',
                 lambda m: m.group(1) + unescape_min(p['description']) + m.group(2), out, count=1)
    out = re.sub(r'(<link rel="canonical" href=")[^"]*(")',
                 lambda m: m.group(1) + url + m.group(2), out, count=1)
    out = re.sub(r'(<meta property="og:title" content=")[^"]*(")',
                 lambda m: m.group(1) + p['title'] + m.group(2), out, count=1)
    out = re.sub(r'(<meta property="og:description" content=")[^"]*(")',
                 lambda m: m.group(1) + unescape_min(p['description']) + m.group(2), out, count=1)
    out = re.sub(r'(<meta property="og:url" content=")[^"]*(")',
                 lambda m: m.group(1) + url + m.group(2), out, count=1)
    out = out.replace(f'{BASE}/assets/og/Commercial2.jpg', f'{BASE}/assets/og/{p["og_img"]}')

    # ---- JSON-LD ---------------------------------------------------------
    # Parsed and re-serialised rather than string-patched: these blocks are the
    # part a search engine reads literally, and a regex that half-updates one
    # produces valid JSON making false claims.
    def fix_ld(m):
        raw = m.group(1)
        d = json.loads(raw)
        t = d.get('@type')
        if t == 'Service':
            d['@id'] = f'{url}#service'
            d['name'] = unescape_min(p['service_name'])
            d['description'] = unescape_min(p['lead'] and strip_tags(p['lead']))
            d['url'] = url
            d['serviceType'] = p['service_type']
        elif t == 'BreadcrumbList':
            for it in d.get('itemListElement', []):
                if it.get('position') == 2:
                    it['name'] = unescape_min(p['service_name'])
                    it['item'] = url
        elif t == 'FAQPage':
            d['mainEntity'] = [{
                '@type': 'Question',
                'name': unescape_min(strip_tags(q)),
                'acceptedAnswer': {'@type': 'Answer', 'text': unescape_min(strip_tags(a))},
            } for q, a in p['faq']]
            if isinstance(d.get('potentialAction'), dict) and 'target' in d['potentialAction']:
                d['potentialAction']['target'] = url
        elif t == 'WebPage':
            d['@id'] = f'{url}#webpage'
            d['url'] = url
            d['name'] = unescape_min(strip_tags(p['h1']))
            if isinstance(d.get('about'), dict):
                d['about']['name'] = unescape_min(p['service_name'])
        else:
            return m.group(0)          # the business block: identical site-wide
        return m.group(0).replace(raw, json.dumps(d, ensure_ascii=False))

    out = re.sub(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', fix_ld, out, flags=re.S)

    # ---- body sections ---------------------------------------------------
    main_start = out.index('<main id="main">')
    main_end = out.index('</main>')
    body = out[main_start:main_end]

    slide_start = body.index('<section class="section section-cream project-slideshow-section">')
    slide_end = body.index('<section class="section answer-section">')
    slideshow = body[slide_start:slide_end]
    # Retitled, not re-captioned. See the module docstring.
    slideshow = slideshow.replace('<h2>Recent storefront installations.</h2>',
                                  '<h2>Recent commercial projects.</h2>')
    slideshow = slideshow.replace('aria-label="Recent storefront projects"',
                                  'aria-label="Recent commercial projects"')

    new_main = ('<main id="main">' + hero(p) + slideshow + answer(p) + when_how(p)
                + related(p) + cost(p) + faq_section(p) + final_cta(p))
    return out[:main_start] + new_main + out[main_end:]


def main():
    apply_changes = '--apply' in sys.argv
    donor = io.open(DONOR, encoding='utf-8').read()

    for p in PAGES:
        html = build(donor, p)
        path = p['slug'] + '.html'

        checks = []
        if f'{BASE}/{p["slug"]}' not in html:
            checks.append('canonical missing')
        if html.count('<h1>') != 1:
            checks.append(f'{html.count("<h1>")} h1 tags')
        if 'storefront-glass' in html and p['slug'] != 'storefront-glass':
            # a link to it is fine; a canonical or og:url pointing at it is not
            for bad in (f'canonical" href="{BASE}/storefront-glass"',
                        f'og:url" content="{BASE}/storefront-glass"'):
                if bad in html:
                    checks.append('inherited the donor URL')
        for m in re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', html, re.S):
            try:
                json.loads(m)
            except Exception as e:
                checks.append(f'invalid JSON-LD: {e}')

        status = 'ERROR: ' + '; '.join(checks) if checks else 'ok'
        print(f'  {path:36} {len(html):>7,} bytes  {status}')
        if checks:
            return 1
        if apply_changes:
            io.open(path, 'w', encoding='utf-8').write(html)

    print(f'\n{"WROTE" if apply_changes else "DRY RUN"}: {len(PAGES)} page(s)')
    if not apply_changes:
        print('Re-run with --apply.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
