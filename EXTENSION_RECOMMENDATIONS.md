# 🚀 How to Add Extension Recommendations to Your Site

Since browser extensions are the most effective solution for ad blocking, here's how to recommend them to your users.

## Option 1: Simple Banner (Easiest)

Add this code to your `index.html` right after the opening `<body>` tag:

```html
<div id="adblock-banner" style="
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  border-radius: 8px;
  margin: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
">
  <div>
    <strong>🛡️ Better Ad Protection Available!</strong>
    <p style="margin: 5px 0 0 0; font-size: 14px;">
      Install a free ad blocker for complete protection against ads and trackers.
    </p>
  </div>
  <div style="display: flex; gap: 10px; margin-left: 20px;">
    <a href="https://adguard.com/en/adguard-browser-extension/chrome.html" 
       target="_blank" rel="noopener"
       style="padding: 8px 16px; background: white; color: #667eea; border-radius: 4px; 
              text-decoration: none; font-weight: 600; cursor: pointer;">
      AdGuard
    </a>
    <a href="https://github.com/gorhill/uBlock" 
       target="_blank" rel="noopener"
       style="padding: 8px 16px; background: rgba(255,255,255,0.2); color: white; 
              border-radius: 4px; text-decoration: none; font-weight: 600; cursor: pointer;
              border: 1px solid white;">
      uBlock Origin
    </a>
  </div>
</div>

<script>
// Optional: Hide banner after user clicks close (in next iteration)
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('adblock-banner');
  if (banner) {
    // Auto-hide after 10 seconds (user has seen it)
    setTimeout(() => {
      banner.style.display = 'none';
    }, 10000);
  }
});
</script>
```

---

## Option 2: Modal Dialog (More Prominent)

Add to `index.html`:

```html
<div id="extension-modal" style="
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  z-index: 9999;
  justify-content: center;
  align-items: center;
">
  <div style="
    background: white;
    border-radius: 12px;
    padding: 40px;
    max-width: 500px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    text-align: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
  ">
    <h2 style="color: #333; margin: 0 0 15px 0;">🛡️ Enhance Your Browsing</h2>
    <p style="color: #666; line-height: 1.6; margin: 0 0 25px 0;">
      We recommend using a free ad blocker to enjoy a cleaner, faster browsing experience 
      and protect yourself from trackers.
    </p>
    
    <div style="display: flex; gap: 15px; margin-bottom: 20px;">
      <div style="flex: 1; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="font-weight: 600; margin-bottom: 8px;">AdGuard</div>
        <p style="font-size: 13px; color: #666; margin: 0 0 10px 0;">Most comprehensive protection</p>
        <a href="https://adguard.com/en/adguard-browser-extension/chrome.html" target="_blank"
           style="display: inline-block; background: #667eea; color: white; padding: 8px 16px; 
                  border-radius: 4px; text-decoration: none; font-size: 14px; font-weight: 600;">
          Install
        </a>
      </div>
      
      <div style="flex: 1; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="font-weight: 600; margin-bottom: 8px;">uBlock Origin</div>
        <p style="font-size: 13px; color: #666; margin: 0 0 10px 0;">Lightweight & powerful</p>
        <a href="https://github.com/gorhill/uBlock" target="_blank"
           style="display: inline-block; background: #764ba2; color: white; padding: 8px 16px; 
                  border-radius: 4px; text-decoration: none; font-size: 14px; font-weight: 600;">
          Install
        </a>
      </div>
    </div>
    
    <p style="color: #999; font-size: 13px; margin: 0;">
      <a href="#" onclick="
        document.getElementById('extension-modal').style.display = 'none'; 
        localStorage.setItem('hideExtensionModal', 'true');
        return false;
      " style="color: #666; text-decoration: none;">Not interested</a>
    </p>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
  // Show modal only if user hasn't dismissed it
  if (!localStorage.getItem('hideExtensionModal')) {
    setTimeout(() => {
      document.getElementById('extension-modal').style.display = 'flex';
    }, 2000); // Show after 2 seconds
  }
});
</script>
```

---

## Option 3: Smart Detection + Messaging

```html
<script>
// Check if user might have ad blocker
function checkForAdBlocker() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(false);
    img.onerror = () => resolve(true);
    img.src = '//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const hasAdBlocker = await checkForAdBlocker();
  
  if (!hasAdBlocker && !localStorage.getItem('extensionPrompted')) {
    // User doesn't have ad blocker - recommend one
    showExtensionRecommendation();
    localStorage.setItem('extensionPrompted', 'true');
  } else if (hasAdBlocker) {
    console.log('✅ User already has ad blocker - all good!');
  }
});

function showExtensionRecommendation() {
  // Show your preferred banner/modal from above
  document.getElementById('adblock-banner').style.display = 'flex';
}
</script>
```

---

## Links for Your Users

### Chrome/Edge/Brave:
- **AdGuard**: https://chromewebstore.google.com/detail/adguard-adblocker/bgnkhhnnamicmpeenaelnjfhikboxamc
- **uBlock Origin**: https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm

### Firefox:
- **AdGuard**: https://addons.mozilla.org/firefox/addon/adguard-adblocker/
- **uBlock Origin**: https://addons.mozilla.org/firefox/addon/ublock-origin/

### Safari (Mac):
- **AdGuard**: https://apps.apple.com/app/adguard-adblocker/id1440147259
- **uBlock Origin**: (Not available on Safari, recommend AdGuard instead)

---

## FAQ for Your Users

### "Why do I need an ad blocker if you're already removing ads?"

**Answer**: 
> Your site uses a proxy to remove visible ads, but some video sources use advanced redirect techniques. A browser extension provides network-level protection that websites can't offer, blocking redirects and tracking before they happen.

### "Is it safe?"

**Answer**:
> AdGuard and uBlock Origin are safe, open-source projects trusted by millions. AdGuard has 3.9k GitHub stars, uBlock Origin has 60k+ stars. Both are recommended by security experts.

### "Will it slow down my browser?"

**Answer**:
> No. Both are lightweight. uBlock Origin is especially known for using minimal resources. They actually speed up page loads by blocking trackers and ads.

### "What does it block?"

**Answer**:
> - Ads from all sources
> - Tracking pixels and analytics
> - Malware domains
> - Redirect popups
> - YouTube sponsorship ads (uBlock)

---

## Measuring Success

Add tracking to see if users install extensions:

```javascript
// Track extension recommendation clicks
document.querySelectorAll('[href*="adguard"]').forEach(link => {
  link.addEventListener('click', () => {
    console.log('User clicked AdGuard recommendation');
    // Send to analytics
    gtag?.('event', 'extension_recommended', { extension: 'adguard' });
  });
});

document.querySelectorAll('[href*="ublock"]').forEach(link => {
  link.addEventListener('click', () => {
    console.log('User clicked uBlock Origin recommendation');
    gtag?.('event', 'extension_recommended', { extension: 'ublocorigin' });
  });
});
```

---

## Implementation Checklist

- [ ] Choose banner style (Option 1, 2, or 3)
- [ ] Add HTML/CSS to your pages
- [ ] Add proper extension links for user's browser
- [ ] Test on Chrome, Firefox, Safari
- [ ] Add analytics tracking (optional)
- [ ] Monitor click-through rate
- [ ] Keep proxy running (continues to help 80% of cases)

---

**Remember**: This is the most effective, realistic solution to stop YouTube redirects. Your proxy handles 80% of ads. Extensions handle the remaining 20% that require network-layer blocking.

