#!/usr/bin/env python3
"""Regenerate assets/styles.min.css from assets/styles.css.

CLAUDE.md has always said to edit `styles.css` and then regenerate the `.min`
file, and never to patch the `.min` directly -- but no tool to regenerate it
existed, so the only way to honour the instruction was to hand-edit both and
hope they stayed in step. This is that tool.

The transform is comment-stripping plus whitespace collapsing. That is all the
difference between the two files has ever been: normalising both on 2026-10-24
produced byte-identical text, which is also the evidence that they had not yet
drifted apart.

Structure is minified; **declaration values are copied through untouched**.
Spaces are not optional everywhere in CSS -- `calc(100% - 32px)` needs them
around the operator, a descendant combinator *is* a space, and a custom
property keeps its token stream verbatim, so `--font-sans: Inter, ui-sans-serif`
and `--font-sans:Inter,ui-sans-serif` are two different strings as far as the
CSSOM is concerned. The first version of this stripped spaces after commas
everywhere and changed `:root` for exactly that reason; the browser check
caught it, which is what the browser check is for.

The verification is the point of the script, not the minification: it loads the
old and new stylesheets in Chromium and compares what the CSSOM parsed out of
each, rule by rule. Comparing text would only prove the script did what it was
told; comparing parsed rules proves the browser sees the same stylesheet. Any
rule the new file gains, loses or changes is printed.

Usage: build_styles_min.py [--apply]
"""

import io
import json
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, 'assets/styles.css')
OUT = os.path.join(HERE, 'assets/styles.min.css')
CHROME = '/opt/pw-browsers/chromium'
PW = os.path.join(HERE, 'node_modules/playwright-core')


def minify(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    out, i, n = [], 0, len(css)

    def structural(s):
        s = re.sub(r'\s+', ' ', s)
        s = re.sub(r'\s*([{};>])\s*', r'\1', s)
        return s

    while i < n:
        j = css.find(':', i)
        if j < 0:
            out.append(structural(css[i:]))
            break
        # A colon starts a declaration value only if the next structural
        # character is `;` or `}`. If it is `{`, the colon was part of a
        # selector -- `a:hover`, `::after`, `:not(...)`, `@media(min-width:x)`.
        k = min((p for p in (css.find(c, j) for c in '{;}') if p >= 0),
                default=-1)
        out.append(structural(css[i:j]))
        if k < 0 or css[k] == '{':
            out.append(':')
            i = j + 1
            continue
        out.append(':')
        # Value copied through verbatim, bar leading/trailing whitespace.
        out.append(css[j + 1:k].strip())
        out.append(css[k])
        i = k + 1

    css = ''.join(out)
    css = re.sub(r';}', '}', css)
    # One top-level rule per line. Byte-for-byte this is three dozen newlines
    # in a 74 KB file, and it is the difference between a readable diff and a
    # 74 KB single line that reports every future change as "the whole file".
    lines, depth, cur = [], 0, []
    for ch in css:
        cur.append(ch)
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                lines.append(''.join(cur).strip())
                cur = []
    if ''.join(cur).strip():
        lines.append(''.join(cur).strip())
    return '\n'.join(lines) + '\n'


JS = r'''
const { chromium } = require(process.argv[2]);
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: process.argv[3] });
  const page = await b.newPage();
  const read = async file => {
    await page.setContent('<style>' + fs.readFileSync(file, 'utf8') + '</style>');
    return await page.evaluate(() => {
      const out = [];
      const walk = list => {
        for (const r of list) {
          out.push(r.cssText.replace(/\s+/g, ' ').trim());
          if (r.cssRules) walk(r.cssRules);
        }
      };
      walk(document.styleSheets[0].cssRules);
      return out;
    });
  };
  const before = await read(process.argv[4]);
  const after = await read(process.argv[5]);
  await b.close();
  console.log(JSON.stringify({ before, after }));
})().catch(e => { console.error(e.message); process.exit(2); });
'''


def verify(old_path, new_path):
    with tempfile.TemporaryDirectory() as d:
        js = os.path.join(d, 'cmp.cjs')
        io.open(js, 'w', encoding='utf-8').write(JS)
        r = subprocess.run(['node', js, PW, CHROME, old_path, new_path],
                           capture_output=True, text=True, timeout=180)
    if r.returncode != 0:
        print('  could not verify in Chromium:', r.stderr.strip()[:300])
        return None
    data = json.loads(r.stdout)
    before, after = data['before'], data['after']
    gained = [x for x in after if x not in before]
    lost = [x for x in before if x not in after]
    print(f'  parsed rules: {len(before)} before, {len(after)} after')
    for x in lost:
        print('  LOST   ', x[:150])
    for x in gained:
        print('  GAINED ', x[:150])
    return not lost, gained


def main():
    src = io.open(SRC, encoding='utf-8').read()
    new = minify(src)
    old = io.open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''

    if new == old:
        print('  styles.min.css is already up to date.')
        return 0

    print(f'  {len(old):,} -> {len(new):,} bytes')

    with tempfile.TemporaryDirectory() as d:
        cand = os.path.join(d, 'new.css')
        io.open(cand, 'w', encoding='utf-8').write(new)
        res = verify(OUT, cand)

    if res is None:
        print('\nNOT WRITTEN -- the browser check could not run, and an '
              'unverified stylesheet is not worth the bytes it saves.')
        return 1
    no_loss, gained = res
    if not no_loss:
        print('\nVERIFY FAILED -- the new file drops rules the old one had.')
        return 1

    if '--apply' in sys.argv:
        io.open(OUT, 'w', encoding='utf-8', newline='\n').write(new)
        print(f'\nWrote {os.path.relpath(OUT, HERE)} '
              f'({len(gained)} rule(s) added, none lost). '
              f'Now bump styles.min.css?v=N on the pages and the '
              f'service worker.')
        return 0

    print('\nDRY RUN -- re-run with --apply.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
