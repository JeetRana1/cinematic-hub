/**
 * Enhanced Multi-Provider Streaming API
 * Primary: VixSrc.to (HD Quality streaming)
 * Secondary: Videasy (Multi-language/Multi-audio support)
 * Fallback: VidSrc.xyz
 * Features: Ad-free, Multi-audio languages, High quality streams
 */

(function() {
  'use strict';

  const DEFAULT_LANGS = ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Kannada', 'Malayalam', 'Punjabi'];

  function getUrlParam(name) {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get(name);
    } catch { return null; }
  }

  async function fetchImdbId(tmdbId, mediaType = 'movie') {
    if (!window.movieDb || !tmdbId) return null;
    try {
      const details = mediaType === 'tv'
        ? await window.movieDb.getTVDetails(tmdbId)
        : await window.movieDb.getMovieDetails(tmdbId);
      return details?.imdbId || null;
    } catch (error) {
      console.warn('⚠️ Failed to fetch IMDb ID for TMDB:', tmdbId, error.message);
      return null;
    }
  }

  function pickLanguagePlaylist(playlist, preferredLangs = DEFAULT_LANGS) {
    if (!Array.isArray(playlist)) return null;
    for (const lang of preferredLangs) {
      const item = playlist.find(p => (p.title || '').toLowerCase() === lang.toLowerCase());
      if (item) return item;
    }
    return playlist[0] || null;
  }

  const StreamProviders = {
    // Provider: Custom HLS (direct, uses proxy) – paste m3u8 via URL ?hls=
    customHls: {
      name: 'Direct HLS',
      priority: 0,
      async getStream() {
        try {
          const rawUrl = window.CUSTOM_HLS_URL || getUrlParam('hls');
          if (!rawUrl) return { success: false };
          // Prefer explicit referer from URL params, fallback to rawUrl origin
          let referer = getUrlParam('hlsReferer') || getUrlParam('ref');
          if (!referer) {
            try { referer = new URL(rawUrl).origin; } catch { referer = undefined; }
          }
          const proxied = `/api/hls-proxy?type=manifest&url=${encodeURIComponent(rawUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ''}`;
          console.log('🎬 Direct HLS via proxy:', proxied);
          return {
            success: true,
            provider: 'Direct HLS',
            url: proxied,
            type: 'hls',
            quality: 'auto'
          };
        } catch (e) {
          console.warn('⚠️ Direct HLS failed:', e.message);
          return { success: false };
        }
      }
    },
    
    // Provider: Videasy (Secondary - Multi-language/Multi-audio)
    videasy: {
      name: 'Videasy',
      priority: 2,
      async getStream(tmdbId, mediaType = 'movie', season = null, episode = null, imdbId = null) {
        try {
          let embedUrl;
          if (mediaType === 'tv' && season && episode) {
            embedUrl = `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}`;
          } else {
            embedUrl = `https://player.videasy.net/movie/${tmdbId}`;
          }
          
          console.log('🎬 Videasy embed:', embedUrl);
          return {
            success: true,
            provider: 'Videasy (Multi-Audio)',
            url: embedUrl,
            type: 'iframe',
            quality: '1080p',
            features: ['Multi-Audio', 'Multi-Language', 'Hindi', 'Tamil', 'Telugu', 'English']
          };
        } catch (error) {
          console.warn('⚠️ Videasy error:', error.message);
          return { success: false };
        }
      }
    },
    
    // Provider: VidSrc.xyz (Fallback - Multi-language direct streams)
    vidsrcxyz: {
      name: 'VidSrc.xyz',
      priority: 2,
      async getStream(tmdbId, mediaType = 'movie', season = null, episode = null, imdbId = null) {
        try {
          let embedUrl;
          if (mediaType === 'tv' && season && episode) {
            embedUrl = `https://vidsrc.xyz/embed/tv/${tmdbId}/${season}/${episode}`;
          } else {
            embedUrl = `https://vidsrc.xyz/embed/movie/${tmdbId}`;
          }
          
          console.log('🎬 VidSrc.xyz embed:', embedUrl);
          return {
            success: true,
            provider: 'VidSrc.xyz (Multi-Audio)',
            url: embedUrl,
            type: 'iframe',
            quality: '1080p',
            features: ['Multi-Audio', 'Hindi', 'Tamil', 'Telugu', 'English']
          };
        } catch (error) {
          console.warn('⚠️ VidSrc.xyz error:', error.message);
          return { success: false };
        }
      }
    },
    
    // Provider: VidSrc.pro (Fallback - Embed with direct streams)
    vidsrcpro: {
      name: 'VidSrc.pro',
      priority: 3,
      async getStream(tmdbId, mediaType = 'movie', season = null, episode = null, imdbId = null) {
        try {
          let embedUrl;
          if (mediaType === 'tv' && season && episode) {
            embedUrl = `https://vidsrc.pro/embed/tv/${tmdbId}/${season}/${episode}`;
          } else {
            embedUrl = `https://vidsrc.pro/embed/movie/${tmdbId}`;
          }
          
          console.log('🎬 VidSrc.pro embed:', embedUrl);
          return {
            success: true,
            provider: 'VidSrc.pro',
            url: embedUrl,
            type: 'iframe',
            quality: '1080p'
          };
        } catch (error) {
          console.warn('⚠️ VidSrc.pro error:', error.message);
          return { success: false };
        }
      }
    },

    // Provider: VixSrc.to (Primary embed provider)
    vixsrc: {
      name: 'VixSrc.to',
      priority: 1,
      async getStream(tmdbId, mediaType = 'movie', season = null, episode = null, imdbId = null) {
        try {
          let embedUrl;
          if (mediaType === 'tv' && season && episode) {
            embedUrl = `https://vixsrc.to/tv/${tmdbId}/${season}/${episode}?secondaryColor=170000&primaryColor=B20710`;
          } else {
            embedUrl = `https://vixsrc.to/movie/${tmdbId}?secondaryColor=FFFFFF&primaryColor=B20710`;
          }
          
          console.log('🎬 VixSrc.to embed:', embedUrl);
          return {
            success: true,
            provider: 'VixSrc.to',
            url: embedUrl,
            type: 'iframe',
            quality: '1080p'
          };
        } catch (error) {
          console.warn('⚠️ VixSrc.to error:', error.message);
          return { success: false };
        }
      }
    },

    // Provider: Custom Embed (user-supplied URL via query param customEmbed)
    custom: {
      name: 'Custom Embed',
      priority: 6,
      async getStream(tmdbId, mediaType = 'movie', season = null, episode = null) {
        try {
          const customUrl = getUrlParam('customEmbed');
          if (!customUrl) {
            return { success: false };
          }
          console.log('🎬 Custom embed URL:', customUrl);
          return {
            success: true,
            provider: 'Custom Embed',
            url: customUrl,
            type: 'iframe',
            quality: 'auto'
          };
        } catch (error) {
          console.warn('⚠️ Custom embed error:', error.message);
          return { success: false };
        }
      }
    },

    // Provider: NontonGo (TMDB-based embed API) — RESTRICTED TO PLAYER 2
    nontongo: {
      name: 'NontonGo',
      priority: 1,
      async getStream(tmdbId, mediaType = 'movie', season = null, episode = null) {
        try {
          if (!window.IS_PLAYER_2) {
            console.warn('⚠️ NontonGo provider is restricted to Player 2');
            return { success: false };
          }

          if (!tmdbId) {
            console.warn('⚠️ NontonGo: TMDB id missing');
            return { success: false };
          }

          // Build embed URL based on media type
          let embedUrl = '';
          if (mediaType === 'tv' && season && episode) {
            embedUrl = `https://www.NontonGo.win/embed/tv/${tmdbId}/${season}/${episode}`;
          } else if (mediaType === 'tv') {
            embedUrl = `https://www.NontonGo.win/embed/tv/?id=${tmdbId}&s=${season || ''}&e=${episode || ''}`;
          } else {
            embedUrl = `https://www.NontonGo.win/embed/movie/${tmdbId}`;
          }

          console.log('🎬 NontonGo: probing embed URL:', embedUrl);

          // Probe the embed via the server proxy (handles CORS, ad cleanup)
          const resp = await fetch(`/api/proxy/video?url=${encodeURIComponent(embedUrl)}&provider=nontongo`);
          if (!resp.ok) {
            console.warn('⚠️ NontonGo proxy returned non-ok status:', resp.status);
            // Attempt to fetch the cleaned embed page and probe it for nested players or manifests
            const cleanedEmbedFallback = `/api/proxy/video?url=${encodeURIComponent(embedUrl)}&provider=nontongo&clean=1&autoplay=1`;
            console.log('🎬 NontonGo: attempting to probe cleaned embed fallback:', cleanedEmbedFallback);
            try {
              const followResp = await fetch(cleanedEmbedFallback);
              if (followResp.ok) {
                const followHtml = await followResp.text();

                // Probe for HLS
                const mClean = followHtml.match(/https?:\/\/[^\"'()\s]+\.m3u8[^\"'()\s]*/i);
                if (mClean && mClean[0]) {
                  const manifest = mClean[0];
                  const prox = `/api/hls-proxy?type=manifest&url=${encodeURIComponent(manifest)}&referer=${encodeURIComponent(cleanedEmbedFallback)}`;
                  console.log('🎬 NontonGo: found HLS manifest in cleaned embed:', manifest);
                  return { success: true, provider: 'NontonGo (cleaned->hls)', url: prox, type: 'hls' };
                }

                // Probe for MP4
                const mp4Clean = followHtml.match(/https?:\/\/[^\"'()\s]+\.mp4[^\"'()\s]*/i);
                if (mp4Clean && mp4Clean[0]) {
                  const file = mp4Clean[0];
                  const prox = `/api/proxy/video?url=${encodeURIComponent(file)}&provider=nontongo`;
                  console.log('🎬 NontonGo: found MP4 in cleaned embed:', file);
                  return { success: true, provider: 'NontonGo (cleaned->direct)', url: prox, type: 'mp4' };
                }

                // Probe for external player links (e.g., Videasy) inside cleaned embed
                const externalMatch = followHtml.match(/https?:\/\/(?:player\.)?videasy\.net[^\"'()\s]*/i) || followHtml.match(/href=["']([^"']*videasy[^"']*)["']/i) || followHtml.match(/data-href=["']([^"']*videasy[^"']*)["']/i);
                if (externalMatch) {
                  const playerLink = (externalMatch[1] && externalMatch[1]) || externalMatch[0];
                  console.log('🎬 NontonGo: found external player in cleaned embed, probing:', playerLink);
                  try {
                    const extResp = await fetch(`/api/proxy/video?url=${encodeURIComponent(playerLink)}&provider=nontongo`);
                    if (extResp.ok) {
                      const extHtml = await extResp.text();
                      const m2 = extHtml.match(/https?:\/\/[^\"'()\s]+\.m3u8[^\"'()\s]*/i);
                      if (m2 && m2[0]) {
                        const manifest = m2[0];
                        const prox = `/api/hls-proxy?type=manifest&url=${encodeURIComponent(manifest)}&referer=${encodeURIComponent(playerLink)}`;
                        console.log('🎬 NontonGo: found HLS on external player:', manifest);
                        return { success: true, provider: 'NontonGo (cleaned->external)', url: prox, type: 'hls' };
                      }

                      const mp42 = extHtml.match(/https?:\/\/[^\"'()\s]+\.mp4[^\"'()\s]*/i);
                      if (mp42 && mp42[0]) {
                        const file = mp42[0];
                        const prox = `/api/proxy/video?url=${encodeURIComponent(file)}&provider=nontongo`;
                        console.log('🎬 NontonGo: found MP4 on external player:', file);
                        return { success: true, provider: 'NontonGo (cleaned->external)', url: prox, type: 'mp4' };
                      }

                      const nestedIframe = extHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
                      if (nestedIframe && nestedIframe[1]) {
                        const iframeSrc = nestedIframe[1];
                        const proxIframe = iframeSrc && iframeSrc.startsWith('http') ? `/api/proxy/video?url=${encodeURIComponent(iframeSrc)}&provider=nontongo&clean=1&autoplay=1` : iframeSrc;
                        console.log('🎬 NontonGo: found nested iframe on external player:', iframeSrc);
                        return { success: true, provider: 'NontonGo (cleaned->external)', url: proxIframe, type: 'iframe' };
                      }
                    } else {
                      console.warn('⚠️ NontonGo: external player probe returned non-ok status:', extResp.status);
                    }
                  } catch (exErr) {
                    console.warn('⚠️ NontonGo: error probing external player in cleaned embed:', exErr);
                  }
                }

                // Look for nested iframe inside cleaned embed directly
                const iframeMatch = followHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
                if (iframeMatch && iframeMatch[1]) {
                  const iframeSrc = iframeMatch[1];
                  const proxIframe = iframeSrc && iframeSrc.startsWith('http') ? `/api/proxy/video?url=${encodeURIComponent(iframeSrc)}&provider=nontongo&clean=1&autoplay=1` : iframeSrc;
                  console.log('🎬 NontonGo: found nested iframe in cleaned embed:', iframeSrc);
                  return { success: true, provider: 'NontonGo (cleaned->iframe)', url: proxIframe, type: 'iframe' };
                }

                console.log('🎬 NontonGo: cleaned embed probed but no direct streams found; returning cleaned embed fallback');
                return { success: true, provider: 'NontonGo', url: cleanedEmbedFallback, type: 'iframe', note: 'cleaned-probed' };
              } else {
                console.warn('⚠️ NontonGo: cleaned embed fetch returned non-ok status:', followResp.status);
              }
            } catch (err) {
              console.warn('⚠️ NontonGo: error probing cleaned embed fallback:', err);
            }

            // Final fallback - return proxied cleaned embed page
            console.log('🎬 NontonGo: returning proxied cleaned embed fallback:', cleanedEmbedFallback);
            return { success: true, provider: 'NontonGo', url: cleanedEmbedFallback, type: 'iframe', note: 'proxy-fallback' };
          }

          const html = await resp.text();

          // Try to locate direct HLS
          const m = html.match(/https?:\/\/[^\"'()\s]+\.m3u8[^\"'()\s]*/i);
          if (m && m[0]) {
            const manifest = m[0];
            const prox = `/api/hls-proxy?type=manifest&url=${encodeURIComponent(manifest)}&referer=${encodeURIComponent(embedUrl)}`;
            console.log('🎬 NontonGo: found HLS manifest:', manifest);
            return { success: true, provider: 'NontonGo (non-embed)', url: prox, type: 'hls' };
          }

          // Try mp4
          const mp4 = html.match(/https?:\/\/[^\"'()\s]+\.mp4[^\"'()\s]*/i);
          if (mp4 && mp4[0]) {
            const file = mp4[0];
            const prox = `/api/proxy/video?url=${encodeURIComponent(file)}&provider=nontongo`;
            console.log('🎬 NontonGo: found MP4 file:', file);
            return { success: true, provider: 'NontonGo (direct)', url: prox, type: 'mp4' };
          }

          // Look for external player links (common: Videasy) inside the embed page and follow them via the proxy
          const externalPlayerMatch = html.match(/https?:\/\/(?:player\.)?videasy\.net[^\"'()\s]*/i) || html.match(/href=["']([^"']*videasy[^"']*)["']/i) || html.match(/data-href=["']([^"']*videasy[^"']*)["']/i);
          if (externalPlayerMatch) {
            const playerLink = (externalPlayerMatch[1] && externalPlayerMatch[1]) || externalPlayerMatch[0];
            console.log('🎬 NontonGo: found external player link, probing:', playerLink);
            try {
              const followResp = await fetch(`/api/proxy/video?url=${encodeURIComponent(playerLink)}&provider=nontongo`);
              if (followResp.ok) {
                const followHtml = await followResp.text();

                const m2 = followHtml.match(/https?:\/\/[^\"'()\s]+\.m3u8[^\"'()\s]*/i);
                if (m2 && m2[0]) {
                  const manifest = m2[0];
                  const prox = `/api/hls-proxy?type=manifest&url=${encodeURIComponent(manifest)}&referer=${encodeURIComponent(playerLink)}`;
                  console.log('🎬 NontonGo: found HLS manifest on external player:', manifest);
                  return { success: true, provider: 'NontonGo (followed external)', url: prox, type: 'hls' };
                }

                const mp42 = followHtml.match(/https?:\/\/[^\"'()\s]+\.mp4[^\"'()\s]*/i);
                if (mp42 && mp42[0]) {
                  const file = mp42[0];
                  const prox = `/api/proxy/video?url=${encodeURIComponent(file)}&provider=nontongo`;
                  console.log('🎬 NontonGo: found MP4 on external player:', file);
                  return { success: true, provider: 'NontonGo (followed external)', url: prox, type: 'mp4' };
                }

                const iframeMatch = followHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
                if (iframeMatch && iframeMatch[1]) {
                  const iframeSrc = iframeMatch[1];
                  console.log('🎬 NontonGo: found nested iframe on external player:', iframeSrc);
                  const proxIframe = iframeSrc && iframeSrc.startsWith('http') ? `/api/proxy/video?url=${encodeURIComponent(iframeSrc)}&provider=nontongo&clean=1&autoplay=1` : iframeSrc;
                  return { success: true, provider: 'NontonGo (followed external)', url: proxIframe, type: 'iframe' };
                }
              } else {
                console.warn('⚠️ NontonGo: following external player returned non-ok status:', followResp.status);
              }
            } catch (err) {
              console.warn('⚠️ NontonGo: error probing external player link:', err);
            }
          }

          // As a safer fallback, return a proxied & cleaned embed page (so iframe loads the cleaned version instead of a landing page that navigates out)
          console.log('🎬 NontonGo: no direct stream found, returning proxied cleaned embed iframe');
          const cleanedEmbed = `/api/proxy/video?url=${encodeURIComponent(embedUrl)}&provider=nontongo&clean=1&autoplay=1`;
          return { success: true, provider: 'NontonGo', url: cleanedEmbed, type: 'iframe', quality: 'auto' };
        } catch (e) {
          console.warn('⚠️ NontonGo provider error:', e);
          return { success: false };
        }
      },

    },

    // Provider: Rivestream (tries non-embed mode -> direct HLS) — RESTRICTED TO PLAYER 2
    rivestream: {
      name: 'Rivestream',
      priority: 2,
      async getStream(tmdbId, mediaType = 'movie', season = null, episode = null) {
        try {
          if (!window.IS_PLAYER_2) {
            console.warn('⚠️ Rivestream provider is restricted to Player 2');
            return { success: false };
          }

          // Try to search by IMDb or TMDB id (site supports searching by tt id)
          let imdb = null;
          try { imdb = await fetchImdbId(tmdbId, mediaType); } catch (e) { /* ignore */ }
          const searchQuery = imdb || tmdbId || '';
          if (!searchQuery) {
            console.warn('⚠️ Rivestream: no search id available');
            return { success: false };
          }

          const searchUrl = `https://rivestream.org/search?query=${encodeURIComponent(searchQuery)}`;
          console.log('🎬 Rivestream: probing search URL via proxy:', searchUrl);

          // Use server-side proxy to fetch a cleaned page (handles CORS & ads)
          const resp = await fetch(`/api/proxy/video?url=${encodeURIComponent(searchUrl)}&provider=rivestream`);
          if (!resp.ok) {
            console.warn('⚠️ Rivestream search proxy failed:', resp.status);
            return { success: false };
          }

          const html = await resp.text();

          // Find first watch link: /watch?type=(movie|tv)&id=NNNN
          const watchMatch = html.match(/watch\?type=(movie|tv)&id=(\d+)/i);
          if (!watchMatch) {
            console.warn('⚠️ Rivestream: watch id not found in search results');
            return { success: false };
          }

          const type = watchMatch[1];
          const id = watchMatch[2];
          const watchUrl = `https://rivestream.org/watch?type=${type}&id=${id}`;
          console.log('🎬 Rivestream: found watch URL:', watchUrl);

          // Fetch watch page via proxy
          const watchResp = await fetch(`/api/proxy/video?url=${encodeURIComponent(watchUrl)}&provider=rivestream`);
          if (!watchResp.ok) {
            console.warn('⚠️ Rivestream watch proxy failed:', watchResp.status);
            return { success: false };
          }

          const watchHtml = await watchResp.text();

          // 1) Try to find direct HLS (.m3u8) in the page or script blocks
          const m3u8match = watchHtml.match(/https?:\/\/[^"'()\s]+\.m3u8[^"'()\s]*/i);
          if (m3u8match && m3u8match[0]) {
            const manifest = m3u8match[0];
            const proxied = `/api/hls-proxy?type=manifest&url=${encodeURIComponent(manifest)}&referer=${encodeURIComponent(watchUrl)}`;
            console.log('🎬 Rivestream: found direct HLS manifest (non-embed):', manifest);
            return { success: true, provider: 'Rivestream (non-embed)', url: proxied, type: 'hls' };
          }

          // 2) Try to find JSON-configured sources in scripts
          const sourcesMatch = watchHtml.match(/sources\s*[:=]\s*(\[[^\]]+\])/i);
          if (sourcesMatch && sourcesMatch[1]) {
            try {
              const sourcesJson = JSON.parse(sourcesMatch[1].replace(/(['"])?([a-zA-Z0-9_]+)\s*:\s/ig, '"$2": '));
              // prefer m3u8 entries
              for (const s of sourcesJson) {
                if (s && s.file && s.file.includes('.m3u8')) {
                  const prox = `/api/hls-proxy?type=manifest&url=${encodeURIComponent(s.file)}&referer=${encodeURIComponent(watchUrl)}`;
                  return { success: true, provider: 'Rivestream (non-embed)', url: prox, type: 'hls' };
                }
              }
            } catch (e) {
              console.warn('⚠️ Rivestream: parsing sources JSON failed', e);
            }
          }

          // 3) If we didn't find an HLS source, fall back to using the watch page iframe
          console.log('🎬 Rivestream: no direct HLS found, falling back to embed iframe');
          return { success: true, provider: 'Rivestream (embed fallback)', url: watchUrl, type: 'iframe', quality: 'auto' };
        } catch (error) {
          console.warn('⚠️ Rivestream error:', error);
          return { success: false };
        }
      }
    },

    // Provider: 2Embed (uses official API if configured) — RESTRICTED TO PLAYER 2
    twoembed: {
      name: '2Embed',
      priority: 2,
      async getStream(tmdbId, mediaType = 'movie', season = null, episode = null) {
        try {
          if (!window.IS_PLAYER_2) {
            console.warn('⚠️ 2Embed provider is restricted to Player 2');
            return { success: false };
          }

          let imdb = null;
          try { imdb = await fetchImdbId(tmdbId, mediaType); } catch (e) { console.warn('Failed to fetch IMDb ID for 2Embed', e); }
          if (!imdb) {
            console.warn('⚠️ 2Embed: IMDb ID not found for TMDB', tmdbId);
            return { success: false };
          }

          // Prefer configured API if available
          const apiBase = window.TWOEMBED_API;
          if (apiBase) {
            try {
              const apiUrl = `${apiBase}?imdb=${encodeURIComponent(imdb)}`;
              console.log('🎬 2Embed API request:', apiUrl);
              const resp = await fetch(apiUrl);
              if (resp.ok) {
                // Try JSON first
                const json = await resp.json().catch(()=>null);
                if (json && (json.embed || json.url)) {
                  const url = json.embed || json.url;
                  return { success: true, provider: '2Embed (API)', url, type: 'iframe', quality: 'auto' };
                }
                // Fallback: parse text for a src attribute
                const text = await resp.text();
                const match = text.match(/src=["']([^"']+)["']/i);
                if (match && match[1]) {
                  return { success: true, provider: '2Embed (API)', url: match[1], type: 'iframe', quality: 'auto' };
                }
              } else {
                console.warn('⚠️ 2Embed API response not ok:', resp.status);
              }
            } catch (e) {
              console.warn('⚠️ 2Embed API call failed:', e);
            }
          }

          // Fallback to public embed URL
          const embedUrl = `https://www.2embed.cc/embed/${imdb.replace(/^tmdb:/, '')}`;
          console.log('🎬 2Embed embed (fallback):', embedUrl);
          return {
            success: true,
            provider: '2Embed',
            url: embedUrl,
            type: 'iframe',
            quality: 'auto'
          };
        } catch (error) {
          console.warn('⚠️ 2Embed error:', error.message || error);
          return { success: false };
        }
      }
    }
  };

  /**
   * Main function to get stream with fallback support
   */
  window.getEnhancedStream = async function(tmdbId, mediaType = 'movie', season = null, episode = null, preferredProvider = null) {
    console.log('🚀 Getting stream with multi-provider fallback...');
    
    let providers = Object.keys(StreamProviders)
      .map(key => ({ key, ...StreamProviders[key] }))
      .sort((a, b) => a.priority - b.priority);

    if (preferredProvider && StreamProviders[preferredProvider]) {
      const preferred = providers.find(p => p.key === preferredProvider);
      const rest = providers.filter(p => p.key !== preferredProvider);
      providers = [preferred, ...rest];
      console.log(`🎯 Preferred provider requested: ${preferred.name}`);
    }

    for (const provider of providers) {
      try {
        console.log(`⏳ Trying ${provider.name}...`);
        const result = await provider.getStream(tmdbId, mediaType, season, episode);
        
        if (result.success) {
          console.log(`✅ ${provider.name} - Stream found!`);
          return result;
        }
      } catch (error) {
        console.error(`Error with ${provider.name}:`, error);
        continue;
      }
    }

    return {
      success: false,
      error: 'No streaming source found from all providers'
    };
  };

  /**
   * Get available audio languages for a stream
   */
  window.getAudioLanguages = async function(streamResult) {
    const languages = new Set();
    
    if (streamResult.audioTracks && Array.isArray(streamResult.audioTracks)) {
      streamResult.audioTracks.forEach(track => {
        if (typeof track === 'string') {
          languages.add(track);
        } else if (track.lang) {
          languages.add(track.lang);
        }
      });
    }

    if (streamResult.languages && Array.isArray(streamResult.languages)) {
      streamResult.languages.forEach(lang => languages.add(lang));
    }

    // Default languages if none found
    if (languages.size === 0) {
      languages.add('English');
      languages.add('Multi-Audio');
    }

    return Array.from(languages);
  };

  /**
   * Get all available subtitles
   */
  window.getSubtitles = function(streamResult) {
    const subtitles = [];
    
    if (streamResult.subtitles && Array.isArray(streamResult.subtitles)) {
      streamResult.subtitles.forEach(sub => {
        if (typeof sub === 'string') {
          subtitles.push({ lang: 'Unknown', url: sub });
        } else if (sub.url || sub.file) {
          subtitles.push({
            lang: sub.lang || sub.language || 'Unknown',
            url: sub.url || sub.file
          });
        }
      });
    }

    return subtitles;
  };

  /**
   * Get best quality source
   */
  window.getBestQuality = function(streamResult) {
    const qualityMap = {
      '1080p': 1080,
      '720p': 720,
      '480p': 480,
      '360p': 360,
      'auto': 1080,
      'hd': 720,
      'sd': 480
    };

    let bestQuality = streamResult.quality || '720p';
    let bestScore = qualityMap[bestQuality.toLowerCase()] || 720;

    if (streamResult.sources && Array.isArray(streamResult.sources)) {
      streamResult.sources.forEach(source => {
        const quality = source.quality || '';
        const score = qualityMap[quality.toLowerCase()] || 0;
        if (score > bestScore) {
          bestScore = score;
          bestQuality = quality;
        }
      });
    }

    return bestQuality;
  };

  // Export for use in other modules
  window.StreamProviders = StreamProviders;

  console.log('✅ Enhanced Stream API loaded successfully');
})();
