/**
 * Player Integration Helper
 * Add this to your player.html to integrate the new streaming system
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlayerIntegration);
  } else {
    initPlayerIntegration();
  }

  function initPlayerIntegration() {
    console.log('🎬 Initializing enhanced player integration...');

    // Get TMDB ID from URL or page data
    const tmdbId = getTmdbIdFromPage();
    const mediaType = getMediaTypeFromPage();

    if (tmdbId) {
      console.log(`📺 Found TMDB ID: ${tmdbId} (${mediaType})`);
      
      // Initialize player
      const player = window.initStreamPlayer('video');
      console.log('✅ Stream player initialized');

      // Add play button functionality
      setupPlayButtons(tmdbId, mediaType);
      
      // Try auto-play if data available
      autoPlayIfReady(tmdbId, mediaType);
    } else {
      console.log('ℹ️ No TMDB ID found in page data');
    }
  }

  /**
   * Extract TMDB ID from page
   * Checks multiple sources: URL, data attributes, localStorage
   */
  function getTmdbIdFromPage() {
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tmdbId = urlParams.get('tmdbId') || urlParams.get('id');
    if (tmdbId) return tmdbId;

    // Check data attributes
    const pageElement = document.querySelector('[data-tmdb-id]');
    if (pageElement) return pageElement.dataset.tmdbId;

    // Check window object (set by other scripts)
    if (window.currentTmdbId) return window.currentTmdbId;

    // Check localStorage
    const saved = localStorage.getItem('currentTmdbId');
    if (saved) return saved;

    return null;
  }

  /**
   * Get media type from page
   */
  function getMediaTypeFromPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || urlParams.get('mediaType');
    if (type) return type;

    const pageElement = document.querySelector('[data-media-type]');
    if (pageElement) return pageElement.dataset.mediaType;

    if (window.currentMediaType) return window.currentMediaType;

    return 'movie'; // Default
  }

  /**
   * Setup play button functionality
   */
  function setupPlayButtons(tmdbId, mediaType) {
    // Find all play buttons
    const playButtons = document.querySelectorAll('[data-action="play"], .play-btn, .stream-button');
    
    playButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Get season/episode if TV show
        const season = btn.dataset.season || null;
        const episode = btn.dataset.episode || null;

        await playMovie(tmdbId, mediaType, season, episode, btn);
      });
    });
  }

  /**
   * Auto-play if all data available
   */
  async function autoPlayIfReady(tmdbId, mediaType) {
    // Only auto-play if explicitly enabled
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoplay') === 'true') {
      console.log('🎬 Auto-playing stream...');
      await playMovie(tmdbId, mediaType);
    }
  }

  /**
   * Main playback function
   */
  async function playMovie(tmdbId, mediaType = 'movie', season = null, episode = null, triggerBtn = null) {
    try {
      if (triggerBtn) {
        triggerBtn.disabled = true;
        triggerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
      }

      console.log('⏳ Fetching stream...');

      // Get stream
      const stream = await window.getEnhancedStream(tmdbId, mediaType, season, episode);

      if (!stream.success) {
        throw new Error(stream.error || 'No stream found');
      }

      console.log(`✅ Stream found from ${stream.provider}`);

      // Load in player
      const player = window.streamPlayer || window.initStreamPlayer('video');
      const loaded = await player.loadStream(stream);

      if (!loaded) {
        throw new Error('Failed to load stream');
      }

      console.log('🎬 Now playing!');

      // Update button
      if (triggerBtn) {
        triggerBtn.innerHTML = '<i class="fas fa-play"></i> Playing...';
        triggerBtn.classList.add('playing');
      }

      // Save to continue watching
      saveContinueWatching(tmdbId, mediaType, season, episode);

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('streamLoaded', {
        detail: { stream, tmdbId, mediaType, season, episode }
      }));

    } catch (error) {
      console.error('❌ Playback error:', error);
      
      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = '<i class="fas fa-play"></i> Play';
      }

      // Show user-friendly error
      showPlaybackError(error.message);

      // Dispatch error event
      window.dispatchEvent(new CustomEvent('streamError', {
        detail: { error: error.message, tmdbId, mediaType }
      }));
    }
  }

  /**
   * Save to continue watching
   */
  function saveContinueWatching(tmdbId, mediaType, season, episode) {
    try {
      if (window.continueWatchingManager) {
        window.continueWatchingManager.addOrUpdateItem({
          tmdbId,
          mediaType,
          season,
          episode,
          title: document.title || 'Unknown',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn('Could not save to continue watching:', error);
    }
  }

  /**
   * Show playback error to user
   */
  function showPlaybackError(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease;
    `;

    alertDiv.innerHTML = `
      <strong>❌ Playback Error</strong><br>
      ${message}<br>
      <small style="margin-top: 8px; display: block;">Try another title or refresh the page</small>
    `;

    document.body.appendChild(alertDiv);

    // Remove after 5 seconds
    setTimeout(() => {
      alertDiv.style.opacity = '0';
      alertDiv.style.transition = 'opacity 0.3s ease';
      setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
  }

  // Export for external use
  window.playMovie = playMovie;
  window.initPlayerIntegration = initPlayerIntegration;

  console.log('✅ Player integration initialized');
})();
