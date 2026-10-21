#!/usr/bin/env python3
"""Build the city landing pages that were missing from the north and west side.

Generalised from build_stone_oak_page.py once it was clear three more were
wanted. Writing a fourth near-duplicate script to make pages that must not be
near-duplicates would have been its own joke.

Why these four
--------------
Lining the Google Business Profile's service areas up against the site's city
pages showed the pages were aimed at the wrong towns. Seven profile areas had
no page; eight pages existed for towns the profile did not claim -- and every
town in the first group is closer to the office than every town in the second.
Stone Oak is 5.5 miles out, affluent and dense, and had no page; Stockdale is
41 miles out with under 1,500 people and had one. These four are the closest
and highest-value of the unbacked seven.

    stone-oak         5.5 mi   part of San Antonio
    alamo-ranch      12.7 mi   part of San Antonio
    bulverde         13.5 mi   its own city, Comal County
    fair-oaks-ranch  14.1 mi   its own city

Donor is timberwood-park-tx.html for all four: another large-house area on the
same side of town, so the structure carries over without edits.

The content is authored, not substituted
----------------------------------------
A city page made by swapping one town name for another is a duplicate with
extra steps, and tools/content_uniqueness.py exists because these pages were
already 57% identical to their nearest sibling. Each page's hero, two
city-depth sections, meta description and four FAQ answers are written for that
place, around something that genuinely changes the glass work there:

    Stone Oak        newer master-planned stock, large openings; Edwards
                     recharge zone hard water etching shower glass
    Alamo Ranch      the newest stock of the four, so upgrades rather than
                     repairs; brutal west-facing afternoon sun
    Bulverde         acreage, long driveways and gate access for oversized
                     glass; wide spans framing Hill Country views
    Fair Oaks Ranch  1970s-90s housing, so failed insulated units fogging
                     between the panes; golf-course frontage and ball strikes

The honesty constraints from deepen_city_pages.py apply unchanged: no
population figures, no invented jobs or customers, no claim about a specific
builder or street that cannot be stood behind. The owner reads these pages.

Two traps this generator already fell into, both now asserted against
---------------------------------------------------------------------
* The nearby-areas markup is .nearby-grid > a.nearby-city, NOT the
  .related-grid pattern the service pages use. A non-matching regex is not an
  error, so the first run silently kept the donor's neighbours -- 20 to 36
  miles away and on the wrong side of town -- and the page looked fine.
* The hero eyebrow carries the town name in literal capitals, so a title-case
  replace left "GLASS SERVICES IN TIMBERWOOD PARK, TX" above the h1 of a page
  about Stone Oak. Every automated check passed; it was caught by looking at
  the rendered screenshot.

Usage: build_city_pages.py [--apply] [slug ...]
"""

import io
import json
import re
import sys

DONOR = 'timberwood-park-tx.html'
DONOR_NAME = 'Timberwood Park'
DONOR_SLUG = 'timberwood-park-tx'
BASE = 'https://www.mgsusa.llc'

