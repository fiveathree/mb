import type { PlaceKind } from '../data/world';

/** 地圖圖示：預先畫好，每幀 drawImage 就得 */
const cache = new Map<string, HTMLCanvasElement>();
const SIZE = 96;

function sprite(key: string, draw: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = SIZE;
    const g = c.getContext('2d')!;
    g.lineJoin = 'round';
    draw(g);
    cache.set(key, c);
  }
  return c;
}

const STONE = '#b8b0a2';
const STONE_DARK = '#7d766c';
const INK = '#2a2230';

function wall(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, light = STONE, dark = STONE_DARK) {
  g.fillStyle = light;
  g.fillRect(x, y, w, h);
  g.fillStyle = dark;
  g.fillRect(x + w * 0.62, y, w * 0.38, h);
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.strokeRect(x, y, w, h);
}

function merlons(g: CanvasRenderingContext2D, x: number, y: number, w: number, n: number) {
  const step = w / (n * 2 - 1);
  for (let i = 0; i < n; i++) {
    g.fillStyle = STONE;
    g.fillRect(x + i * 2 * step, y - 5, step, 5);
    g.strokeStyle = INK;
    g.lineWidth = 1.5;
    g.strokeRect(x + i * 2 * step, y - 5, step, 5);
  }
}

function tower(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, roof: string) {
  wall(g, x, y, w, h);
  g.fillStyle = roof;
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - 3, y);
  g.lineTo(x + w / 2, y - w * 1.15);
  g.lineTo(x + w + 3, y);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(0,0,0,.22)';
  g.beginPath();
  g.moveTo(x + w / 2, y - w * 1.15);
  g.lineTo(x + w + 3, y);
  g.lineTo(x + w / 2, y);
  g.fill();
}

function flag(g: CanvasRenderingContext2D, x: number, y: number, color: string, size = 1) {
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y - 20 * size);
  g.stroke();
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y - 20 * size);
  g.lineTo(x + 17 * size, y - 16 * size);
  g.lineTo(x + 11 * size, y - 12.5 * size);
  g.lineTo(x + 17 * size, y - 9 * size);
  g.lineTo(x, y - 8 * size);
  g.closePath();
  g.fill();
  g.lineWidth = 1.5;
  g.stroke();
}

function hut(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, roof: string) {
  wall(g, x, y, w, h, '#d8c8a4', '#a8987a');
  g.fillStyle = roof;
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x - 4, y);
  g.lineTo(x + w / 2, y - h * 0.95);
  g.lineTo(x + w + 4, y);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#4a3220';
  g.fillRect(x + w * 0.38, y + h * 0.4, w * 0.24, h * 0.6);
}

