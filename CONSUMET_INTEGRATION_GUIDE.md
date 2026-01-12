# CORS Error Fix - Complete Integration Guide

## 🎯 Problem Summary
Your player was getting CORS errors when trying to play streams from `rainbloom44.xyz`. This happens because:
- The streaming provider doesn't allow cross-origin requests
- Your local dev server (127.0.0.1:5502) is blocked
- The stream URL doesn't include CORS headers

## ✅ Complete Solution Implemented

### What Was Added:

1. **Consumet Provider** (`js/consumet-provider.js`) - Primary stream source ⭐
   - Uses your local `http://localhost:3000`
   - No CORS issues
   - TMDB integration built-in
   - Multiple source support
   - Subtitles support

2. **CORS Proxy Helper** (`api/cors-proxy.js`) - Fallback
   - Auto-detects CORS-restricted domains
   - Routes through public CORS proxies
   - Provides helper functions

3. **Local CORS Proxy Server** (`api/cors-proxy-server.js`) - Production-ready
   - Optional Node.js server
   - Runs on port 3001
   - Full CORS support
   - HLS manifest rewriting

4. **Enhanced Player** (`player.html`)
   - Better error handling
   - Error message display
   - CORS configuration
   - User-Agent headers

---

## 🚀 Quick Setup

### Step 1: Verify Consumet API is Running
```bash
# You mentioned: http://localhost:3000 is running
# If not running, start it:
npm start  # or whatever command starts Consumet
```

### Step 2: Test Consumet Connection
Open browser console and run:
```javascript
window.consumetProvider.testConsumetConnection()
  .then(isConnected => {
    if (isConnected) {
      console.log('✓ Consumet is ready!');
    } else {
      console.log('✗ Consumet not responding');
    }
  });
```

### Step 3: Use Consumet in Your Player

#### Option A: Automatic Integration (Recommended)
The player now prefers Consumet API. Just use it as normal!

#### Option B: Manual Integration
```javascript
// In your stream resolution code:
const streamData = await window.consumetProvider.getStreamFromConsumet(
  'Predator Badlands',  // Movie title
  'MOVIE'               // Media type
);

if (streamData) {
  console.log('✓ Got stream from Consumet:');
  console.log('URL:', streamData.url);
  console.log('Type:', streamData.type);
  console.log('Quality:', streamData.quality);
  
  // Load in player
  const player = document.getElementById('video');
  player.src = streamData.url;
  player.play();
}
```

---

## 📋 Usage Examples

### Example 1: Get Stream by Movie Title
```javascript
const stream = await window.consumetProvider.getStreamFromConsumet('Predator Badlands');
console.log(stream.url);    // Stream URL
console.log(stream.type);   // 'hls' or 'mp4'
console.log(stream.sources); // All available sources
```

### Example 2: Get All Available Sources
```javascript
const sources = await window.consumetProvider.getMultipleSources('Predator Badlands');
sources.forEach((source, i) => {
  console.log(`Source ${i + 1}: ${source.quality} - ${source.type}`);
});
```

### Example 3: Get Trending Movies
```javascript
const trending = await window.consumetProvider.getTrendingMovies(1);
console.log(trending); // List of trending movies
```

### Example 4: Search Specific Provider
```javascript
// Search anime specifically
const animeResults = await window.consumetProvider.searchWithProvider(
  'Attack on Titan',
  'gogoanime'
);
console.log(animeResults);
```

---

## 🔧 Configuration

### Use Different Consumet Provider
```javascript
// Default is 'flixhq' (movies & TV)
// Also available: 'dramacool', 'gogoanime'

const stream = await fetch('http://localhost:3000/api/v2/gogoanime/search?query=Death%20Note');
```

### Fallback to CORS Proxy if Consumet Fails
```javascript
async function getStreamWithFallback(title) {
  // Try Consumet first
  let stream = await window.consumetProvider.getStreamFromConsumet(title);
  
  if (!stream) {
    console.log('Consumet failed, using fallback...');
    // Fallback to another source with CORS proxy
    const streamUrl = 'https://rainbloom44.xyz/...';
    const safeUrl = await window.corsProxyHelper.getSafeStreamUrl(streamUrl);
    stream = { url: safeUrl, type: 'hls' };
  }
  
  return stream;
}
```

---

## 🧪 Testing

### Test 1: Check Consumet Status
```bash
# Terminal
curl http://localhost:3000/api/v2/flixhq/home

# Should return trending movies
```

### Test 2: Search Test
```javascript
// Browser console
fetch('http://localhost:3000/api/v2/flixhq/search?query=Batman')
  .then(r => r.json())
  .then(data => console.log(data.results))
```

