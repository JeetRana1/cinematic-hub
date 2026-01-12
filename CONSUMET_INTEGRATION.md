# 🎬 Consumet API Integration Guide

## Overview
Your Cinematic Hub now integrates with **Consumet API** for high-quality, ad-free streaming! Consumet is the best free streaming API with TMDB integration.

## ✅ What's Been Set Up

### 1. **Configuration Files**
- ✅ `public/streamApiConfig.js` - Updated with Consumet endpoint
- ✅ `js/consumet-api.js` - New Consumet API integration module
- ✅ `js/stream-api.js` - Updated to use Consumet as primary provider

### 2. **API Endpoint**
Your local Consumet API: `http://localhost:3000`

### 3. **Provider Priority**
1. **Consumet API** (Primary) - Best quality, ad-free
   - FlixHQ provider (first choice)
   - VidSrc provider (fallback)
2. **Legacy Iframe Providers** (Fallback) - If Consumet fails

## 🚀 How to Use

### Step 1: Keep Your Consumet API Running
Make sure your Consumet API is running on port 3000:
```bash
# If not running, start it:
cd path/to/consumet-api
npm start
```

### Step 2: Test the Integration
Open the test page in your browser:
```
http://localhost:5500/test-consumet.html
```

This will show you:
- ✅ API connection status
- 🔍 Search functionality
- 🎥 Stream resolution
- 🧪 Full integration test

### Step 3: Use Your Website
Just use your website normally! It will automatically:
1. Try to get streams from Consumet first (best quality)
2. Fall back to legacy providers if Consumet fails
3. Show the stream in your player

## 📋 Features

### ✅ What You Get with Consumet:
- **Ad-free streams** - No annoying ads!
- **Multiple qualities** - Auto, 1080p, 720p, 480p, 360p
- **Subtitles support** - Automatic subtitle detection
- **Fast loading** - Direct stream URLs, no iframes
- **TMDB integration** - Works perfectly with your movie database
- **Multiple providers** - FlixHQ, VidSrc, and more

### 🎯 Supported Features:
- ✅ Movies (all genres)
- ✅ TV Shows (with season/episode support)
- ✅ Multiple quality options
- ✅ Subtitle tracks
- ✅ Automatic fallback to legacy providers

## 🧪 Testing

### Quick Test in Browser Console:
```javascript
// Test search
await ConsumetAPI.search('Inception')

// Test stream for a movie
await ConsumetAPI.resolveStream({ id: '27205', mediaType: 'movie' })

// Test TV show
await ConsumetAPI.resolveStream({ id: '1396', mediaType: 'tv' }, 1, 1)
```

### Expected Console Logs:
```
✅ Consumet API integration loaded
✓ Consumet API configured: http://localhost:3000
🔍 Searching Consumet for TMDB ID: 27205
✅ Stream resolved via FlixHQ: [URL]
```

## 🔧 Troubleshooting

### Problem: "API is offline"
**Solution:** 
```bash
# Start your Consumet API
cd path/to/consumet-api
npm start
```

### Problem: "No streams available"
**Solution:** The movie might not be in Consumet's database. The system will automatically fall back to legacy iframe providers.

### Problem: "CORS error"
**Solution:** Make sure your Consumet API has CORS enabled. Check your API's configuration.

### Problem: Stream doesn't play
**Solution:**
1. Check browser console for errors
2. Try a different movie
3. Check if HLS.js is loaded for .m3u8 streams

## 📝 API Providers

### Primary: Consumet API
- **Provider 1:** FlixHQ (Best quality)
- **Provider 2:** VidSrc (Backup)

### Fallback: Legacy Providers
- VidSrc.xyz
- VidSrc.cc
- VidSrc.me
- MoviesAPI.club
- VidSrc.in

## 🎨 Customization

### Change Consumet Endpoint
Edit `public/streamApiConfig.js`:
```javascript
window.CONSUMET_API = 'http://your-consumet-url:3000';
```

### Disable Consumet (Use Legacy Only)
In `js/stream-api.js`, comment out the Consumet section:
```javascript
// Try Consumet API first
/* 
if (window.ConsumetAPI && window.ConsumetAPI.resolveStream) {
  ...
}
*/
```

### Add More Providers
Edit `js/consumet-api.js` and add new provider functions following the existing pattern.

## 📚 Resources

- [Consumet Documentation](https://docs.consumet.org)
- [Consumet GitHub](https://github.com/consumet/api.consumet.org)
- [FlixHQ Provider](https://docs.consumet.org/providers/movies/flixhq)
- [VidSrc Provider](https://docs.consumet.org/providers/movies/vidsrc)

## 🎉 What's Next?

1. **Deploy Consumet** - Deploy your Consumet instance to Vercel/Railway for public access
2. **Add More Providers** - Integrate additional Consumet providers
3. **Cache Results** - Add caching to improve performance
4. **Analytics** - Track which providers work best

## ⚠️ Important Notes

- Keep your Consumet API running for the best experience
- The system automatically falls back to legacy providers
- Some movies may not be available in Consumet
- This is for educational purposes only

## 💡 Tips

1. **Best Performance:** Keep Consumet API running locally
2. **Production:** Deploy Consumet to a cloud service
3. **Testing:** Use the test page before going live
4. **Monitoring:** Check console logs for provider success rates

---

**Enjoy your upgraded streaming experience! 🎬✨**
