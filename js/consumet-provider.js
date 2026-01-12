/**
 * Consumet Stream Provider Integration
 * Primary streaming source with CORS support
 * 
 * Features:
 * - Uses public Consumet API (Vercel)
 * - TMDB integration for metadata
 * - Multiple source fallback
 * - No CORS issues
 */

// Consumet API v3+ uses direct paths without /api prefix
const CONSUMET_BASE = 'https://apiconsumet-hdnywn99o-jeetrana1s-projects.vercel.app';

// CORS Proxy options
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
  'https://thingproxy.freeboard.io/fetch/'
];

let currentCorsProxyIndex = 0;

/**
 * Fetch with CORS proxy fallback
 */
async function fetchWithCorsProxy(url) {
  console.log(`📡 Fetching: ${url}`);
  
  // Try direct fetch first
  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log(`✓ Direct fetch successful`);
      return response;
    }
  } catch (e) {
    console.log(`⚠️ Direct fetch failed, trying CORS proxy...`);
  }
  
  // Try CORS proxies
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxy = CORS_PROXIES[i];
    const proxiedUrl = proxy + encodeURIComponent(url);
    
    try {
      console.log(`📡 Trying CORS proxy ${i + 1}: ${proxy}`);
      const response = await fetch(proxiedUrl);
      
      if (response.ok) {
        console.log(`✓ CORS proxy ${i + 1} successful`);
        currentCorsProxyIndex = i;
        
        // Wrap response text in a Response object
        const text = await response.text();
        return new Response(text, {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }
    } catch (e) {
      console.log(`⚠️ CORS proxy ${i + 1} failed: ${e.message}`);
      continue;
    }
  }
  
  throw new Error('All CORS proxies failed');
}

let CONSUMET_API = CONSUMET_BASE;

// Detect which API version is available
async function detectConsumetVersion() {
  console.log('🔍 Auto-detecting Consumet API structure...');
  console.log('📍 Using Vercel API:', CONSUMET_BASE);
  
  // Try v3+ structure: /movies/flixhq
  try {
    const response = await fetchWithCorsProxy(`${CONSUMET_BASE}/movies/flixhq`);
    if (response.ok) {
      CONSUMET_API = `${CONSUMET_BASE}/movies`;
      console.log(`✓ Consumet API v3+ detected at: ${CONSUMET_API}`);
      return CONSUMET_API;
    }
  } catch (e) {
    console.log('ℹ️ /movies endpoint not available');
  }
  
  // Try meta structure: /meta/tmdb
  try {
    const response = await fetchWithCorsProxy(`${CONSUMET_BASE}/meta/tmdb`);
    if (response.ok) {
      CONSUMET_API = `${CONSUMET_BASE}/meta`;
      console.log(`✓ Consumet API (meta) detected at: ${CONSUMET_API}`);
      return CONSUMET_API;
    }
  } catch (e) {
    console.log('ℹ️ /meta endpoint not available');
  }
  
  // Default to base URL
  CONSUMET_API = CONSUMET_BASE;
  console.log(`✓ Using Consumet base URL: ${CONSUMET_API}`);
  return CONSUMET_API;
}

const CONSUMET_PROVIDERS = {
  flixhq: 'flixhq',      // Movies & TV Shows
  dramacool: 'dramacool', // Asian content
  gogoanime: 'gogoanime'  // Anime
};

/**
 * Get stream from Consumet API v3+
 */
