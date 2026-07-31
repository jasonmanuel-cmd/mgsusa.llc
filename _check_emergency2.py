import re
c = open('emergency.html', encoding='utf-8').read()
# Find the emergency-landing section
idx = c.find('<section class="emergency-landing">')
if idx >= 0:
    print(c[idx:idx+800])