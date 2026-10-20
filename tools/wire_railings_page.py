#!/usr/bin/env python3
"""Wire glass-railings.html into the rest of the site.

Same job as wire_film_pages.py, same reasoning: a new page is not finished
when the file exists. It also has to be in sitemap.xml, have its .html ->
extensionless redirect in vercel.json, appear in llms.txt, be known to the
chat's knowledge base, and be linked to from a page that already has
authority. A page nothing links to is one search engines treat as an orphan.

The chat entry is the one that bites. data/company-knowledge.js grounds
api/chat.js. Publish this page without it and the site's own assistant will
tell a customer standing on the glass railings page that the company does not
do glass railings.

The inbound link goes in the footer's Services column, site-wide, not in a
related-services grid the way the film pages were wired. Two reasons. Every
plausible parent page -- commercial-glass, custom-glass, glass-types,
storefront-glass -- already carries four cards, and that grid is
repeat(4, 1fr), so a fifth card wraps and leaves a lone orphan on a second
row. And a footer entry is where a service belongs anyway: it is one link from
all 60 pages instead of one link from one page, which is a far better answer
to the orphan problem the film pages were solving.

The footer Services column is a plain <ul>, so a fifth item just makes the
list longer. No layout constraint to trip over.

llms-full.txt is deliberately left alone. It is a full page-content dump, not
a link list, and it currently covers 5 of 60 pages -- the three film pages are
missing from it too. Appending a bare link would put the wrong shape of entry
in it; filling it in properly is its own job, not this one.

Idempotent: every step checks for its own output first, so re-running after
adding another page only touches what is missing.

Usage: wire_railings_page.py [--apply]
"""

import io
import json
import re
import sys

BASE = 'https://www.mgsusa.llc'
TODAY = '2026-10-20'
SLUG = 'glass-railings'
NAME = 'Glass railings'
CARD = 'Guards for stairs, balconies and mezzanines that keep the view.'
CHAT = ('Glass railings and balustrades for stairs, balconies, landings and mezzanines '
        '- laminated glass guards, frameless and post-and-panel systems. Buildings only.')
LLMS = ('Glass Railings', 'Glass balustrades and guards for stairs, balconies and mezzanines '
        '— laminated glass, frameless base-shoe and post-and-panel systems')
LINK_FROM = 'commercial-glass.html'

ARROW = ('<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
         'stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>')


def edit(path, fn, applied, label):
    src = io.open(path, encoding='utf-8').read()
    out = fn(src)
    if out == src:
        print(f'  {path:32} unchanged ({label})')
        return False
    print(f'  {path:32} {label}')
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

    def do_chat(s):
        if f"/{SLUG}'" in s:
            return s
        # Append after the last service entry in the services array.
        m = re.search(r'(services:\s*\[)(.*?)(\n\s*\][,;]?)', s, re.S)
        if not m:
            return s
        body = m.group(2).rstrip()
        row = f",\n      {{ name: '{NAME}', url: '/{SLUG}', blurb: '{CHAT}' }}"
        return s[:m.start(2)] + body + row + s[m.end(2):]
    edit('data/company-knowledge.js', do_chat, ap, 'added the service for the chat')

    def do_llms(s):
        if f'{BASE}/{SLUG})' in s:
            return s
        # Hang it off the last existing service link so it lands in that list.
        links = list(re.finditer(r'^- \[[^\]]+\]\(' + re.escape(BASE) + r'/[a-z-]+\).*$',
                                 s, re.M))
        if not links:
            return s
        last = links[-1]
        return s[:last.end()] + f'\n- [{LLMS[0]}]({BASE}/{SLUG}) — {LLMS[1]}' + s[last.end():]
    edit('llms.txt', do_llms, ap, 'added the service link')
    print('  llms-full.txt                    skipped on purpose '
          '(content dump, covers 5 of 60 pages)')

    # ---- footer link, site-wide -----------------------------------------
    anchor = '<li><a href="/mirrors">Mirrors</a></li>'
    item = f'<li><a href="/{SLUG}">{NAME}</a></li>'

    def do_footer(s):
        if f'href="/{SLUG}"' in s or anchor not in s:
            return s
        return s.replace(anchor, anchor + '\n        ' + item, 1)

    import glob
    touched = skipped = 0
    for f in sorted(glob.glob('*.html')):
        src = io.open(f, encoding='utf-8').read()
        out = do_footer(src)
        if out == src:
            skipped += 1
            continue
        touched += 1
        if ap:
            io.open(f, 'w', encoding='utf-8').write(out)
    print(f'  footer Services column           added to {touched} page(s), '
          f'{skipped} already had it or carry no footer')

    print(f'\n{"APPLIED" if ap else "DRY RUN -- re-run with --apply"}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
