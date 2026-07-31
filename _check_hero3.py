import re
c = open('about.html', encoding='utf-8').read()
for m in re.finditer(r'<div class="inner-hero-image"[^>]*>', c):
    print('Found:', m.group()[:300])