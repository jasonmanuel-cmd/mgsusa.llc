c = open('index.html', encoding='utf-8').read()
idx = c.find('hero-img')
if idx >= 0:
    print('Context:', c[max(0,idx-100):idx+200])