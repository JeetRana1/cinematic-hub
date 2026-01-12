/**
 * Multi-Source Embed Provider
 * Uses multiple reliable embed sources with fallback
 * These are iframe-based but more stable than VidSrc
 */

const EMBED_SOURCES = {
  // Primary sources (best quality, least ads)
  multiembed: 'https://multiembed.mov',
  embedsu: 'https://embed.su/embed',
  autoembed: 'https://player.autoembed.cc/embed',
  
  // Fallback sources
  vidsrcpro: 'https://vidsrc.pro/embed',
  vidsrcxyz: 'https://vidsrc.xyz/embed',
  vidsrccc: 'https://vidsrc.cc/v2/embed'
};

/**
 * Get best embed source for movie or series
 * Returns array of sources in priority order
 */
function getEmbedSources(tmdbId, mediaType = 'movie', season = null, episode = null) {
  const isSeries = (mediaType === 'tv' && season && episode);
  const sources = [];
  
  if (isSeries) {
    // TV Series embeds
    sources.push({
      provider: 'MultiEmbed',
      url: `${EMBED_SOURCES.multiembed}?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`,
      quality: 'auto',
      ads: 'minimal'
    });
    
    sources.push({
      provider: 'Embed.su',
      url: `${EMBED_SOURCES.embedsu}/tv/${tmdbId}/${season}/${episode}`,
      quality: 'high',
      ads: 'minimal'
    });
    
    sources.push({
      provider: 'AutoEmbed',
      url: `${EMBED_SOURCES.autoembed}/tv/${tmdbId}/${season}/${episode}`,
      quality: 'medium',
      ads: 'some'
    });
    
    sources.push({
      provider: 'VidSrc Pro',
      url: `${EMBED_SOURCES.vidsrcpro}/tv/${tmdbId}/${season}/${episode}`,
      quality: 'medium',
      ads: 'more'
    });
    
  } else {
    // Movie embeds
    sources.push({
      provider: 'MultiEmbed',
      url: `${EMBED_SOURCES.multiembed}?video_id=${tmdbId}&tmdb=1`,
      quality: 'auto',
      ads: 'minimal'
    });
    
    sources.push({
      provider: 'Embed.su',
      url: `${EMBED_SOURCES.embedsu}/movie/${tmdbId}`,
      quality: 'high',
      ads: 'minimal'
    });
    
    sources.push({
      provider: 'AutoEmbed',
      url: `${EMBED_SOURCES.autoembed}/movie/${tmdbId}`,
      quality: 'medium',
      ads: 'some'
    });
    
    sources.push({
      provider: 'VidSrc Pro',
      url: `${EMBED_SOURCES.vidsrcpro}/movie/${tmdbId}`,
      quality: 'medium',
      ads: 'more'
    });
  }
  
  return sources;
}

/**
 * Get stream with provider fallback
 */
async function getStreamWithFallback(tmdbId, mediaType = 'movie', season = null, episode = null) {
  const sources = getEmbedSources(tmdbId, mediaType, season, episode);
  
  console.log(`🎬 Found ${sources.length} embed sources for ${mediaType}`);
  console.log('📊 Sources:', sources.map(s => s.provider).join(', '));
  
  // Return first source (can be improved to test each)
  return {
    url: sources[0].url,
    quality: sources[0].quality,
    type: 'iframe',
    provider: sources[0].provider,
    allSources: sources,
    subtitles: []
  };
}

// Export for use
if (typeof window !== 'undefined') {
  window.multiEmbedProvider = {
    getSources: getEmbedSources,
    getStream: getStreamWithFallback
  };
  
  console.log('✅ Multi-Embed Provider loaded with', Object.keys(EMBED_SOURCES).length, 'sources');
}
