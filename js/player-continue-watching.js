/** 
 * Enhanced Player Continue Watching Integration
 * Properly handles resume functionality with accurate currentTime setting
 */
(function () {
  'use strict';
  // --- Custom Pause Overlay Logic ---
  document.addEventListener('DOMContentLoaded', function () {
    const video = document.getElementById('video');
    const overlay = document.getElementById('playPauseOverlay');
    let overlayTimeout;
    if (video && overlay) {
      // Hide overlay by default
      overlay.style.display = 'none';

      // Show overlay with correct icon
      function showOverlay(icon) {
        const iconElem = overlay.querySelector('.play-pause-icon i');
        if (iconElem) {
          iconElem.className = icon === 'play' ? 'fas fa-play' : 'fas fa-pause';
        }
        overlay.style.display = 'flex';
        clearTimeout(overlayTimeout);
        overlayTimeout = setTimeout(() => {
          overlay.style.display = 'none';
        }, 16000);
      }

      // On player click, show pause icon (do not pause)

      // Prevent default pause/play on click/tap
      function handlePlayerClick(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!video.paused) {
          showOverlay('pause');
        } else {
          showOverlay('play');
        }
        return false;
      }
      // Remove all other click/touchend listeners on video
      // Do not override video click/touchend here; player.html will handle overlay logic

      // Do not set overlay click handler here; player.html will handle play/pause overlay click

      // Also update overlay icon on play/pause events
      video.addEventListener('pause', function () {
        showOverlay('play');
      });
      video.addEventListener('play', function () {
        showOverlay('pause');
      });
    }
  });

  // --- Skip Notification Animation ---

  function showSkipNotification() {
    const skipNotification = document.getElementById('skipNotification');
    if (!skipNotification) return;
    skipNotification.classList.add('active');
    clearTimeout(skipNotification._hideTimeout);
    skipNotification._hideTimeout = setTimeout(() => {
      skipNotification.classList.remove('active');
    }, 400); // Show briefly, no animation
  }

  // Attach to skip buttons
  document.addEventListener('DOMContentLoaded', () => {
    const skipForwardBtn = document.getElementById('skipForwardBtn');
    const skipBackwardBtn = document.getElementById('skipBackwardBtn');
    if (skipForwardBtn) {
      skipForwardBtn.addEventListener('click', showSkipNotification);
    }
    if (skipBackwardBtn) {
      skipBackwardBtn.addEventListener('click', showSkipNotification);
    }
  });

  // Module-level state to be shared between functions
  let resumePromptShown = false;

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePlayerContinueWatching);
  } else {
    initializePlayerContinueWatching();
  }


  function initializePlayerContinueWatching() {
    const urlParams = new URLSearchParams(window.location.search);
    const video = document.getElementById('video') || document.querySelector('video');
    if (!video) {
      console.warn('No video element found for continue watching tracking');
      return;
    }

    // Wait for video src to be set
    function setupWhenSrcReady() {
      let videoSrc = '';
      if (video.src && video.src.length > 0) {
        videoSrc = video.src;
      } else {
        const sourceTag = video.querySelector('source');
        if (sourceTag && sourceTag.src && sourceTag.src.length > 0) {
          videoSrc = sourceTag.src;
        }
      }
      if (!videoSrc) {
        // Try again after a short delay
        setTimeout(setupWhenSrcReady, 100);
        return;
      }

      // IMPORTANT: Generate movieId the SAME way as player.html does
      // This ensures resume check finds the saved progress
      let movieId = urlParams.get('movieId');
      if (!movieId) {
        // Create a consistent ID from the title and year (matching player.html exactly)
        const title = urlParams.get('title') || 'unknown';
        const year = urlParams.get('year') || '';
        movieId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${year}`;
        console.log('[Resume] Generated movieId from title+year:', movieId);
      }
      const movieData = {
        movieId: movieId,
        title: urlParams.get('title') || document.title || 'Unknown Movie',
        thumbnail: urlParams.get('poster') || extractThumbnailFromPage()
      };

      if (window.ContinueWatchingManager) {
        initializeEnhancedResumeHandling(video, movieData, urlParams);
      }
    }
    setupWhenSrcReady();
  }

  async function waitForContinueWatchingUI() {
    // Only wait for ContinueWatchingUI if #moviesContainer exists (i.e., homepage)
    if (!document.querySelector('#moviesContainer')) {
      // Not the homepage, skip waiting
      return true;
    }
    const maxWaitTime = 5000; // 5 seconds max
    const startTime = Date.now();
    while (!window.continueWatchingUIReady && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!window.continueWatchingUIReady) {
      console.warn('Timed out waiting for ContinueWatchingUI to be ready');
      return false;
    }
    return true;
  }

  async function initializeEnhancedResumeHandling(video, movieData, urlParams) {
    let hasSetInitialTime = false;
    let pendingResumeTime = null;
    resumePromptShown = false;
    let metadataLoaded = false;
    let canPlayFired = false;

    // Wait for ContinueWatchingUI to be ready
    const uiReady = await waitForContinueWatchingUI();
    if (!uiReady) {
      console.warn('Proceeding without ContinueWatchingUI');
    }

    // Enhanced error handling for missing movieData
    if (!movieData) {
      console.error('Movie data is required for resume functionality');
      movieData = {
        movieId: generateMovieIdFromUrl(),
        title: document.title || 'Unknown Movie',
        thumbnail: extractThumbnailFromPage()
      };
    }

    // Ensure movieId is always available
    if (!movieData.movieId) {
      movieData.movieId = generateMovieIdFromUrl();
    }

    // Detect if this is a page reload/refresh
    const pageReloadKey = `player_page_loaded_${movieData.movieId}`;
    const isPageReload = sessionStorage.getItem(pageReloadKey) === 'true';
    sessionStorage.setItem(pageReloadKey, 'true');

    // Clear the flag when user navigates away
    window.addEventListener('beforeunload', () => {
      sessionStorage.removeItem(pageReloadKey);
    });

    console.log('[Resume] Page reload detected:', isPageReload);

    // Wait for Firebase to be initialized before checking progress
    const waitForFirebase = () => {
      return new Promise((resolve) => {
        if (window.FirebaseSync && window.FirebaseSync.initialized) {
          console.log('[Resume] ✅ Firebase already initialized');
          resolve();
        } else {
          console.log('[Resume] ⏳ Waiting for Firebase to initialize...');
          let attempts = 0;
          const checkInterval = setInterval(() => {
            attempts++;
            if (window.FirebaseSync && window.FirebaseSync.initialized) {
              console.log('[Resume] ✅ Firebase initialized after', attempts, 'attempts');
              clearInterval(checkInterval);
              resolve();
            } else if (attempts > 30) {
              console.warn('[Resume] ⚠️ Firebase initialization timeout after 3 seconds');
              clearInterval(checkInterval);
              resolve(); // Continue anyway
            }
          }, 100);
        }
      });
    };

    // Wait for Firebase cache to be populated with data
    const waitForCacheData = () => {
      return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 30; // 3 seconds max
        
        const checkCache = () => {
          attempts++;
          
          // Check if cache has continue watching data
          const cache = window.FirebaseSync?.cache?.['continueWatching'];
          const hasData = cache && Object.keys(cache).length > 0;
          
          if (hasData) {
            console.log('[Resume] ✅ Cache populated with', Object.keys(cache).length, 'items after', attempts, 'attempts');
            resolve(true);
          } else if (attempts >= maxAttempts) {
            console.log('[Resume] ⚠️ Cache still empty after', attempts, 'attempts - continuing anyway');
            resolve(false);
          } else {
            setTimeout(checkCache, 100);
          }
        };
        
        checkCache();
      });
    };

    // Check for existing progress with retry mechanism
    const getSavedProgress = async () => {
      try {
        // Wait for Firebase first
        await waitForFirebase();
        
        // Wait for cache to be populated
        await waitForCacheData();
        
        const progress = window.ContinueWatchingManager?.getMovieProgress?.(movieData.movieId) || null;
        console.log('[Resume] getMovieProgress returned:', progress);
        
        return progress;
      } catch (e) {
        console.warn('[Resume] Error getting saved progress:', e);
        return null;
      }
    };

    // Check for URL resume parameter with validation
    const getUrlResumeTime = () => {
      try {
        const timeParam = urlParams.get('t') || urlParams.get('time') || urlParams.get('resume') || '';
        const time = parseFloat(timeParam);
        return isFinite(time) && time > 0 ? time : null;
      } catch (e) {
        console.warn('[Resume] Error parsing URL resume time', e);
        return null;
      }
    };

    // Make the resume check async
    (async () => {
      console.log('[Resume] ========== STARTING RESUME CHECK ==========');
      console.log('[Resume] MovieID:', movieData.movieId);
      console.log('[Resume] Movie Title:', movieData.title);
      console.log('[Resume] URL Params:', window.location.search);

      const savedProgress = await getSavedProgress();
      console.log('[Resume] ========== SAVED PROGRESS RESULT ==========');
      console.log('[Resume] Saved progress:', savedProgress);
      console.log('[Resume] Type:', typeof savedProgress);
      console.log('[Resume] Is null?:', savedProgress === null);
      console.log('[Resume] Is undefined?:', savedProgress === undefined);

    if (savedProgress) {
      console.log('[Resume] ✅ Found saved progress!');
      console.log('[Resume]   - Current time:', savedProgress.currentTime);
      console.log('[Resume]   - Duration:', savedProgress.duration);
      console.log('[Resume]   - Progress:', Math.round((savedProgress.currentTime / savedProgress.duration) * 100) + '%');
    } else {
      console.log('[Resume] ❌ No saved progress found');
      console.log('[Resume] Checking all saved movies...');
      try {
        const allProgress = window.ContinueWatchingManager?.getAllProgress?.();
        if (allProgress) {
          const movieIds = Object.keys(allProgress);
          console.log('[Resume] Total saved movies:', movieIds.length);
          console.log('[Resume] Saved movie IDs:', movieIds);
          console.log('[Resume] Looking for ID:', movieData.movieId);
        }
      } catch (e) {
        console.error('[Resume] Error checking all progress:', e);
      }
    }

    const urlResumeSeconds = getUrlResumeTime();

    // Enhanced poster/thumbnail handling
    if (!movieData.thumbnail) {
      movieData.thumbnail =
        urlParams.get('poster') ||
        urlParams.get('thumbnail') ||
        extractThumbnailFromPage();
    }

    // If still no thumbnail, try to get it from the movie database
    if (!movieData.thumbnail && movieData.title) {
      try {
        const normalizedTitle = movieData.title.toLowerCase().trim();
        if (window.movieDatabase?.[normalizedTitle]?.poster) {
          movieData.thumbnail = window.movieDatabase[normalizedTitle].poster;
        }
      } catch (e) {
        console.warn('Error accessing movie database', e);
      }
    }

    // Enhanced resume time calculation with validation
    const getValidResumeTime = () => {
      // Priority: URL parameter > saved progress > 0
      if (urlResumeSeconds) {
        console.log('[Resume] Using URL resume time:', urlResumeSeconds);
        return urlResumeSeconds;
      }

      if (savedProgress?.currentTime > 0) {
        console.log('[Resume] Using saved progress time:', savedProgress.currentTime);
        return savedProgress.currentTime;
      }

      console.log('[Resume] No resume time found');
      return 0;
    };

    const resumeTime = getValidResumeTime();

    // ALWAYS show resume prompt if there's valid resume time
    const shouldShowResumePrompt = resumeTime > 5; // More than 5 seconds
    
    console.log('[Resume] ========== RESUME DECISION ==========');
    console.log('[Resume] Resume time:', resumeTime);
    console.log('[Resume] Should show prompt:', shouldShowResumePrompt);
    console.log('[Resume] URL resume time:', urlResumeSeconds);
    console.log('[Resume] Saved progress time:', savedProgress?.currentTime);

    // Handle setting the video time with retry logic
    const setVideoTimeSafely = (time) => {
      try {
        if (time > 0 && video.readyState > 0) {
          // Don't set time if it's too close to the end (last 10 seconds)
          const safeTime = Math.min(time, video.duration - 10);
          if (safeTime > 0) {
            video.currentTime = safeTime;
            console.log('Set video time to:', safeTime);
            return true;
          }
        }
        return false;
      } catch (e) {
        console.warn('Error setting video time, will retry', e);
        return false;
      }
    };

    // Unified handler for when video is ready
    const handleVideoReady = () => {
      console.log('[Resume] ========== HANDLE VIDEO READY CALLED ==========');
      console.log('[Resume] hasSetInitialTime:', hasSetInitialTime);
      console.log('[Resume] resumeTime:', resumeTime);
      console.log('[Resume] shouldShowResumePrompt:', shouldShowResumePrompt);
      console.log('[Resume] savedProgress:', savedProgress);
      
      if (hasSetInitialTime) {
        console.log('[Resume] Already set initial time, skipping');
        return;
      }

      // Set global flag to prevent other resume implementations from interfering
      window.__resumePromptActive = false;

      // If we don't have valid duration yet, wait longer
      if (video.duration <= 0 || !isFinite(video.duration)) {
        console.log('[Resume] ⏳ Waiting for valid video duration... (current:', video.duration, ')');
        setTimeout(handleVideoReady, 500);
        return;
      }

      console.log('[Resume] ✅ Video ready with duration:', video.duration);

      // Validate resume time against video duration
      const maxResumeTime = Math.max(0, video.duration - 10); // Don't resume in last 10 seconds
      const validResumeTime = Math.min(resumeTime, maxResumeTime);

      console.log('[Resume] Valid resume time:', validResumeTime, '| Should show prompt:', shouldShowResumePrompt);

      if (shouldShowResumePrompt && validResumeTime > 5) {
        console.log('[Resume] 🎬 Showing resume prompt!');
        
        const promptProgress = savedProgress || {
          currentTime: validResumeTime,
          duration: video.duration && isFinite(video.duration) ? video.duration : validResumeTime + 60
        };

        // Pause video immediately and show prompt
        try { 
          video.pause();
          console.log('[Resume] Video paused');
        } catch (e) { 
          console.warn('[Resume] Could not pause video:', e);
        }
        
        window.__resumePromptActive = true;
        resumePromptShown = true;
        showEnhancedResumePrompt(validResumeTime, promptProgress, video, movieData);
      } else if (validResumeTime > 0) {
        console.log('[Resume] Setting time without prompt to:', validResumeTime);
        setVideoTimeSafely(validResumeTime);
      } else {
        console.log('[Resume] Starting from beginning (no resume time)');
      }

      // Initialize tracking after handling resume
      try {
        window.ContinueWatchingManager?.initializeVideoTracking?.(video, movieData);
      } catch (e) {
        console.error('[Resume] Error initializing video tracking', e);
      }

      hasSetInitialTime = true;
      console.log('[Resume] ✅ Initial time handling complete');
    };

    // Set up event listeners with proper cleanup
    const onMetadataLoaded = () => {
      metadataLoaded = true;
      console.log('Video metadata loaded. Duration:', video.duration);
      handleVideoReady();
    };

    const onCanPlay = () => {
      canPlayFired = true;
      console.log('Video can play event fired');
      handleVideoReady();
    };

    // Timeout variable in outer scope
    let timeoutId = null;

    // Clean up event listeners
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onMetadataLoaded);
      video.removeEventListener('canplay', onCanPlay);
      if (timeoutId) clearTimeout(timeoutId);
    };

    // Set up event listeners
    if (video.readyState >= 1) { // HAVE_ENOUGH_DATA
      console.log('[Resume] Video already ready, calling handleVideoReady immediately');
      onMetadataLoaded();
    } else {
      console.log('[Resume] Setting up event listeners for video ready state');
      video.addEventListener('loadedmetadata', onMetadataLoaded);
      video.addEventListener('canplay', onCanPlay);
      
      // Timeout as fallback
      timeoutId = setTimeout(() => {
        cleanup();
        console.log('[Resume] ⚠️ Timeout waiting for video metadata');
        handleVideoReady();
      }, 5000);
    }

    // Direct check: This ensures the modal ALWAYS shows
    if (shouldShowResumePrompt && resumeTime > 5) {
      console.log('[Resume] 🎯 Direct check enabled: Will force show prompt when video ready');
      console.log('[Resume] Resume time:', resumeTime, '| Saved progress:', !!savedProgress);

      let checkAttempts = 0;
      const maxAttempts = 50; // 10 seconds max wait
      
      // Aggressive checking every 200ms
      const directCheckInterval = setInterval(() => {
        checkAttempts++;
        
        if (resumePromptShown) {
          console.log('[Resume] ✅ Prompt already shown, stopping direct check');
          clearInterval(directCheckInterval);
          return;
        }
        
        const isReady = video.readyState >= 1 && video.duration > 0 && isFinite(video.duration);
        
        if (checkAttempts % 5 === 0) {
          console.log('[Resume] 🔍 Direct check attempt', checkAttempts, '| Video ready:', isReady, '| ReadyState:', video.readyState, '| Duration:', video.duration);
        }
        
        if (isReady) {
          clearInterval(directCheckInterval);
          console.log('[Resume] 🎬 Direct check: Video ready, forcing prompt NOW!');
          
          try { 
            video.pause();
          } catch (e) { 
            console.warn('[Resume] Could not pause:', e);
          }
          
          window.__resumePromptActive = true;
          resumePromptShown = true;
          
          const promptProgress = savedProgress || {
            currentTime: resumeTime,
            duration: video.duration
          };
          
          showEnhancedResumePrompt(resumeTime, promptProgress, video, movieData);
        } else if (checkAttempts >= maxAttempts) {
          console.warn('[Resume] ⚠️ Direct check timeout after', maxAttempts, 'attempts');
          clearInterval(directCheckInterval);
        }
      }, 200);
    } else {
      console.log('[Resume] No direct check needed (no resume time or prompt not required)');
    }
    })(); // Close the async IIFE
  }

  async function showEnhancedResumePrompt(resumeTime, savedProgress, video, movieData) {
    if (resumePromptShown) return;
    resumePromptShown = true;

    console.log('[Resume] Showing enhanced resume prompt');

    // Wait for ContinueWatchingUI to be ready if not already
    if (!window.continueWatchingUIReady) {
      const uiReady = await waitForContinueWatchingUI();
      if (!uiReady) {
        console.warn('ContinueWatchingUI not ready, proceeding with basic resume functionality');
      }
    }

    // Create the overlay element
    const overlay = document.createElement('div');
    overlay.className = 'resume-prompt-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(0, 0, 0, 0.95) !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      z-index: 999999 !important;
      backdrop-filter: blur(5px) !important;
      pointer-events: all !important;
      touch-action: auto !important;
    `;

    const promptBox = document.createElement('div');
    promptBox.style.cssText = `
      background: rgba(20, 20, 20, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 2rem;
      max-width: 450px;
      width: 90%;
      text-align: center;
      color: white;
      font-family: 'Netflix Sans', Arial, sans-serif;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      pointer-events: all !important;
      touch-action: auto !important;
      position: relative;
      z-index: 1000000 !important;
    `;

    // Gracefully handle cases where savedProgress is missing (e.g., resume via URL param only)
    const effectiveDuration = (savedProgress && isFinite(savedProgress.duration) && savedProgress.duration > 0)
      ? savedProgress.duration
      : (isFinite(video.duration) && video.duration > 0
        ? video.duration
        : Math.max(resumeTime + 1, 1));

    const progressPercent = Math.min(100, Math.round((resumeTime / effectiveDuration) * 100));
    const timeFormatted = formatTime(resumeTime);
    const totalFormatted = formatTime(effectiveDuration);

    promptBox.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <i class="fas fa-history" style="font-size: 3rem; color: #e50914; margin-bottom: 1rem;"></i>
        <h2 style="margin: 0 0 0.5rem; font-size: 1.5rem; font-weight: 600;">Continue Watching?</h2>
        <p style="margin: 0; color: rgba(255, 255, 255, 0.8); font-size: 1rem;">
          "${movieData.title}"
        </p>
      </div>
      
      <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span style="font-size: 0.9rem; color: rgba(255, 255, 255, 0.7);">Progress</span>
          <span style="font-size: 0.9rem; font-weight: 500;">${progressPercent}%</span>
        </div>
        <div style="width: 100%; height: 4px; background: rgba(255, 255, 255, 0.2); border-radius: 2px; overflow: hidden;">
          <div style="width: ${progressPercent}%; height: 100%; background: #e50914; transition: width 0.3s ease;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.85rem; color: rgba(255, 255, 255, 0.6);">
          <span>${timeFormatted}</span>
          <span>${totalFormatted}</span>
        </div>
      </div>
      
      <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
        <button id="resumeYesBtn" style="
          background: #e50914;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.75rem 1.5rem;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          min-width: 150px;
          pointer-events: all;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        ">
          <i class="fas fa-play"></i>
          Resume from ${timeFormatted}
        </button>
        <button id="resumeNoBtn" style="
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          padding: 0.75rem 1.5rem;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          min-width: 150px;
          pointer-events: all;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        ">
          <i class="fas fa-redo"></i>
          Start Over
        </button>
      </div>
    `;

    overlay.appendChild(promptBox);

    // Add hover and touch effects for both desktop and mobile
    const resumeYesBtn = promptBox.querySelector('#resumeYesBtn');
    const resumeNoBtn = promptBox.querySelector('#resumeNoBtn');

    // Touch/click feedback for Resume button
    resumeYesBtn.addEventListener('touchstart', () => {
      resumeYesBtn.style.background = '#f40612';
      resumeYesBtn.style.transform = 'scale(0.98)';
    }, { passive: true });
    
    resumeYesBtn.addEventListener('touchend', () => {
      setTimeout(() => {
        resumeYesBtn.style.background = '#e50914';
        resumeYesBtn.style.transform = 'scale(1)';
      }, 100);
    }, { passive: true });

    // Touch/click feedback for Start Over button
    resumeNoBtn.addEventListener('touchstart', () => {
      resumeNoBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      resumeNoBtn.style.transform = 'scale(0.98)';
    }, { passive: true });
    
    resumeNoBtn.addEventListener('touchend', () => {
      setTimeout(() => {
        resumeNoBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        resumeNoBtn.style.transform = 'scale(1)';
      }, 100);
    }, { passive: true });

    // Desktop hover effects
    resumeYesBtn.addEventListener('mouseenter', () => {
      resumeYesBtn.style.background = '#f40612';
      resumeYesBtn.style.transform = 'translateY(-1px)';
    });
    resumeYesBtn.addEventListener('mouseleave', () => {
      resumeYesBtn.style.background = '#e50914';
      resumeYesBtn.style.transform = 'translateY(0)';
    });

    resumeNoBtn.addEventListener('mouseenter', () => {
      resumeNoBtn.style.background = 'rgba(255, 255, 255, 0.2)';
      resumeNoBtn.style.transform = 'translateY(-1px)';
    });
    resumeNoBtn.addEventListener('mouseleave', () => {
      resumeNoBtn.style.background = 'rgba(255, 255, 255, 0.1)';
      resumeNoBtn.style.transform = 'translateY(0)';
    });

    // Handle button clicks
    resumeYesBtn.addEventListener('click', async () => {
      console.log('User chose to resume from:', resumeTime);

      // Disable buttons to prevent multiple clicks
      resumeYesBtn.disabled = true;
      resumeNoBtn.disabled = true;
      resumeYesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resuming...';

      try {
        // Set the video time and wait for it to complete
        await setVideoCurrentTime(video, resumeTime);
        console.log('Successfully set video time, removing prompt');
        removeResumePrompt(overlay);

        // Show confirmation message
        showResumeConfirmation(`Resuming from ${timeFormatted}`);

        // Resume playback explicitly after user choice
        try {
          await video.play();
          console.log('Video playback resumed successfully');
        } catch (playError) {
          console.warn('Could not auto-play video:', playError);
          // Continue anyway, the user can click play manually
        }
      } catch (error) {
        console.error('Error resuming video:', error);
        // Show error to user
        showResumeConfirmation('Error resuming, starting from beginning');
        video.currentTime = 0;
        try { video.play().catch(() => { }); } catch (_) { }
      } finally {
        removeResumePrompt(overlay);
      }
    });

    // Handle Start Over button click
    resumeNoBtn.addEventListener('click', async () => {
      console.log('User chose to start over');

      // Disable buttons to prevent multiple clicks
      resumeYesBtn.disabled = true;
      resumeNoBtn.disabled = true;
      resumeNoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';

      try {
        // Set video to beginning and wait for it to complete
        await setVideoCurrentTime(video, 0);
        console.log('Successfully set video to beginning');

        // Show confirmation message
        showResumeConfirmation('Starting from beginning');

        // Start playback from beginning
        try {
          await video.play();
          console.log('Video playback started from beginning');
        } catch (playError) {
          console.warn('Could not auto-play video:', playError);
          // Continue anyway, the user can click play manually
        }
      } catch (error) {
        console.error('Error starting video from beginning:', error);
        showResumeConfirmation('Error, please try again');
        // Still try to set to 0 as a fallback
        video.currentTime = 0;
      } finally {
        removeResumePrompt(overlay);
      }
    });

    // Handle escape key
    function handleEscapeKey(e) {
      if (e.key === 'Escape') {
        // Dismiss the prompt without changing playback position
        removeResumePrompt(overlay);
        // Keep video paused; user can decide next action explicitly
        try { video.pause(); } catch (_) { }
        // Optional: small toast to indicate dismissal
        showResumeConfirmation('Resume prompt dismissed');
      }
    }
    document.addEventListener('keydown', handleEscapeKey);

    // Clean up escape listener when prompt is removed
    overlay.addEventListener('remove', () => {
      document.removeEventListener('keydown', handleEscapeKey);
    });

    // Add to DOM
    document.body.appendChild(overlay);

    // Pause video while prompt is shown
    if (!video.paused) {
      video.pause();
    }
  }

  function setVideoCurrentTime(video, targetTime, attempt = 1) {
    // Input validation
    if (!video || typeof targetTime !== 'number' || isNaN(targetTime) || targetTime < 0) {
      console.warn('Invalid time or video element provided', { video, targetTime });
      return Promise.reject(new Error('Invalid time or video element'));
    }

    // If we've tried too many times, give up
    const MAX_ATTEMPTS = 3;
    if (attempt > MAX_ATTEMPTS) {
      console.warn(`Failed to set video time after ${MAX_ATTEMPTS} attempts`);
      return Promise.reject(new Error('Max retry attempts exceeded'));
    }

    console.log(`[Resume] Attempt ${attempt} to set time to ${targetTime}s`);

    // If video is already at the desired time (within 0.5s), do nothing
    if (Math.abs(video.currentTime - targetTime) < 0.5) {
      console.log('[Resume] Video already at desired time');
      return Promise.resolve();
    }

    // If video duration is available and target time is too close to the end, adjust it
    if (video.duration > 0) {
      // Don't seek to the last 10 seconds to avoid immediate end
      const safeTime = Math.min(targetTime, video.duration - 10);
      if (safeTime <= 0) {
        console.log('[Resume] Target time too close to end, starting from beginning');
        video.currentTime = 0;
        return Promise.resolve();
      }
      targetTime = safeTime;
    }

    return new Promise((resolve, reject) => {
      // If video is not ready, wait for it
      if (video.readyState < 1) { // HAVE_NOTHING
        console.log('[Resume] Video not ready, waiting for metadata...');
        const onLoaded = () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          console.log('[Resume] Video metadata loaded, retrying...');
          setVideoCurrentTime(video, targetTime, attempt).then(resolve).catch(reject);
        };
        video.addEventListener('loadedmetadata', onLoaded, { once: true });
        return;
      }

      // If video is seeking, wait for it to finish
      if (video.seeking) {
        console.log('[Resume] Video is already seeking, waiting...');
        const onSeeked = () => {
          console.log('[Resume] Previous seek completed, retrying...');
          video.removeEventListener('seeked', onSeeked);
          setVideoCurrentTime(video, targetTime, attempt + 1).then(resolve).catch(reject);
        };
        video.addEventListener('seeked', onSeeked, { once: true });
        return;
      }

      let seekResolved = false;
      let seekTimeout;

      const cleanup = () => {
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('error', onSeekError);
        clearTimeout(seekTimeout);
      };

      const onSeeked = () => {
        console.log(`[Resume] Seeked event fired at ${video.currentTime.toFixed(2)}s`);
        verifySeek();
      };

      const onTimeUpdate = () => {
        // If we're close to the target time, consider it a success
        if (Math.abs(video.currentTime - targetTime) < 0.5) {
          console.log(`[Resume] Time update close to target: ${video.currentTime.toFixed(2)}s`);
          completeSeek();
        }
      };

      const onSeekError = (error) => {
        console.error('[Resume] Error seeking video:', error);
        cleanup();
        if (attempt < MAX_ATTEMPTS) {
          console.log(`[Resume] Retrying (attempt ${attempt + 1}/${MAX_ATTEMPTS})...`);
          setTimeout(() => {
            setVideoCurrentTime(video, targetTime, attempt + 1).then(resolve).catch(reject);
          }, 500 * attempt);
        } else {
          reject(error);
        }
      };

      const completeSeek = () => {
        if (seekResolved) return;
        seekResolved = true;
        cleanup();
        console.log(`[Resume] Successfully set video time to ${targetTime}s`);
        // Small delay to ensure the video is ready to play
        setTimeout(resolve, 100);
      };

      const verifySeek = () => {
        const currentTime = video.currentTime;
        const timeDiff = Math.abs(currentTime - targetTime);

        if (timeDiff < 0.5) {
          console.log(`[Resume] Seek verified: ${currentTime.toFixed(2)}s (target: ${targetTime}s)`);
          completeSeek();
        } else if (attempt < MAX_ATTEMPTS) {
          console.warn(`[Resume] Seek verification failed (attempt ${attempt}/${MAX_ATTEMPTS}). Expected: ${targetTime}s, got: ${currentTime.toFixed(2)}s`);
          // Try setting the time again
          try {
            video.currentTime = targetTime;
            setTimeout(verifySeek, 500);
          } catch (err) {
            onSeekError(err);
          }
        } else {
          console.error(`[Resume] Failed to set video time after ${MAX_ATTEMPTS} attempts`);
          cleanup();
          reject(new Error(`Failed to set video time after ${MAX_ATTEMPTS} attempts`));
        }
      };

      // Set up event listeners
      video.addEventListener('seeked', onSeeked, { once: true });
      video.addEventListener('timeupdate', onTimeUpdate);
      video.addEventListener('error', onSeekError, { once: true });

      // Set up timeout for seek operation
      seekTimeout = setTimeout(() => {
        if (!seekResolved) {
          console.warn('[Resume] Seek operation timed out, verifying...');
          verifySeek();
        }
      }, 3000);

      // Finally, attempt to set the time
      try {
        console.log(`[Resume] Setting video time to ${targetTime}s`);
        video.currentTime = targetTime;
      } catch (error) {
        console.error('[Resume] Error setting video time:', error);
        onSeekError(error);
      }
    });
  }

  function removeResumePrompt(overlay) {
    if (overlay && overlay.parentNode) {
      overlay.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => {
        overlay.remove();
        // Clear the flag after removal
        window.__resumePromptActive = false;
      }, 200);
    }
    // Also clear immediately in case the overlay doesn't exist
    window.__resumePromptActive = false;
  }

  function showResumeConfirmation(message) {
    // Use existing toast system if available
    if (window.UIToast) {
      window.UIToast.success('Resume', message, 2000);
    } else {
      // Fallback notification
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 12px 24px;
        border-radius: 6px;
        font-size: 14px;
        z-index: 1000;
        animation: slideUp 0.3s ease;
      `;
      notification.textContent = message;
      document.body.appendChild(notification);

      setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }, 2000);
    }
  }

  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  function generateMovieIdFromUrl() {
    try {
      // Get the most reliable source for generating a consistent ID
      const url = new URL(window.location.href);

      // Try to get the most stable identifier from the URL
      let idSource = '';

      // 1. Check for movieId in URL parameters
      const urlParams = new URLSearchParams(url.search);
      const movieIdParam = urlParams.get('movieId');
      if (movieIdParam) return movieIdParam;

      // 2. Check for video source
      const video = document.querySelector('video') || document.querySelector('video source');
      if (video) {
        const src = video.src || (video.tagName === 'VIDEO' ? video.currentSrc : video.src);
        if (src) {
          // Extract filename without query parameters
          const srcUrl = new URL(src, window.location.origin);
          idSource += srcUrl.pathname.split('/').pop().split('?')[0];
        }
      }

      // 3. Use page title if available
      const pageTitle = document.title || '';
      if (pageTitle && !pageTitle.includes('http')) {
        idSource += pageTitle;
      }

      // 4. Use URL path as fallback
      if (!idSource) {
        idSource = url.pathname;
      }

      // 5. Create a stable hash from the combined sources
      if (idSource) {
        // Simple but effective hash function
        let hash = 0;
        for (let i = 0; i < idSource.length; i++) {
          const char = idSource.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return 'mov_' + Math.abs(hash).toString(36).substring(0, 12);
      }

      // Final fallback - use URL hash
      return 'mov_' + Math.abs(url.href.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0)).toString(36).substring(0, 12);

    } catch (error) {
      console.error('Error generating movie ID:', error);
      // Fallback to a random ID if all else fails
      return 'mov_' + Math.random().toString(36).substring(2, 10);
    }
  }

  function extractThumbnailFromPage() {
    // Try to find a thumbnail from various sources
    const poster = document.querySelector('video[poster]');
    if (poster) return poster.poster;

    const metaImage = document.querySelector('meta[property="og:image"]');
    if (metaImage) return metaImage.content;

    const img = document.querySelector('img[alt*="poster"], img[alt*="thumbnail"]');
    if (img) return img.src;

    return null;
  }

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    
    @keyframes fadeOut {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.95); }
    }
    
    @keyframes slideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    
    @keyframes slideDown {
      from { opacity: 1; transform: translateX(-50%) translateY(0); }
      to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
  `;
  document.head.appendChild(style);

})();