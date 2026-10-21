#!/usr/bin/env python3
"""Give pages a hero photo that matches what the page is about.

Two problems this fixes.

**One photo on twelve pages.** The city-page generator inherits its hero from
the donor, so all seven new city pages plus five older ones were leading with
`Commercial4` -- a three-storey office block with *metal* picket railings. On
`stone-oak-tx`, a page about frameless shower enclosures in a residential
subdivision, that is the wrong picture; on `garden-ridge-tx`, a page about limbs
coming through windows, it is the wrong picture twice over.

**The railings page had no railing on it.** `glass-railings.html` led with a
commercial storefront while `Stairs1`-`Stairs4` -- four real frameless glass
stair railings, already captioned "Glass railings" and already live on
gallery.html and residential-glass.html -- sat unused. CLAUDE.md claimed there
were no photographs of this company's railings. There are four. They are named
`Stairs*`, which is why a search for railing photos missed them.

Pairings are made from the gallery's own captions, not from a guess at what a
thumbnail shows. `Residential21` and `Residential22` look like glass railings
at thumbnail size and are captioned as mirrors; `Residential15` looks like a
plain shower and is captioned "Black-framed shower door", which makes it the
right hero for a page about converting framed enclosures to frameless.

Dimensions are read off disk, never copied from the markup. Every city page
declared `height="932"` for a file that is 1400x1050, which is a layout shift
on first paint of every one of them -- the markup was wrong before any photo
moved, so the heights are recomputed everywhere, not just on the pages whose
hero changes.

Usage: set_page_heroes.py [--apply]
"""

import glob
import io
import re
import struct
import sys

# page -> (basename, alt). Alt text is lifted from the gallery caption for the
# same photo so the two never drift apart.
HEROES = {
    'stone-oak-tx.html':       ('Residential8',  'Sliding glass shower with brushed-gold hardware'),
    'alamo-ranch-tx.html':     ('Residential7',  'Frameless rain-glass shower door with brushed nickel hardware'),
    'bulverde-tx.html':        ('Residential6',  'Leaf-textured round glass table top'),
    'fair-oaks-ranch-tx.html': ('Emergency3',    'Replacement glass set in a storefront window line'),
    'live-oak-tx.html':        ('Storefront6',   'Retail center storefront glazing'),
    'selma-tx.html':           ('Storefront7',   'Retail center storefronts under construction'),
    'garden-ridge-tx.html':    ('Emergency1',    'Boarded opening after glass breakage'),
    'glass-railings.html':     ('Stairs1',       'Glass stair railing with wood handrail'),
}

# Only photos with a long edge of at least this many pixels are eligible. The
# hero is a full-bleed background, so a 685px file stretched across a 1400px
# slot is visibly soft -- and the first set of pairings chosen purely on
# subject matter put five such files in. 30 of the 62 photos qualify; subject
# matter has to be chosen from inside that set, not before checking it.
MIN_LONG_EDGE = 1100

SIZES = '(max-width: 600px) 260px, (max-width: 900px) 700px, 1400px'


