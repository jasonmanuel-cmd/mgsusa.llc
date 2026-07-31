import re
c = open('residential-glass.html', encoding='utf-8').read()
# Find the inner-hero section
idx = c.find('<section class="inner-hero">')
if idx >= 0:
    print(c[idx:idx+800])