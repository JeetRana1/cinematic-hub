/**
 * Streaming API Compatibility Layer
 * Bridges old consumet-api.js calls to new enhanced-stream-api.js
 * Allows seamless transition without changing existing code
 */

(function() {
  'use strict';

  console.log('🔄 Loading Streaming Compatibility Layer...');

  // Override ConsumetAPI to use enhanced API
  window.ConsumetAPI = {
    resolveStream: async function(movie) {
      try {
        console.log('🎬 ConsumetAPI.resolveStream called with:', movie?.title || movie?.name);

        // Get TMDB ID from movie object
        let tmdbId = movie?.id || movie?.tmdbId || null;

        if (!tmdbId) {
          console.warn('⚠️ No TMDB ID found in movie object');
          return { success: false, message: 'No TMDB ID' };
        }

        // Determine media type
        const mediaType = movie?.mediaType === 'tv' ? 'tv' : 'movie';
        const season = movie?.season || null;
        const episode = movie?.episode || null;

        console.log(`📡 Using enhanced API for TMDB ID: ${tmdbId} (${mediaType})`);

        // Use enhanced API if available
        if (window.getEnhancedStream) {
          const stream = await window.getEnhancedStream(tmdbId, mediaType, season, episode);

          if (stream.success) {
            console.log(`✅ Stream resolved via enhanced API: ${stream.provider}`);
            return {
              success: true,
              url: stream.url,
              type: stream.type,
              provider: stream.provider,
              quality: stream.quality,
              subtitles: stream.subtitles,
              audioTracks: stream.audioTracks,
              sources: stream.sources
            };
          } else {
            console.warn('⚠️ Enhanced API returned no stream');
            return { success: false, message: stream.error || 'No stream found' };
          }
        } else {
          console.error('❌ Enhanced Stream API not loaded');
          return { success: false, message: 'Enhanced Stream API not available' };
        }
      } catch (error) {
        console.error('❌ ConsumetAPI error:', error);
        return { success: false, message: error.message };
      }
    }
  };

  // Also override stream-api.js resolveStreamUrlForMovie if it exists
  const originalResolveStream = window.resolveStreamUrlForMovie;
  
  window.resolveStreamUrlForMovie = async function(movie, preferredLangs) {
    try {
      console.log('🎬 resolveStreamUrlForMovie called with:', movie?.title || movie?.name);

      // Use enhanced API
      if (window.getEnhancedStream) {
        const tmdbId = movie?.id || movie?.tmdbId;
        const mediaType = movie?.mediaType === 'tv' ? 'tv' : 'movie';
        const season = movie?.season || null;
        const episode = movie?.episode || null;

        const stream = await window.getEnhancedStream(tmdbId, mediaType, season, episode);

        if (stream.success) {
          console.log(`✅ Stream resolved: ${stream.provider}`);
          return {
            success: true,
            src: stream.url,
            type: stream.type,
            provider: stream.provider,
            quality: stream.quality,
            sources: stream.sources,
            subtitles: stream.subtitles
          };
        }
      }

      // Fallback to original if enhanced API fails
      if (originalResolveStream) {
        return await originalResolveStream(movie, preferredLangs);
      }

      return { success: false, message: 'No stream provider available' };
    } catch (error) {
      console.error('❌ resolveStreamUrlForMovie error:', error);
      return { success: false, message: error.message };
    }
  };

  // Create direct player functions that existing buttons might use
  window.playFromButton = async function(tmdbId, mediaType = 'movie', season = null, episode = null) {
    try {
      console.log(`🎬 Playing: TMDB ${tmdbId}, Type: ${mediaType}`);

      if (!window.playStream) {
        console.error('❌ playStream function not available');
        return false;
      }

      await window.playStream(tmdbId, mediaType, season, episode);
      return true;
    } catch (error) {
      console.error('❌ Error playing stream:', error);
      alert('Failed to load stream: ' + error.message);
      return false;
    }
  };

  console.log('✅ Streaming Compatibility Layer loaded');
  console.log('   - ConsumetAPI overridden');
  console.log('   - resolveStreamUrlForMovie overridden');
  console.log('   - playFromButton available');
})();
