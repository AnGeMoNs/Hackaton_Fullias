// file: Hackaton_Fullias-main/scripts/generate-icons.js
// Why: Create missing PNG icons for the PWA.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const srcSvg = path.join(process.cwd(), 'public', 'globe.svg');
const out192 = path.join(process.cwd(), 'public', 'icon-192.png');
const out512 = path.join(process.cwd(), 'public', 'icon-512.png');

async function main() {
  if (!fs.existsSync(srcSvg)) {
    console.error('Missing public/globe.svg to generate icons from.');
    process.exit(1);
  }
  await sharp(srcSvg).resize(192, 192).png().toFile(out192);
  await sharp(srcSvg).resize(512, 512).png().toFile(out512);
  console.log('Generated icon-192.png and icon-512.png in /public');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