PAGES = [
    {
        'slug': 'stone-oak-tx', 'name': 'Stone Oak', 'parent': 'San Antonio',
        'lat': 29.6286, 'lon': -98.4861,
        'title': 'Glass Services in Stone Oak, San Antonio | Master Glass Solutions',
        'desc': ('Glass services in Stone Oak, San Antonio - frameless shower enclosures, '
                 'custom mirrors, window glass replacement and 24/7 emergency repair. '
                 'Call (210) 370-3700.'),
        'hero': ('Stone Oak sits a few minutes north of our office, which makes it one of '
                 'the easiest parts of the city for us to reach &mdash; for a measured '
                 'shower enclosure or for a broken pane that cannot wait until morning.'),
        'depth': [
            ('WHAT WE SEE HERE', 'Newer houses, bigger glass.',
             'Stone Oak was master-planned and built out largely from the 1990s onward, so '
             'the openings are dimensionally predictable in a way the older established '
             'neighbourhoods closer in are not. What they are not is small: two-storey '
             'entries with transoms above the door, wide rear elevations facing the '
             'greenbelt, and three or four bathrooms that are candidates for frameless '
             'enclosures.',
             'Predictable sizing helps with ordering. It does not help with handling. Past '
             'certain spans the thickness goes up, the weight decides what the hardware has '
             'to carry, and getting the piece from the street into the room becomes a real '
             'part of the job &mdash; which on the hillside lots up here is worth talking '
             'about before anyone quotes a price.'),
            ('HARD WATER', 'Why the shower glass clouds.',
             'San Antonio draws from the Edwards Aquifer, and the water comes out of it '
             'hard &mdash; around fifteen to twenty grains per gallon. Stone Oak sits '
             'directly over the recharge zone. That mineral load is what leaves shower '
             'glass looking permanently hazy after a couple of years, and it is not dirt: '
             'it has etched into the surface.',
             'It is the single most common reason we are asked to replace enclosure glass '
             'that is structurally perfectly sound. Worth knowing before that happens, '
             'because a protective coating applied at installation and a squeegee kept in '
             'the shower cost almost nothing next to new glass.'),
        ],
        'faq': [
            ('Does Master Glass Solutions provide glass services in Stone Oak?',
             'Yes. Stone Oak is part of San Antonio and sits a short drive north of our '
             'office on Loop 1604, which makes it one of the quicker areas for us to reach '
             'for both scheduled work and emergency call-outs. We cover frameless shower '
             'enclosures, custom mirrors, window glass replacement, table tops, glass '
             'railings and 24/7 emergency board-up. Buildings only &mdash; no auto glass.'),
            ('Do I need HOA approval before changing exterior glass in Stone Oak?',
             'Often, yes. Most of the master-planned communities up here are HOA-governed, '
             'and while replacing a broken pane with matching glass is usually treated as '
             'maintenance, anything that changes how the window looks from the street '
             '&mdash; window film, tint, a different glass type &mdash; frequently needs '
             'approval first. Check your own covenants before ordering, because the '
             'approval is the slow part, not the glass.'),
            ('How do I get a quote for a shower enclosure in Stone Oak?',
             'Send the bathroom dimensions and a few photos showing the tile, the walls and '
             'the threshold, and say whether you are after frameless or framed. Photos '
             'answer most of what we would otherwise have to come out and ask. If you have '
             'several bathrooms in mind, list them all in the first message &mdash; one '
             'visit can measure the lot and the glass gets fabricated together, which is '
             'cheaper and faster than separate call-outs.'),
            ('Is emergency glass support available in Stone Oak?',
             'Yes, 24 hours a day, seven days a week, including weekends and holidays. Call '
             '210-370-3700 and say what broke, where it is and whether the opening is '
             'currently secure. We board up to make the property safe and come back with '
             'replacement glass.'),
        ],
        'nearby': [('San Antonio', '/san-antonio-tx'),
                   ('Timberwood Park', '/timberwood-park-tx'),
                   ('Boerne', '/boerne-tx')],
    },
    {
        'slug': 'alamo-ranch-tx', 'name': 'Alamo Ranch', 'parent': 'San Antonio',
        'lat': 29.4830, 'lon': -98.7230,
        'title': 'Glass Services in Alamo Ranch, San Antonio | Master Glass Solutions',
        'desc': ('Glass services on the far west side of San Antonio - frameless shower '
                 'upgrades, custom mirrors, window glass replacement, solar film and 24/7 '
                 'emergency repair. Call (210) 370-3700.'),
        'hero': ('Alamo Ranch is the newest housing stock we work in, which changes what we '
                 'get called for. Far less failed old glazing, far more upgrades &mdash; '
                 'and a great deal of west-facing glass taking the full afternoon.'),
        'depth': [
            ('WHAT WE SEE HERE', 'New enough that nothing has failed yet.',
             'Out past Loop 1604 at Culebra the houses are recent, so the glass is almost '
             'all still original and still doing its job. That shifts the work: the calls '
             'are rarely about a window that has given up, and usually about wanting '
             'something better than the builder put in &mdash; a framed shower swapped for '
             'frameless, a proper mirror instead of the builder sheet glued to the wall, a '
             'glass table top cut for a specific base.',
             'It also means the openings are production sizes rather than one-offs, so '
             'replacement glass is more often orderable to a standard dimension than cut to '
             'a measured opening. That tends to make the work quicker and cheaper here than '
             'the same job in an older part of town.'),
            ('WEST-FACING GLASS', 'Afternoon sun on this side of town.',
             'A west elevation in a South Texas summer takes everything the sun has, and on '
             'the far west side there is very little mature tree cover to take the edge off '
             'it. Rooms behind that glass get unusable in the afternoon, screens become '
             'unreadable, and flooring and furnishings fade from UV coming straight through '
             'the pane.',
             'Solar control film goes on the glass already in the opening and cuts the heat '
             'and glare without replacing the glazing, which is far cheaper than new units. '
             'Buildings only, residential and commercial &mdash; never vehicles. Worth '
             'checking your HOA covenants first, because film changes how a window reads '
             'from the street.'),
        ],
        'faq': [
            ('Do you work in Alamo Ranch and the far west side?',
             'Yes. It is a straight run out Loop 1604 from our office and we work the whole '
             'west side, including Alamo Ranch, Westover Hills and the surrounding '
             'subdivisions. Frameless shower enclosures, custom mirrors, window glass '
             'replacement, glass table tops, solar film and 24/7 emergency board-up. '
             'Buildings only &mdash; no auto glass of any kind.'),
            ('My shower is the builder-standard framed one. Can it be made frameless?',
             'Usually, and it is the most common request we get out here. The deciding '
             'factors are the opening size, whether the tile and the walls are plumb enough '
             'to carry frameless hardware, and what is behind the tile to anchor into. Send '
             'photos of the whole enclosure including the threshold and the ceiling line, '
             'and we can tell you quickly whether it is straightforward or whether the '
             'opening needs work first.'),
            ('Will window film make the house too dark?',
             'Not necessarily. Spectrally selective films reject a large share of the solar '
             'heat while letting most of the visible light through, so a west-facing room '
             'can get substantially cooler without getting noticeably dimmer. Darker and '
             'more reflective films reject more heat for less money and take the daylight '
             'with them. That is a trade worth making deliberately rather than discovering '
             'after it is on the glass.'),
            ('Is emergency glass support available on the west side?',
             'Yes, 24 hours a day, seven days a week. Call 210-370-3700 and tell us what '
             'broke, where it is and whether the opening is currently secure. We board up '
             'first so the property is safe, then come back with the replacement glass.'),
        ],
        'nearby': [('San Antonio', '/san-antonio-tx'),
                   ('Helotes', '/helotes-tx'),
                   ('Leon Valley', '/leon-valley-tx')],
    },
    {
        'slug': 'bulverde-tx', 'name': 'Bulverde', 'parent': None,
        'lat': 29.7441, 'lon': -98.4572,
        'title': 'Glass Services in Bulverde, TX | Master Glass Solutions',
        'desc': ('Glass services in Bulverde, TX - frameless shower enclosures, large view '
                 'glass, custom mirrors, window replacement and 24/7 emergency repair. '
                 'Call (210) 370-3700.'),
        'hero': ('Bulverde is acreage country, and that changes two things about glass work: '
                 'the openings are bigger because of what they are framing, and getting a '
                 'large piece to the house is part of the job rather than an afterthought.'),
        'depth': [
            ('WHAT WE SEE HERE', 'Openings built around a view.',
             'Properties out here are not laid out to a subdivision grid, and the glass '
             'follows. Wide rear elevations and tall window walls exist to frame the Hill '
             'Country, which means spans well past anything a production house carries and '
             'very often a size nobody stocks.',
             'Past certain dimensions the thickness has to go up, the weight changes what '
             'the frame and the hardware are being asked to carry, and the piece has to be '
             'cut to the measured opening rather than ordered. That is a different '
             'conversation from replacing a standard pane, and it is better had before '
             'anything is fabricated.'),
            ('ACCESS', 'The driveway is part of the quote.',
             'Long private drives, gates, cattle guards, slopes and a good distance from '
             'the road to the actual opening are normal here. For a standard pane none of '
             'that matters. For an oversized piece of glass it decides how many people are '
             'needed, what equipment comes along, and occasionally whether the piece goes '
             'in through the opening rather than through the house.',
             'Mentioning the approach in the first message &mdash; gate width, drive '
             'surface, how close a vehicle can get to the room &mdash; is what keeps a '
             'measured quote from changing on the day. It is the single most useful thing '
             'someone on acreage can tell us up front.'),
        ],
        'faq': [
            ('Do you cover Bulverde and the surrounding acreage?',
             'Yes. Bulverde is a short run north of our office up US-281 and we cover the '
             'town and the properties around it, including the larger lots off the main '
             'roads. Residential and commercial glass, frameless shower enclosures, custom '
             'mirrors, large view glass, glass railings and 24/7 emergency board-up. '
             'Buildings only &mdash; no auto glass.'),
            ('Can you replace a very large window pane?',
             'Usually, and it is routine work for us. What decides it is the span, the '
             'glass make-up the opening needs, and the access to get the piece there. '
             'Above certain sizes the glass gets thicker and heavier, which changes the '
             'crew and sometimes the equipment. Send the rough dimensions, a photo of the '
             'opening from inside and out, and a note on how close a vehicle can park.'),
            ('Does being on well water change anything for shower glass?',
             'It can. Groundwater in this part of the Hill Country is generally hard, and '
             'hard water is what leaves shower glass permanently hazy &mdash; the minerals '
             'etch into the surface rather than sitting on it. A protective coating applied '
             'at installation slows that down considerably. If the property has a softener '
             'the problem is much smaller, so it is worth saying either way when you ask '
             'for a quote.'),
            ('Is emergency glass support available in Bulverde?',
             'Yes, 24 hours a day, seven days a week, including weekends and holidays. Call '
             '210-370-3700 and say what broke, where the property is and whether the '
             'opening is secure. We board up to make it safe and return with replacement '
             'glass. Tell us about gate codes or a locked drive when you call, because that '
             'is what otherwise costs an hour.'),
        ],
        'nearby': [('Timberwood Park', '/timberwood-park-tx'),
                   ('Stone Oak', '/stone-oak-tx'),
                   ('Canyon Lake', '/canyon-lake-tx')],
    },
    {
        'slug': 'fair-oaks-ranch-tx', 'name': 'Fair Oaks Ranch', 'parent': None,
        'lat': 29.7430, 'lon': -98.6381,
        'title': 'Glass Services in Fair Oaks Ranch, TX | Master Glass Solutions',
        'desc': ('Glass services in Fair Oaks Ranch, TX - failed insulated glass units, '
                 'frameless shower enclosures, custom mirrors and 24/7 emergency repair. '
                 'Call (210) 370-3700.'),
        'hero': ('Fair Oaks Ranch has been built out since the 1970s, which makes it the '
                 'oldest housing stock in our northern service area &mdash; and the place '
                 'we most often find insulated glass units that have quietly given up.'),
        'depth': [
            ('WHAT WE SEE HERE', 'Windows old enough to have failed.',
             'Double-pane units are two sheets of glass with a sealed cavity between them. '
             'The seal has a service life, and on houses built from the 1970s through the '
             '1990s a good number of them have reached it. When a seal fails, moisture gets '
             'into the cavity and the unit fogs or streaks from the inside &mdash; where no '
             'amount of cleaning will ever reach it.',
             'The frame is usually fine. It is the sealed unit inside it that needs '
             'replacing, which is a far smaller job than replacing the window, and the one '
             'people most often assume they cannot have done separately. If a pane looks '
             'permanently misty or has tide marks between the glass, that is what you are '
             'looking at.'),
            ('GOLF COURSE FRONTAGE', 'Glass that gets hit.',
             'Properties backing onto the course take the occasional ball, and a struck '
             'pane does not always break on the spot. Tempered glass can carry a chip or an '
             'impact point for a long time before it finally goes, and when it does go it '
             'goes all at once.',
             'Worth getting a look at rather than leaving. The same applies to the large '
             'rear elevations facing the fairway, where the glass is both the most exposed '
             'and the most expensive to replace. Mature oak cover is the other half of it '
             '&mdash; limbs come down in a storm and land on exactly that glass.'),
        ],
        'faq': [
            ('Do you serve Fair Oaks Ranch?',
             'Yes. Fair Oaks Ranch sits between our office and Boerne, so it is well inside '
             'the area we cover daily. Residential and commercial glass, failed insulated '
             'unit replacement, frameless shower enclosures, custom mirrors, glass railings '
             'and 24/7 emergency board-up. Buildings only &mdash; no auto glass.'),
            ('My window is foggy between the panes. Can that be fixed?',
             'The sealed unit has failed and moisture is inside the cavity, so it cannot be '
             'cleaned &mdash; but in most cases the glass unit can be replaced while the '
             'existing frame and sash stay exactly where they are. That is a much smaller '
             'and cheaper job than a new window, and it is the one most people are '
             'surprised is available. Send a photo and the rough dimensions and we can tell '
             'you what is involved.'),
            ('A golf ball hit my window but it did not break. Does it matter?',
             'It can. An impact can leave a chip or a stress point that holds for months '
             'and then fails without warning, and tempered glass fails completely rather '
             'than cracking politely. If the strike is on a large or hard-to-reach pane it '
             'is worth having looked at while it is still a scheduled job rather than an '
             'emergency one.'),
            ('Is emergency glass support available in Fair Oaks Ranch?',
             'Yes, 24 hours a day, seven days a week, including weekends and holidays. Call '
             '210-370-3700 and tell us what broke, where it is and whether the opening is '
             'currently secure. We board up to make the property safe and come back with '
             'the replacement glass.'),
        ],
        'nearby': [('Boerne', '/boerne-tx'),
                   ('Bulverde', '/bulverde-tx'),
                   ('San Antonio', '/san-antonio-tx')],
    },
]

