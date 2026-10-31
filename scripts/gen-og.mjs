// 由 scripts/og-image.svg 輸出 public/og-image.png（1200×630）
import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const svg = readFileSync(new URL('./og-image.svg', import.meta.url), 'utf8');
const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: { loadSystemFonts: true, defaultFontFamily: 'Microsoft JhengHei' },
}).render();
writeFileSync(new URL('../public/og-image.png', import.meta.url), png.asPng());
console.log(`og-image.png ${png.width}×${png.height}`);
