const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const app = express();
const port = 3000;

// Ensure fetch exists (Node 18+ has global fetch)
if (typeof fetch === 'undefined') {
  // eslint-disable-next-line global-require
  global.fetch = require('node-fetch');
}

const cacheDir = path.join(__dirname, '.cache', 'hls');
fs.mkdirSync(cacheDir, { recursive: true });
const memoryCache = new Map();

const isSegmentUrl = (url) => /\.(ts|m4s|mp4|aac|m4a|mp3)(\?|$)/i.test(url);
const isM3U8Url = (url) => /\.m3u8(\?|$)/i.test(url);

const getCacheKey = (url) => crypto.createHash('sha1').update(url).digest('hex');

const readDiskCache = (key) => {
  const dataPath = path.join(cacheDir, `${key}.bin`);
  const metaPath = path.join(cacheDir, `${key}.json`);
  if (!fs.existsSync(dataPath) || !fs.existsSync(metaPath)) return null;
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (meta.expires <= Date.now()) return null;
    const buffer = fs.readFileSync(dataPath);
    return { buffer, headers: meta.headers, expires: meta.expires };
  } catch {
    return null;
  }
};

const writeDiskCache = (key, buffer, headers, ttlMs) => {
  const dataPath = path.join(cacheDir, `${key}.bin`);
  const metaPath = path.join(cacheDir, `${key}.json`);
  const meta = { headers, expires: Date.now() + ttlMs };
  fs.writeFileSync(dataPath, buffer);
  fs.writeFileSync(metaPath, JSON.stringify(meta));
};

const fetchWithCache = async (url, ttlMs) => {
  const key = getCacheKey(url);
  const now = Date.now();
  const cached = memoryCache.get(key);
  if (cached && cached.expires > now) return cached;

  if (isSegmentUrl(url)) {
    const disk = readDiskCache(key);
    if (disk) {
      memoryCache.set(key, disk);
      return disk;
    }
  }

  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
      'accept': '*/*'
    }
  });
  if (!res.ok) {
    throw new Error(`Upstream ${res.status} for ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const headers = {
    'content-type': res.headers.get('content-type') || 'application/octet-stream',
    'cache-control': res.headers.get('cache-control') || 'public, max-age=0'
  };
  const entry = { buffer, headers, expires: now + ttlMs };
  memoryCache.set(key, entry);

  if (isSegmentUrl(url)) {
    writeDiskCache(key, buffer, headers, ttlMs);
  }

  return entry;
};

const rewriteM3U8 = (text, baseUrl, proxyBase) => {
  const lines = text.split(/\r?\n/);
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Rewrite URI="..." inside tag lines (audio/subtitles/iframes)
      if (trimmed.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/g, (match, uri) => {
          const resolved = new URL(uri, baseUrl).toString();
          return `URI="${proxyBase}${encodeURIComponent(resolved)}"`;
        });
      }

      // Rewrite plain segment/playlist lines
      const resolved = new URL(trimmed, baseUrl).toString();
      return `${proxyBase}${encodeURIComponent(resolved)}`;
    })
    .join('\n');
};

app.get('/hls/proxy', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing url');

  try {
    const url = target.toString();
    const proxyBase = `${req.protocol}://${req.get('host')}/hls/proxy?url=`;

    if (isM3U8Url(url)) {
      const entry = await fetchWithCache(url, 30 * 1000);
      const text = entry.buffer.toString('utf8');
      const rewritten = rewriteM3U8(text, url, proxyBase);
      res.set('content-type', 'application/vnd.apple.mpegurl');
      return res.send(rewritten);
    }

    const entry = await fetchWithCache(url, 60 * 60 * 1000);
    Object.entries(entry.headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.send(entry.buffer);
  } catch (err) {
    console.error('HLS proxy error:', err.message);
    return res.status(502).send('Proxy error');
  }
});

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Start the server
app.listen(port, () => {
  console.log(`CinematicHub web app running at http://localhost:${port}`);
});
