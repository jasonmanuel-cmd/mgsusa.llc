#!/usr/bin/env python3
"""
Comprehensive GEO/Schema/Performance fix script for Master Glass Solutions site.
Fixes all issues identified in the GEO-AUDIT-REPORT.md and COMPREHENSIVE_OPTIMIZATION_SUMMARY.md
"""

import re
import glob
import json
import os
from datetime import datetime

# ============================================================
# CONFIGURATION
# ============================================================

# Files with mojibake (from grep search)
MOJIBAKE_FILES = [
    'commercial-glass.html',
    'commercial-quote.html',
    'contact.html',
    'request-quote.html',
    'residential-glass.html',
    'residential-quote.html',
]

# All HTML files
ALL_HTML_FILES = sorted(glob.glob('*.html'))

# PNG -> WebP mapping for hero images (all webp files exist in assets/)
PNG_TO_WEBP = {
    'Residentialhero.png': 'Residentialhero.webp',
    'Commercialhero.png': 'Commercialhero.webp',
    'Commercial1.png': 'Commercial1.webp',
    'Residential1.png': 'Residential1.webp',
    'Residential3.png': 'Residential3.webp',
    'Residential4.png': 'Residential4.webp',
    'Residential5.png': 'Residential5.webp',
}

# Emergency glass replacement (file doesn't exist)
EMERGENCY_REPLACEMENT = 'Commercial1.webp'

# Schema additions
WEBSITE_SCHEMA = '''{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "url": "https://www.mgsusa.llc/",
  "name": "Master Glass Solutions",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.mgsusa.llc/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}'''

# HACB enhancement fields to inject after sameAs array
HACB_ENHANCEMENT = ''',
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 29.5604,
    "longitude": -98.5322
  },
  "foundingDate": "2004",
  "founder": [
    {
      "@type": "Person",
      "name": "Linda",
      "jobTitle": "Co-Founder & Owner",
      "description": "Co-founder with 20+ years in glass installation and business operations"
    },
    {
      "@type": "Person",
      "name": "Adam",
      "jobTitle": "Co-Founder & Lead Installer",
      "description": "Co-founder and senior glass installer with 20+ years field experience"
    }
  ],
  "logo": {
    "@type": "ImageObject",
    "url": "https://www.mgsusa.llc/assets/logo.png",
    "width": 300,
    "height": 100,
    "caption": "Master Glass Solutions logo"
  }'''

# FAQPage speakable injection
SPEAKABLE_INJECTION = ''',
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": [
      ".faq-list details summary",
      ".faq-list details[open] > div"
    ]
  }'''

# ImageGallery schema for gallery.html
IMAGEGALLERY_SCHEMA = '''{
  "@context": "https://schema.org",
  "@type": "ImageGallery",
  "about": {
    "@type": "HomeAndConstructionBusiness",
    "@id": "https://www.mgsusa.llc/#business"
  },
  "associatedMedia": [
    {
      "@type": "ImageObject",
      "contentUrl": "https://www.mgsusa.llc/assets/Commercial1.webp",
      "description": "Commercial glass interior partitions - real project image"
    },
    {
      "@type": "ImageObject",
      "contentUrl": "https://www.mgsusa.llc/assets/Residential1.webp",
      "description": "Custom residential shower enclosure - real project image"
    },
    {
      "@type": "ImageObject",
      "contentUrl": "https://www.mgsusa.llc/assets/Commercialhero.webp",
      "description": "Storefront glass customer-facing glazing - real project image"
    },
    {
      "@type": "ImageObject",
      "contentUrl": "https://www.mgsusa.llc/assets/Commercial1.webp",
      "description": "Emergency glass repair securing an opening - real project image"
    }
  ]
}'''

# Article schema for glass-project-planning-checklist.html
ARTICLE_SCHEMA = '''{
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": "https://www.mgsusa.llc/glass-project-planning-checklist#article",
  "headline": "Glass Project Planning Checklist: What to Prepare Before You Call",
  "description": "Step-by-step checklist for homeowners and businesses preparing for a glass installation or repair project.",
  "image": "https://www.mgsusa.llc/assets/Residential1.webp",
  "author": {
    "@type": "Organization",
    "@id": "https://www.mgsusa.llc/#business",
    "name": "Master Glass Solutions"
  },
  "publisher": {
    "@type": "Organization",
    "@id": "https://www.mgsusa.llc/#business",
    "name": "Master Glass Solutions"
  },
  "datePublished": "2025-01-15",
  "dateModified": "2025-07-31",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://www.mgsusa.llc/glass-project-planning-checklist"
  }
}'''

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_mojibake(content):
    """Fix double-encoded UTF-8 characters"""
    replacements = {
        'â€™': "'",      # RIGHT SINGLE QUOTATION MARK
        'â€œ': '"',      # LEFT DOUBLE QUOTATION MARK
        'â€': '"',       # RIGHT DOUBLE QUOTATION MARK
        'â€”': '—',      # EM DASH
        'â€¢': '•',      # BULLET
        'â€¦': '…',      # HORIZONTAL ELLIPSIS
    }
    for bad, good in replacements.items():
        content = content.replace(bad, good)
    return content

