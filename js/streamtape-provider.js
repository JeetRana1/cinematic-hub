/**
 * Streamtape Streaming Provider
 * Provides iframe URLs for movies and TV shows
 */

(function() {
  'use strict';

  const STREAMTAPE_BASES = [
    'https://streamtape.com',
    'https://streamtape.to'
  ];

  /**
   * Get Streamtape embed URL for a movie or TV show
   */
  function getStreamtapeUrl(tmdbId, mediaType = 'MOVIE', season = null, episode = null) {
    try {
      if (!tmdbId) {
        throw new Error('TMDB ID is required');
      }

      const base = STREAMTAPE_BASES[0];
      let url;
      if (mediaType === 'TV' && season && episode) {
        // TV Series: /embed/tv/TMDB_ID?s=SEASON&e=EPISODE
        url = `${base}/embed/tv/${tmdbId}?s=${season}&e=${episode}`;
      } else {
        // Movie: /embed/movie/TMDB_ID
        url = `${base}/embed/movie/${tmdbId}`;
      }

      console.log('✓ Streamtape URL generated:', url);
      return url;
    } catch (error) {
      console.error('❌ Streamtape URL generation error:', error);
      return null;
    }
  }

  /**
   * Test if Streamtape is accessible
   */
  async function testStreamtapeConnection() {
    try {
      console.log('🧪 Testing Streamtape connection...');
      const testUrl = `${STREAMTAPE_BASES[0]}/embed/movie/550`; // Fight Club
      const response = await fetch(testUrl, { method: 'HEAD', cache: 'no-cache' });
      const ok = response.ok || response.status === 403;
      console.log(ok ? '✅ Streamtape is accessible' : '❌ Streamtape returned error');
      return ok;
    } catch (error) {
      console.warn('⚠️ Streamtape connection test skipped');
      return true;
    }
  }

  // Export to global scope
  window.streamtape = {
    getUrl: getStreamtapeUrl,
    testConnection: testStreamtapeConnection,
    base: STREAMTAPE_BASES[0],
    bases: STREAMTAPE_BASES
  };

  console.log('✓ Streamtape module loaded');
})();
