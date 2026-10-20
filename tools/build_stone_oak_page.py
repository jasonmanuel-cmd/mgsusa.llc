#!/usr/bin/env python3
"""Build stone-oak-tx.html.

Stone Oak is on the Google Business Profile's service area and is the closest
and most affluent area on it -- roughly five and a half miles from the office,
dense, and full of the houses that buy frameless shower enclosures. It had no
landing page, while Stockdale (41 miles out, under 1,500 people) had one. The
service-area list cannot rank for "frameless shower doors Stone Oak"; a page
can.

Donor is timberwood-park-tx.html: the nearest analogue in the set, another
master-planned area on the far north side with the same large-house glass mix,
so the structural markup and the section pattern carry over unchanged.

What is authored here rather than find-replaced
-----------------------------------------------
A city page built by substituting one town name for another is a duplicate with
extra steps, and `tools/content_uniqueness.py` exists precisely because these
21 pages were already 57% identical to their nearest sibling. So the two
`city-depth` sections, the hero paragraph, the meta description and the FAQ
answers are written for Stone Oak specifically. Run content_uniqueness.py after
this and the new page should not be the most duplicated one in the set.

The honesty constraints from deepen_city_pages.py apply unchanged:

  IN   Conditions that genuinely change the glass work and can be checked --
       that Stone Oak sits over the Edwards Aquifer recharge zone on hilly
       limestone, that it is master-planned and mostly built from the 1990s
       onward so the housing stock is newer and dimensionally predictable but
       large, and that master-planned communities here are generally
       HOA-governed, which matters the moment anyone wants film or tint on a
       street-facing window.

  OUT  Population figures, invented jobs, invented customers, and any claim
       about a specific neighbourhood or builder that cannot be stood behind.
       The owner reads these pages.

One thing this page says that no other city page does: Stone Oak is part of
San Antonio, not a separate municipality. That is true, it is the first thing
someone comparing it to Boerne or Seguin needs to know, and it is why the page
points at san-antonio-tx rather than treating it as a peer town.

Usage: build_stone_oak_page.py [--apply]
"""

import io
import json
import re
import sys

DONOR = 'timberwood-park-tx.html'
SLUG = 'stone-oak-tx'
BASE = 'https://www.mgsusa.llc'
NAME = 'Stone Oak'
LAT, LON = 29.6286, -98.4861

TITLE = 'Glass Services in Stone Oak, San Antonio | Master Glass Solutions'
DESC = ('Glass services in Stone Oak, San Antonio - frameless shower enclosures, custom '
        'mirrors, window glass replacement and 24/7 emergency repair. Call (210) 370-3700.')

HERO_P = ('Stone Oak sits a few minutes north of our office, which makes it one of the '
          'easiest parts of the city for us to reach &mdash; for a measured shower '
          'enclosure or for a broken pane that cannot wait until morning.')

DEPTH = [
    ('section section-cream city-depth', 'WHAT WE SEE HERE',
     'Newer houses, bigger glass.',
     'Stone Oak was master-planned and built out largely from the 1990s onward, so the '
     'openings are dimensionally predictable in a way the older established '
     'neighbourhoods closer in are not. What they are not is small: two-storey entries '
     'with transoms above the door, wide rear elevations facing the greenbelt, and '
     'three or four bathrooms that are candidates for frameless enclosures.',
     'Predictable sizing helps with ordering. It does not help with handling. Past '
     'certain spans the thickness goes up, the weight decides what the hardware has to '
     'carry, and getting the piece from the street into the room becomes a real part of '
     'the job &mdash; which on the hillside lots up here is worth talking about before '
     'anyone quotes a price.'),
    ('section city-depth', 'HARD WATER',
     'Why the shower glass clouds.',
     'San Antonio draws from the Edwards Aquifer, and the water comes out of it hard '
     '&mdash; around fifteen to twenty grains per gallon. Stone Oak sits directly over '
     'the recharge zone. That mineral load is what leaves shower glass looking permanently '
     'hazy after a couple of years, and it is not dirt: it has etched into the surface.',
     'It is the single most common reason we are asked to replace enclosure glass that '
     'is structurally perfectly sound. Worth knowing before that happens, because a '
     'protective coating applied at installation and a squeegee kept in the shower cost '
     'almost nothing next to new glass.'),
]

