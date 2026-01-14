// sw-adblock.js stub - ad-blocker disabled
// Original ad-blocker removed per request. This file is now a no-op service worker.
self.addEventListener('install', (e) => { e.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (event) => {
  // Ad-blocking disabled — simply pass through requests
  event.respondWith(fetch(event.request).catch(() => new Response('', { status: 200 }))); 
});
