#!/usr/bin/env python3
"""Attribute the "40+ years" claim so it stops contradicting "Founded 2004".

The company was founded in 2004. That is 22 years, and it is stated as
"Founded 2004" on all 56 pages and in the JSON-LD `foundingDate`. Alongside it,
19 pages claim "40+ years" of experience -- and three of them manage both in a
single sentence: "Founded 2004 with 40+ years of expertise."

Both numbers are true. 40+ years is the founder's time in the glass trade and
the install team's combined experience, which is what the pages that say
"combined" already convey correctly. The problem is only the unattributed ones:
read literally they say the business is 40 years old, which its own founding
date denies on the same page.

That matters more than it looks. A visitor skims past it, but an assistant
asked "how long has Master Glass Solutions been in business?" has to pick one,
and a page that contradicts itself is a page it will describe wrongly -- or
decline to vouch for. The two numbers also make the business look like it is
inflating its age, which is the opposite of the trust the claim is there to buy.

So: insert the attribution rather than delete the claim. Deleting it would
throw away a true and useful fact; 40 years of trade experience is worth more
than 22 years of incorporation, and the honest version keeps both.

Pages already saying "combined" are left exactly as they are.

Usage: fix_experience_claim.py [--apply]
"""

import glob
import io
import sys

# Literal, not regex. Each left side is a string that actually appears in the
# pages (verified by grep first); each right side adds the attribution and
# changes nothing else. Anything already carrying "combined" is absent here on
# purpose.
REPLACEMENTS = [
    # Trust badge, 15 pages.
    ('<b>40+ years</b> of experience',
     '<b>40+ years</b> of combined experience'),
    # custom-glass.html: meta description, og:description and the JSON-LD
    # description. The self-contradicting one -- both claims, one sentence.
    ('Founded 2004 with 40+ years of expertise',
     'Founded 2004, with 40+ years of combined team expertise'),
    # about.html, the owner's Person entry.
    ('"description": "40+ years of glass industry experience"',
     '"description": "40+ years in the glass trade"'),
    # Body prose.
    ('brings 40+ years of glass industry experience',
     'brings 40+ years of combined glass industry experience'),
    # Hero proof point.
    ('<span>40+ years field experience</span>',
     '<span>40+ years combined field experience</span>'),
]


def main():
    apply_changes = '--apply' in sys.argv
    pages = sorted(glob.glob('*.html'))
    total = 0
    touched = 0

    for path in pages:
        src = io.open(path, encoding='utf-8').read()
        out = src
        hits = []
        for old, new in REPLACEMENTS:
            n = out.count(old)
            if n:
                out = out.replace(old, new)
                hits.append((n, old[:48]))
                total += n
        if out != src:
            touched += 1
            print(f'  {path:40} ' + ', '.join(f'{n}x "{t}..."' for n, t in hits))
            if apply_changes:
                io.open(path, 'w', encoding='utf-8').write(out)

    print(f'\n{"APPLIED" if apply_changes else "DRY RUN"}: '
          f'{total} replacement(s) across {touched} page(s)')

    # A page that still pairs the two claims without attribution is the thing
    # this script exists to prevent, so say so rather than exiting quietly.
    if apply_changes:
        leftovers = []
        for path in pages:
            s = io.open(path, encoding='utf-8').read()
            for old, _ in REPLACEMENTS:
                if old in s:
                    leftovers.append(path)
                    break
        if leftovers:
            print('STILL UNATTRIBUTED: ' + ', '.join(sorted(set(leftovers))))
            return 1
        print('No unattributed "40+ years" claim remains.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
