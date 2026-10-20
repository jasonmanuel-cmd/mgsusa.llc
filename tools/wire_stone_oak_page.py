#!/usr/bin/env python3
"""Wire stone-oak-tx.html into the rest of the site.

Same job as wire_railings_page.py, but a city page has one extra home the
service pages do not: service-areas.html, which carries a card for every town
and is the page a visitor actually browses to find their own. A city page
missing from it is invisible to anyone who did not search for it by name.

Inbound links, in order of how much they matter:

    service-areas.html        the city index -- a card in the SAN ANTONIO
                              METRO group, since Stone Oak is part of San
                              Antonio rather than a town beside it
    san-antonio-tx.html       the parent page, whose nearby-areas grid is
                              where someone reading about San Antonio glass
                              would look for their own end of it
    timberwood-park-tx.html   the next area north; the two share a market

Each nearby-areas grid holds three cards and all of them are full, so adding
Stone Oak means swapping out the weakest neighbour on each page rather than
appending a fourth. Those swaps are named explicitly below so the reasoning
survives: on san-antonio-tx and timberwood-park-tx the dropped entry is the
furthest one, and it keeps its own page and its own place in the index.

Idempotent: every step checks for its own output first.

Usage: wire_stone_oak_page.py [--apply]
"""

import io
import json
import re
import sys

BASE = 'https://www.mgsusa.llc'
TODAY = '2026-10-20'
SLUG = 'stone-oak-tx'
LABEL = 'Stone Oak, TX'
GROUP = 'SAN ANTONIO METRO'
BLURB = ('Stone Oak homes sit on the Edwards recharge zone, which is why shower glass '
         'clouds here; we handle frameless enclosures, mirrors and...')
LLMS = ('Stone Oak, San Antonio, TX',
        'far north side of San Antonio, off US-281 north of Loop 1604 — '
        'master-planned, newer large homes, frameless shower enclosures and tall entry glass')

ARROW = ('<svg aria-hidden="true" viewBox="0 0 24 24">'
         '<path d="M5 12h13M13 6l6 6-6 6"/></svg>')

# host page -> the neighbour its grid should give up for Stone Oak
SWAPS = [
    ('san-antonio-tx.html', '/boerne-tx'),
    ('timberwood-park-tx.html', '/comfort-tx'),
]


def edit(path, fn, applied, label):
    src = io.open(path, encoding='utf-8').read()
    out = fn(src)
    if out == src:
        print(f'  {path:28} unchanged ({label})')
        return False
    print(f'  {path:28} {label}')
    if applied:
        io.open(path, 'w', encoding='utf-8').write(out)
    return True


def main():
    ap = '--apply' in sys.argv

    def do_sitemap(s):
        if f'{BASE}/{SLUG}<' in s:
            return s
        row = (f'  <url><loc>{BASE}/{SLUG}</loc><lastmod>{TODAY}</lastmod>'
               f'<changefreq>monthly</changefreq><priority>0.7</priority></url>\n')
        return s.replace('</urlset>', row + '</urlset>')
    edit('sitemap.xml', do_sitemap, ap, 'added sitemap entry')

    def do_vercel(s):
        v = json.loads(s)
        src = f'/{SLUG}.html'
        if src in {r.get('source') for r in v.get('redirects', [])}:
            return s
        v['redirects'].append({'source': src, 'destination': f'/{SLUG}', 'permanent': True})
        return json.dumps(v, indent=2) + '\n'
    edit('vercel.json', do_vercel, ap, 'added the .html redirect')

    def do_llms(s):
        if f'/{SLUG})' in s:
            return s
        rows = list(re.finditer(r'^- \[[^\]]+\]\(' + re.escape(BASE) + r'/[a-z-]+-tx\).*$',
                                s, re.M))
        if not rows:
            return s
        last = rows[-1]
        return s[:last.end()] + f'\n- [{LLMS[0]}]({BASE}/{SLUG}) — {LLMS[1]}' + s[last.end():]
    edit('llms.txt', do_llms, ap, 'added the service-area link')

    def do_index(s):
        if f'href="/{SLUG}"' in s:
            return s
        card = (f'<a class="city-card" href="/{SLUG}"><p>{GROUP}</p>'
                f'<h2>{LABEL}</h2><span>{BLURB} {ARROW}</span></a>')
        # Drop it in beside the other San Antonio metro cards.
        anchor = '<a class="city-card" href="/san-antonio-tx">'
        if anchor not in s:
            return s
        return s.replace(anchor, card + anchor, 1)
    edit('service-areas.html', do_index, ap, f'added the {GROUP} card')

    for host, drop in SWAPS:
        def do_swap(s, drop=drop):
            if f'href="/{SLUG}"' in s:
                return s
            block = re.search(r'<section class="section nearby-areas">.*?</section>', s, re.S)
            if not block:
                print(f'      (no nearby-areas block on {host})')
                return s
            b = block.group(0)
            card = re.search(r'<a class="nearby-city" href="' + re.escape(drop) + r'">.*?</a>',
                             b, re.S)
            if not card:
                print(f'      ({drop} not in {host} grid -- left alone)')
                return s
            new = (f'<a class="nearby-city" href="/{SLUG}"><span>{LABEL}</span>{ARROW}</a>')
            return s.replace(b, b.replace(card.group(0), new, 1), 1)
        edit(host, do_swap, ap, f'nearby-areas: {drop} -> /{SLUG}')

    print(f'\n{"APPLIED" if ap else "DRY RUN -- re-run with --apply"}')
    print('Then re-run build_llms_full.py --apply so the page reaches llms-full.txt.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
