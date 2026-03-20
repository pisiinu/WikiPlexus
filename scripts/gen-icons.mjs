import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('public/favicon.svg');

// 192x192
await sharp(svg).resize(192, 192).png().toFile('public/icon-192.png');
console.log('icon-192.png generated');

// 512x512
await sharp(svg).resize(512, 512).png().toFile('public/icon-512.png');
console.log('icon-512.png generated');

// maskable: safe area (中央 60%) = 512px, safe area = 308px
// 背景 #f7f2e8 に社章を中央 60% に配置
const SAFE = Math.round(512 * 0.6);
const offset = Math.round((512 - SAFE) / 2);
const svgResized = await sharp(svg).resize(SAFE, SAFE).toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#f7f2e8' } })
  .composite([{ input: svgResized, left: offset, top: offset }])
  .png()
  .toFile('public/icon-maskable.png');
console.log('icon-maskable.png generated');
