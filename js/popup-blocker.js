/**
 * Comprehensive Popup & Redirect Blocker for Embedded Video Players
 * Blocks ads, popups, redirects, and malicious clickjacking attempts
 */

class PopupBlocker {
  constructor() {
    this.blockedPopups = 0;
    this.blockedRedirects = 0;
    this.blockedClicks = 0;
    this.maliciousPatterns = [
      'toruftuiov',
      'zoneid',
      'campaign_id',
      'click_id',
      'popunder',
      'redirect',
      'clickjack',
      'adclick',
      'popup',
      'banner',
      'youtube',
      'ad'
    ];
    this.init();
  }

  init() {
    // Block all window.open calls from iframe content
    this.blockWindowOpen();
    
    // Block location.href changes
    this.blockLocationChanges();
    
    // Block onclick handlers
    this.blockClickHandlers();
    
    // Monitor iframe interactions
    this.monitorIframes();
    
    // Prevent right-click menu hijacking
    this.protectContextMenu();
    
    // Block visibility change tricks
    this.blockVisibilityTricks();
    
    // Monitor window focus changes
    this.monitorWindowFocus();
    
    console.log('🛡️ Popup Blocker initialized');
  }

  /**
   * Override window.open to block malicious popups
   */
  blockWindowOpen() {
    const originalOpen = window.open;
    window.open = (url, target, features) => {
      if (!url) {
        console.log('⚠️ Blocked: window.open() with no URL');
        return null;
      }

      const urlStr = String(url).toLowerCase();
      
      // Check for malicious patterns
      if (this.isMaliciousUrl(urlStr)) {
        this.blockedPopups++;
        console.log(`🚫 Blocked popup: ${url}`);
        return null;
      }

      // Check for blank popups (often used for ads)
      if (urlStr === 'about:blank' && !target) {
        console.log('⚠️ Blocked: Blank popup window');
        return null;
      }

      // Check if called from suspicious script
      const stack = new Error().stack;
      if (stack && this.isStackSuspicious(stack)) {
        this.blockedPopups++;
        console.log('🚫 Blocked: Popup from suspicious context');
        return null;
      }

      // Allow legitimate popups
      console.log('✅ Allowed: window.open(' + url + ')');
      return originalOpen.call(window, url, target, features);
    };
  }

