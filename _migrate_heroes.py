#!/usr/bin/env python3
"""
Migrate all inner hero background-image inline styles to <picture> + WebP elements.
This script processes all HTML files and converts the inline background-image
hero sections to use <picture> with WebP source for LCP optimization.
"""

import re
import glob
import os

# Mapping of hero images to their WebP counterparts
HERO_WEBP_MAP = {
    'Residentialhero.png': 'Residentialhero.webp',
    'Commercialhero.png': 'Commercialhero.webp',
    'Commercial1.png': 'Commercial1.webp',
    'Residential1.png': 'Residential1.webp',
    'Residential3.png': 'Residential3.webp',
    'Residential4.png': 'Residential4.webp',
    'Residential5.png': 'Residential5.webp',
}

# Emergency glass replacement
EMERGENCY_REPLACEMENT = 'Commercial1.webp'

def migrate_hero_in_html(filepath):
    """Migrate inner hero background-image to <picture> element."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    changed = False
    
    # Pattern 1: Homepage hero (hero-home with hero-image img tag)
    # Already handled in index.html - has <picture> now
    
    # Pattern 2: Inner hero pages with inline background-image on .inner-hero-image div
    # <div class="inner-hero-image" style="background-image:linear-gradient(...),url('assets/XXX.png')"></div>
    
    def replace_inner_hero(match):
        nonlocal changed
        full_tag = match.group(0)
        style_attr = match.group(1)
        
        # Extract the image URL from the style
        url_match = re.search(r"url\(['\"]assets/([^'\"]+\.(?:png|jpg|webp))['\"]\)", style_attr)
        if not url_match:
            return full_tag
        
        img_file = url_match.group(1)
        webp_file = HERO_WEBP_MAP.get(img_file)
        
        if not webp_file:
            # Check if it's emergency-glass.jpg
            if 'emergency-glass.jpg' in img_file:
                webp_file = EMERGENCY_REPLACEMENT
            else:
                return full_tag
        
        # Build the new <picture> element
        # Keep the linear-gradient as a background on a wrapper, put <picture> inside
        png_url = f"assets/{img_file}"
        webp_url = f"assets/{webp_file}"
        
        # Extract the linear-gradient part
        gradient_match = re.search(r'(linear-gradient\([^)]+\))', style_attr)
        gradient = gradient_match.group(1) if gradient_match else ''
        
        # Create wrapper with gradient + picture
        new_html = f'''<div class="inner-hero-image" style="{gradient}">
  <picture>
    <source type="image/webp" srcset="{webp_url}">
    <img src="{png_url}" alt="" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;">
  </picture>
</div>'''
        
        changed = True
        return new_html
    
    # Apply the replacement
    pattern = r'<div class="inner-hero-image" style="([^"]+)"></div>'
    content = re.sub(pattern, replace_inner_hero, content)
    
    # Pattern 3: Emergency landing page (.emergency-image)
    def replace_emergency_image(match):
        nonlocal changed
        full_tag = match.group(0)
        style_attr = match.group(1)
        
        # Extract image URL
        url_match = re.search(r"url\(['\"]assets/([^'\"]+\.(?:png|jpg|webp))['\"]\)", style_attr)
        if not url_match:
            return full_tag
        
        img_file = url_match.group(1)
        webp_file = HERO_WEBP_MAP.get(img_file, EMERGENCY_REPLACEMENT)
        
        png_url = f"assets/{img_file}"
        webp_url = f"assets/{webp_file}"
        
        gradient_match = re.search(r'(linear-gradient\([^)]+\))', style_attr)
        gradient = gradient_match.group(1) if gradient_match else ''
        
        new_html = f'''<div class="emergency-image" style="{gradient}">
  <picture>
    <source type="image/webp" srcset="{webp_url}">
    <img src="{png_url}" alt="" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;">
  </picture>
</div>'''
        
        changed = True
        return new_html
    
    content = re.sub(r'<div class="emergency-image" style="([^"]+)"></div>', replace_emergency_image, content)
    
    # Pattern 4: Craft image / project strip images with inline background
    # These are decorative background images - convert to picture if they have inline style
    def replace_craft_image(match):
        nonlocal changed
        full_tag = match.group(0)
        class_attr = match.group(1)
        style_attr = match.group(2)
        
        url_match = re.search(r"url\(['\"]assets/([^'\"]+\.(?:png|jpg|webp))['\"]\)", style_attr)
        if not url_match:
            return full_tag
        
        img_file = url_match.group(1)
        webp_file = HERO_WEBP_MAP.get(img_file)
        if not webp_file:
            return full_tag
        
        png_url = f"assets/{img_file}"
        webp_url = f"assets/{webp_file}"
        
        new_html = f'''<div class="{class_attr}" style="background-image:url('{png_url}')">
  <picture aria-hidden="true">
    <source type="image/webp" srcset="{webp_url}">
    <img src="{png_url}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;">
  </picture>
</div>'''
        
        changed = True
        return new_html
    
    content = re.sub(r'<div class="([^"]*(?:craft-image|project-strip-image)[^"]*)" style="([^"]+)"></div>', replace_craft_image, content)
    
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ Migrated heroes in {filepath}")
    else:
        print(f"  - No hero migrations needed in {filepath}")
    
    return changed

def main():
    html_files = sorted(glob.glob('*.html'))
    total_changed = 0
    
    for html_file in html_files:
        if migrate_hero_in_html(html_file):
            total_changed += 1
    
    print(f"\nTotal files migrated: {total_changed}")

if __name__ == '__main__':
    main()