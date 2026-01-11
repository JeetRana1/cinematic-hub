/**
 * TMDB Integration for Cinematic Hubs
 * Replaces local movies with TMDB data
 * Connects search bar to TMDB
 * Adds stream links
 */

// Global variable initialized from index.html
let allMovies = [];
let allTV = [];
let currentPage = 1;
let totalPages = 1;
let genreMap = null;
let isLoadingMore = false;
let hasMorePages = true;
let tmdbMode = 'movie'; // 'movie' | 'tv'
let currentListMode = 'popular'; // 'popular' | 'language'
let seenIds = new Set();
let currentCategoryLangs = null; // array of langs for current language feed
let languagePaging = {}; // { lang: { current: 1, total: N } }

function mapGenres(ids = []) {
  if (!genreMap) return [];
  return ids.map(id => genreMap.get(id)).filter(Boolean);
}

function mapTmdbItem(item, mediaType = 'movie') {
  const isTV = mediaType === 'tv' || !!item.first_air_date || !!item.name;
  const title = isTV ? (item.title || item.name) : (item.title || item.name);
  const releaseDate = item.releaseDate || item.release_date || item.first_air_date;
  const year = releaseDate ? String(releaseDate).split('-')[0] : '';
  return {
    id: item.id,
    title: title,
    year: year,
    genres: mapGenres(item.genreIds || item.genre_ids || []),
    rating: item.rating || item.vote_average || null,
    overview: item.overview,
    release_date: releaseDate,
    posterUrl: item.poster || item.posterUrl || (item.poster_path ? `${movieDb.imageUrl}${item.poster_path}` : null),
    backdropUrl: item.backdrop || (item.backdrop_path ? `${movieDb.imageUrl}${item.backdrop_path}` : null),
    trailerUrl: item.trailerUrl || '',
    streamUrl: item.streamUrl || '',
    originalLanguage: item.originalLanguage || item.original_language || null,
    mediaType: isTV ? 'tv' : 'movie'
  };
}

async function ensureGenres() {
  if (genreMap || !movieDb) return;
  try {
    const [movieGenres, tvGenres] = await Promise.all([
      movieDb.getGenres(),
      typeof movieDb.getTVGenres === 'function' ? movieDb.getTVGenres() : Promise.resolve([])
    ]);
    const combined = [...(movieGenres || []), ...(tvGenres || [])];
    genreMap = new Map(combined.map(g => [g.id, g.name]));
  } catch (error) {
    console.warn('Unable to load TMDB genres', error);
    genreMap = new Map();
  }
}

/**
 * Load popular TMDB movies across multiple pages
 */
async function loadAllTMDBMovies(maxPages = 3) {
  if (!movieDb) {
    console.warn('Movie database not initialized');
    return [];
  }

  try {
    await ensureGenres();

    const first = await movieDb.getPopularMovies(1);
    totalPages = first.totalPages;
    currentPage = 1;
    const pageLimit = Math.min(maxPages, totalPages);
    hasMorePages = currentPage < totalPages;

    const movies = [...first.movies];

    for (let p = 2; p <= pageLimit; p++) {
      const pageData = await movieDb.getPopularMovies(p);
      movies.push(...pageData.movies);
      currentPage = p;
      hasMorePages = currentPage < totalPages;
    }

    allMovies = movies.map(m => mapTmdbItem(m, 'movie'));
    seenIds = new Set(allMovies.map(m => m.id));
    currentListMode = 'popular';

    if (typeof curatedMovies !== 'undefined' && Array.isArray(curatedMovies)) {
      curatedMovies.splice(0, curatedMovies.length, ...allMovies);
    }

    if (typeof useTMDBCatalog === 'undefined') {
      window.useTMDBCatalog = true;
    } else {
      useTMDBCatalog = true;
    }

    return allMovies;
  } catch (error) {
    console.error('Failed to load TMDB movies:', error);
    return [];
  }
}

/**
 * Load popular TMDB TV shows across multiple pages
 */
async function loadAllTMDBTV(maxPages = 3) {
  if (!movieDb) {
    console.warn('Movie database not initialized');
    return [];
  }

  try {
    await ensureGenres();

    const first = await movieDb.getPopularTV(1);
    totalPages = first.totalPages;
    currentPage = 1;
    const pageLimit = Math.min(maxPages, totalPages);
    hasMorePages = currentPage < totalPages;

    const shows = [...first.movies];

    for (let p = 2; p <= pageLimit; p++) {
      const pageData = await movieDb.getPopularTV(p);
      shows.push(...pageData.movies);
      currentPage = p;
      hasMorePages = currentPage < totalPages;
    }

    allTV = shows.map(s => mapTmdbItem(s, 'tv'));
    currentListMode = 'popular';

    if (typeof useTMDBCatalog === 'undefined') {
      window.useTMDBCatalog = true;
    } else {
      useTMDBCatalog = true;
    }

    return allTV;
  } catch (error) {
    console.error('Failed to load TMDB TV shows:', error);
    return [];
  }
}

