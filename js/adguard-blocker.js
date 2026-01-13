/**
 * AdGuard-like Ad Blocker for Cinematic Hubs
 * Comprehensive multi-layer ad blocking system
 */

(function() {
  'use strict';
  
  // Comprehensive filter lists
  const BLOCKLIST = [
    // Ad networks
    /googlesyndication\.com/i,
    /pagead2\.googlesyndication\.com/i,
    /googleadservices\.com/i,
    /doubleclick\.net/i,
    /facebook\.com.*ad/i,
    /amazon-adsystem\.com/i,
    /criteo\.com/i,
    /taboola\.com/i,
    /outbrain\.com/i,
    /rubiconproject\.com/i,
    /openx\.net/i,
    /media\.net/i,
    /adsrvr\.org/i,
    /scorecardresearch\.com/i,
    /quantserve\.com/i,
    /appnexus\.com/i,
    /pubmatic\.com/i,
    /advertising\.com/i,
    /adnxs\.com/i,
    /biddingx\.com/i,
    /nr\.advertising\.com/i,
    /ads\.mopub\.com/i,
    /chartbeat\.net/i,
    /google-analytics/i,
    /analytics\.google\.com/i,
    /googletagmanager\.com/i,
    
    // Tracking and analytics
    /mixpanel\.com/i,
    /amplitude\.com/i,
    /segment\.com/i,
    /mouseflow\.com/i,
    /inspectlet\.com/i,
    /fullstory\.com/i,
    /loggly\.com/i,
    /keen\.io/i,
    
    // Popup networks
    /popads\.net/i,
    /popcash\.net/i,
    /clicksor\.com/i,
    /clickbank/i,
    /cpalead\.com/i,
    
    // Common redirect domains
    /\.tk$/i,
    /shortlink/i,
    /bit\.ly/i,
    /tinyurl/i,
    /ow\.ly/i
  ];
  
  // Block fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    
    if (typeof url === 'string' && isBlocked(url)) {
      console.log('🚫 [AdBlock] Fetch blocked:', url);
      return Promise.resolve(new Response('', { status: 204 }));
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Block XHR requests
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (typeof url === 'string' && isBlocked(url)) {
      console.log('🚫 [AdBlock] XHR blocked:', url);
      this._blocked = true;
      return;
    }
    return originalXhrOpen.apply(this, arguments);
  };
  
  XMLHttpRequest.prototype.send = function(data) {
    if (this._blocked) return;
    return XMLHttpRequest.prototype.send.call(this, data);
  };
  
  // Block image loads
  const OriginalImage = window.Image;
  window.Image = function() {
    const img = new OriginalImage();
    const originalSrc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(img), 'src');
    
    Object.defineProperty(img, 'src', {
      set: function(value) {
        if (isBlocked(value)) {
          console.log('🚫 [AdBlock] Image blocked:', value);
          return;
        }
        return originalSrc.set.call(this, value);
      },
      get: originalSrc.get
    });
    
    return img;
  };
  
  // Block script sources
  const OriginalScript = window.HTMLScriptElement;
  document.addEventListener('beforescriptexecute', (e) => {
    if (e.target.src && isBlocked(e.target.src)) {
      console.log('🚫 [AdBlock] Script blocked:', e.target.src);
      e.preventDefault();
    }
  }, true);
  
  // Block popup attempts
  const originalWindowOpen = window.open;
  window.open = function(url, target, features) {
    if (url && isBlocked(url)) {
      console.log('🚫 [AdBlock] Popup blocked:', url);
      return null;
    }
    console.log('🚫 [AdBlock] Popup blocked (all popups)');
    return null;
  };
  
  // Monitor for any opened windows and close them
  setInterval(() => {
    if (window.opener && window.opener !== window) {
      window.close();
    }
  }, 100);
  
  // Catch and close any new tabs/windows that somehow get created
  const originalWindowOpen2 = window.open;
  let openedWindows = [];
  window.open = function(url, target, features) {
    const win = originalWindowOpen2.apply(this, arguments);
    if (win) {
      openedWindows.push(win);
      setTimeout(() => {
        try {
          win.close();
          console.log('🚫 [AdBlock] Auto-closed opened window');
        } catch (e) {}
      }, 100);
    }
    return null;
  };
  
  // Helper function to check if URL is blocked
  function isBlocked(url) {
    if (!url) return false;
    
    try {
      const urlStr = typeof url === 'string' ? url : url.toString();
      return BLOCKLIST.some(pattern => pattern.test(urlStr));
    } catch (e) {
      return false;
    }
  }
  
  // Remove ad elements from DOM
  function removeAdElements() {
    const adPatterns = [
      { selector: '[class*="ad-"]', reason: 'ad- class' },
      { selector: '[class*="advert"]', reason: 'advert class' },
      { selector: '[class*="ads-"]', reason: 'ads- class' },
      { selector: '[id*="ad-"]', reason: 'ad- id' },
      { selector: '[id*="advert"]', reason: 'advert id' },
      { selector: '[class*="banner"]', reason: 'banner class' },
      { selector: '[class*="popup"]', reason: 'popup class' },
      { selector: '[class*="modal"]', reason: 'modal class' },
      { selector: 'ins.adsbygoogle', reason: 'Google ads' },
      { selector: '[data-ad-slot]', reason: 'ad slot' },
      { selector: '[data-ad-format]', reason: 'ad format' },
      { selector: '[data-ad-client]', reason: 'ad client' },
      { selector: '.google-auto-placed', reason: 'Google auto' },
      { selector: '.reCaptcha', reason: 'reCaptcha' }
    ];
    
    adPatterns.forEach(({ selector, reason }) => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          // Verify it's not part of the player
          if (!el.closest('#stream-iframe') && 
              !el.closest('#video') && 
              !el.closest('.player-container') &&
              !el.closest('[class*="videasy"]')) {
            el.remove();
          }
        });
      } catch (e) {}
    });
  }
  
  // Mutation observer for dynamically added ads
  const observer = new MutationObserver(() => {
    removeAdElements();
  });
  
  // Start monitoring when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    removeAdElements();
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'data-ad-slot']
    });
  });
  
  // Also run periodically
  setInterval(removeAdElements, 1000);
  
  // Block navigation attempts
  const originalNavigate = window.history.pushState;
  window.history.pushState = function(...args) {
    const url = args[2];
    if (url && isBlocked(url)) {
      console.log('🚫 [AdBlock] Navigation blocked:', url);
      return;
    }
    return originalNavigate.apply(this, args);
  };
  
  console.log('✅ [AdBlock] AdGuard blocker initialized');
})();
