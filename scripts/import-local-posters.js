#!/usr/bin/env node
// import-local-posters.js
// Copies local poster images from a source directory into the project's public/posters directory
// Usage: node scripts/import-local-posters.js "C:\Users\Jeet\Music\TESTMOVIES"

const fs = require('fs');
const path = require('path');

const srcDir = process.argv[2] || 'C:\\Users\\Jeet\\Music\\TESTMOVIES';
const destDir = path.join(__dirname, '..', 'public', 'posters');

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.\-]/g, '')
    .replace(/-+/g, '-');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFiles(src, dest) {
  ensureDir(dest);
  const files = fs.readdirSync(src);
  let count = 0;

  files.forEach(file => {
    const full = path.join(src, file);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      // Recurse into subdirectories
      copyFiles(full, dest);
      return;
    }

    const ext = path.extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return;

    const base = path.basename(file, ext);
    const normalized = normalizeName(base) + ext;
    const destPath = path.join(dest, normalized);

    try {
      fs.copyFileSync(full, destPath);
      console.log('Copied:', full, '->', destPath);
      count++;
    } catch (err) {
      console.error('Failed to copy:', full, err);
    }
  });

  console.log(`Done. ${count} image(s) copied to ${dest}`);
}

if (!fs.existsSync(srcDir)) {
  console.error('Source directory does not exist:', srcDir);
  process.exit(1);
}

copyFiles(srcDir, destDir);
