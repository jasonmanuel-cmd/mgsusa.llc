import re
c = open('emergency.html', encoding='utf-8').read()
# Find the main section
idx = c.find('<section')
if idx >= 0:
    print(c[idx:idx+800])