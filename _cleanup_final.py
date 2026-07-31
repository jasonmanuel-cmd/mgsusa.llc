#!/usr/bin/env python3
"""
Remove remaining conflicting button styles
"""

with open('assets/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Find and remove the remaining gallery page old button styles
# These are the ones that keep appearing after the global styles
old_styles = '''.btn-light { color: #ffffff; background: #ffffff; border-color: #ffffff; }

.btn-light:hover { background: var(--metal-light); border-color: var(--metal-light); color: var(--paper); }

.btn-ghost { color: #ffffff; border-color: rgba(255,255,255,.55); background: rgba(10,10,10,0.35); }'''

new_styles = ''  # Remove entirely since global styles handle it

css = css.replace(old_styles, '')

# Also remove any remaining standalone .btn-ghost { color: #ffffff; } rules
css = css.replace('.btn-ghost { color: #ffffff; }\n\n', '')
css = css.replace('.btn-light { color: #ffffff; }\n\n', '')

# Write the updated CSS
with open('assets/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Remaining button styles cleaned up!")