#!/usr/bin/env python3
"""
Fixed migration script with proper gradient extraction.
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
    'Residentialhero.webp': 'Residentialhero.webp',
    'Commercialhero.webp': 'Commercialhero.webp',
    'Commercial1.webp': 'Commercial1.webp',
    'Residential1.webp': 'Residential1.webp',
    'Residential3.webp': 'Residential3.webp',
    'Residential4.webp': 'Residential4.webp',
    'Residential5.webp': 'Residential5.webp',
}

EMERGENCY_REPLACEMENT = 'Commercial1.webp'

def extract_gradient_and_url(style_attr):
    """Extract gradient and image URL from background-image style.
    
    Handles nested parentheses in linear-gradient.
    """
    # Find the url part first - it's at the end
    url_match = re.search(r"url\(['\"]assets/([^'\"]+\.(?:png|jpg|webp))['\"]\)", style_attr)
    if not url_match:
        return None, None
    
    img_file = url_match.group(1)
    
    # Find the gradient - it's everything before the url(
    # The pattern is: linear-gradient(...),url(
    url_pos = style_attr.find("url(")
    if url_pos > 0:
        before_url = style_attr[:url_pos].rstrip()
        # Remove trailing comma and whitespace
        gradient = before_url.rstrip(', ').rstrip()
        # Should end with )
        if not gradient.endswith(')'):
            # Find the last ) in the gradient part
            last_paren = gradient.rfind(')')
            if last_paren >= 0:
                gradient = gradient[:last_paren+1]
    else:
        gradient = ''
    
    return gradient, img_file

def migrate_heroes_in_file(filepath):
    """Migrate hero background-images to <picture> elements."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    changed = False
    
    def build_picture_element(gradient, img_file):
        """Build the picture element HTML."""
        webp_file = HERO_WEBP_MAP.get(img_file, img_file)
        webp_url = f"assets/{webp_file}"
        
        picture_html = f'''<div class="inner-hero-image" style="{gradient}">
  <picture>
    <source type="image/webp" srcset="{webp_url}">
    <img src="{webp_url}" alt="" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;">
  </picture>
</div>'''
        return picture_html
    
    # Pattern 1: Inner hero pages (.inner-hero-image)
    def replace_inner_hero(match):
        nonlocal changed
        full_tag = match.group(0)
        style_attr = match.group(1)
        
        gradient, img_file = extract_gradient_and_url(style_attr)
        if not img_file:
            return full_tag
        
        new_html = build_picture_element(gradient, img_file)
        changed = True
        return new_html
    
    # Pattern: <div class="inner-hero-image" style="..."></div>
    pattern = r'<div class="inner-hero-image" style="([^"]*)"></div>'
    content = re.sub(pattern, replace_inner_hero, content)
    
    # Pattern 2: Emergency landing page (.emergency-image)
    def replace_emergency_image(match):
        nonlocal changed
        full_tag = match.group(0)
        style_attr = match.group(1)
        
        gradient, img_file = extract_gradient_and_url(style_attr)
        if not img_file:
            return full_tag
        
        webp_file = HERO_WEBP_MAP.get(img_file, EMERGENCY_REPLACEMENT)
        webp_url = f"assets/{webp_file}"
        
        new_html = f'''<div class="emergency-image" style="{gradient}">
  <picture>
    <source type="image/webp" srcset="{webp_url}">
    <img src="{webp_url}" alt="" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;">
  </picture>
</div>'''
        
        changed = True
        return new_html
    
    content = re.sub(r'<div class="emergency-image" style="([^"]*)"></div>', replace_emergency_image, content)
    
    # Pattern 3: Craft images and project strip images with inline background
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
        
        webp_url = f"assets/{webp_file}"
        png_url = f"assets/{img_file.replace('.webp', '.png') if img_file.endswith('.webp') else img_file}"
        
        new_html = f'''<div class="{class_attr}" style="background-image:url('{png_url}')">
  <picture aria-hidden="true">
    <source type="image/webp" srcset="{webp_url}">
    <img src="{png_url}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;">
  </picture>
</div>'''
        
        changed = True
        return new_html
    
    content = re.sub(r'<div class="([^"]*(?:craft-image|project-strip-image)[^"]*)" style="background-image:url\([^)]+\)"></div>', replace_craft_image, content)
    
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
        if migrate_heroes_in_file(html_file):
            total_changed += 1
    
    print(f"\nTotal files migrated: {total_changed}")

if __name__ == '__main__':
    main()