/**
 * Enhanced Continue Watching Manager
 * Handles all continue watching functionality with proper poster image handling
 */
class ContinueWatchingManager {
  constructor() {
    this.BASE_STORAGE_KEY = 'continueWatching';
    this.PROGRESS_INTERVAL = 5000; // 5 seconds
    this.COMPLETION_THRESHOLD = 5; // 5 seconds from end
    this.MIN_WATCH_TIME = 1; // Minimum seconds before tracking
    this.progressTimer = null;
    this.currentMovieId = null;
    this.currentVideo = null;
    this.lastSavedTime = 0;
  }

  /**
   * Compute storage key scoped to current user/profile (legacy compatibility only)
   */
  getStorageKey() {
    // This is only for backward compatibility - not used for primary storage
    try {
      const user = (window.FirebaseAuth && typeof window.FirebaseAuth.getUser === 'function')
        ? window.FirebaseAuth.getUser()
        : null;
      const uid = user && user.uid;
      if (!uid) return `${this.BASE_STORAGE_KEY}_guest`;
      const selectedProfileId = localStorage.getItem(`fb_selected_profile_${uid}`);
      return selectedProfileId
        ? `${this.BASE_STORAGE_KEY}_${uid}_${selectedProfileId}`
        : `${this.BASE_STORAGE_KEY}_${uid}`;
    } catch (_) {
      return this.BASE_STORAGE_KEY;
    }
  }

  /**
   * Get all continue watching data from Firebase (cloud-only)
   */
  getAllProgress() {
    try {
      // Always use Firebase cache if available
      if (window.FirebaseSync && window.FirebaseSync.cache && window.FirebaseSync.cache['continueWatching']) {
        return window.FirebaseSync.cache['continueWatching'] || {};
      }
      // Return empty if Firebase not ready yet
      return {};
    } catch (error) {
      console.error('Error reading continue watching data:', error);
      return {};
    }
  }

  /**
   * Get progress for a specific movie
   */
  getMovieProgress(movieId) {
    const allProgress = this.getAllProgress();
    return allProgress[movieId] || null;
  }

  /**
   * Save progress for a movie with enhanced data including poster
   */
  saveMovieProgress(movieId, progressData, force = false) {
    try {
      // Validate progress data - check for undefined/null/NaN, not falsy (0 is valid!)
      if (progressData.currentTime == null || progressData.duration == null ||
        isNaN(progressData.currentTime) || isNaN(progressData.duration)) {
        console.warn('Invalid progress data:', progressData);
        return;
      }

      // Don't save if current time is too close to the last saved time (unless forced)
      if (!force && Math.abs(progressData.currentTime - this.lastSavedTime) < 2) {
        return;
      }

      // Don't save if too close to beginning or end
      if (progressData.currentTime < this.MIN_WATCH_TIME ||
        progressData.currentTime >= progressData.duration - this.COMPLETION_THRESHOLD) {
        return;
      }

      // Normalize the movieId key to prevent duplicates
      // Prefer numeric IDs (like "4") over generated IDs (like "vikram-")
      // If movieId looks like a number, keep it; otherwise normalize it
      let normalizedKey = movieId;
      if (!/^\d+$/.test(movieId)) {
        // It's not a pure numeric ID, so normalize it
        normalizedKey = String(movieId).toLowerCase().trim().replace(/-+$/, '');
      }

      const allProgress = this.getAllProgress();
      allProgress[normalizedKey] = {
        movieId: normalizedKey,
        title: progressData.title || 'Unknown Movie',
        posterUrl: progressData.posterUrl || progressData.thumbnail || '',
        currentTime: Math.floor(progressData.currentTime),
        duration: Math.floor(progressData.duration),
        progress: Math.round((progressData.currentTime / progressData.duration) * 100),
        updatedAt: Date.now(),
        validUntil: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        // Additional metadata for better resume experience
        playbackRate: progressData.playbackRate || 1,
        volume: progressData.volume || 1,
        muted: progressData.muted || false
      };

      this.lastSavedTime = progressData.currentTime;

      console.log('Progress saved for', normalizedKey, ':', Math.round(progressData.currentTime), 's');

      // Save to Firebase immediately (cloud-only)
      if (window.FirebaseSync && window.FirebaseSync.initialized) {
        // Use updateContinueWatchingItem for individual saves (more efficient)
        window.FirebaseSync.updateContinueWatchingItem(normalizedKey, allProgress[normalizedKey]).then(() => {
          console.log('✅ Progress synced to Firebase cloud');
          // Dispatch custom event for live updates after successful save
          window.dispatchEvent(new CustomEvent('continueWatchingUpdated', {
            detail: { movieId: normalizedKey, progressData: allProgress[normalizedKey] }
          }));
        }).catch(err => {
          console.error('❌ Failed to sync continue watching to Firebase:', err);
        });
      } else if (window.FirebaseSync && !window.FirebaseSync.initialized) {
        // Firebase is loading, wait and retry
        console.log('⏳ Firebase initializing, will retry save...');
        setTimeout(() => {
          if (window.FirebaseSync && window.FirebaseSync.initialized) {
            window.FirebaseSync.updateContinueWatchingItem(normalizedKey, allProgress[normalizedKey]).then(() => {
              console.log('✅ Progress synced to Firebase cloud (retry)');
            }).catch(err => {
              console.error('❌ Failed to sync (retry):', err);
            });
          }
        }, 2000);
      } else {
        console.warn('⚠️ Firebase not available, progress not saved');
      }
    } catch (error) {
      console.error('Error saving continue watching data:', error);
    }
  }

