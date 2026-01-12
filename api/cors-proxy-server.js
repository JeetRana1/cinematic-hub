/**
 * Local CORS Proxy Server
 * Run with: node api/cors-proxy-server.js
 * Then use: http://localhost:3001/api/proxy-stream?url=<encoded-url>
 */

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// CORS Proxy endpoint
app.get('/api/proxy-stream', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    const decodedUrl = decodeURIComponent(url);
    console.log(`📥 Proxying request for: ${decodedUrl}`);
    
    // Fetch the stream with proper headers
    const response = await axios.get(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://google.com'
      },
      responseType: 'stream',
      timeout: 30000
    });
    
    // Set CORS headers
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Content-Type': response.headers['content-type'],
      'Content-Length': response.headers['content-length']
    });
    
    // Pipe the stream
    response.data.pipe(res);
    
    response.data.on('error', (error) => {
      console.error('Stream error:', error.message);
      res.status(500).json({ error: 'Failed to fetch stream' });
    });
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to proxy request',
      details: error.message 
    });
  }
});

// M3U8 manifest proxy (for HLS)
app.get('/api/proxy-manifest', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    const decodedUrl = decodeURIComponent(url);
    console.log(`📥 Proxying M3U8 manifest: ${decodedUrl}`);
    
    // Fetch the manifest
    const response = await axios.get(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://google.com'
      },
      timeout: 10000
    });
    
    // Set CORS headers for manifest
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-cache'
    });
    
    // Rewrite URLs in manifest to go through proxy
    let manifest = response.data;
    const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);
    
    manifest = manifest.replace(/^((?!http)[^\n]+\.ts.*)$/gm, (match) => {
      const fullUrl = match.startsWith('http') ? match : baseUrl + match;
      return `/api/proxy-stream?url=${encodeURIComponent(fullUrl)}`;
    });
    
    res.send(manifest);
    
  } catch (error) {
    console.error('Manifest proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to proxy manifest',
      details: error.message 
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CORS Proxy Server' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 CORS Proxy Server running at http://localhost:${PORT}`);
  console.log(`📺 Use: http://localhost:${PORT}/api/proxy-stream?url=<encoded-url>\n`);
});
