#!/usr/bin/env node
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  const referer = process.argv[3] || '';
  if (!url) { console.error('Usage: node analyze-embed-click.js <url> [referer]'); process.exit(1); }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  if (referer) await page.setExtraHTTPHeaders({ referer });
  const resources = [];
  page.on('request', req => resources.push({ type: 'req', url: req.url(), resourceType: req.resourceType(), method: req.method(), ts: Date.now() }));
  page.on('response', async res => {
    try { resources.push({ type: 'res', url: res.url(), status: res.status(), contentType: res.headers()['content-type'] || '', ts: Date.now() }); } catch(e){}
  });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});
  await new Promise(r => setTimeout(r, 1000));

  // click center to start playback
  try {
    const rect = await page.evaluate(() => {
      const el = document.querySelector('video') || document.querySelector('.player') || document.body;
      const r = el.getBoundingClientRect();
      return { x: Math.floor(r.left + r.width/2), y: Math.floor(r.top + r.height/2) };
    });
    if (rect && rect.x && rect.y) {
      await page.mouse.click(rect.x, rect.y, { button: 'left' });
      console.log('Clicked center at', rect);
    }
  } catch(e) { console.warn('Click center failed', e.message); }

  await new Promise(r => setTimeout(r, 4000));

  const html = await page.content();
  const m3u8 = Array.from(html.matchAll(/https?:\/\/[^\"'\s>]+\.m3u8/gi)).map(m=>m[0]);
  const mp4 = Array.from(html.matchAll(/https?:\/\/[^\"'\s>]+\.(mp4|mkv)/gi)).map(m=>m[0]);

  // also extract XHR responses that contain m3u8
  const interesting = resources.filter(r => /m3u8|mp4|stream|play|token|file/i.test(r.url) || /(m3u8|mp4|application\/vnd\.apple\.mpegurl)/i.test(r.contentType));

  fs.writeFileSync('embed-click-result.json', JSON.stringify({ url, referer, m3u8, mp4, interesting, htmlSnippet: html.slice(0,2000) }, null, 2));
  console.log('Wrote embed-click-result.json');
  await browser.close();
})();