#!/usr/bin/env python3
"""Add an explanatory diagram to each of the three window-film pages.

These are drawings, not photographs, and that is the point. The pages have no
photographs of film work, and putting generated or stock images into a carousel
of the company's projects would be inventing a portfolio -- the same reason the
carousel was retitled rather than recaptioned when these pages were built. A
diagram makes no claim about a job that was done.

For two of the three it is also simply the better illustration. Perforated film
is a relationship between two viewpoints at once, which no single photograph
shows. Solar film's whole argument is that heat and visible light can be
separated, which is invisible in a photograph by definition.

Design notes worth keeping if these are edited:

  * Text inside an SVG does not reflow. A 680-wide viewBox rendered into a
    358px phone column scales every label to roughly half its nominal size, so
    the diagrams carry short labels only and the actual explanation sits in
    HTML underneath, where it wraps like any other paragraph.

  * Colours come from the palette in design-tokens.css, with small text on
    #D62828 rather than #E63946 -- the brand red fails AA at small sizes, which
    is exactly what these labels are.

  * Everything is inline: no new image files, no stylesheet change, and so no
    service worker bump.

  * Each figure is role="img" with a <title> and a <desc>, so a screen reader
    gets the explanation rather than a list of rectangles.

Usage: add_film_diagrams.py [--apply]
"""

import io
import sys

INK = '#0a0a0a'
BRAND = '#E63946'
BRAND_DK = '#D62828'
LINE = '#c8c8c8'
GLASS = '#9fb6bf'
PAPER = '#ffffff'
FONT = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"

SVG_OPEN = ('<svg viewBox="0 0 680 400" role="img" '
            'aria-labelledby="{id}-t {id}-d" '
            'style="width:100%;height:auto;max-width:720px;display:block;margin:0 auto">')


def label(x, y, text, size=19, fill=INK, weight='700', anchor='start'):
    return (f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" '
            f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}">{text}</text>')


# --------------------------------------------------------------------------
# 1. Security film -- cross-section through a broken pane
# --------------------------------------------------------------------------
def security_svg():
    i = 'secfilm'
    cracks = ''.join(
        f'<line x1="330" y1="{y}" x2="352" y2="{y + dy}" stroke="{PAPER}" stroke-width="2.5"/>'
        for y, dy in [(150, -18), (185, 14), (218, -12), (252, 16), (288, -14)]
    )
    return (
        SVG_OPEN.format(id=i)
        + f'<title id="{i}-t">How security window film works</title>'
        + f'<desc id="{i}-d">Cross-section of a window. The glass is struck from outside and '
          'cracks, but a film bonded to the inside face holds the fragments together and an '
          'attachment bead anchors the pane to the frame, so the opening stays closed.</desc>'
        + f'<rect x="0" y="0" width="680" height="400" fill="{PAPER}"/>'
        # frame head and sill
        + f'<rect x="300" y="86" width="86" height="26" fill="{INK}"/>'
        + f'<rect x="300" y="322" width="86" height="26" fill="{INK}"/>'
        # glass
        + f'<rect x="326" y="112" width="30" height="210" fill="{GLASS}" opacity="0.55"/>'
        + cracks
        # film layer on the interior face
        + f'<rect x="356" y="112" width="8" height="210" fill="{BRAND}"/>'
        # attachment beads
        + f'<rect x="356" y="112" width="18" height="14" fill="{BRAND_DK}"/>'
        + f'<rect x="356" y="308" width="18" height="14" fill="{BRAND_DK}"/>'
        # impact
        + f'<g stroke="{INK}" stroke-width="3" fill="none">'
          '<path d="M196 217h96"/><path d="M268 203l24 14-24 14"/></g>'
        + f'<circle cx="326" cy="217" r="13" fill="none" stroke="{INK}" stroke-width="3"/>'
        # side labels
        + label(196, 150, 'OUTSIDE', 15, '#666', '800')
        + label(484, 150, 'INSIDE', 15, '#666', '800', 'end')
        + label(196, 258, 'Impact', 19, INK)
        # callouts
        + f'<line x1="341" y1="356" x2="341" y2="378" stroke="{LINE}" stroke-width="2"/>'
        + label(341, 396, 'Glass still breaks', 17, INK, '700', 'middle')
        + f'<line x1="400" y1="217" x2="470" y2="217" stroke="{BRAND_DK}" stroke-width="2"/>'
        + label(478, 211, 'Film holds the', 17, BRAND_DK)
        + label(478, 232, 'fragments together', 17, BRAND_DK)
        + f'<line x1="378" y1="119" x2="470" y2="96" stroke="{BRAND_DK}" stroke-width="2"/>'
        + label(478, 92, 'Anchored to', 16, BRAND_DK)
        + label(478, 111, 'the frame', 16, BRAND_DK)
        + '</svg>'
    )


