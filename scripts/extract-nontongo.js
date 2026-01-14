// Simple Puppeteer extractor for NontonGo embeds
// Usage: node scripts/extract-nontongo.js imdbId [movie|tv] [season] [episode]
const puppeteer = require('puppeteer');

async function extract(imdb, type='movie', season=null, episode=null){
  const embedUrl = type === 'tv' ? (season && episode ? `https://www.NontonGo.win/embed/tv/${imdb}/${season}/${episode}` : `https://www.NontonGo.win/embed/tv/?id=${imdb}&s=${season||''}&e=${episode||''}`) : `https://www.NontonGo.win/embed/movie/${imdb}`;
  console.log('Embed URL:', embedUrl);

  const browser = await puppeteer.launch({headless: true, args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (compatible; NontonGoExtractor/1.0)');
  await page.setViewport({width:1280, height:800});

  const found = new Set();

  page.on('request', req => {
    const url = req.url();
    if(/\.m3u8(\?|$)/i.test(url) || /\.mp4(\?|$)/i.test(url) || /playlist/i.test(url) && url.includes('.m3u8')){
      console.log('Network ->', url);
      found.add(url);
    }
  });

  page.on('response', async res => {
    try{
      const ct = (res.headers()['content-type'] || '').toLowerCase();
      if(ct.includes('mpegurl') || ct.includes('application/vnd.apple.mpegurl') || ct.startsWith('video/')){
        console.log('Response ->', res.url(), 'content-type:', ct);
        found.add(res.url());
        return;
      }
      // Also scan text/json/javascript responses for embedded m3u8 links
      if(ct.includes('json') || ct.includes('javascript') || ct.includes('text') || ct.includes('application/octet-stream')){
        try{
          const text = await res.text();
          if (text && /\.m3u8/i.test(text)) {
            const re = /https?:\/\/[^"'()\s]+\.m3u8[^"'()\s]*/ig;
            const matches = text.match(re) || [];
            matches.forEach(m => found.add(m));
            return;
          }
        }catch(e){}
      }
    }catch(e){}
  });

  try{
    const resp = await page.goto(embedUrl, {waitUntil:'domcontentloaded', timeout:30000});
    console.log('Page status:', resp && resp.status());

    // Try to click the play button if present
    const playSelectors = ['.video-play-button', '.fa-play', '.video-play', '#play', '.play-button', '.btn-play'];
    for(const sel of playSelectors){
      const el = await page.$(sel);
      if(el){
        console.log('Clicking play selector:', sel);
        try{ await el.click(); }catch(e){ console.log('Click failed:', e.message); }
        break;
      }
    }

    // Try clicking nested frames' play buttons too (a few retries)
    for(let attempt=0; attempt<4; attempt++){
      await new Promise(r=>setTimeout(r, 1000));
      const frames = page.frames();
      let clicked = false;
      for(const f of frames){
        for(const sel of playSelectors){
          try{
            const el = await f.$(sel);
            if(el){
              console.log('Clicking play selector inside frame:', sel, 'frame:', f.url().slice(0,60));
              try{ await el.click(); clicked = true; }catch(e){ }
            }
          }catch(e){}
        }
      }
      if(clicked) break;
    }

    // Wait up to 20s for network activity after interactions
    await new Promise(r => setTimeout(r, 20000));

    if(found.size === 0){
      console.log('No manifest/mp4 found in automated run. Scanning DOM for <video> and nested iframes...');
      try{
        const frames = page.frames();
        for(const f of frames){
          try{
            const vids = await f.$$eval('video', nodes => nodes.map(v => ({src: v.currentSrc || v.src, poster: v.poster || null})).slice(0,10));
            if(vids && vids.length) console.log('Frame', f.url().slice(0,100), 'videos:', JSON.stringify(vids));
            const iframes = await f.$$eval('iframe', nodes => nodes.map(i => i.src).slice(0,10));
            if(iframes && iframes.length) console.log('Frame', f.url().slice(0,100), 'iframes:', JSON.stringify(iframes));
          }catch(e){}
        }
      }catch(e){ console.log('DOM scan failed', e && e.message); }
      console.log('Extraction finished — no direct manifest/mp4 detected.');
    } else {
      console.log('Found URLs:');
      for(const u of found) console.log(u);
    }
  }catch(err){
    console.error('Extractor error:', err.message);
  }finally{
    await browser.close();
  }
}

const args = process.argv.slice(2);
if(args.length < 1){
  console.error('Usage: node scripts/extract-nontongo.js <imdbId> [movie|tv] [season] [episode]');
  process.exit(1);
}
extract(args[0], args[1] || 'movie', args[2] || null, args[3] || null).then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(2);});