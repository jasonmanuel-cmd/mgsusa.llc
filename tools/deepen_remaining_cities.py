#!/usr/bin/env python3
"""Deepen the remaining 16 city pages.

Companion to deepen_city_pages.py, which did the five biggest markets. The
concern with doing all of them was fabrication: there is real, checkable local
character in Castroville and Canyon Lake, and very little I can honestly say
about Natalia that I could not say about Somerset.

So the towns are handled by what is actually true of them rather than by one
template:

  lake and river      Canyon Lake, Lakehills, Wimberley, Blanco -- water views,
                      second homes, decks and wide openings, seasonal use.
  historic            Castroville (Alsatian historic district, 200+ listed
                      structures, National Register since 1970 -- checked),
                      Comfort, Seguin.
  metro suburb        Converse, Helotes, Leon Valley, Timberwood Park --
                      subdivision stock, commuter corridors, newer openings.
  rural south/east    La Vernia, Lytle, Natalia, Somerset, Stockdale.

For that last group the honest content is the service relationship, not
invented local colour: distance from the San Antonio office and what that means
for scheduling, older farmhouse and metal-building stock, agricultural
outbuildings, well water rather than municipal supply. True, useful, and
different from the metro pages -- and each is given a different emphasis so
they do not become a new set of near-duplicates.

Nothing here claims a job, a customer or a distance that cannot be stood
behind.

Usage: deepen_remaining_cities.py [--apply]
"""

import io
import re
import sys

P = {}

# ---------------------------------------------------------------- lake / river

P['canyon-lake-tx.html'] = [
    ('WHAT WE SEE HERE', 'Glass that exists for the view.',
     ['Canyon Lake property is bought for what you can see from it, and the glass '
      'follows. Wide spans facing the water, sliding and stacking doors onto decks, '
      'and railings where a solid balustrade would defeat the point are the normal '
      'request here rather than the unusual one.',
      'That brings the specification questions a standard window never raises. A '
      'large pane facing open water takes more wind load than the same pane on a '
      'sheltered elevation, and a glass rail is a structural element rather than a '
      'decorative one. Both are decided before fabrication, not after.',
      'Second homes add a scheduling wrinkle worth mentioning when you call: if the '
      'property is only occupied some weekends, say so. Access is usually the '
      'constraint on the date rather than the work.']),
    ('AFTER A STORM', 'Lake-facing elevations take the weather first.',
     ['An elevation with nothing in front of it but open water has nothing breaking '
      'the wind either. Storm damage around the lake concentrates on exactly the '
      'glass people value most.',
      'If a large pane goes, call rather than using the form. A wide opening left '
      'unsecured is a weather and security problem the same night, and boarding it '
      'is a separate job from replacing it — the replacement glass for a '
      'non-standard span has to be cut.']),
]

P['lakehills-tx.html'] = [
    ('WHAT WE SEE HERE', 'Medina Lake properties and rural lots.',
     ['Lakehills work tends to be residential and spread out — lake-facing homes, '
      'rural lots and the outbuildings that come with acreage. Openings are a mix of '
      'what the original builder put in and what later owners added, which usually '
      'means measuring rather than specifying.',
      'Properties on well water are worth flagging when the job involves shower '
      'glass or mirrors. Well supply in this part of the county is frequently harder '
      'than municipal water, and mineral deposits are what eventually etch a glass '
      'panel past cleaning.']),
    ('PLANNING THE VISIT', 'Rural addresses and scheduling.',
     ['Lakehills is served from the San Antonio office, and for a rural address the '
      'practical consequence is that the measurement visit and the installation are '
      'two separate trips.',
      'Sending photographs and rough dimensions with the first message often lets '
      'the first of those be shorter, and sometimes lets the glass be ordered before '
      'it rather than after. If a gate code, a long driveway or a dog is part of '
      'getting to the opening, that is useful to know in advance too.']),
]

