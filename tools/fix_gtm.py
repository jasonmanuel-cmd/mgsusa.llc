#!/usr/bin/env python3
"""Undo the damage from the repeated add-gtm*.ps1 runs.

Three separate faults, all from the same cause -- the injector was run more
than once and was not comment-aware:

  1. 53 pages carry the GTM container <script> twice. Both are live, both
     push a gtm.start event, so every pageview is counted twice.
  2. index.html has a second GTM <noscript> that was dropped INSIDE an
     existing HTML comment, terminating it early. The remainder of that
     comment -- " so it does not compete with the hero. -->" -- renders as
     visible text at the very top of the homepage.
  3. Some pages carry the <noscript> twice.

Keep the FIRST occurrence of each (the one in <head>/top-of-<body>, which is
where Google's own snippet belongs) and drop the later duplicates.

Usage: fix_gtm.py [--apply]     (default is a dry run)
"""
import glob
import re
import sys

SCRIPT_RE = re.compile(
    r'<!-- Google Tag Manager -->\s*'
    r'<script>\(function\(w,d,s,l,i\).*?</script>\s*'
    r'<!-- End Google Tag Manager -->',
    re.S)

NOSCRIPT_RE = re.compile(
    r'<!-- Google Tag Manager \(noscript\) -->\s*'
    r'<noscript><iframe src="https://www\.googletagmanager\.com/ns\.html\?id=[^"]*"'
    r'.*?</noscript>\s*'
    r'<!-- End Google Tag Manager \(noscript\) -->',
    re.S)

# The homepage's broken comment, repaired by pulling the injected noscript back
# out and rejoining the two halves of the original comment text.
BROKEN_COMMENT_RE = re.compile(
    r'(deferred loader at the end of <body>)\s*'
    r'<!-- Google Tag Manager \(noscript\) -->\s*'
    r'<noscript><iframe src="https://www\.googletagmanager\.com/ns\.html\?id=[^"]*"'
    r'.*?</noscript>\s*'
    r'<!-- End Google Tag Manager \(noscript\) -->'
    r'( so it does not compete with the hero\. -->)',
    re.S)


def drop_extras(text, pattern):
    """Keep the first match, remove every later one."""
    removed = 0
    first = pattern.search(text)
    if not first:
        return text, 0
    head, tail = text[:first.end()], text[first.end():]
    while True:
        m = pattern.search(tail)
        if not m:
            break
        tail = tail[:m.start()] + tail[m.end():]
        removed += 1
    return head + tail, removed


def main():
    apply_changes = '--apply' in sys.argv
    total_s = total_n = total_c = 0
    touched = []

    for path in sorted(glob.glob('*.html')):
        original = open(path, encoding='utf-8').read()
        text = original
        comment_fixed = 0

        # Repair the broken comment first: it also removes the stray noscript
        # that caused it, so the de-dup below sees a clean file.
        text, comment_fixed = BROKEN_COMMENT_RE.subn(r'\1\2', text)

        text, n_script = drop_extras(text, SCRIPT_RE)
        text, n_noscript = drop_extras(text, NOSCRIPT_RE)

        if text != original:
            touched.append((path, n_script, n_noscript, comment_fixed))
            total_s += n_script
            total_n += n_noscript
            total_c += comment_fixed
            if apply_changes:
                open(path, 'w', encoding='utf-8').write(text)

    for path, s, n, c in touched:
        bits = []
        if s: bits.append(f'{s} dup script')
        if n: bits.append(f'{n} dup noscript')
        if c: bits.append('repaired comment')
        print(f'  {path:42} {", ".join(bits)}')

    print(f'\n{"APPLIED" if apply_changes else "DRY RUN"}: {len(touched)} files, '
          f'{total_s} duplicate scripts, {total_n} duplicate noscripts, '
          f'{total_c} broken comments repaired')
    return 0


if __name__ == '__main__':
    sys.exit(main())
