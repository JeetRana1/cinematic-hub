/**
 * Multi-Language Audio Selector
 * Allows users to select different audio tracks and subtitles
 */

(function() {
  'use strict';

  class AudioLanguageSelector {
    constructor(playerContainerId = 'player-container') {
      this.playerContainer = document.getElementById(playerContainerId);
      this.currentStream = null;
      this.availableLanguages = [];
      this.init();
    }

    init() {
      this.createUI();
    }

    createUI() {
      // Create audio selector HTML
      const selectorHTML = `
        <div id="audio-language-selector" class="audio-selector">
          <style>
            .audio-selector {
              position: relative;
              z-index: 1000;
              margin: 10px 0;
              display: flex;
              gap: 10px;
              align-items: center;
              flex-wrap: wrap;
              background: rgba(0, 0, 0, 0.7);
              padding: 10px;
              border-radius: 4px;
            }

            .audio-selector label {
              color: white;
              font-size: 14px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .audio-selector select,
            .audio-selector button {
              padding: 6px 12px;
              border: 1px solid #666;
              border-radius: 4px;
              background: rgba(255, 255, 255, 0.1);
              color: white;
              cursor: pointer;
              font-size: 13px;
              transition: all 0.3s ease;
            }

            .audio-selector select:hover,
            .audio-selector button:hover {
              background: rgba(255, 255, 255, 0.2);
              border-color: #a66cff;
            }

            .audio-selector select:focus,
            .audio-selector button:focus {
              outline: none;
              background: rgba(255, 255, 255, 0.3);
              border-color: #a66cff;
              box-shadow: 0 0 10px rgba(166, 108, 255, 0.5);
            }

            .quality-badge {
              background: linear-gradient(135deg, #a66cff 0%, #7c3aed 100%);
              padding: 4px 8px;
              border-radius: 3px;
              font-size: 12px;
              font-weight: 600;
              color: white;
            }

            .provider-badge {
              background: rgba(166, 108, 255, 0.3);
              padding: 4px 8px;
              border-radius: 3px;
              font-size: 12px;
              color: #a66cff;
              border: 1px solid #a66cff;
            }

            @media (max-width: 768px) {
              .audio-selector {
                flex-direction: column;
                align-items: stretch;
              }

              .audio-selector select,
              .audio-selector button {
                width: 100%;
              }
            }
          </style>

          <label for="audio-track-select">🔊 Audio:</label>
          <select id="audio-track-select">
            <option value="">Loading...</option>
          </select>

          <label for="subtitle-select">📝 Subtitles:</label>
          <select id="subtitle-select">
            <option value="">None</option>
          </select>

          <button id="quality-info-btn" class="quality-badge">📺 Quality: --</button>
          <span id="provider-badge" class="provider-badge">Provider: --</span>
        </div>
      `;

      if (this.playerContainer) {
        this.playerContainer.insertAdjacentHTML('beforeend', selectorHTML);
      } else {
        // Add to body if no container
        document.body.insertAdjacentHTML('beforeend', selectorHTML);
      }

      this.attachEventListeners();
    }

    attachEventListeners() {
      const audioSelect = document.getElementById('audio-track-select');
      const subtitleSelect = document.getElementById('subtitle-select');
      const qualityBtn = document.getElementById('quality-info-btn');

      if (audioSelect) {
        audioSelect.addEventListener('change', (e) => this.onAudioTrackChange(e));
      }

      if (subtitleSelect) {
        subtitleSelect.addEventListener('change', (e) => this.onSubtitleChange(e));
      }

      if (qualityBtn) {
        qualityBtn.addEventListener('click', () => this.showQualityInfo());
      }
    }

    async loadStream(tmdbId, mediaType = 'movie', season = null, episode = null) {
      try {
        console.log('📥 Loading stream data...');
        
        if (!window.getEnhancedStream) {
          throw new Error('Enhanced Stream API not loaded');
        }

        const result = await window.getEnhancedStream(tmdbId, mediaType, season, episode);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to get stream');
        }

        this.currentStream = result;
        
        // Update UI with available languages
        await this.updateLanguageOptions();
        
        // Update provider badge
        this.updateProviderBadge();
        
        // Update quality info
        this.updateQualityInfo();

        console.log('✅ Stream loaded successfully');
        return result;
      } catch (error) {
        console.error('❌ Error loading stream:', error);
        this.showError(error.message);
        return null;
      }
    }

    async updateLanguageOptions() {
      const audioSelect = document.getElementById('audio-track-select');
      if (!audioSelect || !this.currentStream) return;

      try {
        const languages = await window.getAudioLanguages(this.currentStream);
        
        audioSelect.innerHTML = '';
        languages.forEach((lang, index) => {
          const option = document.createElement('option');
          option.value = index;
          option.textContent = lang;
          if (index === 0) option.selected = true;
          audioSelect.appendChild(option);
        });

        this.availableLanguages = languages;
        console.log('🎵 Available audio languages:', languages);
      } catch (error) {
        console.error('Error updating language options:', error);
        audioSelect.innerHTML = '<option value="0">English (Default)</option>';
      }
    }

    updateSubtitleOptions() {
      const subtitleSelect = document.getElementById('subtitle-select');
      if (!subtitleSelect || !this.currentStream) return;

      try {
        const subtitles = window.getSubtitles(this.currentStream);
        
        subtitleSelect.innerHTML = '<option value="">None</option>';
        subtitles.forEach((sub, index) => {
          const option = document.createElement('option');
          option.value = index;
          option.textContent = sub.lang;
          option.dataset.url = sub.url;
          subtitleSelect.appendChild(option);
        });

        console.log('📚 Available subtitles:', subtitles.length);
      } catch (error) {
        console.error('Error updating subtitle options:', error);
      }
    }

    updateProviderBadge() {
      const badge = document.getElementById('provider-badge');
      if (badge && this.currentStream) {
        badge.textContent = `📡 Provider: ${this.currentStream.provider || 'Unknown'}`;
      }
    }

    updateQualityInfo() {
      const btn = document.getElementById('quality-info-btn');
      if (btn && this.currentStream) {
        const quality = window.getBestQuality(this.currentStream);
        btn.textContent = `📺 Quality: ${quality}`;
      }
    }

    onAudioTrackChange(event) {
      const selectedIndex = event.target.value;
      const language = this.availableLanguages[selectedIndex];
      
      console.log('🔊 Audio track changed to:', language);
      
      // Dispatch custom event for player to handle
      window.dispatchEvent(new CustomEvent('audioLanguageChanged', {
        detail: { language, index: selectedIndex }
      }));
    }

    onSubtitleChange(event) {
      const selectedIndex = event.target.value;
      
      if (selectedIndex === '') {
        console.log('📝 Subtitles disabled');
        window.dispatchEvent(new CustomEvent('subtitleChanged', {
          detail: { subtitle: null, enabled: false }
        }));
        return;
      }

      const option = event.target.options[event.target.selectedIndex];
      const subtitleUrl = option.dataset.url;
      const subtitleLang = option.textContent;

      console.log('📝 Subtitle changed to:', subtitleLang);
      
      window.dispatchEvent(new CustomEvent('subtitleChanged', {
        detail: { 
          language: subtitleLang,
          url: subtitleUrl,
          enabled: true,
          index: selectedIndex
        }
      }));
    }

    showQualityInfo() {
      if (!this.currentStream) {
        alert('No stream loaded');
        return;
      }

      let info = `Stream Information:\n\n`;
      info += `Provider: ${this.currentStream.provider}\n`;
      info += `Quality: ${window.getBestQuality(this.currentStream)}\n`;
      info += `Type: ${this.currentStream.type}\n`;
      info += `Languages: ${this.availableLanguages.join(', ')}\n`;
      info += `Audio Tracks: ${this.currentStream.audioTracks?.length || 'Unknown'}\n`;
      info += `Subtitles: ${window.getSubtitles(this.currentStream).length}\n`;

      console.log(info);
      alert(info);
    }

    showError(message) {
      const selector = document.getElementById('audio-language-selector');
      if (selector) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
          background: rgba(255, 0, 0, 0.2);
          border: 1px solid #ff0000;
          color: #ff6b6b;
          padding: 10px;
          border-radius: 4px;
          margin: 10px 0;
        `;
        errorDiv.textContent = `❌ Error: ${message}`;
        selector.insertAdjacentElement('afterend', errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
      }
    }
  }

  // Global instance
  window.audioLanguageSelector = null;

  window.initAudioLanguageSelector = function(containerId) {
    if (!window.audioLanguageSelector) {
      window.audioLanguageSelector = new AudioLanguageSelector(containerId);
    }
    return window.audioLanguageSelector;
  };

  console.log('✅ Audio Language Selector loaded');
})();
