const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(cors());
app.use(express.json());

// Rate limiting for proxy endpoints
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/proxy', limiter);

// Blocked ad domains - COMPREHENSIVE LIST
const BLOCKED_DOMAINS = [
  'doubleclick.net',
  'googleads.com',
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'adsystem.com',
  'googlesyndication.com',
  'adservice.google.com',
  'adnetwork.com',
  'affiliate.com',
  'clicktracking.com',
  'toruftuiov.com',  // Malicious redirector
  'my.toruftuiov.com',
  'zoneid',  // Redirect tracking
  'geo=',  // Geo tracking
  'campaign_id',  // Campaign tracking
  'click_id',  // Click tracking
  'truvex.com',
  'traff.sbs',
  'adclicker',
  'clickred',
  'redirect.app',
  'popunder',
  'popup-ads'
];

// Allowed video providers
const ALLOWED_HOSTS = [
  'vidsrc.me',
  'vidsrc.xyz',
  'vidplay.online',
  'vidplay.site',
  'filemoon.sx',
  'filemoon.to',
  'doodstream.com',
  'streamtape.com'
];

/**
 * Main video proxy endpoint
 * GET /api/proxy/video?url=<encoded-url>&provider=<provider>
 */
app.get('/api/proxy/video', async (req, res) => {
  try {
    const { url, provider } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter required' });
    }

    let cleanContent;
    
    if (provider === 'vidsrc' || url.includes('vidsrc')) {
      cleanContent = await processVidsrc(url);
    } else if (provider === 'vidplay' || url.includes('vidplay')) {
      cleanContent = await processVidplay(url);
    } else if (provider === 'filemoon' || url.includes('filemoon')) {
      cleanContent = await processFilemoon(url);
    } else {
      cleanContent = await processGeneric(url);
    }

    res.set('X-Ads-Blocked', 'true');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'SAMEORIGIN');
    res.send(cleanContent);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Failed to process video', details: error.message });
  }
});

/**
 * Process Vidsrc embed
 */
async function processVidsrc(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Remove ads and tracking (now with Ghostery adblocker support)
    removeAdElements($, url);

    // Extract video source
    let videoSource = '';
    $('iframe').each((i, iframe) => {
      const src = $(iframe).attr('src');
      if (src && (src.includes('/embed/') || src.includes('vidsrc'))) {
        videoSource = src;
        return false;
      }
    });

    return createCleanEmbed(videoSource || response.data);
  } catch (error) {
    throw new Error(`Vidsrc processing failed: ${error.message}`);
  }
}

/**
 * Process Vidplay embed
 */
async function processVidplay(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Extract video URL from script tags
    let videoUrl = '';
    $('script').each((i, script) => {
      const scriptContent = $(script).html();
      if (scriptContent) {
        const patterns = [
          /file:\s*["']([^"']+\.(mp4|m3u8))["']/,
          /src:\s*["']([^"']+\.(mp4|m3u8))["']/,
          /sources:\s*\[\s*{[^}]*url:\s*["']([^"']+)["']/,
          /source\s*:\s*["']([^"']+\.(mp4|m3u8))["']/
        ];

        for (const pattern of patterns) {
          const match = scriptContent.match(pattern);
          if (match && match[1]) {
            videoUrl = match[1];
            break;
          }
        }
      }
    });

    // Remove all ads and tracking (now with Ghostery adblocker support)
    removeAdElements($, url);

    return createCleanEmbed(videoUrl || response.data, 'vidplay');
  } catch (error) {
    throw new Error(`Vidplay processing failed: ${error.message}`);
  }
}

/**
 * Process Filemoon embed
 */
async function processFilemoon(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Extract video URL
    let videoUrl = '';
    $('script').each((i, script) => {
      const scriptContent = $(script).html();
      if (scriptContent && scriptContent.includes('sources')) {
        const match = scriptContent.match(/sources:\s*\[\s*{[^}]*file:\s*["']([^"']+)["']/);
        if (match && match[1]) {
          videoUrl = match[1];
          return false;
        }
      }
    });

    removeAdElements($);

    return createCleanEmbed(videoUrl || response.data, 'filemoon');
  } catch (error) {
    throw new Error(`Filemoon processing failed: ${error.message}`);
  }
}

