/**
 * Provider Selection Override - Improves Title-Based Matching
 * This script enhances the server switcher to use title-based filtering
 */

(function() {
  'use strict';

  // Store original getEnhancedStream
  const originalGetEnhancedStream = window.getEnhancedStream;

  // Create enhanced version with better title handling
  window.getEnhancedStream = async function(tmdbId, mediaType = 'movie', season = null, episode = null, imdbId = null, title = null) {
    console.log(`🎯 Enhanced Stream with title: "${title}" (TMDB: ${tmdbId})`);
    
    if (!window.StreamProviders) {
      console.error('❌ StreamProviders not loaded');
      return { success: false, error: 'Providers not available' };
    }

    // Priority order for providers
    const providerOrder = [
      'videasy',      // Primary
      'nontongo',     // NontonGo - TMDB embed API (Player 2)
      'rivestream',   // Rive - non-embed HLS preferred for Player 2
      'mxplayer',     // Good for Indian content
      'rabbitstream', // Good for Hindi
      'vidsrcxyz',    // Fallback
      'vidsrcpro'     // Last resort
    ];

    for (const providerKey of providerOrder) {
      const provider = window.StreamProviders[providerKey];
      if (!provider) continue;

      try {
        console.log(`⏳ Trying ${provider.name}...`);
        
        // Call provider with title for better matching
        const result = await provider.getStream(tmdbId, mediaType, season, episode, imdbId, title);
        
        if (result && result.success) {
          console.log(`✅ ${provider.name} - Success!`);
          return result;
        } else {
          console.warn(`⚠️ ${provider.name} - Failed`);
        }
      } catch (error) {
        console.error(`❌ ${provider.name} error:`, error.message);
      }
    }

    return {
      success: false,
      error: 'No streaming source found from all providers'
    };
  };

  // Override the server switcher click handler
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      const serverOptions = document.querySelectorAll('.server-option');
      serverOptions.forEach((option) => {
        // Remove old click handlers
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);
        
        // Add improved handler
        newOption.addEventListener('click', async (e) => {
          e.stopPropagation();
          e.preventDefault();

          const serverMenu = document.getElementById('serverMenu');
          const currentServerDisplay = document.getElementById('currentServer');
          const nameEl = newOption.querySelector('.server-name');
          const serverName = nameEl ? nameEl.textContent : 'Provider';
          const providerKey = newOption.getAttribute('data-provider');

          // Show loading
          if (currentServerDisplay) {
            currentServerDisplay.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
          }
          if (serverMenu) serverMenu.style.display = 'none';

          try {
            // Get URL params
            const urlParams = new URLSearchParams(window.location.search);
            const tmdbId = urlParams.get('id') || urlParams.get('movieId');
            const mediaType = urlParams.get('mediaType') || 'movie';
            const season = urlParams.get('season');
            const episode = urlParams.get('episode');
            const movieTitle = urlParams.get('title') || urlParams.get('contentTitle') || 'Content';

            console.log(`📺 Loading ${serverName} for: ${movieTitle} (provider: ${providerKey})`);

            // Use enhanced stream API with title and optional preferred provider
            if (window.getEnhancedStream) {
              const result = await window.getEnhancedStream(tmdbId, mediaType, season, episode, providerKey, movieTitle);

              if (result && result.success) {
                console.log(`✅ Got stream from ${result.provider}`);

                // If provider is Torrentio and returned a magnet, open Player 2 with magnet param
                if (providerKey === 'torrentio' && result.type === 'magnet') {
                  const newUrl = new URL(window.location.origin + '/player-2.nontongo.html');
                  newUrl.searchParams.set('id', tmdbId);
                  newUrl.searchParams.set('magnet', result.url);
                  newUrl.searchParams.set('provider', 'torrentio');
                  window.location.href = newUrl.toString();
                  return;
                }

                // Update URL and reload on same page for normal providers
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('provider', serverName.toLowerCase().replace(/\s+/g, '-'));
                newUrl.searchParams.set('src', result.url);
                newUrl.searchParams.set('type', result.type || 'iframe');
                window.location.href = newUrl.toString();
              } else {
                throw new Error(result?.error || 'Provider returned no stream');
              }
            } else {
              throw new Error('Enhanced Stream API not available');
            }
          } catch (error) {
            console.error('Server switch failed:', error);
            if (currentServerDisplay) {
              currentServerDisplay.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
              setTimeout(() => {
                currentServerDisplay.textContent = 'Server Error';
              }, 2000);
            }
          }
        });
      });
    }, 500); // Wait for DOM to be ready
  });

  console.log('✅ Provider Selection Override loaded');
})();
