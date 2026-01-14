#!/usr/bin/env node
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = process.argv[2];
  const referer = process.argv[3] || '';
  if (!url) { console.error('Usage: node analyze-embed.js <url> [referer]'); process.exit(1); }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  if (referer) await page.setExtraHTTPHeaders({ referer });
  page.on('response', async res => {
    try {
      const ct = res.headers()['content-type'] || '';
      if (ct.includes('text/html')) {
        const text = await res.text();
        fs.writeFileSync('embed-source.html', text);
      }
    } catch (e) {}
  });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});
  await new Promise(r => setTimeout(r, 1200));

  // capture final HTML of iframe
  const html = await page.content();
  fs.writeFileSync('embed-page.html', html);

  // try to find m3u8 or mp4 urls
  const m3u8 = Array.from(html.matchAll(/https?:\/\/[^\"'\s>]+\.m3u8/gi)).map(m => m[0]);
  const mp4 = Array.from(html.matchAll(/https?:\/\/[^\"'\s>]+\.(mp4|mkv)/gi)).map(m => m[0]);
  const iframes = await page.$$eval('iframe', els => els.map(e=>e.src));
  console.log({ url, referer, m3u8, mp4, iframes });

  await browser.close();
})();