### Test 3: Stream Resolution
```javascript
// Browser console
window.consumetProvider.getStreamFromConsumet('The Batman')
  .then(stream => {
    if (stream) {
      console.log('✓ Stream found:', stream.url);
    } else {
      console.log('✗ No stream found');
    }
  });
```

---

## 📊 Stream Resolution Priority

```
1. Consumet API (Primary)
   └─ No CORS issues
   └─ TMDB integration
   └─ Multiple sources
   └─ Subtitles support

2. Legacy Provider with CORS Proxy (Fallback)
   └─ rainbloom44.xyz + public CORS proxy
   └─ Works if Consumet fails

3. Local CORS Proxy Server (Optional)
   └─ For production reliability
   └─ Requires: node api/cors-proxy-server.js
```

---

## ⚙️ Optional: Setup Local CORS Proxy Server

For production or if public proxies are unreliable:

### Install Dependencies
```bash
npm install express cors axios
```

### Start Server
```bash
node api/cors-proxy-server.js
```

### Use in Player
```javascript
// Instead of raw URL:
const rawUrl = 'https://rainbloom44.xyz/file1/...';

// Use proxy:
const proxiedUrl = `http://localhost:3001/api/proxy-stream?url=${encodeURIComponent(rawUrl)}`;

// Load in player
video.src = proxiedUrl;
```

---

## 🐛 Troubleshooting

### Issue: "Consumet API not responding"
**Solution:**
```javascript
// Check if it's running
window.consumetProvider.testConsumetConnection();

// If false, start it:
// npm start (in Consumet directory)
```

### Issue: "No streams found for movie"
**Solution:**
- Try different title format (add year)
- Movie might not be available in Consumet
- Try different provider (dramacool, gogoanime)

### Issue: "Stream plays but video is black"
**Solution:**
- Check video format (HLS vs MP4)
- Check if URL requires special headers
- Try CORS proxy workaround

### Issue: "CORS errors still happening"
**Solution:**
```javascript
// Enable CORS proxy fallback
const stream = await window.consumetProvider.getStreamFromConsumet(title);
if (!stream) {
  // Use CORS proxy
  const corsUrl = await window.corsProxyHelper.getSafeStreamUrl(fallbackUrl);
}
```

---

## 📚 API Reference

### `getStreamFromConsumet(query, mediaType)`
- **query** (string): Movie/show title
- **mediaType** (string): 'MOVIE' or 'TV'
- **Returns**: `{ title, id, url, type, quality, sources, subtitles }`

### `getMultipleSources(query)`
- **query** (string): Movie/show title
- **Returns**: Array of sources with quality options

### `testConsumetConnection()`
- **Returns**: boolean (true if connected)

### `getTrendingMovies(page)`
- **page** (number): Page number
- **Returns**: List of trending media

### `searchWithProvider(query, provider)`
- **query** (string): Search term
- **provider** (string): 'flixhq', 'dramacool', 'gogoanime'
- **Returns**: Array of search results

---

## 🎬 Final Integration Example

```javascript
async function playMovie(title) {
  try {
    console.log(`🎬 Playing: ${title}`);
    
    // Try Consumet first (no CORS issues)
    let stream = await window.consumetProvider.getStreamFromConsumet(title);
    
    if (!stream) {
      console.warn('Consumet failed, trying alternative...');
      // Could add fallback here
      return;
    }
    
    // Load stream
    const video = document.getElementById('video');
    
    if (stream.type === 'hls') {
      // Use HLS.js for M3U8
      const hls = new Hls({
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        }
      });
      hls.loadSource(stream.url);
      hls.attachMedia(video);
      console.log('✓ HLS stream loaded');
    } else {
      // Direct MP4 playback
      video.src = stream.url;
      console.log('✓ MP4 stream loaded');
    }
    
    // Add subtitles if available
    if (stream.subtitles && stream.subtitles.length > 0) {
      stream.subtitles.forEach(sub => {
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.srclang = sub.lang || 'en';
        track.label = sub.label || 'Subtitles';
        track.src = sub.url;
        video.appendChild(track);
      });
    }
    
    // Play
    await video.play();
    console.log('▶️ Playing!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Usage
playMovie('Predator Badlands');
```

---

## 📞 Support

If issues persist:
1. Check Consumet is running: `http://localhost:3000`
2. Check browser console for errors (F12)
3. Try different movie title
4. Use public CORS proxy as fallback
5. Run local CORS proxy server (Option 3)

---

**Status:** ✅ All components installed and ready!
**Recommended:** Use Consumet API for the best experience.
