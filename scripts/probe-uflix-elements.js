#!/usr/bin/env node
const fs = require('fs');
const puppeteer = require('puppeteer');

async function probe(url) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});

  const candidates = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('a,button,div,span'));
    const visible = el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 6 && rect.height > 6 && style && style.visibility !== 'hidden' && style.display !== 'none' && !(el.offsetParent === null);
    };

    const out = [];
    for (const e of els) {
      const text = (e.innerText || '').trim().replace(/\s+/g, ' ');
      const html = (e.outerHTML || '').slice(0, 500);
      const attrs = {};
      for (const a of e.attributes || []) attrs[a.name] = a.value;
      if (!visible(e) && !text) continue;
      out.push({ tag: e.tagName.toLowerCase(), text: text.slice(0,200), html, className: e.className || '', id: e.id || '', attrs, rect: e.getBoundingClientRect() });
    }
    // sort by vertical position
    out.sort((a,b) => (a.rect.top || 0) - (b.rect.top || 0));
    return out.slice(0,200);
  });

  await browser.close();
  return candidates;
}

(async () => {
  const url = process.argv[2] || 'https://uflix.cc/movie/the-astronaut-2025?api=stream5';
  console.log('Probing', url);
  try {
    const candidates = await probe(url);
    fs.writeFileSync('uflix-candidates.json', JSON.stringify({ url, candidates }, null, 2));
    console.log('Wrote uflix-candidates.json');
  } catch (e) {
    console.error('Probe failed:', e);
    process.exit(1);
  }
})();