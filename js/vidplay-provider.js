/**
 * VidPlay Streaming Provider
 * Provides iframe URLs for movies and TV shows
 * Used as fallback when 8StreamAPI doesn't have content
 */

(function() {
  'use strict';

  const VIDPLAY_BASE = 'https://vidplay.site';

  /**
   * Get VidPlay embed URL for a movie or TV show
   */
  function getVidPlayUrl(tmdbId, mediaType = 'MOVIE', season = null, episode = null) {
    try {
      if (!tmdbId) {
        throw new Error('TMDB ID is required');
      }

      let url;
      if (mediaType === 'TV' && season && episode) {
        // TV Series: /embed/tv/TMDB_ID?s=SEASON&e=EPISODE
        url = `${VIDPLAY_BASE}/embed/tv/${tmdbId}?s=${season}&e=${episode}`;
      } else {
        // Movie: /embed/movie/TMDB_ID
        url = `${VIDPLAY_BASE}/embed/movie/${tmdbId}`;
      }

      console.log('✓ VidPlay URL generated:', url);
      return url;
    } catch (error) {
      console.error('❌ VidPlay URL generation error:', error);
      return null;
    }
  }

  /**
   * Test if VidPlay is accessible
   */
  async function testVidPlayConnection() {
    try {
      console.log('🧪 Testing VidPlay connection...');
      const testUrl = `${VIDPLAY_BASE}/embed/movie/550`; // Fight Club
      const response = await fetch(testUrl, { method: 'HEAD', cache: 'no-cache' });
      const ok = response.ok || response.status === 403; // 403 is OK for iframe sources
      console.log(ok ? '✅ VidPlay is accessible' : '❌ VidPlay returned error');
      return ok;
    } catch (error) {
      console.error('❌ VidPlay connection test failed:', error.message);
      return false;
    }
  }

  // Export to global scope
  window.vidplay = {
    getUrl: getVidPlayUrl,
    testConnection: testVidPlayConnection,
    base: VIDPLAY_BASE
  };

  console.log('✓ VidPlay module loaded');
})();
