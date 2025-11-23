// scripts/generateEmailConfig.js
// Generates public/emailConfig.js from Vercel environment variables

const fs = require('fs');
const path = require('path');

const EMAILJS_ENABLED = process.env.EMAILJS_ENABLED;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;

const config = `window.EMAILJS = {
  enabled: ${EMAILJS_ENABLED},
  publicKey: "${EMAILJS_PUBLIC_KEY}",
  serviceId: "${EMAILJS_SERVICE_ID}",
  templateId: "${EMAILJS_TEMPLATE_ID}"
};
`;

const outPath = path.join(__dirname, '../public/emailConfig.js');
fs.writeFileSync(outPath, config);
console.log('Generated public/emailConfig.js');
