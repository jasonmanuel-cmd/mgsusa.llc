#!/usr/bin/env python3
"""Regenerate llms-full.txt from the pages themselves.

llms-full.txt is the plain-text dump of the site for AI and RAG ingestion. It
had drifted badly: it covered 5 of 60 pages, carried none of the three film
pages or the railings page, and its Quick Answers block still quoted a review
count that had been corrected everywhere else. Hand-maintaining a content dump
is how that happens, so this rebuilds it from the HTML instead.

What it keeps and what it regenerates
-------------------------------------
The preamble -- the title block, Quick Answers and the Scope of Work section --
is hand-authored, is the most useful part of the file for a model answering a
question about this business, and says things no page says in one place. It is
read out of the existing file and preserved verbatim. Everything from the first
page section onwards is regenerated.

That means a correction to Quick Answers is still a hand edit. It is the one
part worth hand-editing; it is also the part that went stale, so check it
against reality when you run this.

Why the city pages are summarised rather than dumped
----------------------------------------------------
The 21 `<city>-tx.html` pages are 111 KB of near-identical prose with the city
name swapped. Dumping them would take the file from 58 KB to 268 KB and make
four fifths of it near-duplicate text. For retrieval that is worse than
useless: near-duplicate chunks crowd out the distinct content they sit beside,
so a question about shower enclosures starts competing with twenty-one
paragraphs that differ only in the word "Lytle". They get one combined section
listing every area served with its own page URL, which is the part that is
actually distinct.

Content comes from <main id="main"> only. The previous file included the header
and nav, so almost every section began "Request a quote Call 210-370-3700
Residential Commercial Emergency Service Areas" before reaching any real
content -- repeated boilerplate that is pure noise in an embedding.

Usage: build_llms_full.py [--apply]
"""

import glob
import io
import re
import sys
import html as H
from datetime import date

BASE = 'https://www.mgsusa.llc'

# Not content: a redirect stub, the Google verification file, the private admin
# desk, a form page with nothing to read, and the post-submit thank-you.
EXCLUDE = {'emergency.html', '404.html', 'followup-desk.html',
           'thank-you.html', 'review.html'}

# Services first, then the reference material, then the transactional and legal
# pages. A model reading top-down should meet the work before the small print.
ORDER = [
    'index.html',
    'residential-glass.html', 'commercial-glass.html', 'emergency-glass-repair.html',
    'storefront-glass.html', 'shower-enclosures.html', 'mirrors.html',
    'window-glass-replacement.html', 'custom-glass.html', 'glass-railings.html',
    'storm-damage-glass.html', 'commercial-security-film.html',
    'commercial-window-tint.html', 'perforated-window-graphics.html',
    'hill-country-glass.html',
    'glass-types.html', 'frameless-vs-framed-glass.html',
    'commercial-glass-guide.html', 'glass-cleaning-maintenance.html',
    'glass-project-planning-checklist.html', 'quote-process.html',
    'resources.html', 'faq.html', 'about.html', 'gallery.html', 'reviews.html',
    'service-areas.html', 'contact.html',
    'request-quote.html', 'residential-quote.html', 'commercial-quote.html',
    'privacy-policy.html', 'terms-and-conditions.html',
]

BLOCK = re.compile(r'<(script|style|svg|noscript)\b.*?</\1>', re.S | re.I)


def slug(fn):
    return '' if fn == 'index.html' else '/' + fn[:-5]


def extract(fn):
    """Readable text from <main>, with headings and list items preserved."""
    s = io.open(fn, encoding='utf-8').read()
    m = re.search(r'<main id="main">(.*?)</main>', s, re.S)
    body = m.group(1) if m else s
    body = BLOCK.sub(' ', body)
    # The project carousel is images and captions for photos a reader cannot
    # see; its alt text adds nothing a model can use.
    body = re.sub(r'<section class="section section-cream project-slideshow-section">.*?</section>',
                  ' ', body, flags=re.S)
    body = re.sub(r'<(figure|picture)\b.*?</\1>', ' ', body, flags=re.S | re.I)

    # Mark structure before tags are stripped. Page headings become ### so they
    # nest under the file's own ## section headings instead of competing.
    body = re.sub(r'<h1[^>]*>(.*?)</h1>', r'\n\n### \1\n', body, flags=re.S | re.I)
    body = re.sub(r'<h([2-4])[^>]*>(.*?)</h\1>', r'\n\n### \2\n', body, flags=re.S | re.I)
    body = re.sub(r'<summary[^>]*>(.*?)</summary>', r'\n\nQ: \1\n', body, flags=re.S | re.I)
    body = re.sub(r'<li[^>]*>(.*?)</li>', r'\n- \1', body, flags=re.S | re.I)
    body = re.sub(r'</(p|div|section|ul|ol|details)>', r'\n\n', body, flags=re.I)

    body = re.sub(r'<[^>]+>', ' ', body)
    body = H.unescape(body)

    out = []
    for line in body.split('\n'):
        line = re.sub(r'[ \t ]+', ' ', line).strip()
        # Drop the "+" glyph the FAQ <summary> carries and stray bullets.
        if line in {'+', '-', '•', ''}:
            out.append('')
            continue
        if line.startswith('Q: '):
            line = re.sub(r'\s*\+$', '', line)
        out.append(line)
    text = '\n'.join(out)
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    # A heading immediately followed by its body reads better joined up.
    text = re.sub(r'\n-\s+\n', '\n', text)
    return text


