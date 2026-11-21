// Guarda la app para que abra sin cobertura. Los datos van siempre a Google.
const CACHE = 'cesta-v2';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.json', 'icon-192.png',
  'logos/mercadona.png', 'logos/lidl.png', 'logos/aldi.png', 'logos/alimerka.png', 'logos/froiz.png', 'logos/gadis.png', 'logos/elcorte.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // Red primero (para recibir cambios), caché si no hay conexión.
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
