// scripts/generateFirebaseConfig.js
// This script generates firebaseConfig.js from environment variables for Vercel deployment

const fs = require('fs');
const path = require('path');

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const configString = `window.firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};\n`;

fs.writeFileSync(path.join(__dirname, '../firebaseConfig.js'), configString);
console.log('firebaseConfig.js generated successfully.');
