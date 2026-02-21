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

// Trending data state
let currentTrendingMovies = [];
let trendingRefreshInterval = null;
let lastTrendingUpdateTime = 0;

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
 * Check if a movie/show has been released (past release date)
 */
function isReleased(item) {
  const releaseDate = item.release_date || item.releaseDate || item.first_air_date;
  if (!releaseDate) return true; // Allow items without date info
  const releaseTime = new Date(releaseDate).getTime();
  const now = new Date().getTime();
  return releaseTime <= now;
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
    
    // Check if we got actual data
    if (!first || !first.movies || first.movies.length === 0) {
      console.warn('TMDB returned empty results, using fallback');
      return getFallbackMovies();
    }
    
    totalPages = first.totalPages;
    currentPage = 1;
    const pageLimit = Math.min(maxPages, totalPages);
    hasMorePages = currentPage < totalPages;

    const movies = [...first.movies];

    for (let p = 2; p <= pageLimit; p++) {
      const pageData = await movieDb.getPopularMovies(p);
      if (pageData && pageData.movies && pageData.movies.length > 0) {
        movies.push(...pageData.movies);
        currentPage = p;
        hasMorePages = currentPage < totalPages;
      }
    }

    allMovies = movies.filter(isReleased).map(m => mapTmdbItem(m, 'movie')).sort(sortByReleaseDesc);
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
    // Return fallback movies instead of empty array
    return getFallbackMovies();
  }
}

/**
 * Fallback movies when TMDB API is unavailable
 */
function getFallbackMovies() {
  return [
    {
      id: 550,
      title: 'Fight Club',
      year: '1999',
      genres: ['Drama', 'Thriller'],
      rating: 8.8,
      overview: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.',
      posterUrl: 'https://via.placeholder.com/500x750?text=Fight+Club',
      mediaType: 'movie'
    },
    {
      id: 278,
      title: 'The Shawshank Redemption',
      year: '1994',
      genres: ['Drama'],
      rating: 9.3,
      overview: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
      posterUrl: 'https://via.placeholder.com/500x750?text=Shawshank+Redemption',
      mediaType: 'movie'
    },
    {
      id: 238,
      title: 'The Godfather',
      year: '1972',
      genres: ['Crime', 'Drama'],
      rating: 9.2,
      overview: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant youngest son.',
      posterUrl: 'https://via.placeholder.com/500x750?text=The+Godfather',
      mediaType: 'movie'
    },
    {
      id: 240,
      title: 'The Godfather Part II',
      year: '1974',
      genres: ['Crime', 'Drama'],
      rating: 9.0,
      overview: 'The continuation of the saga of the Corleone crime family.',
      posterUrl: 'https://via.placeholder.com/500x750?text=Godfather+II',
      mediaType: 'movie'
    },
    {
      id: 968,
      title: 'The Dark Knight',
      year: '2008',
      genres: ['Action', 'Crime', 'Drama'],
      rating: 9.0,
      overview: 'When the menace known as the Joker wreaks havoc on Gotham, Batman must accept one of the greatest tests.',
      posterUrl: 'https://via.placeholder.com/500x750?text=The+Dark+Knight',
      mediaType: 'movie'
    },
    {
      id: 372058,
      title: 'Inception',
      year: '2010',
      genres: ['Action', 'Sci-Fi', 'Thriller'],
      rating: 8.8,
      overview: 'A skilled thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
      posterUrl: 'https://via.placeholder.com/500x750?text=Inception',
      mediaType: 'movie'
    },
    {
      id: 680,
      title: 'Pulp Fiction',
      year: '1994',
      genres: ['Crime', 'Drama'],
      rating: 8.9,
      overview: 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
      posterUrl: 'https://via.placeholder.com/500x750?text=Pulp+Fiction',
      mediaType: 'movie'
    },
    {
      id: 238215,
      title: 'The Matrix',
      year: '1999',
      genres: ['Action', 'Sci-Fi'],
      rating: 8.7,
      overview: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
      posterUrl: 'https://via.placeholder.com/500x750?text=The+Matrix',
      mediaType: 'movie'
    },
    {
      id: 278154,
      title: 'Interstellar',
      year: '2014',
      genres: ['Adventure', 'Drama', 'Sci-Fi'],
      rating: 8.6,
      overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
      posterUrl: 'https://via.placeholder.com/500x750?text=Interstellar',
      mediaType: 'movie'
    },
    {
      id: 278870,
      title: 'Forrest Gump',
      year: '1994',
      genres: ['Drama', 'Romance'],
      rating: 8.8,
      overview: 'The presidencies of Kennedy and Johnson unfold from the perspective of an Alabama man with an IQ of 75.',
      posterUrl: 'https://via.placeholder.com/500x750?text=Forrest+Gump',
      mediaType: 'movie'
    }
  ];
}

