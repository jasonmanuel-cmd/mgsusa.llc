#!/usr/bin/env python3
"""
Fix footer credit by removing 'Powered by...' line from all HTML files.
"""

import re
import glob

def fix_footer_credit(filepath):
    """Remove 'Powered by...' from footer credit."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Pattern to find and remove the "Powered by..." part
    # <span class="footer-credit">Masters of Glass & Glazing | Powered by <a href="https://coaibakersfield.com" target="_blank" rel="noopener noreferrer">chaotically organized AI</a></span>
    # Replace with just: <span class="footer-credit">Masters of Glass & Glazing</span>
    
    pattern = r'(<span class="footer-credit">Masters of Glass & Glazing) \| Powered by <a href="https://coaibakersfield\.com" target="_blank" rel="noopener noreferrer">chaotically organized AI</a></span>'
    replacement = r'\1</span>'
    
    content = re.sub(pattern, replacement, content)
    
    # Also handle any variations
    pattern2 = r'(<span class="footer-credit">[^<]*Masters of Glass[^<]*) \| Powered by <a[^>]*>chaotically organized AI</a></span>'
    replacement2 = r'\1</span>'
    content = re.sub(pattern2, replacement2, content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ Fixed footer credit in {filepath}")
        return True
    else:
        # Check if footer-credit exists but pattern didn't match
        if 'footer-credit' in content and 'Powered by' in content:
            print(f"  ⚠ Footer credit found but pattern didn't match in {filepath}")
        return False

def main():
    html_files = sorted(glob.glob('*.html'))
    total_fixed = 0
    
    for html_file in html_files:
        if fix_footer_credit(html_file):
            total_fixed += 1
    
    print(f"\nTotal files fixed: {total_fixed}")

if __name__ == '__main__':
    main()