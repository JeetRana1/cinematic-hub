(function(){
  'use strict';

  const DEFAULT_LANGS = ['English','Hindi','Tamil','Telugu','Bengali'];

  // Movie overrides: specify original language and alt streams for movies missing them in API
  const MOVIE_OVERRIDES = {
    'tt16311594': { // F1 (2025)
      originalLanguage: 'English',
      preferredLangs: ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu']
    }
  };

  function getStreamApiBase(){
    // Try to get from environment first (Vercel), then fallback to default
    if (typeof window !== 'undefined' && window.STREAM_API) {
      return window.STREAM_API;
    }
    // Default to your new Replit 8Stream backend
    return 'https://8-stream-api--JeetRana2.replit.app/api/v1';
  }

  async function fetchImdbIdForTmdbMovie(movie){
    try{
      if(!window.movieDb || !movie || !movie.id){
        console.warn('fetchImdbIdForTmdbMovie: missing movieDb or movie');
        return null;
      }
      const isTV = (movie.mediaType === 'tv');
      const details = isTV ? await movieDb.getTVDetails(movie.id) : await movieDb.getMovieDetails(movie.id);
      const imdbId = details?.imdbId || null;
      if(!imdbId){
        console.warn('IMDb ID not found for TMDB item:', movie);
      }
      return imdbId;
    }catch(e){
      console.error('fetchImdbIdForTmdbMovie error:', e);
      return null;
    }
  }

  async function fetchMediaInfoByImdb(imdbId){
    const base = getStreamApiBase();
    const url = `${base}/mediaInfo?id=${encodeURIComponent(imdbId)}`;
    console.log('📡 Fetching mediaInfo from:', url);
    console.log('📡 IMDB ID being sent:', imdbId);
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      console.log('📡 API Response Status:', res.status);
      console.log('📡 API Response OK:', res.ok);
      
      if(!res.ok){
        const errorText = await res.text();
        console.error(`mediaInfo request failed: ${res.status}`, errorText);
        throw new Error(`API Error ${res.status} - Movie may not be in the database`);
      }
      
      const json = await res.json();
      console.log('📦 mediaInfo response:', json);
      
      if(!json.success){
        const errorMsg = json.message || 'Movie not found in API database';
        console.warn('API returned success:false -', errorMsg);
        throw new Error(errorMsg);
      }
      return json.data; // { playlist, key }
    } catch (error) {
      console.error('❌ fetchMediaInfoByImdb failed:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  function pickLanguagePlaylist(playlist, preferredLangs = DEFAULT_LANGS){
    if(!Array.isArray(playlist)) return null;
    console.log('🔍 pickLanguagePlaylist called with preferredLangs:', preferredLangs);
    console.log('🔍 Available playlist items:', playlist.map(p => p.title));
    // playlist items contain { title: 'Hindi', id: '...' } for movie; for TV seasons, nested
    for(const lang of preferredLangs){
      const item = playlist.find(p => (p.title || '').toLowerCase() === lang.toLowerCase());
      if(item) {
        console.log('✓ Selected language:', item.title);
        return item;
      }
    }
    const fallback = playlist[0] || null;
    console.log('⚠ No preferred language found, using fallback:', fallback?.title);
    return fallback;
  }

  async function fetchStreamUrlFromFileAndKey(file, key){
    const base = getStreamApiBase();
    const url = `${base}/getStream`;
    console.log('📡 Fetching stream:', { file, key });
    const res = await fetch(url, {
      method: 'POST',
      cache: 'no-cache',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file, key })
    });
    if(!res.ok){
      const errorText = await res.text();
      console.error('getStream failed:', res.status, errorText);
      throw new Error(`getStream request failed: ${res.status}`);
    }
    const json = await res.json();
    console.log('📦 getStream response:', json);
    if(!json.success){
      throw new Error(json.message || 'getStream unsuccessful');
    }
    return json.data?.link || null; // should be .m3u8
  }

  async function resolveStreamUrlForMovie(movie, preferredLangs = DEFAULT_LANGS){
    try{
      console.log('🔍 Resolving stream for movie:', movie?.title || movie?.name || movie);
      const imdbId = movie.imdbId || await fetchImdbIdForTmdbMovie(movie);
      if(!imdbId){
        return { success:false, message:'No IMDb ID', src:null, type:null };
      }
      
      // Use direct embed with minimal ads
      const isTV = movie.mediaType === 'tv';
      const tmdbId = movie.id;
      
      // Primary: embed.su (cleanest, works well)
      let src = isTV 
        ? `https://embed.su/embed/tv/${tmdbId}/1/1`
        : `https://embed.su/embed/movie/${imdbId}`;
      
      console.log('🎬 Resolved stream:', { imdbId, src, type: 'iframe' });
      return { 
        success: true, 
        imdbId, 
        src, 
        type: 'iframe',
        language: 'Multi-Audio',
        availableLanguages: ['Multi-Audio'],
        provider: 'EmbedSu'
      };
    }catch(e){
      console.error('resolveStreamUrlForMovie error:', e);
      return { success:false, message:String(e?.message||e), src:null, type:null };
    }
  }

  async function resolveStreamForLanguage(imdbId, language, key){
    try{
      console.log('🔄 Switching to language:', language);
      const info = key ? { playlist: null, key } : await fetchMediaInfoByImdb(imdbId);
      if(!info.playlist){
        const fullInfo = await fetchMediaInfoByImdb(imdbId);
        info.playlist = fullInfo.playlist;
        info.key = fullInfo.key;
      }
      const playlist = info.playlist || [];
      const langItem = playlist.find(p => p.title === language) || playlist[0];
      if(!langItem){
        throw new Error('Language not found');
      }
      const file = langItem.file || langItem.id;
      let src;
      if(/^https?:\/\//.test(file)){
        src = file;
      } else {
        src = await fetchStreamUrlFromFileAndKey(file, info.key);
      }
      const type = /\.m3u8(\?.*)?$/.test(String(src)) ? 'hls' : 'mp4';
      console.log('✓ Language switched to:', language, src);
      return { success:true, src, type, language };
    }catch(e){
      console.error('resolveStreamForLanguage error:', e);
      return { success:false, message:String(e?.message||e) };
    }
  }

  async function testStreamResolve(imdbId){
    console.log('🔍 Testing stream resolution for IMDb ID:', imdbId);
    const info = await fetchMediaInfoByImdb(imdbId);
    console.log('✓ mediaInfo:', info);
    const first = pickLanguagePlaylist(info.playlist);
    const link = await fetchStreamUrlFromFileAndKey(first.file || first.id, info.key);
    console.log('✓ Stream URL resolved:', link);
    return link;
  }

  // Expose globals
  window.resolveStreamUrlForMovie = resolveStreamUrlForMovie;
  window.resolveStreamForLanguage = resolveStreamForLanguage;
  window.testStreamResolve = testStreamResolve;
})();
