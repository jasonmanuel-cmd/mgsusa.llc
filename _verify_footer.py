import re
c = open('index.html', encoding='utf-8').read()
for m in re.finditer(r'<span class="footer-credit"[^>]*>[^<]*</span>', c):
    print(m.group())