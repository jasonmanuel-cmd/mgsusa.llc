#!/usr/bin/env python3
"""Register the service worker on every real page, from one external file.

The registration was an inline snippet on 7 of 60 pages: index, contact, the
two glass hubs and the three quote pages. The other 53 -- including all 21 city
landing pages -- never registered the worker at all. So the visitor arriving
from a local search, which is the whole point of those pages, was the one least
likely to get the caching the worker exists to provide, while CLAUDE.md spends
more words on cache-version discipline than on anything else.

This removes the 7 inline copies and loads assets/js/sw-register.js everywhere
instead. Same scope rule as the motion layer: every page that carries
motion.js, which excludes emergency.html (a redirect stub) and the Google
verification file (not a page).

Inserted next to the other deferred scripts so the three sit together.

Idempotent: a page already carrying the script is skipped.

Usage: add_sw_register.py [--apply]
"""

import glob
import io
import re
import sys

SCRIPT = '<script src="assets/js/sw-register.js?v=1" defer></script>'
MARKER = 'assets/js/sw-register.js'
ANCHOR = re.compile(r'(<script[^>]*assets/js/call-tracking\.js[^>]*>\s*</script>)')

# The old inline block, matched structurally rather than by exact text so a
# page with different whitespace is still cleaned up.
INLINE = re.compile(
    r'\s*<script>\s*//\s*Service Worker registration.*?</script>',
    re.S)


def main():
    apply_changes = '--apply' in sys.argv
    added, skipped, no_anchor, stripped = [], [], [], []

    for path in sorted(glob.glob('*.html')):
        src = io.open(path, encoding='utf-8').read()
        out = src

        if INLINE.search(out):
            out = INLINE.sub('', out)
            stripped.append(path)

        # Only pages that carry the motion layer are real pages.
        if 'assets/js/motion.js' not in out:
            if out != src and apply_changes:
                io.open(path, 'w', encoding='utf-8').write(out)
            continue

        if MARKER in out:
            skipped.append(path)
        elif ANCHOR.search(out):
            out = ANCHOR.sub(SCRIPT + r'\1', out, count=1)
            added.append(path)
        elif '</body>' in out:
            head, _, tail = out.rpartition('</body>')
            out = head + SCRIPT + '</body>' + tail
            added.append(path)
            no_anchor.append(path)

        if out != src and apply_changes:
            io.open(path, 'w', encoding='utf-8').write(out)

    print(f'  inline snippet removed from {len(stripped)} page(s): '
          f'{", ".join(stripped) or "-"}')
    print(f'  external script added to    {len(added)} page(s)')
    print(f'  already had it             {len(skipped)} page(s)')
    if no_anchor:
        print(f'  no call-tracking anchor, appended to </body>: {", ".join(no_anchor)}')

    if apply_changes:
        bad = 0
        for path in sorted(glob.glob('*.html')):
            s = io.open(path, encoding='utf-8').read()
            real = 'assets/js/motion.js' in s
            n = s.count(MARKER)
            if real and n != 1:
                print(f'  ERROR {path}: {n} copies (want 1)')
                bad += 1
            if not real and n:
                print(f'  ERROR {path}: added to a non-page')
                bad += 1
            if 'navigator.serviceWorker.register' in s:
                print(f'  ERROR {path}: an inline registration survived')
                bad += 1
        print('\n' + ('VERIFY FAILED' if bad else
                      'Verified: exactly one registration script on every real page, '
                      'no inline copies left.'))
        return 1 if bad else 0

    print('\nDRY RUN -- re-run with --apply.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
