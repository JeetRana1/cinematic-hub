#!/usr/bin/env node
/**
 * Playwright snooper for net20 (or any HLS page)
 * Prints all .m3u8 requests + referer so you can plug them into your player.
 *
 * Usage:
 *   npm run snoop:net20 -- --url="https://net20.cc/<playback-page>" [--headful]
 *
 * Notes:
 * - Default is headless to reduce detection. Use --headful to see the page.
 * - Solve any captcha if shown, then let the video start; logs will appear.
 */

const { chromium } = require('playwright');

function parseArgs() {
  const args = process.argv.slice(2);
  // Default to headful so you can solve prompts
  const out = { headless: false };
  for (const arg of args) {
    if (arg.startsWith('--url=')) out.url = arg.replace('--url=', '').trim();
    if (arg === '--headful') out.headless = false;
    if (arg === '--headless') out.headless = true;
    if (arg.startsWith('--profile=')) out.profile = arg.replace('--profile=', '').trim();
  }
  out.url = out.url || process.env.URL;
  return out;
}

(async () => {
  const { url, headless, profile } = parseArgs();
  if (!url) {
    console.error('❌ Missing --url. Example: npm run snoop:net20 -- --url="https://net20.cc/play/123"');
    process.exit(1);
  }

  // Use persistent profile to retain login/cookies
  const userDataDir = profile || require('path').join(process.cwd(), '.playwright-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless,
    args: ['--disable-blink-features=AutomationControlled'],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const seen = new Set();
  page.on('request', req => {
    const url = req.url();
    if (url.includes('.m3u8')) {
      if (seen.has(url)) return;
      seen.add(url);
      const headers = req.headers();
      const referer = headers['referer'] || headers['referrer'] || '(none)';
      console.log('\n🎯 M3U8 REQUEST');
      console.log('URL     :', url);
      console.log('Referer :', referer);
      console.log('UA      :', headers['user-agent'] || '(not sent)');
    }
  });

  page.on('response', async res => {
    const url = res.url();
    if (!url.includes('.m3u8')) return;
    const ct = res.headers()['content-type'] || '';
    const status = res.status();
    console.log('📦 Response:', status, ct, url);
  });

  page.on('console', msg => {
    const type = msg.type();
    if (type === 'log' || type === 'info' || type === 'warn' || type === 'error') {
      console.log('[page]', type.toUpperCase(), msg.text());
    }
  });

  console.log('🚀 Opening', url, 'headless:', headless ? 'yes' : 'no');
  console.log('🗂  Profile:', userDataDir);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  console.log('⏳ Waiting for network activity... play the video if needed. Keep this window open.');

  // Try to poke the player once the page is ready
  try {
    await page.waitForTimeout(3000);
    await page.keyboard.press('Space'); // common play shortcut
    // If JW Player is present, log playlist
    const hasJW = await page.evaluate(() => typeof window.jwplayer === 'function');
    if (hasJW) {
      const playlist = await page.evaluate(() => {
        try {
          const inst = window.jwplayer && window.jwplayer();
          return inst && typeof inst.getPlaylist === 'function' ? inst.getPlaylist() : null;
        } catch (e) { return null; }
      });
      if (playlist) {
        console.log('🎞️ JW Playlist found:', JSON.stringify(playlist));
      }
    }
  } catch (e) {
    console.log('ℹ️ Player poke skipped:', e.message);
  }

  // Keep alive for enough time to interact
  await page.waitForTimeout(180000);
})();
