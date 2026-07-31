#!/usr/bin/env python3
"""
Fix all remaining button styles in styles.css
"""

with open('assets/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Fix commercial-glass inner-hero buttons
old_commercial = '''.commercial-glass .inner-hero .eyebrow { color: var(--metal); }
.commercial-glass .inner-hero .btn-light { color: #ffffff; }

.commercial-glass .inner-hero .btn-ghost { color: #ffffff; }

/* Commercial page body - teal, white, gray text in black areas -> white */'''

new_commercial = '''.commercial-glass .inner-hero .eyebrow { color: var(--metal); }
.commercial-glass .inner-hero .btn-light { color: #ffffff; background: var(--color-brand); border-color: var(--color-brand); }
.commercial-glass .inner-hero .btn-light:hover { background: var(--color-brand-hover); border-color: var(--color-brand-hover); color: var(--paper); }
.commercial-glass .inner-hero .btn-ghost { color: #ffffff; border-color: #ffffff; background: var(--color-brand); }
.commercial-glass .inner-hero .btn-ghost:hover { background: var(--color-brand-hover); border-color: var(--color-brand-hover); color: var(--color-surface); }

/* Commercial page body - teal, white, gray text in black areas -> white */'''

css = css.replace(old_commercial, new_commercial)

# Fix emergency-glass-repair inner-hero buttons
old_emergency = '''.emergency-glass-repair .inner-hero .eyebrow { color: var(--metal); }
.emergency-glass-repair .inner-hero .btn-light { color: #ffffff; }

.emergency-glass-repair .inner-hero .btn-ghost { color: #ffffff; }'''

new_emergency = '''.emergency-glass-repair .inner-hero .eyebrow { color: var(--metal); }
.emergency-glass-repair .inner-hero .btn-light { color: #ffffff; background: var(--color-brand); border-color: var(--color-brand); }
.emergency-glass-repair .inner-hero .btn-light:hover { background: var(--color-brand-hover); border-color: var(--color-brand-hover); color: var(--paper); }
.emergency-glass-repair .inner-hero .btn-ghost { color: #ffffff; border-color: #ffffff; background: var(--color-brand); }
.emergency-glass-repair .inner-hero .btn-ghost:hover { background: var(--color-brand-hover); border-color: var(--color-brand-hover); color: var(--color-surface); }'''

css = css.replace(old_emergency, new_emergency)

# Fix emergency-landing inner-hero buttons
old_emergency_landing = '''.emergency-landing .inner-hero .eyebrow { color: var(--metal); }
.emergency-landing .inner-hero .btn-light { color: #ffffff; }

.emergency-landing .inner-hero .btn-ghost { color: #ffffff; }'''

new_emergency_landing = '''.emergency-landing .inner-hero .eyebrow { color: var(--metal); }
.emergency-landing .inner-hero .btn-light { color: #ffffff; background: var(--color-brand); border-color: var(--color-brand); }
.emergency-landing .inner-hero .btn-light:hover { background: var(--color-brand-hover); border-color: var(--color-brand-hover); color: var(--paper); }
.emergency-landing .inner-hero .btn-ghost { color: #ffffff; border-color: #ffffff; background: var(--color-brand); }
.emergency-landing .inner-hero .btn-ghost:hover { background: var(--color-brand-hover); border-color: var(--color-brand-hover); color: var(--color-surface); }'''

css = css.replace(old_emergency_landing, new_emergency_landing)

# Fix service-areas inner-hero buttons
old_service_areas = '''.service-areas .inner-hero .eyebrow { color: var(--metal); }
.service-areas .inner-hero .btn-light { color: #ffffff; }

.service-areas .inner-hero .btn-ghost { color: #ffffff; }

/* Service area hero - white text, red accents */
.service-areas .inner-hero .btn-light { color: #ffffff; background: #ffffff; border-color: #ffffff; }

.service-areas .inner-hero .btn-light:hover { background: var(--metal-light); border-color: var(--metal-light); color: var(--paper); }

.service-areas .inner-hero .btn-ghost { color: #ffffff; border-color: rgba(255,255,255,.55); background: rgba(10,10,10,0.35); }

.service-areas .inner-hero .btn-ghost:hover { background: rgba(10,10,10,0.55); color: var(--color-surface); border-color: rgba(255,255,255,0.8); }'''

new_service_areas = '''.service-areas .inner-hero .eyebrow { color: var(--metal); }
.service-areas .inner-hero .btn-light { color: #ffffff; background: var(--color-brand); border-color: var(--color-brand); }
.service-areas .inner-hero .btn-light:hover { background: var(--color-brand-hover); border-color: var(--color-brand-hover); color: var(--paper); }
.service-areas .inner-hero .btn-ghost { color: #ffffff; border-color: #ffffff; background: var(--color-brand); }
.service-areas .inner-hero .btn-ghost:hover { background: var(--color-brand-hover); border-color: var(--color-brand-hover); color: var(--color-surface); }

/* Service area hero - white text, red accents */'''

css = css.replace(old_service_areas, new_service_areas)

# Fix gallery inner-hero buttons
old_gallery = '''.gallery .inner-hero .eyebrow { color: var(--metal); }
.gallery .inner-hero .btn-light { color: var(--ink); background: #ffffff; border-color: #ffffff; }

.gallery .inner-hero .btn-ghost { color: var(--ink); border-color: var(--ink); }

.gallery .inner-hero .btn-light:hover { background: var(--metal-light); border-color: var(--metal-light); color: var(--paper); }

.gallery .inner-hero .btn-ghost:hover { background: var(--ink); color: var(--paper); }'''

new_gallery = '''.gallery .inner-hero .eyebrow { color: var(--metal); }
.gallery .inner-hero .btn-light { color: #ffffff; background: var(--color-brand); border-color: var(--color-brand); }
.gallery .inner-hero .btn-light:hover { background: var(--color-brand-hover); border-color: var(--color-brand-hover); color: var(--paper); }
.gallery .inner-hero .btn-ghost { color: #ffffff; border-color: #ffffff; background: var(--color-brand); }
.gallery .inner-hero .btn-ghost:hover { background: var(--color-brand-hover); border-color: var(--color-brand-hover); color: var(--color-surface); }'''

css = css.replace(old_gallery, new_gallery)

# Write the updated CSS
with open('assets/styles.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("All button styles fixed!")