def fix_hero_images(content):
    """Convert PNG hero backgrounds to WebP in inline styles"""
    for png, webp in PNG_TO_WEBP.items():
        # Match url('assets/XXX.png') in inline styles
        pattern = rf"url\('assets/{re.escape(png)}'\)"
        replacement = f"url('assets/{webp}')"
        content = re.sub(pattern, replacement, content)
    
    # Fix missing emergency-glass.jpg
    content = re.sub(
        r"url\('assets/emergency-glass\.jpg'\)",
        f"url('assets/{EMERGENCY_REPLACEMENT}')",
        content
    )
    return content

def inject_website_schema(content):
    """Inject WebSite + SearchAction schema before </head> if not present"""
    if '"@type": "WebSite"' in content:
        return content  # Already has WebSite schema
    
    schema_block = f'\n  <script type="application/ld+json">\n    {WEBSITE_SCHEMA}\n  </script>\n</head>'
    content = content.replace('</head>', schema_block)
    return content

def enhance_hacb(content):
    """Enhance HomeAndConstructionBusiness with geo, foundingDate, founder, logo"""
    # Find the HACB block and inject after sameAs array
    # Pattern: "sameAs": [...], "description":
    pattern = r'("sameAs"\s*:\s*\[[^\]]+\]),\s*"description":'
    replacement = r'\1' + HACB_ENHANCEMENT + r', "description":'
    content = re.sub(pattern, replacement, content)
    return content

def fix_index_hacb(content):
    """Fix index.html specific HACB issues: parentOrganization and teamMember"""
    # Fix empty parentOrganization
    content = content.replace(
        '"parentOrganization": {"@type": "Organization"}',
        '"parentOrganization": {"@type": "Organization", "@id": "https://www.mgsusa.llc/#business", "name": "Master Glass Solutions"}'
    )
    
    # Fix generic teamMember -> named founders
    old_team = '''"teamMember": [{"@type": "Person", "name": "Lead Installation Team", "jobTitle": "Senior Glass Installers", "url": "https://www.mgsusa.llc/about#lead-installer", "description": "40+ years combined glass installation and fabrication experience"}, {"@type": "Person", "name": "Service Manager", "jobTitle": "Project Coordination & Operations", "url": "https://www.mgsusa.llc/about#service-manager", "description": "Expert project scheduling, customer com'''
    
    new_team = '''"teamMember": [
      {"@type": "Person", "name": "Linda", "jobTitle": "Co-Founder & Owner", "url": "https://www.mgsusa.llc/about#linda", "description": "Co-founder with 20+ years in glass installation and business operations"},
      {"@type": "Person", "name": "Adam", "jobTitle": "Co-Founder & Lead Installer", "url": "https://www.mgsusa.llc/about#adam", "description": "Co-founder and senior glass installer with 20+ years field experience"}
    ]'''
    
    content = content.replace(old_team, new_team)
    return content

def inject_faq_speakable(content):
    """Inject speakable into FAQPage schema"""
    # Find FAQPage block and inject before mainEntity
    pattern = r'("@type": "FAQPage")(.*?)"mainEntity":'
    replacement = r'\1' + SPEAKABLE_INJECTION + r',"mainEntity":'
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    return content

def inject_imagegallery(content):
    """Inject ImageGallery schema before </head> on gallery.html"""
    if '"@type": "ImageGallery"' in content:
        return content
    schema_block = f'\n  <script type="application/ld+json">\n    {IMAGEGALLERY_SCHEMA}\n  </script>\n</head>'
    content = content.replace('</head>', schema_block)
    return content

def inject_article(content, article_schema):
    """Inject Article schema before </head>"""
    if '"@type": "Article"' in content:
        return content
    schema_block = f'\n  <script type="application/ld+json">\n    {article_schema}\n  </script>\n</head>'
    content = content.replace('</head>', schema_block)
    return content

def wrap_lcp_picture(content):
    """Wrap index.html hero image in <picture> with WebP source"""
    # Find the hero image pattern in index.html
    # <img ... src="assets/Residentialhero.png" ... fetchpriority="high">
    # Replace with picture element
    
    # Pattern: <img class="hero-img" src="assets/Residentialhero.png" alt="..." fetchpriority="high">
    old_img = 'src="assets/Residentialhero.png" alt="Master Glass Solutions team and projects" fetchpriority="high"'
    new_picture = '''src="assets/Residentialhero.png" alt="Master Glass Solutions team and projects" fetchpriority="high">
    <source type="image/webp" srcset="assets/Residentialhero.webp">
    <img class="hero-img" src="assets/Residentialhero.png" alt="Master Glass Solutions team and projects" fetchpriority="high">'''
    
    # Wait, we need to wrap the IMG in a PICTURE. Let me find the full img tag.
    # Actually, the pattern is: <img class="hero-img" src="assets/Residentialhero.png" alt="Master Glass Solutions team and projects" fetchpriority="high">
    # We need to replace it with:
    # <picture>
    #   <source type="image/webp" srcset="assets/Residentialhero.webp">
    #   <img class="hero-img" src="assets/Residentialhero.png" alt="Master Glass Solutions team and projects" fetchpriority="high">
    # </picture>
    
    pattern = r'(<img class="hero-img" src="assets/Residentialhero\.png" alt="Master Glass Solutions team and projects" fetchpriority="high">)'
    replacement = r'''<picture>
      <source type="image/webp" srcset="assets/Residentialhero.webp">
      \1
    </picture>'''
    
    content = re.sub(pattern, replacement, content)
    return content