P['wimberley-tx.html'] = [
    ('WHAT WE SEE HERE', 'Creek-side homes and a working downtown.',
     ['Wimberley residential work is dominated by homes built to look at something — '
      'cypress, creek, hillside. Wide openings and glass placed for the outlook are '
      'normal, and very little of it is a stock size.',
      'The village centre is the other half: small commercial frontage, galleries and '
      'shops where the glass is part of how the business presents itself. Matching '
      'the character of what is already on the street usually matters more to those '
      'owners than the specification does.']),
    ('LOW-LYING PROPERTY', 'Glass near the creek.',
     ['Property close to the water carries a consideration the rest of the Hill '
      'Country does not. After high water, glass and frames that have been submerged '
      'or struck by debris need looking at even when they appear intact — a seal that '
      'has been compromised fails later, and an insulated unit that has taken water '
      'will fog.',
      'If a property has been through high water, photograph the glass before any '
      'clearing up. That record is worth having for an insurer, and it is easier to '
      'take than to reconstruct.']),
]

P['blanco-tx.html'] = [
    ('WHAT WE SEE HERE', 'Ranch property and a historic square.',
     ['Blanco work splits between rural residential — ranch houses, outbuildings, '
      'properties on acreage — and the older commercial stock around the square.',
      'Ranch-house glass is rarely uniform. A house that has been added to over '
      'decades has openings from several eras in it, and the replacement for one is '
      'not the replacement for another. Measuring each is the job rather than a '
      'formality.',
      'The older buildings around the centre bring the opposite constraint: the '
      'opening is fixed and has usually moved, so the glass is cut to what is there '
      'now rather than to what the original drawing said.']),
    ('WELL WATER', 'Why shower glass clouds faster out here.',
     ['Much of the property around Blanco is on well water rather than municipal '
      'supply, and well water in this limestone country is frequently harder than '
      'what San Antonio delivers — which is already 15 to 20 grains per gallon.',
      'On shower glass that shortens the timeline. Mineral deposits left by drying '
      'water eventually etch into the surface rather than sitting on it, and once '
      'that has happened no cleaning product reverses it. A protective coating '
      'specified with the order is the cheap half of preventing it; a squeegee kept '
      'in the shower is the other half.']),
]

P['comfort-tx.html'] = [
    ('WHAT WE SEE HERE', 'An older town centre, and the properties around it.',
     ['Comfort has an unusually intact nineteenth-century commercial centre for its '
      'size, and that shapes the work. Glass in an older masonry storefront is being '
      'fitted into an opening built by hand, often more than a century ago, and '
      'almost never to a dimension that appears on a chart.',
      'Residential work in the surrounding area is Hill Country typical: ranch '
      'properties, additions from several decades, and openings that reward a '
      'template visit over a phone measurement.']),
    ('OLDER BUILDINGS', 'Matching, not just fitting.',
     ['In a historic frontage the specification question is usually not what glass '
      'will fit but what glass will look right. Thickness, edge treatment and the '
      'hardware are all visible, and a modern choice in an old opening reads wrong '
      'even when it is dimensionally perfect.',
      'Photographs of the existing frame and the neighbouring frontages are worth as '
      'much as the measurements for this kind of job, and they are worth taking '
      'before anything is removed.']),
]

# ---------------------------------------------------------------- historic

