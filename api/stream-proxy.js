/**
 * Stream API Proxy
 * Forwards requests to 8StreamAPI without CORS issues
 */

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { action, id, season, episode, file, key } = req.query;
    const API_BASE = 'https://8streamapi-ju5obhkzf-jeetrana1s-projects.vercel.app/api/v1';

    if (!action) {
      return res.status(400).json({ success: false, message: 'action parameter required' });
    }

    if (action === 'mediaInfo') {
      // Proxy mediaInfo request
      if (!id) {
        return res.status(400).json({ success: false, message: 'id parameter required' });
      }

      let url = `${API_BASE}/mediaInfo?id=${encodeURIComponent(id)}`;
      if (season && episode) {
        url += `&season=${season}&episode=${episode}`;
      }

      console.log('🔄 Proxying mediaInfo:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        const text = await response.text();
        console.error('API error:', response.status, text);
        return res.status(response.status).json({ 
          success: false, 
          message: `API Error ${response.status}` 
        });
      }

      const data = await response.json();
      return res.status(200).json(data);
    }

    if (action === 'getStream') {
      // Proxy getStream request
      if (!file || !key) {
        return res.status(400).json({ success: false, message: 'file and key parameters required' });
      }

      console.log('🔄 Proxying getStream:', file);
      const response = await fetch(`${API_BASE}/getStream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, key })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('getStream error:', response.status, text);
        return res.status(response.status).json({ 
          success: false, 
          message: `getStream Error ${response.status}` 
        });
      }

      const data = await response.json();
      return res.status(200).json(data);
    }

    res.status(400).json({ success: false, message: 'Unknown action' });
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}
