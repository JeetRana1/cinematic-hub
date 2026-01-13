// Service Worker with Ad Blocking
const AD_DOMAINS = [
  'googlesyndication.com',
  'pagead2.googlesyndication.com',
  'adservice.google.com',
  'ads.google.com',
  'doubleclick.net',
  'googleadservices.com',
  'googletagmanager.com',
  'analytics.google.com',
  'facebook.com',
  'connect.facebook.net',
  'amazon-adsystem.com',
  'media.net',
  'rubiconproject.com',
  'openx.net',
  'criteo.com',
  'taboola.com',
  'outbrain.com',
  'ads.yahoo.com',
  'bing.com/acsbug',
  'scorecardresearch.com',
  'quantserve.com',
  'tracking.js',
  'beacon.js',
  'ads.js',
  'advert',
  'advertisement',
  'banner',
  'clickbank',
  'clicksor',
  'pop',
  'popup'
];

const AD_KEYWORDS = [
  'advert',
  'banner',
  'pop-up',
  'popup',
  'ad-',
  'advertisement',
  '/ads/',
  '/ad/',
  'doubleclick',
  'google_ad'
];

// Whitelist of legitimate APIs and services that should NOT be blocked
const WHITELIST_DOMAINS = [
  'api.themoviedb.org',
  'image.tmdb.org',
  'api.consumet.org',
  'vidsrc.xyz',
  'player.videasy.net',
  'firebaseapp.com',
  'firestore.googleapis.com',
  'googleapis.com',
  'cloudflare.com',
  'jsdelivr.net',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'gstatic.com',
  'youtube.com',
  'youtu.be'
];

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Check if URL is whitelisted - if so, always allow it
  const isWhitelisted = WHITELIST_DOMAINS.some(domain => url.href.includes(domain));
  if (isWhitelisted) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Check if URL contains ad domains or keywords
  const isAd = AD_DOMAINS.some(domain => url.href.includes(domain)) ||
               AD_KEYWORDS.some(keyword => url.href.includes(keyword));
  
  if (isAd) {
    console.log('🚫 Ad blocked:', url.href);
    
    // Return appropriate empty response for ad requests
    if (event.request.destination === 'script' || event.request.destination === 'stylesheet') {
      event.respondWith(new Response('', { status: 200, headers: { 'Content-Type': 'text/plain' } }));
    } else if (event.request.destination === 'image') {
      // Return a 1x1 transparent pixel for image ads
      event.respondWith(
        new Response(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x0A, 0x00, 0x01, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x4C, 0x01, 0x00, 0x3B]), 
          { status: 200, headers: { 'Content-Type': 'image/gif' } }
        )
      );
    } else {
      event.respondWith(new Response('', { status: 200 }));
    }
    return;
  }
  
  // For non-ad requests, proceed normally with error handling
  event.respondWith(
    fetch(event.request).catch(err => {
      // Silently fail blocked requests to avoid console spam
      return new Response('', { status: 200 });
    })
  );
});
