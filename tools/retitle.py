#!/usr/bin/env python3
"""Flip page titles to lead with San Antonio.

17 pages led with Boerne (pop. ~20k) while the office is in San Antonio
(pop. ~1.5M, metro ~2.6M). Search volume follows population, so every one of
those titles was marketing to the smaller market first.

Each new title also leans on intent words where they fit -- "Repair",
"Replacement", "Installation" -- because that is what people type, and it stays
under ~60 characters so Google does not truncate it in results.

og:title is updated with it. A <title> and an og:title that disagree is the
kind of small inconsistency that is free to avoid.

One deliberate exception: hill-country-glass.html keeps its Hill Country
framing. That page exists to speak to Boerne, Comfort, Wimberley and Blanco
homes; forcing San Antonio into it would make it worse, not better.

Usage: retitle.py [--apply]
"""

import io
import re
import sys

TITLES = {
    'index.html':                      'San Antonio Glass Company | Master Glass Solutions',
    'emergency-glass-repair.html':     'Emergency Glass Repair San Antonio | 24/7 Board-Up',
    'storefront-glass.html':           'Storefront Glass Repair &amp; Replacement | San Antonio',
    'shower-enclosures.html':          'Frameless Shower Doors | San Antonio &amp; Boerne, TX',
    'commercial-glass.html':           'Commercial Glass &amp; Glazing | San Antonio, TX',
    'residential-glass.html':          'Residential Glass Services | San Antonio &amp; Boerne',
    'window-glass-replacement.html':   'Window Glass Replacement | San Antonio, TX',
    'custom-glass.html':               'Custom Glass &amp; Fabrication | San Antonio, TX',
    'mirrors.html':                    'Custom Mirrors &amp; Installation | San Antonio, TX',
    'about.html':                      'About Master Glass Solutions | San Antonio, TX',
    'contact.html':                    'Contact Master Glass Solutions | San Antonio, TX',
    'request-quote.html':              'Free Glass Quote | San Antonio &amp; Boerne, TX',
    'commercial-quote.html':           'Commercial Glass Quote | San Antonio, TX',
    'residential-quote.html':          'Residential Glass Quote | San Antonio, TX',
    'service-areas.html':              'Glass Service Areas | San Antonio &amp; Hill Country',
    'glass-cleaning-maintenance.html': 'Glass Cleaning &amp; Maintenance | San Antonio, TX',
    # Keeps its Hill Country framing on purpose -- see module docstring.
    'hill-country-glass.html':         'Hill Country Glass | Boerne, Comfort &amp; Wimberley',
}

TITLE_RE = re.compile(r'(<title>)(.*?)(</title>)', re.S)
OG_RE = re.compile(r'(<meta property="og:title" content=")([^"]*)(")')


def plain(s):
    return s.replace('&amp;', '&')


def main():
    apply_changes = '--apply' in sys.argv
    rows, problems = [], []

    for path, new in TITLES.items():
        try:
            src = io.open(path, encoding='utf-8').read()
        except FileNotFoundError:
            problems.append(f'{path}: missing'); continue

        m = TITLE_RE.search(src)
        if not m:
            problems.append(f'{path}: no <title>'); continue
        old = m.group(2)

        out = TITLE_RE.sub(lambda _m: _m.group(1) + new + _m.group(3), src, count=1)
        n_og = 0
        if OG_RE.search(out):
            out, n_og = OG_RE.subn(lambda _m: _m.group(1) + new + _m.group(3), out)

        length = len(plain(new))
        if length > 60:
            problems.append(f'{path}: title is {length} chars, will truncate')

        rows.append((path, plain(old), plain(new), length, n_og))
        if apply_changes:
            io.open(path, 'w', encoding='utf-8').write(out)

    for path, old, new, length, n_og in rows:
        print(f'  {path}')
        print(f'      was: {old}')
        print(f'      now: {new}   [{length} chars, og:title x{n_og}]')

    print(f'\n{"APPLIED" if apply_changes else "DRY RUN"}: {len(rows)} pages')
    for p in problems:
        print(f'  !! {p}')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
