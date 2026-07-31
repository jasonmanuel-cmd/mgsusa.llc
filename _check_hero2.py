import re
c = open('index.html', encoding='utf-8').read()
# Search for hero image
for m in re.finditer(r'<img[^>]+src=["\']assets/[^"\']+Residentialhero[^"\']*["\']', c):
    print('Found:', m.group())
    break