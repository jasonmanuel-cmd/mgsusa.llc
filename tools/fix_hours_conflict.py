#!/usr/bin/env python3
"""Make every page declare the same opening hours.

The site contradicted itself. index.html and about.html declared Mon-Fri
08:00-17:00 plus a Saturday morning, while the other 52 pages -- every city
page, the emergency page, every service page -- declared 00:00-23:59. Same
business, same @id, two different answers, and Google reads all of them.

Confirmed with the owner on 2026-10-12 that 210-370-3700 is genuinely answered
around the clock, so the 52 are right and these 2 were stale. They are brought
into line rather than the other way around.

The old block was also invalid on its own terms: the Sunday entry was
{"opens": "CLOSED"} with no `closes`. schema.org expects a time there, so that
entry said nothing a parser could use even before the conflict mattered.

No visible page copy states office hours -- checked -- so this is a
structured-data-only change and nothing on screen moves.

Usage: fix_hours_conflict.py [--apply]
"""

import glob
import io
import json
import re
import sys

# Exactly what the other 52 pages already carry, so this is a convergence
# rather than a third variant.
CANONICAL = {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
                  "Saturday", "Sunday"],
    "opens": "00:00",
    "closes": "23:59"
}

BLOCK_RE = re.compile(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', re.S)


def is_24_7(spec):
    if isinstance(spec, dict):
        spec = [spec]
    if not isinstance(spec, list) or len(spec) != 1:
        return False
    s = spec[0]
    return (isinstance(s, dict) and s.get('opens') == '00:00'
            and s.get('closes') == '23:59' and len(s.get('dayOfWeek', [])) == 7)


def main():
    apply_changes = '--apply' in sys.argv
    changed = 0

    for path in sorted(glob.glob('*.html')):
        src = io.open(path, encoding='utf-8').read()
        out = src
        hits = 0

        for m in BLOCK_RE.finditer(src):
            raw = m.group(1)
            try:
                data = json.loads(raw)
            except Exception:
                continue
            if not isinstance(data, dict) or 'openingHoursSpecification' not in data:
                continue
            if is_24_7(data['openingHoursSpecification']):
                continue

            # Replace only this key's value, by rewriting the block it lives in.
            data['openingHoursSpecification'] = CANONICAL
            out = out.replace(raw, json.dumps(data, ensure_ascii=False), 1)
            hits += 1

        if hits:
            changed += 1
            print(f'  {path:28} {hits} hours block(s) -> 24/7')
            if apply_changes:
                io.open(path, 'w', encoding='utf-8').write(out)

    if not changed:
        print('  every page already agrees')

    print(f'\n{"APPLIED" if apply_changes else "DRY RUN -- re-run with --apply"}: {changed} page(s)')

    if apply_changes:
        # The point was agreement, so verify agreement rather than the edit.
        variants = {}
        for path in sorted(glob.glob('*.html')):
            s = io.open(path, encoding='utf-8').read()
            for m in BLOCK_RE.finditer(s):
                try:
                    d = json.loads(m.group(1))
                except Exception:
                    continue
                if isinstance(d, dict) and 'openingHoursSpecification' in d:
                    key = json.dumps(d['openingHoursSpecification'], sort_keys=True)
                    variants.setdefault(key, []).append(path)
        print(f'\n{len(variants)} distinct hours declaration(s) across the site:')
        for key, pages in variants.items():
            print(f'  {len(pages):>3} page(s): {key[:110]}')
        return 0 if len(variants) == 1 else 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
