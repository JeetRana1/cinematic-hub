/**
 * Provider Selection Override - Improves Title-Based Matching
 * This script enhances the server switcher to use title-based filtering
 */

(function() {
  'use strict';

  // Store original getEnhancedStream
  const originalGetEnhancedStream = window.getEnhancedStream;

  // Create enhanced version with better title handling and support for preferred provider
  // Signature: (tmdbId, mediaType='movie', season=null, episode=null, preferredProvider=null, title=null)
  window.getEnhancedStream = async function(tmdbId, mediaType = 'movie', season = null, episode = null, preferredProvider = null, title = null) {
    console.log(`🎯 Enhanced Stream with title: "${title}" (TMDB: ${tmdbId}) - preferredProvider: ${preferredProvider}`);

    if (!window.StreamProviders) {
      console.error('❌ StreamProviders not loaded');
      // Try fallback to original implementation if present
      if (typeof originalGetEnhancedStream === 'function') {
        return await originalGetEnhancedStream(tmdbId, mediaType, season, episode, preferredProvider, title);
      }
      return { success: false, error: 'Providers not available' };
    }

    // Priority order for providers (now prioritizing addons)
    const providerOrder = [
      'nuviostreams', // Nuvio Streams | Elfhosted - High-quality streaming links
      'videasy',      // Primary
      'nontongo',     // NontonGo - TMDB embed API (Player 2)
      'rivestream',   // Rive - non-embed HLS preferred for Player 2
      'mxplayer',     // Good for Indian content
      'rabbitstream', // Good for Hindi
      'vidsrcxyz',    // Fallback
      'vidsrcpro'     // Last resort
    ];

    // Build the actual order to try. If a preferredProvider is provided and is available, try it first.
    let tryOrder = providerOrder.filter(p => p !== preferredProvider);
    if (preferredProvider && window.StreamProviders[preferredProvider]) {
      tryOrder.unshift(preferredProvider);
    }

    for (const providerKey of tryOrder) {
      const provider = window.StreamProviders[providerKey];
      if (!provider) continue;

      try {
        console.log(`⏳ Trying ${provider.name}...`);

        // Call provider and let provider resolve IMDb if needed; title provided for better matching
        const result = await provider.getStream(tmdbId, mediaType, season, episode, null, title);

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

    // Fallback: try original implementation if available
    if (typeof originalGetEnhancedStream === 'function') {
      try {
        const fallback = await originalGetEnhancedStream(tmdbId, mediaType, season, episode, preferredProvider, title);
        if (fallback && fallback.success) return fallback;
      } catch (e) {
        console.warn('⚠️ originalGetEnhancedStream fallback failed:', e.message || e);
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

    // Test Stream button handler - opens secondary modal and tries Stream API
    (function(){
      let secondaryHls = null;
      document.addEventListener('DOMContentLoaded', () => {
        const testBtn = document.getElementById('testStreamBtn');
        const modal = document.getElementById('secondaryPlayerModal');
        const holder = document.getElementById('secondaryPlayerHolder');
        const closeBtn = document.getElementById('secondaryClose');

        async function openSecondaryPlayerWithSrc(src) {
          if (!holder) return;
          holder.innerHTML = '';

          // m3u8 & Hls.js
          if (/\.m3u8(\?.*)?$/.test(src) && window.Hls) {
            const video = document.createElement('video');
            video.controls = true;
            video.autoplay = true;
            holder.appendChild(video);

            if (secondaryHls) { secondaryHls.destroy(); secondaryHls = null; }
            secondaryHls = new window.Hls();
            secondaryHls.loadSource(src);
            secondaryHls.attachMedia(video);
          } else if (/^https?:\/\//.test(src) && (src.includes('/embed/') || !/\.m3u8/.test(src))) {
            // Use iframe for embed pages
            const iframe = document.createElement('iframe');
            iframe.src = src;
            iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
            iframe.style.width = '100%';
            iframe.style.height = '70vh';
            iframe.style.border = 'none';
            holder.appendChild(iframe);
          } else {
            // fallback to native video element
            const video = document.createElement('video');
            video.controls = true;
            video.autoplay = true;
            video.src = src;
            holder.appendChild(video);
          }

          if (modal) modal.style.display = 'flex';
        }

        if (testBtn) {
          testBtn.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopPropagation();
            const urlParams = new URLSearchParams(window.location.search);
            const imdbId = urlParams.get('imdbId');
            const tmdbId = urlParams.get('movieId') || urlParams.get('id');
            const title = urlParams.get('title') || urlParams.get('contentTitle') || 'Content';

            try {
              // Update button state
              const feat = testBtn.querySelector('.server-features');
              if (feat) feat.textContent = 'Checking...';

              let src = null;

              if (imdbId && typeof window.testStreamResolve === 'function') {
                src = await window.testStreamResolve(imdbId);
              } else if (tmdbId && typeof window.getEnhancedStream === 'function') {
                const seasonParam = urlParams.get('season');
                const episodeParam = urlParams.get('episode');
                const isTV = seasonParam && episodeParam;
                const mediaType = isTV ? 'tv' : 'movie';
                const seasonNum = isTV ? parseInt(seasonParam, 10) : null;
                const episodeNum = isTV ? parseInt(episodeParam, 10) : null;
                const res = await window.getEnhancedStream(tmdbId, mediaType, seasonNum, episodeNum, null, title);
                if (res && res.success && (res.url || res.src)) src = res.url || res.src;
                else throw new Error(res?.error || 'No stream found');
              } else {
                throw new Error('No imdbId available and enhanced provider unavailable');
              }

              if (!src) throw new Error('No stream URL returned');

              await openSecondaryPlayerWithSrc(src);
            } catch (err) {
              console.error('Test stream failed', err);
              alert('Test Stream failed: ' + (err.message || err));
            } finally {
              const feat = testBtn.querySelector('.server-features');
              if (feat) feat.textContent = 'Quick check using configured Stream API';
            }
          });
        }

        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            const modal = document.getElementById('secondaryPlayerModal');
            const holder = document.getElementById('secondaryPlayerHolder');
            if (modal) modal.style.display = 'none';
            if (holder) holder.innerHTML = '';
            if (secondaryHls) { secondaryHls.destroy(); secondaryHls = null; }
          });
        }
      });
    })();

  console.log('✅ Provider Selection Override loaded');
})()});
