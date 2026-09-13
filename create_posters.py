from PIL import Image, ImageDraw
import os

os.makedirs(r'C:\Users\blunt\Desktop\Weatabases\mgsusa.llc\master-glass-site\assets\images', exist_ok=True)

posters = [
    {
        'name': 'shower-video-poster.jpg',
        'title': 'Frameless\nShower',
        'subtitle': 'Residential Glass'
    },
    {
        'name': 'commercial-video-poster.jpg',
        'title': 'Commercial\nStorefront',
        'subtitle': 'Professional Entry'
    },
    {
        'name': 'brand-video-poster.jpg',
        'title': 'Master Glass\nSolutions',
        'subtitle': 'Local Brand'
    }
]

for poster in posters:
    # Create 16:9 image (1280x720)
    img = Image.new('RGB', (1280, 720), color=(12, 10, 10))
    draw = ImageDraw.Draw(img)
    
    # Draw red accent bar at top
    draw.rectangle([(0, 0), (1280, 8)], fill=(196, 30, 58))
    
    # Draw semi-transparent dark overlay
    overlay = Image.new('RGBA', (1280, 720), (0, 0, 0, 100))
    img.paste(overlay, (0, 0), overlay)
    
    # Re-create draw object for text
    draw = ImageDraw.Draw(img)
    draw.rectangle([(0, 0), (1280, 8)], fill=(196, 30, 58))
    
    # Draw text (centered)
    # Title in white
    draw.text((640, 280), poster['title'], fill=(255, 255, 255), anchor='mm')
    # Subtitle in red
    draw.text((640, 420), poster['subtitle'], fill=(196, 30, 58), anchor='mm')
    
    # Save
    output_path = r'C:\Users\blunt\Desktop\Weatabases\mgsusa.llc\master-glass-site\assets\images' + '\\' + poster['name']
    img.save(output_path, 'JPEG', quality=85)
    print(f'✓ Created: {poster["name"]}')

print('\nAll poster images created successfully!')
