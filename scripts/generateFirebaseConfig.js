// scripts/generateFirebaseConfig.js
// Generates firebaseConfig.js from Vercel environment variables at build time

const fs = require('fs');
const path = require('path');
const ENV_FILES = ['.env', '.env.local'];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  const out = {};
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) return;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  });
  return out;
}

const repoRoot = path.join(__dirname, '..');
const fileEnv = {};
ENV_FILES.forEach((name) => {
  Object.assign(fileEnv, parseEnvFile(path.join(repoRoot, name)));
});

const getEnv = (name) => {
  if (process.env[name] != null && process.env[name] !== '') return process.env[name];
  if (fileEnv[name] != null && fileEnv[name] !== '') return fileEnv[name];
  return undefined;
};

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('FIREBASE_APP_ID'),
};

const configString = `window.firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};\n`;

// Ensure public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}
fs.writeFileSync(path.join(publicDir, 'firebaseConfig.js'), configString);
console.log('public/firebaseConfig.js generated successfully.');
