#!/usr/bin/env python3
"""How much unique content does each city page actually have?

21 city landing pages built from one template is the shape Google calls a
doorway: near-identical pages differing only by place name. Those get
consolidated or dropped rather than ranked, which looks exactly like "we built
21 pages and got no traffic".

This measures it instead of guessing. For each page it strips script, style and
template chrome (nav, footer), reduces to visible word sequences, and compares
every page against every other with a shingle (5-gram) Jaccard similarity --
the same rough idea a near-duplicate detector uses.

Reported per page:
  words      visible words left after chrome is removed
  uniq%      share of its 5-grams that appear on NO other city page
  twin       the most similar other page, and how similar

Rule of thumb: below ~20% unique, a page has little reason to exist separately.
"""

import glob
import re
import sys
from collections import Counter

SHINGLE = 5


def visible_text(html: str) -> str:
    html = re.sub(r'<script.*?</script>', ' ', html, flags=re.S | re.I)
    html = re.sub(r'<style.*?</style>', ' ', html, flags=re.S | re.I)
    html = re.sub(r'<!--.*?-->', ' ', html, flags=re.S)
    # Drop the shared chrome: header, footer, nav. These are identical
    # everywhere and would drown the real difference between pages.
    html = re.sub(r'<header.*?</header>', ' ', html, flags=re.S | re.I)
    html = re.sub(r'<footer.*?</footer>', ' ', html, flags=re.S | re.I)
    html = re.sub(r'<nav.*?</nav>', ' ', html, flags=re.S | re.I)
    text = re.sub(r'<[^>]+>', ' ', html)
    text = re.sub(r'&[a-z]+;|&#\d+;', ' ', text)
    return re.sub(r'\s+', ' ', text).strip().lower()


def shingles(text: str, n: int = SHINGLE):
    words = re.findall(r"[a-z0-9']+", text)
    return {' '.join(words[i:i + n]) for i in range(max(0, len(words) - n + 1))}, len(words)


def main():
    pattern = sys.argv[1] if len(sys.argv) > 1 else '*-tx.html'
    pages = sorted(glob.glob(pattern))
    if len(pages) < 2:
        print('need at least two pages'); return 1

    data = {}
    for p in pages:
        sh, wc = shingles(visible_text(open(p, encoding='utf-8').read()))
        data[p] = (sh, wc)

    # How many pages does each shingle appear on?
    seen = Counter()
    for sh, _ in data.values():
        for s in sh:
            seen[s] += 1

    rows = []
    for p, (sh, wc) in data.items():
        if not sh:
            continue
        uniq = sum(1 for s in sh if seen[s] == 1)
        best, best_score = None, 0.0
        for q, (sh2, _) in data.items():
            if q == p:
                continue
            inter = len(sh & sh2)
            union = len(sh | sh2)
            score = inter / union if union else 0
            if score > best_score:
                best, best_score = q, score
        rows.append((p, wc, 100.0 * uniq / len(sh), best, 100.0 * best_score))

    rows.sort(key=lambda r: r[2])
    print(f'{"page":32} {"words":>6} {"uniq%":>7}   closest twin')
    print('-' * 86)
    for p, wc, u, twin, score in rows:
        print(f'{p:32} {wc:6} {u:6.1f}%   {twin or "-":28} {score:5.1f}% alike')

    avg = sum(r[2] for r in rows) / len(rows)
    print('-' * 86)
    print(f'{"AVERAGE":32} {"":6} {avg:6.1f}%')
    print(f'\npages below 20% unique: {sum(1 for r in rows if r[2] < 20)} of {len(rows)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
