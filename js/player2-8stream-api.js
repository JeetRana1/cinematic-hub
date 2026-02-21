// player2-8stream-api.js
// Small helper for building and opening the NontonGo (8stream) player URL.
(function () {
  'use strict';

  function toQuery(params) {
    const q = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') {
        q.append(k, String(v));
      }
    });
    return q.toString();
  }

  function build8StreamUrl(input) {
    const data = input || {};
    const mediaType = data.mediaType || data.type || 'movie';
    const payload = {
      id: data.id || data.movieId || data.tmdbId,
      movieId: data.movieId || data.id || data.tmdbId,
      tmdbId: data.tmdbId || data.id || data.movieId,
      imdbId: data.imdbId,
      title: data.title || data.name,
      poster: data.poster || data.posterUrl,
      type: mediaType
    };
    return `nontongoplayer.html?${toQuery(payload)}`;
  }

  function open8Stream(input) {
    const url = build8StreamUrl(input);
    localStorage.setItem('lastPlayerUsed', 'player-8stream');
    window.location.href = url;
    return url;
  }

  window.Player28StreamAPI = {
    build8StreamUrl,
    open8Stream
  };
})();

