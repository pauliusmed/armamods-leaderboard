import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(scriptsDir, '..');
const publicDir = resolve(webDir, 'public');
const brandDir = resolve(publicDir, 'brand');
const generatedDir = resolve(webDir, 'src', 'assets', 'generated');

const COLORS = {
  base: '#101923',
  copper: '#B8784A',
  mineral: '#E7DED0',
  muted: '#7A828E',
};

await mkdir(brandDir, { recursive: true });

const iconSvg = await readFile(resolve(publicDir, 'icon.svg'));
const markOnDarkSvg = await readFile(resolve(brandDir, 'logo-mark-on-dark.svg'));
const lockupOnDarkSvg = await readFile(resolve(brandDir, 'logo-lockup-on-dark.svg'));
const lockupOnLightSvg = await readFile(resolve(brandDir, 'logo-lockup-on-light.svg'));

async function renderSquareIcon(size, output) {
  await sharp(iconSvg)
    .resize(size, size)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(resolve(publicDir, output));
}

async function renderBrandPng(input, width, output) {
  await sharp(input)
    .resize({ width, withoutEnlargement: false })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(resolve(brandDir, output));
}

function maskableIconSvg() {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <rect width="512" height="512" fill="${COLORS.base}"/>
      <g transform="translate(112 112) scale(6)">
        <path d="M7 36 16 11l8 18 8-18 9 25" fill="none" stroke="${COLORS.mineral}" stroke-width="4" stroke-linecap="square" stroke-linejoin="miter"/>
        <path d="M12 29h24M16 11h16" fill="none" stroke="${COLORS.copper}" stroke-width="2" stroke-linecap="square"/>
        <circle cx="16" cy="11" r="3" fill="${COLORS.copper}"/>
        <circle cx="24" cy="29" r="3" fill="${COLORS.copper}"/>
        <circle cx="32" cy="11" r="3" fill="${COLORS.copper}"/>
      </g>
    </svg>
  `);
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function ogOverlay({ eyebrow, titleLines, subtitle }) {
  const title = titleLines
    .map(
      (line, index) =>
        `<text x="62" y="${252 + index * 78}" fill="#FFFFFF" font-family="Arial Narrow, Arial, sans-serif" font-size="68" font-weight="900" letter-spacing="1">${escapeXml(line)}</text>`,
    )
    .join('');

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="${COLORS.base}" stop-opacity="0.99"/>
          <stop offset="0.48" stop-color="${COLORS.base}" stop-opacity="0.91"/>
          <stop offset="0.76" stop-color="${COLORS.base}" stop-opacity="0.25"/>
          <stop offset="1" stop-color="${COLORS.base}" stop-opacity="0.42"/>
        </linearGradient>
        <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#000000" stop-opacity="0.22"/>
          <stop offset="0.58" stop-color="#000000" stop-opacity="0"/>
          <stop offset="1" stop-color="#000000" stop-opacity="0.52"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#shade)"/>
      <rect width="1200" height="630" fill="url(#vignette)"/>

      <path d="M30 96V30h66M1104 30h66v66M30 534v66h66M1104 600h66v-66" fill="none" stroke="#E7DED0" stroke-opacity="0.35" stroke-width="2"/>
      <path d="M62 154h86" stroke="${COLORS.copper}" stroke-width="5"/>

      <g transform="translate(58 45) scale(1.45)">
        <path d="M7 36 16 11l8 18 8-18 9 25" fill="none" stroke="${COLORS.mineral}" stroke-width="4" stroke-linecap="square" stroke-linejoin="miter"/>
        <path d="M12 29h24M16 11h16" fill="none" stroke="${COLORS.copper}" stroke-width="2" stroke-linecap="square"/>
        <circle cx="16" cy="11" r="3" fill="${COLORS.copper}"/>
        <circle cx="24" cy="29" r="3" fill="${COLORS.copper}"/>
        <circle cx="32" cy="11" r="3" fill="${COLORS.copper}"/>
      </g>
      <text x="137" y="82" fill="#FFFFFF" font-family="Arial Narrow, Arial, sans-serif" font-size="30" font-weight="900" letter-spacing="4">ARMA</text>
      <text x="245" y="82" fill="${COLORS.copper}" font-family="Arial Narrow, Arial, sans-serif" font-size="30" font-weight="900" letter-spacing="4">MODS</text>
      <text x="62" y="184" fill="${COLORS.copper}" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="5">${escapeXml(eyebrow)}</text>

      ${title}

      <text x="64" y="${431 + Math.max(0, titleLines.length - 2) * 50}" fill="${COLORS.mineral}" font-family="Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="3">${escapeXml(subtitle)}</text>
      <text x="64" y="566" fill="${COLORS.muted}" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="4">REFORGERMODS.COM</text>
      <path d="M64 584h210" stroke="${COLORS.copper}" stroke-width="3"/>
    </svg>
  `);
}

async function generateOg({ background, output, ...copy }) {
  await sharp(resolve(generatedDir, background))
    .resize(1200, 630, { fit: 'cover', position: 'east' })
    .modulate({ brightness: 0.78, saturation: 0.78 })
    .composite([{ input: ogOverlay(copy) }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(resolve(publicDir, output));
}

await Promise.all([
  renderSquareIcon(48, 'favicon.png'),
  renderSquareIcon(180, 'apple-touch-icon.png'),
  renderSquareIcon(192, 'icon-192.png'),
  renderSquareIcon(512, 'icon-512.png'),
  sharp(maskableIconSvg())
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(resolve(publicDir, 'icon-maskable-512.png')),
  renderBrandPng(markOnDarkSvg, 512, 'logo-mark-on-dark-512.png'),
  renderBrandPng(lockupOnDarkSvg, 1240, 'logo-lockup-on-dark-1240.png'),
  renderBrandPng(lockupOnLightSvg, 1240, 'logo-lockup-on-light-1240.png'),
  generateOg({
    background: 'server-network-1600.webp',
    output: 'og-image.png',
    eyebrow: 'MODERN OPERATIONS INTELLIGENCE',
    titleLines: ['LIVE MOD & SERVER', 'INTELLIGENCE'],
    subtitle: 'ARMA REFORGER & ARMA 3 ANALYTICS',
  }),
  generateOg({
    background: 'server-network-1600.webp',
    output: 'og-servers.png',
    eyebrow: 'MODERN SERVER NETWORK',
    titleLines: ['FIND ACTIVE ARMA', 'SERVERS'],
    subtitle: 'LIVE POPULATION · MOD STACKS · UPTIME',
  }),
  generateOg({
    background: 'storage-modules-1600.webp',
    output: 'og-storage.png',
    eyebrow: 'MODERN MOD LOADOUT',
    titleLines: ['CONSOLE MOD', 'STORAGE PLANNER'],
    subtitle: 'COMPARE · DEDUPLICATE · DEPLOY',
  }),
  generateOg({
    background: 'server-racks-1600.webp',
    output: 'og-hosting.png',
    eyebrow: 'MODDED OPERATIONS NODE',
    titleLines: ['SERVER HOSTING', 'CAPACITY ANALYSIS'],
    subtitle: 'ARMA REFORGER & ARMA 3 INFRASTRUCTURE',
  }),
]);

console.log('Generated favicon, Apple Touch, PWA, logo exports, and social preview assets.');
