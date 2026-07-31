import re
c = open('index.html', encoding='utf-8').read()
# Find utility bar
idx = c.find('<div class="utility"')
if idx >= 0:
    print('UTILITY BAR:')
    print(c[idx:idx+500])
print()
# Find hero section
idx = c.find('<section class="hero-home"')
if idx >= 0:
    print('HERO SECTION:')
    print(c[idx:idx+1500])