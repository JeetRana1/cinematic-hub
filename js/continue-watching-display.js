/**
 * Continue Watching Display Manager
 * Handles thumbnail display and UI generation for the Continue Watching section
 */
class ContinueWatchingDisplay {
  constructor() {
    this.FALLBACK_POSTER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMUExQTFBIi8+CjxwYXRoIGQ9Ik0xNTAgMjI1TDE3NSAyNDBIMTI1TDE1MCAyMjVaIiBmaWxsPSIjNjY2NjY2Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
    this.imageCache = new Map();
    this.loadingImages = new Set();
    this.retryAttempts = new Map();
    this.MAX_RETRY_ATTEMPTS = 3;
  }

  /**
   * Create the Continue Watching section with proper thumbnail handling
   */
  createContinueWatchingSection() {
    const continueWatchingMovies = this.getContinueWatchingMovies();
    
    if (continueWatchingMovies.length === 0) {
      return null;
    }
    
    const section = document.createElement('div');
    section.className = 'continue-watching-section';
    section.innerHTML = `
      <h2 class="section-title">
        <i class="fas fa-play-circle" style="margin-right: 8px; color: #e50914;"></i>
        Continue Watching
      </h2>
      <div class="continue-watching-container" id="continueWatchingContainer">
        <div class="loading-placeholder">Loading movies...</div>
      </div>
    `;
    
    // Load movies asynchronously to avoid blocking UI
    setTimeout(() => {
      this.loadMovieCards(section.querySelector('#continueWatchingContainer'), continueWatchingMovies);
    }, 0);
    
    return section;
  }

  /**
   * Load movie cards with proper thumbnail handling
   */
  async loadMovieCards(container, movies) {
    container.innerHTML = '';
    
    // Create cards for each movie
    const cardPromises = movies.map(movie => this.createMovieCard(movie));
    const cards = await Promise.all(cardPromises);
    
    // Append all cards to container
    cards.forEach(card => {
      if (card) {
        container.appendChild(card);
      }
    });
    
    // If no cards were created, show empty state
    if (cards.filter(Boolean).length === 0) {
      container.innerHTML = '<div class="empty-state">No movies to continue watching</div>';
    }
  }

  /**
   * Create a movie card with proper thumbnail handling
   */
  async createMovieCard(movie) {
    const title = movie.title || 'Untitled Movie';
    const progress = Math.round(movie.progress || 0);
    const timeLeft = this.formatTime(movie.timeRemaining || 0);
    const currentTime = this.formatTime(movie.currentTime || 0);
    
    // Create card element
    const card = document.createElement('div');
    card.className = 'continue-watching-card';
    card.dataset.movieId = movie.movieId;
    
    // Create card structure
    card.innerHTML = `
      <div class="continue-watching-poster">
        <div class="thumbnail-container">
          <div class="thumbnail-loading">
            <div class="spinner-small"></div>
          </div>
          <img class="thumbnail-image" alt="${title}" style="display: none;" />
        </div>
        <div class="progress-bar">
          <div class="progress" style="width: ${progress}%"></div>
        </div>
        <div class="resume-overlay">
          <div class="resume-button" aria-label="Resume">
            <svg class="resume-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7-11-7z"></path>
            </svg>
            <span class="resume-label">Resume</span>
          </div>
        </div>
        <div class="remove-button" title="Remove from Continue Watching">
          <i class="fas fa-times"></i>
        </div>
        <div class="progress-indicator">${progress}%</div>
      </div>
      <div class="continue-watching-info">
        <h3 title="${title}">${title}</h3>
        <p class="progress-text">${currentTime} watched • ${timeLeft} left</p>
        <p class="last-watched">Last watched: ${movie.lastWatched || 'Recently'}</p>
      </div>
    `;
    
    // Load thumbnail
    await this.loadThumbnail(card, movie);
    
    // Add event listeners
    this.addCardEventListeners(card, movie);
    
    return card;
  }

  /**
   * Load thumbnail with fallback mechanisms
   */
  async loadThumbnail(card, movie) {
    const thumbnailContainer = card.querySelector('.thumbnail-container');
    const thumbnailImage = card.querySelector('.thumbnail-image');
    const loadingIndicator = card.querySelector('.thumbnail-loading');
    
    // Get potential thumbnail URLs
    const thumbnailUrls = this.getThumbnailUrls(movie);
    
    let imageLoaded = false;
    
    // Try each URL until one works
    for (const url of thumbnailUrls) {
      if (imageLoaded) break;
      
      try {
        const validUrl = await this.validateAndLoadImage(url);
        if (validUrl) {
          thumbnailImage.src = validUrl;
          thumbnailImage.style.display = 'block';
          loadingIndicator.style.display = 'none';
          imageLoaded = true;
          
          // Cache successful URL
          this.imageCache.set(movie.movieId, validUrl);
          console.log('Thumbnail loaded successfully:', validUrl);
        }
      } catch (error) {
        console.warn('Failed to load thumbnail:', url, error);
        continue;
      }
    }
    
    // If no image loaded, use fallback
    if (!imageLoaded) {
      this.setFallbackThumbnail(thumbnailImage, loadingIndicator, movie.title);
    }
  }

