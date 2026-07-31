import cssmin
with open('assets/styles.css', 'r', encoding='utf-8') as f:
    css = f.read()
minified = cssmin.cssmin(css)
with open('assets/styles.min.css', 'w', encoding='utf-8') as f:
    f.write(minified)
print('styles.min.css updated successfully')
original_size = len(open('assets/styles.css', 'r', encoding='utf-8').read())
print(f'Original size: {original_size} bytes')
print(f'Minified size: {len(minified)} bytes')
print(f'Reduction: {((original_size - len(minified)) / original_size * 100):.1f}%')