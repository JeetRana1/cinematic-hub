/**
 * RapidAPI Streaming Provider
 * Alternative streaming source using RapidAPI
 */

// Your RapidAPI Configuration
const RAPIDAPI_KEY = '718d00cfdcmsh26c2beaad6f1cd0p147845jsn19d808f818d3';
const RAPIDAPI_HOST = 'movie-database-alternative.p.rapidapi.com'; // Default, update if different

/**
 * Test RapidAPI connection
 */
async function testRapidAPIConnection() {
  try {
    console.log('🧪 Testing RapidAPI connection...');
    
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    };
    
    // Try a simple API call to verify credentials
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/api/movies?q=test`,
      options
    );
    
    if (response.ok) {
      console.log('✓ RapidAPI connection successful!');
      return true;
    } else {
      console.warn('⚠️ RapidAPI returned:', response.status);
      return false;
    }
    
  } catch (error) {
    console.error('❌ RapidAPI connection failed:', error);
    return false;
  }
}

/**
 * Search for movie/series on RapidAPI
 */
async function searchRapidAPI(query, type = 'movie') {
  try {
    console.log(`🔍 Searching RapidAPI for: ${query} (${type})`);
    
    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    };
    
    const response = await fetch(
      `https://${RAPIDAPI_HOST}/api/movies?q=${encodeURIComponent(query)}`,
      options
    );
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📊 RapidAPI search results:', data);
    return data;
    
  } catch (error) {
    console.error('❌ RapidAPI search error:', error);
    return null;
  }
}

/**
 * Get stream from RapidAPI
 */
async function getStreamFromRapidAPI(movieTitle, type = 'MOVIE', season = null, episode = null) {
  try {
    console.log(`🎬 Getting stream from RapidAPI for: ${movieTitle}`);
    
    // Search for the content
    const searchResult = await searchRapidAPI(movieTitle, type);
    
    if (!searchResult || !searchResult.description || searchResult.description.length === 0) {
      console.warn('⚠️ No results found on RapidAPI');
      return null;
    }
    
    const result = searchResult.description[0];
    console.log(`✓ Found: ${result['#TITLE']} (ID: ${result['#IMG']})`);
    
    // If TV series, get episode
    if (type === 'TV' && season && episode) {
      // RapidAPI movie DB doesn't typically have streaming URLs
      // This would need a different RapidAPI service
      console.log(`📺 Series search: ${movieTitle} S${season}E${episode}`);
    }
    
    // Note: RapidAPI Movie Database is primarily for metadata, not streaming
    // For actual streaming URLs, you'd need a different RapidAPI service
    
    return {
      url: null,
      quality: 'unknown',
      type: 'unknown',
      provider: 'rapidapi',
      metadata: result
    };
    
  } catch (error) {
    console.error('❌ RapidAPI stream error:', error);
    return null;
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.rapidAPIProvider = {
    testConnection: testRapidAPIConnection,
    search: searchRapidAPI,
    getStream: getStreamFromRapidAPI
  };
}
