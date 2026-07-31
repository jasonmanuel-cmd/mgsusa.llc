#!/usr/bin/env python3
"""
Fix truncated gradients in already-migrated hero elements.
"""

import re
import glob

# The correct full gradient used across all inner hero pages
FULL_GRADIENT = "linear-gradient(90deg,rgba(10,10,10,.93) 0%,rgba(10,10,10,.76) 46%,rgba(10,10,10,.2) 100%)"

# Emergency landing page gradient (might be different)
EMERGENCY_GRADIENT = "linear-gradient(90deg,rgba(10,10,10,.92),rgba(10,10,10,.48))"

def fix_gradients_in_file(filepath):
    """Fix truncated gradients in migrated hero elements."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    changed = False
    
    # Pattern 1: Fix inner-hero-image with truncated gradient
    # <div class="inner-hero-image" style="linear-gradient(90deg,rgba(10,10,10,.93)">
    pattern1 = r'(<div class="inner-hero-image" style=")linear-gradient\(90deg,rgba\(10,10,10,\.93\)"'
    replacement1 = r'\1' + FULL_GRADIENT + '"'
    content, count1 = re.subn(pattern1, replacement1, content)
    
    # Pattern 2: Fix emergency-image with truncated gradient
    # <div class="emergency-image" style="linear-gradient(90deg,rgba(10,10,10,.92)">
    pattern2 = r'(<div class="emergency-image" style=")linear-gradient\(90deg,rgba\(10,10,10,\.92\)"'
    replacement2 = r'\1' + EMERGENCY_GRADIENT + '"'
    content, count2 = re.subn(pattern2, replacement2, content)
    
    # Pattern 3: Fix any other truncated linear-gradient in style attributes
    # This catches any remaining truncated gradients in style attributes
    pattern3 = r'(style=")linear-gradient\(90deg,rgba\(10,10,10,\.93\)"'
    replacement3 = r'\1' + FULL_GRADIENT + '"'
    content, count3 = re.subn(pattern3, replacement3, content)
    
    pattern4 = r'(style=")linear-gradient\(90deg,rgba\(10,10,10,\.92\)"'
    replacement4 = r'\1' + EMERGENCY_GRADIENT + '"'
    content, count4 = re.subn(pattern4, replacement4, content)
    
    total_count = count1 + count2 + count3 + count4
    
    if total_count > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ Fixed {total_count} gradients in {filepath}")
        return True
    else:
        print(f"  - No gradients to fix in {filepath}")
        return False

def main():
    html_files = sorted(glob.glob('*.html'))
    total_fixed = 0
    
    for html_file in html_files:
        if fix_gradients_in_file(html_file):
            total_fixed += 1
    
    print(f"\nTotal files fixed: {total_fixed}")

if __name__ == '__main__':
    main()