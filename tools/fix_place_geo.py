#!/usr/bin/env python3
"""Restore each city Place's own coordinates.

The audit branch set every city page's geo to the business address in San
Antonio (29.5604, -98.5322). For the `LocalBusiness` block that is right: the
business really is in San Antonio, and a LocalBusiness claiming Boerne's
coordinates while its postalAddress says 78249 is the NAP conflict that change
set out to fix.

But the `Place` block is not the business. It is the city -- "Boerne, TX",
"Wimberley, TX" -- and giving it San Antonio's coordinates makes it wrong, and
wrong in a way that contradicts its own `hasMap` on the same line:

    "@type": "Place", "name": "Boerne, TX",
    "geo": { "latitude": 29.5604, "longitude": -98.5322 },   <- San Antonio
    "hasMap": "https://maps.google.com/?q=29.7947,-98.732"   <- Boerne

`hasMap` was left untouched, so it still holds each city's true coordinates.
That is the source this reads from, which means the fix is derived from the
file rather than from a table I typed, and the result is self-consistent by
construction.

Only the Place block is touched. LocalBusiness keeps San Antonio.
"""

import glob
import re
import sys

# The Place block, up to and including its hasMap. Non-greedy, and anchored on
# the Place @type so a LocalBusiness block can never match.
PLACE_RE = re.compile(
    r'("@type":\s*"Place".*?"geo":\s*\{\s*"@type":\s*"GeoCoordinates",\s*)'
    r'"latitude":\s*(-?[\d.]+),\s*"longitude":\s*(-?[\d.]+)'
    r'(\s*\}.*?"hasMap":\s*"https://maps\.google\.com/\?q=)(-?[\d.]+),(-?[\d.]+)"',
    re.S)

BUSINESS_LAT = '29.5604'


def main():
    apply_changes = '--apply' in sys.argv
    changed = []

    for path in sorted(glob.glob('*.html')):
        src = open(path, encoding='utf-8').read()

        def fix(m):
            lat, lon = m.group(2), m.group(3)
            map_lat, map_lon = m.group(5), m.group(6)
            # Only correct the ones that were overwritten with the business
            # location while their map still points somewhere else.
            if lat != BUSINESS_LAT or (lat, lon) == (map_lat, map_lon):
                return m.group(0)
            return (f'{m.group(1)}"latitude": {map_lat}, "longitude": {map_lon}'
                    f'{m.group(4)}{map_lat},{map_lon}"')

        out = PLACE_RE.sub(fix, src)
        if out != src:
            m = PLACE_RE.search(out)
            changed.append((path, m.group(2), m.group(3)))
            if apply_changes:
                open(path, 'w', encoding='utf-8').write(out)

    for path, lat, lon in changed:
        print(f'  {path:28} Place geo -> {lat}, {lon}')
    print(f'\n{"APPLIED" if apply_changes else "DRY RUN"}: {len(changed)} city pages')
    return 0


if __name__ == '__main__':
    sys.exit(main())