async function getStreamFromConsumet(query, mediaType = 'MOVIE') {
  try {
    console.log(`🔍 Searching Consumet for: ${query}`);
    
    // Ensure API URL is set
    if (!CONSUMET_API || CONSUMET_API === 'http://localhost:3000/api/v2') {
      await detectConsumetVersion();
    }
    
    // Consumet v3+ FlixHQ search: /movies/flixhq/{query}
    const searchUrl = `${CONSUMET_API}/flixhq/${encodeURIComponent(query)}`;
    console.log(`📡 Trying direct info at: ${searchUrl}`);
    
    let searchData;
    try {
      const searchResponse = await fetchWithCorsProxy(searchUrl);
      
      if (!searchResponse.ok) {
        console.warn(`⚠️ Direct info failed (${searchResponse.status}), trying search...`);
        
        // Try search endpoint instead
        const altSearchUrl = `${CONSUMET_API}/flixhq/search?query=${encodeURIComponent(query)}`;
        console.log(`📡 Searching at: ${altSearchUrl}`);
        
        const altResponse = await fetchWithCorsProxy(altSearchUrl);
        if (!altResponse.ok) {
          throw new Error(`Search failed: ${altResponse.status}`);
        }
        
        searchData = await altResponse.json();
        console.log('📊 Search results:', searchData);
        
        // Get first result
        if (!searchData.results || searchData.results.length === 0) {
          console.warn('⚠️ No results found');
          return null;
        }
        
        const firstResult = searchData.results[0];
        console.log(`✓ Found: ${firstResult.title} (ID: ${firstResult.id})`);
        
        // Get detailed info
        const infoUrl = `${CONSUMET_API}/flixhq/info?id=${encodeURIComponent(firstResult.id)}`;
        console.log(`📡 Getting info from: ${infoUrl}`);
        
        const infoResponse = await fetchWithCorsProxy(infoUrl);
        if (!infoResponse.ok) {
          throw new Error(`Info fetch failed: ${infoResponse.status}`);
        }
        searchData = await infoResponse.json();
        
      } else {
        searchData = await searchResponse.json();
      }
      
      console.log('📺 Media data:', searchData);
      
      // Get episode/movie ID
      let episodeId;
      if (searchData.episodes && searchData.episodes.length > 0) {
        episodeId = searchData.episodes[0].id;
      } else if (searchData.id) {
        episodeId = searchData.id;
      } else {
        console.error('❌ No episode/media ID found');
        return null;
      }
      
      // Get watch sources
      const watchUrl = `${CONSUMET_API}/flixhq/watch?episodeId=${encodeURIComponent(episodeId)}`;
      console.log(`📡 Getting sources from: ${watchUrl}`);
      
      const watchResponse = await fetchWithCorsProxy(watchUrl);
      if (!watchResponse.ok) {
        throw new Error(`Watch fetch failed: ${watchResponse.status}`);
      }
      
      const watchData = await watchResponse.json();
      console.log('🔗 Watch data:', watchData);
      
      // Check for sources
      if (!watchData.sources || watchData.sources.length === 0) {
        console.warn('⚠️ No sources available');
        return null;
      }
      
      // Get best quality source
      const primarySource = watchData.sources.find(s => s.quality === '1080p') || 
                           watchData.sources.find(s => s.quality === '720p') || 
                           watchData.sources[0];
      
      console.log(`✅ Stream found! Quality: ${primarySource.quality}`);
      
      return {
        title: searchData.title || query,
        id: searchData.id || episodeId,
        url: primarySource.url,
        quality: primarySource.quality || 'auto',
        type: primarySource.url.includes('.m3u8') ? 'hls' : 'mp4',
        sources: watchData.sources,
        subtitles: watchData.subtitles || [],
        provider: 'consumet'
      };
      
    } catch (fetchError) {
      console.error('❌ Consumet fetch error:', fetchError);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Consumet API error:', error);
    console.error('   Make sure Consumet is running at http://localhost:3000');
    return null;
  }}

/**
 * Get stream for specific episode of a TV series
 */
async function getSeriesEpisode(seriesTitle, season, episode) {
  try {
    console.log(`🎬 Searching for: ${seriesTitle} S${season}E${episode}`);
    
    // Search for the series
    const searchUrl = `${CONSUMET_API}/flixhq/search?query=${encodeURIComponent(seriesTitle)}`;
    console.log(`📡 Searching at: ${searchUrl}`);
    
    const searchResponse = await fetchWithCorsProxy(searchUrl);
    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    console.log('📊 Search results:', searchData);
    
    if (!searchData.results || searchData.results.length === 0) {
      console.warn('⚠️ Series not found');
      return null;
    }
    
    // Get first result (should be the series)
    const series = searchData.results[0];
    console.log(`✓ Found series: ${series.title} (ID: ${series.id})`);
    
    // Get series info
    const infoUrl = `${CONSUMET_API}/flixhq/info?id=${encodeURIComponent(series.id)}`;
    console.log(`📡 Getting series info from: ${infoUrl}`);
    
    const infoResponse = await fetchWithCorsProxy(infoUrl);
    if (!infoResponse.ok) {
      throw new Error(`Info fetch failed: ${infoResponse.status}`);
    }
    
    const seriesInfo = await infoResponse.json();
    console.log('📺 Series info:', seriesInfo);
    
    // Find the specific episode
    if (!seriesInfo.episodes || seriesInfo.episodes.length === 0) {
      console.warn('⚠️ No episodes found');
      return null;
    }
    
    console.log(`Total episodes found: ${seriesInfo.episodes.length}`);
    
    // Filter episodes by season and episode number
    const episodeList = seriesInfo.episodes.filter(ep => {
      // Try to parse season/episode from title or other fields
      const epTitle = ep.title || '';
      const epNumber = ep.number || '';
      
      // Format: S01E01, Season 1 Episode 1, etc.
      const seasonMatch = epTitle.match(/[Ss]eason?\s*(\d+)|[Ss](\d+)/);
      const episodeMatch = epTitle.match(/[Ee]pisode?\s*(\d+)|[Ee](\d+)/);
      
      const epSeason = seasonMatch ? parseInt(seasonMatch[1] || seasonMatch[2]) : null;
      const epNumber_ = episodeMatch ? parseInt(episodeMatch[1] || episodeMatch[2]) : null;
      
      console.log(`Checking: ${epTitle} - Season: ${epSeason}, Episode: ${epNumber_}`);
      
      return epSeason === season && epNumber_ === episode;
    });
    
    if (episodeList.length === 0) {
      console.warn(`⚠️ Episode S${season}E${episode} not found. Using first episode instead.`);
      return await getEpisodeStream(series.id, seriesInfo.episodes[0].id);
    }
    
    // Get stream for the selected episode
    return await getEpisodeStream(series.id, episodeList[0].id);
    
  } catch (error) {
    console.error('❌ Error getting series episode:', error);
    return null;
  }
}

/**
 * Get stream for an episode by episodeId
 */
async function getEpisodeStream(seriesId, episodeId) {
  try {
    console.log(`📡 Getting stream for episode: ${episodeId}`);
    
    // Get watch sources
    const watchUrl = `${CONSUMET_API}/flixhq/watch?episodeId=${encodeURIComponent(episodeId)}`;
    console.log(`📡 Getting sources from: ${watchUrl}`);
    
    const watchResponse = await fetchWithCorsProxy(watchUrl);
    if (!watchResponse.ok) {
      throw new Error(`Watch fetch failed: ${watchResponse.status}`);
    }
    
    const watchData = await watchResponse.json();
    console.log('🔗 Watch data:', watchData);
    
    // Check for sources
    if (!watchData.sources || watchData.sources.length === 0) {
      console.warn('⚠️ No sources available');
      return null;
    }
    
    // Get best quality source
    const primarySource = watchData.sources.find(s => s.quality === '1080p') || 
                         watchData.sources.find(s => s.quality === '720p') || 
                         watchData.sources[0];
    
    console.log(`✅ Episode stream found! Quality: ${primarySource.quality}`);
    
    return {
      url: primarySource.url,
      quality: primarySource.quality || 'auto',
      type: primarySource.url.includes('.m3u8') ? 'hls' : 'mp4',
      sources: watchData.sources,
      subtitles: watchData.subtitles || [],
      provider: 'consumet'
    };
    
  } catch (error) {
    console.error('❌ Error getting episode stream:', error);
    return null;
  }}

/**
 * Get stream URL directly by IMDb ID
 */
async function getStreamByImdbId(imdbId) {
  try {
    console.log(`🔍 Searching Consumet by IMDb ID: ${imdbId}`);
    
    // Most reliable way: search by IMDb ID through Consumet
    // Since Consumet doesn't have direct IMDb lookup, search by title might be needed
    // This is a fallback approach
    
    return null; // Return null to fallback to other methods
    
  } catch (error) {
    console.error('❌ Error fetching by IMDb ID:', error);
    return null;
  }
}

/**
 * Get all available sources for a media
 */
async function getMultipleSources(query) {
  try {
    console.log(`🔍 Fetching multiple sources for: ${query}`);
    
    const result = await getStreamFromConsumet(query);
    
    if (result && result.sources) {
      return result.sources.map(source => ({
        url: source.url,
        quality: source.quality,
        type: source.url.includes('.m3u8') ? 'hls' : 'mp4'
      }));
    }
    
    return [];
    
  } catch (error) {
    console.error('❌ Error fetching multiple sources:', error);
    return [];
  }
}

/**
 * Test Consumet API connectivity
 */
async function testConsumetConnection() {
  try {
    console.log('🧪 Testing Consumet API connection...');
    
    // Detect version first
    const detectedApi = await detectConsumetVersion();
    
    const response = await fetchWithCorsProxy(`${detectedApi}/flixhq/home`);
    
    if (response.ok) {
      console.log('✓ Consumet API is connected and working!');
      return true;
    } else {
      console.warn('⚠️ Consumet API returned status:', response.status);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Consumet API connection failed:', error);
    return false;
  }
}

/**
 * Get trending movies from Consumet
 */
async function getTrendingMovies(page = 1) {
  try {
    console.log(`📺 Fetching trending movies (page ${page})...`);
    
    const url = `${CONSUMET_API}/flixhq/home?page=${page}`;
    const response = await fetchWithCorsProxy(url);
    
    if (!response.ok) {
      throw new Error(`Failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results || [];
    
  } catch (error) {
    console.error('❌ Error fetching trending movies:', error);
    return [];
  }
}
/**
 * Search with provider selection
 */
async function searchWithProvider(query, provider = 'flixhq') {
  try {
    console.log(`🔍 Searching ${provider} for: ${query}`);
    
    const url = `${CONSUMET_API}/${provider}/search?query=${encodeURIComponent(query)}`;
    const response = await fetchWithCorsProxy(url);
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results || [];
    
  } catch (error) {
    console.error(`❌ Error searching ${provider}:`, error);
    return [];
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getStreamFromConsumet,
    getSeriesEpisode,
    getEpisodeStream,
    getStreamByImdbId,
    getMultipleSources,
    testConsumetConnection,
    getTrendingMovies,
    searchWithProvider,
    detectConsumetVersion,
    CONSUMET_API_VERSIONS,
    CONSUMET_PROVIDERS
  };
}

// Make available globally
window.consumetProvider = {
  getStreamFromConsumet,
  getSeriesEpisode,
  getEpisodeStream,
  getStreamByImdbId,
  getMultipleSources,
  testConsumetConnection,
  getTrendingMovies,
  searchWithProvider,
  detectConsumetVersion,
  CONSUMET_API_VERSIONS,
  CONSUMET_PROVIDERS
};

// Auto-detect API version IMMEDIATELY
(async () => {
  console.log('🔧 Consumet Provider loaded');
  await detectConsumetVersion();
  console.log(`✓ Consumet API initialized at: ${CONSUMET_API}`);
})();

// Test connection on player page
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('player')) {
      await testConsumetConnection();
    }
  });
}
