/**
 * UpCloud Streaming Provider
 * Provides iframe URLs for movies and TV shows
 */

(function() {
  'use strict';

  const UPCLOUD_BASES = [
    'https://upcloud.pro',
    'https://upcloud.co',
    'https://upcloud.tv'
  ];

  /**
   * Get UpCloud embed URL for a movie or TV show
   */
  function getUpCloudUrl(tmdbId, mediaType = 'MOVIE', season = null, episode = null) {
    try {
      if (!tmdbId) {
        throw new Error('TMDB ID is required');
      }

      const base = UPCLOUD_BASES[0];
      let url;
      if (mediaType === 'TV' && season && episode) {
        // TV Series: /embed/tv/TMDB_ID?s=SEASON&e=EPISODE
        url = `${base}/embed/tv/${tmdbId}?s=${season}&e=${episode}`;
      } else {
        // Movie: /embed/movie/TMDB_ID
        url = `${base}/embed/movie/${tmdbId}`;
      }

      console.log('✓ UpCloud URL generated:', url);
      return url;
    } catch (error) {
      console.error('❌ UpCloud URL generation error:', error);
      return null;
    }
  }

  /**
   * Test if UpCloud is accessible
   */
  async function testUpCloudConnection() {
    try {
      console.log('🧪 Testing UpCloud connection...');
      const testUrl = `${UPCLOUD_BASE}/embed/movie/550`; // Fight Club
      const response = await fetch(testUrl, { method: 'HEAD', cache: 'no-cache' });
      const ok = response.ok || response.status === 403; // 403 is OK for iframe sources
      console.log(ok ? '✅ UpCloud is accessible' : '❌ UpCloud returned error');
      return ok;
    } catch (error) {
      console.error('❌ UpCloud connection test failed:', error.message);
      return false;
    }
  }

  // Export to global scope
  window.upcloud = {
    getUrl: getUpCloudUrl,
    testConnection: testUpCloudConnection,
    base: UPCLOUD_BASES[0],
    bases: UPCLOUD_BASES
  };

  console.log('✓ UpCloud module loaded');
})();
