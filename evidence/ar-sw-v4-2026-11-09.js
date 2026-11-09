const CACHE = 'bfr-conecta-v118';
const CACHE_PREFIX = 'bfr-conecta-';
const SHELL_PATHS = new Set(['/', '/index.html']);
// A query precisa de bater com a que o index.html pede (?v=12 / ?v=2): caches.match compara a URL
// inteira, e um PRECACHE desalinhado só se nota no fallback offline, porque o fetch é network-first.
const PRECACHE_PATHS = ['/', '/manifest.json', '/bfr-app-logo.png', '/lia-avatar.svg', '/lia-avatar.png', '/bfr-responsive-presentation.js?v=14', '/bfr-teacher-arrivals.js?v=2'];
const PUBLIC_ASSETS = new Set([
  '/manifest.json', '/bfr-app-logo.png', '/lia-avatar.svg', '/lia-avatar.png',
  '/calendario-letivo-2026.pdf', '/horario-matutino-2026.pdf',
  '/horario-vespertino-2026.pdf', '/horario-matutino-2026.png',
  '/horario-vespertino-2026.png'
]);

function isPublicAsset(url) {
  return PUBLIC_ASSETS.has(url.pathname) || /^\/bfr-[a-z0-9-]+\.js$/i.test(url.pathname);
}

function cacheable(request, url, response) {
  if (url.origin !== self.location.origin || request.method !== 'GET' || request.headers.has('range') || !response.ok || response.type !== 'basic') return false;
  if (SHELL_PATHS.has(url.pathname)) return request.mode === 'navigate';
  return isPublicAsset(url);
}

self.addEventListener('install', event => event.waitUntil((async () => {
  // Limpar TODOS os caches antigos imediatamente no install
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX)).map(k => caches.delete(k)));
  const cache = await caches.open(CACHE);
  try { await cache.addAll(PRECACHE_PATHS); } catch {
    try {
      const response = await fetch('/', { cache: 'no-store' });
      if (response.ok) await cache.put('/', response);
    } catch {}
  }
  await self.skipWaiting();
})()));

self.addEventListener('activate', event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
    .then(() => {
      // Forçar reload em todos os clientes abertos
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => client.navigate(client.url));
      });
    })
));

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (SHELL_PATHS.has(url.pathname) && event.request.mode === 'navigate') {
    // Sempre buscar network primeiro para o shell, cache apenas como fallback
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(event.request, response.clone());
          return response;
        }
      } catch {}
      return (await caches.match(event.request)) || (await caches.match('/')) || Response.error();
    })());
    return;
  }
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (cacheable(event.request, url, response)) {
        try {
          const cache = await caches.open(CACHE);
          await cache.put(event.request, response.clone());
        } catch {}
      }
      return response;
    } catch {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') return (await caches.match('/')) || Response.error();
      return Response.error();
    }
  })());
});
