// Proxy API to 8Stream API to bypass CORS issues
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Missing movie ID' });
  }

  // Allow overriding via environment variable STREAM_API
  const API_BASE = process.env.STREAM_API || 'https://convinced-nara-personal122-7da52759.koyeb.app/api/v1';

  try {
    const response = await fetch(
      `${API_BASE}/mediaInfo?id=${encodeURIComponent(id)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch from stream API',
    });
  }
}
