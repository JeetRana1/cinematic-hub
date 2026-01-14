#!/usr/bin/env node
const fs = require('fs');
const puppeteer = require('puppeteer');

async function run(url) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  const network = [];
  page.on('request', r => network.push({ type: 'req', url: r.url(), resourceType: r.resourceType(), method: r.method(), ts: Date.now() }));
  page.on('response', async res => {
    try {
      const url = res.url();
      const ct = res.headers()['content-type'] || '';
      network.push({ type: 'res', url, status: res.status(), contentType: ct, ts: Date.now() });
    } catch (e) {}
  });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});
  await new Promise(r => setTimeout(r, 500));

  const links = await page.$$eval('a.btn-stream', els => els.map(e => ({ href: e.href, text: (e.innerText||'').trim() })));

  const results = [];
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    console.log('Clicking stream link:', link.text, link.href);
    const before = Date.now();

    // click the nth stream button
    try {
      const elements = await page.$$('a.btn-stream');
      if (elements[i]) {
        await elements[i].click();
      } else {
        console.warn('No element for index', i);
      }
    } catch (e) { console.warn('Click error', e.message); }

    await new Promise(r => setTimeout(r, 2500));

    const iframeSrc = await page.$eval('#ve-iframe', f => f ? f.src : null).catch(()=>null);

    const hits = network.filter(n => n.ts >= before && n.ts <= Date.now() && /\.m3u8|\.mp4|magnet:|torrent|player|play|stream/i.test(n.url));

    const pageUrl = page.url();

    results.push({ index: i+1, link, iframeSrc, pageUrl, hits });
  }

  await browser.close();
  return { url, results };
}

(async () => {
  const url = process.argv[2] || 'https://uflix.cc/movie/the-astronaut-2025?api=stream5';
  console.log('Running click-streams on', url);
  try {
    const out = await run(url);
    fs.writeFileSync('uflix-click-results.json', JSON.stringify(out, null, 2));
    console.log('Wrote uflix-click-results.json');
  } catch (e) {
    console.error('Error', e);
    process.exit(1);
  }
})();