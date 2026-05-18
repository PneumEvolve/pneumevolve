// scripts/pwa-html.mjs
// Runs after vite build. Copies dist/index.html into two PWA entry points
// with the correct manifest hardcoded so Chrome reads it before JS runs.

import fs from 'fs';

const base = fs.readFileSync('dist/index.html', 'utf8');

// rootwork.html — same as index.html, manifest-rootwork.json already hardcoded
fs.writeFileSync('dist/rootwork.html', base);

// clear-and-calm.html — swap the manifest and theme color
const cc = base
  .replace(
    '<link rel="manifest" href="/manifest-rootwork.json" />',
    '<link rel="manifest" href="/manifest-clearandcalm.json" />'
  );

fs.writeFileSync('dist/clear-and-calm.html', cc);

console.log('✓ dist/rootwork.html');
console.log('✓ dist/clear-and-calm.html');
