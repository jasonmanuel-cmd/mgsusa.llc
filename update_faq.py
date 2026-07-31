import re
import json
from pathlib import Path

# 16 FAQs data
faqs = [
    {"q": "What glass services does Master Glass Solutions provide?", "a": "Master Glass Solutions provides commercial and residential glass installation and fabrication, including storefront glass, emergency glass repair, custom glass, shower enclosures, mirrors, and window glass replacement in Boerne and San Antonio."},
    {"q": "Do you offer emergency glass repair?", "a": "Yes. Emergency glass support is available 24/7 for urgent broken glass situations. Call 210-370-3700 so the team can understand the opening, safety concern, and next step."},
    {"q": "Do you work on both homes and commercial properties?", "a": "Yes. The team serves residential and commercial projects, from custom home glass and shower enclosures to storefronts, partitions, repair, and project-specific fabrication."},
    {"q": "How do I request a glass estimate?", "a": "Call 210-370-3700 or use the quote form. The most helpful starting details are the property location, the type of glass work, approximate dimensions or photos if available, and your desired timing."},
    {"q": "What types of residential glass work do you provide?", "a": "Residential services include custom shower enclosures, mirrors, window glass replacement, custom glass installations, and other home glass needs tailored to your property."},
    {"q": "What commercial glass services do you offer?", "a": "Master Glass Solutions provides commercial glass installation and fabrication, storefront glass systems, interior glass applications, emergency repair support, and custom glass solutions for business environments."},
    {"q": "Are custom glass projects possible?", "a": "Yes. Custom glass is a core service. Whether you have a specific design or dimension requirement, the team fabricates and installs glass built around your exact project needs."},
    {"q": "How quickly can emergency glass repairs be completed?", "a": "Emergency glass repairs are prioritized based on severity and safety risk. Call 210-370-3700 to discuss your situation. The team will work to schedule the soonest available time slot."},
    {"q": "Do you install shower enclosures?", "a": "Yes. Frameless and framed shower enclosures are a specialty. The team handles custom sizing, hardware selection, and precision installation to match your bathroom design."},
    {"q": "What areas do you serve?", "a": "The current service-area focus is Boerne and San Antonio, Texas. Contact the team with the property location to discuss a specific project."},
    {"q": "What experience does the team bring?", "a": "Master Glass Solutions brings more than 20 years of experience in commercial and residential glass installation, fabrication, and repair spanning all service types."},
    {"q": "Can you handle large commercial projects?", "a": "Yes. The team has experience with large-scale commercial glass projects including storefronts, office interiors, partitions, and specialized applications."},
    {"q": "What is the typical timeline for a glass installation project?", "a": "Timeline varies by project type and complexity. Simple jobs may be completed in 1-2 weeks; larger custom projects may take 3-6 weeks."},
    {"q": "Do you offer window glass replacement?", "a": "Yes. Window glass replacement is available for existing residential window openings with custom cutting and professional installation."},
    {"q": "What payment options are available?", "a": "Contact the team at 210-370-3700 to discuss payment options. Master Glass Solutions works with clients on flexible arrangements tailored to project scope."},
    {"q": "How do I know if glass replacement is needed?", "a": "Common signs include visible cracks or damage, condensation between panes, drafts, difficulty opening/closing, or visible deterioration of seals."}
]

# Generate FAQ HTML
faq_html = '<div class="faq-list">\n'
for faq in faqs:
    faq_html += f'  <details>\n    <summary>{faq["q"]}<span>+</span></summary>\n    <div class="faq-answer"><p>{faq["a"]}</p></div>\n  </details>\n'
faq_html += '</div>'

print("✓ 16 FAQ items generated")
print(f"✓ Total characters: {len(faq_html)}")

# Save to file
with open('assets/faq-html-snippet.txt', 'w', encoding='utf-8') as f:
    f.write(faq_html)
    
print("✓ Saved to: assets/faq-html-snippet.txt")
