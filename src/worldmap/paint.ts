import { MAP, PLACES } from '../data/world';
import { makeRng } from '../battle/terrain';
import type { Tile, WorldTerrain } from './terrain';

/** 大地圖手繪風：底色漸變，再逐樣畫樹、山、河、路 */
const BASE: Record<Tile, [number, number, number]> = {
  plain: [132, 164, 84], forest: [78, 118, 66], hill: [156, 148, 98], mountain: [120, 112, 104], water: [46, 104, 150], bridge: [132, 164, 84],
  snow: [226, 234, 240], sand: [220, 194, 132], swamp: [92, 112, 76], ash: [92, 84, 90],
};

const SIZE = 256;
const noiseTable = (() => {
  const rng = makeRng(MAP.seed + 11);
  return Float32Array.from({ length: SIZE * SIZE }, () => rng());
})();

function noise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const tx = fx * fx * (3 - 2 * fx);
  const ty = fy * fy * (3 - 2 * fy);
  const at = (a: number, b: number) => noiseTable[(a & (SIZE - 1)) + (b & (SIZE - 1)) * SIZE];
  const top = at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx;
  const bot = at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx;
  return top * (1 - ty) + bot * ty;
}

const fbm = (x: number, y: number) => noise(x, y) * 0.55 + noise(x * 2.1, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3) * 0.15;

/** 底色：邊界用噪聲打亂，地形之間自然過渡 */
function paintBase(t: WorldTerrain, width: number, height: number, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const g = c.getContext('2d')!;
  const img = g.createImageData(width, height);
  const d = img.data;
  const W = MAP.width;
  const H = MAP.height;
  const tile = (x: number, y: number) => BASE[t.at(Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y)))];
  let i = 0;
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const u = px / scale;
      const v = py / scale;
      const wx = u + (fbm(u * 0.17, v * 0.17) - 0.5) * 5;
      const wy = v + (fbm(u * 0.17 + 40, v * 0.17 + 40) - 0.5) * 5;
      const ix = Math.floor(wx);
      const iy = Math.floor(wy);
      const fx = wx - ix;
      const fy = wy - iy;
      const a = tile(ix, iy);
      const b = tile(ix + 1, iy);
      const e = tile(ix, iy + 1);
      const f = tile(ix + 1, iy + 1);
      const shade = 0.84 + fbm(u * 0.5, v * 0.5) * 0.32;
      for (let k = 0; k < 3; k++) {
        const top = a[k] + (b[k] - a[k]) * fx;
        const low = e[k] + (f[k] - e[k]) * fx;
        d[i + k] = (top + (low - top) * fy) * shade;
      }
      d[i + 3] = 255;
      i += 4;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

