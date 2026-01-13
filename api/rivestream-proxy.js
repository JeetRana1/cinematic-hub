// Rivestream backendfetch proxy to bypass CORS
// Usage: /api/rivestream-proxy?tmdbId=12345&service=flowcast

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { tmdbId, service = 'asiacloud' } = req.query;
  if (!tmdbId) {
    res.status(400).json({ success: false, message: 'tmdbId required' });
    return;
  }

  try {
    const secretKey = 'NzY5NmVjNTA='; // from HAR
    const target = `https://rivestream.org/api/backendfetch?requestID=movieVideoProvider&id=${encodeURIComponent(tmdbId)}&service=${encodeURIComponent(service)}&secretKey=${secretKey}&proxyMode=noProxy`;
    const upstream = await fetch(target, {
      headers: {
        Referer: 'https://rivestream.org/',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      res.status(upstream.status).json({ success: false, message: 'Upstream error', status: upstream.status, body: text.slice(0, 512) });
      return;
    }

    const data = await upstream.json();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Proxy failure' });
  }
}
