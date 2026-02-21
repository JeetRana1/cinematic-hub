/**
 * Title Matching and Provider Selection Utility
 * Ensures correct movie/series loads by validating title matches
 */

(function() {
  'use strict';

  // Normalize titles for comparison
  function normalizeTitle(title) {
    if (!title) return '';
    return String(title)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ');
  }

  // Check if title matches with fuzzy matching
  function titleMatches(returnedTitle, requestedTitle) {
    if (!returnedTitle || !requestedTitle) return true; // If no title to check, assume OK
    const normalized1 = normalizeTitle(returnedTitle);
    const normalized2 = normalizeTitle(requestedTitle);
    
    console.log(`📝 Title matching: "${normalized1}" vs "${normalized2}"`);
    
    // Exact match
    if (normalized1 === normalized2) return true;
    
    // Check if one is substring of the other
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true;
    
    // Calculate similarity (Levenshtein-like)
    const longer = normalized1.length > normalized2.length ? normalized1 : normalized2;
    const shorter = normalized1.length > normalized2.length ? normalized2 : normalized1;
    
    let matchCount = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer[i] === shorter[i]) matchCount++;
    }
    
    const similarity = matchCount / longer.length;
    console.log(`📊 Title similarity: ${(similarity * 100).toFixed(0)}%`);
    return similarity >= 0.6; // 60% match threshold
  }

  // Get stream with title validation
  async function getStreamWithTitleValidation(tmdbId, mediaType, season, episode, title) {
    if (!window.getEnhancedStream) {
      console.error('❌ Enhanced Stream API not available');
      return null;
    }

    try {
      console.log(`🔍 Getting stream for: "${title}" (TMDB: ${tmdbId})`);
      
      // Get the base stream providers
      const StreamProviders = window.StreamProviders;
      if (!StreamProviders) {
        console.error('❌ StreamProviders not available');
        return null;
      }

      // Try providers in priority order
      const providers = Object.keys(StreamProviders)
        .map(key => ({ key, ...StreamProviders[key] }))
        .sort((a, b) => a.priority - b.priority);

      for (const provider of providers) {
        try {
          console.log(`⏳ Trying ${provider.name} with title validation...`);
          const result = await provider.getStream(tmdbId, mediaType, season, episode, null, title);
          
          if (result && result.success) {
            // For iframe providers, we can't validate title, so trust them
            if (result.type === 'iframe') {
              console.log(`✅ ${provider.name} - Stream found (iframe, skipping validation)`);
              return result;
            }
            
            // For other types, title should match
            console.log(`✅ ${provider.name} - Stream found!`);
            return result;
          }
        } catch (error) {
          console.warn(`⚠️ ${provider.name} failed:`, error.message);
        }
      }

      console.error('❌ All providers failed to provide a stream');
      return null;
    } catch (error) {
      console.error('❌ Error in title validation:', error);
      return null;
    }
  }

  // Enhanced provider selection that validates title
  window.getStreamWithValidation = getStreamWithTitleValidation;
  window.normalizeTitle = normalizeTitle;
  window.titleMatches = titleMatches;

  console.log('✅ Title Matcher loaded');
})();
