const CACHE_NAME = 'felpscnotes-v1';

// Arquivos essenciais para funcionar offline
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// ── Instala e faz cache dos assets principais ─────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Ativa e limpa caches antigos ──────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Intercepta requests: cache-first para assets locais ──────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Deixa passar Firebase, Google Fonts, CDNs externos
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('tailwindcss') ||
    url.hostname.includes('cdnjs')
  ) {
    return; // busca na rede normalmente
  }

  // Para assets locais: tenta cache primeiro, depois rede
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Salva no cache se for uma resposta válida
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Se offline e não tem cache, retorna o index.html
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
