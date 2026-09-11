/* ===========================================================================
   MAUSAM — service worker
   Makes the app installable and usable with no network connection.

   Strategy:
     • App shell (HTML, CSS, JS, icons)  -> cache-first, refreshed in background
     • Weather / AQI / marine API calls  -> network-first, short-lived cache
     • Anything else                     -> network, falling back to cache
   =========================================================================== */
'use strict';

const VERSION = 'mausam-v4';
const SHELL_CACHE = VERSION + '-shell';
const DATA_CACHE = VERSION + '-data';

// Everything the app needs to boot with no network at all.
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/data.js',
  './js/engine.js',
  './js/geo.js',
  './js/context.js',
  './js/app.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
  './assets/logo-mark-96.png',
  './assets/logo-mark-192.png',
  './assets/favicon.png',
];

const DATA_HOSTS = [
  'api.open-meteo.com',
  'air-quality-api.open-meteo.com',
  'marine-api.open-meteo.com',
  'geocoding-api.open-meteo.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {
        // a single missing asset must not break the whole install
        return Promise.all(SHELL_ASSETS.map((u) => cache.add(u).catch(() => null)));
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function isWeatherCall(url) {
  return DATA_HOSTS.indexOf(url.hostname) !== -1;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ---- live weather data: network first, fall back to the last good response
  if (isWeatherCall(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(DATA_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || new Response(
          JSON.stringify({ error: 'offline' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )))
    );
    return;
  }

  // ---- page navigations: NETWORK FIRST
  // A new deploy must show up on the very next load, not after two reloads.
  // The cache is only used when the device is genuinely offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          }
          return res;
        }
        .catch(() => caches.match('./index.html')
          .then((hit) => hit || caches.match('./'))
          .then((hit) => hit || new Response(
            '<!doctype html><meta charset="utf-8"><title>MAUSAM</title>' +
            '<body style="font:16px system-ui;background:#04182b;color:#eaf2fb;padding:40px;text-align:center">' +
            '<h1>MAUSAM</h1><p>You are offline and the app has not been cached yet. ' +
            'Reconnect once and it will work offline afterwards.</p>',
            { headers: { 'Content-Type': 'text/html' } }
          )))
    );
    return;
  }

  // ---- other same-origin assets: cache first, refreshed in the background
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => hit);
        return hit || network;
      })
    );
    return;
  }

  // ---- everything else (fonts, third-party AI endpoints): network, then cache
  event.respondWith(
    fetch(req)
      .then((res) => res)
      .catch(() => caches.match(req).then((hit) => hit || Response.error()))
  );
});

// Let the page trigger an immediate update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
