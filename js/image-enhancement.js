// Image Quality Enhancement Utility
// Simple and effective approach based on your working example

(function() {
  'use strict';
  
  // Function to enhance image quality
  function enhanceImageQuality(img) {
    // Apply CSS filters to enhance sharpness
    img.style.imageRendering = '-webkit-optimize-contrast';
    img.style.imageRendering = 'crisp-edges';
    img.style.webkitFontSmoothing = 'antialiased';
    img.style.mozOsxFontSmoothing = 'grayscale';
    
    // Apply subtle sharpening filter
    img.style.filter = 'contrast(105%) saturate(105%) brightness(102%)';
    img.style.webkitFilter = 'contrast(105%) saturate(105%) brightness(102%)';
  }
  
  // Function to handle image loading
  function handleImageLoad(img) {
    // Wait for image to fully load
    if (img.complete) {
      enhanceImageQuality(img);
    } else {
      img.addEventListener('load', function() {
        enhanceImageQuality(img);
      });
    }
  }
  
  // Process all images on the page
  function processImages() {
    // Get all images that might need enhancement
    const images = document.querySelectorAll('img.tmdb-image, .poster img, .movie-poster img, .continue-watching-poster img, #modalPosterImg');
    
    images.forEach(img => {
      handleImageLoad(img);
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      processImages();
    });
  } else {
    processImages();
  }
  
  // Export function to be used globally if needed
  window.enhanceImageQuality = function(img) {
    enhanceImageQuality(img);
  };
})();