P['castroville-tx.html'] = [
    ('WHAT WE SEE HERE', 'The Little Alsace of Texas, in practical terms.',
     ['Castroville has one of the largest historic districts in the state — more '
      'than two hundred historic structures, on the National Register since 1970 — '
      'built in Colonial Alsatian and Victorian styles by settlers who brought the '
      'architecture of their home region with them.',
      'For glass work that is not decoration, it is the constraint. Openings in those '
      'buildings predate standardisation by well over a century, frames have settled '
      'across generations, and what looks like a rectangular opening is routinely not '
      'one. Every pane is cut to what is measured on site.',
      'Newer residential construction around the town is ordinary specifiable work. '
      'It is worth saying which of the two a property is when you call, because they '
      'are almost different trades.']),
    ('HISTORIC PROPERTY', 'Before anything is ordered.',
     ['Two things are worth establishing early on a historic building. Whether the '
      'property carries any preservation requirement that governs what may be '
      'changed — that question belongs to the owner and the local authority, not to '
      'the glazier, but it determines the specification. And whether the existing '
      'frame is sound enough to take new glass, which is a judgement made on site.',
      'Neither is a reason to delay a call. Both are reasons the first visit is a '
      'look rather than an installation.']),
]

P['seguin-tx.html'] = [
    ('WHAT WE SEE HERE', 'A river town with an industrial base.',
     ['Seguin carries a wider mix than most towns its size: a historic centre, '
      'established residential neighbourhoods, newer subdivision growth and a '
      'genuine manufacturing and light-industrial base alongside the Guadalupe.',
      'That last part changes the commercial work. Industrial and warehouse glazing '
      'is a different job from retail frontage — larger openings, safety glazing '
      'requirements where glass sits near a working floor, and access that has to be '
      'arranged around a shift rather than around trading hours.']),
    ('COMMERCIAL AND INDUSTRIAL', 'What to send with the request.',
     ['For a commercial or industrial opening, four things move a quote along faster '
      'than anything else: a photograph of the existing frame, the rough dimensions, '
      'whether the work has to happen outside operating hours, and who has to approve '
      'it before glass is ordered.',
      'Where glass sits next to a working area, say so. It usually changes the '
      'specification to a safety glazing, and that is better known before fabrication '
      'than after.']),
]

# ---------------------------------------------------------------- metro suburb

P['converse-tx.html'] = [
    ('WHAT WE SEE HERE', 'Subdivision stock, mostly.',
     ['Converse is largely newer residential, and that makes it the straightforward '
      'half of the trade. Openings are standardised, sizes are documented, and much '
      'of the common work — a cracked pane, a failed insulated unit that has fogged, '
      'a shower enclosure going into a builder-standard bathroom — can be specified '
      'without a template visit.',
      'Fogged double glazing is worth singling out because it is so often assumed to '
      'need a whole new window. In most cases the frame is fine and only the sealed '
      'unit has failed, which is a smaller and cheaper job than people expect.']),
    ('SHOWER GLASS', 'The water here is hard.',
     ['Converse is on the same supply as the rest of the San Antonio area: 15 to 20 '
      'grains per gallon out of the Edwards Aquifer limestone, which is the very hard '
      'end of the scale.',
      'On a new shower enclosure that makes the protective coating a decision worth '
      'making at the time of order rather than later. Mineral deposits that are left '
      'to dry on the panel eventually etch the surface, and etched glass does not '
      'clean up.']),
]

P['helotes-tx.html'] = [
    ('WHAT WE SEE HERE', 'Where the suburbs meet the Hill Country.',
     ['Helotes sits on the edge, and the housing stock shows it. Newer subdivision '
      'construction with predictable openings runs alongside larger hillside '
      'properties built to a view, where the glass is wide, tall and cut to order.',
      'The practical difference is whether a template visit is needed. A subdivision '
      'window or a standard shower opening frequently is not. A hillside span, a '
      'glass rail or anything shaped almost always is.']),
    ('GLASS RAILINGS', 'A structural element, not a finish.',
     ['Hillside property around Helotes brings more glass railing work than flat '
      'ground does, and it is worth being clear what that involves. A glass rail is '
      'holding people back from a drop. The glass, the fixings and the way it is '
      'anchored are a structural specification, and the drop governs it.',
      'That is decided before fabrication. It is one of the jobs where a site visit '
      'is not a formality.']),
]

