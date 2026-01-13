/**
 * Stream Button Integration with Ad-Blocker Proxy
 * 
 * Add this code to your modal's stream button handlers to enable ad-blocking.
 * The proxy will automatically remove ads from vidsrc and vidplay videos.
 */

// Example integration for your modal stream buttons

async function handleStreamButtonClick(provider = 'vidsrc') {
  try {
    const modal = document.getElementById('movieModal');
    const movieTitle = document.getElementById('modalTitle')?.textContent || 'Video';
    const movieId = modal?.dataset?.movieId;
    
    if (!movieId) {
      console.warn('No movie ID found');
      showToast('error', 'Error', 'Movie not found');
      return;
    }

    // Show loading state
    showToast('info', 'Loading...', `Starting playback with ${provider}...`);

    // Get the video provider URL (from your existing logic)
    let videoUrl = await getVideoUrl(movieId, provider);
    
    if (!videoUrl) {
      showToast('error', 'Failed', 'Could not find video stream');
      return;
    }

    console.log(`🎬 Playing: ${movieTitle}`);
    console.log(`📹 Provider: ${provider}`);
    console.log(`🔗 Original URL:`, videoUrl);

    // Check if ad-blocker proxy is available
    if (window.adBlockerProxy && window.adBlockerProxy.isHealthy) {
      // Proxy is online - use ad-blocked version
      console.log('✅ Ad-blocker proxy is active');
      
      const proxiedUrl = window.adBlockerProxy.getProxiedUrl(videoUrl, provider);
      console.log('🛡️  Proxied URL:', proxiedUrl);
      
      // Open in player
      openPlayer(proxiedUrl, movieTitle);
      
      showToast('success', 'Ad-Free', 'Ad-blocker proxy active - enjoy ad-free viewing!');
    } else {
      // Proxy offline - use original URL
      console.warn('⚠️ Ad-blocker proxy offline - using original stream');
      console.log('💡 Make sure the proxy server is running: npm start');
      
      openPlayer(videoUrl, movieTitle);
      
      showToast('warning', 'Proxy Offline', 'Ad-blocker unavailable. Fallback to original stream.');
    }
  } catch (error) {
    console.error('Stream error:', error);
    showToast('error', 'Error', error.message || 'Failed to load stream');
  }
}

/**
 * Alternative: Using the proxy in a player modal/window
 */
