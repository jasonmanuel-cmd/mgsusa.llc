#!/usr/bin/env python3
"""
Remove redundant btn-light/btn-ghost color-only rules from page-specific section
"""

with open('assets/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Remove redundant .btn-light { color: #ffffff; } and .btn-ghost { color: #ffffff; } 
# rules that are scattered in the page-specific section
# These are redundant because the global button styles at the top of page-specific section handle all pages

# Remove standalone .btn-light { color: #ffffff; } rules in page-specific section
css = css.replace(
    '.commercial-glass .inner-hero .eyebrow { color: var(--metal); }\n.commercial-glass .inner-hero .btn-light { color: #ffffff; }\n',
    '.commercial-glass .inner-hero .eyebrow { color: var(--metal); }\n'
)

css = css.replace(
    '.emergency-glass-repair .inner-hero .eyebrow { color: var(--metal); }\n.emergency-glass-repair .inner-hero .btn-light { color: #ffffff; }\n',
    '.emergency-glass-repair .inner-hero .eyebrow { color: var(--metal); }\n'
)

css = css.replace(
    '.emergency-landing .inner-hero .eyebrow { color: var(--metal); }\n.emergency-landing .inner-hero .btn-light { color: #ffffff; }\n',
    '.emergency-landing .inner-hero .eyebrow { color: var(--metal); }\n'
)

css = css.replace(
    '.service-areas .inner-hero .eyebrow { color: var(--metal); }\n.service-areas .inner-hero .btn-light { color: #ffffff; }\n',
    '.service-areas .inner-hero .eyebrow { color: var(--metal); }\n'
)

# Also remove the standalone .btn-ghost { color: #ffffff; } rules
css = css.replace(
    '.commercial-glass .inner-hero .btn-ghost { color: #ffffff; }\n\n/* Commercial page body',
    '/* Commercial page body'
)

css = css.replace(
    '.emergency-glass-repair .inner-hero .btn-ghost { color: #ffffff; }\n\n/* Emergency landing page */',
    '/* Emergency landing page */'
)

css = css.replace(
    '.emergency-landing .inner-hero .btn-ghost { color: #ffffff; }\n\n/* Service area hero',
    '/* Service area hero'
)

css = css.replace(
    '.service-areas .inner-hero .btn-ghost { color: #ffffff; }\n\n/* Service area hero',
    '/* Service area hero'
)

# Also remove the standalone .btn-light { color: #ffffff; } and .btn-ghost { color: #ffffff; } in gallery section
css = css.replace(
    '.gallery .inner-hero .eyebrow { color: var(--metal); }\n.gallery .inner-hero .btn-light { color: var(--ink); background: #ffffff; border-color: #ffffff; }\n\n.gallery .inner-hero .btn-ghost { color: var(--ink); border-color: var(--ink); }',
    '.gallery .inner-hero .eyebrow { color: var(--metal); }'
)

# Remove the gallery button hover styles that are now redundant
css = css.replace(
    '\n.gallery .inner-hero .btn-light:hover { background: var(--metal-light); border-color: var(--metal-light); color: var(--paper); }\n\n.gallery .inner-hero .btn-ghost:hover { background: var(--ink); color: var(--paper); }',
    ''
)

# Also remove the service-areas old button styles that were left over
css = css.replace(
    '''\n/* Service area hero - white text, red accents */
.service-areas .inner-hero .btn-light { color: #ffffff; background: #ffffff; border-color: #ffffff; }

.service-areas .inner-hero .btn-light:hover { background: var(--metal-light); border-color: var(--metal-light); color: var(--paper); }

.service-areas .inner-hero .btn-ghost { color: #ffffff; border-color: rgba(255,255,255,.55); background: rgba(10,10,10,0.35); }

.service-areas .inner-hero .btn-ghost:hover { background: rgba(10,10,10,0.55); color: var(--color-surface); border-color: rgba(255,255,255,0.8); }''',
''
)

# Write the updated CSS
with open('assets/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Redundant button styles removed!")