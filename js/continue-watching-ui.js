/**
 * Continue Watching UI Component
 * Creates and manages the continue watching section on the homepage
 */
class ContinueWatchingUI {
  constructor(containerSelector = '#moviesContainer') {
    this.container = document.querySelector(containerSelector);
    this.sectionElement = null;
    this.manager = window.ContinueWatchingManager;

    // If the container isn't present on this page, silently no-op
    if (!this.container) return;

    this.init();
  }

  init() {
    // Listen for continue watching updates
    window.addEventListener('continueWatchingUpdated', () => {
      this.render();
    });

    // Initial render - fetch from Firebase if available
    this.render();
  }

  async render() {
    let movies;
    
    // Try to get data from Firebase first (for cloud sync)
    if (window.FirebaseSync && window.FirebaseSync.initialized) {
      try {
        const firebaseData = await window.FirebaseSync.getContinueWatching();
        movies = this.convertFirebaseDataToMovies(firebaseData);
      } catch (error) {
        console.warn('Failed to fetch from Firebase, falling back to localStorage:', error);
        movies = this.manager.getContinueWatchingMovies();
      }
    } else {
      // Fallback to localStorage if Firebase not available
      movies = this.manager.getContinueWatchingMovies();
    }

    if (movies.length === 0) {
      this.removeContinueWatchingSection();
      return;
    }

    this.createOrUpdateContinueWatchingSection(movies);
  }

  convertFirebaseDataToMovies(firebaseData) {
    // Convert Firebase format to UI format
    return Object.entries(firebaseData).map(([id, movie]) => ({
      movieId: movie.movieId || id,
      title: movie.title || 'Untitled',
      thumbnail: movie.posterUrl || movie.poster || movie.thumbnail || '',
      progressPercent: Math.round(movie.progress || 0),
      currentTime: movie.currentTime || 0,
      duration: movie.duration || 1,
      timeRemaining: this.calculateTimeRemaining(movie.currentTime || 0, movie.duration || 1),
      ...movie
    })).filter(movie => {
      // Only show movies with valid progress AND valid poster URL (no placeholders)
      const hasValidPoster = movie.thumbnail && !movie.thumbnail.includes('placeholder');
      return movie.progressPercent > 0 && movie.progressPercent < 95 && movie.title && movie.title !== 'Untitled' && hasValidPoster;
    }).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  calculateTimeRemaining(currentTime, duration) {
    const remaining = Math.max(0, duration - currentTime);
    return this.manager.formatTime ? this.manager.formatTime(remaining) : `${Math.round(remaining / 60)}m`;
  }

  createOrUpdateContinueWatchingSection(movies) {
    // Remove existing section if it exists
    this.removeContinueWatchingSection();

    // Create new section
    this.sectionElement = document.createElement('div');
    this.sectionElement.className = 'continue-watching-section';
    this.sectionElement.innerHTML = `
      <h2 class="section-title">Continue Watching</h2>
      <div class="continue-watching-container">
        ${movies.map(movie => this.createMovieCard(movie)).join('')}
      </div>
    `;

    // Insert at the beginning of the container
    if (this.container.firstChild) {
      this.container.insertBefore(this.sectionElement, this.container.firstChild);
    } else {
      this.container.appendChild(this.sectionElement);
    }

    // Add event listeners
    this.addEventListeners();
  }

  createMovieCard(movie) {
    // Skip movies without valid poster (no placeholders)
    if (!movie.thumbnail || movie.thumbnail.includes('placeholder')) {
      return '';
    }

    return `
      <div class="continue-watching-card" data-movie-id="${movie.movieId}">
        <div class="continue-watching-poster">
          <img src="${movie.thumbnail}" alt="${movie.title}" loading="lazy" />
          <div class="progress-bar">
            <div class="progress" style="width: ${movie.progressPercent}%"></div>
          </div>
          <div class="resume-overlay">
            <div class="resume-button">
              <i class="fas fa-play"></i>
              Resume
            </div>
          </div>
          <div class="remove-button" title="Remove from Continue Watching">
            <i class="fas fa-times"></i>
          </div>
        </div>
        <div class="continue-watching-info">
          <h3>${movie.title}</h3>
          <p>${movie.progressPercent}% watched • ${this.manager.formatTime(movie.timeRemaining)} left</p>
        </div>
      </div>
    `;
  }

  addEventListeners() {
    if (!this.sectionElement) return;

    // Resume button clicks
    this.sectionElement.addEventListener('click', (e) => {
      const card = e.target.closest('.continue-watching-card');
      if (!card) return;

      const movieId = card.dataset.movieId;
      const movie = this.manager.getMovieProgress(movieId);

      if (!movie) return;

      if (e.target.closest('.remove-button')) {
        // Remove from continue watching
        e.stopPropagation();
        this.removeMovie(movieId);
      } else if (e.target.closest('.resume-button') || e.target.closest('.continue-watching-poster')) {
        // Resume playback
        e.stopPropagation();
        this.resumeMovie(movie);
      }
    });
  }

  removeMovie(movieId) {
    if (confirm('Remove this movie from Continue Watching?')) {
      this.manager.removeMovieProgress(movieId);
    }
  }

  resumeMovie(movie) {
    // Calculate the time to resume from (in seconds)
    const resumeTime = Math.floor(movie.currentTime);

    // Generate the base URL with movieId
    let resumeUrl = `player.html?id=${encodeURIComponent(movie.movieId || 'unknown')}&title=${encodeURIComponent(movie.title)}`;

    // Add optional parameters if they exist
    if (movie.year) resumeUrl += `&year=${encodeURIComponent(movie.year)}`;
    if (movie.poster) resumeUrl += `&poster=${encodeURIComponent(movie.poster)}`;
    if (movie.posterUrl) resumeUrl += `&poster=${encodeURIComponent(movie.posterUrl)}`;
    if (movie.thumbnail) resumeUrl += `&thumbnail=${encodeURIComponent(movie.thumbnail)}`;

    // Add the resume time parameter
    resumeUrl += `&t=${resumeTime}`;

    // If on mobile, request landscape orientation before opening player
    if (window.matchMedia && window.matchMedia('(max-width: 600px)').matches && screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }

    // Open the player
    window.location.href = resumeUrl;
  }

  removeContinueWatchingSection() {
    if (this.sectionElement) {
      this.sectionElement.remove();
      this.sectionElement = null;
    }
  }
}

// Auto-initialize when DOM is ready, only if the container exists
(function autoInit() {
  function initIfPresent() {
    if (document.querySelector('#moviesContainer')) {
      new ContinueWatchingUI('#moviesContainer');
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIfPresent);
  } else {
    initIfPresent();
  }
})();