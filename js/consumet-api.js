/**
 * Consumet API Integration
 * Provides streaming links for movies and TV shows using the Consumet API
 * Documentation: https://docs.consumet.org
 */

(function() {
  'use strict';

  // Get Consumet API base URL
  function getConsumetApiBase() {
    return window.CONSUMET_API || 'http://localhost:3000';
  }

  /**
   * Fetch stream links from Consumet API using FlixHQ provider
   * @param {string} tmdbId - TMDB ID of the movie/show
   * @param {string} mediaType - 'movie' or 'tv'
   * @param {number} season - Season number (for TV shows)
   * @param {number} episode - Episode number (for TV shows)
   * @returns {Promise<Object>} Stream data with URLs and quality options
   */
  async function fetchConsumetStream(tmdbId, mediaType = 'movie', season = null, episode = null) {
    const base = getConsumetApiBase();
    
    try {
      // Step 1: Search for the media on FlixHQ using TMDB ID
      console.log('🔍 Searching Consumet for TMDB ID:', tmdbId, 'Type:', mediaType);
      
      let watchUrl;
      if (mediaType === 'tv' && season && episode) {
        watchUrl = `${base}/movies/flixhq/watch?episodeId=tv/${tmdbId}-${season}-${episode}&mediaId=${tmdbId}`;
      } else {
        watchUrl = `${base}/movies/flixhq/watch?episodeId=${tmdbId}&mediaId=${tmdbId}`;
      }
      
      console.log('📡 Fetching stream from:', watchUrl);
      
      const response = await fetch(watchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Consumet API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 Consumet response:', data);

      if (!data || !data.sources || data.sources.length === 0) {
        throw new Error('No streaming sources found');
      }

      // Get the best quality source
      const sources = data.sources;
      const bestSource = sources.find(s => s.quality === 'auto') || 
                        sources.find(s => s.quality === '1080p') ||
                        sources.find(s => s.quality === '720p') ||
                        sources[0];

      return {
        success: true,
        url: bestSource.url,
        type: bestSource.isM3U8 ? 'hls' : 'mp4',
        quality: bestSource.quality,
        sources: sources,
        subtitles: data.subtitles || [],
        provider: 'Consumet - FlixHQ'
      };

    } catch (error) {
      console.error('❌ Consumet API error:', error);
      return {
        success: false,
        message: error.message,
        url: null,
        type: null
      };
    }
  }

  /**
   * Alternative method using VidSrc provider
   */
  async function fetchVidSrcStream(tmdbId, mediaType = 'movie', season = null, episode = null) {
    const base = getConsumetApiBase();
    
    try {
      let apiUrl;
      if (mediaType === 'tv' && season && episode) {
        apiUrl = `${base}/movies/vidsrc/watch?episodeId=${tmdbId}?s=${season}&e=${episode}&mediaId=${tmdbId}`;
      } else {
        apiUrl = `${base}/movies/vidsrc/watch?episodeId=${tmdbId}&mediaId=${tmdbId}`;
      }
      
      console.log('📡 Fetching VidSrc stream from:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`VidSrc API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !data.sources || data.sources.length === 0) {
        throw new Error('No VidSrc sources found');
      }

      return {
        success: true,
        url: data.sources[0].url,
        type: 'hls',
        sources: data.sources,
        subtitles: data.subtitles || [],
        provider: 'Consumet - VidSrc'
      };

    } catch (error) {
      console.error('❌ VidSrc API error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Main resolver - tries multiple providers
   */
  async function resolveConsumetStream(movie, season = null, episode = null) {
    const mediaType = movie.mediaType === 'tv' ? 'tv' : 'movie';
    const tmdbId = movie.id;

    console.log('🎬 Resolving Consumet stream for:', movie.title, {
      tmdbId,
      mediaType,
      season,
      episode
    });

    // Try FlixHQ first (primary provider)
    let result = await fetchConsumetStream(tmdbId, mediaType, season, episode);
    
    if (result.success) {
      console.log('✅ Stream resolved via FlixHQ:', result.url);
      return result;
    }

    // Fallback to VidSrc
    console.log('⚠️ FlixHQ failed, trying VidSrc...');
    result = await fetchVidSrcStream(tmdbId, mediaType, season, episode);
    
    if (result.success) {
      console.log('✅ Stream resolved via VidSrc:', result.url);
      return result;
    }

    // All providers failed
    console.error('❌ All Consumet providers failed');
    return {
      success: false,
      message: 'No streams available from Consumet providers',
      url: null,
      type: null
    };
  }

  /**
   * Search for media on Consumet
   */
  async function searchConsumet(query, page = 1) {
    const base = getConsumetApiBase();
    const searchUrl = `${base}/movies/flixhq/${encodeURIComponent(query)}?page=${page}`;
    
    try {
      console.log('🔍 Searching Consumet:', searchUrl);
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Search results:', data);
      
      return {
        success: true,
        results: data.results || [],
        hasNextPage: data.hasNextPage || false
      };

    } catch (error) {
      console.error('❌ Consumet search error:', error);
      return {
        success: false,
        message: error.message,
        results: []
      };
    }
  }

  /**
   * Get media info from Consumet
   */
  async function getConsumetInfo(mediaId) {
    const base = getConsumetApiBase();
    const infoUrl = `${base}/movies/flixhq/info?id=${encodeURIComponent(mediaId)}`;
    
    try {
      console.log('📡 Fetching media info:', infoUrl);
      const response = await fetch(infoUrl);
      
      if (!response.ok) {
        throw new Error(`Info fetch failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Media info:', data);
      
      return {
        success: true,
        data: data
      };

    } catch (error) {
      console.error('❌ Consumet info error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Expose functions globally
  window.ConsumetAPI = {
    resolveStream: resolveConsumetStream,
    search: searchConsumet,
    getInfo: getConsumetInfo,
    fetchFlixHQ: fetchConsumetStream,
    fetchVidSrc: fetchVidSrcStream
  };

  console.log('✅ Consumet API integration loaded');
})();
