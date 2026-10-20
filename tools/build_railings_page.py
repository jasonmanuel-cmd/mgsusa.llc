#!/usr/bin/env python3
"""Build glass-railings.html.

Glass railings were listed as a service on the Google Business Profile and in
the profile description, and the owner confirms they do the work -- but the
site had no page for it, so the listing pointed at a service nothing on the
site backed up. This is the page.

It reuses build_film_pages.py's section builders rather than copying them. A
service page here is ~36 KB of minified HTML carrying five JSON-LD blocks, the
header, the mobile nav, the footer, GTM, HubSpot, Vercel Analytics, Simple
Analytics and the motion layer. The thing that goes wrong when you hand-copy
one is a stale canonical pointing at the page you copied from, which search
engines honour, so the new page never ranks and nobody can see why.

Two differences from the film pages, both deliberate:

  * CTAs go to /request-quote, not /commercial-quote. Railings are residential
    as often as commercial -- a stair, a balcony, a pool surround -- and
    sending a homeowner to a commercial property form asks them for details
    they do not have. That is what quote_url() in build_film_pages.py exists
    for.

  * The hero photo is generic and so is its alt text. There are no photographs
    of this company's glass railings on hand; the one slideshow image captioned
    "Balcony rail and window glazing detail" is a metal picket rail, not glass.
    Using it here would be claiming a portfolio that does not exist, which is
    the same line the film pages refused to cross with their carousel. Replace
    the hero with a real railing photo when there is one -- through the
    add-project-photos skill, not by hand.

The code claims are the load-bearing part of this page and are deliberately
hedged to what is generally true under the IBC/IRC as adopted in Texas, with
the authority having jurisdiction named as the decider. Guard heights, the
4-inch sphere and the laminated-glass requirement are real and standard, but
the adopted edition and local amendments vary by jurisdiction, and a service
page that states a local code requirement as settled fact is how someone ends
up building to the wrong number.

NOTE: run this BEFORE any script that appends to the page, and never re-run it
afterwards. build() rebuilds <main> from the donor, so re-running it discards
anything a later script added -- that is how a re-run of build_film_pages.py
silently deleted the three diagrams add_film_diagrams.py had put in.

Usage: build_railings_page.py [--apply]
"""

import io
import json
import re
import sys

import build_film_pages as film

DONOR = 'storefront-glass.html'
BASE = 'https://www.mgsusa.llc'

