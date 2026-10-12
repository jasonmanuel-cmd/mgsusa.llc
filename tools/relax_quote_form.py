#!/usr/bin/env python3
"""Stop requiring fields the business does not actually need to answer a lead.

Every quote form required 8 of its 9 fields. At roughly a hundred visitors a
week the site has been producing about one lead a month, which is somewhere
near a 0.3% conversion rate against the 2-5% a local service site normally
sees. Required fields are the cheapest thing on that list to fix, and the fix
multiplies whatever the Google Business Profile work eventually brings, because
every one of those visitors arrives at this same form.

Two of the eight were doing most of the damage:

  * `details` was required, so the form could not be submitted without writing
    prose. Someone with a broken storefront at 9pm will not compose a paragraph.
  * `phone` and `email` were both required -- two contact methods demanded when
    one is enough to reply.

The server never agreed with any of this. validateQuote has never required
`details` or `phone`, so the form was turning people away over fields the
backend did not want. That mismatch is the tell: the asterisks were decoration,
not a data requirement.

After this, required is first name, email, service and consent. Consent stays
because it covers call and SMS follow-up. Everything else is asked for on the
callback, which is a conversation worth having anyway -- and a half-filled lead
beats a visitor who gave up.

Client and server are changed together on purpose. Relaxing only the HTML would
turn silent abandonment into a 422 after submission, which is worse: the
customer has already typed everything and now watches it fail.

Usage: relax_quote_form.py [--apply]
"""

import glob
import io
import re
import sys

# Required after this change: first-name, email, service, consent.
OPTIONAL_NOW = ['last-name', 'phone', 'location', 'details', 'blueprint']

HELPER_OLD = 'Fields marked <b>*</b> trigger immediate estimate routing and notification.'
HELPER_NEW = ('Only the fields marked <b>*</b> are needed to send this. '
              'The rest help us quote faster, and we can take them on the call.')


def relax_labels(html):
    """Drop `required` and the asterisk from the labels of optional fields."""
    changed = 0
    # Minified markup, so work label by label rather than assuming newlines.
    parts = html.split('<label')
    for i in range(1, len(parts)):
        chunk = parts[i]
        end = chunk.find('</label>')
        if end == -1:
            continue
        body, rest = chunk[:end], chunk[end:]
        name = re.search(r'name="([^"]+)"', body)
        if not name or name.group(1) not in OPTIONAL_NOW:
            continue
        before = body
        body = re.sub(r'<(input|select|textarea)\s+required\s+', r'<\1 ', body)
        body = re.sub(r'<(input|select|textarea)\s+([^>]*?)\s+required(\s|>)', r'<\1 \2\3', body)
        body = body.replace(' <b>*</b>', '')
        if body != before:
            changed += 1
        parts[i] = body + rest
    return '<label'.join(parts), changed


def main():
    apply_changes = '--apply' in sys.argv
    touched = 0

    for path in sorted(glob.glob('*.html')):
        src = io.open(path, encoding='utf-8').read()
        if 'id="quote-form"' not in src:
            continue
        out, n = relax_labels(src)
        out = out.replace(HELPER_OLD, HELPER_NEW)

        if out == src:
            print(f'  {path:28} no change')
            continue

        # Report what is still required, from the file itself rather than from
        # what this script intended -- the point is to see the result.
        form = out[out.index('id="quote-form"'):]
        form = form[:form.index('</form>')]
        fields = re.findall(r'<(?:input|select|textarea)([^>]*)>', form)
        req = [re.search(r'name="([^"]+)"', a).group(1)
               for a in fields if 'required' in a and re.search(r'name="([^"]+)"', a)]
        print(f'  {path:28} {n} relaxed -> required now: {", ".join(req)}')
        touched += 1
        if apply_changes:
            io.open(path, 'w', encoding='utf-8').write(out)

    print(f'\n{"APPLIED" if apply_changes else "DRY RUN -- re-run with --apply"}: {touched} page(s)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
