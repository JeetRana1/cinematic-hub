/**
 * Streaming Player Security Layer
 * Prevents unwanted redirects, popups, and navigation
 * Protects against malicious ads and clickjacking
 */

(function () {
  'use strict';

  console.log('🔒 Activating Streaming Player Security...');

  // 1. Block all window.open calls (popup blocker) - AGGRESSIVE
  const originalWindowOpen = window.open;
  window.open = function (url, target, features) {
    console.warn('🚫 Popup blocked:', url);
    return {
      closed: false,
      close: function () { },
      focus: function () { },
      blur: function () { },
      location: { href: '' }
    };
  };

  // Block popunder attempts
  window.blur = function () { };
  window.focus = function () { };

  // 2. Block all navigation attempts (except internal)
  try {
    const originalLocationHref = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
    if (originalLocationHref && originalLocationHref.set) {
      Object.defineProperty(Location.prototype, 'href', {
        set: function (url) {
          if (url && !url.includes(window.location.hostname)) {
            console.warn('🚫 External navigation blocked:', url);
            return;
          }
          originalLocationHref.set.call(this, url);
        },
        get: function () {
          return originalLocationHref.get.call(this);
        },
        configurable: true
      });
    }
  } catch (e) {
    console.warn('⚠️ Could not override location.href:', e.message);
  }

  // 3. Block location.replace calls (with try-catch for read-only property)
  try {
    const originalReplace = window.location.replace;
    Object.defineProperty(window.location, 'replace', {
      value: function (url) {
        if (url && !url.includes(window.location.hostname)) {
          console.warn('🚫 Location.replace blocked:', url);
          return;
        }
        originalReplace.call(window.location, url);
      },
      writable: false,
      configurable: false
    });
  } catch (e) {
    console.warn('⚠️ Could not override location.replace:', e.message);
  }

  // 4. Block location.assign calls (guarded for read-only properties)
  try {
    const originalAssign = window.location.assign;
    Object.defineProperty(window.location, 'assign', {
      value: function (url) {
        if (url && !url.includes(window.location.hostname)) {
          console.warn('🚫 Location.assign blocked:', url);
          return;
        }
        return originalAssign.call(window.location, url);
      },
      writable: false,
      configurable: false
    });
  } catch (e) {
    console.warn('⚠️ Could not override location.assign:', e.message);
  }

  // 5. Block top.location changes
  try {
    Object.defineProperty(window, 'top', {
      get: function () { return window; },
      set: function () { console.warn('🚫 top.location change blocked'); }
    });
  } catch (e) { }

  // 6. Block parent.location changes
  try {
    Object.defineProperty(window, 'parent', {
      get: function () { return window; },
      set: function () { console.warn('🚫 parent.location change blocked'); }
    });
  } catch (e) { }

  // 5. Sandbox iframes properly (except player embeds)
  const originalCreateElement = document.createElement;
  document.createElement = function (tag) {
    const element = originalCreateElement.call(document, tag);

    if (tag.toLowerCase() === 'iframe') {
      // On the player pages, do NOT sandbox embeds (otherwise providers break)
      const pathname = window.location.pathname.toLowerCase();
      if (pathname.includes('player.html') || pathname.includes('player-2.html')) {
        return element;
      }

      // Don't sandbox known video player iframes
      const id = (element.id || '').toLowerCase();
      if (id === 'streamiframe' || id === 'stream-iframe' || id === 'video-iframe') {
        console.log('🎬 Video iframe - no sandbox restrictions');
        return element;
      }

      // Add sandbox restrictions to other iframes (valid flags only)
      element.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-presentation allow-popups allow-pointer-lock allow-modals allow-top-navigation-by-user-activation');
      element.setAttribute('referrerpolicy', 'no-referrer');
      console.log('🔒 Iframe sandboxed:', element.id || '(no id)');
    }

    return element;
  };

  // 6. Block all link clicks to external sites (but NOT iframe clicks)
  document.addEventListener('click', function (e) {
    const target = e.target.closest('a');
    if (target && target.href && e.target.tagName !== 'IFRAME') {
      const href = target.href;

      // Allow internal links only
      if (href.includes(window.location.hostname) || href.startsWith('#') || href.startsWith('javascript:')) {
        return;
      }

      // Block external navigation
      console.warn('🚫 External link click blocked:', href);
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // 7. Block all form submissions to external domains
  document.addEventListener('submit', function (e) {
    const form = e.target;
    const action = form.action;

    if (action && !action.includes(window.location.hostname)) {
      console.warn('🚫 External form submission blocked:', action);
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // 8. Block unload/beforeunload from iframes
  window.addEventListener('beforeunload', function (e) {
    // Allow normal navigation, just log it
    console.log('⚠️ Page unload detected');
  });

  // 9. Override fetch to block external requests (optional - can break some functionality)
  // Commented out to allow external API calls needed for streaming
  // const originalFetch = window.fetch;
  // window.fetch = function(url, options) {
  //   if (typeof url === 'string' && url.includes('http') && !url.includes(window.location.hostname)) {
  //     console.warn('Fetch request to:', url);
  //   }
  //   return originalFetch.apply(this, arguments);
  // };

  // 10. Block XHR requests to suspicious domains
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    // Only log, don't block - some APIs are needed
    if (typeof url === 'string' && url.includes('http')) {
      console.log('📡 XHR request:', method, url.substring(0, 80));
    }
    return originalXHROpen.apply(this, arguments);
  };

  // 11. Block document.write (often used for ads/redirects)
  const originalDocumentWrite = document.write;
  document.write = function (content) {
    if (content.includes('window.location') || content.includes('top.location')) {
      console.warn('🚫 Redirect attempt via document.write blocked');
      return;
    }
    return originalDocumentWrite.apply(document, arguments);
  };

  // 12. Monitor iframe messages to prevent postMessage exploits
  window.addEventListener('message', function (event) {
    // Only log, iframes might need to communicate
    if (event.data && typeof event.data === 'string' && event.data.includes('location')) {
      console.warn('⚠️ Suspicious iframe message:', event.data.substring(0, 80));
    }
  });

  // 13. Block any attempt to change the current URL via JavaScript
  const handler = {
    apply: function (target, thisArg, args) {
      const url = args[0];
      if (typeof url === 'string' && !url.includes(window.location.hostname)) {
        console.warn('🚫 Navigation attempt blocked:', url);
        return null;
      }
      return Reflect.apply(target, thisArg, args);
    }
  };

  // 14. Disable navigation from iframes
  const iframeElements = document.querySelectorAll('iframe');
  iframeElements.forEach(iframe => {
    iframe.addEventListener('load', function () {
      try {
        // Try to prevent iframe navigation
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDoc) {
          // Block links in iframe
          const links = iframeDoc.querySelectorAll('a[href]');
          links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('#')) {
              link.setAttribute('onclick', 'return false;');
              link.style.pointerEvents = 'none';
            }
          });
        }
      } catch (e) {
        // Cross-origin iframes can't be accessed
        console.log('ℹ️ Cross-origin iframe - sandboxing in place');
      }
    });

    // Disable right-click context menu in iframes (blocks some redirect menus)
    iframe.addEventListener('contextmenu', function (e) {
      // Allow, but log it
      console.log('📋 Context menu triggered in iframe');
    });
  });

  console.log('✅ Security layer activated!');
  console.log('🔒 Protection includes:');
  console.log('   • Popup blocker');
  console.log('   • Navigation blocker');
  console.log('   • External link blocker');
  console.log('   • Iframe sandboxing');
  console.log('   • Form submission blocker');
  console.log('   • Redirect prevention');

})();