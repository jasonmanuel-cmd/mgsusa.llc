#!/usr/bin/env python3
"""Deepen the five city pages with the best chance of ranking.

The 21 city pages average 690 words and are 57% identical to their nearest
sibling. That is thin for competitive queries. Rather than pad all 21 -- which
would multiply the sameness and require inventing local detail for twenty
towns -- this adds real depth to five: the biggest markets plus the affluent
remodel market.

What goes in, and what deliberately does not:

  IN   Conditions that genuinely change the glass work. San Antonio's water is
       15-20 grains per gallon out of the Edwards Aquifer, which is why shower
       glass clouds here and why coatings matter; Hill Country homes have wide
       view openings that are rarely a stock size; corridor commercial has
       tenant coordination and opening dates. All checkable, all useful to the
       person reading, all different per town.

  OUT  Invented jobs, invented customers, invented distances, population
       figures and neighbourhood claims that cannot be stood behind. The owner
       reads these pages and would spot a guess, and a page that overstates is
       worse than a thin one.

Each page gets two sections in the existing `answer-grid` pattern, so nothing
new is needed in the stylesheet.

Usage: deepen_city_pages.py [--apply]
"""

import io
import re
import sys

# Shared fact, phrased differently per page on purpose: the duplication being
# fixed here would only come back if the same paragraph were pasted five times.
PAGES = {
    'san-antonio-tx.html': [
        ('WHAT WE SEE HERE', 'San Antonio openings, old and new.',
         [('lead',
           'San Antonio covers an enormous range of building stock, and the glass work '
           'follows it. Homes in the older established neighbourhoods were built long '
           'before standard window sizing settled, so replacement glass is usually cut '
           'to the opening rather than ordered off a shelf. Newer construction out '
           'along the 1604 and 410 corridors is dimensionally predictable but tends to '
           'carry larger spans, which changes the glass thickness and the handling.'),
          ('',
           'Commercial work splits the same way. An established storefront on a older '
           'frontage often needs the existing frame assessed before anything is '
           'ordered, because the opening has usually moved over the decades. A newer '
           'retail or office space is generally a straight specification exercise.'),
          ('',
           'Either way, the measurement visit decides the job. Sizes taken from a tape '
           'held against trim are a reasonable starting point for a conversation, not '
           'something to cut glass from.')]),
        ('SHOWER GLASS', 'Why shower glass clouds in San Antonio.',
         [('lead',
           'San Antonio water runs roughly 15 to 20 grains per gallon, which puts it in '
           'the very hard to extremely hard range. It comes out of the Edwards Aquifer, '
           'a limestone formation, and it carries dissolved calcium carbonate with it.'),
          ('',
           'On shower glass that matters more than it does anywhere else in the house. '
           'Every drop that dries on the panel leaves its mineral content behind. Left '
           'alone, those deposits stop sitting on the surface and begin etching into '
           'it, and at that point no cleaning product will bring the glass back — the '
           'glass itself has been eaten into.'),
          ('',
           'Two things prevent it, and both are decided before the glass is ordered: a '
           'protective coating applied to the panel, and a squeegee kept in the shower '
           'so the water never dries on the glass in the first place. If you are '
           'planning a frameless enclosure here, ask about the coating while the '
           'configuration is still being decided rather than after it is installed.')]),
    ],
    'boerne-tx.html': [
        ('WHAT WE SEE HERE', 'Hill Country openings are rarely a stock size.',
         [('lead',
           'Boerne properties tend to be built to the view. Wide openings, tall spans '
           'and glass placed where the landscape is worth looking at are the normal '
           'request rather than the exception, and very little of it is a catalogue '
           'size. That makes the template visit the part of the job that matters.'),
          ('',
           'Limestone and stucco exteriors are common through the area, and they are '
           'less forgiving than frame construction when an opening has settled. A '
           'measurement taken on site accounts for an opening that is out of square; '
           'one taken from plans does not.'),
          ('',
           'The older commercial frontage around the historic centre has its own '
           'constraint. Matching the character of an existing shopfront usually '
           'governs the glass and the hardware more than the specification does, so '
           'photographs of what is there now are worth as much as dimensions.')]),
        ('PLANNING AHEAD', 'Lead time is the thing to plan around.',
         [('lead',
           'Boerne is served from the San Antonio office rather than a separate '
           'storefront, and for emergency work that makes no practical difference — '
           'the 24/7 line covers it and an opening can be boarded the same day.'),
          ('',
           'For planned work it is worth knowing that custom-cut glass and the '
           'hardware for a non-standard opening both carry fabrication lead time. A '
           'wide frameless panel or a shaped piece is not held in stock anywhere. '
           'Calling early with photographs and rough dimensions is what secures a date '
           'rather than a place in a queue.')]),
    ],
    'new-braunfels-tx.html': [
        ('WHAT WE SEE HERE', 'A town that turns over quickly.',
         [('lead',
           'New Braunfels has grown fast, and the glass work reflects both halves of '
           'that. New residential construction brings predictable, specifiable work. '
           'The older German-era building stock downtown brings openings that were '
           'built before standard sizing and frontages where the existing detail sets '
           'the specification.'),
          ('',
           'The river economy adds something most towns do not have: properties that '
           'change hands every few days. Short-term rentals and hospitality spaces see '
           'more accidental glass breakage simply because more people pass through '
           'them, and the repair is usually urgent for a different reason — there is a '
           'guest arriving.'),
          ('',
           'If a property is on a turnover schedule, say so with the quote request. '
           'Knowing the window between guests changes how the work is sequenced, and '
           'sometimes means boarding an opening first and returning with the glass.')]),
        ('STORM SEASON', 'Hail and wind damage.',
         [('lead',
           'Glass damage here is not evenly spread through the year. Storm damage '
           'arrives in bursts, and when it does, everyone who needs glass needs it the '
           'same week.'),
          ('',
           'Two things make that easier. First, photograph the damage before anything '
           'is moved or cleared — insurers ask, and a boarded opening photographed '
           'afterwards is a weaker claim. Second, call rather than use the form if the '
           'opening is letting weather in. Securing the building is a different job '
           'from replacing the glass, and it usually comes first.')]),
    ],
    'schertz-tx.html': [
        ('WHAT WE SEE HERE', 'Corridor commercial and newer subdivisions.',
         [('lead',
           'Schertz work tends to divide cleanly. Commercial glass along the I-35 '
           'corridor is tenant space: storefront systems, entry doors and interior '
           'partitions, where the constraint is rarely the glass itself and almost '
           'always the access and the date.'),
          ('',
           'Residential work is mostly in newer subdivisions, which is the easier half '
           'of the trade. Standard openings, documented sizes, and glass that can be '
           'specified without a template visit in many cases — window panes, failed '
           'insulated units and shower enclosures being the common three.')]),
        ('COMMERCIAL JOBS', 'What to send with a commercial request.',
         [('lead',
           'A tenant space has constraints a house does not, and they decide the '
           'schedule more than the glass does. Four things are worth including with '
           'the first message.'),
          ('',
           'The access rules — whether work has to happen outside trading hours, and '
           'who holds the keys. The landlord or property manager, if their approval is '
           'needed before anything is ordered. The target opening or reopening date, '
           'because that is what the fabrication lead time has to fit inside. And '
           'photographs of the existing frame, since a storefront system is usually '
           'being matched rather than designed.'),
          ('',
           'Sent up front, those four turn a site visit into a quote. Sent later, they '
           'tend to turn a quote back into a site visit.')]),
    ],
    'alamo-heights-tx.html': [
        ('WHAT WE SEE HERE', 'Older homes, and matching what is already there.',
         [('lead',
           'Alamo Heights housing stock is largely established rather than new, and '
           'that shapes nearly every job. Openings predate standard sizing, frames '
           'have settled over decades, and the glass is usually being fitted into '
           'something that was built by hand.'),
          ('',
           'The practical consequence is that almost nothing is ordered from a '
           'measurement given over the phone. An opening that is a quarter-inch out of '
           'square across its height is ordinary in a house of that age, and glass cut '
           'to the nominal size will not sit in it.'),
          ('',
           'Remodel work carries a second constraint: matching. A replacement mirror, '
           'shower panel or window pane in an older home is usually being asked to '
           'look like it belongs beside original detail. Photographs of the '
           'surrounding finish are as useful as the dimensions.')]),
        ('SHOWER AND MIRROR WORK', 'Hard water, and older bathrooms.',
         [('lead',
           'The water here carries the same mineral load as the rest of the San '
           'Antonio area — 15 to 20 grains per gallon out of the Edwards Aquifer '
           'limestone. On glass it leaves deposits that eventually etch the surface '
           'rather than sit on it.'),
          ('',
           'In an older bathroom that matters twice over. The new glass needs a '
           'protective coating specified at the time of order, and any original mirror '
           'or glass being kept alongside it has usually had decades of the same water '
           'on it already. Whether that older piece is cleanable or past saving is a '
           'judgement best made on site, before the new work is scheduled around it.')]),
    ],
}


