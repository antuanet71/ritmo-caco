import re
h=open('app.html').read()
h=h.replace('/*SAMPLE*/',(open('sample.md').read() if __import__('os').path.exists('sample.md') else '').replace('</','<\\/'))
h=h.replace('/*PARSER*/',open('parser.js').read())
h=h.replace('/*APP*/',open('app.js').read())
open('index.html','w').write(h)
# standalone version (full document) for hosting outside claude.ai
h2=open('app.html').read().replace('/*SAMPLE*/','').replace('/*PARSER*/',open('parser.js').read()).replace('/*APP*/',open('app.js').read())
sa=('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    '<link rel="manifest" href="manifest.json"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style></head><body>'
    + h2 + '<script>if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});</script></body></html>')
import os; os.makedirs('standalone',exist_ok=True)
open('standalone/index.html','w').write(sa)
