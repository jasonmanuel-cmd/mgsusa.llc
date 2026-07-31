import re
c = open('index.html', encoding='utf-8').read()
# Find services section
idx = c.find('<section class="section services-section"')
if idx >= 0:
    print('SERVICES SECTION:')
    print(c[idx:idx+2000])