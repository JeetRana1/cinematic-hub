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

  function confirmClearAllContinueWatching() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'background:rgba(0,0,0,0.65)',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'z-index:99999',
        'padding:16px'
      ].join(';');

      const modal = document.createElement('div');
      modal.style.cssText = [
        'width:min(420px,95vw)',
        'background:#111827',
        'border:1px solid rgba(255,255,255,0.12)',
        'border-radius:14px',
        'box-shadow:0 18px 45px rgba(0,0,0,0.45)',
        'padding:18px',
        'color:#fff',
        'font-family:inherit'
      ].join(';');

      modal.innerHTML = `
        <h3 style="margin:0 0 8px;font-size:1.05rem;">Clear Continue Watching?</h3>
        <p style="margin:0 0 16px;color:rgba(255,255,255,0.8);font-size:0.92rem;line-height:1.4;">
          This will remove all saved continue watching movies for this profile.
        </p>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="cwConfirmNo" style="padding:8px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.18);background:rgba(255,255,255,0.06);color:#fff;cursor:pointer;">No</button>
          <button id="cwConfirmYes" style="padding:8px 14px;border-radius:10px;border:1px solid rgba(255,91,91,0.5);background:linear-gradient(135deg,#ff7a7a,#ff3b3b);color:#fff;font-weight:600;cursor:pointer;">Yes, clear all</button>
        </div>
      `;

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(false);
        }
      });

      modal.querySelector('#cwConfirmNo')?.addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });

      modal.querySelector('#cwConfirmYes')?.addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
    });
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
    if (window.isSearching && !forceShow) {
      const section = document.getElementById('continueWatchingSection');
      if (section) section.style.display = 'none';
      return;
    }

    console.log('=== DEBUG: loadContinueWatching() called ===');
    try {
      const formatTime = (seconds) => {
        const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
        const h = Math.floor(safeSeconds / 3600);
        const m = Math.floor((safeSeconds % 3600) / 60);
        const s = safeSeconds % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
      };

      const formatLastWatched = (timestamp) => {
        const ts = Number(timestamp) || 0;
        if (!ts) return 'Recently';
        try {
          return new Date(ts).toLocaleDateString();
        } catch (_) {
          return 'Recently';
        }
      };

      // Get data from Firebase Sync when available, otherwise fall back to local only
      let continueWatching = {};
      if (window.FirebaseSync && window.FirebaseSync.initialized && typeof window.FirebaseSync.getContinueWatching === 'function') {
        continueWatching = await window.FirebaseSync.getContinueWatching();
      } else {
        console.log('[ContinueWatching] Firebase not ready, using local fallback data');
      }

      const continueWatchingMovies = Object.entries(continueWatching).map(([id, movie]) => {
        // Convert Firestore Timestamp to milliseconds
        let timestamp = 0;
        if (movie.updatedAt) {
          // Handle Firestore Timestamp object (has toMillis() method)
          if (typeof movie.updatedAt.toMillis === 'function') {
            timestamp = movie.updatedAt.toMillis();
          } else {
            timestamp = parseInt(movie.updatedAt) || 0;
          }
        } else if (movie.timestamp) {
          timestamp = parseInt(movie.timestamp) || 0;
        }
        
        const mapped = {
          ...movie,
          id: movie.movieId || movie.id || id,
          movieId: movie.movieId || movie.id || id,
          title: movie.title || 'Untitled',
          progress: parseFloat(movie.progress) || 0,
          currentTime: parseFloat(movie.currentTime) || 0,
          duration: parseFloat(movie.duration) || 0,
          timestamp: timestamp,
          poster: movie.posterUrl || movie.poster || movie.thumbnail || '',
          posterUrl: movie.posterUrl || movie.poster || movie.thumbnail || ''
        };
        console.log('[StorageAdapter] Mapped movie:', mapped.title, '| Progress:', Math.round(mapped.progress), '% | Time:', Math.round(mapped.currentTime), 's | Timestamp:', mapped.timestamp);
        return mapped;
      });

      // Merge local keys so Continue Watching can still render when auth/cloud is unavailable
      try {
        const localKeys = ['continueWatching', 'continueWatching_guest', 'continueWatching_local'];
        const user = (window.FirebaseAuth && typeof window.FirebaseAuth.getUser === 'function')
          ? window.FirebaseAuth.getUser()
          : null;
        const uid = user && user.uid;
        if (uid) {
          localKeys.push(`continueWatching_${uid}`);
          const selectedProfile = localStorage.getItem(`fb_selected_profile_${uid}`);
          if (selectedProfile) localKeys.push(`continueWatching_${uid}_${selectedProfile}`);
        }

        const mergedMap = {};
        continueWatchingMovies.forEach((movie) => {
          const key = movie.movieId || movie.id;
          if (key) mergedMap[key] = movie;
        });

        localKeys.forEach((key) => {
          const raw = localStorage.getItem(key);
          if (!raw) return;
          const data = JSON.parse(raw);
          Object.entries(data || {}).forEach(([id, movie]) => {
            if (!movie || typeof movie !== 'object') return;
            const timestamp = parseInt(movie.updatedAt || movie.timestamp || 0) || 0;
            const mapped = {
              ...movie,
              id: movie.movieId || movie.id || id,
              movieId: movie.movieId || movie.id || id,
              title: movie.title || 'Untitled',
              progress: parseFloat(movie.progress) || 0,
              currentTime: parseFloat(movie.currentTime) || 0,
              duration: parseFloat(movie.duration) || 0,
              timestamp,
              poster: movie.posterUrl || movie.poster || movie.thumbnail || '',
              posterUrl: movie.posterUrl || movie.poster || movie.thumbnail || ''
            };
            const movieKey = mapped.movieId || mapped.id;
            if (!movieKey) return;
            const existing = mergedMap[movieKey];
            if (!existing || (mapped.timestamp || 0) > (existing.timestamp || 0)) {
              mergedMap[movieKey] = mapped;
            }
          });
        });

        continueWatchingMovies.length = 0;
        continueWatchingMovies.push(...Object.values(mergedMap));
      } catch (mergeError) {
        console.warn('[ContinueWatching] Local fallback merge failed:', mergeError);
      }

      // Deduplicate by strict movieId + normalized title normalization
      // This ensures same movie with different progress times only appears once
      const normalizeTitle = (title) => {
        if (!title) return '';
        return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      };
      
      const normalizeMovieId = (id) => {
        if (!id) return '';
        // Convert to string, lowercase, and normalize
        let normalized = String(id).toLowerCase().trim();
        // Remove trailing hyphens added by title generation (e.g., "vikram-" -> "vikram")
        normalized = normalized.replace(/-+$/, '');
        return normalized;
      };
      
      const seen = new Map();
      const seenByTitle = new Map();
      const deduped = [];
      continueWatchingMovies.forEach(m => {
        // First try to normalize the movieId/id
        let key = normalizeMovieId(m.movieId || m.id);
        
        // If no valid movieId, use normalized title as fallback
        if (!key) {
          key = normalizeTitle(m.title);
        }
        
        const normalizedTitle = normalizeTitle(m.title);
        
        console.log('[StorageAdapter] Processing movie:', m.title, '| key:', key, '| progress:', Math.round(m.progress) + '%', '| timestamp:', m.timestamp);
        
        if (key) {
          // Check if we've already seen this movie by either ID or title
          let existingByKey = seen.get(key);
          let existingByTitle = seenByTitle.get(normalizedTitle);
          let existing = existingByKey || existingByTitle;
          
          if (!existing) {
            seen.set(key, m);
            seenByTitle.set(normalizedTitle, m);
            deduped.push(m);
            console.log('[StorageAdapter] ✅ Dedup: Kept as first entry -', m.title, '| key:', key);
          } else {
            // Keep the entry with the most recent progress (highest timestamp or currentTime)
            const existingTime = existing.timestamp || 0;
            const newTime = m.timestamp || 0;
            const existingProgress = existing.currentTime || 0;
            const newProgress = m.currentTime || 0;
            
            console.log('[StorageAdapter] ⚠️ Dedup: Found duplicate -', m.title, 
              '| existing ts:', existingTime, 'progress:', Math.round(existingProgress) + 's',
              '| new ts:', newTime, 'progress:', Math.round(newProgress) + 's');
            
            // Compare timestamps (most recent wins)
            // If timestamps are equal or very close, use progress (higher wins)
            const timeEqual = Math.abs(newTime - existingTime) < 2000; // 2 second tolerance
            const shouldReplace = newTime > existingTime || (timeEqual && newProgress > existingProgress);
            
            if (shouldReplace) {
              const idx = deduped.indexOf(existing);
              if (idx >= 0) deduped[idx] = m;
              // Update both maps
              if (existingByKey) seen.set(key, m);
              if (existingByTitle) seenByTitle.set(normalizedTitle, m);
              if (existingByKey && !existingByTitle) seenByTitle.set(normalizedTitle, m);
              if (!existingByKey && existingByTitle) seen.set(key, m);
              console.log('[StorageAdapter] 🔄 Dedup: Replaced with newer entry -', m.title, '| newProgress:', Math.round(newProgress) + 's');
            } else {
              console.log('[StorageAdapter] 🗑️ Dedup: Removed duplicate -', m.title, '| kept existing progress:', Math.round(existingProgress) + 's');
            }
          }
        } else {
          console.log('[StorageAdapter] ⚠️ Dedup: No valid key for', m.title, '- including anyway');
          deduped.push(m);
        }
      });
      
      console.log('[StorageAdapter] After dedup: ' + deduped.length + ' unique movies from ' + continueWatchingMovies.length + ' total');

      let validMovies = deduped.filter(movie => {
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

      const clearBtn = document.getElementById('cwClearAll');
      if (clearBtn && !clearBtn.dataset.bound) {
        clearBtn.dataset.bound = '1';
        clearBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const confirmed = await confirmClearAllContinueWatching();
          if (!confirmed) return;
          try {
            clearBtn.disabled = true;
            clearBtn.style.opacity = '0.6';

            let cleared = false;
            if (window.FirebaseSync && typeof window.FirebaseSync.clearContinueWatching === 'function') {
              cleared = await window.FirebaseSync.clearContinueWatching();
            }

            // Also clear local fallback caches on this device.
            const localKeys = ['continueWatching', 'continueWatching_guest', 'continueWatching_local'];
            try {
              const user = (window.FirebaseAuth && typeof window.FirebaseAuth.getUser === 'function')
                ? window.FirebaseAuth.getUser()
                : null;
              const uid = user && user.uid;
              if (uid) {
                localKeys.push(`continueWatching_${uid}`);
                const selectedProfile = localStorage.getItem(`fb_selected_profile_${uid}`);
                if (selectedProfile) localKeys.push(`continueWatching_${uid}_${selectedProfile}`);
              }
            } catch (_) {}
            try {
              // Also remove any older per-movie local keys such as continueWatching_<movieId>.
              for (let i = localStorage.length - 1; i >= 0; i -= 1) {
                const key = localStorage.key(i);
                if (key && key.startsWith('continueWatching_')) {
                  localKeys.push(key);
                }
              }
            } catch (_) {}
            localKeys.forEach((k) => localStorage.removeItem(k));

            if (!cleared) {
              console.warn('Cloud clear failed or unavailable; local cache cleared only');
            }
            await window.loadContinueWatching(true);
          } catch (err) {
            console.error('Failed to clear continue watching:', err);
          } finally {
            clearBtn.disabled = false;
            clearBtn.style.opacity = '';
          }
        });
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
        const watchedTime = formatTime(movie.currentTime || 0);
        const remainingSeconds = Math.max(0, (Number(movie.duration) || 0) - (Number(movie.currentTime) || 0));
        const remainingTime = formatTime(remainingSeconds);
        const lastWatched = formatLastWatched(movie.timestamp);
        const movieId = String(movie.movieId || movie.id || '');
        if (!movieId) return;
        
        const movieCard = document.createElement('div');
        movieCard.className = 'continue-watching-card';
        movieCard.dataset.movieId = movieId;
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
            <p>${watchedTime} watched • ${remainingTime} left</p>
            <p>Last watched: ${lastWatched}</p>
          </div>
        `;
        
        // Add event listeners
        const resumeBtn = movieCard.querySelector('.resume-button');
        const removeBtn = movieCard.querySelector('.remove-button');
        const resumeOverlay = movieCard.querySelector('.resume-overlay');
        if (removeBtn) {
          removeBtn.style.zIndex = '5';
          removeBtn.style.pointerEvents = 'auto';
        }
        if (resumeOverlay) {
          resumeOverlay.style.pointerEvents = 'none';
          const resumeButtonInside = resumeOverlay.querySelector('.resume-button');
          if (resumeButtonInside) resumeButtonInside.style.pointerEvents = 'auto';
        }
        
        resumeBtn?.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const movieId = movieCard.dataset.movieId;
          const title = movie.title || 'Unknown';
          const poster = movie.posterUrl || movie.poster || '';
          
          // Use the player that was used when watching this movie
          // Default to player1 if playerUsed field is missing
          const playerUsed = movie.playerUsed || 'player1';
          const playerBase = playerUsed === 'player2' ? 'player-2.nontongo.html' : 'player.html';
          console.log('🎬 Resuming movie:', movieId, title, 'in player:', playerBase, '(playerUsed:', playerUsed, ')');
          // Navigate to the correct player with all necessary parameters
          const playerUrl = `${playerBase}?id=${encodeURIComponent(movieId)}&title=${encodeURIComponent(title)}&poster=${encodeURIComponent(poster)}`;
          window.location.href = playerUrl;
        });
        
        removeBtn?.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const movieId = movieCard.dataset.movieId;
          console.log('Removing from continue watching:', movieId);
          let removed = false;
          if (window.ContinueWatchingManager && typeof window.ContinueWatchingManager.removeMovieProgress === 'function') {
            try {
              await window.ContinueWatchingManager.removeMovieProgress(movieId);
              removed = true;
            } catch (_) {}
          }
          if (!removed && window.FirebaseSync && typeof window.FirebaseSync.removeContinueWatchingItem === 'function') {
            try {
              removed = await window.FirebaseSync.removeContinueWatchingItem(movieId);
            } catch (_) {}
          }

          // Always clear local fallback entries for this movie on this device.
          try {
            const localKeys = ['continueWatching', 'continueWatching_guest', 'continueWatching_local'];
            const user = (window.FirebaseAuth && typeof window.FirebaseAuth.getUser === 'function')
              ? window.FirebaseAuth.getUser()
              : null;
            const uid = user && user.uid;
            if (uid) {
              localKeys.push(`continueWatching_${uid}`);
              const selectedProfile = localStorage.getItem(`fb_selected_profile_${uid}`);
              if (selectedProfile) localKeys.push(`continueWatching_${uid}_${selectedProfile}`);
            }
            localKeys.forEach((k) => {
              const raw = localStorage.getItem(k);
              if (!raw) return;
              const parsed = JSON.parse(raw);
              if (!parsed || typeof parsed !== 'object') return;
              if (parsed[movieId]) {
                delete parsed[movieId];
                localStorage.setItem(k, JSON.stringify(parsed));
              }
            });
          } catch (_) {}

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
