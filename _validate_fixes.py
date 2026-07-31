import re, glob

# Check mojibake is fixed
print('=== Mojibake Check ===')
pattern = re.compile(r'â€|â€™|âœ|â€¦|Ã©|Ã¨|Ã¼')
for fn in ['commercial-glass.html','commercial-quote.html','contact.html','request-quote.html','residential-glass.html','residential-quote.html']:
    c = open(fn, encoding='utf-8').read()
    matches = pattern.findall(c)
    if matches:
        print(f'  {fn}: STILL HAS {len(matches)} matches - {matches[:5]}')
    else:
        print(f'  {fn}: CLEAN')

# Check WebSite schema present on index.html
print('\n=== WebSite Schema Check ===')
c = open('index.html', encoding='utf-8').read()
if '"@type": "WebSite"' in c:
    print('  index.html: HAS WebSite schema')
else:
    print('  index.html: MISSING WebSite schema')

# Check HACB enhancements on index.html
if '"geo"' in c and '"foundingDate"' in c and '"founder"' in c and '"logo"' in c:
    print('  index.html: HAS geo/foundingDate/founder/logo')
else:
    print('  index.html: MISSING some HACB enhancements')

# Check index.html parentOrganization fix
if '"parentOrganization": {"@type": "Organization", "@id": "https://www.mgsusa.llc/#business", "name": "Master Glass Solutions"}' in c:
    print('  index.html: parentOrganization FIXED')
else:
    print('  index.html: parentOrganization NOT fixed')

# Check index.html teamMember fix
if '"name": "Linda"' in c and '"name": "Adam"' in c:
    print('  index.html: teamMember FIXED to Linda & Adam')
else:
    print('  index.html: teamMember NOT fixed')

# Check LCP picture wrapper on index.html
if '<picture>' in c and 'Residentialhero.webp' in c:
    print('  index.html: HAS LCP picture wrapper')
else:
    print('  index.html: MISSING LCP picture wrapper')

# Check FAQ speakable
for fn in ['faq.html', 'index.html']:
    c = open(fn, encoding='utf-8').read()
    if '"speakable"' in c:
        print(f'  {fn}: HAS speakable')
    else:
        print(f'  {fn}: MISSING speakable')

# Check ImageGallery on gallery.html
c = open('gallery.html', encoding='utf-8').read()
if '"@type": "ImageGallery"' in c:
    print('  gallery.html: HAS ImageGallery')
else:
    print('  gallery.html: MISSING ImageGallery')

# Check Article on glass-project-planning-checklist.html
c = open('glass-project-planning-checklist.html', encoding='utf-8').read()
if '"@type": "Article"' in c:
    print('  glass-project-planning-checklist.html: HAS Article')
else:
    print('  glass-project-planning-checklist.html: MISSING Article')

# Check frameless-vs-framed-glass.html still has Article
c = open('frameless-vs-framed-glass.html', encoding='utf-8').read()
if '"@type": "Article"' in c:
    print('  frameless-vs-framed-glass.html: HAS Article (preserved)')
else:
    print('  frameless-vs-framed-glass.html: MISSING Article (LOST!)')

# Check hero image webp conversion on a sample page
c = open('residential-glass.html', encoding='utf-8').read()
if 'Residentialhero.webp' in c:
    print('  residential-glass.html: Hero uses .webp')
else:
    print('  residential-glass.html: Hero NOT using .webp')

# Check CSS files for webp
for css in ['assets/styles.css', 'assets/styles.min.css']:
    c = open(css, encoding='utf-8').read()
    if 'Commercial1.webp' in c and 'Residential1.webp' in c and 'Commercialhero.webp' in c:
        print(f'  {css}: Gallery backgrounds use .webp')
    else:
        print(f'  {css}: Gallery backgrounds NOT updated')

# Check emergency-glass-repair.html
c = open('emergency-glass-repair.html', encoding='utf-8').read()
if 'Commercial1.webp' in c and 'emergency-glass.jpg' not in c:
    print('  emergency-glass-repair.html: Emergency image FIXED')
else:
    print('  emergency-glass-repair.html: Emergency image NOT fixed')

# Check sitemap has frameless-vs-framed-glass
c = open('sitemap.xml', encoding='utf-8').read()
if 'frameless-vs-framed-glass' in c:
    print('  sitemap.xml: HAS frameless-vs-framed-glass')
else:
    print('  sitemap.xml: MISSING frameless-vs-framed-glass')

# Check robots.txt has new AI crawlers
c = open('robots.txt', encoding='utf-8').read()
required_agents = ['OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'Amazonbot', 'FacebookBot', 'meta-externalagent', 'DuckAssistBot', 'cohere-ai']
missing = [a for a in required_agents if a not in c]
if not missing:
    print('  robots.txt: HAS all required AI crawlers')
else:
    print(f'  robots.txt: MISSING {missing}')

# Check llms.txt fixes
c = open('llms.txt', encoding='utf-8').read()
if 'Cibolo' not in c:
    print('  llms.txt: Cibolo REMOVED')
else:
    print('  llms.txt: Cibolo STILL PRESENT')
if 'Key Facts' in c:
    print('  llms.txt: HAS Key Facts section')
else:
    print('  llms.txt: MISSING Key Facts section')

# Check .well-known/llms.txt clean URLs
c = open('.well-known/llms.txt', encoding='utf-8').read()
if 'residential-glass.html' not in c and 'commercial-glass.html' not in c:
    print('  .well-known/llms.txt: URLs CLEAN (no .html)')
else:
    print('  .well-known/llms.txt: STILL HAS .html extensions')

# Check service-worker.js
c = open('service-worker.js', encoding='utf-8').read()
if 'inter.woff2' not in c:
    print('  service-worker.js: inter.woff2 REMOVED')
else:
    print('  service-worker.js: inter.woff2 STILL PRESENT')
if 'v1.0.1' in c:
    print('  service-worker.js: Version BUMPED to v1.0.1')
else:
    print('  service-worker.js: Version NOT bumped')

print('\n=== All Checks Complete ===')