def webp_dims(path):
    """Width and height straight from the file header."""
    d = io.open(path, 'rb').read(40)
    if d[:4] != b'RIFF' or d[8:12] != b'WEBP':
        raise SystemExit(f'{path} is not a WebP')
    tag = d[12:16]
    if tag == b'VP8X':
        return int.from_bytes(d[24:27], 'little') + 1, int.from_bytes(d[27:30], 'little') + 1
    if tag == b'VP8 ':
        w, h = struct.unpack('<HH', d[26:30])
        return w & 0x3fff, h & 0x3fff
    if tag == b'VP8L':
        b = int.from_bytes(d[21:25], 'little')
        return (b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1
    raise SystemExit(f'{path}: unknown WebP chunk {tag!r}')


def hero_block(name, alt, enforce_size=False):
    full, small = f'assets/{name}.webp', f'assets/{name}-sm.webp'
    fw, fh = webp_dims(full)
    sw, _ = webp_dims(small)
    if enforce_size and max(fw, fh) < MIN_LONG_EDGE:
        raise SystemExit(f'{name} is {fw}x{fh}; too small for a full-bleed hero '
                         f'(need a long edge of {MIN_LONG_EDGE}px)')
    srcset = f'{small} {sw}w, {full} {fw}w'
    return (
        '<div class="inner-hero-image">\n'
        '  <picture>\n'
        f'    <source type="image/webp" srcset="{srcset}" sizes="{SIZES}">\n'
        f'    <img src="{full}" srcset="{srcset}" sizes="{SIZES}" alt="{alt}" '
        f'aria-hidden="true" width="{fw}" height="{fh}" fetchpriority="high" '
        'decoding="async">\n'
        '  </picture>\n'
        '</div>'
    ), fw, fh, sw


BLOCK = re.compile(r'<div class="inner-hero-image">.*?</picture>\s*</div>', re.S)


def main():
    apply_changes = '--apply' in sys.argv
    swapped, fixed = [], []

    for path in sorted(glob.glob('*.html')):
        src = io.open(path, encoding='utf-8').read()
        m = BLOCK.search(src)
        if not m:
            continue
        cur = re.search(r'<img src="assets/([A-Za-z0-9]+)\.webp"', m.group(0))
        if not cur:
            continue
        cur_name = cur.group(1)

        if path in HEROES:
            name, alt = HEROES[path]
        else:
            # Not changing the photo, but the declared height may still be a
            # lie -- rebuild from disk with the alt it already has.
            name = cur_name
            a = re.search(r'alt="([^"]*)"', m.group(0))
            alt = a.group(1) if a else 'Master Glass Solutions project photo'

        block, fw, fh, sw = hero_block(name, alt, enforce_size=path in HEROES)
        out = src[:m.start()] + block + src[m.end():]
        if out == src:
            continue
        (swapped if path in HEROES and name != cur_name else fixed).append(
            f'{path} ({cur_name} -> {name}, {fw}x{fh})' if name != cur_name
            else f'{path} ({name} dims -> {fw}x{fh})')
        if apply_changes:
            io.open(path, 'w', encoding='utf-8').write(out)

    print(f'  heroes swapped : {len(swapped)}')
    for s in swapped:
        print(f'      {s}')
    print(f'  dims corrected : {len(fixed)}')
    for s in fixed[:8]:
        print(f'      {s}')
    if len(fixed) > 8:
        print(f'      ... and {len(fixed)-8} more')

    if apply_changes:
        bad = 0
        for path in sorted(glob.glob('*.html')):
            s = io.open(path, encoding='utf-8').read()
            m = BLOCK.search(s)
            if not m:
                continue
            b = m.group(0)
            name = re.search(r'<img src="assets/([A-Za-z0-9]+)\.webp"', b).group(1)
            fw, fh = webp_dims(f'assets/{name}.webp')
            sw, _ = webp_dims(f'assets/{name}-sm.webp')
            if f'width="{fw}" height="{fh}"' not in b:
                print(f'  ERROR {path}: declared dims do not match {name}.webp'); bad += 1
            if f'{fw}w' not in b or f'{sw}w' not in b:
                print(f'  ERROR {path}: srcset descriptors do not match disk'); bad += 1
            # A <source> with no descriptors or sizes outranks the <img> and
            # pins the full-size file for every visitor.
            srcs = re.findall(r'<source[^>]*>', b)
            for sc in srcs:
                if 'sizes=' not in sc or 'w,' not in sc:
                    print(f'  ERROR {path}: bare <source> in the hero'); bad += 1
        print('\n' + ('VERIFY FAILED' if bad else
                      'Verified: every hero declares the real dimensions of the file '
                      'it loads, and no bare <source>.'))
        return 1 if bad else 0

    print('\nDRY RUN -- re-run with --apply.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