/**
 * Fallback TV shows when TMDB API is unavailable
 */
function getFallbackTV() {
  return [
    {
      id: 1399,
      title: 'Breaking Bad',
      year: '2008',
      genres: ['Crime', 'Drama'],
      rating: 9.5,
      overview: 'A chemistry teacher diagnosed with inoperable lung cancer turns to cooking meth with his former student.',
      posterUrl: 'https://via.placeholder.com/500x750?text=Breaking+Bad',
      mediaType: 'tv'
    },
    {
      id: 1396,
      title: 'Game of Thrones',
      year: '2011',
      genres: ['Action', 'Adventure', 'Drama'],
      rating: 9.2,
      overview: 'Nine noble families fight for control over the lands of Westeros.',
      posterUrl: 'https://via.placeholder.com/500x750?text=Game+of+Thrones',
      mediaType: 'tv'
    },
    {
      id: 1408,
      title: 'The Office',
      year: '2005',
      genres: ['Comedy'],
      rating: 9.0,
      overview: 'A mockumentary on a group of typical office workers, where the workday consists of ego clashes, inappropriate behavior, and tedium.',
      posterUrl: 'https://via.placeholder.com/500x750?text=The+Office',
      mediaType: 'tv'
    },
    {
      id: 1436,
      title: 'Stranger Things',
      year: '2016',
      genres: ['Drama', 'Fantasy', 'Horror'],
      rating: 8.7,
      overview: 'When a young boy disappears, his friends discover strange secrets and terrifying forces lurking in the woods outside their town.',
      posterUrl: 'https://via.placeholder.com/500x750?text=Stranger+Things',
      mediaType: 'tv'
    },
    {
      id: 1414,
      title: 'Chernobyl',
      year: '2019',
      genres: ['Drama', 'History', 'Thriller'],
      rating: 9.4,
      overview: 'The story of the Chernobyl accident told through the eyes of the Soviet officials.',
      posterUrl: 'https://via.placeholder.com/500x750?text=Chernobyl',
      mediaType: 'tv'
    },
    {
      id: 1418,
      title: 'The Crown',
      year: '2016',
      genres: ['Biography', 'Drama', 'History'],
      rating: 8.6,
      overview: 'Follows the political rivalries and romance of Queen Elizabeth II\'s reign and the events that shaped the second half of the twentieth century.',
      posterUrl: 'https://via.placeholder.com/500x750?text=The+Crown',
      mediaType: 'tv'
    },
    {
      id: 1402,
      title: 'The Sopranos',
      year: '1999',
      genres: ['Crime', 'Drama'],
      rating: 9.2,
      overview: 'New Jersey mob boss Tony Soprano deals with personal issues and professional challenges as he leads his criminal organization.',
      posterUrl: 'https://via.placeholder.com/500x750?text=The+Sopranos',
      mediaType: 'tv'
    },
    {
      id: 1403,
      title: 'The Wire',
      year: '2002',
      genres: ['Crime', 'Drama', 'Thriller'],
      rating: 9.3,
      overview: 'The drug trade in Baltimore, Maryland as seen through the eyes of law enforcement, street dealers, and everyday people.',
      posterUrl: 'https://via.placeholder.com/500x750?text=The+Wire',
      mediaType: 'tv'
    },
    {
      id: 1404,
      title: 'Friends',
      year: '1994',
      genres: ['Comedy', 'Romance'],
      rating: 8.9,
      overview: 'Six friends living in New York City navigate relationships, careers, and everything in between.',
      posterUrl: 'https://via.placeholder.com/500x750?text=Friends',
      mediaType: 'tv'
    },
    {
      id: 1405,
      title: 'The Crown',
      year: '2016',
      genres: ['Biography', 'Drama'],
      rating: 8.6,
      overview: 'A drama following the political rivalries and romance of Queen Elizabeth II\'s reign.',
      posterUrl: 'https://via.placeholder.com/500x750?text=Crown+Season+2',
      mediaType: 'tv'
    },
    {
      id: 1406,
      title: 'Succession',
      year: '2018',
      genres: ['Drama'],
      rating: 9.0,
      overview: 'The ruthless members of the Roy family fight for power and control of their media empire.',
      posterUrl: 'https://via.placeholder.com/500x750?text=Succession',
      mediaType: 'tv'
    },
    {
      id: 1407,
      title: 'Peaky Blinders',
      year: '2013',
      genres: ['Crime', 'Drama'],
      rating: 8.8,
      overview: 'A gangster family epic spanning post-war Birmingham and set during the Great Depression.',
      posterUrl: 'https://via.placeholder.com/500x750?text=Peaky+Blinders',
      mediaType: 'tv'
    }
  ];
}

