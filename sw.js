/* Cela 13 - service worker. Mude VERSAO ao publicar uma atualização grande. */
const VERSAO = 'cela13-v1';
const BASE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fontes e scripts do Firebase (CDN): usa o cache e atualiza em segundo plano.
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(VERSAO).then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // Arquivos do próprio site: rede primeiro (pega atualizações), cache se estiver offline.
  if (url.origin === self.location.origin) {
    e.respondWith(
      new Promise((resolve) => {
        const t = setTimeout(() => caches.match(req, { ignoreSearch: true }).then((h) => h && resolve(h)), 3500);
        fetch(req)
          .then((r) => {
            clearTimeout(t);
            if (r.ok) { const cp = r.clone(); caches.open(VERSAO).then((c) => c.put(req, cp)); }
            resolve(r);
          })
          .catch(() => {
            clearTimeout(t);
            caches.match(req, { ignoreSearch: true }).then((h) => resolve(h || caches.match('./index.html')));
          });
      })
    );
  }
  // Qualquer outro endereço (Firestore, login) passa direto, sem cache.
});
