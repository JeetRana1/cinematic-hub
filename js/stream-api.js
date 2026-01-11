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
      console.log('📡 Using configured STREAM_API:', window.STREAM_API);
      return window.STREAM_API;
    }
    // Default to local proxy API
    console.log('📡 Using default local API: /api');
    return '/api';
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
      console.log('📡 mediaInfo response status:', res.status);
      if(!res.ok){
        console.error(`mediaInfo request failed: ${res.status}`);
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
      console.error('fetchMediaInfoByImdb failed:', error.message);
      // If it's a JSON parse error or network error, provide more context
      if (error instanceof SyntaxError) {
        throw new Error('Invalid API response format');
      }
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
      console.log('📋 Full movie object:', JSON.stringify(movie, null, 2));
      const imdbId = movie.imdbId || await fetchImdbIdForTmdbMovie(movie);
      console.log('🎬 Using IMDB ID:', imdbId);
      if(!imdbId){
        console.error('❌ No IMDB ID found for movie:', movie?.title);
        return { success:false, message:'No IMDb ID', src:null, type:null };
      }
      
      // Check for movie overrides (original language, preferred langs)
      const override = MOVIE_OVERRIDES[imdbId];
      const finalPreferredLangs = override?.preferredLangs || preferredLangs;
      const originalLanguage = override?.originalLanguage;
      
      const info = await fetchMediaInfoByImdb(imdbId);
      const key = info?.key;
      const playlist = info?.playlist || [];
      
      // Extract available languages and sort them with English first
      const availableLanguages = playlist.map(p => p.title).filter(Boolean);
      // Sort to put English first, then others
      availableLanguages.sort((a, b) => {
        if (a.toLowerCase().includes('english')) return -1;
        if (b.toLowerCase().includes('english')) return 1;
        return 0;
      });
      
      // If original language is missing, add it to metadata
      const languageInfo = {
        available: availableLanguages,
        original: originalLanguage,
        missingOriginal: originalLanguage && !availableLanguages.some(l => l.toLowerCase().includes(originalLanguage.toLowerCase()))
      };
      
      const langItem = pickLanguagePlaylist(playlist, finalPreferredLangs);
      if(!langItem){
        console.warn('⚠ No language found in playlist, available:', availableLanguages);
        return { success:false, message:'No language playlist', src:null, type:null, availableLanguages, languageInfo };
      }
      const file = langItem.file || langItem.id || null;
      if(!file){
        console.warn('⚠ No file/id in language item:', langItem);
        return { success:false, message:'No file in playlist', src:null, type:null, availableLanguages, languageInfo };
      }
      // If `file` is already a full http URL, use directly, else fetch stream link
      let src;
      if(/^https?:\/\//.test(file)){
        src = file;
      } else {
        try {
          src = await fetchStreamUrlFromFileAndKey(file, key);
        } catch (linkError) {
          console.error('Failed to fetch stream link from file:', file, linkError);
          // Try alternate method if available
          if (!src && playlist.length > 0) {
            console.log('Trying alternate language/file');
            for (let alt of playlist) {
              try {
                const altFile = alt.file || alt.id;
                if (altFile && altFile !== file) {
                  src = await fetchStreamUrlFromFileAndKey(altFile, key);
                  if (src) {
                    console.log('✓ Found alternate stream:', alt.title);
                    break;
                  }
                }
              } catch (e) {
                continue;
              }
            }
          }
          if (!src) throw linkError;
        }
      }
      if (!src) {
        return { success:false, message:'Failed to get stream link', src:null, type:null, availableLanguages, languageInfo };
      }
      const type = /\.m3u8(\?.*)?$/.test(String(src)) ? 'hls' : 'mp4';
      console.log('🎬 Resolved stream:', { imdbId, src, type, language: langItem.title, availableLanguages, languageInfo });
      return { success:true, imdbId, src, type, language: langItem.title, availableLanguages, languageInfo, key };
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
