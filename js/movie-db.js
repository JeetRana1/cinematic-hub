/**
 * Movie Database Integration
 * Uses TMDB (The Movie Database) API - Free alternative to IMDb
 * Sign up for free API key at: https://www.themoviedb.org/settings/api
 */

class MovieDatabase {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.themoviedb.org/3';
    this.imageUrl = 'https://image.tmdb.org/t/p/w500';
    this.cache = new Map();
  }

  /**
   * Search for movies by title
   * @param {string} query - Movie title to search
   * @param {number} page - Page number for pagination
   */
  async searchMovies(query, page = 1) {
    try {
      const cacheKey = `search_${query}_${page}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await fetch(
        `${this.baseUrl}/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(query)}&page=${page}`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Process results
      const movies = data.results.map(movie => ({
        id: movie.id,
        title: movie.title,
        poster: movie.poster_path ? `${this.imageUrl}${movie.poster_path}` : null,
        overview: movie.overview,
        releaseDate: movie.release_date,
        rating: movie.vote_average,
        originalLanguage: movie.original_language,
        popularity: movie.popularity,
        voteCount: movie.vote_count
      }));

      const result = {
        movies,
        totalPages: data.total_pages,
        totalResults: data.total_results,
        currentPage: page
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Get detailed movie information
   * @param {number} movieId - TMDB movie ID
   */
  async getMovieDetails(movieId) {
    try {
      const cacheKey = `movie_${movieId}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await fetch(
        `${this.baseUrl}/movie/${movieId}?api_key=${this.apiKey}&append_to_response=credits,external_ids`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      const movie = {
        id: data.id,
        title: data.title,
        poster: data.poster_path ? `${this.imageUrl}${data.poster_path}` : null,
        backdrop: data.backdrop_path ? `${this.imageUrl}${data.backdrop_path}` : null,
        overview: data.overview,
        releaseDate: data.release_date,
        rating: data.vote_average,
        ratingCount: data.vote_count,
        runtime: data.runtime,
        budget: data.budget,
        revenue: data.revenue,
        genres: data.genres.map(g => g.name),
        languages: data.spoken_languages.map(l => l.english_name),
        productionCountries: data.production_countries.map(c => c.name),
        director: this.getDirector(data.credits),
        cast: this.getCast(data.credits),
        imdbId: data.external_ids?.imdb_id
      };

      this.cache.set(cacheKey, movie);
      return movie;
    } catch (error) {
      console.error('Details error:', error);
      throw error;
    }
  }

  /**
   * Get trending movies
   * @param {string} timeWindow - 'day' or 'week'
   */
  async getTrendingMovies(timeWindow = 'week') {
    try {
      const cacheKey = `trending_${timeWindow}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await fetch(
        `${this.baseUrl}/trending/movie/${timeWindow}?api_key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      const movies = data.results.map(movie => ({
        id: movie.id,
        title: movie.title,
        poster: movie.poster_path ? `${this.imageUrl}${movie.poster_path}` : null,
        overview: movie.overview,
        releaseDate: movie.release_date,
        rating: movie.vote_average,
        popularity: movie.popularity
      }));

      this.cache.set(cacheKey, movies);
      return movies;
    } catch (error) {
      console.error('Trending error:', error);
      throw error;
    }
  }

  /**
   * Get popular movies with pagination
   * @param {number} page - Page number (1-indexed)
   */
  async getPopularMovies(page = 1) {
    try {
      const cacheKey = `popular_${page}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const url = `${this.baseUrl}/movie/popular?api_key=${this.apiKey}&page=${page}`;
      console.log('Fetching popular movies from:', url);
      
      const response = await fetch(url);

      if (!response.ok) {
        const text = await response.text();
        console.error('API Response status:', response.status, 'Body:', text);
        throw new Error(`API Error: ${response.status}`);
      }

      const text = await response.text();
      console.log('API Response text length:', text.length, 'First 200 chars:', text.substring(0, 200));
      
      if (!text || text.trim().length === 0) {
        console.error('Empty response from TMDB API');
        return { movies: [], totalPages: 0, totalResults: 0, currentPage: page };
      }

      const data = JSON.parse(text);

      const movies = (data.results || []).map(movie => ({
        id: movie.id,
        title: movie.title,
        poster: movie.poster_path ? `${this.imageUrl}${movie.poster_path}` : null,
        backdrop: movie.backdrop_path ? `${this.imageUrl}${movie.backdrop_path}` : null,
        overview: movie.overview,
        releaseDate: movie.release_date,
        rating: movie.vote_average,
        originalLanguage: movie.original_language,
        popularity: movie.popularity,
        voteCount: movie.vote_count,
        genreIds: movie.genre_ids || []
      }));

      const result = {
        movies,
        totalPages: data.total_pages || 0,
        totalResults: data.total_results || 0,
        currentPage: page
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Popular error:', error);
      // Return empty result instead of throwing to prevent page break
      return { movies: [], totalPages: 0, totalResults: 0, currentPage: page };
    }
  }

  /**
   * TV: Search for TV shows by name
   * @param {string} query
   * @param {number} page
   */
  async searchTV(query, page = 1) {
    try {
      const cacheKey = `search_tv_${query}_${page}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await fetch(
        `${this.baseUrl}/search/tv?api_key=${this.apiKey}&query=${encodeURIComponent(query)}&page=${page}`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const shows = data.results.map(tv => ({
        id: tv.id,
        title: tv.name,
        poster: tv.poster_path ? `${this.imageUrl}${tv.poster_path}` : null,
        backdrop: tv.backdrop_path ? `${this.imageUrl}${tv.backdrop_path}` : null,
        overview: tv.overview,
        releaseDate: tv.first_air_date,
        rating: tv.vote_average,
        popularity: tv.popularity,
        voteCount: tv.vote_count,
        genreIds: tv.genre_ids || [],
        originalLanguage: tv.original_language
      }));

      const result = {
        movies: shows,
        totalPages: data.total_pages,
        totalResults: data.total_results,
        currentPage: page
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Search TV error:', error);
      throw error;
    }
  }

  /**
   * TV: Get popular TV shows
   * @param {number} page
   */
  async getPopularTV(page = 1) {
    try {
      const cacheKey = `popular_tv_${page}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const url = `${this.baseUrl}/tv/popular?api_key=${this.apiKey}&page=${page}`;
      console.log('Fetching popular TV shows from:', url);
      
      const response = await fetch(url);

      if (!response.ok) {
        const text = await response.text();
        console.error('API Response status:', response.status, 'Body:', text);
        throw new Error(`API Error: ${response.status}`);
      }

      const text = await response.text();
      console.log('TV API Response text length:', text.length, 'First 200 chars:', text.substring(0, 200));
      
      if (!text || text.trim().length === 0) {
        console.error('Empty response from TMDB TV API');
        return { movies: [], shows: [], totalPages: 0, totalResults: 0, currentPage: page };
      }

      const data = JSON.parse(text);

      const shows = (data.results || []).map(tv => ({
        id: tv.id,
        title: tv.name,
        poster: tv.poster_path ? `${this.imageUrl}${tv.poster_path}` : null,
        backdrop: tv.backdrop_path ? `${this.imageUrl}${tv.backdrop_path}` : null,
        overview: tv.overview,
        releaseDate: tv.first_air_date,
        rating: tv.vote_average,
        popularity: tv.popularity,
        voteCount: tv.vote_count,
        genreIds: tv.genre_ids || [],
        originalLanguage: tv.original_language
      }));

      const result = {
        movies: shows,
        shows: shows,
        totalPages: data.total_pages || 0,
        totalResults: data.total_results || 0,
        currentPage: page
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Popular TV error:', error);
      // Return empty result instead of throwing to prevent page break
      return { movies: [], shows: [], totalPages: 0, totalResults: 0, currentPage: page };
    }
  }

  /**
   * TV: Get detailed TV show information
   * @param {number} tvId
   */
  async getTVDetails(tvId) {
    try {
      const cacheKey = `tv_${tvId}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await fetch(
        `${this.baseUrl}/tv/${tvId}?api_key=${this.apiKey}&append_to_response=aggregate_credits,external_ids`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      const tv = {
        id: data.id,
        title: data.name,
        poster: data.poster_path ? `${this.imageUrl}${data.poster_path}` : null,
        backdrop: data.backdrop_path ? `${this.imageUrl}${data.backdrop_path}` : null,
        overview: data.overview,
        releaseDate: data.first_air_date,
        rating: data.vote_average,
        ratingCount: data.vote_count,
        genres: (data.genres || []).map(g => g.name),
        languages: (data.spoken_languages || []).map(l => l.english_name),
        productionCountries: (data.production_countries || []).map(c => c.name),
        seasons: data.seasons || [],
        imdbId: data.external_ids?.imdb_id
      };

      this.cache.set(cacheKey, tv);
      return tv;
    } catch (error) {
      console.error('TV details error:', error);
      throw error;
    }
  }

  /**
   * TV: Get videos (trailers) for a TV show
   * @param {number} tvId
   */
  async getTVVideos(tvId) {
    try {
      const cacheKey = `tv_videos_${tvId}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await fetch(
        `${this.baseUrl}/tv/${tvId}/videos?api_key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const videos = data.results || [];

      this.cache.set(cacheKey, videos);
      return videos;
    } catch (error) {
      console.error('TV videos error:', error);
      throw error;
    }
  }

  /**
   * TV: Get season detail (episodes list)
   * @param {number} tvId
   * @param {number} seasonNumber
   */
  async getTVSeason(tvId, seasonNumber) {
    try {
      const cacheKey = `tv_season_${tvId}_${seasonNumber}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await fetch(
        `${this.baseUrl}/tv/${tvId}/season/${seasonNumber}?api_key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('TV season error:', error);
      throw error;
    }
  }

  /**
   * TV: Get episode videos (trailers/clips)
   * @param {number} tvId
   * @param {number} seasonNumber
   * @param {number} episodeNumber
   */
  async getTVEpisodeVideos(tvId, seasonNumber, episodeNumber) {
    try {
      const cacheKey = `tv_ep_videos_${tvId}_${seasonNumber}_${episodeNumber}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await fetch(
        `${this.baseUrl}/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}/videos?api_key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const videos = data.results || [];
      this.cache.set(cacheKey, videos);
      return videos;
    } catch (error) {
      console.error('TV episode videos error:', error);
      throw error;
    }
  }

  /**
   * TV: Get list of TV genres
   */
  async getTVGenres() {
    try {
      const cacheKey = 'genres_tv';
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await fetch(
        `${this.baseUrl}/genre/tv/list?api_key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const genres = data.genres.map(g => ({ id: g.id, name: g.name }));

      this.cache.set(cacheKey, genres);
      return genres;
    } catch (error) {
      console.error('TV Genres error:', error);
      throw error;
    }
  }

  /**
   * Get videos (trailers) for a movie
   * @param {number} movieId - TMDB movie ID
   */
  async getMovieVideos(movieId) {
    try {
      const cacheKey = `videos_${movieId}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await fetch(
        `${this.baseUrl}/movie/${movieId}/videos?api_key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const videos = data.results || [];

      this.cache.set(cacheKey, videos);
      return videos;
    } catch (error) {
      console.error('Videos error:', error);
      throw error;
    }
  }

  /**
   * Get movies by genre
   * @param {number} genreId - Genre ID
   * @param {number} page - Page number
   */
  async getMoviesByGenre(genreId, page = 1) {
    try {
      const response = await fetch(
        `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&with_genres=${genreId}&page=${page}&sort_by=popularity.desc`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      const movies = data.results.map(movie => ({
        id: movie.id,
        title: movie.title,
        poster: movie.poster_path ? `${this.imageUrl}${movie.poster_path}` : null,
        overview: movie.overview,
        releaseDate: movie.release_date,
        rating: movie.vote_average
      }));

      return {
        movies,
        totalPages: data.total_pages,
        currentPage: page
      };
    } catch (error) {
      console.error('Genre error:', error);
      throw error;
    }
  }

  /**
   * Discover movies by original language
   * @param {string} lang - Language code (e.g., 'hi', 'ta', 'te', 'ml', 'kn')
   * @param {number} page - Page number
   */
  async discoverMoviesByLanguage(lang, page = 1) {
    try {
      const cacheKey = `discover_lang_${lang}_${page}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const url = `${this.baseUrl}/discover/movie?api_key=${this.apiKey}` +
        `&with_original_language=${encodeURIComponent(lang)}` +
        `&region=IN&sort_by=release_date.desc&page=${page}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const movies = (data.results || []).map(movie => ({
        id: movie.id,
        title: movie.title,
        poster: movie.poster_path ? `${this.imageUrl}${movie.poster_path}` : null,
        backdrop: movie.backdrop_path ? `${this.imageUrl}${movie.backdrop_path}` : null,
        overview: movie.overview,
        releaseDate: movie.release_date,
        rating: movie.vote_average,
        originalLanguage: movie.original_language,
        popularity: movie.popularity,
        voteCount: movie.vote_count,
        genreIds: movie.genre_ids || []
      }));

      const result = {
        movies,
        totalPages: data.total_pages,
        totalResults: data.total_results,
        currentPage: page
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Discover by language error:', error);
      throw error;
    }
  }

  /**
   * Get list of all genres
   */
  async getGenres() {
    try {
      const cacheKey = 'genres';
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await fetch(
        `${this.baseUrl}/genre/movie/list?api_key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const genres = data.genres.map(g => ({
        id: g.id,
        name: g.name
      }));

      this.cache.set(cacheKey, genres);
      return genres;
    } catch (error) {
      console.error('Genres error:', error);
      throw error;
    }
  }

  /**
   * Helper: Extract director from credits
   */
  getDirector(credits) {
    if (!credits?.crew) return null;
    const director = credits.crew.find(person => person.job === 'Director');
    return director ? director.name : null;
  }

  /**
   * Helper: Extract top cast members
   */
  getCast(credits) {
    if (!credits?.cast) return [];
    return credits.cast.slice(0, 10).map(actor => ({
      name: actor.name,
      character: actor.character,
      image: actor.profile_path ? `${this.imageUrl}${actor.profile_path}` : null
    }));
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MovieDatabase;
}
