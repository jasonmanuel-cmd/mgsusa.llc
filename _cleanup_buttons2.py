#!/usr/bin/env python3
"""
Remove remaining conflicting button styles from page-specific section
"""

with open('assets/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Remove the gallery page old button styles
old_gallery = '''.gallery .inner-hero .btn-light { color: var(--ink); background: #ffffff; border-color: #ffffff; }

.gallery .inner-hero .btn-light:hover { background: var(--metal-light); border-color: var(--metal-light); color: var(--paper); }

.gallery .inner-hero .btn-ghost { color: var(--ink); border-color: var(--ink); }

.gallery .inner-hero .btn-light:hover { background: var(--metal-light); border-color: var(--metal-light); color: var(--paper); }

.gallery .inner-hero .btn-ghost:hover { background: var(--ink); color: var(--paper); }'''

new_gallery = ''  # Remove entirely since global styles handle it

css = css.replace(old_gallery, new_gallery)

# Remove any remaining standalone .btn-ghost { color: #ffffff; } and .btn-light { color: #ffffff; } in page-specific section
# These are redundant since global styles handle it
# Find and remove standalone .btn-ghost { color: #ffffff; } in page-specific section
css = css.replace('.btn-ghost { color: #ffffff; }\n\n', '')
css = css.replace('.btn-light { color: #ffffff; }\n\n', '')

# Also remove any remaining .btn-light { color: #ffffff; } standalone rules
# But be careful not to remove the global one at the top of page-specific section
# The global one is at the very beginning of PAGE-SPECIFIC STYLES section

# Write the updated CSS
with open('assets/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Remaining button styles cleaned up!")