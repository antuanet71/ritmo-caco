"""Genera backend/Index.html (la app en un solo archivo, con logos incluidos) para pegar en Apps Script.
Uso: python3 build.py"""
import base64, json, os
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: open(os.path.join(here, f), encoding='utf-8').read()
logos = {}
for f in sorted(os.listdir(os.path.join(here, 'logos'))):
    if f.endswith('.png'):
        b = open(os.path.join(here, 'logos', f), 'rb').read()
        logos[f[:-4]] = 'data:image/png;base64,' + base64.b64encode(b).decode()
html = f"""<!DOCTYPE html>
<html lang="es">
<head>
<base target="_top">
<meta charset="utf-8">
<style>
{rd('style.css')}
</style>
</head>
<body>
<div id="app" class="app"></div>
<div id="overlay"></div>
<script>window.CESTA_LOGOS = {json.dumps(logos)};</script>
<script>
{rd('app.js')}
</script>
</body>
</html>
"""
out = os.path.join(here, 'backend', 'Index.html')
open(out, 'w', encoding='utf-8').write(html)
print('OK', out, len(html) // 1024, 'KB')
