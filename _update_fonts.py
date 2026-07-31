#!/usr/bin/env python3
"""
Update all HTML files to self-host Inter font (remove Google Fonts CDN).
"""

import re
import glob

def update_font_references(filepath):
    """Replace Google Fonts references with local font references."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Remove Google Fonts preconnect and preload
    content = re.sub(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\s*', '', content)
    content = re.sub(r'<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>\s*', '', content)
    content = re.sub(r'<link rel="preload" as="style" href="https://fonts\.googleapis\.com/css2\?family=Inter:wght@400;600;700;800;850&display=swap">\s*', '', content)
    content = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/css2\?family=Inter:wght@400;600;700;800;850&display=swap">\s*', '', content)
    
    # Add local font preloads (if not already present)
    # Check if local font preloads already exist
    if 'assets/fonts/Inter-' not in content:
        # Find the stylesheet link and add font preloads before it
        stylesheet_pattern = r'(<link rel="stylesheet" href="assets/styles\.min\.css">)'
        font_preloads = '''<link rel="preload" as="font" type="font/woff2" crossorigin href="assets/fonts/Inter-Regular.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="assets/fonts/Inter-Medium.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="assets/fonts/Inter-SemiBold.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="assets/fonts/Inter-Bold.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="assets/fonts/Inter-ExtraBold.woff2">
'''
        content = re.sub(stylesheet_pattern, font_preloads + r'\1', content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ Updated font references in {filepath}")
        return True
    else:
        print(f"  - No font changes needed in {filepath}")
        return False

def main():
    html_files = sorted(glob.glob('*.html'))
    total_updated = 0
    
    for html_file in html_files:
        if update_font_references(html_file):
            total_updated += 1
    
    print(f"\nTotal files updated: {total_updated}")

if __name__ == '__main__':
    main()