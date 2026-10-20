// Cache application code only. Financial records and authentication responses are never cached here.
const CACHE = 'harmonie-offline-app-v1';
const scopeURL = new URL(self.registration.scope);
function allowed(url) {
  return (url.origin === scopeURL.origin && [scopeURL.pathname, new URL('index.html', scopeURL).pathname, new URL('firebase-store.js', scopeURL).pathname].includes(url.pathname)) ||
    (url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/') && url.pathname.endsWith('.js'));
}
async function prepareOfflineFiles() {
  const cache = await caches.open(CACHE), visited = new Set();
  async function cacheModule(url) {
    url = new URL(url, scopeURL).href;
    if (visited.has(url) || !allowed(new URL(url))) return;
    visited.add(url);
    const response = await fetch(url, { cache: 'reload' });
    if (!response.ok) throw new Error('Offline file unavailable: ' + url);
    await cache.put(url, response.clone());
    const source = await response.text();
    const imports = [...source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g)].map(match => new URL(match[1], url).href);
    await Promise.all(imports.map(cacheModule));
  }
  const pageURL = new URL('index.html', scopeURL).href;
  await cacheModule(pageURL);
  await cacheModule(new URL('firebase-store.js', scopeURL).href);
  // These are the Firebase entry modules referenced by firebase-store.js.
  await Promise.all(['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].map(name => cacheModule('https://www.gstatic.com/firebasejs/13.0.0/' + name)));
}
self.addEventListener('install', event => event.waitUntil(prepareOfflineFiles().then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || !allowed(url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (url.origin === 'https://www.gstatic.com') {
      const stored = await cache.match(request); if (stored) return stored;
    }
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    } catch (error) {
      const stored = await cache.match(request) || (request.mode === 'navigate' ? await cache.match(new URL('index.html', scopeURL).href) : null);
      if (stored) return stored;
      throw error;
    }
  })());
});
