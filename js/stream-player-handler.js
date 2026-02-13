/**
 * Stream Player Handler
 * Handles both iframe and direct video streams
 */

(function() {
  'use strict';

  class StreamPlayer {
    constructor(playerId = 'video') {
      this.playerId = playerId;
      this.videoElement = document.getElementById(playerId);
      this.iframeContainer = null;
      this.currentStream = null;
      this.init();
    }

    init() {
      // Create iframe container if it doesn't exist
      const container = this.videoElement?.parentElement;
      if (container && !document.getElementById('stream-iframe-container')) {
        const iframeDiv = document.createElement('div');
        iframeDiv.id = 'stream-iframe-container';
        iframeDiv.style.cssText = `
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          display: none;
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
          overflow: hidden;
          background: #000;
        `;
        container.insertBefore(iframeDiv, this.videoElement);
        this.iframeContainer = iframeDiv;
      }
    }

    async loadStream(stream) {
      if (!stream || !stream.success) {
        this.showError('Invalid stream data');
        return false;
      }



      this.currentStream = stream;

      // Special logging for addon streams
      if (stream.addon) {
        console.log(`🎬 Loading ad-free addon stream from ${stream.provider} (Addon: ${stream.addon})`);
        console.log(`🎬 Stream features: ${stream.features ? stream.features.join(', ') : 'Direct Stream'}`);
      } else {
        console.log(`🎬 Loading stream from ${stream.provider}`);
      }

      // Handle magnet (torrent) streams in Player 2 using client-side WebTorrent
      if (stream.type === 'magnet') {
        // Only allow magnet streams in Player 2 (video element id: 'videoPlayer')
        if (this.playerId !== 'videoPlayer' && !(document.getElementById('videoPlayer'))) {
          console.warn(`Magnet stream ${stream.provider} is only supported in Player 2.`);
          this.showError(`${stream.provider} torrent streams are only supported in Player 2`);
          return false;
        }

        if (typeof window.startWebTorrent === 'function') {
          try {
            const ok = await window.startWebTorrent(stream.url);
            if (ok) {
              console.log(`✅ Magnet stream started from ${stream.provider}`);
              return true;
            } else {
              this.showError('Failed to start torrent stream');
              return false;
            }
          } catch (e) {
            console.error('❌ Error starting WebTorrent:', e);
            this.showError('Error starting torrent stream: ' + (e.message || e));
            return false;
          }
        } else {
          this.showError('WebTorrent not available in this player');
          return false;
        }
      }

      if (stream.type === 'iframe') {
        return this.loadIframeStream(stream);
      } else if (stream.type === 'hls' || stream.url?.includes('.m3u8')) {
        return this.loadHLSStream(stream);
      } else if (stream.type === 'mp4' || stream.url?.includes('.mp4')) {
        return this.loadMP4Stream(stream);
      } else {
        return this.loadMP4Stream(stream); // Default to MP4
      }
    }

    loadIframeStream(stream) {
      try {


        // Hide video element
        if (this.videoElement) {
          this.videoElement.style.display = 'none';
        }

        // Show iframe container
        if (!this.iframeContainer) {
          this.init();
        }

        this.iframeContainer.style.display = 'block';
        this.iframeContainer.innerHTML = '';

        // Create iframe using Vercel proxy endpoint
        const iframe = document.createElement('iframe');
        // Use deployed Vercel proxy endpoint for embed URLs
        iframe.src = `https://cinematic-hub.vercel.app/api/proxy?url=${encodeURIComponent(stream.url)}`;
        iframe.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 8px;
        `;
        iframe.allowFullscreen = true;
        iframe.allow = 'fullscreen; autoplay; encrypted-media';

        this.iframeContainer.appendChild(iframe);

        console.log(`✅ Iframe stream loaded via Vercel proxy from ${stream.provider}`);
        return true;
      } catch (error) {
        console.error('❌ Iframe load error:', error);
        this.showError('Failed to load iframe stream: ' + error.message);
        return false;
      }
    }

    loadHLSStream(stream) {
      try {
        // Show video element
        if (this.videoElement) {
          this.videoElement.style.display = 'block';
        }

        // Hide iframe
        if (this.iframeContainer) {
          this.iframeContainer.style.display = 'none';
        }

        // Check if HLS.js is available
        if (typeof Hls !== 'undefined') {
          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              defaultAudioCodec: undefined
            });

            hls.loadSource(stream.url);
            hls.attachMedia(this.videoElement);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              console.log(`✅ HLS stream loaded from ${stream.provider}`);
              this.videoElement.play().catch(e => console.warn('Autoplay blocked:', e));
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
              if (data.fatal) {
                console.error('❌ HLS fatal error:', data);
                this.showError('Failed to load HLS stream');
              }
            });

            return true;
          }
        } else {
          // Fallback for Safari or if HLS.js not available
          this.videoElement.src = stream.url;
          this.videoElement.play().catch(e => console.warn('Autoplay blocked:', e));
          console.log(`✅ Native HLS stream loaded from ${stream.provider}`);
          return true;
        }
      } catch (error) {
        console.error('❌ HLS load error:', error);
        this.showError('Failed to load HLS stream: ' + error.message);
        return false;
      }
    }

    loadMP4Stream(stream) {
      try {
        // Show video element
        if (this.videoElement) {
          this.videoElement.style.display = 'block';
        }

        // Hide iframe
        if (this.iframeContainer) {
          this.iframeContainer.style.display = 'none';
        }

        // Set video source
        this.videoElement.src = stream.url;

        console.log(`✅ MP4 stream loaded from ${stream.provider}`);

        // Try to play
        this.videoElement.play().catch(e => {
          console.warn('⚠️ Autoplay blocked, waiting for user interaction');
        });

        return true;
      } catch (error) {
        console.error('❌ MP4 load error:', error);
        this.showError('Failed to load MP4 stream: ' + error.message);
        return false;
      }
    }

    showError(message) {
      console.error('🔴 Player Error:', message);
      
      // Hide both video and iframe
      if (this.videoElement) {
        this.videoElement.style.display = 'none';
      }
      if (this.iframeContainer) {
        this.iframeContainer.style.display = 'none';
      }

      // Show error message
      const errorDiv = this.iframeContainer || this.videoElement?.parentElement;
      if (errorDiv) {
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = `
          background: rgba(255, 0, 0, 0.2);
          border: 2px solid #ff0000;
          color: #ff6b6b;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          font-size: 16px;
          margin: 20px 0;
        `;
        errorMsg.innerHTML = `
          <strong>❌ Error Loading Stream</strong><br>
          ${message}<br>
          <small style="color: #ccc; margin-top: 10px; display: block;">Please try another movie or refresh the page</small>
        `;
        errorDiv.appendChild(errorMsg);

        // Remove after 10 seconds
        setTimeout(() => errorMsg.remove(), 10000);
      }
    }

    getStreamInfo() {
      if (!this.currentStream) return null;

      return {
        provider: this.currentStream.provider,
        quality: this.currentStream.quality,
        type: this.currentStream.type,
        url: this.currentStream.url,
        languages: this.currentStream.languages || [],
        features: this.currentStream.features || [],
        addon: this.currentStream.addon || null,
        bypassed: this.currentStream.bypassed || false
      };
    }

    // Check if current stream is ad-free
    isAdFree() {
      return this.currentStream && (
        this.currentStream.bypassed ||
        this.currentStream.features?.includes('Ad-free') ||
        this.currentStream.addon
      );
    }

    // Get available languages for current stream
    getAvailableLanguages() {
      if (!this.currentStream) return ['English'];
      return this.currentStream.languages || ['English'];
    }

    // Switch to ad-free mode if available
    async switchToAdFree() {
      if (this.isAdFree()) {
        console.log('✅ Already playing ad-free stream');
        return true;
      }

      // Try to get an ad-free stream for the same content
      if (this.currentStream && window.getEnhancedStream) {
        try {
          console.log('🔄 Attempting to switch to ad-free stream...');

          // Extract TMDB ID from current stream URL or context
          const tmdbId = this.extractTmdbId();
          if (tmdbId) {
            const adFreeStream = await window.getEnhancedStream(
              tmdbId,
              this.currentStream.mediaType || 'movie',
              this.currentStream.season,
              this.currentStream.episode,
              null
            );

            if (adFreeStream && adFreeStream.success && adFreeStream.bypassed) {
              console.log('✅ Found ad-free alternative, loading...');
              return await this.loadStream(adFreeStream);
            }
          }
        } catch (error) {
          console.warn('⚠️ Failed to switch to ad-free stream:', error);
        }
      }

      console.log('⚠️ No ad-free alternative available');
      return false;
    }

    // Extract TMDB ID from various sources
    extractTmdbId() {
      // Try URL parameters first
      const urlParams = new URLSearchParams(window.location.search);
      const tmdbParam = urlParams.get('tmdb') || urlParams.get('id');
      if (tmdbParam) return tmdbParam;

      // Try from current stream URL
      if (this.currentStream && this.currentStream.url) {
        const match = this.currentStream.url.match(/\/(\d+)\//) || this.currentStream.url.match(/\/(\d+)$/);
        if (match) return match[1];
      }

      // Try from global movie data
      if (window.currentMovie && window.currentMovie.id) {
        return window.currentMovie.id;
      }

      return null;
    }
  }

  // Global instance
  window.streamPlayer = null;

  window.initStreamPlayer = function(videoId) {
    if (!window.streamPlayer) {
      window.streamPlayer = new StreamPlayer(videoId);
    }
    return window.streamPlayer;
  };

  // Helper function to play a movie/show
  window.playStream = async function(tmdbId, mediaType = 'movie', season = null, episode = null, videoId = 'video', title = null) {
    try {
      // Initialize player if not already done
      if (!window.streamPlayer) {
        window.initStreamPlayer(videoId);
      }

      // Show loading
      console.log('⏳ Loading stream...');

      // Get stream
      if (!window.getEnhancedStream) {
        throw new Error('Enhanced Stream API not loaded. Make sure js/enhanced-stream-api.js is included.');
      }

      const stream = await window.getEnhancedStream(tmdbId, mediaType, season, episode, null, title);

      if (!stream.success) {
        throw new Error(stream.error || 'Failed to get stream');
      }

      // Load stream in player
      const loaded = await window.streamPlayer.loadStream(stream);

      if (loaded) {
        console.log(`✅ Now playing: ${stream.provider} - ${stream.quality}`);
        return stream;
      } else {
        throw new Error('Failed to load stream in player');
      }
    } catch (error) {
      console.error('❌ Error playing stream:', error);
      if (window.streamPlayer) {
        window.streamPlayer.showError(error.message);
      }
      throw error;
    }
  };

  console.log('✅ Stream Player Handler loaded');
})();