# --------------------------------------------------------------------------
# 2. Solar film -- heat rejected, daylight passed
# --------------------------------------------------------------------------
def tint_svg():
    i = 'tintfilm'
    sun_rays = ''.join(
        f'<line x1="{86 + 26 * __import__("math").cos(a)}" '
        f'y1="{96 + 26 * __import__("math").sin(a)}" '
        f'x2="{86 + 38 * __import__("math").cos(a)}" '
        f'y2="{96 + 38 * __import__("math").sin(a)}" '
        f'stroke="{BRAND}" stroke-width="3" stroke-linecap="round"/>'
        for a in [k * 0.785 for k in range(8)]
    )
    # Arrowheads land at y-40; the "solar heat sent back" label sits above them.
    # The first pass had the label baseline at 133 and an arrowhead at 130, so
    # the arrow was drawn through the word. Keep these two bands apart.
    bounce = ''.join(
        f'<path d="M{300} {y} L{188} {y - 40}" stroke="{BRAND}" stroke-width="3.5" fill="none"/>'
        f'<path d="M{196} {y - 38} l-12 -4 4 12" stroke="{BRAND}" stroke-width="3.5" fill="none"/>'
        for y in (192, 252)
    )
    through = ''.join(
        f'<path d="M{348} {y} L{498} {y}" stroke="#b9c7cc" stroke-width="3.5"/>'
        f'<path d="M{490} {y - 7} l10 7 -10 7" stroke="#b9c7cc" stroke-width="3.5" fill="none"/>'
        for y in (150, 203, 256)
    )
    return (
        SVG_OPEN.format(id=i)
        + f'<title id="{i}-t">How solar control window film works</title>'
        + f'<desc id="{i}-d">Sunlight reaches a window. Film on the inside face reflects and '
          'absorbs most of the solar heat back outward, while most of the visible daylight '
          'continues through into the room, so the space gets cooler without getting dark.</desc>'
        + f'<rect x="0" y="0" width="680" height="400" fill="{PAPER}"/>'
        + f'<circle cx="86" cy="96" r="22" fill="{BRAND}"/>' + sun_rays
        # frame + glass + film
        + f'<rect x="300" y="86" width="60" height="24" fill="{INK}"/>'
        + f'<rect x="300" y="300" width="60" height="24" fill="{INK}"/>'
        + f'<rect x="318" y="110" width="22" height="190" fill={chr(34)}{GLASS}{chr(34)} opacity="0.55"/>'
        + f'<rect x="340" y="110" width="8" height="190" fill="{BRAND}"/>'
        + bounce + through
        + label(60, 162, 'Sun', 18, INK)
        + label(188, 108, 'Solar heat', 17, BRAND_DK)
        + label(188, 129, 'sent back', 17, BRAND_DK)
        + label(512, 196, 'Daylight', 17, '#5a6b71')
        + label(512, 217, 'still comes in', 17, '#5a6b71')
        + f'<line x1="344" y1="334" x2="344" y2="356" stroke="{LINE}" stroke-width="2"/>'
        + label(344, 376, 'Film on the inside face', 17, INK, '700', 'middle')
        + label(344, 396, 'of the glass you already have', 15, '#666', '600', 'middle')
        + '</svg>'
    )


