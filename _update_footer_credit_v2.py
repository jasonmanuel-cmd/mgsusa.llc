#!/usr/bin/env python3
"""
Update footer credit in all HTML files to add 'Powered by Chaotically Organized AI' in red.
"""

import re
import glob

def update_footer_credit(filepath):
    """Update footer credit to add 'Powered by Chaotically Organized AI' in red."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Pattern to find the footer-credit span and update it
    # Current: <span class="footer-credit">Masters of Glass & Glazing</span>
    # New: <span class="footer-credit">Masters of Glass & Glazing | Powered by <span style="color: var(--metal);">Chaotically Organized AI</span></span>
    
    # Pattern 1: Current footer-credit with just "Masters of Glass & Glazing"
    pattern1 = r'(<span class="footer-credit">)Masters of Glass & Glazing(</span>)'
    replacement1 = r'\1Masters of Glass & Glazing | Powered by <span style="color: var(--metal);">Chaotically Organized AI</span>\2'
    content = re.sub(pattern1, replacement1, content)
    
    # Pattern 2: Any existing footer-credit that doesn't have the Powered by text
    pattern2 = r'(<span class="footer-credit">)([^<]*Masters of Glass[^<]*)(</span>)'
    def replace_footer(match):
        if 'Powered by' not in match.group(2):
            return match.group(1) + match.group(2).rstrip(' |') + ' | Powered by <span style="color: var(--metal);">Chaotically Organized AI</span>' + match.group(3)
        return match.group(0)
    content = re.sub(pattern2, replace_footer, content)
    
    # Also update the footer-credit link color to match
    content = re.sub(r'\.footer-credit a \{ color: rgba\(255,255,255,\.72\); \}', '.footer-credit a { color: var(--metal); }', content)
    content = re.sub(r'\.footer-credit a \{ color: rgba\(255,255,255,\.55\); \}', '.footer-credit a { color: var(--metal); }', content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ Updated footer credit in {filepath}")
        return True
    else:
        print(f"  - No footer credit changes needed in {filepath}")
        return False

def main():
    html_files = sorted(glob.glob('*.html'))
    total_updated = 0
    
    for html_file in html_files:
        if update_footer_credit(html_file):
            total_updated += 1
    
    print(f"\nTotal files updated: {total_updated}")

if __name__ == '__main__':
    main()