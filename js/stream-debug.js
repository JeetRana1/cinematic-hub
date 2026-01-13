/**
 * Stream Debug Helper
 * Run in browser console to verify streaming system is working
 */

window.debugStreaming = {
  /**
   * Check if all APIs are loaded
   */
  check: function() {
    console.log('🔍 Streaming System Status Check\n');
    
    const checks = {
      'Enhanced Stream API': !!window.getEnhancedStream,
      'Stream Player Handler': !!window.initStreamPlayer,
      'Audio Language Selector': !!window.initAudioLanguageSelector,
      'Compatibility Layer': !!window.ConsumetAPI,
      'Play Function': !!window.playStream,
      'HLS.js': !!window.Hls,
      'Legacy API (old)': !!window.resolveStreamUrlForMovie
    };

    let allOk = true;
    for (const [name, loaded] of Object.entries(checks)) {
      const status = loaded ? '✅' : '❌';
      console.log(`${status} ${name}`);
      if (!loaded && name !== 'Legacy API (old)') allOk = false;
    }

    console.log('\n' + (allOk ? '✅ All systems operational!' : '❌ Some systems missing'));
    return allOk;
  },

  /**
   * Test streaming with a known TMDB ID
   */
  test: async function(tmdbId = 550, mediaType = 'movie') {
    console.log(`\n🎬 Testing stream for TMDB ID: ${tmdbId} (${mediaType})`);
    console.log('⏳ Fetching...\n');

    try {
      const startTime = performance.now();
      const stream = await window.getEnhancedStream(tmdbId, mediaType);
      const endTime = performance.now();

      if (stream.success) {
        console.log('✅ SUCCESS! Stream found\n');
        console.log('Provider:', stream.provider);
        console.log('Quality:', stream.quality);
        console.log('Type:', stream.type);
        console.log('Response time:', (endTime - startTime).toFixed(0) + 'ms');
        console.log('URL:', stream.url?.substring(0, 80) + '...');
        console.log('\n✅ STREAMING SYSTEM WORKING!');
        return true;
      } else {
        console.error('❌ FAILED: No stream found');
        console.log('Error:', stream.error);
        return false;
      }
    } catch (error) {
      console.error('❌ ERROR:', error.message);
      return false;
    }
  },

  /**
   * Play a movie/show immediately
   */
  play: async function(tmdbId = 550, mediaType = 'movie', season = null, episode = null) {
    console.log(`\n🎬 Starting playback for TMDB ID: ${tmdbId}`);
    
    try {
      if (!window.playStream) {
        throw new Error('playStream function not available');
      }

      const result = await window.playStream(tmdbId, mediaType, season, episode);
      console.log('✅ Playback started!');
      return result;
    } catch (error) {
      console.error('❌ Playback error:', error.message);
      return null;
    }
  },

  /**
   * Get available languages for a stream
   */
  languages: async function(tmdbId = 550) {
    console.log(`\n🔊 Getting audio languages for TMDB ID: ${tmdbId}`);
    
    try {
      const stream = await window.getEnhancedStream(tmdbId, 'movie');
      if (!stream.success) throw new Error(stream.error);

      const languages = await window.getAudioLanguages(stream);
      console.log('Available languages:', languages);
      return languages;
    } catch (error) {
      console.error('❌ Error:', error.message);
      return null;
    }
  },

  /**
   * Get available providers
   */
  providers: function() {
    console.log('\n📡 Available Providers:\n');
    
    if (!window.StreamProviders) {
      console.log('❌ StreamProviders not loaded');
      return;
    }

    const providers = Object.entries(window.StreamProviders)
      .map(([key, provider]) => ({
        name: provider.name,
        priority: provider.priority,
        key: key
      }))
      .sort((a, b) => a.priority - b.priority);

    providers.forEach(p => {
      console.log(`${p.priority}. ${p.name} (${p.key})`);
    });
  },

  /**
   * Show quick commands
   */
  help: function() {
    console.log(`
╔═══════════════════════════════════════════╗
║   STREAMING SYSTEM DEBUG COMMANDS         ║
╚═══════════════════════════════════════════╝

✅ CHECK STATUS:
   window.debugStreaming.check()

🎬 TEST STREAMING (Fight Club):
   window.debugStreaming.test()

🎬 TEST WITH CUSTOM TMDB ID:
   window.debugStreaming.test(603)  // The Matrix

🎬 PLAY A MOVIE:
   window.debugStreaming.play(550)  // Fight Club

📺 PLAY A TV EPISODE:
   window.debugStreaming.play(1396, 'tv', 1, 1)  // Breaking Bad S01E01

🔊 GET AUDIO LANGUAGES:
   window.debugStreaming.languages(550)

📡 LIST PROVIDERS:
   window.debugStreaming.providers()

═══════════════════════════════════════════

TMDB ID EXAMPLES:
  550    - Fight Club (Movie)
  603    - The Matrix (Movie)
  27205  - Inception (Movie)
  1396   - Breaking Bad (TV)
  18592  - The Office (TV)

═══════════════════════════════════════════
    `);
  }
};

// Show help on first load
console.log('🚀 Stream Debug Helper loaded!');
console.log('Type: window.debugStreaming.help()');

// Auto-show if on test page
if (window.location.pathname.includes('test')) {
  window.debugStreaming.help();
}
