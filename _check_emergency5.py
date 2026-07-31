import re
c = open('emergency.html', encoding='utf-8').read()
# Find all section tags
for m in re.finditer(r'<section[^>]*>', c):
    print(m.group())