/**
 * Load TMDB movies specifically by language set for categories
 */
async function loadTMDBByLanguage(category, maxPages = 10) {
  if (!movieDb) {
    console.warn('Movie database not initialized');
    return [];
  }

  const langSets = {
    bollywood: ['hi'],
    tollywood: ['te', 'ta', 'ml', 'kn']
  };
  const langs = langSets[category];
  if (!langs) return [];

  try {
    await ensureGenres();

    const combined = [];
    seenIds = new Set();
    currentCategoryLangs = langs.slice();
    languagePaging = {};

    for (const lang of langs) {
      const first = await movieDb.discoverMoviesByLanguage(lang, 1);
      const pageLimit = Math.min(maxPages, first.totalPages || 1);
      languagePaging[lang] = { current: 1, total: first.totalPages || 1 };
      const batch = [first.movies];
      for (let p = 2; p <= pageLimit; p++) {
        const pageData = await movieDb.discoverMoviesByLanguage(lang, p);
        batch.push(pageData.movies);
      }
      const flat = batch.flat();
      flat.forEach(m => {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          combined.push(mapTmdbItem(m, 'movie'));
        }
      });
    }

    // If results are too few, pad using filtered popular movies
    if (combined.length < 24) {
      try {
        const popularFallback = await loadAllTMDBMovies(5);
        const padded = filterTMDBByCategory(popularFallback, category) || [];
        padded.forEach(m => {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            combined.push(m);
          }
        });
      } catch (e) {
        console.warn('Fallback padding failed:', e);
      }
    }

    // update scroll state
    hasMorePages = Object.values(languagePaging).some(p => p.current < p.total);
    currentPage = 1; // not used in language mode
    totalPages = Math.max(...Object.values(languagePaging).map(p => p.total));
    currentListMode = 'language';

    if (typeof useTMDBCatalog === 'undefined') {
      window.useTMDBCatalog = true;
    } else {
      useTMDBCatalog = true;
    }

    return combined;
  } catch (error) {
    console.error('Failed to load TMDB by language:', error);
    return [];
  }
}

/**
 * Load next page of TMDB movies for infinite scroll
 */
async function loadMoreTMDBMovies() {
  if (!movieDb || isLoadingMore || !hasMorePages) return [];

  isLoadingMore = true;
  try {
    await ensureGenres();

    const nextPage = currentPage + 1;
    if (nextPage > totalPages) {
      hasMorePages = false;
      isLoadingMore = false;
      return [];
    }

    const pageData = await movieDb.getPopularMovies(nextPage);
    currentPage = nextPage;
    hasMorePages = currentPage < totalPages;

    const newMovies = pageData.movies.map(mapTmdbMovie);
    allMovies.push(...newMovies);

    if (typeof curatedMovies !== 'undefined' && Array.isArray(curatedMovies)) {
      curatedMovies.push(...newMovies);
    }

    isLoadingMore = false;
    return newMovies;
  } catch (error) {
    console.error('Failed to load more TMDB movies:', error);
    isLoadingMore = false;
    return [];
  }
}

/**
 * Load next page of TMDB TV shows for infinite scroll
 */
async function loadMoreTMDBTV() {
  if (!movieDb || isLoadingMore || !hasMorePages) return [];

  isLoadingMore = true;
  try {
    await ensureGenres();

    const nextPage = currentPage + 1;
    if (nextPage > totalPages) {
      hasMorePages = false;
      isLoadingMore = false;
      return [];
    }

    const pageData = await movieDb.getPopularTV(nextPage);
    currentPage = nextPage;
    hasMorePages = currentPage < totalPages;

    const newShows = pageData.movies.map(s => mapTmdbItem(s, 'tv'));
    allTV.push(...newShows);

    isLoadingMore = false;
    return newShows;
  } catch (error) {
    console.error('Failed to load more TMDB TV shows:', error);
    isLoadingMore = false;
    return [];
  }
}

/**
 * Search TMDB and update display
 */
async function searchTMDB(query) {
  if (!movieDb) return;

  if (!query) {
    if (tmdbMode === 'tv') {
      const popularTV = await loadAllTMDBTV();
      displayMovies(popularTV, false, 'Series');
    } else {
      const popular = await loadAllTMDBMovies();
      displayMovies(popular, false, 'All Movies');
    }
    return;
  }

  try {
    const results = tmdbMode === 'tv' ? await movieDb.searchTV(query) : await movieDb.searchMovies(query);
    const mapped = (results.movies || []).map(it => mapTmdbItem(it, tmdbMode));
    if (mapped.length > 0) {
      displayMovies(mapped, true, `Search Results for "${query}"`);
    } else {
      displayMovies([], true, `No results for "${query}"`);
    }
  } catch (error) {
    console.error('Search failed:', error);
    displayMovies([], true, 'Search failed');
  }
}

