// generate-firebase-config.js
// Usage: node generate-firebase-config.js
// This script creates public/firebaseConfig.js from environment variables

const fs = require('fs');
const path = require('path');

const config = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const output = `window.firebaseConfig = ${JSON.stringify(config, null, 2)};\n`;
const outPath = path.join(__dirname, 'public', 'firebaseConfig.js');
fs.writeFileSync(outPath, output);
console.log('Generated public/firebaseConfig.js');
