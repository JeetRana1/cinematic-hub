# Deploy Your Own Consumet API

## Why Self-Host?
- ✅ No CORS issues
- ✅ No rate limits
- ✅ Better reliability
- ✅ Full control over endpoints
- ✅ Multi-source quality selection
- ✅ Subtitle support

## Quick Deploy to Vercel (FREE)

### Step 1: Fork Consumet Repository
1. Go to https://github.com/consumet/api.consumet.org
2. Click "Fork" button
3. Fork to your GitHub account

### Step 2: Deploy to Vercel
1. Go to https://vercel.com/new
2. Import your forked repo
3. Click "Deploy"
4. Done! You'll get a URL like: `https://your-consumet-api.vercel.app`

### Step 3: Update Your Website
Replace in `js/consumet-provider.js`:
```javascript
const CONSUMET_BASE = 'https://your-consumet-api.vercel.app';
```

## Features You'll Get:
- **FlixHQ Provider** - Movies & TV shows with multi-quality
- **No Ads** - Direct streaming links
- **Subtitles** - VTT subtitle support
- **Multiple Sources** - Fallback providers

## Alternative: Deploy to Render (also FREE)
1. Create account at https://render.com
2. Connect your GitHub
3. Select your Consumet fork
4. Click "Create Web Service"
5. Set environment to Node.js
6. Deploy!

## Cost: $0/month (stays on free tier)
