import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../packages/frontend/public');

function generateSvgIcon(size) {
  const r = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0ea5e9"/><stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.06}" fill="url(#bg)"/>
  <g transform="translate(${r}, ${r})" fill="none" stroke="white" stroke-width="${size * 0.07}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-${r*0.35},${r*0.4}l${r*0.12},0a${r*0.1},${r*0.1} 0 0,1 ${r*0.1},${r*0.1}l0,${r*0.15}a${r*0.1},${r*0.1} 0 0,0 ${r*0.1},${r*0.1}l${r*0.04},0"/>
    <path d="M-${r*0.15},-${r*0.45}l${r*0.12},0a${r*0.1},${r*0.1} 0 0,1 ${r*0.1},${r*0.1}l0,${r*0.25}a${r*0.1},${r*0.1} 0 0,0 ${r*0.1},${r*0.1}l${r*0.04},0"/>
    <path d="M${r*0.15},-${r*0.65}l${r*0.12},0a${r*0.1},${r*0.1} 0 0,1 ${r*0.1},${r*0.1}l0,${r*0.4}a${r*0.1},${r*0.1} 0 0,0 ${r*0.1},${r*0.1}l${r*0.04},0"/>
  </g>
</svg>`;
}

fs.mkdirSync(publicDir, { recursive: true });
[192, 512, 32].forEach(size => {
  const name = size === 32 ? 'favicon' : `icon-${size}`;
  fs.writeFileSync(path.join(publicDir, `${name}.svg`), generateSvgIcon(size));
  console.log(`Created ${name}.svg`);
});

// Generate a basic apple-touch-icon
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generateSvgIcon(180));
console.log('Created apple-touch-icon.svg');