function handleStreamInModal(movieId, provider = 'vidsrc') {
  return new Promise(async (resolve, reject) => {
    try {
      // Get the video URL from your streaming API
      const videoUrl = await getVideoUrl(movieId, provider);
      
      if (!videoUrl) {
        return reject(new Error('No video URL found'));
      }

      // Get proxied URL if available
      let finalUrl = videoUrl;
      if (window.adBlockerProxy?.isHealthy) {
        finalUrl = window.adBlockerProxy.getProxiedUrl(videoUrl, provider);
        console.log('Using ad-blocked proxy:', finalUrl.substring(0, 60) + '...');
      }

      // Create and show player modal
      const playerModal = document.createElement('div');
      playerModal.id = 'playerModal';
      playerModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #000;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      playerModal.innerHTML = `
        <div style="width: 95%; height: 95%; position: relative;">
          <button onclick="this.closest('#playerModal').remove()" style="
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.7);
            color: white;
            border: none;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            font-size: 24px;
            cursor: pointer;
            z-index: 10001;
          ">×</button>
          <iframe 
            src="${finalUrl}"
            style="width: 100%; height: 100%; border: none; border-radius: 8px;"
            allow="fullscreen; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      `;
      
      document.body.appendChild(playerModal);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Integration with existing stream button handlers
 * 
 * Place this in your modal's stream button click handler:
 */
function setupStreamButtons() {
  const streamBtn = document.getElementById('streamBtn');
  const streamBtn2 = document.getElementById('streamBtn2');
  const movieData = getCurrentMovieData(); // Your function to get current movie

  if (streamBtn) {
    streamBtn.addEventListener('click', async () => {
      await handleStreamButtonClick('vidsrc');
    });
  }

  if (streamBtn2) {
    streamBtn2.addEventListener('click', async () => {
      await handleStreamButtonClick('vidplay');
    });
  }
}

/**
 * Toast notification helper
 */
function showToast(type, title, message) {
  // Use your existing toast function
  if (window.UIToast && typeof UIToast[type] === 'function') {
    UIToast[type](title, message);
  } else {
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
  }
}

/**
 * Player open helper
 */
function openPlayer(url, title = '') {
  // Option 1: Open in new window
  window.open(url, '_blank', 'width=1280,height=720,resizable=yes');
  
  // Option 2: Open in modal (replace window.open with the modal approach above)
  // handleStreamInModal(movieId, provider);
  
  // Option 3: Navigate to player.html with parameters
  // const params = new URLSearchParams({ title, url });
  // window.location.href = `player.html?${params.toString()}`;
}

/**
 * YOUR EXISTING STREAMING CODE
 * 
 * This example assumes you have these functions already:
 */

// Mock: Replace with your actual function
async function getVideoUrl(movieId, provider) {
  // This would call your streaming API to get the video URL
  // Example: return await StreamAPI.getEmbed(movieId, provider);
  
  console.warn('getVideoUrl: Using mock function. Replace with actual implementation.');
  return 'https://vidsrc.me/embed/movie/tt0111161'; // Placeholder
}

// Mock: Replace with your actual function
function getCurrentMovieData() {
  return {
    id: document.getElementById('movieModal')?.dataset?.movieId || 'unknown',
    title: document.getElementById('modalTitle')?.textContent || 'Unknown Movie'
  };
}

/**
 * INTEGRATION CHECKLIST
 * 
 * ✅ 1. Backend proxy running: npm start (port 3001)
 * ✅ 2. Frontend script loaded: js/ad-blocker-proxy-integration.js
 * ✅ 3. window.adBlockerProxy is available globally
 * ✅ 4. Call handleStreamButtonClick() from stream button click handler
 * ✅ 5. Videos should now load without ads
 * 
 * DEBUG:
 * - Open browser console
 * - Check window.adBlockerProxy.isHealthy
 * - Run window.adBlockerProxy.testProxy() to test all providers
 * - Check logs for "✅ Ad-blocker proxy is active"
 */

/**
 * ALTERNATIVE: Direct use in your existing button handlers
 * 
 * Replace your current stream button click handler with:
 */
async function yourExistingStreamButtonHandler(movieId, provider = 'vidsrc') {
  try {
    // Your existing code to get the video URL
    const videoUrl = await getVideoUrlFromYourAPI(movieId, provider);
    
    // NEW: Add proxy support
    let finalUrl = videoUrl;
    if (window.adBlockerProxy?.isHealthy) {
      finalUrl = window.adBlockerProxy.getProxiedUrl(videoUrl, provider);
    }
    
    // Your existing code to open the player
    openPlayerWithUrl(finalUrl);
    
  } catch (error) {
    handleError(error);
  }
}

/**
 * FOR SERIES/EPISODES:
 * 
 * If you support series, you can also proxy TV streams:
 */
async function playSeriesEpisode(showId, seasonNumber, episodeNumber, provider = 'vidsrc') {
  try {
    // Get the episode URL from your API
    const episodeUrl = await getSeriesEpisodeUrl(showId, seasonNumber, episodeNumber, provider);
    
    // Proxy it
    let finalUrl = episodeUrl;
    if (window.adBlockerProxy?.isHealthy) {
      finalUrl = window.adBlockerProxy.getProxiedUrl(episodeUrl, provider);
    }
    
    // Open player
    openPlayer(finalUrl, `Season ${seasonNumber} Episode ${episodeNumber}`);
    
  } catch (error) {
    console.error('Series playback error:', error);
  }
}

/**
 * ERROR HANDLING TIPS
 * 
 * Common issues:
 * 1. "Proxy offline" → Make sure: npm start is running
 * 2. "Video not loading" → Check if video URL is valid
 * 3. "CORS error" → Proxy handles this, should be transparent
 * 4. "Ads still showing" → Browser cache issue, hard refresh (Ctrl+Shift+R)
 */

// Example error handling
function handleStreamError(error) {
  console.error('Stream error:', error);
  
  if (error.message.includes('Proxy')) {
    showToast('warning', 'Proxy Issue', 'Ad-blocker offline. Using original stream.');
  } else if (error.message.includes('URL')) {
    showToast('error', 'Invalid Stream', 'Could not find valid stream URL.');
  } else if (error.message.includes('CORS')) {
    showToast('error', 'Access Denied', 'Stream provider blocked the request.');
  } else {
    showToast('error', 'Playback Error', error.message || 'Unknown error');
  }
}

/**
 * TESTING THE INTEGRATION
 * 
 * Run this in browser console to test:
 */
window.testAdBlocker = async function() {
  console.log('🧪 Testing Ad-Blocker Integration...');
  
  // 1. Check if available
  if (!window.adBlockerProxy) {
    console.error('❌ adBlockerProxy not loaded');
    return;
  }
  
  // 2. Check health
  console.log('Checking health...');
  const healthy = await window.adBlockerProxy.checkHealth();
  console.log(healthy ? '✅ Proxy is healthy' : '❌ Proxy is offline');
  
  // 3. Test URL generation
  const testUrl = 'https://vidsrc.me/embed/movie/tt0111161';
  const proxied = window.adBlockerProxy.getProxiedUrl(testUrl, 'vidsrc');
  console.log('Generated proxy URL:', proxied.substring(0, 80) + '...');
  
  // 4. Full test
  console.log('Running full provider test...');
  await window.adBlockerProxy.testProxy();
  
  console.log('✅ All tests complete!');
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.handleStreamButtonClick = handleStreamButtonClick;
  window.playSeriesEpisode = playSeriesEpisode;
  window.handleStreamInModal = handleStreamInModal;
}
