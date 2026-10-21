#!/usr/bin/env python3
"""Wire the new city pages into the rest of the site.

Generalised from wire_stone_oak_page.py when three more pages followed. Stone
Oak stays in the list so the whole set is re-checkable in one run; every step
is idempotent, so an already-wired page just reports unchanged.

A city page has one home the service pages do not: service-areas.html, which
carries a card per town and is what a visitor actually browses to find their
own. A city page missing from it is invisible to anyone who did not already
search for it by name.

The nearby-areas swaps
----------------------
Each grid holds three cards and all of them were full, so adding a page means
giving up a neighbour rather than appending a fourth. These are not arbitrary:
in each case the dropped entry is geographically wrong for the host and the new
one is genuinely its nearest neighbour.

    boerne-tx           drops Comfort (36 mi from the office, the far side of
                        Boerne) for Fair Oaks Ranch, which sits right between
                        Boerne and the office
    timberwood-park-tx  drops Canyon Lake (27 mi) for Bulverde, which is a few
                        miles up the road and shares its market
    helotes-tx          drops Alamo Heights, which is clear across the city,
                        for Alamo Ranch directly to its south

Every dropped page keeps its own page, its sitemap entry and its card in the
service-areas index. Nothing is orphaned by a swap.

Usage: wire_city_pages.py [--apply]
"""

import io
import json
import re
import sys

BASE = 'https://www.mgsusa.llc'
TODAY = '2026-10-21'

ARROW = ('<svg aria-hidden="true" viewBox="0 0 24 24">'
         '<path d="M5 12h13M13 6l6 6-6 6"/></svg>')

PAGES = [
    {'slug': 'stone-oak-tx', 'label': 'Stone Oak, TX', 'group': 'SAN ANTONIO METRO',
     'blurb': ('Stone Oak homes sit on the Edwards recharge zone, which is why shower '
               'glass clouds here; we handle frameless enclosures, mirrors and...'),
     'llms': ('Stone Oak, San Antonio, TX',
              'far north side of San Antonio, off US-281 north of Loop 1604 — '
              'master-planned, newer large homes, frameless shower enclosures and tall '
              'entry glass'),
     'swap': None},
    {'slug': 'alamo-ranch-tx', 'label': 'Alamo Ranch, TX', 'group': 'SAN ANTONIO METRO',
     'blurb': ('Alamo Ranch is the newest housing stock we work in, so the calls are '
               'upgrades rather than repairs — frameless conversions, mirrors and...'),
     'llms': ('Alamo Ranch, San Antonio, TX',
              'far west side of San Antonio, out Loop 1604 past Culebra — newest '
              'housing stock, frameless shower upgrades and solar control film for '
              'west-facing glass'),
     'swap': ('helotes-tx.html', '/alamo-heights-tx')},
    {'slug': 'bulverde-tx', 'label': 'Bulverde, TX', 'group': 'HILL COUNTRY / NORTH',
     'blurb': ('Bulverde is acreage country, where the openings are larger and getting '
               'the glass to the house is part of the job; view glass, showers and...'),
     'llms': ('Bulverde, TX',
              'Comal County acreage north of San Antonio on US-281 — large view '
              'glass, wide spans cut to the opening, and gate and driveway access as '
              'part of the scope'),
     'swap': ('timberwood-park-tx.html', '/canyon-lake-tx')},
    {'slug': 'fair-oaks-ranch-tx', 'label': 'Fair Oaks Ranch, TX',
     'group': 'HILL COUNTRY / NORTH',
     'blurb': ('Fair Oaks Ranch has 1970s-90s housing, so failed insulated units fogging '
               'between the panes are common; we replace the sealed unit and...'),
     'llms': ('Fair Oaks Ranch, TX',
              'between the office and Boerne — 1970s-90s housing with failed '
              'insulated glass units, golf-course frontage and mature oak cover'),
     'swap': ('boerne-tx.html', '/comfort-tx')},
]


def edit(path, fn, applied, label):
    src = io.open(path, encoding='utf-8').read()
    out = fn(src)
    if out == src:
        print(f'  {path:26} unchanged ({label})')
        return False
    print(f'  {path:26} {label}')
    if applied:
        io.open(path, 'w', encoding='utf-8').write(out)
    return True


def main():
    ap = '--apply' in sys.argv

    def do_sitemap(s):
        rows = ''.join(
            f'  <url><loc>{BASE}/{p["slug"]}</loc><lastmod>{TODAY}</lastmod>'
            f'<changefreq>monthly</changefreq><priority>0.7</priority></url>\n'
            for p in PAGES if f'{BASE}/{p["slug"]}<' not in s)
        return s.replace('</urlset>', rows + '</urlset>') if rows else s
    edit('sitemap.xml', do_sitemap, ap, 'added sitemap entries')

    def do_vercel(s):
        v = json.loads(s)
        have = {r.get('source') for r in v.get('redirects', [])}
        added = 0
        for p in PAGES:
            src = f'/{p["slug"]}.html'
            if src not in have:
                v['redirects'].append({'source': src, 'destination': f'/{p["slug"]}',
                                       'permanent': True})
                added += 1
        return json.dumps(v, indent=2) + '\n' if added else s
    edit('vercel.json', do_vercel, ap, 'added .html redirects')

    def do_llms(s):
        out = s
        for p in PAGES:
            if f'/{p["slug"]})' in out:
                continue
            rows = list(re.finditer(r'^- \[[^\]]+\]\(' + re.escape(BASE) + r'/[a-z-]+-tx\).*$',
                                    out, re.M))
            if not rows:
                break
            last = rows[-1]
            t, d = p['llms']
            out = out[:last.end()] + f'\n- [{t}]({BASE}/{p["slug"]}) — {d}' + out[last.end():]
        return out
    edit('llms.txt', do_llms, ap, 'added service-area links')

    def do_index(s):
        out = s
        anchor = '<a class="city-card" href="/san-antonio-tx">'
        if anchor not in out:
            return out
        for p in PAGES:
            if f'href="/{p["slug"]}"' in out:
                continue
            card = (f'<a class="city-card" href="/{p["slug"]}"><p>{p["group"]}</p>'
                    f'<h2>{p["label"]}</h2><span>{p["blurb"]} {ARROW}</span></a>')
            out = out.replace(anchor, card + anchor, 1)
        return out
    edit('service-areas.html', do_index, ap, 'added city cards')

    for p in PAGES:
        if not p['swap']:
            continue
        host, drop = p['swap']

        def do_swap(s, p=p, drop=drop, host=host):
            if f'href="/{p["slug"]}"' in s:
                return s
            block = re.search(r'<section class="section nearby-areas">.*?</section>', s, re.S)
            if not block:
                return s
            b = block.group(0)
            card = re.search(r'<a class="nearby-city" href="' + re.escape(drop) + r'">.*?</a>',
                             b, re.S)
            if not card:
                print(f'      ({drop} not in {host} grid -- left alone)')
                return s
            new = f'<a class="nearby-city" href="/{p["slug"]}"><span>{p["label"]}</span>{ARROW}</a>'
            return s.replace(b, b.replace(card.group(0), new, 1), 1)
        edit(host, do_swap, ap, f'nearby-areas: {drop} -> /{p["slug"]}')

    print(f'\n{"APPLIED" if ap else "DRY RUN -- re-run with --apply"}')
    print('Then re-run build_llms_full.py --apply.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
