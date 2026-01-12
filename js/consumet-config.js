/**
 * Consumet API Configuration & URL Helper
 * Fixes endpoint paths for your deployed Consumet instance
 */

// Official Consumet API (has CORS enabled)
const CONSUMET_API_BASE = 'https://api.consumet.org';

/**
 * Build correct Consumet API URLs
 * Consumet API structure: /movies/flixhq/{endpoint}
 */
function getConsumetUrl(endpoint, params = {}) {
  const base = `${CONSUMET_API_BASE}/movies/flixhq`;
  
  switch(endpoint) {
    case 'search':
      return `${base}/${encodeURIComponent(params.query)}`;
      
    case 'info':
      return `${base}/info?id=${encodeURIComponent(params.id)}`;
      
    case 'watch':
      return `${base}/watch?episodeId=${encodeURIComponent(params.episodeId)}`;
      
    case 'home':
      return `${base}/home`;
      
    default:
      return `${base}/${endpoint}`;
  }
}

/**
 * Test your Consumet API connection
 */
async function testConsumetAPI() {
  console.log('🧪 Testing your Consumet API...');
  console.log('📍 API URL:', CONSUMET_API_BASE);
  
  try {
    // Test 1: Home endpoint
    const homeUrl = getConsumetUrl('home');
    console.log('📡 Testing:', homeUrl);
    
    const response = await fetch(homeUrl);
    console.log('📊 Status:', response.status);
    console.log('✅ CORS headers:', response.headers.get('access-control-allow-origin'));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Your Consumet API is working!');
      console.log('📺 Results:', data.results ? data.results.length : 0, 'items');
      return true;
    } else {
      console.error('❌ API returned error:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text.substring(0, 200));
      return false;
    }
    
  } catch (error) {
    console.error('❌ Consumet API test failed:', error.message);
    console.error('💡 Make sure your API is deployed from: https://github.com/consumet/api.consumet.org');
    return false;
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.CONSUMET_CONFIG = {
    base: CONSUMET_API_BASE,
    getUrl: getConsumetUrl,
    test: testConsumetAPI
  };
  
  // Auto-test on load
  console.log('🔧 Consumet Config loaded');
  console.log('💡 Run window.CONSUMET_CONFIG.test() to test your API');
}
