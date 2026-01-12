/**
 * CORS Proxy Helper
 * Helps bypass CORS restrictions for streaming URLs
 */

const CORS_PROXIES = [
  'https://cors-anywhere.herokuapp.com/',
  'https://api.allorigins.win/raw?url=',
  'https://thingproxy.freehostip.com/fetch/',
];

/**
 * Test if URL has CORS issues
 */
async function testCorsProxy(url) {
  console.log(`🔍 Testing CORS proxy for: ${url}`);
  
  for (const proxy of CORS_PROXIES) {
    try {
      const proxyUrl = proxy + encodeURIComponent(url);
      const response = await fetch(proxyUrl, {
        method: 'HEAD',
        mode: 'no-cors'
      });
      
      if (response.ok || response.status === 0) {
        console.log(`✓ Working proxy found: ${proxy}`);
        return proxy;
      }
    } catch (error) {
      console.log(`✗ Proxy failed: ${proxy}`, error.message);
    }
  }
  
  console.warn('⚠️ No working CORS proxy found');
  return null;
}

/**
 * Wrap URL with CORS proxy
 */
function wrapWithCorsProxy(url, proxyUrl) {
  if (!proxyUrl) return url;
  return proxyUrl + encodeURIComponent(url);
}

/**
 * Get safe streaming URL (bypass CORS if needed)
 */
async function getSafeStreamUrl(url) {
  // Check if URL is from known CORS-restricted domains
  const corsRestrictedDomains = [
    'rainbloom44.xyz',
    'vidsrc.pro',
    'vidsrc.me',
    '2embed.cc',
    'embedsb.com',
    'streamtape.com'
  ];
  
  const needsProxy = corsRestrictedDomains.some(domain => url.includes(domain));
  
  if (!needsProxy) {
    return url;
  }
  
  console.log('🔄 Attempting to use CORS proxy...');
  const workingProxy = await testCorsProxy(url);
  
  if (workingProxy) {
    return wrapWithCorsProxy(url, workingProxy);
  }
  
  console.warn('⚠️ CORS proxy not available. URL may not play.');
  return url;
}

/**
 * Alternative: Use a backend endpoint to proxy streams
 */
function createBackendProxyUrl(streamUrl) {
  // If you have a Node.js/Express backend, create an endpoint
  // Example: /api/proxy-stream?url=<encoded-url>
  const backendUrl = 'http://localhost:3001/api/proxy-stream';
  return `${backendUrl}?url=${encodeURIComponent(streamUrl)}`;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testCorsProxy,
    wrapWithCorsProxy,
    getSafeStreamUrl,
    createBackendProxyUrl
  };
}

// Make available globally
window.corsProxyHelper = {
  testCorsProxy,
  wrapWithCorsProxy,
  getSafeStreamUrl,
  createBackendProxyUrl
};
