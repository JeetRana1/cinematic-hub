# CORS Proxy Setup Guide

## Problem
You're getting CORS (Cross-Origin Resource Sharing) errors when trying to play streams from providers like `rainbloom44.xyz`, `vidsrc.pro`, etc.

Error example:
```
Access to XMLHttpRequest at 'https://rainbloom44.xyz/...' blocked by CORS policy
```

## Solutions

### Solution 1: Use Public CORS Proxies (Quick & Easy) ✅ RECOMMENDED
The app now supports automatic CORS proxy fallback. No setup needed!

**Benefits:**
- No installation required
- Automatic fallback if primary proxy fails
- Works with existing code

**How it works:**
The player automatically detects CORS-restricted domains and routes them through public CORS proxies.

---

### Solution 2: Run Local CORS Proxy Server (Best for Production)

This gives you full control and reliability.

#### Installation

1. **Install dependencies:**
```bash
npm install express cors axios
```

2. **Start the proxy server:**
```bash
node api/cors-proxy-server.js
```

You should see:
```
🚀 CORS Proxy Server running at http://localhost:3001
📺 Use: http://localhost:3001/api/proxy-stream?url=<encoded-url>
```

3. **Update player.html** to use the local proxy:

In `player.html`, change the stream URL loading to:
```javascript
// Instead of using the raw stream URL directly:
// const streamUrl = "https://rainbloom44.xyz/...";

// Use the local proxy:
const streamUrl = `http://localhost:3001/api/proxy-stream?url=${encodeURIComponent(originalStreamUrl)}`;
```

#### Features
- ✅ Full CORS support
- ✅ Automatic header injection
- ✅ M3U8 manifest rewriting
- ✅ Stream chunking support
- ✅ Error handling
- ✅ Local control (no reliance on external services)

---

### Solution 3: Better Streaming Provider

Instead of using problematic streaming providers, use:

**Consumet API** (Already configured in your project!)
- Local: `http://localhost:3000`
- Clean streams with proper CORS headers
- TMDB integration included
- Multiple source fallback

**To use Consumet:**
1. Ensure Consumet is running: `http://localhost:3000`
2. The app will automatically use it if configured
3. No CORS issues!

---

## Testing CORS Proxy

### Test Public Proxy:
```javascript
// Open browser console and run:
window.corsProxyHelper.testCorsProxy('https://rainbloom44.xyz/file1/...')
  .then(proxy => console.log('Working proxy:', proxy))
  .catch(err => console.error('No proxy available:', err));
```

### Test Local Proxy:
```bash
# Test health check
curl http://localhost:3001/health

# Test stream proxy
curl "http://localhost:3001/api/proxy-stream?url=<encoded-url>"
```

---

## Environment Variables

Add to your `.env`:
```bash
# CORS Proxy Server
CORS_PROXY_ENABLED=true
CORS_PROXY_URL=http://localhost:3001
CORS_PROXY_TYPE=local  # or 'public' for external proxies
```

---

## Common Issues

### Issue: "CORS proxy not responding"
**Solution:** Check if `localhost:3001` is running
```bash
# Check if port is in use
netstat -ano | findstr :3001

# Kill process if needed (Windows)
taskkill /PID <PID> /F
```

### Issue: "Stream still has CORS errors"
**Solution:** Try a different streaming provider
1. Use Consumet API instead (more reliable)
2. Or try different public CORS proxies

### Issue: "Manifest load error"
**Solution:** Some providers block CORS proxies
- Try using `/api/proxy-manifest` endpoint instead
- Or use Consumet API directly

---

## Recommended Setup

For **Development**: Use public CORS proxies (built-in, no setup)
For **Production**: Run local CORS proxy server for reliability and privacy

---

## More Information

- [CORS Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [HLS.js](https://github.com/video-dev/hls.js)
- [Consumet API](https://docs.consumet.org/)
