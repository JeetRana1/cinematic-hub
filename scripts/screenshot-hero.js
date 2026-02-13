// screenshot-hero.js
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'hero-screenshot.png', fullPage: false });
  console.log('Screenshot saved: hero-screenshot.png');
  await browser.close();
})();