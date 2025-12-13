// Storage Adapter - Provides backward compatibility for localStorage calls
// Automatically uses Firebase Sync for logged-in users
(function() {
  'use strict';

  // Wait for FirebaseSync to be ready
  function waitForSync() {
    return new Promise((resolve) => {
      if (window.FirebaseSync && window.FirebaseSync.initialized) {
        resolve();
      } else {
        const checkInterval = setInterval(() => {
          if (window.FirebaseSync && window.FirebaseSync.initialized) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      }
    });
  }

  // Initialize adapter
  async function initAdapter() {
    await waitForSync();
    console.log('Storage Adapter initialized with Firebase Sync');
  }

  // Continue Watching Functions (replace localStorage with Firestore)
  window.getContinueWatchingKey = function() {
    // This function is kept for compatibility but not used with Firestore
    try {
      const user = (window.FirebaseAuth && typeof window.FirebaseAuth.getUser === 'function')
        ? window.FirebaseAuth.getUser()
        : null;
      const uid = user && user.uid;
      if (!uid) return 'continueWatching_guest';
      const sel = localStorage.getItem(`fb_selected_profile_${uid}`);
      return sel ? `continueWatching_${uid}_${sel}` : `continueWatching_${uid}`;
    } catch (e) {
      return 'continueWatching_guest';
    }
  };

  window.loadContinueWatching = async function(forceShow = false) {
    try {
      if (!window.FirebaseAuth || typeof window.FirebaseAuth.getUser !== 'function' || !window.FirebaseAuth.getUser()) {
        setTimeout(() => loadContinueWatching(forceShow), 250);
        return;
      }
    } catch (_) { }

    if (window.isSearching && !forceShow) {
      const section = document.getElementById('continueWatchingSection');
      if (section) section.style.display = 'none';
      return;
    }

    console.log('=== DEBUG: loadContinueWatching() called ===');
    try {
      // Wait for FirebaseSync to be initialized
      if (!window.FirebaseSync || !window.FirebaseSync.initialized) {
        console.log('[ContinueWatching] Waiting for Firebase to initialize...');
        setTimeout(() => loadContinueWatching(forceShow), 500);
        return;
      }

      // Get data from Firebase Sync (cloud only)
      const continueWatching = await window.FirebaseSync.getContinueWatching();

      const continueWatchingMovies = Object.entries(continueWatching).map(([id, movie]) => {
        const mapped = {
          ...movie,
          id: movie.movieId || movie.id || id,
          movieId: movie.movieId || movie.id || id,
          title: movie.title || 'Untitled',
          progress: parseFloat(movie.progress) || 0,
          currentTime: parseFloat(movie.currentTime) || 0,
          duration: parseFloat(movie.duration) || 0,
          timestamp: parseInt(movie.updatedAt || movie.timestamp) || 0,
          poster: movie.posterUrl || movie.poster || movie.thumbnail || '',
          posterUrl: movie.posterUrl || movie.poster || movie.thumbnail || ''
        };
        console.log('[StorageAdapter] Mapped movie:', mapped.title, '| Progress:', mapped.progress, '% | Poster:', mapped.posterUrl ? 'Yes' : 'No');
        return mapped;
      });

      let validMovies = continueWatchingMovies.filter(movie => {
        const hasProgress = movie.progress > 0 && movie.progress < 95;
        const hasValidId = movie.id || movie.movieId;
        const hasTitle = movie.title && movie.title !== 'Untitled' && movie.title !== 'Unknown Movie';
        const isNotTestMovie = !movie.title.toLowerCase().includes('test');
        const hasValidPoster = movie.poster || movie.posterUrl;
        
        const isValid = hasProgress && hasValidId && hasTitle && isNotTestMovie && hasValidPoster;
        
        if (!isValid) {
          console.log('[StorageAdapter] Filtered out:', movie.title, {
            hasProgress,
            hasValidId,
            hasTitle,
            isNotTestMovie,
            hasValidPoster: !!hasValidPoster,
            poster: movie.posterUrl
          });
        }
        
        return isValid;
      });
      
      console.log('[StorageAdapter] Valid movies:', validMovies.length, validMovies.map(m => m.title));

      validMovies.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      const section = document.getElementById('continueWatchingSection');
      if (!section) {
        console.warn('Continue watching section not found');
        return;
      }

      if (validMovies.length === 0) {
        section.style.display = 'none';
        return;
      }

      section.style.display = 'block';

      const container = section.querySelector('.continue-watching-container') || 
                        section.querySelector('.movie-row');
      
      if (!container) {
        console.warn('Continue watching container not found');
        return;
      }

      container.innerHTML = '';

      // Render the continue watching cards
      validMovies.forEach(movie => {
        const thumbnailUrl = movie.poster || movie.posterUrl;
        
        // Skip movies without valid poster URL (don't show placeholders)
        if (!thumbnailUrl) {
          console.warn('Skipping movie without poster:', movie.title);
          return;
        }
        
        const progressPercent = Math.round(movie.progress || 0);
        
        const movieCard = document.createElement('div');
        movieCard.className = 'continue-watching-card';
        movieCard.dataset.movieId = movie.id || movie.movieId;
        movieCard.innerHTML = `
          <div class="continue-watching-poster">
            <img src="${thumbnailUrl}" alt="${movie.title}" loading="lazy" />
            <div class="progress-bar">
              <div class="progress" style="width: ${progressPercent}%"></div>
            </div>
            <div class="resume-overlay">
              <div class="resume-button">
                <i class="fas fa-play"></i>
                Resume
              </div>
            </div>
            <div class="remove-button" title="Remove from Continue Watching">×</div>
          </div>
          <div class="continue-watching-info">
            <h3>${movie.title}</h3>
            <p>${progressPercent}% watched</p>
          </div>
        `;
        
        // Add event listeners
        const resumeBtn = movieCard.querySelector('.resume-button');
        const removeBtn = movieCard.querySelector('.remove-button');
        
        resumeBtn?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const movieId = movieCard.dataset.movieId;
          const title = movie.title || 'Unknown';
          const poster = movie.posterUrl || movie.poster || '';
          
          console.log('Resuming movie:', movieId, title);
          // Navigate to player with all necessary parameters
          const playerUrl = `player.html?id=${encodeURIComponent(movieId)}&title=${encodeURIComponent(title)}&poster=${encodeURIComponent(poster)}`;
          window.location.href = playerUrl;
        });
        
        removeBtn?.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const movieId = movieCard.dataset.movieId;
          console.log('Removing from continue watching:', movieId);
          if (window.ContinueWatchingManager) {
            await window.ContinueWatchingManager.removeMovieProgress(movieId);
          }
          // Animate removal
          movieCard.style.transition = 'opacity 0.3s, transform 0.3s';
          movieCard.style.opacity = '0';
          movieCard.style.transform = 'scale(0.8)';
          setTimeout(() => {
            movieCard.remove();
            // Reload to check if section should be hidden
            loadContinueWatching(forceShow);
          }, 300);
        });
        
        container.appendChild(movieCard);
      });

      console.log('Continue watching movies loaded:', validMovies.length);

    } catch (error) {
      console.error('Error loading continue watching:', error);
    }
  };

  // Bookmarks Functions
  window.getBookmarksKey = function() {
    // Kept for compatibility
    try {
      const user = (window.FirebaseAuth && typeof window.FirebaseAuth.getUser === 'function')
        ? window.FirebaseAuth.getUser()
        : null;
      const uid = user && user.uid;
      if (!uid) return 'myList_guest';
      const sel = localStorage.getItem(`fb_selected_profile_${uid}`);
      return sel ? `myList_${uid}_${sel}` : `myList_${uid}`;
    } catch (e) {
      return 'myList_guest';
    }
  };

  window.addBookmark = async function(movie) {
    try {
      return await window.FirebaseSync.addBookmark(movie);
    } catch (e) {
      console.error('Error adding bookmark:', e);
      return false;
    }
  };

  window.removeBookmark = async function(movieId) {
    try {
      return await window.FirebaseSync.removeBookmark(movieId);
    } catch (e) {
      console.error('Error removing bookmark:', e);
      return false;
    }
  };

  window.isBookmarked = async function(movieId) {
    try {
      return await window.FirebaseSync.isBookmarked(movieId);
    } catch (e) {
      return false;
    }
  };

  window.loadMyList = async function() {
    try {
      const bookmarks = await window.FirebaseSync.getBookmarks();
      const bookmarksArray = Object.values(bookmarks);
      
      // Sort by timestamp (newest first)
      bookmarksArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      return bookmarksArray;
    } catch (e) {
      console.error('Error loading my list:', e);
      return [];
    }
  };

  // Theme Functions
  window.getSavedTheme = async function() {
    try {
      return await window.FirebaseSync.getTheme();
    } catch (e) {
      return 'glossy';
    }
  };

  window.saveTheme = async function(theme) {
    try {
      return await window.FirebaseSync.saveTheme(theme);
    } catch (e) {
      console.error('Error saving theme:', e);
      return false;
    }
  };

  // Initialize when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdapter);
  } else {
    initAdapter();
  }

  // Provide migration helper
  window.migrateToFirebase = async function() {
    const user = window.FirebaseAuth && window.FirebaseAuth.getUser();
    if (!user) {
      alert('Please sign in first to migrate your data');
      return;
    }

    const confirmed = confirm(
      'This will migrate all your local data to the cloud.\n\n' +
      'Your watch history, bookmarks, and settings will be synced across all devices.\n\n' +
      'Continue?'
    );

    if (!confirmed) return;

    try {
      const success = await window.FirebaseSync.migrateFromLocalStorage();
      if (success) {
        alert('Migration successful! Your data is now synced to the cloud.');
        
        // Optionally clear localStorage
        const clearLocal = confirm('Do you want to clear local storage? (Data is already saved to cloud)');
        if (clearLocal) {
          window.FirebaseSync.clearLocalStorage();
          alert('Local storage cleared. All data is now in the cloud.');
        }
        
        // Reload to apply changes
        window.location.reload();
      } else {
        alert('Migration failed. Please try again or contact support.');
      }
    } catch (error) {
      console.error('Migration error:', error);
      alert('Migration error: ' + error.message);
    }
  };

})();