ARROW = ('<svg aria-hidden="true" viewBox="0 0 24 24">'
         '<path d="M5 12h13M13 6l6 6-6 6"/></svg>')


def strip(s):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s)).replace('&mdash;', '—').strip()


def depth_html(i, eyebrow, h2, lead, body):
    cls = 'section section-cream city-depth' if i == 0 else 'section city-depth'
    return (f'<section class="{cls}"><div class="shell answer-grid"><div>'
            f'<p class="eyebrow"><span></span>{eyebrow}</p><h2>{h2}</h2></div><div>'
            f'<p class="lead">{lead}</p><p>{body}</p></div></div></section>')


def build(src, p):
    out = src
    url = f'{BASE}/{p["slug"]}'
    place = f'{p["name"]}, {p["parent"]}, TX' if p['parent'] else f'{p["name"]}, TX'
    area = p['parent'] or p['name']

    out = out.replace(DONOR_SLUG, p['slug'])
    # Capitals FIRST: the hero eyebrow carries the name in literal caps, so a
    # title-case replace alone leaves the donor's town above the h1.
    out = out.replace(DONOR_NAME.upper(), p['name'].upper())
    out = out.replace(DONOR_NAME, p['name'])

    out = re.sub(r'<title>.*?</title>', f'<title>{p["title"]}</title>', out, count=1, flags=re.S)
    for prop, val in (('name="description"', p['desc']),
                      ('property="og:title"', p['title']),
                      ('property="og:description"', p['desc'])):
        out = re.sub(r'(<meta ' + prop + r' content=")[^"]*(")',
                     lambda m, v=val: m.group(1) + v + m.group(2), out, count=1)

    def fix(m):
        raw = m.group(1)
        d = json.loads(raw)
        t = d.get('@type')
        if t == 'Place':
            # The Place is the area; its geo must match its own hasMap. Pointing
            # it at the office is the exact bug fix_place_geo.py repairs.
            d['name'] = place
            d['geo'] = {'@type': 'GeoCoordinates', 'latitude': p['lat'], 'longitude': p['lon']}
            d['hasMap'] = f'https://maps.google.com/?q={p["lat"]},{p["lon"]}'
        elif t == 'LocalBusiness':
            d['description'] = (f'Glass services in {place}. Residential and commercial '
                                'glass installation, repair, and 24/7 emergency support.')
            d['areaServed'] = {'@type': 'City', 'name': area}
        elif t == 'FAQPage':
            d['mainEntity'] = [{'@type': 'Question', 'name': strip(q),
                                'acceptedAnswer': {'@type': 'Answer', 'text': strip(a)}}
                               for q, a in p['faq']]
        return m.group(0).replace(raw, json.dumps(d, ensure_ascii=False))

    out = re.sub(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', fix, out, flags=re.S)

    out = re.sub(r'(<h1>[^<]*</h1>)<p>.*?</p>',
                 lambda m: m.group(1) + f'<p>{p["hero"]}</p>', out, count=1, flags=re.S)

    blocks = list(re.finditer(
        r'<section class="section (?:section-cream )?city-depth">.*?</section>', out, re.S))
    if len(blocks) != len(p['depth']):
        raise SystemExit(f'{p["slug"]}: expected {len(p["depth"])} depth sections, '
                         f'found {len(blocks)}')
    for i, b in reversed(list(enumerate(blocks))):
        out = out[:b.start()] + depth_html(i, *p['depth'][i]) + out[b.end():]

    items = ''.join(f'<details><summary>{q}<span>+</span></summary>'
                    f'<div class="faq-answer"><p>{a}</p></div></details>' for q, a in p['faq'])
    out = re.sub(r'(<div class="faq-list">).*?(</div></div></section>)',
                 lambda m: m.group(1) + items + m.group(2), out, count=1, flags=re.S)

    cards = ''.join(f'<a class="nearby-city" href="{h}"><span>{n}, TX</span>{ARROW}</a>'
                    for n, h in p['nearby'])
    out, n = re.subn(
        r'(<section class="section nearby-areas">.*?<div class="nearby-grid">).*?(</div>)',
        lambda m: m.group(1) + cards + m.group(2), out, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f'{p["slug"]}: nearby-areas block not found')
    return out


def check(out, p):
    errs = []
    url = f'{BASE}/{p["slug"]}'
    if f'canonical" href="{url}"' not in out:
        errs.append('canonical wrong')
    if out.count('<h1>') != 1:
        errs.append(f'{out.count("<h1>")} h1 tags')

    # The donor's name must not survive anywhere except the nearby-areas block,
    # where it may be a legitimate neighbour. Case-insensitive: the eyebrow is
    # in capitals and a [Tt]-only guard cannot see it.
    without = re.sub(r'<section class="section nearby-areas">.*?</section>', '', out, flags=re.S)
    if re.search(DONOR_NAME.replace(' ', r'\s*'), without, re.I):
        m = re.search(r'.{60}' + DONOR_NAME.replace(' ', r'\s*') + r'.{60}', without, re.S | re.I)
        errs.append(f'donor name survived: ...{strip(m.group(0)) if m else ""}...')

    for m in re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', out, re.S):
        try:
            d = json.loads(m)
        except Exception as e:
            errs.append(f'invalid JSON-LD: {e}'); continue
        if d.get('@type') == 'Place':
            g = d['geo']
            if f'{g["latitude"]},{g["longitude"]}' not in d['hasMap']:
                errs.append('Place geo does not match hasMap')
        if d.get('@type') == 'LocalBusiness':
            if d['geo']['latitude'] != 29.5604:
                errs.append('LocalBusiness geo is not the office')
            if 'Bldg 5' not in d['address']['streetAddress']:
                errs.append('address is not the verified one')

    got = re.findall(r'nearby-city" href="([^"]*)"',
                     re.search(r'<section class="section nearby-areas">.*?</section>',
                               out, re.S).group(0))
    if got != [h for _, h in p['nearby']]:
        errs.append(f'nearby areas are {got}, wanted {[h for _, h in p["nearby"]]}')

    for want in ('call-tracking.js', 'motion.js?v=5', 'motion.css?v=5', 'sw-register.js',
                 '"ratingValue": "5.0"', 'Bldg 5'):
        if want not in out:
            errs.append(f'missing {want}')
    if f'/{p["slug"]}' in [h for _, h in p['nearby']]:
        errs.append('page links to itself as a neighbour')
    return errs


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    apply_changes = '--apply' in sys.argv
    donor = io.open(DONOR, encoding='utf-8').read()
    pages = [p for p in PAGES if not args or p['slug'] in args]
    if args and len(pages) != len(args):
        print(f'unknown slug in {args}'); return 1

    failed = 0
    for p in pages:
        out = build(donor, p)
        errs = check(out, p)
        path = p['slug'] + '.html'
        status = 'ERROR: ' + '; '.join(errs) if errs else 'ok'
        unchanged = ''
        try:
            if io.open(path, encoding='utf-8').read() == out:
                unchanged = '  (identical to what is on disk)'
        except OSError:
            unchanged = '  (new)'
        print(f'  {path:24} {len(out):>7,} bytes  {status}{unchanged}')
        if errs:
            failed += 1
            continue
        if apply_changes:
            io.open(path, 'w', encoding='utf-8').write(out)

    print(f'\n{"WROTE" if apply_changes else "DRY RUN"}: {len(pages) - failed} page(s)'
          + ('' if apply_changes else ' -- re-run with --apply.'))
    if apply_changes:
        print('Now run wire_city_pages.py --apply, then build_llms_full.py --apply.')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
