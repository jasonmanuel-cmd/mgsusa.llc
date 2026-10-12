#!/usr/bin/env python3
"""Put the three window-film services on the homepage.

Two edits, both using classes that already exist in styles.css. Nothing new is
added to the stylesheet, so styles.min.css does not need regenerating and the
service worker does not need a version bump -- which matters, because a CSS
change shipped without that bump is how returning visitors get new markup with
an old stylesheet, and it looks fine on a hard refresh so testing misses it.

1. A dedicated band announcing the offering, built from section/related-section
   + related-grid + related-service. That combination renders on every service
   page already, so it is known-good at every breakpoint.

2. The three services added to the existing WHAT WE DO grid as 07/08/09.
   The band alone would have been odd: a homepage that announces window film
   in one section while its own "what we do" list omits it reads as an
   afterthought, and the grid is repeat(3,1fr), so six cards is two full rows
   and nine is three. No orphan cell either way.

Usage: add_film_cta.py [--apply]
"""

import io
import sys

ARROW_SM = ('<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg>')
ARROW = ('<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
         'stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>')

SERVICES = [
    ('07', '/commercial-window-tint', 'Commercial window tint',
     'Solar control film that cuts heat and glare through the glass already in the building.'),
    ('08', '/commercial-security-film', 'Security window film',
     'Fragment retention and forced-entry delay for storefronts and ground-floor glass.'),
    ('09', '/perforated-window-graphics', 'Perforated window graphics',
     'One-way vision film: full-window branding outside, the view kept from inside.'),
]

BAND = (
    '\n<section class="section related-section"><div class="shell">'
    '<div class="section-heading split-heading">'
    '<p class="eyebrow"><span></span>NOW OFFERING &mdash; COMMERCIAL WINDOW FILM</p>'
    '<div><h2>Three ways to change what your glass does, without changing the glass.</h2>'
    '<p>Film is applied to the glazing a building already has, so it is the least disruptive '
    'way to deal with heat, glare, break-ins or a storefront that should be working harder. '
    'Commercial buildings only &mdash; we do not film vehicle glass.</p></div></div>'
    '<div class="related-grid">'
    '<a class="related-service" href="/commercial-window-tint"><h3>Commercial window tint</h3>'
    '<p>Reject solar heat and glare on the elevations that cook all afternoon.</p>'
    f'<span>{ARROW}</span></a>'
    '<a class="related-service" href="/commercial-security-film"><h3>Security window film</h3>'
    '<p>Hold a broken pane together and turn a quick smash into a slow, loud one.</p>'
    f'<span>{ARROW}</span></a>'
    '<a class="related-service" href="/perforated-window-graphics">'
    '<h3>Perforated window graphics</h3>'
    '<p>Advertise across the whole window and still see out from inside.</p>'
    f'<span>{ARROW}</span></a>'
    '<a class="related-service" href="/commercial-quote"><h3>Commercial estimate</h3>'
    '<p>Send the building, the elevations and a rough pane count.</p>'
    f'<span>{ARROW}</span></a>'
    '</div></div></section>\n'
)

ANCHOR_BAND = '\n\n<section class="section craftsmanship">'
ANCHOR_GRID = ('<a class="service-card" href="/window-glass-replacement">'
               '<span class="service-number">06</span>')


def main():
    apply_changes = '--apply' in sys.argv
    s = io.open('index.html', encoding='utf-8').read()
    orig = s
    did = []

    # 1. the band, immediately after WHAT WE DO
    if '/commercial-window-tint' in s and 'NOW OFFERING' in s:
        did.append('band already present')
    else:
        if ANCHOR_BAND not in s:
            print('ERROR: could not find the craftsmanship section to insert before')
            return 1
        s = s.replace(ANCHOR_BAND, '\n' + BAND + '\n<section class="section craftsmanship">', 1)
        did.append('inserted the NOW OFFERING band')

    # 2. cards 07-09 in the existing grid
    if '<span class="service-number">07</span>' in s:
        did.append('service cards already present')
    else:
        i = s.index(ANCHOR_GRID)
        end = s.index('</a>', i) + len('</a>')
        cards = ''.join(
            f'<a class="service-card" href="{href}">'
            f'<span class="service-number">{num}</span>'
            f'<div><h3>{title}</h3><p>{blurb}</p></div>'
            f'<span class="service-arrow">{ARROW_SM}</span></a>'
            for num, href, title, blurb in SERVICES
        )
        s = s[:end] + cards + s[end:]
        did.append('added service cards 07-09')

    for d in did:
        print(f'  {d}')
    if s == orig:
        print('\nnothing to do')
        return 0
    print(f'\n{"APPLIED" if apply_changes else "DRY RUN -- re-run with --apply"}')
    if apply_changes:
        io.open('index.html', 'w', encoding='utf-8').write(s)
    return 0


if __name__ == '__main__':
    sys.exit(main())
