import re
c = open('about.html', encoding='utf-8').read()
# Find the full inner-hero section
idx = c.find('<section class="inner-hero">')
if idx >= 0:
    print(c[idx:idx+800])