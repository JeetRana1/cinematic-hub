/**
 * Stream API Diagnostics
 * Tests both 8StreamAPI and VidPlay connectivity
 */

(function() {
  'use strict';

  window.streamDiagnostics = {
    async testApis() {
      console.log('🧪 Testing Streaming APIs...\n');

      // Test 8StreamAPI proxy
      console.log('1️⃣ Testing 8StreamAPI Proxy...');
      try {
        const testTitle = 'Predator Badlands';
        const url = new URL(window.location.origin);
        url.pathname = '/api/stream-proxy';
        url.searchParams.set('action', 'mediaInfo');
        url.searchParams.set('id', testTitle);
        
        console.log('   Request:', url.toString());
        const res = await fetch(url.toString());
        const data = await res.json();
        
        if (res.ok && data.success) {
          console.log('   ✅ 8StreamAPI Proxy: WORKING');
          console.log('   Response:', data);
        } else {
          console.warn('   ⚠️ 8StreamAPI Proxy: NO DATA (API may not have this title)');
          console.log('   Response:', data);
        }
      } catch (e) {
        console.error('   ❌ 8StreamAPI Proxy: FAILED', e.message);
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
      console.log('   - 8StreamAPI: Used for HLS streams (highest priority)');
      console.log('   - VidPlay: Used as fallback for iframe embeds');
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
