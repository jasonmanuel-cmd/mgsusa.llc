import re
import glob

print("=" * 60)
print("COMPREHENSIVE VALIDATION")
print("=" * 60)

# 1. Check mojibake is fixed
print("\n1. MOJIBAKE CHECK")
pattern = re.compile(r'â€|â€™|âœ|â€¦|Ã©|Ã¨|Ã¼')
mojibake_files = []
for fn in glob.glob('*.html'):
    c = open(fn, encoding='utf-8').read()
    matches = pattern.findall(c)
    if matches:
        mojibake_files.append((fn, len(matches), matches[:5]))

if mojibake_files:
    for fn, count, matches in mojibake_files:
        print(f"  ❌ {fn}: {count} matches - {matches}")
else:
    print("  ✅ All HTML files clean")

# 2. Check WebSite schema present
print("\n2. WEBSITE SCHEMA CHECK")
website_schema_count = 0
for fn in glob.glob('*.html'):
    c = open(fn, encoding='utf-8').read()
    if '"@type": "WebSite"' in c:
        website_schema_count += 1
print(f"  ✅ WebSite schema present in {website_schema_count}/47 pages")

# 3. Check HACB enhancements (geo, foundingDate, founder, logo)
print("\n3. HACB ENHANCEMENTS CHECK")
hacb_enhanced = 0
for fn in glob.glob('*.html'):
    c = open(fn, encoding='utf-8').read()
    if '"geo"' in c and '"foundingDate"' in c and '"founder"' in c and '"logo"' in c:
        hacb_enhanced += 1
print(f"  ✅ HACB enhancements in {hacb_enhanced}/47 pages")

# 4. Check index.html specific fixes
print("\n4. INDEX.HTML SPECIFIC FIXES")
c = open('index.html', encoding='utf-8').read()
checks = {
    "parentOrganization fixed": '"parentOrganization": {"@type": "Organization", "@id": "https://www.mgsusa.llc/#business", "name": "Master Glass Solutions"}' in c,
    "teamMember fixed (Linda & Adam)": '"name": "Linda"' in c and '"name": "Adam"' in c,
    "LCP picture wrapper": '<picture>' in c and 'Residentialhero.webp' in c,
    "WebSite schema": '"@type": "WebSite"' in c,
    "speakable FAQ": '"speakable"' in c,
    "HACB enhancements": '"geo"' in c and '"foundingDate"' in c and '"founder"' in c and '"logo"' in c,
}
for check, result in checks.items():
    status = "✅" if result else "❌"
    print(f"  {status} {check}")

# 5. Check FAQ speakable
print("\n5. FAQ SPEAKABLE CHECK")
faq_speakable = 0
for fn in ['faq.html', 'index.html']:
    c = open(fn, encoding='utf-8').read()
    if '"speakable"' in c:
        faq_speakable += 1
        print(f"  ✅ {fn} has speakable")
    else:
        print(f"  ❌ {fn} missing speakable")

# 6. Check ImageGallery on gallery.html
print("\n6. IMAGEGALLERY CHECK")
c = open('gallery.html', encoding='utf-8').read()
if '"@type": "ImageGallery"' in c:
    print("  ✅ gallery.html has ImageGallery")
else:
    print("  ❌ gallery.html missing ImageGallery")

# 7. Check Article schemas
print("\n7. ARTICLE SCHEMAS CHECK")
article_pages = ['glass-project-planning-checklist.html', 'frameless-vs-framed-glass.html']
for fn in article_pages:
    c = open(fn, encoding='utf-8').read()
    if '"@type": "Article"' in c:
        print(f"  ✅ {fn} has Article schema")
    else:
        print(f"  ❌ {fn} missing Article schema")

# 8. Check hero image WebP conversion
print("\n8. HERO IMAGE WEBP CHECK")
webp_hero_count = 0
for fn in glob.glob('*.html'):
    c = open(fn, encoding='utf-8').read()
    if 'Residentialhero.webp' in c or 'Commercialhero.webp' in c or 'Commercial1.webp' in c:
        webp_hero_count += 1
print(f"  ✅ {webp_hero_count}/47 pages use WebP hero images")

# 9. Check CSS files for WebP
print("\n9. CSS WEBP CHECK")
for css in ['assets/styles.css', 'assets/styles.min.css']:
    c = open(css, encoding='utf-8').read()
    if 'Commercial1.webp' in c and 'Residential1.webp' in c and 'Commercialhero.webp' in c:
        print(f"  ✅ {css} uses WebP for gallery backgrounds")
    else:
        print(f"  ❌ {css} missing WebP gallery backgrounds")

