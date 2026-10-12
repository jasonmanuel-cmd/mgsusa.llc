#!/usr/bin/env python3
"""Assert the quote forms ask for exactly what the server requires.

Two things go wrong here and neither is visible by looking at a page:

  * The asterisk drifts from the `required` attribute, so the form either
    marks a field as needed and lets it through, or demands one it never
    flagged. The second kind is worse: the customer gets a browser validation
    bubble on a field with no asterisk and has to hunt for it.

  * The form and api/submit-quote disagree. Before the required set was cut,
    the forms demanded `details` and `phone` that validateQuote never wanted,
    so visitors were being turned away over fields the backend ignored. Going
    the other way is worse still -- a relaxed form with a strict server fails
    *after* the customer has typed everything.

Two form shapes exist. The quote forms carry a `service` select and are handled
by validateQuote; the planning checklist has no service field and goes through
validateChecklist. They are checked against their own contracts, not a shared
one, because conflating them is how the checklist ends up demanding a field it
does not have.

Usage: form-required-check.py
"""

import glob
import io
import re
import sys

QUOTE_REQUIRED = {'first-name', 'email', 'service', 'consent'}
CHECKLIST_REQUIRED = {'first-name', 'email', 'consent'}


def fields(form_html):
    req, star = set(), set()
    for m in re.finditer(r'<label([^>]*)>(.*?)</label>', form_html, re.S):
        body = m.group(2)
        n = re.search(r'name="([^"]+)"', body)
        if not n:
            continue
        if re.search(r'<(?:input|select|textarea)[^>]*\brequired\b', body):
            req.add(n.group(1))
        if '<b>' in body:
            star.add(n.group(1))
    return req, star


def main():
    problems = 0
    checked = 0
    for path in sorted(glob.glob('*.html')):
        s = io.open(path, encoding='utf-8').read()
        if 'id="quote-form"' not in s:
            continue
        form = s[s.index('id="quote-form"'):]
        form = form[:form.index('</form>')]

        # The same rule quote-form.js uses to pick the payload kind
        # (`fields.details || fields.timeline`). Keying off the service field
        # instead misreads the checklist, which also has one, and then demands
        # a `required` the checklist contract does not want.
        is_quote = 'name="details"' in form or 'name="timeline"' in form
        expect = QUOTE_REQUIRED if is_quote else CHECKLIST_REQUIRED
        kind = 'quote' if is_quote else 'checklist'

        req, star = fields(form)
        issues = []
        if req != expect:
            issues.append(f'required={sorted(req)} wanted {sorted(expect)}')
        if req != star:
            issues.append(f'asterisks={sorted(star)} do not match required={sorted(req)}')

        checked += 1
        if issues:
            problems += 1
            print(f'  FAIL {path:38} [{kind}] ' + ' | '.join(issues))
        else:
            print(f'  ok   {path:38} [{kind}] {", ".join(sorted(req))}')

    print(f'\n{problems} problem(s)' if problems
          else f'\nall {checked} form(s) consistent with the server contract')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
