import re

def minify_css(css_content):
    """Minify CSS by removing comments, extra whitespace, etc."""
    # Remove comments
    css = re.sub(r'/\*.*?\*/', '', css_content, flags=re.DOTALL)
    # Remove excess whitespace
    css = re.sub(r'\s+', ' ', css)
    # Remove whitespace around special chars
    css = re.sub(r'\s*([{}:;,>+~])\s*', r'\1', css)
    # Remove trailing semicolons before }
    css = re.sub(r';\}', '}', css)
    return css.strip()

def minify_js(js_content):
    """Minify JS by removing comments and excess whitespace."""
    # Remove line comments
    js = re.sub(r'//.*?$', '', js_content, flags=re.MULTILINE)
    # Remove block comments
    js = re.sub(r'/\*.*?\*/', '', js_content, flags=re.DOTALL)
    # Remove excess whitespace
    js = re.sub(r'\s+', ' ', js)
    # Keep newlines after }
    js = re.sub(r'\}\s*', '}\n', js)
    return js.strip()

# Minify CSS
with open('assets/styles.css', 'r') as f:
    css = f.read()
min_css = minify_css(css)
with open('assets/styles.min.css', 'w') as f:
    f.write(min_css)

# Minify JS
with open('assets/scripts.js', 'r') as f:
    js = f.read()
min_js = minify_js(js)
with open('assets/scripts.min.js', 'w') as f:
    f.write(min_js)

print(f"CSS: {len(css)} → {len(min_css)} bytes ({round(100-len(min_css)/len(css)*100, 1)}% reduction)")
print(f"JS: {len(js)} → {len(min_js)} bytes ({round(100-len(min_js)/len(js)*100, 1)}% reduction)")
