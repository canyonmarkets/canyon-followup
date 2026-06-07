import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Dark background
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.22);
  ctx.fill();

  // Big bold "JO" in orange
  ctx.fillStyle = '#E8571A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${size * 0.48}px Arial`;
  ctx.fillText('JO', size / 2, size / 2);

  return canvas.toBuffer('image/png');
}

const publicDir = join(__dirname, '..', 'public');
writeFileSync(join(publicDir, 'icon-192.png'), drawIcon(192));
writeFileSync(join(publicDir, 'icon-512.png'), drawIcon(512));
writeFileSync(join(publicDir, 'apple-touch-icon.png'), drawIcon(180));
console.log('Canyon Follow-Up icons generated.');