function tree(g: CanvasRenderingContext2D, x: number, y: number, r: number, dark: string, light: string, pine: boolean) {
  g.fillStyle = 'rgba(10,20,14,.28)';
  g.beginPath();
  g.ellipse(x + r * 0.5, y + r * 0.2, r, r * 0.42, 0, 0, Math.PI * 2);
  g.fill();
  if (pine) {
    g.fillStyle = dark;
    g.beginPath();
    g.moveTo(x, y - r * 2.1);
    g.lineTo(x + r, y);
    g.lineTo(x - r, y);
    g.fill();
    g.fillStyle = light;
    g.beginPath();
    g.moveTo(x, y - r * 2.1);
    g.lineTo(x, y);
    g.lineTo(x - r, y);
    g.fill();
    return;
  }
  g.fillStyle = dark;
  g.beginPath();
  g.arc(x, y - r * 0.8, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = light;
  g.beginPath();
  g.arc(x - r * 0.3, y - r * 1.05, r * 0.62, 0, Math.PI * 2);
  g.fill();
}

function peak(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rng: () => number, snow: boolean) {
  const lean = (rng() - 0.5) * w * 0.3;
  const top = x + lean;
  g.fillStyle = 'rgba(16,14,20,.3)';
  g.beginPath();
  g.ellipse(x + w * 0.2, y, w * 0.72, w * 0.16, 0, 0, Math.PI * 2);
  g.fill();
  // 向光面、背光面
  g.fillStyle = '#8f877c';
  g.beginPath();
  g.moveTo(x - w * 0.62, y);
  g.lineTo(top, y - h);
  g.lineTo(top + w * 0.06, y);
  g.fill();
  g.fillStyle = '#5a5552';
  g.beginPath();
  g.moveTo(top, y - h);
  g.lineTo(x + w * 0.62, y);
  g.lineTo(top + w * 0.06, y);
  g.fill();
  if (!snow) return;
  const cap = 0.38;
  g.fillStyle = '#f2f5f8';
  g.beginPath();
  g.moveTo(top, y - h);
  g.lineTo(top + w * 0.2 * cap * 2.4, y - h * (1 - cap));
  g.lineTo(top + w * 0.02, y - h * (1 - cap * 0.7));
  g.lineTo(top - w * 0.12, y - h * (1 - cap));
  g.lineTo(top - w * 0.24 * cap * 2.4, y - h * (1 - cap * 0.9));
  g.fill();
}

/** 河道：沿住河心線畫，有河岸同水光 */
function paintRiver(g: CanvasRenderingContext2D, px: number) {
  const line = () => {
    g.beginPath();
    for (let y = 0; y <= MAP.height; y += 1) {
      const x = MAP.riderX + Math.sin(y * 0.11) * 7 + Math.sin(y * 0.031) * 5;
      if (y) g.lineTo((x + 0.5) * px, y * px);
      else g.moveTo((x + 0.5) * px, 0);
    }
  };
  g.lineJoin = 'round';
  g.strokeStyle = '#b8a878';
  g.lineWidth = px * 4.2;
  line();
  g.stroke();
  g.strokeStyle = '#2f6f9e';
  g.lineWidth = px * 3.2;
  line();
  g.stroke();
  g.strokeStyle = 'rgba(190,226,240,.35)';
  g.lineWidth = px * 0.5;
  g.setLineDash([px * 2, px * 3]);
  line();
  g.stroke();
  g.setLineDash([]);
  for (const b of MAP.bridges) {
    const x = (MAP.riderX + Math.sin(b * 0.11) * 7 + Math.sin(b * 0.031) * 5 + 0.5) * px;
    const y = (b + 0.5) * px;
    g.fillStyle = 'rgba(10,14,20,.3)';
    g.fillRect(x - px * 3, y - px * 1.1, px * 6, px * 3);
    g.fillStyle = '#8a6a44';
    g.fillRect(x - px * 3, y - px * 1.4, px * 6, px * 2.8);
    g.fillStyle = '#6a4e30';
    for (let k = 0; k < 7; k++) g.fillRect(x - px * 3 + k * px, y - px * 1.4, 2, px * 2.8);
    g.fillRect(x - px * 3, y - px * 1.5, px * 6, 3);
    g.fillRect(x - px * 3, y + px * 1.3, px * 6, 3);
  }
}

/** 城與城之間嘅泥路 */
function paintRoads(g: CanvasRenderingContext2D, t: WorldTerrain, px: number) {
  const towns = PLACES.filter((p) => !p.gone && (p.kind === 'town' || p.kind === 'village' || p.kind === 'castle'));
  const done = new Set<string>();
  const stroke = (path: { x: number; y: number }[], width: number, style: string) => {
    g.strokeStyle = style;
    g.lineWidth = width;
    g.beginPath();
    path.forEach((n, i) => {
      if (i % 3 && i !== path.length - 1) return;
      const wob = (noise(n.x * 0.3, n.y * 0.3) - 0.5) * px;
      if (i) g.lineTo((n.x + 0.5) * px + wob, (n.y + 0.5) * px + wob);
      else g.moveTo((n.x + 0.5) * px, (n.y + 0.5) * px);
    });
    g.stroke();
  };
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const a of towns) {
    const near = towns.filter((b) => b !== a).sort((b, c) => Math.hypot(b.x - a.x, b.y - a.y) - Math.hypot(c.x - a.x, c.y - a.y)).slice(0, 2);
    for (const b of near) {
      const key = [a.id, b.id].sort().join();
      if (done.has(key)) continue;
      done.add(key);
      const path = t.path(a.x, a.y, b.x, b.y);
      if (!path) continue;
      stroke(path, px * 0.9, 'rgba(92,72,44,.45)');
      stroke(path, px * 0.55, 'rgba(196,172,124,.8)');
    }
  }
}