P['leon-valley-tx.html'] = [
    ('WHAT WE SEE HERE', 'An established city inside the city.',
     ['Leon Valley is surrounded by San Antonio and was built out earlier than much '
      'of what is around it. Residential stock is established rather than new, which '
      'means openings that predate current standard sizing and frames that have had '
      'decades to settle.',
      'The commercial side is corridor retail — frontage along the main through '
      'routes, where a storefront is the first thing a customer sees and a cracked or '
      'clouded pane is read as neglect whether or not it is.']),
    ('STOREFRONT WORK', 'Matching an existing system.',
     ['Replacing glass in an established storefront is usually a matching exercise '
      'rather than a design one. The framing system is already there, often decades '
      'old, and the question is what will go into it rather than what would be '
      'specified from scratch.',
      'A photograph of the frame — including the corner detail and the door hardware '
      'if a door is involved — tells us more at that stage than a dimension does.']),
]

P['timberwood-park-tx.html'] = [
    ('WHAT WE SEE HERE', 'Large lots and larger houses.',
     ['Timberwood Park is characterised by bigger lots and bigger houses than the '
      'subdivisions closer in, and the glass scales with them. Tall entry glass, wide '
      'rear elevations, multiple bathrooms with frameless enclosures and the '
      'occasional specialist piece are the usual mix.',
      'Larger glass is not simply more of the same. Above certain spans the thickness '
      'changes, the weight changes what the hardware has to carry, and handling it '
      'into position becomes part of the job rather than an afterthought.']),
    ('MULTIPLE OPENINGS', 'Worth quoting together.',
     ['Houses out here often need several things at once — two or three shower '
      'enclosures, a run of mirrors, a handful of panes. Those are usually better '
      'scoped as one job than as separate call-outs.',
      'One visit can measure all of it, the glass can be fabricated together, and the '
      'installation becomes a single day rather than several. Listing everything you '
      'know about in the first message is what makes that possible.']),
]

# ---------------------------------------------------------------- rural

P['la-vernia-tx.html'] = [
    ('WHAT WE SEE HERE', 'Small-town centre, acreage around it.',
     ['La Vernia has grown as people have moved east out of the metro, and the work '
      'reflects both ends of that. Newer homes on acreage sit alongside older '
      'properties in and around the original town, and the glass needs are not the '
      'same.',
      'Newer construction is specifiable. Older houses and the outbuildings that come '
      'with land are not — those openings were built to the material available, and '
      'the glass is cut to what is measured.']),
    ('PROPERTIES ON ACREAGE', 'What is useful to mention.',
     ['An address on acreage is straightforward to serve, but a few details make the '
      'visit work the first time: where on the property the opening actually is, '
      'whether a gate or a code is involved, and whether anything about the approach '
      'would stop a van reaching it.',
      'If the work includes an outbuilding — a shop, a barn, a garage — say so. Those '
      'often take a different glass specification from the house.']),
]

P['lytle-tx.html'] = [
    ('WHAT WE SEE HERE', 'The I-35 south corridor.',
     ['Lytle sits on the southbound corridor, and that gives it a commercial profile '
      'larger than its residential size would suggest — highway-frontage businesses, '
      'small retail and service premises where the frontage glass is doing a job.',
      'Frontage on a highway takes more punishment than frontage on a street. Road '
      'debris, wind off passing traffic and sheer exposure mean breakage here is more '
      'often impact damage than age.']),
    ('BUSINESS FRONTAGE', 'Getting open again.',
     ['For a business, a broken front is lost trade for as long as it is boarded. '
      'The sequence that gets you open fastest is almost always the same: secure the '
      'opening the same day, measure it properly while it is boarded, then fit the '
      'replacement once it is cut.',
      'Call rather than using the form if the opening is already broken. The '
      'board-up is the urgent half and it does not wait on a quote.']),
]

