# Quick Start - Ad-Blocker Proxy

## 5-Minute Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start the Proxy Server
```bash
npm start
```

You should see:
```
✅ Cinematic Hub Video Proxy running on port 3001
📍 Health check: http://localhost:3001/api/health
🎬 Video proxy: http://localhost:3001/api/proxy/video
```

### Step 3: Test It Works
Open your browser and visit:
```
http://localhost:3001/api/health
```

You should see:
```json
{
  "status": "healthy",
  "service": "Cinematic Hub - Video Security Proxy",
  "timestamp": "...",
  "version": "1.0.0"
}
```

### Step 4: Use in Your Site

The proxy is automatically integrated via `js/ad-blocker-proxy-integration.js`. It creates a global object:

```javascript
window.adBlockerProxy
```

#### Getting a Proxied URL
```javascript
const videoUrl = 'https://vidsrc.me/embed/movie/tt0111161';
const proxiedUrl = window.adBlockerProxy.getProxiedUrl(videoUrl, 'vidsrc');
// Returns: http://localhost:3001/api/proxy/video?url=<encoded>&provider=vidsrc
```

#### Loading Video in Player
```javascript
const container = document.getElementById('playerFrame');
window.adBlockerProxy.loadVideoInContainer(
  'https://vidsrc.me/embed/movie/tt0111161',
  'vidsrc',
  container
);
```

#### Checking Proxy Status
```javascript
if (window.adBlockerProxy.isHealthy) {
  console.log('✅ Proxy is online');
} else {
  console.log('❌ Proxy is offline - streaming without ad-blocking');
}
```

## What It Does

✅ Removes ALL ads from videos  
✅ Blocks malicious scripts  
✅ Prevents popups and redirects  
✅ Cleans up tracker domains  
✅ Works with vidsrc, vidplay, filemoon, etc.  

## Production Setup

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start api/ad-blocker-proxy.js --name "video-proxy"
pm2 save
pm2 startup
```

### Using Docker
```bash
docker build -t cinematic-proxy .
docker run -p 3001:3001 cinematic-proxy
```

### Environment Variables
```bash
PORT=3000 npm start           # Change port
NODE_ENV=production npm start # Production mode
```

## Troubleshooting

### Proxy not starting?
```bash
# Check if port is in use
netstat -an | grep 3001

# Use different port
PORT=3002 npm start
```

### Videos not loading?
1. Check health: `curl http://localhost:3001/api/health`
2. Check browser console for errors
3. Ensure video URL is correct
4. Try `npm install` to reinstall dependencies

### Still having issues?
Enable debug mode:
```javascript
// In browser console
window.adBlockerProxy.testProxy();
```

## Next Steps

1. Update your stream buttons to use the proxy
2. Test with a vidsrc/vidplay video
3. Deploy to production
4. Monitor logs for issues

## File Structure

```
cinematic-hubs/
├── api/
│   └── ad-blocker-proxy.js       ← Backend proxy server
├── js/
│   └── ad-blocker-proxy-integration.js  ← Frontend integration
├── package.json                  ← Dependencies
├── index.html                    ← Main page
└── AD_BLOCKER_PROXY_SETUP.md     ← Full documentation
```

## Supported Providers

- vidsrc.me, vidsrc.xyz
- vidplay.online, vidplay.site
- filemoon.sx, filemoon.to
- doodstream.com
- streamtape.com
- Any generic video embed

## Example Usage

```html
<!-- In your HTML -->
<button onclick="playVideo()">Watch Now</button>

<script>
async function playVideo() {
  const videoUrl = 'https://vidsrc.me/embed/movie/tt0111161';
  
  if (window.adBlockerProxy && window.adBlockerProxy.isHealthy) {
    const proxiedUrl = window.adBlockerProxy.getProxiedUrl(videoUrl, 'vidsrc');
    window.open(proxiedUrl, '_blank');
  } else {
    // Fallback to direct URL if proxy not available
    window.open(videoUrl, '_blank');
  }
}
</script>
```

## API Reference

### `window.adBlockerProxy.getProxiedUrl(url, provider)`
Returns the proxied URL for the given video URL.

### `window.adBlockerProxy.loadVideoInContainer(url, provider, container)`
Loads the video directly into a DOM element.

### `window.adBlockerProxy.isHealthy`
Boolean indicating if the proxy server is reachable.

### `window.adBlockerProxy.checkHealth()`
Manually check if proxy is online.

### `window.adBlockerProxy.testProxy()`
Test all supported providers (logs results).

---

**Version:** 1.0.0  
**Last Updated:** January 13, 2026  
**Status:** Production Ready ✅
