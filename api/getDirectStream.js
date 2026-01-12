// API to extract direct video URLs from streaming sources
export default async function handler(req, res) {
  const { tmdbId, type = 'movie', season = '1', episode = '1' } = req.query;

  if (!tmdbId) {
    return res.status(400).json({ success: false, message: 'Missing tmdbId' });
  }

  try {
    // Try multiple sources to get direct video URL
    const sources = [
      // VidSrc API endpoint (returns direct URLs)
      type === 'tv' 
        ? `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}`
        : `https://vidsrc.xyz/embed/movie/${tmdbId}`,
    ];

    // For now, return a working direct stream URL
    // This would normally scrape the embed page to extract the actual video URL
    const directUrl = type === 'tv'
      ? `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}`
      : `https://vidsrc.xyz/embed/movie/${tmdbId}`;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    return res.status(200).json({
      success: true,
      data: {
        src: directUrl,
        type: 'iframe', // Will be 'hls' once we extract the actual m3u8
        quality: 'auto'
      }
    });
  } catch (error) {
    console.error('Direct stream error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get direct stream',
    });
  }
}
