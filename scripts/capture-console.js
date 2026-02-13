// capture-console.js
// Launches Playwright, navigates to localhost:3000, captures console messages for 10s
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => {
    console.log(`[page ${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => console.log('[page error]', err.toString()));
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('Page loaded, waiting 8s for logs...');
    await page.waitForTimeout(8000);
  } catch (e) { console.error('Error during capture:', e); }
  await browser.close();
})();
