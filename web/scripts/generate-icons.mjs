import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');

// Generate a colored PNG icon with the SVG overlaid
async function generateIcon(size) {
  const svg = readFileSync(resolve(publicDir, 'icon.svg'), 'utf-8');

  // Create a base dark square
  const background = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#101923"/>
    </svg>`
  );

  // Composite SVG on background, centered and scaled
  const icon = await sharp(background)
    .composite([{
      input: Buffer.from(svg.replace('width="512"', `width="${size}"`).replace('height="512"', `height="${size}"`)),
      top: 0,
      left: 0,
    }])
    .png()
    .toBuffer();

  writeFileSync(resolve(publicDir, `icon-${size}.png`), icon);
  console.log(`✓ Generated icon-${size}.png`);
}

mkdirSync(publicDir, { recursive: true });
await generateIcon(192);
await generateIcon(512);
