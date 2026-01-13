// Generic HLS proxy for Vercel serverless
// Usage:
//  /api/hls-proxy?type=manifest&url=<m3u8>&referer=<optional>
//  /api/hls-proxy?type=segment&url=<ts-or-m4s>&referer=<optional>

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { type = 'manifest', url, referer } = req.query;
    if (!url) {
      res.status(400).json({ error: 'url parameter required' });
      return;
    }

    const target = decodeURIComponent(url);
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
    if (referer) headers['Referer'] = decodeURIComponent(referer);

    const response = await fetch(target, { headers });

    if (!response.ok) {
      const text = await response.text();
      console.error('Upstream error:', response.status, text.slice(0, 256));
      res.status(response.status).send(text);
      return;
    }

    if (type === 'manifest') {
      const text = await response.text();
      const base = target.substring(0, target.lastIndexOf('/') + 1);
      const rewrote = text.replace(/^(?!#)([^\n]+)$/gm, (line) => {
        // Absolute URL stays; relative becomes absolute
        const absolute = line.startsWith('http') ? line : base + line;
        return `/api/hls-proxy?type=segment&url=${encodeURIComponent(absolute)}${referer ? `&referer=${encodeURIComponent(decodeURIComponent(referer))}` : ''}`;
      });
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(rewrote);
      return;
    } else {
      // Segment passthrough
      res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
      return;
    }
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy failure', details: err.message });
  }
}
