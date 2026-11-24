const cacheName = `ai-notebook-shell-${version}`;
const publicAssets = new Set(assets);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    try {
      await cache.addAll(assets.map((asset) => new Request(asset, { cache: 'reload' })));
    } catch (error) {
      await caches.delete(cacheName);
      throw error;
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => event.waitUntil((async () => {
  await self.clients.claim();
  await Promise.all((await caches.keys()).filter((key) => key.startsWith('ai-notebook-shell-') && key !== cacheName).map((key) => caches.delete(key)));
})()));

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET') return;
  const key = url.pathname;
  if (request.mode === 'navigate' && key === '/') {
    event.respondWith(caches.open(cacheName).then(async (cache) => (await cache.match('/')) ?? fetch(request)));
  } else if (key !== '/' && publicAssets.has(key)) {
    event.respondWith(caches.open(cacheName).then(async (cache) => (await cache.match(key)) ?? fetch(request)));
  }
});
