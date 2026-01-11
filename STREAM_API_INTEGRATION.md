# 8Stream API Integration Guide

## Overview
Your Cinematic Hub now integrates with the 8Stream API to automatically fetch streaming links for movies using their IMDb IDs.

## How It Works

### 1. **Movie Selection**
When you click on a movie card:
- The modal opens with Stream button enabled
- Stream resolution happens when you click the Stream button (on-demand)

### 2. **Stream Resolution Process**
```
Click Stream Button → Check for existing source → If none, resolve via API → Navigate to player
```

**Flow:**
1. User clicks "Stream" button
2. Button shows "Loading stream..."
3. If no direct source (Drive/MP4), fetch from 8Stream API
4. Once resolved, navigate to player with stream URL

### 3. **Playback**
- The resolved stream URL is passed to the player
- HLS (.m3u8) streams use hls.js for playback
- MP4 streams play directly

## Testing the Integration

### In Browser Console

Test stream resolution for a specific IMDb ID:
```javascript
await testStreamResolve('tt1877830')  // The Batman (2022)
```

Expected output:
```
🔍 Testing stream resolution for IMDb ID: tt1877830
✓ Stream URL resolved: https://...m3u8
```

### Testing Flow

1. **Open the website** → Go to your Cinematic Hub
2. **Open browser DevTools** → Press F12
3. **Click on a movie** → Watch the console for:
   ```
   ✓ Stream resolved: https://...
   ```
4. **Click "Stream" button** → Should navigate to player
5. **Check player console** → Should show:
   ```
   🔍 Player URL Parameters: { src: "https://...", type: "hls", ... }
   🎬 Player initialization: { src: "...", sourceType: "hls", isHls: true }
   📺 Initializing HLS playback...
   ✓ HLS manifest parsed successfully
   ```

## Debugging

### Issue: "No video source provided"

**Check the console for:**
```
🔍 Player URL Parameters: { ... }
```

If `src` is missing:
1. The stream resolution may have failed
2. Check if the movie has an IMDb ID in TMDB
3. Try testing with `testStreamResolve('imdbId')`

### Issue: Stream button shows "Stream unavailable"

**Possible causes:**
- Movie doesn't have an IMDb ID in TMDB
- 8Stream API doesn't have this movie
- Network error during resolution

**Fix:**
Open console and check for warnings like:
```
Failed to fetch IMDb ID for TMDB movie
```

### Issue: Player shows HLS error

**Check:**
- Is the stream URL actually an .m3u8 file?
- Does the URL work in a direct browser tab?
- Check network tab for CORS errors

## API Configuration

### Current Endpoint
```javascript
STREAM_API = 'https://5d528c0d-bcad-4415-816c-eaccfdad56e0-00-2sav6y42resw5.riker.replit.dev/api/v1'
```

### Supported Languages (in order of preference)
1. Hindi
2. English
3. Tamil
4. Telugu
5. Bengali

To change language preference, modify the `resolveStreamUrlForMovie` call:
```javascript
await resolveStreamUrlForMovie(movie, ['English', 'Hindi'])
```

## Files Modified

### Core Integration
- **js/tmdb-integration.js** - Stream resolution logic
  - `fetchImdbIdForTmdbMovie()` - Get IMDb ID from TMDB
  - `fetchStreamUrlByImdb()` - Get stream from 8Stream API
  - `resolveStreamUrlForMovie()` - Main resolution function
  - `testStreamResolve()` - Debug helper

### UI Updates
- **index.html** - Modal stream button logic
  - Async stream resolution on modal open
  - HLS detection when passing to player
  - Stream 2 button support

### Player Updates
- **player.html** - Video playback
  - HLS playback with hls.js
  - MP4 fallback
  - Detailed debug logging
  - Better error messages

## Next Steps

### For TV Series Support
The API supports TV series, but you'll need to:
1. Extend `resolveStreamUrlForMovie` to handle series
2. Add season/episode selection
3. Pass episode-specific data to the API

### Custom API Endpoint
To use your own 8Stream API instance:
1. Deploy the API (see [8StreamApi docs](https://github.com/himanshu8443/8StreamApi))
2. Update `STREAM_API` in `js/tmdb-integration.js`

## Troubleshooting Checklist

- [ ] Browser console shows "✓ Stream resolved"
- [ ] Stream button text changes from "Resolving stream…" to "Stream"
- [ ] Player URL contains `src=` parameter
- [ ] Player console shows HLS initialization logs
- [ ] Network tab shows successful API calls to 8Stream
- [ ] No CORS errors in console

## Support

If streams aren't resolving:
1. Check the 8Stream API is online
2. Verify the movie has an IMDb ID in TMDB
3. Test with known working IMDb IDs (e.g., tt1877830)
4. Check browser console for detailed error messages

---

**Note:** The 8Stream API repository was archived in July 2025, so the API endpoint may change or become unavailable. Consider deploying your own instance if needed.
