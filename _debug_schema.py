import re

for fn in ['index.html','about.html','faq.html','gallery.html','glass-project-planning-checklist.html']:
    c = open(fn, encoding='utf-8').read()
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', c, re.S)
    with open('_schema_debug.txt', 'a', encoding='utf-8') as out:
        out.write(f'{"="*40} {fn} {"="*40}\n')
        for i, s in enumerate(blocks):
            t = re.search(r'"@type"\s*:\s*"([^"]+)"', s)
            out.write(f'  Block {i}: @type = {t.group(1) if t else "???"} (len {len(s)})\n')
            if 'HomeAndConstructionBusiness' in s:
                out.write('   FULL HACB:\n')
                out.write(s + '\n\n')