PAGE = {
    'slug': 'glass-railings',
    'quote_url': '/request-quote',
    'hero_img': 'Commercial2',
    'og_img': 'Commercial2.jpg',
    'title': 'Glass Railings &amp; Balustrades | San Antonio &amp; Boerne, TX',
    'description': ('Glass railings and balustrades for stairs, balconies and mezzanines in '
                    'San Antonio & Boerne, TX. Code-compliant laminated glass. Call (210) 370-3700.'),
    'eyebrow': 'GLASS RAILINGS • SAN ANTONIO + BOERNE',
    'h1': 'Glass Railings &amp; Balustrades in San Antonio &amp; Boerne, TX',
    'hero_p': ('A glass guard holds people back from a drop while keeping the view and the light. '
               'That makes it a structural element first and a design choice second &mdash; which '
               'is why the glass make-up matters more than the finish.'),
    'service_type': 'Glass Railing Installation',
    'service_name': 'Glass Railings',
    'at_a_glance_h2': 'What is a glass railing?',
    'lead': ('A glass railing &mdash; a balustrade or guard &mdash; uses glass panels in place of '
             'pickets or solid infill to stop a fall at a stair, balcony, landing or mezzanine. '
             'The panel is doing structural work, so it is specified the way a structural element '
             'is: by load, by span, and by what happens when it breaks.'),
    'body_p': ('Systems differ mainly in how the glass is held. A base shoe channel grips the '
               'bottom edge and leaves the glass otherwise uninterrupted. Standoff fittings pin '
               'panels to a face or a stringer. Post-and-panel systems carry the load in the posts '
               'and let the glass infill. They are not interchangeable &mdash; each one asks '
               'something different of the structure behind it. We work on buildings, residential '
               'and commercial. No vehicle glass of any kind.'),
    'when_items': [
        'A stair, landing, balcony or mezzanine needs a guard and you do not want to lose the view.',
        'An existing rail has failed inspection, or a glass panel has cracked or come loose.',
        'You are opening up a dark stairwell and the rail is what is blocking the light.',
        'A deck or pool surround needs a barrier that will survive weather and sun.',
    ],
    'steps': [
        ('Share the essentials', 'Tell us where the guard goes, the run length, the drop below it, '
                                 'and what the glass would be fixed to &mdash; concrete, steel, '
                                 'timber framing or an existing stringer. The substrate decides '
                                 'more about the system than the look does.'),
        ('Agree the system and the glass', 'We confirm the fixing method, the panel make-up and the '
                                           'hardware, and establish what the authority having '
                                           'jurisdiction requires for that location. Where a '
                                           'project needs engineered drawings, that is established '
                                           'before anything is ordered rather than after.'),
        ('Template, fabricate, install', 'Glass guards are made to the opening, not cut on site, '
                                         'so the measure has to be right before fabrication '
                                         'starts. Panels arrive finished and are set and anchored '
                                         'to the agreed detail.'),
    ],
    'cost_lead': ('Railing cost is driven by the fixing system and the glass make-up far more than '
                  'by the length of the run. A post-and-panel guard and a frameless base-shoe guard '
                  'over the same twenty feet are different products at different prices.'),
    'cost_body': ('Panel size and thickness, the interlayer, the hardware finish, the number of '
                  'corners and gates, working height, and what the substrate will actually accept '
                  'all move the number. Exterior runs ask more of the hardware than interior ones. '
                  'Photos, the run length and the drop below make the first conversation a real one.'),
    'faq': [
        ('What glass is used in a railing, and why does it matter?',
         'Guards are generally built from laminated glass &mdash; two or more plies bonded to an '
         'interlayer &mdash; rather than a single tempered pane. The reason is what happens on '
         'failure. Tempered glass is strong, but when a monolithic tempered panel does break it '
         'breaks all at once into granules, and a guard that disappears is no longer a guard. '
         'Laminated glass holds the broken plies to the interlayer so the panel stays in the '
         'opening while it is replaced. Where a top rail is absent, that distinction is usually '
         'the difference between a code-compliant guard and one that is not.'),
        ('How tall does a glass railing have to be?',
         'Commercial guards are commonly 42 inches, residential guards commonly 36, measured from '
         'the walking surface, and a guard is generally required once there is more than a 30-inch '
         'drop. Openings are typically limited so a 4-inch sphere cannot pass through. Treat those '
         'as the shape of the requirement rather than the answer for your project: the adopted code '
         'edition and local amendments vary, and the authority having jurisdiction is who decides. '
         'We confirm it for the specific location before anything is fabricated.'),
        ('Do glass railings show every fingerprint?',
         'They show more than a picket rail, and anyone who says otherwise has not lived with one. '
         'Interior panels need about what a shower door needs. Exterior panels in this area are '
         'mostly fighting hard water spotting from sprinklers and rain, which etches if it is left '
         'long enough. It is routine glass cleaning, not special treatment, but it is honest to say '
         'it is more than a metal rail asks for.'),
        ('Can you replace one cracked panel instead of the whole run?',
         'Usually yes, and it is normally the right call. Panels in a run are made to the same '
         'spec, so a single damaged one can generally be swapped without touching the rest. The '
         'thing that decides it is whether the original make-up and hardware can still be matched '
         '&mdash; send a photo of the failure and the fixing detail and that is answerable quickly.'),
    ],
    'cta_h2': 'Let&rsquo;s get the guard specified properly.',
    'cta_p': ('Send the run length, the drop below it and a photo of what the glass would fix to. '
              'If a glass guard is the wrong answer for the location, we will say so.'),
    'related': [
        ('/commercial-glass', 'Commercial glass', 'Glazing, storefronts and architectural glass.'),
        ('/custom-glass', 'Custom glass', 'Purpose-built glass for non-standard openings.'),
        ('/glass-types', 'Glass types', 'Tempered, laminated, insulated and low-E compared.'),
    ],
}


def main():
    apply_changes = '--apply' in sys.argv
    donor = io.open(DONOR, encoding='utf-8').read()
    html = film.build(donor, PAGE)
    path = PAGE['slug'] + '.html'
    url = f'{BASE}/{PAGE["slug"]}'

    checks = []
    if url not in html:
        checks.append('canonical missing')
    if html.count('<h1>') != 1:
        checks.append(f'{html.count("<h1>")} h1 tags')
    for bad in (f'canonical" href="{BASE}/storefront-glass"',
                f'og:url" content="{BASE}/storefront-glass"'):
        if bad in html:
            checks.append('inherited the donor URL')
    # The CTA override is the whole reason this script exists separately; if it
    # silently fell back to the commercial form the page would still look fine.
    if '/commercial-quote' in html.split('<main id="main">')[1].split('</main>')[0]:
        checks.append('a CTA still points at /commercial-quote')
    if html.count('href="/request-quote"') < 4:
        checks.append(f'only {html.count(chr(34) + "/request-quote" + chr(34))} request-quote CTAs')
    for m in re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', html, re.S):
        try:
            json.loads(m)
        except Exception as e:
            checks.append(f'invalid JSON-LD: {e}')

    status = 'ERROR: ' + '; '.join(checks) if checks else 'ok'
    print(f'  {path:28} {len(html):>7,} bytes  {status}')
    if checks:
        return 1
    if apply_changes:
        io.open(path, 'w', encoding='utf-8').write(html)
        print('\nWROTE 1 page. Now run wire_railings_page.py --apply.')
    else:
        print('\nDRY RUN -- re-run with --apply.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
