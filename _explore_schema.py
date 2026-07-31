import re, glob, os

for fn in sorted(glob.glob('*.html')):
    c = open(fn, encoding='utf-8').read()
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', c, re.S)
    if not blocks:
        print('NO JSONLD:', fn)
        continue
    print('=' * 30, fn, f'({len(blocks)} blocks)', '=' * 30)
    for i, s in enumerate(blocks):
        # type
        t = re.search(r'"@type"\s*:\s*"([^"]+)"', s)
        print(f'  Block {i}: @type = {t.group(1) if t else "???"} (len {len(s)})')
        if 'HomeAndConstructionBusiness' in s:
            print('   HACB full block follows:')
            print('   ' + s.replace('\n', '\n   '))