def block(eyebrow, heading, paras, cream):
    cls = 'section section-cream city-depth' if cream else 'section city-depth'
    body = ''.join(
        f'<p class="lead">{t}</p>' if kind == 'lead' else f'<p>{t}</p>'
        for kind, t in paras)
    return (f'<section class="{cls}"><div class="shell answer-grid">'
            f'<div><p class="eyebrow"><span></span>{eyebrow}</p><h2>{heading}</h2></div>'
            f'<div>{body}</div></div></section>')


def words(html):
    t = re.sub(r'<script.*?</script>', ' ', html, flags=re.S | re.I)
    t = re.sub(r'<style.*?</style>', ' ', t, flags=re.S | re.I)
    t = re.sub(r'<header.*?</header>', ' ', t, flags=re.S | re.I)
    t = re.sub(r'<footer.*?</footer>', ' ', t, flags=re.S | re.I)
    t = re.sub(r'<[^>]+>', ' ', t)
    return len(re.findall(r"[A-Za-z0-9']+", t))


def main():
    apply_changes = '--apply' in sys.argv
    for path, sections in PAGES.items():
        src = io.open(path, encoding='utf-8').read()
        if 'city-depth' in src:
            print(f'  {path}: already deepened, skipped')
            continue
        m = re.search(r'<section class="section city-context".*?</section>', src, re.S)
        if not m:
            print(f'  !! {path}: no city-context section'); continue

        added = ''.join(block(e, h, p, cream=(i % 2 == 0))
                        for i, (e, h, p) in enumerate(sections))
        out = src[:m.end()] + added + src[m.end():]
        before, after = words(src), words(out)
        print(f'  {path:26} {before:5} -> {after:5} words  (+{after - before}, '
              f'{len(sections)} sections)')
        if apply_changes:
            io.open(path, 'w', encoding='utf-8').write(out)

    print(f'\n{"APPLIED" if apply_changes else "DRY RUN"}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