  /**
   * Get potential thumbnail URLs in order of preference
   */
  getThumbnailUrls(movie) {
    const urls = [];
    const title = movie.title || '';
    const movieId = movie.movieId || '';
    
    // 1. Stored poster URL (highest priority)
    if (movie.posterUrl) {
      urls.push(movie.posterUrl);
    }
    
    // 2. Check cache
    if (this.imageCache.has(movieId)) {
      urls.push(this.imageCache.get(movieId));
    }
    
    // 3. Common poster paths
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const posterPaths = [
      `posters/${movieId}.jpg`,
      `posters/${movieId}.png`,
      `posters/${movieId}.webp`,
      `images/posters/${movieId}.jpg`,
      `images/posters/${movieId}.png`,
      `assets/posters/${movieId}.jpg`,
      `assets/images/${movieId}.jpg`,
      `posters/${normalizedTitle}.jpg`,
      `posters/${normalizedTitle}.png`,
      `images/${normalizedTitle}.jpg`,
      `images/${normalizedTitle}.png`
    ];
    
    urls.push(...posterPaths);
    
    // 4. TMDB-style URLs if movie has TMDB data
    if (movie.tmdbId) {
      urls.push(`https://image.tmdb.org/t/p/w300${movie.posterPath}`);
      urls.push(`https://image.tmdb.org/t/p/w500${movie.posterPath}`);
    }
    
    // 5. Generated placeholder as last resort
    urls.push(this.generatePlaceholderUrl(title));
    
    // Remove duplicates and empty URLs
    return [...new Set(urls.filter(Boolean))];
  }

