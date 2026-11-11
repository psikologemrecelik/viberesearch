// VibePsych + Okuma Atlası hizmet çalışanı: uygulama internetsiz açılabilsin, ana ekrana kurulabilsin.
// Sayfalar (HTML) her zaman önce ağdan istenir (güncellemeler hemen gelsin); ağ yoksa son kopya açılır.
// Kütüphaneler ve fontlar önbellekten verilir, arkada yenilenir. Veri API'leri (OpenAlex, Crossref, Firebase) hiç önbelleğe alınmaz.
const VERSION = 'vp-2026-11-11-2';
const SHELL = [
  './', './index.html', './atlas.html', './firebase-config.js', './manifest.webmanifest', './icon.svg',
  './vendor/pdf.min.js', './vendor/pdf.worker.min.js', './vendor/fonts.css'
];
const LIVE_HOSTS = /(^|\.)(api\.openalex\.org|api\.crossref\.org|firestore\.googleapis\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebaseapp\.com|googleapis\.com|apis\.google\.com|accounts\.google\.com|scholar\.google\.com|researchgate\.net)$/;
const CDN_HOSTS = /(^|\.)(cdn\.tailwindcss\.com|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return (await cache.match(req)) || (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./index.html')) || Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') return;
  if (CDN_HOSTS.test(url.hostname)) { e.respondWith(staleWhileRevalidate(req)); return; }
  if (LIVE_HOSTS.test(url.hostname)) return;
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname.endsWith('firebase-config.js')) {
      e.respondWith(networkFirst(req));
    } else {
      e.respondWith(staleWhileRevalidate(req));
    }
  }
});
