#!/usr/bin/env python3
"""Put the click-to-call tracker on every page that has a phone link.

Scope is derived from the pages themselves — any page containing a `tel:` link
gets the script — rather than from a hand-maintained list. A page that gains a
phone link later and is missed is exactly the kind of silent gap this tracker
exists to close.

Inserted immediately before motion.js so the two deferred scripts sit together
and the order is obvious to whoever reads the page next. Both are `defer`, so
neither blocks rendering and the relative order between them does not matter.

Idempotent: a page already carrying the script is skipped, so re-running after
adding pages only touches the new ones.

Usage: add_call_tracking.py [--apply]
"""

import glob
import io
import re
import sys

SCRIPT = '<script src="assets/js/call-tracking.js?v=2" defer></script>'
MARKER = 'assets/js/call-tracking.js'
ANCHOR = re.compile(r'(<script[^>]*assets/js/motion\.js[^>]*>\s*</script>)')


def main():
    apply_changes = '--apply' in sys.argv
    added, skipped, no_phone, no_anchor = [], [], [], []

    for path in sorted(glob.glob('*.html')):
        src = io.open(path, encoding='utf-8').read()

        if 'href="tel:' not in src:
            no_phone.append(path)
            continue
        if MARKER in src:
            skipped.append(path)
            continue

        if ANCHOR.search(src):
            out = ANCHOR.sub(SCRIPT + r'\1', src, count=1)
        elif '</body>' in src:
            # No motion layer on this page (the redirect stub, for one), so fall
            # back to the end of the body rather than skipping a page that has a
            # phone link to measure.
            head, _, tail = src.rpartition('</body>')
            out = head + SCRIPT + '</body>' + tail
            no_anchor.append(path)
        else:
            no_anchor.append(path)
            continue

        added.append(path)
        if apply_changes:
            io.open(path, 'w', encoding='utf-8').write(out)

    print(f'  added to            {len(added)} page(s)')
    print(f'  already had it      {len(skipped)} page(s)')
    print(f'  no tel: link, left  {len(no_phone)} page(s): {", ".join(no_phone) or "-"}')
    if no_anchor:
        print(f'  no motion.js anchor, appended to </body>: {", ".join(no_anchor)}')

    if apply_changes:
        bad = 0
        for path in sorted(glob.glob('*.html')):
            s = io.open(path, encoding='utf-8').read()
            n = s.count(MARKER)
            has_tel = 'href="tel:' in s
            if has_tel and n != 1:
                print(f'  ERROR {path}: {n} copies of the script (want 1)')
                bad += 1
            if not has_tel and n:
                print(f'  ERROR {path}: script added to a page with no phone link')
                bad += 1
        print('\n' + ('VERIFY FAILED' if bad else
                      'Verified: exactly one tracker on every page with a tel: link.'))
        return 1 if bad else 0

    print('\nDRY RUN -- re-run with --apply.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
