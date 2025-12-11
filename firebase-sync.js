// Firebase Sync Module - Replaces localStorage with Firestore for cross-device sync
// This module provides a localStorage-like API but stores data in Firestore

(function() {
  'use strict';

  // Wait for Firebase to be initialized
  function waitForFirebase() {
    return new Promise((resolve) => {
      if (window.firebase && window.firebase.apps.length > 0) {
        resolve();
      } else {
        const checkInterval = setInterval(() => {
          if (window.firebase && window.firebase.apps.length > 0) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      }
    });
  }

  class FirebaseSync {
    constructor() {
      this.db = null;
      this.auth = null;
      this.currentUser = null;
      this.currentProfile = null;
      this.cache = {}; // In-memory cache for quick access
      this.listeners = {}; // Real-time listeners
      this.initialized = false;
      this.initPromise = null;
    }

    async init() {
      if (this.initialized) return;
      if (this.initPromise) return this.initPromise;

      this.initPromise = (async () => {
        await waitForFirebase();
        this.db = firebase.firestore();
        this.auth = firebase.auth();

        // Enable offline persistence
        try {
          await this.db.enablePersistence({ synchronizeTabs: true });
          console.log('Firestore offline persistence enabled');
        } catch (err) {
          if (err.code === 'failed-precondition') {
            console.warn('Persistence failed: Multiple tabs open');
          } else if (err.code === 'unimplemented') {
            console.warn('Persistence not available in this browser');
          }
        }

        // Listen to auth state changes
        this.auth.onAuthStateChanged((user) => {
          this.currentUser = user;
          if (user) {
            this.loadUserData();
          } else {
            this.clearCache();
          }
        });

        this.initialized = true;
      })();

      return this.initPromise;
    }

    // Get the current user's selected profile
    getCurrentProfile() {
      if (!this.currentUser) return null;
      const uid = this.currentUser.uid;
      // Check if profile selection is available
      if (window.FirebaseAuth && typeof window.FirebaseAuth.getSelectedProfile === 'function') {
        const profile = window.FirebaseAuth.getSelectedProfile();
        return profile ? profile.id : null;
      }
      // Fallback to localStorage (temporary during transition)
      return localStorage.getItem(`fb_selected_profile_${uid}`);
    }

    // Get Firestore document path for user data
    getUserDocPath() {
      if (!this.currentUser) return null;
      const uid = this.currentUser.uid;
      const profileId = this.getCurrentProfile();
      if (profileId) {
        return `users/${uid}/profiles/${profileId}`;
      }
      return `users/${uid}`;
    }

    // Load all user data into cache
    async loadUserData() {
      const docPath = this.getUserDocPath();
      if (!docPath) return;

      try {
        const docRef = this.db.doc(docPath);
        
        // Set up real-time listener
        if (this.unsubscribe) this.unsubscribe();
        
        this.unsubscribe = docRef.onSnapshot((doc) => {
          if (doc.exists) {
            const data = doc.data();
            // Update cache with Firestore data
            this.cache = {
              continueWatching: data.continueWatching || {},
              bookmarks: data.bookmarks || {},
              theme: data.theme || 'glossy',
              subtitleSettings: data.subtitleSettings || {},
              playerSettings: data.playerSettings || {}
            };
            console.log('Firestore data synced to cache');
            
            // Trigger custom event for UI updates
            window.dispatchEvent(new CustomEvent('firebase-sync-updated', { detail: this.cache }));
          }
        }, (error) => {
          console.error('Error listening to Firestore:', error);
        });
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }

    clearCache() {
      this.cache = {};
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    }

    // Save data to Firestore
    async saveToFirestore(key, value) {
      const docPath = this.getUserDocPath();
      if (!docPath) {
        console.warn('No user logged in, data not saved');
        return false;
      }

      try {
        const docRef = this.db.doc(docPath);
        await docRef.set({
          [key]: value,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // Update cache
        this.cache[key] = value;
        return true;
      } catch (error) {
        console.error(`Error saving ${key} to Firestore:`, error);
        return false;
      }
    }

    // Get data from Firestore (or cache)
    async getFromFirestore(key, defaultValue = null) {
      // Return from cache if available
      if (this.cache.hasOwnProperty(key)) {
        return this.cache[key];
      }

      const docPath = this.getUserDocPath();
      if (!docPath) {
        return defaultValue;
      }

      try {
        const docRef = this.db.doc(docPath);
        const doc = await docRef.get();
        
        if (doc.exists) {
          const data = doc.data();
          const value = data[key];
          this.cache[key] = value !== undefined ? value : defaultValue;
          return this.cache[key];
        }
        return defaultValue;
      } catch (error) {
        console.error(`Error getting ${key} from Firestore:`, error);
        return defaultValue;
      }
    }

    // Continue Watching Methods
    async getContinueWatching() {
      return await this.getFromFirestore('continueWatching', {});
    }

    async saveContinueWatching(data) {
      return await this.saveToFirestore('continueWatching', data);
    }

    async updateContinueWatchingItem(movieId, movieData) {
      const continueWatching = await this.getContinueWatching();
      continueWatching[movieId] = {
        ...movieData,
        timestamp: Date.now()
      };
      return await this.saveContinueWatching(continueWatching);
    }

    async removeContinueWatchingItem(movieId) {
      const continueWatching = await this.getContinueWatching();
      delete continueWatching[movieId];
      return await this.saveContinueWatching(continueWatching);
    }

    // Bookmarks (My List) Methods
    async getBookmarks() {
      return await this.getFromFirestore('bookmarks', {});
    }

    async saveBookmarks(data) {
      return await this.saveToFirestore('bookmarks', data);
    }

    async addBookmark(movie) {
      const bookmarks = await this.getBookmarks();
      bookmarks[movie.id] = {
        id: movie.id,
        title: movie.title,
        poster: movie.posterUrl || movie.poster || movie.thumbnail || '',
        rating: movie.rating,
        year: movie.year,
        genres: movie.genres,
        timestamp: Date.now()
      };
      return await this.saveBookmarks(bookmarks);
    }

    async removeBookmark(movieId) {
      const bookmarks = await this.getBookmarks();
      delete bookmarks[movieId];
      return await this.saveBookmarks(bookmarks);
    }

    async isBookmarked(movieId) {
      const bookmarks = await this.getBookmarks();
      return !!bookmarks[movieId];
    }

    // Theme Settings Methods
    async getTheme() {
      return await this.getFromFirestore('theme', 'glossy');
    }

    async saveTheme(theme) {
      return await this.saveToFirestore('theme', theme);
    }

    // Subtitle Settings Methods
    async getSubtitleSettings() {
      return await this.getFromFirestore('subtitleSettings', {});
    }

    async saveSubtitleSettings(settings) {
      return await this.saveToFirestore('subtitleSettings', settings);
    }

    // Player Settings Methods
    async getPlayerSettings() {
      return await this.getFromFirestore('playerSettings', {});
    }

    async savePlayerSettings(settings) {
      return await this.saveToFirestore('playerSettings', settings);
    }

    async updatePlayerSetting(key, value) {
      const settings = await this.getPlayerSettings();
      settings[key] = value;
      return await this.savePlayerSettings(settings);
    }

    // Migration helper - Move data from localStorage to Firestore
    async migrateFromLocalStorage() {
      if (!this.currentUser) {
        console.warn('Cannot migrate: No user logged in');
        return false;
      }

      console.log('Starting migration from localStorage to Firestore...');
      
      try {
        const uid = this.currentUser.uid;
        const profileId = this.getCurrentProfile();
        const prefix = profileId ? `${uid}_${profileId}` : uid;

        // Migrate continue watching
        const cwKey = `continueWatching_${prefix}`;
        const continueWatchingStr = localStorage.getItem(cwKey);
        if (continueWatchingStr) {
          const continueWatching = JSON.parse(continueWatchingStr);
          await this.saveContinueWatching(continueWatching);
          console.log('Migrated continue watching data');
        }

        // Migrate bookmarks
        const bookmarksKey = `myList_${prefix}`;
        const bookmarksStr = localStorage.getItem(bookmarksKey);
        if (bookmarksStr) {
          const bookmarks = JSON.parse(bookmarksStr);
          await this.saveBookmarks(bookmarks);
          console.log('Migrated bookmarks data');
        }

        // Migrate theme
        const themeKey = `theme_${prefix}`;
        const theme = localStorage.getItem(themeKey);
        if (theme) {
          await this.saveTheme(theme);
          console.log('Migrated theme setting');
        }

        // Migrate subtitle settings
        const subtitleSettings = localStorage.getItem('subtitleSettings');
        if (subtitleSettings) {
          await this.saveSubtitleSettings(JSON.parse(subtitleSettings));
          console.log('Migrated subtitle settings');
        }

        // Migrate player settings
        const playerVolume = localStorage.getItem('playerVolume');
        const playerMuted = localStorage.getItem('playerMuted');
        if (playerVolume || playerMuted) {
          const playerSettings = await this.getPlayerSettings();
          if (playerVolume) playerSettings.volume = parseFloat(playerVolume);
          if (playerMuted) playerSettings.muted = playerMuted === '1';
          await this.savePlayerSettings(playerSettings);
          console.log('Migrated player settings');
        }

        console.log('Migration completed successfully!');
        return true;
      } catch (error) {
        console.error('Migration error:', error);
        return false;
      }
    }

    // Clear all localStorage (after successful migration)
    clearLocalStorage() {
      // Only clear app-specific keys, not Firebase auth keys
      const keysToKeep = ['firebase:', 'firebaseui::'];
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        let shouldKeep = false;
        for (const keepPrefix of keysToKeep) {
          if (key.startsWith(keepPrefix)) {
            shouldKeep = true;
            break;
          }
        }
        if (!shouldKeep) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${keysToRemove.length} localStorage keys`);
    }
  }

  // Create global instance
  window.FirebaseSync = new FirebaseSync();

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.FirebaseSync.init();
    });
  } else {
    window.FirebaseSync.init();
  }

  // Export for use in other scripts
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseSync;
  }
})();