  /**
   * Remove a movie from continue watching (cloud-only)
   */
  async removeMovieProgress(movieId) {
    try {
      console.log('Removing progress from cloud for', movieId);

      // Remove from Firebase Sync cache immediately
      if (window.FirebaseSync && window.FirebaseSync.cache && window.FirebaseSync.cache['continueWatching']) {
        delete window.FirebaseSync.cache['continueWatching'][movieId];
      }

      // Remove from Firestore using FirebaseSync (handles subcollections properly)
      let deleteSuccess = false;
      if (window.FirebaseSync && window.FirebaseSync.initialized) {
        try {
          await window.FirebaseSync.removeMovieProgress(movieId);
          console.log('✅ Successfully deleted from Firestore:', movieId);
          deleteSuccess = true;
        } catch (err) {
          console.error('❌ Failed to delete continue watching from Firestore:', err);
        }
      }

      // Dispatch custom event for live updates only after successful deletion
      window.dispatchEvent(new CustomEvent('continueWatchingUpdated', {
        detail: { movieId, removed: true, success: deleteSuccess }
      }));
    } catch (error) {
      console.error('Error removing continue watching data:', error);
    }
  }

  /**
   * Clear all continue watching data (cloud-only)
   */
  async clearAll() {
    try {
      console.log('Clearing all continue watching data from cloud');

      // Clear Firebase Sync cache immediately
      if (window.FirebaseSync && window.FirebaseSync.cache) {
        window.FirebaseSync.cache['continueWatching'] = {};
      }

      // Clear from Firebase using FirebaseSync (which handles subcollections properly)
      let clearSuccess = false;
      if (window.FirebaseSync && window.FirebaseSync.initialized) {
        try {
          await window.FirebaseSync.saveContinueWatching({});
          console.log('✅ Firebase sync cleared successfully');
          clearSuccess = true;
        } catch (err) {
          console.error('❌ Failed to sync continue watching to Firebase:', err);
        }
      }

      // Dispatch custom event for live updates after successful clearing
      window.dispatchEvent(new CustomEvent('continueWatchingUpdated', {
        detail: { cleared: true, success: clearSuccess }
      }));
    } catch (error) {
      console.error('Error clearing all continue watching data:', error);
    }
  }

