import re
c = open('emergency-glass-repair.html', encoding='utf-8').read()
idx = c.find('<section class="inner-hero">')
if idx >= 0:
    print(c[idx:idx+800])