  /**
   * Validate and load image with retry mechanism
   */
  validateAndLoadImage(url) {
    return new Promise((resolve, reject) => {
      // Check if already loading
      if (this.loadingImages.has(url)) {
        setTimeout(() => {
          if (this.imageCache.has(url)) {
            resolve(this.imageCache.get(url));
          } else {
            reject(new Error('Image loading timeout'));
          }
        }, 5000);
        return;
      }
      
      this.loadingImages.add(url);
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      const cleanup = () => {
        this.loadingImages.delete(url);
      };
      
      img.onload = () => {
        cleanup();
        // Verify image has valid dimensions
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          this.imageCache.set(url, url);
          resolve(url);
        } else {
          reject(new Error('Invalid image dimensions'));
        }
      };
      
      img.onerror = () => {
        cleanup();
        const attempts = this.retryAttempts.get(url) || 0;
        
        if (attempts < this.MAX_RETRY_ATTEMPTS) {
          this.retryAttempts.set(url, attempts + 1);
          // Retry with exponential backoff
          setTimeout(() => {
            this.validateAndLoadImage(url).then(resolve).catch(reject);
          }, Math.pow(2, attempts) * 1000);
        } else {
          reject(new Error('Max retry attempts reached'));
        }
      };
      
      // Set timeout for loading
      setTimeout(() => {
        if (this.loadingImages.has(url)) {
          cleanup();
          reject(new Error('Image loading timeout'));
        }
      }, 10000);
      
      img.src = url;
    });
  }

  /**
   * Set fallback thumbnail
   */
  setFallbackThumbnail(thumbnailImage, loadingIndicator, title) {
    console.log('Using fallback thumbnail for:', title);
    
    loadingIndicator.style.display = 'none';
    thumbnailImage.src = this.generatePlaceholderUrl(title);
    thumbnailImage.style.display = 'block';
    thumbnailImage.classList.add('fallback-image');
  }

  /**
   * Generate placeholder URL
   */
  generatePlaceholderUrl(title) {
    const encodedTitle = encodeURIComponent(title || 'Movie');
    return `https://via.placeholder.com/300x450/1a1a1a/ffffff?text=${encodedTitle}`;
  }

  /**
   * Add event listeners to card
   */
  addCardEventListeners(card, movie) {
    // Click to resume (except on remove button)
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.remove-button')) {
        this.resumeMovie(movie);
      }
    });
    
    // Remove button
    const removeBtn = card.querySelector('.remove-button');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeMovie(movie, card);
    });
    
    // Hover effects
    card.addEventListener('mouseenter', () => {
      card.classList.add('hovered');
    });
    
    card.addEventListener('mouseleave', () => {
      card.classList.remove('hovered');
    });
  }

  /**
   * Resume movie playback
   */
  resumeMovie(movie) {
    console.log('Resuming movie:', movie.title);

    // Honor whichever player was last used
    const playerBase = localStorage.getItem('lastPlayerUsed') === 'player2' ? 'player-2.html' : 'player.html';

    // Build resume URL
    const params = new URLSearchParams();
    params.append('movieId', movie.movieId);
    params.append('id', movie.movieId); // legacy id support
    params.append('title', movie.title);
    if (movie.posterUrl) params.append('poster', movie.posterUrl);
    params.append('t', Math.floor(movie.currentTime));
    
    // Determine video source type and add appropriate parameters
    const resumeUrl = this.buildResumeUrl(movie, params, playerBase);
    
    if (resumeUrl) {
      window.open(resumeUrl, '_blank');
    } else {
      this.showToast('error', 'Resume Failed', 'Unable to resume this movie. The video source may no longer be available.');
    }
  }

  /**
   * Build resume URL with proper video source
   */
  buildResumeUrl(movie, params, playerBase = 'player.html') {
    // Check for available video sources (you'll need to adapt this to your video source logic)
    const movieId = movie.movieId;
    const title = movie.title.toLowerCase();
    
    // Check MP4 overrides (adapt to your mp4Overrides object)
    if (window.mp4Overrides && window.mp4Overrides[title]) {
      params.append('type', 'mp4');
      params.append('src', window.mp4Overrides[title]);
      return `${playerBase}?${params.toString()}`;
    }
    
    // Check Drive mappings (adapt to your driveMovieMappings object)
    if (window.driveMovieMappings && window.driveMovieMappings[movieId]) {
      params.append('type', 'drive');
      params.append('id', window.driveMovieMappings[movieId]);
      return `${playerBase}?${params.toString()}`;
    }
    
    // Fallback to basic player URL
    return `${playerBase}?${params.toString()}`;
  }

  /**
   * Remove movie from continue watching
   */
  removeMovie(movie, cardElement) {
    const title = movie.title || 'this movie';
    
    if (confirm(`Remove "${title}" from Continue Watching?`)) {
      // Remove from localStorage
      if (window.ContinueWatchingManager) {
        window.ContinueWatchingManager.removeMovieProgress(movie.movieId);
      } else {
        // Fallback removal
        const allProgress = JSON.parse(localStorage.getItem('continueWatching') || '{}');
        delete allProgress[movie.movieId];
        localStorage.setItem('continueWatching', JSON.stringify(allProgress));
      }
      
      // Animate card removal
      cardElement.style.transition = 'all 0.3s ease';
      cardElement.style.transform = 'translateY(-20px)';
      cardElement.style.opacity = '0';
      
      setTimeout(() => {
        cardElement.remove();
        
        // Check if section is now empty
        const container = document.getElementById('continueWatchingContainer');
        if (container && container.children.length === 0) {
          const section = container.closest('.continue-watching-section');
          if (section) {
            section.remove();
          }
        }
      }, 300);
      
      this.showToast('success', 'Removed', `"${title}" removed from Continue Watching`);
    }
  }

  /**
   * Get continue watching movies from localStorage
   */
  getContinueWatchingMovies() {
    try {
      const allProgress = JSON.parse(localStorage.getItem('continueWatching') || '{}');
      const movies = [];
      const now = Date.now();
      const COMPLETION_THRESHOLD = 5;
      const MIN_WATCH_TIME = 30;

      for (const [movieId, data] of Object.entries(allProgress)) {
        // Skip expired entries
        if (data.validUntil && data.validUntil < now) continue;

        // Only include movies that aren't completed and have meaningful progress
        const timeRemaining = data.duration - data.currentTime;
        if (timeRemaining > COMPLETION_THRESHOLD && data.currentTime >= MIN_WATCH_TIME) {
          movies.push({
            ...data,
            timeRemaining,
            progressPercent: Math.round((data.currentTime / data.duration) * 100),
            lastWatched: new Date(data.updatedAt).toLocaleDateString()
          });
        }
      }

      return movies.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Error getting continue watching movies:', error);
      return [];
    }
  }

  /**
   * Format time helper
   */
  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    
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
   * Show toast notification
   */
  showToast(type, title, message) {
    // Use existing toast system if available
    if (window.showToast) {
      window.showToast(type, title, message);
    } else {
      // Fallback notification
      console.log(`${type.toUpperCase()}: ${title} - ${message}`);
      alert(`${title}: ${message}`);
    }
  }

  /**
   * Update the continue watching section
   */
  updateContinueWatchingSection() {
    const existingSection = document.querySelector('.continue-watching-section');
    if (existingSection) {
      existingSection.remove();
    }
    
    const newSection = this.createContinueWatchingSection();
    if (newSection) {
      const moviesContainer = document.getElementById('moviesContainer');
      if (moviesContainer && moviesContainer.firstChild) {
        moviesContainer.insertBefore(newSection, moviesContainer.firstChild);
      } else if (moviesContainer) {
        moviesContainer.appendChild(newSection);
      }
    }
  }
}

// Create global instance
window.ContinueWatchingDisplay = new ContinueWatchingDisplay();