  /**
   * Get movies suitable for continue watching with proper poster URLs
   */
  getContinueWatchingMovies() {
    const allProgress = this.getAllProgress();
    const movies = [];
    const now = Date.now();

    for (const [movieId, data] of Object.entries(allProgress)) {
      // Skip expired entries
      if (data.validUntil && data.validUntil < now) {
        continue;
      }

      // Only include movies that aren't completed and have meaningful progress
      const timeRemaining = data.duration - data.currentTime;
      if (timeRemaining > this.COMPLETION_THRESHOLD && data.currentTime >= this.MIN_WATCH_TIME) {
        movies.push({
          ...data,
          timeRemaining,
          progressPercent: Math.round((data.currentTime / data.duration) * 100),
          lastWatched: new Date(data.updatedAt).toLocaleDateString(),
          // Ensure poster URL is properly formatted
          posterUrl: this.validatePosterUrl(data.posterUrl, data.title)
        });
      }
    }

    // Sort by most recently updated
    return movies.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Validate and provide fallback for poster URLs
   */
  validatePosterUrl(posterUrl, title) {
    if (posterUrl && posterUrl.trim() !== '') {
      return posterUrl;
    }

    // Fallback to placeholder with movie title
    const encodedTitle = encodeURIComponent(title || 'Movie');
    return `https://via.placeholder.com/300x450/1a1a1a/ffffff?text=${encodedTitle}`;
  }

  /**
   * Generate resume URL for a movie
   */
  generateResumeUrl(movieData) {
    const params = new URLSearchParams();
    params.append('movieId', movieData.movieId);
    params.append('title', movieData.title);
    if (movieData.posterUrl) params.append('poster', movieData.posterUrl);
    params.append('t', Math.floor(movieData.currentTime));

    // Use the player that was used when watching this movie
    // Default to player1 if playerUsed field is missing
    const playerUsed = movieData.playerUsed || 'player1';
    const playerBase = playerUsed === 'player2' ? 'player-2.html' : 'player.html';
    console.log('🔗 Building resume URL for', movieData.title, 'with player:', playerBase);
    return `${playerBase}?${params.toString()}`;
  }

  /**
   * Initialize progress tracking for a video element
   */
  initializeVideoTracking(video, movieData) {
    if (!video || !movieData.movieId) {
      console.error('Invalid video element or movie data');
      return;
    }

    this.currentVideo = video;
    this.currentMovieId = movieData.movieId;

    console.log('Initializing continue watching for:', movieData.title);

    // Set up progress tracking
    this.setupProgressTracking(video, movieData);

    // Set up completion detection
    this.setupCompletionDetection(video);

    // Clean up expired entries
    this.cleanupExpiredEntries();
  }

  /**
   * Set up automatic progress tracking
   */
  setupProgressTracking(video, movieData) {
    // Clear any existing timer
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }

    // Start progress tracking timer
    this.progressTimer = setInterval(() => {
      if (!video.paused && !video.ended && video.duration > 0 && video.currentTime > 0) {
        this.saveCurrentProgress(video, movieData);
      }
    }, this.PROGRESS_INTERVAL);

    // Save progress on important events
    const saveProgress = () => this.saveCurrentProgress(video, movieData);
    const forceSaveProgress = () => this.saveCurrentProgress(video, movieData, true);

    video.addEventListener('pause', forceSaveProgress);

    // Enhanced seek handling - save immediately and after a delay to ensure correct time
    video.addEventListener('seeked', () => {
      forceSaveProgress();
      setTimeout(forceSaveProgress, 1000);
    });

    video.addEventListener('ratechange', saveProgress);

    // Save progress before page unload (FORCE SAVE)
    const handleBeforeUnload = () => {
      this.saveCurrentProgress(video, movieData, true);
      this.cleanup();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    // Also save when switching tabs/minimizing
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.saveCurrentProgress(video, movieData, true);
      }
    });
  }

  /**
   * Set up completion detection
   */
  setupCompletionDetection(video) {
    let completionCheckTimeout = null;

    const checkCompletion = () => {
      if (video.duration > 0) {
        const timeRemaining = video.duration - video.currentTime;

        // If within threshold of the end, mark as completed after a delay
        if (timeRemaining <= this.COMPLETION_THRESHOLD) {
          if (completionCheckTimeout) {
            clearTimeout(completionCheckTimeout);
          }

          completionCheckTimeout = setTimeout(() => {
            // Double-check we're still near the end
            const finalTimeRemaining = video.duration - video.currentTime;
            if (finalTimeRemaining <= this.COMPLETION_THRESHOLD) {
              this.markAsCompleted();
            }
          }, 1000); // Wait 1 second to confirm
        } else if (completionCheckTimeout) {
          // Cancel completion if user seeks away from end
          clearTimeout(completionCheckTimeout);
          completionCheckTimeout = null;
        }
      }
    };

    video.addEventListener('timeupdate', checkCompletion);

    // Handle the 'ended' event immediately
    video.addEventListener('ended', () => {
      this.markAsCompleted();
    });
  }

  /**
   * Save current progress with enhanced validation
   */
  saveCurrentProgress(video, movieData, force = false) {
    if (!video.duration || video.duration === 0 || isNaN(video.duration)) {
      return;
    }

    if (!video.currentTime || isNaN(video.currentTime)) {
      return;
    }

    // Additional validation
    if (video.currentTime < 0 || video.currentTime > video.duration) {
      console.warn('Invalid currentTime:', video.currentTime, 'Duration:', video.duration);
      return;
    }

    // Ensure poster is passed along with all its possible field names
    const posterValue = movieData.posterUrl || movieData.poster || movieData.thumbnail || '';

    const progressData = {
      movieId: movieData.movieId,
      title: movieData.title,
      posterUrl: posterValue,
      poster: posterValue,
      thumbnail: posterValue,
      currentTime: Math.floor(video.currentTime),
      duration: Math.floor(video.duration),
      progress: Math.round((video.currentTime / video.duration) * 100),
      playbackRate: video.playbackRate || 1,
      volume: video.volume,
      muted: video.muted
    };

    this.saveMovieProgress(movieData.movieId, progressData, force);
  }

  /**
   * Mark current movie as completed and remove from continue watching
   */
  markAsCompleted() {
    if (this.currentMovieId) {
      this.removeMovieProgress(this.currentMovieId);
      console.log(`Movie ${this.currentMovieId} marked as completed`);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanupExpiredEntries() {
    try {
      const allProgress = this.getAllProgress();
      const now = Date.now();
      let hasChanges = false;

      for (const [movieId, data] of Object.entries(allProgress)) {
        if (data.validUntil && data.validUntil < now) {
          delete allProgress[movieId];
          hasChanges = true;
          console.log('Cleaned up expired entry for:', movieId);
        }
      }

      if (hasChanges && window.FirebaseSync && window.FirebaseSync.initialized) {
        window.FirebaseSync.saveContinueWatching(allProgress).catch(err => {
          console.error('Failed to cleanup expired entries in Firebase:', err);
        });
      }
    } catch (error) {
      console.error('Error cleaning up expired entries:', error);
    }
  }

  /**
   * Format time in MM:SS or HH:MM:SS format
   */
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Clean up timers and event listeners
   */
  cleanup() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    this.currentMovieId = null;
    this.currentVideo = null;
    this.lastSavedTime = 0;
  }
}

// Create global instance
window.ContinueWatchingManager = new ContinueWatchingManager();