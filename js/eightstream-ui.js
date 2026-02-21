// eightstream-ui.js
// Optional UI wiring helper for opening NontonGo (8stream) from buttons.
(function () {
  'use strict';

  function readMovieFromDataset(el) {
    if (!el) return null;
    return {
      id: el.dataset.id || el.dataset.movieId || el.dataset.tmdbId,
      movieId: el.dataset.movieId || el.dataset.id || el.dataset.tmdbId,
      tmdbId: el.dataset.tmdbId || el.dataset.id || el.dataset.movieId,
      imdbId: el.dataset.imdbId || '',
      title: el.dataset.title || '',
      poster: el.dataset.poster || '',
      mediaType: el.dataset.mediaType || el.dataset.type || 'movie'
    };
  }

  function bindEightStreamButtons(selector) {
    const nodes = document.querySelectorAll(selector || '[data-open-8stream]');
    nodes.forEach((btn) => {
      if (btn.dataset.eightstreamBound === '1') return;
      btn.dataset.eightstreamBound = '1';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const payload = readMovieFromDataset(btn);
        if (!payload || !payload.id) return;

        if (window.Player28StreamAPI && typeof window.Player28StreamAPI.open8Stream === 'function') {
          window.Player28StreamAPI.open8Stream(payload);
        }
      });
    });
  }

  window.EightStreamUI = {
    bindEightStreamButtons
  };

  // Auto-bind on DOM ready for elements that opt in via data attribute.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bindEightStreamButtons());
  } else {
    bindEightStreamButtons();
  }
})();

