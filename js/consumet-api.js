/**
 * Consumet API Integration
 * Provides streaming links for movies and TV shows using the Consumet API
 * Docs: https://docs.consumet.org
 */

(function() {
  'use strict';

  function getConsumetApiBase() {
    return window.CONSUMET_API || 'https://api.consumet.org';
  }

  // Fetch JSON with graceful parse errors
  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {})
      }
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      throw new Error(`Invalid JSON from ${url} (status ${response.status})`);
    }

    if (!response.ok) {
      const message = (data && data.message) ? data.message : response.statusText;
      throw new Error(`Request failed ${response.status}: ${message}`);
    }

    return data;
  }

  // Resolve Consumet watch parameters using TMDB meta mapping
  async function resolveWatchIds(base, tmdbId, mediaType, season, episode) {
    const type = mediaType === 'tv' ? 'tv' : 'movie';
    const metaUrl = `${base}/meta/tmdb/info/${tmdbId}?type=${type}`;
    console.log('🔍 Consumet meta lookup:', metaUrl);

    const meta = await fetchJson(metaUrl);

    // movies: use meta.id for both mediaId and episodeId
    if (type === 'movie') {
      const id = meta.id || meta.episodeId;
      if (!id) throw new Error('Meta response missing movie id');
      return { mediaId: id, episodeId: id };
    }

    // tv: need a valid episode id plus series media id
    if (!meta.episodes || !Array.isArray(meta.episodes) || !meta.id) {
      throw new Error('No episodes or media id found in meta response');
    }

    let chosen = null;
    if (season && episode) {
      chosen = meta.episodes.find(
        ep => String(ep.seasonNumber) === String(season) && String(ep.number) === String(episode)
      );
    }

    if (!chosen) {
      // fall back to first episode
      chosen = meta.episodes[0];
    }

    const episodeId = chosen && (chosen.episodeId || chosen.id);
    if (!episodeId) throw new Error('No usable episodeId found');

    return { mediaId: meta.id, episodeId };
  }

  // Primary: FlixHQ via Consumet
  async function fetchConsumetStream(tmdbId, mediaType = 'movie', season = null, episode = null) {
    const base = getConsumetApiBase();

    try {
      const { mediaId, episodeId } = await resolveWatchIds(base, tmdbId, mediaType, season, episode);
      const watchUrl = `${base}/movies/flixhq/watch?mediaId=${encodeURIComponent(mediaId)}&episodeId=${encodeURIComponent(episodeId)}`;
      console.log('📡 Consumet watch URL:', watchUrl);

      const data = await fetchJson(watchUrl);

      if (!data || !data.sources || data.sources.length === 0) {
        throw new Error('No streaming sources found');
      }

      const pick = data.sources.find(s => s.quality === 'auto') ||
                   data.sources.find(s => s.quality === '1080p') ||
                   data.sources.find(s => s.quality === '720p') ||
                   data.sources[0];

      return {
        success: true,
        url: pick.url,
        type: pick.isM3U8 ? 'hls' : 'mp4',
        quality: pick.quality || 'auto',
        sources: data.sources,
        subtitles: data.subtitles || [],
        provider: 'Consumet - FlixHQ'
      };

    } catch (error) {
      console.error('❌ Consumet API error:', error);
      return {
        success: false,
        message: error.message,
        url: null,
        type: null
      };
    }
  }

  // Optional VidSrc path (currently disabled to avoid bad episodeId mapping)
  async function fetchVidSrcStream() {
    return {
      success: false,
      message: 'VidSrc provider disabled'
    };
  }

  // Resolver that tries FlixHQ first
  async function resolveConsumetStream(movie, season = null, episode = null) {
    const mediaType = movie.mediaType === 'tv' ? 'tv' : 'movie';
    const tmdbId = movie.id;

    console.log('🎬 Resolving Consumet stream for:', movie.title, {
      tmdbId,
      mediaType,
      season,
      episode
    });

    const result = await fetchConsumetStream(tmdbId, mediaType, season, episode);

    if (result.success) {
      console.log('✅ Stream resolved via FlixHQ:', result.url);
      return result;
    }

    console.error('❌ All Consumet providers failed');
    return {
      success: false,
      message: result.message || 'No streams available from Consumet providers',
      url: null,
      type: null
    };
  }

  // Search wrapper
  async function searchConsumet(query, page = 1) {
    const base = getConsumetApiBase();
    const searchUrl = `${base}/movies/flixhq/${encodeURIComponent(query)}?page=${page}`;

    try {
      const data = await fetchJson(searchUrl);
      return {
        success: true,
        results: data.results || [],
        hasNextPage: data.hasNextPage || false
      };
    } catch (error) {
      console.error('❌ Consumet search error:', error);
      return {
        success: false,
        message: error.message,
        results: []
      };
    }
  }

  // Info wrapper
  async function getConsumetInfo(mediaId) {
    const base = getConsumetApiBase();
    const infoUrl = `${base}/movies/flixhq/info?id=${encodeURIComponent(mediaId)}`;

    try {
      const data = await fetchJson(infoUrl);
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('❌ Consumet info error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Expose functions globally
  window.ConsumetAPI = {
    resolveStream: resolveConsumetStream,
    search: searchConsumet,
    getInfo: getConsumetInfo,
    fetchFlixHQ: fetchConsumetStream,
    fetchVidSrc: fetchVidSrcStream
  };

  console.log('✅ Consumet API integration loaded');
})();
