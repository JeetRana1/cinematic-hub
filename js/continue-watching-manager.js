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
   * Compute storage key scoped to current user/profile
   */
  getStorageKey() {
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
      // First check if we have Firebase sync available
      if (window.FirebaseSync && window.FirebaseSync.initialized && window.FirebaseSync.cache) {
        const cloudData = window.FirebaseSync.cache['continueWatching'];
        if (cloudData && typeof cloudData === 'object') {
          console.log('Using continue watching from Firebase cache:', Object.keys(cloudData).length, 'items');
          return cloudData;
        }
      }

      // Check Firestore directly (for newer implementation)
      const user = (window.FirebaseAuth && typeof window.FirebaseAuth.getUser === 'function')
        ? window.FirebaseAuth.getUser()
        : null;
      
      if (user && user.uid && window.FirebaseAuth.firestore) {
        // Return empty object for now, will be populated by async load
        // The UI should use the async getContinueWatchingAsync method
        console.log('Firebase available but data not in cache yet, use async method');
        return {};
      }

      // No cloud storage available
      console.warn('No cloud storage available for continue watching');
      return {};
    } catch (error) {
      console.error('Error reading continue watching data:', error);
      return {};
    }
  }

  /**
   * Get all continue watching data from Firebase asynchronously
   */
  async getAllProgressAsync() {
    try {
      // Try FirebaseSync first
      if (window.FirebaseSync && window.FirebaseSync.initialized) {
        const data = await window.FirebaseSync.getContinueWatching();
        return data || {};
      }

      // Fallback to Firestore direct access
      const user = (window.FirebaseAuth && typeof window.FirebaseAuth.getUser === 'function')
        ? window.FirebaseAuth.getUser()
        : null;
      
      if (user && user.uid && window.FirebaseAuth.firestore) {
        const snapshot = await window.FirebaseAuth.firestore
          .collection('users')
          .doc(user.uid)
          .collection('continueWatching')
          .get();
        
        const data = {};
        snapshot.docs.forEach(doc => {
          data[doc.id] = doc.data();
        });
        return data;
      }

      return {};
    } catch (error) {
      console.error('Error reading continue watching data async:', error);
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

      const movieProgress = {
        movieId: movieId,
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

      console.log('Progress saved to cloud for', movieId, ':', Math.round(progressData.currentTime), 's');

      // Save to Firestore ONLY (cloud-only, no localStorage)
      const user = (window.FirebaseAuth && typeof window.FirebaseAuth.getUser === 'function')
        ? window.FirebaseAuth.getUser()
        : null;
      
      if (user && user.uid && window.FirebaseAuth.firestore) {
        const docRef = window.FirebaseAuth.firestore
          .collection('users')
          .doc(user.uid)
          .collection('continueWatching')
          .doc(movieId);
        
        docRef.set(movieProgress).then(() => {
          console.log('Successfully saved to Firestore');
          
          // Update Firebase Sync cache if available
          if (window.FirebaseSync && window.FirebaseSync.cache) {
            if (!window.FirebaseSync.cache['continueWatching']) {
              window.FirebaseSync.cache['continueWatching'] = {};
            }
            window.FirebaseSync.cache['continueWatching'][movieId] = movieProgress;
          }

          // Dispatch custom event for live updates
          window.dispatchEvent(new CustomEvent('continueWatchingUpdated', {
            detail: { movieId, progressData: movieProgress }
          }));
        }).catch((err) => {
          console.error('Failed to save continue watching to Firestore:', err);
        });
      } else {
        console.warn('Cannot save progress: User not authenticated or Firestore not available');
      }
    } catch (error) {
      console.error('Error saving continue watching data:', error);
    }
  }

  /**
   * Remove a movie from continue watching (cloud-only)
   */
  removeMovieProgress(movieId) {
    try {
      console.log('Removing progress from cloud for', movieId);

      // Remove from Firebase Sync cache
      if (window.FirebaseSync && window.FirebaseSync.cache && window.FirebaseSync.cache['continueWatching']) {
        delete window.FirebaseSync.cache['continueWatching'][movieId];
      }

      // Dispatch custom event for live updates
      window.dispatchEvent(new CustomEvent('continueWatchingUpdated', {
        detail: { movieId, removed: true }
      }));

      // Remove from Firestore
      if (window.FirebaseAuth && typeof window.FirebaseAuth.getUser === 'function') {
        const user = window.FirebaseAuth.getUser();
        if (user && user.uid && window.FirebaseAuth.firestore) {
          const docRef = window.FirebaseAuth.firestore
            .collection('users')
            .doc(user.uid)
            .collection('continueWatching')
            .doc(movieId);
          docRef.delete().catch((err) => {
            console.error('Failed to delete continue watching from Firestore:', err);
          });
        }
      }
    } catch (error) {
      console.error('Error removing continue watching data:', error);
    }
  }

  /**
   * Clear all continue watching data (cloud-only)
   */
  clearAll() {
    try {
      console.log('Clearing all continue watching data from cloud');

      // Clear Firebase Sync cache
      if (window.FirebaseSync && window.FirebaseSync.cache) {
        window.FirebaseSync.cache['continueWatching'] = {};
      }

      // Dispatch custom event for live updates
      window.dispatchEvent(new CustomEvent('continueWatchingUpdated', {
        detail: { cleared: true }
      }));

      // Also sync to Firebase if available
      if (window.FirebaseSync && window.FirebaseSync.initialized) {
        window.FirebaseSync.saveContinueWatching({}).catch(err => {
          console.warn('Failed to sync continue watching to Firebase:', err);
        });
      }

      // Sync to Firestore for cross-device support
      if (window.FirebaseAuth && typeof window.FirebaseAuth.getUser === 'function') {
        const user = window.FirebaseAuth.getUser();
        if (user && user.uid && window.FirebaseAuth.firestore) {
          // Delete all continue watching documents for this user
          const collectionRef = window.FirebaseAuth.firestore
            .collection('users')
            .doc(user.uid)
            .collection('continueWatching');
          
          collectionRef.get().then(snapshot => {
            const batch = window.FirebaseAuth.firestore.batch();
            snapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            return batch.commit();
          }).catch((err) => {
            console.error('Failed to clear continue watching from Firestore:', err);
          });
        }
      }
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
   * Get movies suitable for continue watching (async version for cloud data)
   */
  async getContinueWatchingMoviesAsync() {
    const allProgress = await this.getAllProgressAsync();
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

    return `player.html?${params.toString()}`;
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

    video.addEventListener('pause', saveProgress);
    video.addEventListener('seeked', saveProgress);
    video.addEventListener('ratechange', saveProgress);

    // Save progress before page unload
    const handleBeforeUnload = () => {
      this.saveCurrentProgress(video, movieData);
      this.cleanup();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
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
  saveCurrentProgress(video, movieData) {
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

    const progressData = {
      movieId: movieData.movieId,
      title: movieData.title,
      posterUrl: movieData.posterUrl || movieData.thumbnail,
      currentTime: Math.floor(video.currentTime),
      duration: Math.floor(video.duration),
      progress: Math.round((video.currentTime / video.duration) * 100),
      playbackRate: video.playbackRate || 1,
      volume: video.volume,
      muted: video.muted
    };

    this.saveMovieProgress(movieData.movieId, progressData);
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

      if (hasChanges) {
        localStorage.setItem(this.getStorageKey(), JSON.stringify(allProgress));
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