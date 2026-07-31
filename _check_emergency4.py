import re
c = open('emergency.html', encoding='utf-8').read()
for m in re.finditer(r'<div class="[^"]*(?:hero|emergency)[^"]*"', c):
    print(m.group()[:200])