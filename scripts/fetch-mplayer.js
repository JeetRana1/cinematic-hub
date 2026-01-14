#!/usr/bin/env node
const fs = require('fs');
const puppeteer = require('puppeteer');

async function analyze(mplayerUrl) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const resources = [];
  page.on('request', r => resources.push({ type: 'req', url: r.url(), resourceType: r.resourceType(), method: r.method(), ts: Date.now() }));
  page.on('response', async res => {
    try {
      const url = res.url();
      const ct = res.headers()['content-type'] || '';
      resources.push({ type: 'res', url, status: res.status(), contentType: ct, ts: Date.now() });
    } catch (e) {}
  });

  await page.goto(mplayerUrl, { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});
  await new Promise(r => setTimeout(r, 1500));

  // Try clicking the center of the player area to force 3rd-party load
  try {
    const rect = await page.evaluate(() => {
      const el = document.querySelector('.ratio') || document.querySelector('body');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.floor(r.left + r.width/2), y: Math.floor(r.top + r.height/2) };
    });
    if (rect && rect.x && rect.y) {
      await page.mouse.click(rect.x, rect.y, { button: 'left' });
      await new Promise(r => setTimeout(r, 3000));
    }
  } catch (e) { console.warn('Center click failed', e.message); }

  // grab page HTML
  const html = await page.content();

  // try to find m3u8/mp4 URLs in HTML (regex)
  const reM3U8 = /https?:\/\/[^"]+?\.m3u8/gi;
  const reMP4 = /https?:\/\/[^"]+?\.(mp4|mkv)/gi;
  const matches = []; let m;
  while ((m = reM3U8.exec(html)) !== null) matches.push(m[0]);
  const mp4s = [];
  while ((m = reMP4.exec(html)) !== null) mp4s.push(m[0]);
  const iframes = await page.$$eval('iframe', iframes => iframes.map(f => f.src));

  // Look for known embed hostnames inside HTML or inline scripts
  const hostRegex = /(2embed|smashystream|vidsrc|vidplus|databasegdriveplayer|player\.vidplus|gdriveplayer|gcloud|drive\.google|dl\.smashystream|streamtape|mixdrop|mp4upload)/ig;
  const hostMatches = [];
  let hm;
  while ((hm = hostRegex.exec(html)) !== null) hostMatches.push(hm[0]);

  await browser.close();
  return { mplayerUrl, matches, mp4s, iframes, resources: resources.slice(-200) };
}

(async () => {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.error('Usage: node scripts/fetch-mplayer.js <url1> <url2> ...');
    process.exit(1);
  }
  const results = [];
  for (const url of urls) {
    try {
      console.log('Analyzing', url);
      const r = await analyze(url);
      results.push(r);
    } catch (e) {
      console.error('Failed to analyze', url, e.message);
    }
  }
  fs.writeFileSync('mplayer-analysis.json', JSON.stringify(results, null, 2));
  console.log('Wrote mplayer-analysis.json');
})();