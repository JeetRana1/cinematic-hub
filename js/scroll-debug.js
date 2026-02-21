(function(){
  if (window.__scrollDebugInstalled) return; window.__scrollDebugInstalled = true;
  const origScrollTo = window.scrollTo.bind(window);
  window.scrollTo = function(...args){
    try {
      console.warn('[scroll-debug] window.scrollTo called', args);
    } catch(e){}
    return origScrollTo(...args);
  };

  const origScrollBy = window.scrollBy ? window.scrollBy.bind(window) : null;
  if (origScrollBy) {
    window.scrollBy = function(...args){
      try { console.warn('[scroll-debug] window.scrollBy called', args); } catch(e){}
      return origScrollBy(...args);
    };
  }

  const origSIV = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function(...args){
    try {
      const desc = this && this.className ? this.className : this;
      if (!window.initialPageLoad) {
        console.warn('[scroll-debug] Element.scrollIntoView called', { el: desc, args });
      } else {
        console.info('[scroll-debug] Ignored scrollIntoView during initialPageLoad', { el: desc, args });
      }
    } catch(e){}
    return origSIV.apply(this, args);
  };

  // Also watch for programmatic scroll restoration
  try {
    const origRestore = history.scrollRestoration;
    console.info('[scroll-debug] history.scrollRestoration is', origRestore);
  } catch(e){}
})();