P['natalia-tx.html'] = [
    ('WHAT WE SEE HERE', 'A small agricultural community.',
     ['Natalia is small and rural, and the glass work is mostly residential: older '
      'farmhouses, more recent manufactured and modular homes, and the agricultural '
      'outbuildings that go with working property.',
      'Older rural houses are the interesting part. Openings were made to suit the '
      'build rather than a catalogue, several decades of repairs have usually passed '
      'through them, and what is in the frame now may not be what was originally '
      'specified. Measuring is the only reliable starting point.']),
    ('RURAL SERVICE', 'How the scheduling works.',
     ['Natalia is served from the San Antonio office, which means a measurement trip '
      'and an installation trip rather than one visit.',
      'Flexibility on the date genuinely helps here. Where several jobs out this way '
      'can be fitted into the same run, the date comes sooner. Photographs and rough '
      'dimensions sent up front often shorten the first visit, and sometimes let the '
      'glass be ordered before it.']),
]

P['somerset-tx.html'] = [
    ('WHAT WE SEE HERE', 'Ranch and residential property south of the city.',
     ['Somerset work is predominantly residential and rural — houses on land, '
      'outbuildings, and the occasional small commercial premises in the town itself.',
      'Property that has been in the same hands a long time tends to have had glass '
      'replaced piecemeal over the years. It is common to find three different '
      'thicknesses in one house. That is not a problem, but it does mean each opening '
      'is measured on its own rather than assumed from the one next to it.']),
    ('OUTBUILDINGS', 'Shops, barns and workshops.',
     ['Glass in a working building is a different specification from glass in a '
      'house. An opening in a shop or barn is more exposed, more likely to be '
      'knocked, and often better served by a tougher glass than the one that would go '
      'in a window.',
      'Say what the building is used for when you call. It changes the recommendation '
      'more than the dimensions do.']),
]

P['stockdale-tx.html'] = [
    ('WHAT WE SEE HERE', 'Farming country east of San Antonio.',
     ['Stockdale is the furthest east of the communities served from the San Antonio '
      'office, and it is agricultural country. The work is older residential stock, '
      'farm buildings, and small premises along the main street.',
      'Older housing here was built before standard sizing and has usually been '
      'maintained rather than renovated, which is a good thing for the building and a '
      'reason every opening gets measured. Nothing is assumed from the house next '
      'door.']),
    ('DISTANCE AND DATES', 'Being straight about the trip.',
     ['Stockdale is a longer run than most of the service area, and it is worth being '
      'plain about what that means. Emergency work still gets a call back and a '
      'board-up; planned work is scheduled, and a flexible date is worth more here '
      'than anywhere else in the area because trips out this way are batched.',
      'Photographs and rough measurements with the first message matter more at this '
      'distance than they do close in. They are often the difference between two '
      'trips and three.']),
]


def block(eyebrow, heading, paras, cream):
    cls = 'section section-cream city-depth' if cream else 'section city-depth'
    body = ''.join(
        (f'<p class="lead">{t}</p>' if i == 0 else f'<p>{t}</p>')
        for i, t in enumerate(paras))
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
    done = 0
    for path, sections in P.items():
        try:
            src = io.open(path, encoding='utf-8').read()
        except FileNotFoundError:
            print(f'  !! {path}: missing'); continue
        if 'city-depth' in src:
            print(f'  {path}: already deepened, skipped'); continue
        m = re.search(r'<section class="section city-context".*?</section>', src, re.S)
        if not m:
            print(f'  !! {path}: no city-context'); continue
        added = ''.join(block(e, h, p, cream=(i % 2 == 0))
                        for i, (e, h, p) in enumerate(sections))
        out = src[:m.end()] + added + src[m.end():]
        before, after = words(src), words(out)
        print(f'  {path:28} {before:5} -> {after:5}  (+{after - before})')
        if apply_changes:
            io.open(path, 'w', encoding='utf-8').write(out)
        done += 1
    print(f'\n{"APPLIED" if apply_changes else "DRY RUN"}: {done} pages')
    return 0


if __name__ == '__main__':
    sys.exit(main())
