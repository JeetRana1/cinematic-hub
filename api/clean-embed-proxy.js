// Node.js Express backend proxy to sanitize embed HTML
const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const app = express();

// Example usage: /proxy?url=https://player.videasy.net/embed/12345
app.get('/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).send('Invalid URL');
  }
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    let html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, iframes, popups, overlays, ads
    $('script, iframe, [id*="ad"], [class*="ad"], [id*="popup"], [class*="popup"], [id*="banner"], [class*="banner"], [id*="overlay"], [class*="overlay"], ins, .adsbygoogle').remove();
    // Remove inline event handlers that trigger popups
    $('[onclick], [onmousedown], [onmouseup], [oncontextmenu], [onmouseover], [onmouseout]').removeAttr('onclick onmousedown onmouseup oncontextmenu onmouseover onmouseout');
    // Remove forms
    $('form').remove();
    // Remove external links
    $('a').each((i, el) => {
      $(el).attr('href', '#');
    });
    // Remove window.open and location changes
    $('body').append('<script>window.open = function(){}; window.location.assign = function(){}; window.location.replace = function(){};</script>');

    html = $.html();
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).send('Proxy error: ' + err.message);
  }
});

app.listen(3001, () => {
  console.log('Clean embed proxy running on port 3001');
});
