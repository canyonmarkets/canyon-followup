import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const cx = size / 2;
  const cy = size / 2;

  // Dark background
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.22);
  ctx.fill();

  const orange = '#E8571A';

  // Strategy: draw a classic handset using a thick stroke path
  // The handset is basically a rotated "C" shape with the opening facing right
  // Earpiece = top circle, mouthpiece = bottom circle, curved body connects them

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI * 0.22); // tilt ~40° — earpiece top-left, mouthpiece bottom-right

  const r = size * 0.30; // radius of the main arc (the curve of the handset body)
  const lw = size * 0.13; // stroke width (thick, like the reference)

  ctx.strokeStyle = orange;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';

  // Main handset body: an arc that goes from top to bottom
  // sweeping about 200 degrees (like a C rotated on its side)
  ctx.beginPath();
  ctx.arc(r * 0.35, 0, r, Math.PI * 0.85, Math.PI * 2.15, false);
  ctx.stroke();

  ctx.restore();

  return canvas.toBuffer('image/png');
}

const publicDir = join(__dirname, '..', 'public');
writeFileSync(join(publicDir, 'icon-192.png'), drawIcon(192));
writeFileSync(join(publicDir, 'icon-512.png'), drawIcon(512));
writeFileSync(join(publicDir, 'apple-touch-icon.png'), drawIcon(180));
console.log('Canyon Follow-Up icons generated.');
