import re
c = open('frameless-vs-framed-glass.html', encoding='utf-8').read()
blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', c, re.S)
for i, s in enumerate(blocks):
    t = re.search(r'"@type"\s*:\s*"([^"]+)"', s)
    print(f'Block {i}: @type = {t.group(1) if t else "???"}')
    if 'Article' in s:
        print('HAS ARTICLE SCHEMA')
        print(s[:500])