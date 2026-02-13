// Image Quality Upgrader
// This script finds low-quality images and attempts to upgrade them to higher quality versions

(function() {
  'use strict';
  
  // Function to upgrade TMDB image quality by changing the size parameter
  function upgradeTmdbImage(src) {
    if (!src || typeof src !== 'string') return src;
    
    // Check if it's a TMDB image URL
    if (src.includes('image.tmdb.org')) {
      // Upgrade any TMDB size to the highest available quality (original)
      return src.replace(/\/w\d+\//g, '/original/');
    }
    
    return src;
  }
  
  // Function to upgrade image quality
  function upgradeImageQuality(img) {
    if (!img || !img.src) return;
    
    const originalSrc = img.src;
    const upgradedSrc = upgradeTmdbImage(originalSrc);
    
    // Only update if the URL actually changed
    if (upgradedSrc !== originalSrc) {
      // Temporarily set a class to indicate upgrading
      img.classList.add('upgrading-quality');
      
      // Create a new image to preload the higher quality version
      const newImg = new Image();
      newImg.onload = function() {
        // Replace the source once the new image is loaded
        img.src = upgradedSrc;
        img.classList.remove('upgrading-quality');
        img.classList.add('quality-upgraded');
        
        // Apply quality enhancements
        if (window.enhanceImageQuality) {
          window.enhanceImageQuality(img);
        }
      };
      
      newImg.onerror = function() {
        // If the higher quality image fails, keep the original
        img.classList.remove('upgrading-quality');
        console.log('Failed to load higher quality image:', upgradedSrc);
      };
      
      newImg.src = upgradedSrc;
    } else {
      // Even if URL didn't change, still apply quality enhancements
      if (window.enhanceImageQuality) {
        window.enhanceImageQuality(img);
      }
    }
  }
  
  // Process all images to upgrade quality
  function processImagesForUpgrade() {
    const images = document.querySelectorAll('img.tmdb-image, .poster img, .movie-poster img, .continue-watching-poster img, #modalPosterImg');
    
    images.forEach(img => {
      // Only upgrade if not already upgraded
      if (!img.classList.contains('quality-upgraded')) {
        upgradeImageQuality(img);
      }
    });
  }
  
  // Set up mutation observer to handle dynamically added images
  function setupUpgradeObserver() {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // Element node
            if (node.tagName === 'IMG' && 
                (node.classList.contains('tmdb-image') || 
                 node.closest('.poster') || 
                 node.closest('.movie-poster') || 
                 node.closest('.continue-watching-poster'))) {
              // Check if it's an image that should be upgraded
              if (!node.classList.contains('quality-upgraded')) {
                upgradeImageQuality(node);
              }
            } else {
              const images = node.querySelectorAll && node.querySelectorAll('img.tmdb-image, .poster img, .movie-poster img, .continue-watching-poster img, #modalPosterImg');
              if (images) {
                images.forEach(img => {
                  if (!img.classList.contains('quality-upgraded')) {
                    upgradeImageQuality(img);
                  }
                });
              }
            }
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // Wait a bit for other scripts to initialize
      setTimeout(() => {
        processImagesForUpgrade();
        setupUpgradeObserver();
      }, 500);
    });
  } else {
    setTimeout(() => {
      processImagesForUpgrade();
      setupUpgradeObserver();
    }, 500);
  }
  
  // Also run periodically to catch any images that might have been missed
  setInterval(processImagesForUpgrade, 3000);
  
})();