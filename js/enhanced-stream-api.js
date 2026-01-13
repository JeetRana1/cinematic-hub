/**
 * Enhanced Multi-Provider Streaming API
 * Primary: Videasy (Multi-language/Multi-audio support)
 * Fallback: VidSrc.xyz, SuperEmbed
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
    
    // Provider: Videasy (Primary - Multi-language/Multi-audio)
    videasy: {
      name: 'Videasy',
      priority: 1,
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

    // Provider: SuperEmbed (generic multi-source embed)
    superembed: {
      name: 'SuperEmbed',
      priority: 4,
      async getStream(tmdbId, mediaType = 'movie', season = null, episode = null, imdbId = null) {
        try {
          // MultiEmbed style URLs support tmdbId directly
          let embedUrl;
          if (mediaType === 'tv' && season && episode) {
            embedUrl = `https://multiembed.mov/?video_id=${tmdbId}&s=${season}&e=${episode}`;
          } else {
            embedUrl = `https://multiembed.mov/?video_id=${tmdbId}`;
          }

          console.log('🎬 SuperEmbed embed:', embedUrl);
          return {
            success: true,
            provider: 'SuperEmbed',
            url: embedUrl,
            type: 'iframe',
            quality: 'auto'
          };
        } catch (error) {
          console.warn('⚠️ SuperEmbed error:', error.message);
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
