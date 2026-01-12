/**
 * VidCloud Streaming Provider
 * Provides iframe URLs for movies and TV shows
 */

(function() {
  'use strict';

  const VIDCLOUD_BASE = 'https://vidcloud.co';

  /**
   * Get VidCloud embed URL for a movie or TV show
   */
  function getVidCloudUrl(tmdbId, mediaType = 'MOVIE', season = null, episode = null) {
    try {
      if (!tmdbId) {
        throw new Error('TMDB ID is required');
      }

      let url;
      if (mediaType === 'TV' && season && episode) {
        // TV Series: /embed/tv/TMDB_ID?s=SEASON&e=EPISODE
        url = `${VIDCLOUD_BASE}/embed/tv/${tmdbId}?s=${season}&e=${episode}`;
      } else {
        // Movie: /embed/movie/TMDB_ID
        url = `${VIDCLOUD_BASE}/embed/movie/${tmdbId}`;
      }

      console.log('✓ VidCloud URL generated:', url);
      return url;
    } catch (error) {
      console.error('❌ VidCloud URL generation error:', error);
      return null;
    }
  }

  /**
   * Test if VidCloud is accessible
   */
  async function testVidCloudConnection() {
    try {
      console.log('🧪 Testing VidCloud connection...');
      const testUrl = `${VIDCLOUD_BASE}/embed/movie/550`; // Fight Club
      const response = await fetch(testUrl, { method: 'HEAD', cache: 'no-cache' });
      const ok = response.ok || response.status === 403; // 403 is OK for iframe sources
      console.log(ok ? '✅ VidCloud is accessible' : '❌ VidCloud returned error');
      return ok;
    } catch (error) {
      console.error('❌ VidCloud connection test failed:', error.message);
      return false;
    }
  }

  // Export to global scope
  window.vidcloud = {
    getUrl: getVidCloudUrl,
    testConnection: testVidCloudConnection,
    base: VIDCLOUD_BASE
  };

  console.log('✓ VidCloud module loaded');
})();