# ============================================================
# MAIN PROCESSING
# ============================================================

def process_html_file(filepath):
    """Process a single HTML file with all applicable fixes"""
    print(f"Processing {filepath}...")
    content = read_file(filepath)
    original = content
    
    # 1. Fix mojibake (specific files)
    if filepath in MOJIBAKE_FILES:
        content = fix_mojibake(content)
    
    # 2. Fix hero images (all files)
    content = fix_hero_images(content)
    
    # 3. Inject WebSite schema (all files)
    content = inject_website_schema(content)
    
    # 4. Enhance HACB (all files with HACB)
    content = enhance_hacb(content)
    
    # 5. Fix index.html specific HACB
    if filepath == 'index.html':
        content = fix_index_hacb(content)
        content = wrap_lcp_picture(content)
    
    # 6. Inject FAQPage speakable (faq.html, index.html)
    if filepath in ['faq.html', 'index.html']:
        content = inject_faq_speakable(content)
    
    # 7. Inject ImageGallery (gallery.html)
    if filepath == 'gallery.html':
        content = inject_imagegallery(content)
    
    # 8. Inject Article (glass-project-planning-checklist.html)
    if filepath == 'glass-project-planning-checklist.html':
        content = inject_article(content, ARTICLE_SCHEMA)
    
    # 9. frameless-vs-framed-glass.html already has Article schema - skip
    
    if content != original:
        write_file(filepath, content)
        print(f"  ✓ Updated {filepath}")
    else:
        print(f"  - No changes needed for {filepath}")
    
    return content != original

def fix_styles_css():
    """Fix styles.css and styles.min.css gallery backgrounds and emergency ref"""
    print("\nFixing CSS files...")
    
    # Files to fix
    css_files = ['assets/styles.css', 'assets/styles.min.css', 'assets/styles-new.min.css']
    
    for css_file in css_files:
        if not os.path.exists(css_file):
            print(f"  - {css_file} not found, skipping")
            continue
            
        content = read_file(css_file)
        original = content
        
        # Gallery backgrounds PNG -> WebP
        replacements = {
            "url('Commercial1.png')": "url('Commercial1.webp')",
            "url('Residential1.png')": "url('Residential1.webp')",
            "url('Commercialhero.png')": "url('Commercialhero.webp')",
            "url('emergency-glass.jpg')": f"url('{EMERGENCY_REPLACEMENT}')",
        }
        
        for old, new in replacements.items():
            content = content.replace(old, new)
        
        if content != original:
            write_file(css_file, content)
            print(f"  ✓ Updated {css_file}")
        else:
            print(f"  - No changes needed for {css_file}")

def fix_emergency_html():
    """Fix emergency-glass-repair.html inline hero background"""
    print("\nFixing emergency-glass-repair.html...")
    filepath = 'emergency-glass-repair.html'
    content = read_file(filepath)
    original = content
    
    # Fix the inline emergency-glass.jpg reference
    content = content.replace(
        "url('assets/emergency-glass.jpg')",
        f"url('assets/{EMERGENCY_REPLACEMENT}')"
    )
    
    if content != original:
        write_file(filepath, content)
        print(f"  ✓ Updated {filepath}")
    else:
        print(f"  - No changes needed for {filepath}")

# ============================================================
# RUN ALL FIXES
# ============================================================

if __name__ == '__main__':
    print("=" * 60)
    print("MASTER GLASS SOLUTIONS - COMPREHENSIVE FIX SCRIPT")
    print("=" * 60)
    
    # Process all HTML files
    changed = 0
    for html_file in ALL_HTML_FILES:
        if process_html_file(html_file):
            changed += 1
    
    # Fix CSS files
    fix_styles_css()
    
    # Fix emergency page
    fix_emergency_html()
    
    print(f"\n{'='*60}")
    print(f"COMPLETE: {changed} HTML files modified")
    print("Next steps (manual):")
    print("  1. Update sitemap.xml - add frameless-vs-framed-glass")
    print("  2. Update robots.txt - add more AI crawler rules")
    print("  3. Update llms.txt - fix Cibolo link, add Key Facts")
    print("  4. Update .well-known/llms.txt - strip .html from URLs")
    print("  5. Update service-worker.js - remove inter.woff2, bump version")
    print("=" * 60)