  /**
   * Block location.href changes to malicious sites
   */
  blockLocationChanges() {
    const self = this; // Preserve context
    const handler = {
      set: (target, property, value) => {
        if (property === 'href') {
          const valueStr = String(value).toLowerCase();
          
          if (self.isMaliciousUrl(valueStr)) {
            self.blockedRedirects++;
            console.log(`🚫 Blocked redirect: ${value}`);
            return true; // Prevent assignment
          }
        }
        return Reflect.set(target, property, value);
      }
    };

    // Replace location object with proxy
    try {
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        get() {
          return new Proxy(originalLocation, handler);
        },
        set() {} // Prevent reassignment
      });
    } catch (e) {
      console.warn('Could not fully override location', e);
    }
  }

  /**
   * Block onclick handlers that trigger redirects
   */
  blockClickHandlers() {
    const self = this; // Preserve context
    
    // Override addEventListener for the entire document
    const originalAddEventListener = Element.prototype.addEventListener;
    
    Element.prototype.addEventListener = function(type, listener, options) {
      if (type === 'click') {
        const wrappedListener = (event) => {
          // Check if listener code contains malicious patterns
          const fnStr = listener.toString().toLowerCase();
          if (self.isMaliciousFunction(fnStr)) {
            event.stopPropagation();
            event.preventDefault();
            console.log('🚫 Blocked: Malicious click handler');
            return;
          }
          return listener.call(this, event);
        };
        
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  }

  /**
   * Monitor iframe interactions and messages
   */
  monitorIframes() {
    const self = this; // Preserve context
    
    // Monitor postMessage to catch data exfiltration
    const originalPostMessage = window.postMessage;
    window.postMessage = function(message, targetOrigin, transfer) {
      const msgStr = JSON.stringify(message).toLowerCase();
      
      if (self.isMaliciousUrl(targetOrigin) || msgStr.includes('malware')) {
        console.log('🚫 Blocked: Suspicious postMessage');
        return;
      }
      
      return originalPostMessage.call(window, message, targetOrigin, transfer);
    };

    // Monitor for new iframes being injected
    const originalAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function(node) {
      if (node.tagName === 'IFRAME') {
        const src = node.getAttribute('src') || '';
        if (self.isMaliciousUrl(src.toLowerCase())) {
          console.log(`🚫 Blocked: Malicious iframe injection: ${src}`);
          return node; // Don't append
        }
      }
      return originalAppendChild.call(this, node);
    };
  }

  /**
   * Protect right-click context menu
   */
  protectContextMenu() {
    document.addEventListener('contextmenu', (event) => {
      // Allow right-click but monitor for menu hijacking
      const target = event.target;
      if (target.tagName === 'IFRAME') {
        // Don't allow iframe context menu override
        event.preventDefault();
        console.log('✅ Protected: Right-click on iframe');
      }
    });
  }

  /**
   * Block visibility toggle tricks used for ads
   */
  blockVisibilityTricks() {
    // Monitor for fullscreen requests that aren't from user interaction
    document.addEventListener('fullscreenchange', (event) => {
      if (!this.isUserInitiated()) {
        document.exitFullscreen().catch(() => {});
        console.log('🚫 Blocked: Auto fullscreen request');
      }
    });

    // Monitor for hidden elements being made visible for ads
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const element = mutation.target;
          const style = element.getAttribute('style') || '';
          
          // Check for hidden->visible transitions
          if (style.includes('display:') && !style.includes('display:none') && 
              this.isMaliciousElement(element)) {
            element.style.display = 'none';
            console.log('🚫 Blocked: Hidden ad element visibility change');
          }
        }
      });
    });

    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['style', 'class']
    });
  }

  /**
   * Monitor window focus changes (often used for ad timing)
   */
  monitorWindowFocus() {
    window.addEventListener('focus', () => {
      // Check if focus was triggered by malicious code
      const stack = new Error().stack;
      if (stack && this.isStackSuspicious(stack)) {
        // Blur immediately to prevent ad auto-playing
        setTimeout(() => window.blur(), 0);
      }
    });
  }

  /**
   * Check if URL contains malicious patterns
   */
  isMaliciousUrl(url) {
    const urlStr = String(url).toLowerCase();
    
    const maliciousDomains = [
      'toruftuiov.com',
      'popads.net',
      'popcash.net',
      'propellerads.com',
      'clicktracking',
      'redirect',
      'adclick'
    ];

    for (const domain of maliciousDomains) {
      if (urlStr.includes(domain)) return true;
    }

    // Check for suspicious parameter patterns
    if (/[?&](zoneid|campaign_id|click_id|geo=|cost=)/.test(urlStr)) {
      return true;
    }

    return false;
  }

  /**
   * Check if function code contains malicious patterns
   */
  isMaliciousFunction(fnStr) {
    const suspicious = [
      'window.location',
      'window.open',
      'location.href',
      'toruftuiov',
      'zoneid',
      'campaign_id',
      'redirect',
      'popunder'
    ];

    for (const pattern of suspicious) {
      if (fnStr.includes(pattern)) return true;
    }

    return false;
  }

  /**
   * Check if DOM element is likely an ad
   */
  isMaliciousElement(element) {
    const id = element.id?.toLowerCase() || '';
    const className = element.className?.toLowerCase() || '';
    const style = element.getAttribute('style')?.toLowerCase() || '';

    const adPatterns = ['ad', 'banner', 'popup', 'redirect', 'modal'];
    
    for (const pattern of adPatterns) {
      if (id.includes(pattern) || className.includes(pattern) || style.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if call stack is suspicious
   */
  isStackSuspicious(stack) {
    const suspicious = ['ad', 'tracking', 'analytics', 'popup', 'redirect'];
    const stackStr = stack.toLowerCase();

    for (const pattern of suspicious) {
      if (stackStr.includes(pattern)) return true;
    }

    return false;
  }

  /**
   * Check if action was user-initiated
   */
  isUserInitiated() {
    const stack = new Error().stack;
    // Check if called from event handler
    return stack && (stack.includes('click') || stack.includes('user'));
  }

  /**
   * Get blocker statistics
   */
  getStats() {
    return {
      blockedPopups: this.blockedPopups,
      blockedRedirects: this.blockedRedirects,
      blockedClicks: this.blockedClicks
    };
  }

  /**
   * Log blocked statistics
   */
  logStats() {
    const stats = this.getStats();
    console.log('📊 Popup Blocker Statistics:');
    console.log(`   Popups Blocked: ${stats.blockedPopups}`);
    console.log(`   Redirects Blocked: ${stats.blockedRedirects}`);
    console.log(`   Clicks Blocked: ${stats.blockedClicks}`);
  }
}

// Initialize popup blocker when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.popupBlocker = new PopupBlocker();
  });
} else {
  window.popupBlocker = new PopupBlocker();
}

// Log stats periodically
setInterval(() => {
  if (window.popupBlocker) {
    window.popupBlocker.logStats();
  }
}, 30000); // Every 30 seconds