# --------------------------------------------------------------------------
# 3. Perforated film -- the same window, two viewpoints
# --------------------------------------------------------------------------
def perf_svg():
    i = 'perffilm'
    holes = ''
    for r in range(9):
        for c in range(13):
            holes += (f'<circle cx="{66 + c * 18}" cy="{150 + r * 18}" r="3.4" '
                      f'fill="{PAPER}" opacity="0.92"/>')
    holes_r = ''
    for r in range(9):
        for c in range(13):
            holes_r += (f'<circle cx="{414 + c * 18}" cy="{150 + r * 18}" r="3.4" '
                        f'fill="#7d949c" opacity="0.5"/>')
    return (
        SVG_OPEN.format(id=i)
        + f'<title id="{i}-t">How perforated one-way vision film works</title>'
        + f'<desc id="{i}-d">The same window seen twice. From the brighter street side the '
          'printed graphic dominates and the perforations disappear into the image. From the '
          'darker interior the eye reads through the perforations and the view out is kept.</desc>'
        + f'<rect x="0" y="0" width="680" height="400" fill="{PAPER}"/>'
        # ---- left: from the street
        + label(56, 68, 'FROM THE STREET', 15, '#666', '800')
        + label(56, 92, 'brighter outside', 14, '#999', '600')
        + f'<rect x="56" y="112" width="252" height="192" fill="{BRAND}"/>'
        + holes
        # A solid plate under the wording. The first pass set the text straight
        # on the perforation field and the dots ran through the letters, which
        # made the one label that has to be legible the least legible thing in
        # the drawing.
        + f'<rect x="88" y="176" width="188" height="64" fill="{INK}" opacity="0.86"/>'
        + f'<text x="182" y="202" font-family="{FONT}" font-size="23" font-weight="800" '
          f'fill="{PAPER}" text-anchor="middle">YOUR</text>'
        + f'<text x="182" y="230" font-family="{FONT}" font-size="23" font-weight="800" '
          f'fill="{PAPER}" text-anchor="middle">GRAPHIC</text>'
        # ---- right: from inside
        + label(404, 68, 'FROM INSIDE', 15, '#666', '800')
        + label(404, 92, 'darker interior', 14, '#999', '600')
        + f'<rect x="404" y="112" width="252" height="192" fill="#dfe8ea"/>'
        # a street scene through the glass
        + f'<rect x="404" y="244" width="252" height="60" fill="#c3d0d3"/>'
        + f'<rect x="438" y="168" width="44" height="76" fill="#aebcc0"/>'
        + f'<rect x="498" y="146" width="56" height="98" fill="#9fb0b5"/>'
        + f'<rect x="570" y="180" width="40" height="64" fill="#aebcc0"/>'
        + f'<circle cx="618" cy="152" r="15" fill="#cdd8da"/>'
        + holes_r
        + f'<line x1="330" y1="208" x2="382" y2="208" stroke="{LINE}" stroke-width="2"/>'
        # Sub-captions sit below their panels, off the perforation field.
        + label(182, 328, 'reads as a solid image', 15, '#666', '600', 'middle')
        + label(530, 328, 'you still see out', 15, '#666', '600', 'middle')
        + label(340, 364, 'Same window, same film &#8212; the brighter side wins.',
                17, INK, '700', 'middle')
        + label(340, 390, 'After dark, with the lights on inside, that reverses.',
                15, BRAND_DK, '600', 'middle')
        + '</svg>'
    )


SECTIONS = {
    'commercial-security-film': {
        'svg': security_svg,
        'eyebrow': 'HOW IT WORKS',
        'h2': 'The glass still breaks. That is not the failure.',
        'caption': ('Security film is sold on delay, not invulnerability. A laminate bonded to the '
                    'interior face keeps the broken fragments attached to one another, and where '
                    'an attachment system is used, keeps the whole pane attached to the frame. '
                    'The opening stays closed while someone keeps hitting it &mdash; loudly, in '
                    'full view, for far longer than they planned to be there.'),
    },
    'commercial-window-tint': {
        'svg': tint_svg,
        'eyebrow': 'HOW IT WORKS',
        'h2': 'Heat and daylight are not the same thing.',
        'caption': ('That is the whole argument for solar film, and it is the part a photograph '
                    'cannot show. Spectrally selective films reject a large share of the solar '
                    'heat while passing most of the visible light, so a room can get '
                    'substantially cooler without getting noticeably darker. Cheaper, darker '
                    'films reject more heat for less money and take the daylight with them '
                    '&mdash; a trade worth making on purpose rather than discovering afterwards.'),
    },
    'perforated-window-graphics': {
        'svg': perf_svg,
        'eyebrow': 'HOW IT WORKS',
        'h2': 'One window, two completely different views.',
        'caption': ('Roughly half the material is not there at all. The side with more light '
                    'falling on it wins: in daylight the street sees a solid printed graphic, '
                    'while from the darker interior the eye reads straight through the '
                    'perforations. It is a daytime product. After dark, with the interior lit '
                    'and the street black, the effect runs the other way &mdash; which is worth '
                    'knowing before you put it on a window you stand behind at night.'),
    },
}


def main():
    apply_changes = '--apply' in sys.argv
    anchor = '<section class="section section-cream"><div class="shell split-info">'

    for slug, cfg in SECTIONS.items():
        path = slug + '.html'
        s = io.open(path, encoding='utf-8').read()

        if 'role="img"' in s and 'HOW IT WORKS</p><h2>' in s:
            print(f'  {path:34} already has a diagram')
            continue
        if anchor not in s:
            print(f'  {path:34} ERROR: insertion point not found')
            return 1

        block = (
            '<section class="section"><div class="shell">'
            f'<div class="section-heading"><p class="eyebrow"><span></span>{cfg["eyebrow"]}</p>'
            f'<h2>{cfg["h2"]}</h2></div>'
            '<figure style="margin:2.6rem 0 0;padding:0">'
            + cfg['svg']() +
            '<figcaption style="max-width:62ch;margin:1.9rem auto 0;text-align:left">'
            f'{cfg["caption"]}</figcaption>'
            '</figure></div></section>'
        )
        out = s.replace(anchor, block + anchor, 1)
        print(f'  {path:34} inserted diagram ({len(block):,} bytes)')
        if apply_changes:
            io.open(path, 'w', encoding='utf-8').write(out)

    print(f'\n{"APPLIED" if apply_changes else "DRY RUN -- re-run with --apply"}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
