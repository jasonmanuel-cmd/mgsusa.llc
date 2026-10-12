#!/usr/bin/env python3
"""Add the Simple Analytics snippet just before </body> on every real page.

Site-wide snippet changes have gone wrong here before. The PowerShell GTM
injectors put their snippet on 53 of 57 pages *twice*, and on the homepage one
of them broke an HTML comment so "so it does not compete with the hero. -->"
rendered as the first visible text on the page. This script is written against
both of those failures:

  * It is idempotent. A page that already contains the snippet is skipped, so
    running it twice cannot double-inject. That is checked by substring, not by
    a line count, because the pages are minified and a "line" means nothing.

  * It inserts a self-contained block and rewrites nothing around it. The
    homepage comment broke because the injector was editing text near a comment
    it did not parse. Here the only edit is replacing the final "</body>" with
    "<snippet></body>", so nothing outside the inserted string is touched.

  * It re-reads every file afterwards and asserts exactly one snippet and one
    </body>, so a partial or doubled write is reported rather than shipped.

Scope: the 55 pages that have a </body>. That is the same set the existing GTM
and HubSpot snippets are on, and matching the established set is deliberate --
a page that reports to one analytics system and not another produces numbers
nobody can reconcile later.

Deliberately excluded:

  * google93b10d8724bc77ae.html -- the Google Search Console verification file.
    It has no <body> and carries no other tracker. Its contents must stay
    exactly as Google issued them or verification can fail, which would cost
    the Search Console access the whole SEO effort depends on.

  * secondary-domain/ -- 92 near-duplicate pages that .vercelignore keeps off
    the deploy. Adding analytics to pages that are never served would only
    invite someone to think they are live.

Usage: add_simple_analytics.py [--apply]
"""

import glob
import io
import sys

# Verbatim from Simple Analytics' own install instructions. Not reformatted and
# not "improved": a vendor's embed is their contract, and a well-meant tweak to
# an attribute or the CDN host is how tracking silently stops working.
SNIPPET = (
    '\n<!-- 100% privacy-first analytics -->\n'
    '<script data-collect-dnt="true" async '
    'src="https://scripts.simpleanalyticscdn.com/latest.js"></script>\n'
    '<noscript><img src="https://queue.simpleanalyticscdn.com/noscript.gif'
    '?collect-dnt=true" alt="" referrerpolicy="no-referrer-when-downgrade"/>'
    '</noscript>\n'
)

MARKER = 'scripts.simpleanalyticscdn.com/latest.js'
CLOSE = '</body>'


def pages():
    return sorted(p for p in glob.glob('*.html'))


def main():
    apply_changes = '--apply' in sys.argv
    added, skipped, no_body = [], [], []

    for path in pages():
        src = io.open(path, encoding='utf-8').read()

        if MARKER in src:
            skipped.append(path)
            continue
        if CLOSE not in src:
            no_body.append(path)
            continue

        # rsplit, so the snippet lands before the LAST </body>. A stray earlier
        # one inside a string or comment would otherwise take the insertion with
        # it and strand the snippet mid-document.
        head, _, tail = src.rpartition(CLOSE)
        out = head + SNIPPET + CLOSE + tail

        added.append(path)
        if apply_changes:
            io.open(path, 'w', encoding='utf-8').write(out)

    verb = 'ADDED' if apply_changes else 'WOULD ADD'
    print(f'{verb}: {len(added)} page(s)')
    if skipped:
        print(f'already had it: {len(skipped)} page(s)')
    for p in no_body:
        print(f'  skipped (no {CLOSE}): {p}')

    if not apply_changes:
        print('\nDRY RUN -- nothing written. Re-run with --apply.')
        return 0

    # Verify from disk. The point is to catch a doubled or truncated write now,
    # not after it is on 55 live pages.
    bad = 0
    for path in pages():
        s = io.open(path, encoding='utf-8').read()
        n_snip = s.count(MARKER)
        n_body = s.count(CLOSE)
        if path in no_body:
            if n_snip:
                print(f'  ERROR {path}: snippet added to a page with no {CLOSE}')
                bad += 1
            continue
        if n_snip != 1:
            print(f'  ERROR {path}: {n_snip} copies of the snippet (want 1)')
            bad += 1
        if n_body != 1:
            print(f'  ERROR {path}: {n_body} {CLOSE} tags (want 1)')
            bad += 1
        # The snippet must sit inside the body, not after it.
        if n_snip == 1 and s.index(MARKER) > s.rindex(CLOSE):
            print(f'  ERROR {path}: snippet sits after {CLOSE}')
            bad += 1

    print(f'\n{"VERIFY FAILED: " + str(bad) + " problem(s)" if bad else "Verified: exactly one snippet, inside the body, on every page that has one."}')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
