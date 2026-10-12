#!/usr/bin/env python3
"""Make the on-page copy agree with the titles about which market leads.

The titles were flipped to San Antonio-first. The H1s, eyebrow labels and meta
descriptions were not, so a search result said "San Antonio" and the page it
opened said "Boerne" -- and the H1 is both a ranking signal and the first line
a visitor reads.

The swap is deliberately minimal. Both markets are still named, the sentences
keep their shape, and nothing is reworded beyond the order:

    Boerne & San Antonio   ->  San Antonio & Boerne
    Boerne and San Antonio ->  San Antonio and Boerne
    BOERNE + SAN ANTONIO   ->  SAN ANTONIO + BOERNE

City pages are excluded. On boerne-tx.html, leading with Boerne is correct --
that page is about Boerne. Swapping there would make it worse.

Fields touched: <h1>, .eyebrow, meta description, og:description,
twitter:description. Titles and og:title were done earlier.

Usage: flip_market_order.py [--apply]
"""

import glob
import io
import os
import re
import sys

SWAPS = [
    ('Boerne &amp; San Antonio', 'San Antonio &amp; Boerne'),
    ('Boerne & San Antonio',     'San Antonio & Boerne'),
    ('Boerne and San Antonio',   'San Antonio and Boerne'),
    ('BOERNE + SAN ANTONIO',     'SAN ANTONIO + BOERNE'),
    ('Boerne, San Antonio',      'San Antonio, Boerne'),
]

# Only inside these. A blanket find-and-replace would also rewrite body prose
# and the nearby-areas lists, where the order carries no marketing weight and
# the sentences were written to read a particular way.
REGIONS = [
    (re.compile(r'(<h1[^>]*>)(.*?)(</h1>)', re.S), 'h1'),
    (re.compile(r'(<p class="eyebrow"[^>]*>)(.*?)(</p>)', re.S), 'eyebrow'),
    (re.compile(r'(<meta name="description" content=")([^"]*)(")'), 'description'),
    (re.compile(r'(<meta property="og:description" content=")([^"]*)(")'), 'og:description'),
    (re.compile(r'(<meta name="twitter:description" content=")([^"]*)(")'), 'twitter:description'),
]


def swap(text):
    out = text
    for a, b in SWAPS:
        out = out.replace(a, b)
    return out


def main():
    apply_changes = '--apply' in sys.argv
    pages = [p for p in sorted(glob.glob('*.html'))
             if not p.endswith('-tx.html')
             and not p.startswith('google')
             and p not in ('404.html', 'emergency.html')]

    totals = {}
    touched = 0

    for path in pages:
        src = io.open(path, encoding='utf-8').read()
        out = src
        per_page = []

        for pattern, label in REGIONS:
            def repl(m):
                inner = swap(m.group(2))
                if inner != m.group(2):
                    per_page.append(label)
                return m.group(1) + inner + m.group(3)
            out = pattern.sub(repl, out)

        if out != src:
            touched += 1
            for lbl in per_page:
                totals[lbl] = totals.get(lbl, 0) + 1
            print(f'  {path:40} {", ".join(sorted(set(per_page)))}')
            if apply_changes:
                io.open(path, 'w', encoding='utf-8').write(out)

    print(f'\n{"APPLIED" if apply_changes else "DRY RUN"}: {touched} pages')
    for lbl, n in sorted(totals.items()):
        print(f'  {lbl:22} {n}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
