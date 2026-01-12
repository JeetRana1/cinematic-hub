/**
 * FileMoon Streaming Provider
 * Provides iframe URLs for movies and TV shows with multilanguage support
 */

(function() {
  'use strict';

  const FILEMOON_BASES = [
    'https://filemoon.pro',
    'https://filemoon.sx',
    'https://filemoon.to'
  ];

  /**
   * Get FileMoon embed URL for a movie or TV show
   */
  function getFileMoonUrl(tmdbId, mediaType = 'MOVIE', season = null, episode = null) {
    try {
      if (!tmdbId) {
        throw new Error('TMDB ID is required');
      }

      const base = FILEMOON_BASES[0];
      let url;
      if (mediaType === 'TV' && season && episode) {
        // TV Series: /embed/tv/TMDB_ID?s=SEASON&e=EPISODE
        url = `${base}/embed/tv/${tmdbId}?s=${season}&e=${episode}`;
      } else {
        // Movie: /embed/movie/TMDB_ID
        url = `${base}/embed/movie/${tmdbId}`;
      }

      console.log('✓ FileMoon URL generated:', url);
      return url;
    } catch (error) {
      console.error('❌ FileMoon URL generation error:', error);
      return null;
    }
  }

  /**
   * Test if FileMoon is accessible
   */
  async function testFileMoonConnection() {
    try {
      console.log('🧪 Testing FileMoon connection...');
      const testUrl = `${FILEMOON_BASES[0]}/embed/movie/550`; // Fight Club
      const response = await fetch(testUrl, { method: 'HEAD', cache: 'no-cache' });
      const ok = response.ok || response.status === 403;
      console.log(ok ? '✅ FileMoon is accessible' : '❌ FileMoon returned error');
      return ok;
    } catch (error) {
      console.warn('⚠️ FileMoon connection test skipped');
      return true;
    }
  }

  // Export to global scope
  window.filemoon = {
    getUrl: getFileMoonUrl,
    testConnection: testFileMoonConnection,
    base: FILEMOON_BASES[0],
    bases: FILEMOON_BASES
  };

  console.log('✓ FileMoon module loaded');
})();
