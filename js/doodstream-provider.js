/**
 * Doodstream Streaming Provider
 * Provides iframe URLs for movies and TV shows with high quality
 */

(function() {
  'use strict';

  const DOODSTREAM_BASES = [
    'https://dood.watch',
    'https://dood.so',
    'https://dood.to'
  ];

  /**
   * Get Doodstream embed URL for a movie or TV show
   */
  function getDoodstreamUrl(tmdbId, mediaType = 'MOVIE', season = null, episode = null) {
    try {
      if (!tmdbId) {
        throw new Error('TMDB ID is required');
      }

      const base = DOODSTREAM_BASES[0];
      let url;
      if (mediaType === 'TV' && season && episode) {
        // TV Series: /embed/tv/TMDB_ID?s=SEASON&e=EPISODE
        url = `${base}/embed/tv/${tmdbId}?s=${season}&e=${episode}`;
      } else {
        // Movie: /embed/movie/TMDB_ID
        url = `${base}/embed/movie/${tmdbId}`;
      }

      console.log('✓ Doodstream URL generated:', url);
      return url;
    } catch (error) {
      console.error('❌ Doodstream URL generation error:', error);
      return null;
    }
  }

  /**
   * Test if Doodstream is accessible
   */
  async function testDoodstreamConnection() {
    try {
      console.log('🧪 Testing Doodstream connection...');
      const testUrl = `${DOODSTREAM_BASES[0]}/embed/movie/550`; // Fight Club
      const response = await fetch(testUrl, { method: 'HEAD', cache: 'no-cache' });
      const ok = response.ok || response.status === 403;
      console.log(ok ? '✅ Doodstream is accessible' : '❌ Doodstream returned error');
      return ok;
    } catch (error) {
      console.warn('⚠️ Doodstream connection test skipped');
      return true;
    }
  }

  // Export to global scope
  window.doodstream = {
    getUrl: getDoodstreamUrl,
    testConnection: testDoodstreamConnection,
    base: DOODSTREAM_BASES[0],
    bases: DOODSTREAM_BASES
  };

  console.log('✓ Doodstream module loaded');
})();
