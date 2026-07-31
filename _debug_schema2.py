import re

fn = 'index.html'
c = open(fn, encoding='utf-8').read()
blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', c, re.S)

with open('_schema_debug2.txt', 'w', encoding='utf-8') as out:
    for i, s in enumerate(blocks):
        t = re.search(r'"@type"\s*:\s*"([^"]+)"', s)
        out.write(f'Block {i}: @type = {t.group(1) if t else "???"} (len {len(s)})\n')
        out.write('FULL BLOCK:\n')
        out.write(s + '\n\n')