/** 城鎮、城堡等：color 係擁有者顏色 */
export function placeIcon(kind: PlaceKind | 'monster', color: string): HTMLCanvasElement {
  return sprite(`${kind}:${color}`, (g) => {
    switch (kind) {
      case 'town':
        wall(g, 14, 56, 68, 28);
        merlons(g, 14, 56, 68, 7);
        tower(g, 8, 44, 18, 40, color);
        tower(g, 70, 44, 18, 40, color);
        tower(g, 36, 30, 24, 54, color);
        g.fillStyle = '#3a2618';
        g.beginPath();
        g.arc(48, 74, 7, Math.PI, 0);
        g.fillRect(41, 74, 14, 10);
        g.fill();
        flag(g, 48, 16, color);
        break;
      case 'castle':
        wall(g, 22, 40, 52, 44);
        merlons(g, 22, 40, 52, 6);
        wall(g, 36, 22, 24, 22);
        merlons(g, 36, 22, 24, 3);
        wall(g, 12, 52, 16, 32);
        merlons(g, 12, 52, 16, 2);
        wall(g, 68, 52, 16, 32);
        merlons(g, 68, 52, 16, 2);
        g.fillStyle = '#3a2618';
        g.fillRect(42, 68, 12, 16);
        flag(g, 48, 18, color);
        break;
      case 'village':
        hut(g, 14, 52, 28, 22, '#a8743e');
        hut(g, 52, 56, 30, 22, '#8a5a30');
        hut(g, 34, 66, 26, 18, '#b88448');
        flag(g, 30, 34, color, 0.8);
        break;
      case 'lair':
        g.fillStyle = '#6a4a30';
        g.strokeStyle = INK;
        g.lineWidth = 2;
        for (const [x, w] of [[18, 30], [50, 28]] as const) {
          g.beginPath();
          g.moveTo(x, 80);
          g.lineTo(x + w / 2, 40);
          g.lineTo(x + w, 80);
          g.closePath();
          g.fill();
          g.stroke();
        }
        g.fillStyle = '#1e1410';
        g.beginPath();
        g.moveTo(26, 80);
        g.lineTo(33, 58);
        g.lineTo(40, 80);
        g.fill();
        g.fillStyle = '#ff8a2c';
        g.beginPath();
        g.arc(48, 80, 6, Math.PI, 0);
        g.fill();
        flag(g, 64, 42, color, 0.9);
        break;
      case 'monster':
        wall(g, 12, 52, 72, 32, '#6a5a4c', '#4a3e34');
        g.fillStyle = '#e0d6bc';
        g.strokeStyle = INK;
        g.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          g.beginPath();
          g.moveTo(14 + i * 12, 54);
          g.lineTo(20 + i * 12, 22 + (i % 2) * 14);
          g.lineTo(26 + i * 12, 54);
          g.closePath();
          g.fill();
          g.stroke();
        }
        flag(g, 48, 26, color);
        break;
      default: {
        // 地下城同迷宮：石洞口
        g.fillStyle = '#5a554e';
        g.strokeStyle = INK;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(10, 84);
        g.lineTo(20, 46);
        g.lineTo(38, 26);
        g.lineTo(62, 28);
        g.lineTo(78, 48);
        g.lineTo(86, 84);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = STONE_DARK;
        g.beginPath();
        g.moveTo(62, 28);
        g.lineTo(78, 48);
        g.lineTo(86, 84);
        g.lineTo(62, 84);
        g.fill();
        g.fillStyle = STONE;
        g.beginPath();
        g.moveTo(28, 84);
        g.lineTo(28, 58);
        g.quadraticCurveTo(48, 28, 68, 58);
        g.lineTo(68, 84);
        g.fill();
        g.fillStyle = '#100c12';
        g.beginPath();
        g.moveTo(35, 84);
        g.lineTo(35, 60);
        g.quadraticCurveTo(48, 40, 61, 60);
        g.lineTo(61, 84);
        g.fill();
        g.fillStyle = color;
        g.beginPath();
        g.arc(48, 40, 4, 0, Math.PI * 2);
        g.fill();
      }
    }
  });
}

/** 部隊：騎馬人加軍旗 */
export function partyIcon(color: string, wagon = false): HTMLCanvasElement {
  return sprite(`party:${color}:${wagon}`, (g) => {
    g.strokeStyle = INK;
    g.fillStyle = '#3a2c24';
    g.lineWidth = 2;
    if (wagon) {
      g.fillStyle = '#8a6240';
      g.fillRect(22, 56, 50, 16);
      g.strokeRect(22, 56, 50, 16);
      g.fillStyle = '#e8dcc0';
      g.beginPath();
      g.moveTo(24, 56);
      g.quadraticCurveTo(47, 26, 70, 56);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = '#3a2c24';
      for (const x of [34, 62]) {
        g.beginPath();
        g.arc(x, 76, 8, 0, Math.PI * 2);
        g.fill();
      }
      flag(g, 70, 42, color, 0.8);
      return;
    }
    // 馬身
    g.beginPath();
    g.ellipse(46, 62, 20, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(60, 58);
    g.lineTo(72, 44);
    g.lineTo(78, 48);
    g.lineTo(68, 64);
    g.closePath();
    g.fill();
    g.lineWidth = 3.5;
    g.strokeStyle = '#3a2c24';
    for (const [x, d] of [[32, -3], [38, 2], [54, -2], [60, 3]] as const) {
      g.beginPath();
      g.moveTo(x, 66);
      g.lineTo(x + d, 84);
      g.stroke();
    }
    // 騎士
    g.fillStyle = color;
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(38, 56);
    g.lineTo(42, 36);
    g.lineTo(54, 36);
    g.lineTo(54, 56);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#e0b48c';
    g.beginPath();
    g.arc(48, 30, 6, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    flag(g, 36, 44, color, 1.15);
  });
}
