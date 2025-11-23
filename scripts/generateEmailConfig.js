// scripts/generateEmailConfig.js
// Generates public/emailConfig.js from Vercel environment variables

const fs = require('fs');
const path = require('path');


const EMAILJS_CONFIG = {
  enabled: String(process.env.EMAILJS_ENABLED).toLowerCase() === 'true',
  publicKey: process.env.EMAILJS_PUBLIC_KEY || '',
  serviceId: process.env.EMAILJS_SERVICE_ID || '',
  templateId: process.env.EMAILJS_TEMPLATE_ID || ''
};

const configString = `window.EMAILJS = ${JSON.stringify(EMAILJS_CONFIG, null, 2)};\n`;

// Ensure public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}
fs.writeFileSync(path.join(publicDir, 'emailConfig.js'), configString);
console.log('public/emailConfig.js generated successfully.');
