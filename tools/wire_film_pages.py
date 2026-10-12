#!/usr/bin/env python3
"""Wire the three window-film pages into the rest of the site.

A new page is not finished when the file exists. On this site it also has to be
in sitemap.xml, have its .html -> extensionless redirect in vercel.json, appear
in llms.txt, be known to the chat's knowledge base, and -- the one that decides
whether it ever ranks -- be linked to from a page that already has authority.
A page nothing links to is a page search engines treat as an orphan.

The chat entry matters more than it looks. data/company-knowledge.js grounds
api/chat.js, and it also carries the "not offered" list. Publish a window tint
page without updating it and the site's own assistant will tell a customer
standing on that page that the company does not do tint.

Inbound links go in the related-services grid, one per new page, each from the
page whose visitors are most likely to want it:

    emergency-glass-repair   -> security film          (after a break-in)
    window-glass-replacement -> window tint            (same glass, heat problem)
    storefront-glass         -> perforated graphics    (same frontage)

Each of those three currently shows 3 cards in a grid CSS defines as
repeat(4,1fr), so the fourth column is empty and a fourth card fills it rather
than wrapping. Pages already carrying 4 are left alone.

Usage: wire_film_pages.py [--apply]
"""

import io
import json
import re
import sys

BASE = 'https://www.mgsusa.llc'
TODAY = '2026-10-10'

NEW = [
    {'slug': 'commercial-security-film',
     'name': 'Security window film',
     'llms': ('Security Window Film', 'Safety and security film for commercial glass — '
              'fragment retention and forced-entry delay (buildings only)'),
     'chat': 'Safety and security window film for commercial buildings — glass fragment '
             'retention and forced-entry delay.',
     'from': 'emergency-glass-repair',
     'card': 'Slow the next break-in on the glass you just replaced.'},
    {'slug': 'commercial-window-tint',
     'name': 'Commercial window tint',
     'llms': ('Commercial Window Tint', 'Solar control film for building glass — heat, glare '
              'and UV reduction (buildings only, never vehicles)'),
     'chat': 'Commercial window tinting (solar control film) for building glass — heat, glare '
             'and UV reduction. Buildings only; never vehicle glass.',
     'from': 'window-glass-replacement',
     'card': 'Cut heat and glare through the glass you already have.'},
    {'slug': 'perforated-window-graphics',
     'name': 'Perforated window graphics',
     'llms': ('Perforated Window Graphics', 'One-way vision printed film for storefront glass — '
              'advertise outward, see out from inside'),
     'chat': 'Perforated one-way vision window graphics for storefront glass — printed graphic '
             'outside, view retained from inside.',
     'from': 'storefront-glass',
     'card': 'Turn the frontage into signage without losing the view out.'},
]

ARROW = ('<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
         'stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>')


def edit(path, fn, applied, label):
    src = io.open(path, encoding='utf-8').read()
    out = fn(src)
    if out == src:
        print(f'  {path:34} unchanged ({label})')
        return False
    print(f'  {path:34} {label}')
    if applied:
        io.open(path, 'w', encoding='utf-8').write(out)
    return True


def main():
    ap = '--apply' in sys.argv

    # ---- sitemap ---------------------------------------------------------
    def do_sitemap(s):
        rows = ''.join(
            f'  <url><loc>{BASE}/{n["slug"]}</loc><lastmod>{TODAY}</lastmod>'
            f'<changefreq>monthly</changefreq><priority>0.7</priority></url>\n'
            for n in NEW if f'{BASE}/{n["slug"]}<' not in s
        )
        return s.replace('</urlset>', rows + '</urlset>') if rows else s
    edit('sitemap.xml', do_sitemap, ap, 'added sitemap entries')

    # ---- vercel.json redirects ------------------------------------------
    def do_vercel(s):
        v = json.loads(s)
        have = {r.get('source') for r in v.get('redirects', [])}
        added = 0
        for n in NEW:
            src = f'/{n["slug"]}.html'
            if src not in have:
                v['redirects'].append({'source': src,
                                       'destination': f'/{n["slug"]}',
                                       'permanent': True})
                added += 1
        return json.dumps(v, indent=2) + '\n' if added else s
    edit('vercel.json', do_vercel, ap, 'added .html redirects')

    # ---- chat knowledge base --------------------------------------------
    def do_chat(s):
        anchor = ("      { name: 'Window glass replacement', url: '/window-glass-replacement', "
                  "blurb: 'Residential and commercial window glass replacement.' }")
        if anchor not in s or NEW[0]['slug'] in s:
            return s
        rows = ''.join(
            f",\n      {{ name: '{n['name']}', url: '/{n['slug']}', blurb: '{n['chat']}' }}"
            for n in NEW
        )
        return s.replace(anchor, anchor + rows, 1)
    edit('data/company-knowledge.js', do_chat, ap, 'added services for the chat')

    # ---- llms.txt --------------------------------------------------------
    def do_llms(s):
        anchor = ('- [Hill Country Glass](https://www.mgsusa.llc/hill-country-glass) — Custom glass '
                  'for Hill Country homes — limestone/concrete construction, wide openings, '
                  'thermal considerations')
        if anchor not in s or NEW[0]['slug'] in s:
            return s
        rows = ''.join(f'\n- [{t}]({BASE}/{n["slug"]}) — {d}'
                       for n in NEW for t, d in [n['llms']])
        return s.replace(anchor, anchor + rows, 1)
    edit('llms.txt', do_llms, ap, 'added service links')

    # ---- inbound internal links -----------------------------------------
    for n in NEW:
        host = n['from'] + '.html'

        def do_link(s, n=n):
            if f'href="/{n["slug"]}"' in s:
                return s
            if s.count('class="related-service"') != 3:
                return s                      # already full; leave the layout alone
            card = (f'<a class="related-service" href="/{n["slug"]}"><h3>{n["name"]}</h3>'
                    f'<p>{n["card"]}</p><span>{ARROW}</span></a>')
            i = s.index('<div class="related-grid">')
            j = s.index('</div>', s.rindex('class="related-service"', i))
            # close out the last card, then append ours before the grid closes
            end = s.index('</a>', j) + len('</a>')
            return s[:end] + card + s[end:]
        edit(host, do_link, ap, f'linked -> /{n["slug"]}')

    print(f'\n{"APPLIED" if ap else "DRY RUN -- re-run with --apply"}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
