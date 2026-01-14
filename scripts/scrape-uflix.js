#!/usr/bin/env node
const fs = require('fs');
const puppeteer = require('puppeteer');

async function capture(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });
  await page.setViewport({ width: 1280, height: 800 });

  // Resist detection
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.navigator.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
  });

  const requests = [];
  page.on('request', r => {
    requests.push({ url: r.url(), resourceType: r.resourceType(), method: r.method(), timestamp: Date.now() });
  });
  page.on('response', async res => {
    try {
      const ct = res.headers()['content-type'] || '';
      const url = res.url();
      if (ct.includes('application/vnd.apple.mpegurl') || url.includes('.m3u8') || url.includes('.mp4') || url.includes('.mkv') ) {
        requests.push({ url, status: res.status(), contentType: ct, marker: 'interesting', timestamp: Date.now() });
      }
    } catch (e) {}
  });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.warn('Initial goto failed', e.message));

  // Find elements that look like stream buttons (text starting with Stream)
  const streamElements = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('a, button, div, span'))
      .filter(e => /\Stream\b\s*#?\d+/i.test((e.innerText || '').trim()));
    return els.map((e, i) => {
      // generate a simple unique path using tag + index among siblings
      const getPath = (el) => {
        if (!el) return '';
        const parts = [];
        while (el && el.nodeType === 1 && el.tagName.toLowerCase() !== 'html') {
          const tag = el.tagName.toLowerCase();
          let idx = 1;
          let sib = el.previousElementSibling;
          while (sib) { if (sib.tagName === el.tagName) idx++; sib = sib.previousElementSibling; }
          parts.unshift(`${tag}:nth-of-type(${idx})`);
          el = el.parentElement;
        }
        return parts.join(' > ');
      };
      return { index: i, text: e.innerText.trim().slice(0,80), path: getPath(e) };
    });
  });

  const results = [];
  const originalIframes = await page.$$eval('iframe', iframes => iframes.map(f => f.src));

  for (let i = 0; i < streamElements.length; i++) {
    const el = streamElements[i];
    console.log('Clicking candidate:', el.text, el.path);

    // Clear recent requests marker
    const startTs = Date.now();

    // Try to click the element using its path
    try {
      await page.evaluate((path) => {
        const el = document.querySelector(path);
        if (el) el.click();
      }, el.path);
    } catch (e) {
      console.warn('Click failed by path, trying a fallback text selector');
      try {
        await page.evaluate((txt) => {
          const elements = Array.from(document.querySelectorAll('a,button,div,span')).filter(e => (e.innerText||'').toLowerCase().includes(txt.toLowerCase()));
          if (elements && elements[0]) elements[0].click();
        }, el.text);
      } catch (e2) { console.warn('Fallback click also failed', e2.message); }
    }

    // Wait a short while for requests and iframes to load
    await page.waitForTimeout(2500);

    const endTs = Date.now();

    // Collect new requests in the time window
    const hits = requests.filter(r => r.timestamp >= startTs && r.timestamp <= endTs);

    // Capture iframe changes
    const currentIframes = await page.$$eval('iframe', iframes => iframes.map(f => f.src));
    const newIframes = currentIframes.filter(src => !originalIframes.includes(src));

    // Also try to find direct links in page overlays
    const foundLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a')).map(a => a.href).filter(Boolean);
      return links.slice(-20);
    });

    results.push({
      candidate: el,
      networkHits: hits,
      newIframes,
      recentLinks: foundLinks
    });

    // small delay before next
    await page.waitForTimeout(500);
  }

  await browser.close();

  return { url, streamCandidates: streamElements, results };
}

(async () => {
  const url = process.argv[2] || 'https://uflix.cc/movie/the-astronaut-2025?api=stream5';
  console.log('Starting scrape for', url);
  try {
    const out = await capture(url);
    fs.writeFileSync('uflix-streams.json', JSON.stringify(out, null, 2));
    console.log('Wrote ufllx results to uflix-streams.json');
    console.log('Done.');
  } catch (e) {
    console.error('Scrape failed:', e);
    process.exit(1);
  }
})();