def title_of(fn):
    s = io.open(fn, encoding='utf-8').read()
    m = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S)
    if m:
        return re.sub(r'\s+', ' ', H.unescape(re.sub(r'<[^>]+>', '', m.group(1)))).strip()
    m = re.search(r'<title>(.*?)</title>', s, re.S)
    return re.sub(r'\s*\|.*$', '', H.unescape(m.group(1))).strip() if m else fn


def city_summary():
    rows = []
    for fn in sorted(glob.glob('*-tx.html')):
        s = io.open(fn, encoding='utf-8').read()
        name = fn[:-8].replace('-', ' ').title()
        m = re.search(r'<meta name="description" content="([^"]*)"', s)
        desc = H.unescape(m.group(1)).strip() if m else ''
        rows.append(f'- {name}, TX — {BASE}{slug(fn)}\n  {desc}')
    return rows


def main():
    apply_changes = '--apply' in sys.argv

    old = io.open('llms-full.txt', encoding='utf-8').read()
    # Preserve everything above the first page section.
    cut = re.search(r'\n## (?!Quick Answers|Scope of Work)', old)
    if not cut:
        print('ERROR: could not find where the preamble ends'); return 1
    # The cut lands after the "---" rule that introduces the first page
    # section, so strip it -- otherwise each run keeps the previous run's rule
    # and adds its own, and the file grows a separator every time it is built.
    preamble = re.sub(r'(?:\s*\n-{3,})+\s*$', '', old[:cut.start()].rstrip()).rstrip()

    pages = [f for f in ORDER if glob.glob(f)]
    known = set(ORDER) | EXCLUDE
    missed = [f for f in sorted(glob.glob('*.html'))
              if f not in known and not f.endswith('-tx.html') and not f.startswith('google')]

    parts = [preamble, '']
    for fn in pages:
        body = extract(fn)
        if len(body) < 200:
            print(f'  SKIP {fn}: only {len(body)} chars of content')
            continue
        parts.append('---\n')
        parts.append(f'## {title_of(fn)}\n')
        parts.append(f'Source: {BASE}{slug(fn) or "/"}\n')
        parts.append(body + '\n')

    parts.append('---\n')
    # No Source: line -- this section is a composite of 21 pages, not one page,
    # and a second "Source: /service-areas" would collide with that page's own
    # section above and make the two indistinguishable to a chunker.
    parts.append('## Service Areas — Index of Local Pages\n')
    parts.append('Master Glass Solutions serves Boerne, San Antonio and the surrounding Texas\n'
                 'Hill Country. Each area below has its own page covering local service detail;\n'
                 'the summaries here are those pages’ own descriptions.\n')
    parts.extend(city_summary())
    parts.append('')
    parts.append('---\n')
    parts.append(f'Last updated: {date.today().isoformat()}')
    parts.append(f'Generated from the site by tools/build_llms_full.py — do not hand-edit below '
                 f'the Scope of Work section.')

    out = '\n'.join(parts).rstrip() + '\n'
    out = re.sub(r'\n{4,}', '\n\n\n', out)

    print(f'  {len(pages)} page sections + {len(city_summary())} service areas')
    print(f'  {len(old):,} chars -> {len(out):,} chars')
    if missed:
        print(f'  NOT INCLUDED (add to ORDER if they should be): {", ".join(missed)}')

    probs = []
    for fn in pages:
        if f'Source: {BASE}{slug(fn) or "/"}\n' not in out:
            probs.append(f'{fn} missing its Source line')
    if 'Quick Answers' not in out:
        probs.append('preamble lost')
    if '<' in out and re.search(r'<[a-z/][^>]*>', out):
        probs.append('HTML tags survived extraction')
    if probs:
        for p in probs:
            print(f'  ERROR: {p}')
        return 1

    if apply_changes:
        io.open('llms-full.txt', 'w', encoding='utf-8').write(out)
        print('\nWROTE llms-full.txt')
    else:
        print('\nDRY RUN -- re-run with --apply.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
