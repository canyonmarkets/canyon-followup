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
  const lw = size * 0.06;

  ctx.strokeStyle = orange;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw a classic phone handset using a filled path
  // The handset has two round ends (earpiece top-left, mouthpiece bottom-right)
  // connected by a curved body — rotated ~45 degrees

  const s = size * 0.62; // overall scale
  const ox = cx - s * 0.08; // offset center slightly
  const oy = cy + s * 0.08;

  // We'll draw using a rotated coordinate approach
  // Earpiece center (top-left area)
  const ex = cx - s * 0.22;
  const ey = cy - s * 0.28;
  const er = s * 0.16; // earpiece radius

  // Mouthpiece center (bottom-right area)
  const mx = cx + s * 0.22;
  const my = cy + s * 0.28;
  const mr = s * 0.16; // mouthpiece radius

  // Draw earpiece circle (filled)
  ctx.beginPath();
  ctx.arc(ex, ey, er, 0, Math.PI * 2);
  ctx.fillStyle = orange;
  ctx.fill();

  // Draw mouthpiece circle (filled)
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fillStyle = orange;
  ctx.fill();

  // Draw the connecting body as a thick curved stroke
  // The body curves from earpiece to mouthpiece with a slight S-curve
  ctx.strokeStyle = orange;
  ctx.lineWidth = er * 1.1;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(ex + er * 0.5, ey + er * 0.5);
  ctx.bezierCurveTo(
    ex + s * 0.25, ey + s * 0.15,  // control 1
    mx - s * 0.25, my - s * 0.15,  // control 2
    mx - mr * 0.5, my - mr * 0.5   // end
  );
  ctx.stroke();

  // Punch out center of earpiece and mouthpiece to make them look like cups
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(ex, ey, er * 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(mx, my, mr * 0.45, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

const publicDir = join(__dirname, '..', 'public');
writeFileSync(join(publicDir, 'icon-192.png'), drawIcon(192));
writeFileSync(join(publicDir, 'icon-512.png'), drawIcon(512));
writeFileSync(join(publicDir, 'apple-touch-icon.png'), drawIcon(180));
console.log('Canyon Follow-Up icons generated.');
