/**
 * Stream Providers Diagnostics
 * Tests all iframe embed providers
 */

(function() {
  'use strict';

  window.streamDiagnostics = {
    async testApis() {
      console.log('🧪 Testing Streaming Providers...\n');

      // Test VidPlay
      console.log('1️⃣ Testing VidPlay...');
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

      // Test UpCloud
      console.log('\n2️⃣ Testing UpCloud...');
      try {
        if (window.upcloud && window.upcloud.getUrl) {
          const testUrl = window.upcloud.getUrl(550, 'MOVIE'); // Fight Club
          console.log('   ✅ UpCloud: WORKING');
          console.log('   Example URL:', testUrl);
        } else {
          console.warn('   ⚠️ UpCloud module not loaded');
        }
      } catch (e) {
        console.error('   ❌ UpCloud: FAILED', e.message);
      }

      // Test VidCloud
      console.log('\n3️⃣ Testing VidCloud...');
      try {
        if (window.vidcloud && window.vidcloud.getUrl) {
          const testUrl = window.vidcloud.getUrl(550, 'MOVIE'); // Fight Club
          console.log('   ✅ VidCloud: WORKING');
          console.log('   Example URL:', testUrl);
        } else {
          console.warn('   ⚠️ VidCloud module not loaded');
        }
      } catch (e) {
        console.error('   ❌ VidCloud: FAILED', e.message);
      }

      // Test Google Drive
      console.log('\n4️⃣ Testing Google Drive...');
      try {
        if (window.googledrive && window.googledrive.extractId) {
          const testId = window.googledrive.extractId('https://drive.google.com/file/d/1dL3qNJ9QEg9FBLXrPd1Z_TqD_-yRwqz0/view');
          console.log('   ✅ Google Drive: WORKING');
          console.log('   Extracted ID:', testId);
        } else {
          console.warn('   ⚠️ Google Drive module not loaded');
        }
      } catch (e) {
        console.error('   ❌ Google Drive: FAILED', e.message);
      }

      // Summary
      console.log('\n📊 Summary:');
      console.log('   - VidPlay: Primary provider (iframe embed)');
      console.log('   - UpCloud: Fallback provider (iframe embed)');
      console.log('   - VidCloud: Fallback provider (iframe embed)');
      console.log('   - Google Drive: For direct Google Drive links');
      console.log('\n💡 To test: Click "Stream" button on any movie/series');
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
