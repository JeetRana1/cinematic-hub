/**
 * Ad-Blocker Proxy Integration
 * Use this in your video streaming code to remove ads
 */

class AdBlockerProxy {
  constructor(proxyUrl = 'http://localhost:3001') {
    this.proxyUrl = proxyUrl;
    this.isHealthy = false;
    this.checkHealth();
  }

  /**
   * Check if proxy server is running
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.proxyUrl}/api/health`);
      this.isHealthy = response.ok;
      console.log(`✅ Ad-Blocker Proxy: ${this.isHealthy ? 'ONLINE' : 'OFFLINE'}`);
      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      console.log('⚠️ Ad-Blocker Proxy: OFFLINE - Ad blocking disabled');
      return false;
    }
  }

  /**
   * Get cleaned video URL through proxy
   * @param {string} videoUrl - The original video URL
   * @param {string} provider - Video provider (vidsrc, vidplay, filemoon, etc.)
   * @returns {string} - Proxied URL
   */
  getProxiedUrl(videoUrl, provider = 'generic') {
    if (!this.isHealthy) {
      console.warn('Proxy not available, returning original URL');
      return videoUrl;
    }

    const encodedUrl = encodeURIComponent(videoUrl);
    return `${this.proxyUrl}/api/proxy/video?url=${encodedUrl}&provider=${provider}`;
  }

  /**
   * Load video in an iframe with ad blocking
   * @param {string} videoUrl - The video URL
   * @param {string} provider - Video provider
   * @param {HTMLElement} container - Container element for iframe
   */
  loadVideoInContainer(videoUrl, provider, container) {
    if (!container) return;

    const proxiedUrl = this.getProxiedUrl(videoUrl, provider);
    
    const iframe = document.createElement('iframe');
    iframe.src = proxiedUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.allow = 'fullscreen; picture-in-picture';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', '');

    container.innerHTML = '';
    container.appendChild(iframe);
  }

  /**
   * Create a cleaned embed URL for use in existing player
   * @param {string} videoUrl - The video URL
   * @param {string} provider - Video provider
   * @returns {Promise<string>} - Cleaned embed URL
   */
  async getCleanedEmbed(videoUrl, provider) {
    if (!this.isHealthy) {
      return videoUrl;
    }

    try {
      const proxiedUrl = this.getProxiedUrl(videoUrl, provider);
      return proxiedUrl;
    } catch (error) {
      console.error('Error getting cleaned embed:', error);
      return videoUrl;
    }
  }

  /**
   * Test the proxy with a sample video
   * Useful for debugging
   */
  async testProxy() {
    const testUrls = {
      vidsrc: 'https://vidsrc.me/embed/movie/tt0111161',
      vidplay: 'https://vidplay.online/embed/movie/tt1375666'
    };

    console.log('🧪 Testing Ad-Blocker Proxy...');
    
    for (const [provider, url] of Object.entries(testUrls)) {
      try {
        const health = await this.checkHealth();
        if (!health) break;

        const proxiedUrl = this.getProxiedUrl(url, provider);
        console.log(`✅ ${provider}: ${proxiedUrl.substring(0, 80)}...`);
      } catch (error) {
        console.error(`❌ ${provider} test failed:`, error);
      }
    }
  }
}

// Ad-blocker proxy integration disabled by user request
window.adBlockerProxy = { isHealthy: false, getProxiedUrl: (u)=>u, loadVideoInContainer: ()=>{}, getCleanedEmbed: async (u)=>u };

// Export stub
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.adBlockerProxy;
}
