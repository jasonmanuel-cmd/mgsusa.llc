import re

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# Fix 1: request-quote.html mojibake (checkmark emoji)
print("Fixing request-quote.html mojibake...")
c = open('request-quote.html', encoding='utf-8').read()
# The double-encoded checkmark emoji âœ“ -> ✅
c = c.replace('âœ“', '✅')
write_file('request-quote.html', c)
print("  ✓ Fixed checkmark emoji")

# Fix 2: index.html LCP picture wrapper
print("Fixing index.html LCP picture wrapper...")
c = open('index.html', encoding='utf-8').read()

# Pattern: the hero-image img tag with inline styles
old_img = '''<img class="hero-image" src="assets/Residentialhero.png" alt="Premium commercial glass storefront at blue hour" fetchpriority="high" decoding="async" width="1920" height="1080" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;opacity:.88;">'''

new_picture = '''<picture>
      <source type="image/webp" srcset="assets/Residentialhero.webp">
      <img class="hero-image" src="assets/Residentialhero.png" alt="Premium commercial glass storefront at blue hour" fetchpriority="high" decoding="async" width="1920" height="1080" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;opacity:.88;">
    </picture>'''

if old_img in c:
    c = c.replace(old_img, new_picture)
    write_file('index.html', c)
    print("  ✓ Wrapped hero image in <picture> with WebP source")
else:
    print("  ✗ Pattern not found - checking for variations...")
    # Try to find what's actually there
    for m in re.finditer(r'<img class="hero-image"[^>]+>', c):
        print(f'    Found: {m.group()[:200]}...')

print("\nDone!")