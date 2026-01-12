/**
 * 8Stream API Integration
 * Provides streaming links for movies and TV shows using the 8Stream API
 * Uses proxy in production, CORS proxy in development
 */

(function() {
  'use strict';

  const API_BASE = 'https://8streamapi-ju5obhkzf-jeetrana1s-projects.vercel.app/api/v1';
  const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/'
  ];

  /**
   * Detect if running on localhost/dev server
   */
  function isLocalhost() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }

  /**
   * Get the proxy endpoint or use CORS fallback
   */
  function getProxyUrl(action, params) {
    // On production, use Vercel serverless function
    if (!isLocalhost()) {
      const url = new URL(window.location.origin);
      url.pathname = '/api/stream-proxy';
      url.searchParams.set('action', action);
      
      for (const [key, value] of Object.entries(params || {})) {
        if (value !== null && value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
      
      return url.toString();
    }

    // On localhost, we'll use CORS proxy instead
    return null; // Signal to use CORS proxy
  }

  /**
   * Fetch with CORS proxy fallback for development
   */
  async function fetchWithCorsProxy(url, options = {}) {
    console.log('📡 Fetching with CORS proxy:', url);
    
    // Try direct fetch first
    try {
      const response = await fetch(url, { ...options, cache: 'no-cache' });
      if (response.ok) {
        return response;
      }
    } catch (e) {
      console.warn('Direct fetch failed, trying CORS proxy...', e.message);
    }

    // Try CORS proxies
    for (const proxy of CORS_PROXIES) {
      try {
        const proxyUrl = proxy.includes('?url=') 
          ? `${proxy}${encodeURIComponent(url)}`
          : `${proxy}${url}`;
        console.log('Trying proxy:', proxy);
        const response = await fetch(proxyUrl, { ...options, cache: 'no-cache' });
        if (response.ok) {
          return response;
        }
      } catch (e) {
        console.warn(`Proxy ${proxy} failed:`, e.message);
      }
    }

    throw new Error('All CORS proxy attempts failed');
  }

  /**
   * Fetch stream with appropriate proxy
   */
  async function fetchStream(url, options = {}) {
    console.log('📡 Fetching:', url);
    
    // On production, use proxy endpoint (returns JSON)
    if (!isLocalhost()) {
      try {
        const response = await fetch(url, { ...options, cache: 'no-cache' });
        if (response.ok) {
          return response;
        }
        throw new Error(`HTTP ${response.status}`);
      } catch (e) {
        console.warn('Fetch failed:', e.message);
        throw e;
      }
    }

    // On localhost, use CORS proxy
    return fetchWithCorsProxy(url, options);
  }

  /**
   * Get stream from 8StreamAPI for a movie or TV show
   */
  async function getStreamFromApi(tmdbId, mediaType = 'MOVIE', season = null, episode = null) {
    try {
      console.log(`🎬 Searching 8StreamAPI for TMDB ID: ${tmdbId} (${mediaType})`);
      
      let endpoint;
      const isLocalDev = isLocalhost();
      const id = String(tmdbId).trim();

      if (isLocalDev) {
        // On localhost, build direct API URL
        endpoint = `${API_BASE}/mediaInfo?id=${encodeURIComponent(id)}`;
        if (season && episode) {
          endpoint += `&season=${season}&episode=${episode}`;
        }
      } else {
        // On production, use proxy endpoint
        const proxyUrl = getProxyUrl('mediaInfo', {
          id: id,
          season: season || undefined,
          episode: episode || undefined
        });
        endpoint = proxyUrl;
      }

      console.log('🔗 Endpoint:', endpoint);
      const response = await fetchStream(endpoint);
      
      if (!response.ok) {
        const text = await response.text();
        console.error(`❌ API error: ${response.status}`, text);
        return null; // Return null to trigger fallback
      }

      const data = await response.json();
      console.log('📦 API Response:', data);

      if (!data.success || !data.data) {
        console.warn('⚠️ 8StreamAPI returned no results for TMDB ID:', tmdbId);
        return null; // Return null to trigger fallback
      }

      const mediaInfo = data.data;
      
      // Get first available language/source
      if (mediaInfo.playlist && mediaInfo.playlist.length > 0) {
        const firstSource = mediaInfo.playlist[0];
        const streamUrl = await getStreamUrl(firstSource, mediaInfo.key);
        
        return {
          url: streamUrl,
          type: streamUrl.includes('.m3u8') ? 'hls' : 'mp4',
          provider: '8StreamAPI'
        };
      }

      console.warn('⚠️ No playlist found in 8StreamAPI response');
      return null; // Return null to trigger fallback
    } catch (error) {
      console.error('❌ 8StreamAPI error:', error);
      return null; // Return null to trigger fallback
    }
  }

  /**
   * Get actual stream URL from file and key
   */
  async function getStreamUrl(fileInfo, key) {
    try {
      if (!fileInfo.file && !fileInfo.id) {
        throw new Error('No file or id in fileInfo');
      }

      const fileId = fileInfo.file || fileInfo.id;

      // If it's already a URL, return it
      if (/^https?:\/\//.test(fileId)) {
        console.log('✓ Using direct URL:', fileId);
        return fileId;
      }

      // Resolve through API
      const isLocalDev = isLocalhost();
      let response;

      if (isLocalDev) {
        // On localhost, build direct POST request
        response = await fetchWithCorsProxy(`${API_BASE}/getStream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: fileId, key })
        });
      } else {
        // On production, use proxy endpoint
        const proxyUrl = getProxyUrl('getStream', { file: fileId, key });
        response = await fetchStream(proxyUrl, {
          method: 'GET'
        });
      }

      if (!response.ok) {
        throw new Error(`getStream failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.data?.link) {
        throw new Error('Invalid stream response');
      }

      console.log('✓ Stream URL resolved');
      return data.data.link;
    } catch (error) {
      console.error('Error getting stream URL:', error);
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async function testConnection() {
    try {
      console.log('🧪 Testing 8StreamAPI connection...');
      const response = await fetch(`${API_BASE}/status`, { cache: 'no-cache' });
      const ok = response.ok;
      console.log(ok ? '✅ API is connected' : '❌ API returned error');
      return ok;
    } catch (error) {
      console.error('❌ API connection failed:', error.message);
      return false;
    }
  }

  // Export to global scope
  window.streamApi = {
    getStream: getStreamFromApi,
    testConnection,
    apiBase: API_BASE,
    isLocalhost
  };

  console.log(`✓ 8StreamAPI module loaded (${isLocalhost() ? 'localhost with CORS' : 'production with proxy'})`);
})();