/**
 * Load catalog and render
 */
async function initializeTMDBIntegration() {
  if (!movieDb) {
    console.warn('Movie database not initialized');
    return;
  }

  const tmdbMovies = await loadAllTMDBMovies(3);
  if (tmdbMovies.length > 0) {
    displayMovies(tmdbMovies, false, 'TMDB Popular');
  }

  // Setup infinite scroll
  setupInfiniteScroll();
}

/**
 * Setup infinite scroll for TMDB catalog
 */
function setupInfiniteScroll() {
  let scrollTimeout;
  
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(async () => {
      if (!useTMDBCatalog || !hasMorePages || isLoadingMore) return;

      const scrollPosition = window.innerHeight + window.scrollY;
      const threshold = document.documentElement.scrollHeight - 800;

      if (scrollPosition >= threshold) {
        if (tmdbMode === 'tv') {
          const newShows = await loadMoreTMDBTV();
          if (newShows.length > 0) appendMoviesToGrid(newShows);
        } else if (currentListMode === 'language') {
          const newLangMovies = await loadMoreTMDBByLanguage();
          if (newLangMovies.length > 0) appendMoviesToGrid(newLangMovies);
        } else {
          const newMovies = await loadMoreTMDBMovies();
          if (newMovies.length > 0) appendMoviesToGrid(newMovies);
        }
      }
    }, 100);
  });
}

/**
 * Append movies to existing grid without full re-render
 */
function appendMoviesToGrid(movies) {
  const moviesGrid = document.querySelector('.movies-grid');
  if (!moviesGrid) return;

  movies.forEach(movie => {
    const title = movie.title || 'Untitled';
    const posterPath = movie.posterUrl || ('https://via.placeholder.com/500x750?text=' + encodeURIComponent(title));

    const movieCard = document.createElement('div');
    movieCard.className = 'movie-card movie-' + movie.id;
    movieCard.innerHTML = `
      <div class="movie-code-badge">MOVIE_${movie.id}</div>
      <div class="poster">
        <img src="${posterPath}" alt="${title}" loading="lazy" />
        <div class="play-icon"></div>
        <div class="movie-title-overlay">${title}</div>
      </div>
      <div class="movie-info">
        <h3 class="movie-title">${title} (${movie.year || ''})</h3>
        <p class="movie-rating">⭐ ${movie.rating ? movie.rating.toFixed(1) : 'N/A'}</p>
      </div>
    `;

    movieCard.addEventListener('click', () => {
      if (typeof openMovieModal === 'function') {
        openMovieModal(movie);
      }
    });
    
    moviesGrid.appendChild(movieCard);
  });
}

/**
 * Load next page for language-based feeds across configured languages
 */
async function loadMoreTMDBByLanguage() {
  if (!movieDb || isLoadingMore || !hasMorePages || !currentCategoryLangs) return [];

  isLoadingMore = true;
  try {
    // find first language with remaining pages
    let nextLang = null;
    for (const lang of currentCategoryLangs) {
      const p = languagePaging[lang];
      if (p && p.current < p.total) { nextLang = lang; break; }
    }
    if (!nextLang) { hasMorePages = false; isLoadingMore = false; return []; }

    const nextPage = languagePaging[nextLang].current + 1;
    const pageData = await movieDb.discoverMoviesByLanguage(nextLang, nextPage);
    languagePaging[nextLang].current = nextPage;

    const newMovies = (pageData.movies || []).map(m => mapTmdbItem(m, 'movie'))
      .filter(m => {
        if (seenIds.has(m.id)) return false;
        seenIds.add(m.id);
        return true;
      });

    hasMorePages = Object.values(languagePaging).some(p => p.current < p.total);
    isLoadingMore = false;
    return newMovies;
  } catch (error) {
    console.error('Failed to load more TMDB by language:', error);
    isLoadingMore = false;
    return [];
  }
}

/**
 * Category filtering for TMDB lists by language
 */
function filterTMDBByCategory(items, category) {
  if (!Array.isArray(items)) return [];
  if (!category || category === 'all') return items;
  const langSets = {
    bollywood: ['hi'],
    tollywood: ['te', 'ta', 'ml', 'kn']
  };
  const langs = langSets[category];
  if (!langs) return items;
  return items.filter(m => langs.includes((m.originalLanguage || m.original_language || '').toLowerCase()));
}

/**
 * Public helpers to toggle TMDB mode
 */
function setTMDBMode(mode) {
  tmdbMode = mode === 'tv' ? 'tv' : 'movie';
}

// Expose functions globally
window.setTMDBMode = setTMDBMode;
window.loadAllTMDBTV = loadAllTMDBTV;
window.loadAllTMDBMovies = loadAllTMDBMovies;
window.filterTMDBByCategory = filterTMDBByCategory;
window.loadTMDBByLanguage = loadTMDBByLanguage;
// no need to expose loadMoreTMDBByLanguage; used internally by infinite scroll