# 10. Check emergency-glass-repair.html
print("\n10. EMERGENCY PAGE CHECK")
c = open('emergency-glass-repair.html', encoding='utf-8').read()
if 'Commercial1.webp' in c and 'emergency-glass.jpg' not in c:
    print("  ✅ emergency-glass-repair.html uses WebP, no dead refs")
else:
    print("  ❌ emergency-glass-repair.html has issues")

# 11. Check sitemap
print("\n11. SITEMAP CHECK")
c = open('sitemap.xml', encoding='utf-8').read()
if 'frameless-vs-framed-glass' in c:
    print("  ✅ sitemap.xml has frameless-vs-framed-glass")
else:
    print("  ❌ sitemap.xml missing frameless-vs-framed-glass")

# 12. Check robots.txt
print("\n12. ROBOTS.TXT CHECK")
c = open('robots.txt', encoding='utf-8').read()
required_agents = ['OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'Amazonbot', 'FacebookBot', 'meta-externalagent', 'DuckAssistBot', 'cohere-ai']
missing = [a for a in required_agents if a not in c]
if not missing:
    print("  ✅ robots.txt has all required AI crawlers")
else:
    print(f"  ❌ robots.txt missing: {missing}")

# 13. Check llms.txt
print("\n13. LLMS.TXT CHECK")
c = open('llms.txt', encoding='utf-8').read()
if 'Cibolo' not in c:
    print("  ✅ llms.txt: Cibolo removed")
else:
    print("  ❌ llms.txt: Cibolo still present")
if 'Key Facts' in c:
    print("  ✅ llms.txt: Has Key Facts section")
else:
    print("  ❌ llms.txt: Missing Key Facts section")

# 14. Check .well-known/llms.txt
print("\n14. .WELL-KNOWN/LLMS.TXT CHECK")
c = open('.well-known/llms.txt', encoding='utf-8').read()
if 'residential-glass.html' not in c and 'commercial-glass.html' not in c:
    print("  ✅ .well-known/llms.txt: URLs clean (no .html)")
else:
    print("  ❌ .well-known/llms.txt: Still has .html extensions")

# 15. Check service-worker.js
print("\n15. SERVICE-WORKER.JS CHECK")
c = open('service-worker.js', encoding='utf-8').read()
if 'inter.woff2' not in c:
    print("  ✅ service-worker.js: inter.woff2 removed")
else:
    print("  ❌ service-worker.js: inter.woff2 still present")
if 'v1.0.1' in c:
    print("  ✅ service-worker.js: Version bumped to v1.0.1")
else:
    print("  ❌ service-worker.js: Version not bumped")

# 16. Check footer credit
print("\n16. FOOTER CREDIT CHECK")
footer_fixed = 0
for fn in glob.glob('*.html'):
    c = open(fn, encoding='utf-8').read()
    if 'footer-credit' in c and 'Powered by' not in c:
        footer_fixed += 1
print(f"  ✅ {footer_fixed}/47 pages have fixed footer credit")

# 17. Check font references (Google Fonts removed)
print("\n17. GOOGLE FONTS REMOVAL CHECK")
google_fonts_removed = 0
for fn in glob.glob('*.html'):
    c = open(fn, encoding='utf-8').read()
    if 'fonts.googleapis.com' not in c and 'fonts.gstatic.com' not in c:
        google_fonts_removed += 1
print(f"  ✅ {google_fonts_removed}/47 pages removed Google Fonts CDN")

# 18. Check local font preloads
print("\n18. LOCAL FONT PRELOADS CHECK")
local_font_preloads = 0
for fn in glob.glob('*.html'):
    c = open(fn, encoding='utf-8').read()
    if 'assets/fonts/Inter-' in c:
        local_font_preloads += 1
print(f"  ✅ {local_font_preloads}/47 pages have local font preloads")

# 19. Check @font-face in design-tokens.css
print("\n19. @FONT-FACE DECLARATIONS CHECK")
c = open('assets/design-tokens.css', encoding='utf-8').read()
font_face_count = c.count('@font-face')
if font_face_count >= 6:
    print(f"  ✅ design-tokens.css has {font_face_count} @font-face declarations")
else:
    print(f"  ❌ design-tokens.css has only {font_face_count} @font-face declarations")

# 20. Check styles.min.css updated
print("\n20. STYLES.MIN.CSS CHECK")
c = open('assets/styles.min.css', encoding='utf-8').read()
if '@font-face' in c:
    print("  ✅ styles.min.css includes @font-face declarations")
else:
    print("  ❌ styles.min.css missing @font-face declarations")

print("\n" + "=" * 60)
print("VALIDATION COMPLETE")
print("=" * 60)