/**
 * Load popular TMDB TV shows across multiple pages
 */
async function loadAllTMDBTV(maxPages = 3) {
  if (!movieDb) {
    console.warn('Movie database not initialized');
    return getFallbackTV();
  }

  try {
    await ensureGenres();

    const first = await movieDb.getPopularTV(1);
    
    // Check for both 'shows' and 'movies' properties (backwards compatibility)
    const firstShows = (first && (first.shows || first.movies)) || [];
    
    if (!first || firstShows.length === 0) {
      console.warn('TMDB TV returned empty results, using fallback');
      return getFallbackTV();
    }
    
    totalPages = first.totalPages;
    currentPage = 1;
    const pageLimit = Math.min(maxPages, totalPages);
    hasMorePages = currentPage < totalPages;

    const shows = [...firstShows];

    for (let p = 2; p <= pageLimit; p++) {
      const pageData = await movieDb.getPopularTV(p);
      const pageShows = (pageData && (pageData.shows || pageData.movies)) || [];
      if (pageShows.length > 0) {
        shows.push(...pageShows);
        currentPage = p;
        hasMorePages = currentPage < totalPages;
      }
    }

    allTV = shows.filter(isReleased).map(s => mapTmdbItem(s, 'tv')).sort(sortByReleaseDesc);
    currentListMode = 'popular';

    if (typeof useTMDBCatalog === 'undefined') {
      window.useTMDBCatalog = true;
    } else {
      useTMDBCatalog = true;
    }

    return allTV;
  } catch (error) {
    console.error('Failed to load TMDB TV shows:', error);
    return getFallbackTV();
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
        if (isReleased(m) && !seenIds.has(m.id)) {
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
          if (isReleased(m) && !seenIds.has(m.id)) {
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

    return combined.sort(sortByReleaseDesc);
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

    const newMovies = (pageData.movies || []).map(m => mapTmdbItem(m, 'movie'))
      .filter(isReleased);
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

    const pageItems = (pageData && (pageData.shows || pageData.movies)) || [];
    const newShows = pageItems.map(s => mapTmdbItem(s, 'tv'))
      .filter(isReleased);
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
      displayMovies(popularTV.sort(sortByReleaseDesc), false, 'Series');
    } else {
      const popular = await loadAllTMDBMovies();
      displayMovies(popular.sort(sortByReleaseDesc), false, 'All Movies');
    }
    return;
  }

  try {
    if (tmdbMode === 'tv') {
      const results = await movieDb.searchTV(query);
      const mapped = (results.movies || []).map(it => mapTmdbItem(it, 'tv')).filter(isReleased);
      displayMovies(mapped.sort(sortByReleaseDesc), true, `Search Results for "${query}"`);
    } else {
      // Combined search: movies + TV when in 'All' mode
      const [movieRes, tvRes] = await Promise.all([
        movieDb.searchMovies(query),
        movieDb.searchTV(query)
      ]);
      const movies = (movieRes.movies || []).map(it => mapTmdbItem(it, 'movie')).filter(isReleased);
      const shows = (tvRes.movies || []).map(it => mapTmdbItem(it, 'tv')).filter(isReleased);
      const combined = [...movies, ...shows].filter(Boolean);
      if (combined.length > 0) {
        displayMovies(combined.sort(sortByReleaseDesc), true, `Search Results for "${query}"`);
      } else {
        displayMovies([], true, `No results for "${query}"`);
      }
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
    // Check if displayMovies is available (from index.html)
    if (typeof displayMovies === 'function') {
      displayMovies(tmdbMovies.sort(sortByReleaseDesc), false, 'All Movies');
    } else {
      console.warn('displayMovies function not found in index.html');
    }
  } else {
    console.warn('No TMDB movies loaded');
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
      if (!useTMDBCatalog || isLoadingMore) return;

      const scrollPosition = window.innerHeight + window.scrollY;
      const threshold = document.documentElement.scrollHeight - 800;

      if (scrollPosition >= threshold) {
        if (tmdbMode === 'tv') {
          const newShows = await loadMoreTMDBTV();
          if (newShows.length > 0) appendMoviesToGrid(newShows.sort(sortByReleaseDesc));
        } else if (currentListMode === 'language') {
          const newLangMovies = await loadMoreTMDBByLanguage();
          if (newLangMovies.length > 0) appendMoviesToGrid(newLangMovies.sort(sortByReleaseDesc));
        } else {
          const newMovies = await loadMoreTMDBMovies();
          if (newMovies.length > 0) appendMoviesToGrid(newMovies.sort(sortByReleaseDesc));
        }
      }
    }, 100);
  });
}