export function paintMap(t: WorldTerrain, px: number): HTMLCanvasElement {
  const scale = Math.ceil(px / 2);
  const low = paintBase(t, MAP.width * scale, MAP.height * scale, scale);
  const c = document.createElement('canvas');
  c.width = MAP.width * px;
  c.height = MAP.height * px;
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(low, 0, 0, c.width, c.height);

  const rng = makeRng(MAP.seed + 5);
  // 地面小紋理：草點、沙紋、沼澤水氹
  for (let y = 0; y < MAP.height; y++) {
    for (let x = 0; x < MAP.width; x++) {
      const k = t.at(x, y);
      const cx = (x + rng()) * px;
      const cy = (y + rng()) * px;
      if (k === 'plain' && rng() < 0.35) {
        g.fillStyle = rng() < 0.5 ? 'rgba(70,104,50,.5)' : 'rgba(176,196,104,.5)';
        g.fillRect(cx, cy, 3, 2);
      } else if (k === 'sand' && rng() < 0.2) {
        g.strokeStyle = 'rgba(160,126,72,.45)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(cx, cy + 10, 14, -2.3, -0.9);
        g.stroke();
      } else if (k === 'swamp' && rng() < 0.28) {
        g.fillStyle = 'rgba(40,66,62,.75)';
        g.beginPath();
        g.ellipse(cx, cy, 6 + rng() * 7, 3 + rng() * 3, 0, 0, Math.PI * 2);
        g.fill();
      } else if (k === 'ash' && rng() < 0.12) {
        g.fillStyle = 'rgba(232,96,40,.65)';
        g.fillRect(cx, cy, 3, 2);
      }
    }
  }
  paintRoads(g, t, px);
  paintRiver(g, px);

  // 景物由上畫到下，近嘅遮住遠嘅
  for (let y = 0; y < MAP.height; y++) {
    for (let x = 0; x < MAP.width; x++) {
      const k = t.at(x, y);
      const cx = (x + 0.5) * px + (rng() - 0.5) * px * 0.7;
      const cy = (y + 0.7) * px + (rng() - 0.5) * px * 0.5;
      if (k === 'forest') {
        const pine = noise(x * 0.09, y * 0.09) > 0.55;
        tree(g, cx, cy, px * (0.42 + rng() * 0.22), pine ? '#2c5238' : '#35683c', pine ? '#42724a' : '#5a9050', pine);
      } else if (k === 'snow' && rng() < 0.12) {
        tree(g, cx, cy, px * 0.42, '#8ea8ac', '#e6eef0', true);
      } else if (k === 'swamp' && rng() < 0.16) {
        tree(g, cx, cy, px * 0.36, '#3a4e36', '#5a7048', false);
      } else if (k === 'ash' && rng() < 0.08) {
        peak(g, cx, cy, px * 1.6, px * 1.4, rng, false);
      } else if (k === 'hill' && rng() < 0.55) {
        const r = px * (0.9 + rng() * 0.6);
        g.fillStyle = 'rgba(92,84,54,.4)';
        g.beginPath();
        g.ellipse(cx + r * 0.2, cy, r, r * 0.5, 0, Math.PI, 0);
        g.fill();
        g.fillStyle = 'rgba(206,194,134,.55)';
        g.beginPath();
        g.ellipse(cx - r * 0.2, cy - 1, r * 0.7, r * 0.36, 0, Math.PI, 0);
        g.fill();
      } else if (k === 'mountain' && rng() < 0.6) {
        const w = px * (2.4 + rng() * 1.8);
        peak(g, cx, cy + px * 0.4, w, w * (0.9 + rng() * 0.5), rng, rng() < 0.7);
      }
    }
  }
  return c;
}
