import * as THREE from 'three';

/** 全部材質都由程式畫，冇外部圖檔 */
const cache = new Map<string, THREE.CanvasTexture>();

function make(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void): THREE.Texture {
  // 每次打仗都重用同一張圖，唔會愈用愈多顯存
  const hit = cache.get(key);
  if (hit) return hit.clone();
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

const shade = (v: number) => `rgb(${v},${v},${v})`;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** 地面細節：灰階，同地面顏色相乘 */
export const groundTexture = () => make('ground', 512, (g, s) => {
  g.fillStyle = shade(226);
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 600; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '40,40,40'},${rand(0.02, 0.06)})`;
    g.beginPath();
    g.ellipse(rand(0, s), rand(0, s), rand(10, 46), rand(8, 30), rand(0, 3), 0, 7);
    g.fill();
  }
  for (let i = 0; i < 9000; i++) {
    const x = rand(0, s);
    const y = rand(0, s);
    const v = Math.floor(rand(150, 255));
    g.strokeStyle = shade(v);
    g.lineWidth = rand(0.6, 1.4);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + rand(-3, 3), y + rand(-6, 6));
    g.stroke();
  }
});

/** 石砌牆 */
export const stoneTexture = (base = 150) => make(`stone${base}`, 256, (g, s) => {
  g.fillStyle = shade(base - 70);
  g.fillRect(0, 0, s, s);
  const rows = 6;
  const h = s / rows;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? h * 0.75 : 0;
    for (let x = -h; x < s + h; x += h * 1.5) {
      const v = Math.floor(base + rand(-24, 24));
      g.fillStyle = `rgb(${v + 4},${v},${v - 8})`;
      g.fillRect(x + off + 2, r * h + 2, h * 1.5 - 4, h - 4);
      g.fillStyle = 'rgba(255,255,255,.08)';
      g.fillRect(x + off + 2, r * h + 2, h * 1.5 - 4, 4);
    }
  }
});

/** 屋瓦：一排排重疊 */
export const tileTexture = () => make('tile', 256, (g, s) => {
  g.fillStyle = shade(190);
  g.fillRect(0, 0, s, s);
  const h = s / 8;
  for (let r = 0; r < 8; r++) {
    for (let i = -1; i < 9; i++) {
      const x = i * h + (r % 2 ? h / 2 : 0);
      g.fillStyle = shade(Math.floor(rand(190, 250)));
      g.beginPath();
      g.moveTo(x, r * h);
      g.lineTo(x + h, r * h);
      g.lineTo(x + h, r * h + h * 0.72);
      g.quadraticCurveTo(x + h / 2, r * h + h * 1.15, x, r * h + h * 0.72);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,.28)';
      g.stroke();
    }
  }
});

/** 灰泥牆加木架 */
export const plasterTexture = () => make('plaster', 256, (g, s) => {
  g.fillStyle = shade(232);
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 700; i++) {
    g.fillStyle = `rgba(90,80,70,${rand(0.01, 0.05)})`;
    g.fillRect(rand(0, s), rand(0, s), rand(2, 16), rand(2, 10));
  }
  g.fillStyle = '#5a3f28';
  g.fillRect(0, 0, s, 14);
  g.fillRect(0, s - 14, s, 14);
  g.fillRect(0, 0, 14, s);
  g.fillRect(s / 2 - 7, 0, 14, s);
  g.strokeStyle = '#5a3f28';
  g.lineWidth = 12;
  g.beginPath();
  g.moveTo(14, s - 14);
  g.lineTo(s / 2 - 7, 14);
  g.stroke();
});

/** 木板 */
export const woodTexture = () => make('wood', 256, (g, s) => {
  const w = s / 5;
  for (let i = 0; i < 5; i++) {
    g.fillStyle = shade(Math.floor(rand(170, 225)));
    g.fillRect(i * w, 0, w, s);
    g.strokeStyle = 'rgba(40,24,12,.5)';
    g.lineWidth = 2;
    g.strokeRect(i * w, 0, w, s);
    for (let k = 0; k < 12; k++) {
      g.strokeStyle = `rgba(50,30,16,${rand(0.05, 0.16)})`;
      g.lineWidth = 1;
      const x = i * w + rand(4, w - 4);
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + rand(-5, 5), s);
      g.stroke();
    }
  }
});