FAQ = [
    ('Does Master Glass Solutions provide glass services in Stone Oak?',
     'Yes. Stone Oak is part of San Antonio and sits a short drive north of our office '
     'on Loop 1604, which makes it one of the quicker areas for us to reach for both '
     'scheduled work and emergency call-outs. We cover frameless shower enclosures, '
     'custom mirrors, window glass replacement, table tops, glass railings and 24/7 '
     'emergency board-up. Buildings only &mdash; no auto glass.'),
    ('Do I need HOA approval before changing exterior glass in Stone Oak?',
     'Often, yes. Most of the master-planned communities up here are HOA-governed, and '
     'while replacing a broken pane with matching glass is usually treated as '
     'maintenance, anything that changes how the window looks from the street &mdash; '
     'window film, tint, a different glass type &mdash; frequently needs approval first. '
     'Check your own covenants before ordering, because the approval is the slow part, '
     'not the glass.'),
    ('How do I get a quote for a shower enclosure in Stone Oak?',
     'Send the bathroom dimensions and a few photos showing the tile, the walls and the '
     'threshold, and say whether you are after frameless or framed. Photos answer most '
     'of what we would otherwise have to come out and ask. If you have several bathrooms '
     'in mind, list them all in the first message &mdash; one visit can measure the lot '
     'and the glass gets fabricated together, which is cheaper and faster than separate '
     'call-outs.'),
    ('Is emergency glass support available in Stone Oak?',
     'Yes, 24 hours a day, seven days a week, including weekends and holidays. Call '
     '210-370-3700 and say what broke, where it is and whether the opening is currently '
     'secure. We board up to make the property safe and come back with replacement '
     'glass.'),
]

NEARBY = [('San Antonio', '/san-antonio-tx'),
          ('Timberwood Park', '/timberwood-park-tx'),
          ('Boerne', '/boerne-tx')]


def depth_section(cls, eyebrow, h2, lead, body):
    return (f'<section class="{cls}"><div class="shell answer-grid"><div>'
            f'<p class="eyebrow"><span></span>{eyebrow}</p><h2>{h2}</h2></div><div>'
            f'<p class="lead">{lead}</p><p>{body}</p></div></div></section>')


def strip(s):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s)).replace('&mdash;', '—').strip()


