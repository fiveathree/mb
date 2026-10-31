import type { VistaDef } from '../data/vistas';

/** 秘景圖：程式畫嘅風景畫 */
const W = 320;
const H = 180;
const cache = new Map<string, string>();

function hash(s: string): () => number {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
}

function ridge(g: CanvasRenderingContext2D, base: number, amp: number, color: string, phase: number) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= W; x += 4) {
    g.lineTo(x, base - Math.abs(Math.sin(x * 0.014 + phase)) * amp - Math.abs(Math.sin(x * 0.043 + phase * 2)) * amp * 0.35);
  }
  g.lineTo(W, H);
  g.fill();
}

function shade(c: string, k: number): string {
  const n = parseInt(c.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function water(g: CanvasRenderingContext2D, top: number, color: string, rng: () => number) {
  const grad = g.createLinearGradient(0, top, 0, H);
  grad.addColorStop(0, shade(color, 1.25));
  grad.addColorStop(1, shade(color, 0.7));
  g.fillStyle = grad;
  g.fillRect(0, top, W, H - top);
  g.fillStyle = 'rgba(255,255,255,.22)';
  for (let i = 0; i < 40; i++) g.fillRect(rng() * W, top + rng() * (H - top), 8 + rng() * 26, 1);
}

function trees(g: CanvasRenderingContext2D, y: number, n: number, size: number, color: string, rng: () => number) {
  for (let i = 0; i < n; i++) {
    const x = rng() * W;
    const s = size * (0.7 + rng() * 0.6);
    g.fillStyle = shade(color, 0.7 + rng() * 0.5);
    g.beginPath();
    g.moveTo(x, y - s * 2);
    g.lineTo(x + s, y);
    g.lineTo(x - s, y);
    g.fill();
  }
}

export function vistaArt(d: VistaDef): string {
  const hit = cache.get(d.id);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const rng = hash(d.id);
  const sky = g.createLinearGradient(0, 0, 0, H * 0.7);
  sky.addColorStop(0, d.sky[0]);
  sky.addColorStop(1, d.sky[1]);
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const sx = 60 + rng() * 200;
  const sun = g.createRadialGradient(sx, 50, 2, sx, 50, 60);
  sun.addColorStop(0, 'rgba(255,250,220,.95)');
  sun.addColorStop(0.2, 'rgba(255,240,190,.5)');
  sun.addColorStop(1, 'rgba(255,240,190,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(255,255,255,.4)';
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.ellipse(rng() * W, 14 + rng() * 50, 26 + rng() * 40, 3 + rng() * 4, 0, 0, Math.PI * 2);
    g.fill();
  }
  const m = d.main;
  const p = rng() * 6;
  switch (d.art) {
    case 'peak':
      ridge(g, 120, 80, shade(m, 1.2), p);
      g.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 26; i++) {
        g.beginPath();
        g.ellipse(rng() * W, 112 + rng() * 22, 30, 7, 0, 0, Math.PI * 2);
        g.fill();
      }
      ridge(g, 170, 34, shade(m, 0.65), p + 2);
      break;
    case 'falls':
      ridge(g, 150, 70, shade(m, 1.1), p);
      g.fillStyle = shade(m, 0.8);
      g.fillRect(110, 34, 100, 146);
      g.fillStyle = '#e8f4fa';
      g.fillRect(146, 34, 28, 120);
      g.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 18; i++) g.fillRect(146 + rng() * 26, 34 + rng() * 110, 2, 14);
      water(g, 150, '#5aa0c8', rng);
      break;
    case 'gorge':
      water(g, 120, '#4a8aa0', rng);
      for (const [a, b] of [[0, 120], [W, 200]]) {
        g.fillStyle = shade(m, 0.9);
        g.beginPath();
        g.moveTo(a, 0);
        g.lineTo(b, 26);
        g.lineTo(b + (a ? 30 : -24), 130);
        g.lineTo(a, 140);
        g.fill();
      }
      break;
    case 'lake':
      ridge(g, 96, 38, shade(m, 0.8), p);
      water(g, 96, m, rng);
      g.fillStyle = '#f4e8d0';
      g.beginPath();
      g.moveTo(170, 122);
      g.lineTo(170, 96);
      g.lineTo(190, 120);
      g.fill();
      g.fillStyle = '#4a3020';
      g.fillRect(158, 122, 36, 4);
      break;
    case 'sea':
      water(g, 100, m, rng);
      g.fillStyle = '#5a5048';
      g.beginPath();
      g.moveTo(0, 60);
      g.lineTo(90, 110);
      g.lineTo(130, 180);
      g.lineTo(0, 180);
      g.fill();
      trees(g, 104, 5, 7, '#3f7a4a', rng);
      break;
    case 'blossom':
      ridge(g, 150, 30, m, p);
      for (let i = 0; i < 90; i++) {
        g.fillStyle = `rgba(255,${170 + Math.floor(rng() * 60)},${200 + Math.floor(rng() * 40)},.8)`;
        g.beginPath();
        g.arc(rng() * W, 40 + rng() * 110, 3 + rng() * 6, 0, Math.PI * 2);
        g.fill();
      }
      break;
    case 'dune':
      ridge(g, 130, 34, shade(m, 1.15), p);
      ridge(g, 164, 30, m, p + 3);
      break;
    case 'snow':
      ridge(g, 130, 90, shade(m, 0.95), p);
      ridge(g, 170, 30, '#f4f8fc', p + 1);
      if (d.id === 'aurora') {
        for (let i = 0; i < 3; i++) {
          g.strokeStyle = `rgba(100,255,180,${0.35 - i * 0.08})`;
          g.lineWidth = 12 - i * 2;
          g.beginPath();
          for (let x = 0; x <= W; x += 10) g.lineTo(x, 30 + i * 18 + Math.sin(x * 0.03 + i) * 12);
          g.stroke();
        }
      }
      break;
    case 'farm':
      ridge(g, 96, 16, '#7a9a70', p);
      g.fillStyle = m;
      g.fillRect(0, 96, W, H - 96);
      g.strokeStyle = shade(m, 0.72);
      g.lineWidth = 1;
      for (let i = -14; i < 30; i++) {
        g.beginPath();
        g.moveTo(160 + i * 4, 96);
        g.lineTo(160 + i * 40, H);
        g.stroke();
      }
      break;
    case 'volcano':
      g.fillStyle = m;
      g.beginPath();
      g.moveTo(40, H);
      g.lineTo(140, 50);
      g.lineTo(180, 50);
      g.lineTo(290, H);
      g.fill();
      g.strokeStyle = '#ff7a2a';
      g.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(150 + i * 7, 52);
        g.lineTo(100 + i * 44 + rng() * 10, H);
        g.stroke();
      }
      g.fillStyle = 'rgba(255,120,40,.5)';
      g.beginPath();
      g.ellipse(160, 46, 34, 12, 0, 0, Math.PI * 2);
      g.fill();
      break;
    case 'forest':
      ridge(g, 120, 24, shade(m, 1.1), p);
      trees(g, 130, 24, 12, m, rng);
      g.fillStyle = shade(m, 0.6);
      g.fillRect(146, 60, 30, 120);
      g.fillStyle = shade(m, 1.2);
      g.beginPath();
      g.ellipse(160, 56, 74, 40, 0, 0, Math.PI * 2);
      g.fill();
      trees(g, 178, 16, 16, shade(m, 0.8) === '' ? m : m, rng);
      if (d.id === 'firefly') {
        g.fillStyle = '#e8ff8a';
        for (let i = 0; i < 70; i++) g.fillRect(rng() * W, 60 + rng() * 120, 2, 2);
      }
      break;
    case 'marsh':
      water(g, 116, '#6a9a90', rng);
      g.strokeStyle = m;
      g.lineWidth = 1.4;
      for (let i = 0; i < 90; i++) {
        const x = rng() * W;
        const y = 130 + rng() * 50;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + rng() * 4 - 2, y - 14 - rng() * 22);
        g.stroke();
      }
      g.fillStyle = '#f8f8f0';
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.ellipse(60 + i * 40, 40 + i * 6, 9, 2, -0.3, 0, Math.PI * 2);
        g.fill();
      }
      break;
  }
  const url = c.toDataURL('image/jpeg', 0.85);
  cache.set(d.id, url);
  return url;
}