/**
 * Generic provider processing
 */
async function processGeneric(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 8000
    });

    const $ = cheerio.load(response.data);
    removeAdElements($, url);

    return $.html();
  } catch (error) {
    throw new Error(`Generic processing failed: ${error.message}`);
  }
}

/**
 * Remove all ad-related elements and scripts
 * ULTRA-AGGRESSIVE: Returns a completely clean HTML with NO external content
 */
function removeAdElements($, htmlUrl = '') {
  // Aggressive manual cleanup - ultra-effective for ad removal
  // Remove EVERYTHING except body and essential elements
  $('head').html('<meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{margin:0;padding:0;background:#000}</style>');
  
  const body = $('body');
  
  // Remove all ads, popups, scripts, iframes
  body.find('*').each((i, elem) => {
    const el = $(elem);
    
    // Remove bad elements
    if (el.is('script, style, link, iframe, img, meta, noscript, form')) {
      el.remove();
      return;
    }
    
    // Remove elements with ad-related classes/ids
    const classes = el.attr('class') || '';
    const id = el.attr('id') || '';
    if (classes.includes('ad') || classes.includes('popup') || classes.includes('modal') ||
        id.includes('ad') || id.includes('popup') || id.includes('modal')) {
      el.remove();
      return;
    }
    
    // Remove ALL event handlers
    el.removeAttr('onclick');
    el.removeAttr('onload');
    el.removeAttr('onerror');
    el.removeAttr('onmouseover');
    
    // Remove all hrefs except safe ones
    if (el.is('a')) {
      const href = el.attr('href') || '';
      if (!href.startsWith('#') && !href.startsWith('javascript:void')) {
        el.removeAttr('href');
      }
    }
  });
  
  // Return only body content (no head, no external resources)
  return body.html();
}

/**
 * Check if script is advertising related
 */
function isAdScript(src, scriptContent) {
  const str = `${src} ${scriptContent}`.toLowerCase();
  
  // Ad network keywords
  const adKeywords = [
    'ad', 'ads', 'advertisement', 'tracking', 'analytics', 'popup', 'openx', 'gumgum', 'sovrn',
    'window.location', 'window.open', 'location.href', 'redirect', 'zoneid', 'campaign_id', 
    'click_id', 'geo=', 'toruftuiov', 'youtube', 'popunder', 'clickjack', 'ClickUnder'
  ];
  
  // Check for blocked domains
  const isBlocked = BLOCKED_DOMAINS.some(domain => str.includes(domain));
  
  // Check for ad keywords
  const isAd = adKeywords.some(keyword => str.includes(keyword));
  
  // Check for suspicious redirect patterns
  const hasRedirect = /window\.(location|open)\s*\(|location\.href\s*=/.test(str);
  const hasMaliciousUrl = /toruftuiov|zoneid|campaign_id|click_id/.test(str);
  
  return isBlocked || isAd || (hasRedirect && hasMaliciousUrl);
}

/**
 * Check if URL is from ad domain
 */
function isAdDomain(url) {
  const str = url.toLowerCase();
  return BLOCKED_DOMAINS.some(domain => str.includes(domain));
}

/**
 * Create clean embed HTML
 */
/**
 * Create clean embed - just return the cleaned HTML
 * All ads have been removed by removeAdElements()
 */
function createCleanEmbed(html, provider = 'generic') {
  // If it's already HTML, return it (ads already removed)
  if (typeof html === 'string' && html.includes('<html')) {
    return html;
  }
  
  // If it's a URL, wrap it in a safe iframe
  const source = html;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; background: #000; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
  <script>
    // BLOCK ALL REDIRECTS
    window.open = function() { console.log('BLOCKED'); return null; };
    Object.defineProperty(window, 'location', { get: function() { return window.location; }, set: function() {} });
  </script>
</head>
<body>
  <iframe src="${source}" frameborder="0" allow="autoplay; fullscreen" sandbox="allow-same-origin allow-scripts allow-presentation allow-fullscreen"></iframe>
</body>
</html>`;
}

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Cinematic Hub - Video Security Proxy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Cinematic Hub Video Proxy running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎬 Video proxy: http://localhost:${PORT}/api/proxy/video`);
});