def build(src):
    out = src
    url = f'{BASE}/{SLUG}'

    # ---- plain name substitution first, then the authored parts overwrite ----
    out = out.replace('timberwood-park-tx', SLUG)
    # The hero eyebrow carries the town name in literal capitals -- it is not a
    # CSS text-transform -- so a title-case replace alone leaves
    # "GLASS SERVICES IN TIMBERWOOD PARK, TX" sitting above the h1, which is
    # exactly what happened the first time this ran. Do the caps first.
    out = out.replace('TIMBERWOOD PARK', NAME.upper())
    out = out.replace('Timberwood Park', NAME)

    # ---- head ----
    out = re.sub(r'<title>.*?</title>', f'<title>{TITLE}</title>', out, count=1, flags=re.S)
    out = re.sub(r'(<meta name="description" content=")[^"]*(")',
                 lambda m: m.group(1) + DESC + m.group(2), out, count=1)
    out = re.sub(r'(<meta property="og:title" content=")[^"]*(")',
                 lambda m: m.group(1) + TITLE + m.group(2), out, count=1)
    out = re.sub(r'(<meta property="og:description" content=")[^"]*(")',
                 lambda m: m.group(1) + DESC + m.group(2), out, count=1)

    # ---- JSON-LD: parse and re-serialise, never string-patch ----
    def fix(m):
        raw = m.group(1)
        d = json.loads(raw)
        t = d.get('@type')
        if t == 'Place':
            # The Place is the area; its geo must match its own hasMap. Setting
            # it to the office is the exact mistake fix_place_geo.py repairs.
            d['name'] = f'{NAME}, San Antonio, TX'
            d['geo'] = {'@type': 'GeoCoordinates', 'latitude': LAT, 'longitude': LON}
            d['hasMap'] = f'https://maps.google.com/?q={LAT},{LON}'
        elif t == 'LocalBusiness':
            d['description'] = (f'Glass services in {NAME}, San Antonio, TX. Residential '
                                'and commercial glass installation, repair, and 24/7 '
                                'emergency support.')
            d['areaServed'] = {'@type': 'City', 'name': 'San Antonio'}
        elif t == 'FAQPage':
            d['mainEntity'] = [{'@type': 'Question', 'name': strip(q),
                                'acceptedAnswer': {'@type': 'Answer', 'text': strip(a)}}
                               for q, a in FAQ]
        else:
            return m.group(0).replace(raw, json.dumps(d, ensure_ascii=False))
        return m.group(0).replace(raw, json.dumps(d, ensure_ascii=False))

    out = re.sub(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', fix, out, flags=re.S)

    # ---- hero paragraph ----
    out = re.sub(r'(<h1>[^<]*</h1>)<p>.*?</p>', lambda m: m.group(1) + f'<p>{HERO_P}</p>',
                 out, count=1, flags=re.S)

    # ---- the two city-depth sections, authored not substituted ----
    blocks = list(re.finditer(r'<section class="section (?:section-cream )?city-depth">.*?</section>',
                              out, re.S))
    if len(blocks) != len(DEPTH):
        raise SystemExit(f'expected {len(DEPTH)} city-depth sections, found {len(blocks)}')
    for b, spec in zip(reversed(blocks), reversed(DEPTH)):
        out = out[:b.start()] + depth_section(*spec) + out[b.end():]

    # ---- visible FAQ ----
    items = ''.join(f'<details><summary>{q}<span>+</span></summary>'
                    f'<div class="faq-answer"><p>{a}</p></div></details>' for q, a in FAQ)
    out = re.sub(r'(<div class="faq-list">).*?(</div></div></section>)',
                 lambda m: m.group(1) + items + m.group(2), out, count=1, flags=re.S)

    # ---- nearby areas ----
    # The donor's neighbours are Boerne, Comfort and Canyon Lake: 20, 36 and 27
    # miles from here and all on the wrong side of town for Stone Oak. The
    # markup is .nearby-grid > a.nearby-city, NOT the .related-grid pattern the
    # service pages use -- getting that wrong leaves the donor's list in place
    # with no error, which is what happened the first time.
    arrow = ('<svg aria-hidden="true" viewBox="0 0 24 24">'
             '<path d="M5 12h13M13 6l6 6-6 6"/></svg>')
    cards = ''.join(f'<a class="nearby-city" href="{h}"><span>{n}, TX</span>{arrow}</a>'
                    for n, h in NEARBY)
    out, n = re.subn(r'(<section class="section nearby-areas">.*?<div class="nearby-grid">).*?(</div>)',
                     lambda m: m.group(1) + cards + m.group(2), out, count=1, flags=re.S)
    if n != 1:
        raise SystemExit('nearby-areas block not found -- check the markup pattern')
    return out


def main():
    apply_changes = '--apply' in sys.argv
    out = build(io.open(DONOR, encoding='utf-8').read())
    path = SLUG + '.html'
    url = f'{BASE}/{SLUG}'

    errs = []
    if f'canonical" href="{url}"' not in out:
        errs.append('canonical wrong')
    if out.count('<h1>') != 1:
        errs.append(f'{out.count("<h1>")} h1 tags')
    # The donor's name must not survive anywhere -- except in the nearby-areas
    # block, where Timberwood Park is a legitimate neighbour of Stone Oak and
    # linking to it is the point.
    without_nearby = re.sub(r'<section class="section nearby-areas">.*?</section>', '',
                            out, flags=re.S)
    if re.search(r'timberwood', without_nearby, re.I):
        where = re.search(r'.{70}timberwood.{70}', without_nearby, re.S | re.I)
        errs.append(f'donor name survived: ...{strip(where.group(0)) if where else ""}...')
    for m in re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', out, re.S):
        try:
            d = json.loads(m)
        except Exception as e:
            errs.append(f'invalid JSON-LD: {e}'); continue
        if d.get('@type') == 'Place':
            g, hm = d['geo'], d['hasMap']
            if f'{g["latitude"]},{g["longitude"]}' not in hm:
                errs.append('Place geo does not match hasMap')
        if d.get('@type') == 'LocalBusiness':
            if d['geo']['latitude'] != 29.5604:
                errs.append('LocalBusiness geo is not the office')
            if 'Bldg 5' not in d['address']['streetAddress']:
                errs.append('address is not the verified one')
    for want in ('call-tracking.js', 'motion.js?v=5', 'motion.css?v=5', 'sw-register.js'):
        if want not in out:
            errs.append(f'missing {want}')

    # The nearby list must be the one authored above, not whatever the donor
    # happened to carry. Asserted because the failure is invisible on the page.
    block = re.search(r'<section class="section nearby-areas">.*?</section>', out, re.S)
    got = re.findall(r'nearby-city" href="([^"]*)"', block.group(0)) if block else []
    if got != [h for _, h in NEARBY]:
        errs.append(f'nearby areas are {got}, wanted {[h for _, h in NEARBY]}')

    print(f'  {path:22} {len(out):>7,} bytes  ' + ('ERROR: ' + '; '.join(errs) if errs else 'ok'))
    if errs:
        return 1
    if apply_changes:
        io.open(path, 'w', encoding='utf-8').write(out)
        print('\nWROTE 1 page. Now run wire_stone_oak_page.py --apply.')
    else:
        print('\nDRY RUN -- re-run with --apply.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