/**
 * Append movies to existing grid without full re-render
 */
function appendMoviesToGrid(movies) {
  // Append to the main catalog grid (exclude Popular section)
  const moviesGrid = document.querySelector('#moviesContainer .movies-grid') || document.querySelector('.movies-grid');
  if (!moviesGrid) return;

  movies.forEach(movie => {
    const title = movie.title || 'Untitled';
    const posterPath = movie.posterUrl || ('https://via.placeholder.com/500x750?text=' + encodeURIComponent(title));

    const movieCard = document.createElement('div');
    movieCard.className = 'movie-card movie-' + movie.id;
    movieCard.innerHTML = `
      <div class="poster">
        <img src="${posterPath}" alt="${title}" loading="lazy" />
        <div class="rating-badge"><span class="star">★</span><span class="value">${movie.rating ? Number(movie.rating).toFixed(1) : 'N/A'}</span></div>
        <div class="play-icon"></div>
        <div class="movie-title-overlay">${title}</div>
      </div>
      <div class="movie-info">
        <h3 class="movie-title">${title} (${movie.year || ''})</h3>
      </div>
    `;

    const img = movieCard.querySelector('img');
    if (img) {
      img.addEventListener('error', () => {
        img.src = `https://via.placeholder.com/500x750?text=${encodeURIComponent(title)}`;
      });
    }

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
      .filter(isReleased);

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

function normalizeDate(m) {
  const d = m.release_date || m.releaseDate || m.first_air_date || '';
  return d ? new Date(d).getTime() : 0;
}

function sortByReleaseDesc(a, b) {
  return normalizeDate(b) - normalizeDate(a);
}

/**
 * Load trending movies with rank badges
 */
async function loadTrendingMovies(maxPages = 1) {
  if (!movieDb) {
    console.warn('Movie database not initialized');
    return [];
  }

  try {
    await ensureGenres();

    const first = await movieDb.getTrendingMovies(1);
    
    // Check if we got actual data
    if (!first || !first.movies || first.movies.length === 0) {
      console.warn('TMDB returned empty trending results');
      return [];
    }
    
    const pageLimit = Math.min(maxPages, first.totalPages);
    const movies = [...first.movies];

    for (let p = 2; p <= pageLimit; p++) {
      const pageData = await movieDb.getTrendingMovies(p);
      if (pageData && pageData.movies && pageData.movies.length > 0) {
        movies.push(...pageData.movies);
      }
    }

    currentTrendingMovies = movies.filter(isReleased).map(m => {
      const mapped = mapTmdbItem(m, 'movie');
      // Add rank position (1-indexed)
      mapped.trendingRank = movies.indexOf(m) + 1;
      return mapped;
    });

    lastTrendingUpdateTime = Date.now();
    console.log(`Loaded ${currentTrendingMovies.length} trending movies`);
    
    return currentTrendingMovies;
  } catch (error) {
    console.error('Failed to load trending movies:', error);
    return [];
  }
}

/**
 * Display trending movies in the trending section
 */
function displayTrendingMovies() {
  const container = document.getElementById('trendingMoviesContainer');
  if (!container) {
    console.warn('trendingMoviesContainer not found');
    return;
  }

  if (!currentTrendingMovies || currentTrendingMovies.length === 0) {
    container.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No trending movies available</p>';
    return;
  }

  container.innerHTML = '';

  const moviesGrid = document.createElement('div');
  moviesGrid.className = 'movies-grid';

  currentTrendingMovies.forEach((movie, index) => {
    const title = movie.title || 'Untitled';
    const posterPath = movie.posterUrl || ('https://via.placeholder.com/500x750?text=' + encodeURIComponent(title));
    const rank = movie.trendingRank || (index + 1);

    const movieCard = document.createElement('div');
    movieCard.className = 'movie-card movie-' + movie.id;
    movieCard.innerHTML = `
      <div class="poster">
        <img src="${posterPath}" alt="${title}" loading="lazy" />
        <div class="rating-badge"><span class="star">★</span><span class="value">${movie.rating ? movie.rating.toFixed(1) : 'N/A'}</span></div>
        <div class="trending-rank-badge">#${rank}</div>
        <div class="play-icon"></div>
        <div class="movie-title-overlay">${title}</div>
      </div>
      <div class="movie-info">
        <h3 class="movie-title">${title} (${movie.year || ''})</h3>
      </div>
    `;

    // Add error handler for broken images
    const img = movieCard.querySelector('img');
    if (img) {
      img.addEventListener('error', () => {
        img.src = `https://via.placeholder.com/500x750?text=${encodeURIComponent(title)}`;
      });
    }

    movieCard.addEventListener('click', () => openMovieModal(movie));
    moviesGrid.appendChild(movieCard);
  });

  container.appendChild(moviesGrid);
}

/**
 * Start auto-refreshing trending movies and TV shows every 5-15 minutes
 */
function startTrendingRefresh() {
  if (trendingRefreshInterval) {
    clearInterval(trendingRefreshInterval);
  }

  // Load immediately on start using the index.html functions
  if (typeof loadTrendingMovies === 'function') {
    loadTrendingMovies();
  }
  if (typeof loadTrendingTV === 'function') {
    loadTrendingTV();
  }

  // Set up periodic refresh (random interval between 5-15 minutes)
  const scheduleNextRefresh = () => {
    const minMinutes = 5;
    const maxMinutes = 15;
    const randomMinutes = minMinutes + Math.random() * (maxMinutes - minMinutes);
    const intervalMs = randomMinutes * 60 * 1000;

    console.log(`Scheduling trending refresh in ${randomMinutes.toFixed(2)} minutes`);

    trendingRefreshInterval = setTimeout(async () => {
      try {
        if (typeof loadTrendingMovies === 'function') {
          loadTrendingMovies();
        }
        if (typeof loadTrendingTV === 'function') {
          loadTrendingTV();
        }
        console.log('Trending movies and TV shows refreshed');
      } catch (error) {
        console.error('Trending refresh failed:', error);
      }

      // Schedule next refresh
      scheduleNextRefresh();
    }, intervalMs);
  };

  scheduleNextRefresh();
}

/**
 * Stop auto-refreshing trending movies
 */
function stopTrendingRefresh() {
  if (trendingRefreshInterval) {
    clearInterval(trendingRefreshInterval);
    trendingRefreshInterval = null;
  }
}

// Expose functions globally
window.setTMDBMode = setTMDBMode;
window.loadAllTMDBTV = loadAllTMDBTV;
window.loadTrendingMovies = loadTrendingMovies;
window.displayTrendingMovies = displayTrendingMovies;
window.startTrendingRefresh = startTrendingRefresh;
window.stopTrendingRefresh = stopTrendingRefresh;
window.loadAllTMDBMovies = loadAllTMDBMovies;
window.filterTMDBByCategory = filterTMDBByCategory;
window.loadTMDBByLanguage = loadTMDBByLanguage;
// no need to expose loadMoreTMDBByLanguage; used internally by infinite scroll
