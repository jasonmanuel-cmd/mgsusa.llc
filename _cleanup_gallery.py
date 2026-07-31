#!/usr/bin/env python3
"""
Remove remaining conflicting button styles for gallery page
"""

with open('assets/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Remove the gallery page old button styles that are still there
old_gallery = '''.btn-light { color: #ffffff; background: #ffffff; border-color: #ffffff; }

.btn-light:hover { background: var(--metal-light); border-color: var(--metal-light); color: var(--paper); }

.btn-ghost { color: #ffffff; border-color: rgba(255,255,255,.55); background: rgba(10,10,10,0.35); }

.btn-ghost:hover { background: rgba(10,10,10,0.55); color: var(--color-surface); border-color: rgba(255,255,255,0.8); }

.btn-light { color: var(--ink); background: #ffffff; border-color: #ffffff; }

.btn-ghost { color: var(--ink); border-color: var(--ink); }

.btn-light:hover { background: var(--metal-light); border-color: var(--metal_light); color: var(--paper); }

.btn-ghost:hover { background: var(--ink); color: var(--paper); }'''

new_gallery = ''  # Remove entirely since global styles handle it

css = css.replace(old_gallery, new_gallery)

# Write the updated CSS
with open('assets/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Gallery button styles cleaned up!")