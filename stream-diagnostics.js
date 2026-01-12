/**
 * Stream API Diagnostics
 * Tests both 8StreamAPI and VidPlay connectivity
 */

(function() {
  'use strict';

  const API_BASE = 'https://8streamapi-ju5obhkzf-jeetrana1s-projects.vercel.app/api/v1';
  const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/'
  ];

  function isLocalhost() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }

  async function fetchWithCorsProxy(url) {
    console.log('   Fetching:', url);
    
    // Try direct fetch first on localhost
    try {
      const response = await fetch(url, { cache: 'no-cache' });
      if (response.ok) {
        return response;
      }
    } catch (e) {
      console.warn('   Direct fetch failed, trying CORS proxy...', e.message);
    }

    // Try CORS proxies
    for (const proxy of CORS_PROXIES) {
      try {
        const proxyUrl = proxy.includes('?url=') 
          ? `${proxy}${encodeURIComponent(url)}`
          : `${proxy}${url}`;
        console.log('   Trying proxy:', proxy);
        const response = await fetch(proxyUrl, { cache: 'no-cache' });
        if (response.ok) {
          return response;
        }
      } catch (e) {
        console.warn(`   Proxy ${proxy} failed:`, e.message);
      }
    }

    throw new Error('All fetch attempts failed');
  }

  window.streamDiagnostics = {
    async testApis() {
      console.log('🧪 Testing Streaming APIs...\n');

      // Test 8StreamAPI
      console.log('1️⃣ Testing 8StreamAPI...');
      try {
        const testId = '550'; // Fight Club
        let endpoint;
        
        if (isLocalhost()) {
          // On localhost, use direct API with CORS proxy
          endpoint = `${API_BASE}/mediaInfo?id=${testId}`;
          console.log('   (Localhost - using CORS proxy)');
        } else {
          // On production, use proxy endpoint
          const url = new URL(window.location.origin);
          url.pathname = '/api/stream-proxy';
          url.searchParams.set('action', 'mediaInfo');
          url.searchParams.set('id', testId);
          endpoint = url.toString();
          console.log('   (Production - using /api/stream-proxy)');
        }
        
        console.log('   Request:', endpoint);
        const response = isLocalhost() 
          ? await fetchWithCorsProxy(endpoint)
          : await fetch(endpoint);
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          console.log('   ✅ 8StreamAPI: WORKING');
          console.log('   Response:', data);
        } else {
          console.warn('   ⚠️ 8StreamAPI: NO DATA');
          console.log('   Response:', data);
        }
      } catch (e) {
        console.error('   ❌ 8StreamAPI: FAILED', e.message);
      }

      // Test VidPlay
      console.log('\n2️⃣ Testing VidPlay...');
      try {
        if (window.vidplay && window.vidplay.getUrl) {
          const testUrl = window.vidplay.getUrl(550, 'MOVIE'); // Fight Club
          console.log('   ✅ VidPlay: WORKING');
          console.log('   Example URL:', testUrl);
        } else {
          console.warn('   ⚠️ VidPlay module not loaded');
        }
      } catch (e) {
        console.error('   ❌ VidPlay: FAILED', e.message);
      }

      // Summary
      console.log('\n📊 Summary:');
      console.log('   - Environment:', isLocalhost() ? 'LOCALHOST (using CORS proxies)' : 'PRODUCTION (using /api/stream-proxy)');
      console.log('   - 8StreamAPI: Primary provider (HLS streams)');
      console.log('   - VidPlay: Fallback provider (iframe embeds)');
      console.log('\n💡 To test: Click "Stream" button on any movie');
    }
  };

  // Auto-run diagnostics on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => window.streamDiagnostics.testApis(), 1000);
    });
  } else {
    setTimeout(() => window.streamDiagnostics.testApis(), 1000);
  }

  console.log('✓ Stream Diagnostics loaded - run window.streamDiagnostics.testApis() to test');
})();
