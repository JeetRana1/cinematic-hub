// Lightweight toast system
(function(){
  const styles = `
  /* Elevate above modals (profiles.html .modal uses z-index: 99999) */
  .toast-wrap{position:fixed;top:18px;right:18px;display:flex;flex-direction:column;gap:10px;z-index:120000}
  /* Keep toast crisp and above overlays */
  .toast-item{min-width:260px;max-width:90vw;display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,0.14);background:rgba(22,22,28,0.95);color:#fff;box-shadow:0 10px 30px rgba(0,0,0,0.35);animation:toastIn .25s ease both}
  .toast-item .icon{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:0 0 28px;margin-top:2px}
  .toast-item .title{font-weight:600;margin-bottom:2px}
  .toast-item .close{margin-left:auto;background:transparent;border:none;color:inherit;cursor:pointer;font-size:18px;line-height:1;opacity:.8}
  .toast-item .close:hover{opacity:1}
  .toast-info{border-left:4px solid #60a5fa}.toast-info .icon{background:rgba(96,165,250,0.15)}
  .toast-success{border-left:4px solid #34d399}.toast-success .icon{background:rgba(52,211,153,0.15)}
  .toast-warning{border-left:4px solid #fbbf24}.toast-warning .icon{background:rgba(251,191,36,0.15)}
  .toast-error{border-left:4px solid #f87171}.toast-error .icon{background:rgba(248,113,113,0.15)}
  @keyframes toastIn{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}
  `;
  function ensure(){
    if(!document.getElementById('toast-style')){
      const s = document.createElement('style'); s.id='toast-style'; s.textContent = styles; document.head.appendChild(s);
    }
    
    // Check if we're in fullscreen mode
    const fullscreenElement = document.fullscreenElement || 
                             document.webkitFullscreenElement || 
                             document.mozFullScreenElement || 
                             document.msFullscreenElement;
    
    // Determine the parent element (fullscreen element or body)
    const parentElement = fullscreenElement || document.body;
    
    // Check if toast-wrap already exists in the parent
    let wrap = parentElement.querySelector('.toast-wrap');
    
    if(!wrap) { 
      wrap = document.createElement('div'); 
      wrap.className='toast-wrap';
      // Set max z-index to ensure it's above everything
      wrap.style.zIndex = '2147483647';
      // Ensure position is fixed and in the top-right corner
      wrap.style.position = 'fixed';
      wrap.style.top = '18px';
      wrap.style.right = '18px';
      
      parentElement.appendChild(wrap);
    } 
    
    return wrap;
  }
  function iconSvg(){
    const svg = document.createElement('span');
    svg.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Zm1 14h-2v-2h2v2Zm0-4h-2V7h2v5Z"/></svg>';
    return svg;
  }
  function showToast(type, title, msg, timeout){
    const wrap = ensure();
    const item = document.createElement('div');
    item.className = `toast-item toast-${type||'info'}`;
    item.innerHTML = `
      <div class="icon">${iconSvg().innerHTML}</div>
      <div class="content">
        <div class="title">${title||''}</div>
        <div class="msg">${msg||''}</div>
      </div>
      <button class="close" aria-label="Close">×</button>
    `;
    const closeBtn = item.querySelector('.close');
    closeBtn.addEventListener('click', ()=> item.remove());
    wrap.appendChild(item);
    setTimeout(()=>{ item.style.opacity='0'; setTimeout(()=> item.remove(), 250); }, Math.max(2000, timeout||3500));
  }
  window.UIToast = {
    info: (t,m,tm)=>showToast('info', t, m, tm),
    success: (t,m,tm)=>showToast('success', t, m, tm),
    warning: (t,m,tm)=>showToast('warning', t, m, tm),
    error: (t,m,tm)=>showToast('error', t, m, tm),
  };
})();
