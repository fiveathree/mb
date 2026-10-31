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

/** 圓形城市：一圈圈城牆，放射街道，中央王城 */
function circleCity(g: CanvasRenderingContext2D, color: string) {
  const cx = 48;
  const cy = 62;
  const ring = (rx: number, ry: number, fill: string, stroke: string, width: number) => {
    g.fillStyle = fill;
    g.strokeStyle = stroke;
    g.lineWidth = width;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  };
  // 城牆厚度
  g.fillStyle = STONE_DARK;
  g.beginPath();
  g.ellipse(cx, cy + 5, 45, 26, 0, 0, Math.PI * 2);
  g.fill();
  ring(45, 26, '#8a8272', STONE, 3);
  ring(39, 22, '#7a8a58', STONE_DARK, 1);
  // 放射街道
  g.strokeStyle = 'rgba(222,206,160,.9)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 6);
    g.lineTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 23);
    g.stroke();
  }
  // 一圈圈屋
  for (const [rx, ry, n] of [[33, 18.5, 22], [24, 13.5, 16]] as const) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = cx + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      g.fillStyle = '#d8c8a4';
      g.fillRect(x - 2, y - 1, 4, 3);
      g.fillStyle = i % 3 ? '#a8603c' : color;
      g.beginPath();
      g.moveTo(x - 3, y - 1);
      g.lineTo(x, y - 4);
      g.lineTo(x + 3, y - 1);
      g.fill();
    }
  }
  ring(15, 8.5, '#b8b0a2', STONE_DARK, 2);
  // 城牆塔
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = cx + Math.cos(a) * 45;
    const y = cy + Math.sin(a) * 26;
    wall(g, x - 3, y - 7, 6, 9);
  }
  // 中央王城
  tower(g, 34, 42, 9, 22, color);
  tower(g, 53, 42, 9, 22, color);
  tower(g, 42, 26, 12, 38, color);
  flag(g, 48, 12, color, 0.7);
}

/** 城鎮、城堡等：color 係擁有者顏色 */
export function placeIcon(kind: PlaceKind | 'monster', color: string): HTMLCanvasElement {
  return sprite(`${kind}:${color}`, (g) => {
    switch (kind) {
      case 'town':
        circleCity(g, color);
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

/** 崩塌後嘅頹垣敗瓦 */
export function ruinIcon(color: string): HTMLCanvasElement {
  return sprite(`ruin:${color}`, (g) => {
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.fillStyle = '#3a3230';
    g.beginPath();
    g.ellipse(48, 82, 40, 9, 0, 0, Math.PI * 2);
    g.fill();
    // 斷牆
    for (const [x, h, w] of [[16, 30, 12], [38, 18, 16], [60, 38, 13], [76, 16, 10]] as const) {
      g.fillStyle = STONE_DARK;
      g.beginPath();
      g.moveTo(x, 84);
      g.lineTo(x, 84 - h);
      g.lineTo(x + w * 0.4, 84 - h + 7);
      g.lineTo(x + w * 0.7, 84 - h + 2);
      g.lineTo(x + w, 84 - h + 11);
      g.lineTo(x + w, 84);
      g.closePath();
      g.fill();
      g.stroke();
    }
    g.fillStyle = '#6a5a4c';
    for (let i = 0; i < 12; i++) g.fillRect(14 + (i * 37) % 68, 76 + (i * 13) % 9, 7, 5);
    g.fillStyle = color;
    g.globalAlpha = 0.8;
    g.fillRect(46, 74, 12, 5);
    g.globalAlpha = 1;
    g.fillStyle = '#ff7a2a';
    for (const x of [28, 52, 70]) {
      g.beginPath();
      g.arc(x, 78, 3, 0, Math.PI * 2);
      g.fill();
    }
  });
}

/** 災厄本體 */
export function calamityIcon(kind: string): HTMLCanvasElement {
  return sprite(`doom:${kind}`, (g) => {
    g.lineJoin = 'round';
    if (kind === 'titan') {
      const aura = g.createRadialGradient(48, 44, 6, 48, 44, 46);
      aura.addColorStop(0, 'rgba(255,200,110,.5)');
      aura.addColorStop(1, 'rgba(255,120,60,0)');
      g.fillStyle = aura;
      g.fillRect(0, 0, 96, 96);
      g.fillStyle = '#1c1416';
      g.beginPath();
      g.moveTo(34, 94);
      g.lineTo(36, 58);
      g.lineTo(18, 66);
      g.lineTo(12, 40);
      g.lineTo(32, 28);
      g.lineTo(40, 24);
      g.lineTo(38, 12);
      g.lineTo(30, 2);
      g.lineTo(44, 10);
      g.lineTo(52, 10);
      g.lineTo(66, 2);
      g.lineTo(58, 12);
      g.lineTo(56, 24);
      g.lineTo(64, 28);
      g.lineTo(84, 40);
      g.lineTo(78, 66);
      g.lineTo(60, 58);
      g.lineTo(62, 94);
      g.lineTo(50, 94);
      g.lineTo(48, 66);
      g.lineTo(46, 94);
      g.closePath();
      g.fill();
      g.fillStyle = '#ffb03a';
      g.fillRect(41, 15, 5, 3);
      g.fillRect(50, 15, 5, 3);
      return;
    }
    if (kind === 'witch') {
      const aura = g.createRadialGradient(48, 46, 4, 48, 46, 46);
      aura.addColorStop(0, 'rgba(210,90,250,.8)');
      aura.addColorStop(1, 'rgba(120,30,200,0)');
      g.fillStyle = aura;
      g.fillRect(0, 0, 96, 96);
      g.fillStyle = '#20102c';
      g.beginPath();
      g.moveTo(48, 14);
      g.lineTo(60, 40);
      g.lineTo(70, 84);
      g.lineTo(26, 84);
      g.lineTo(36, 40);
      g.closePath();
      g.fill();
      g.fillStyle = '#e8a0ff';
      g.beginPath();
      g.arc(48, 34, 5, 0, Math.PI * 2);
      g.fill();
      return;
    }
    // 巨龍同飛龍
    const body = kind === 'wyrm' ? '#2a1a4a' : '#7a1e18';
    const web = kind === 'wyrm' ? '#4a2a7a' : '#a8342a';
    g.fillStyle = web;
    for (const s of [1, -1]) {
      g.beginPath();
      g.moveTo(48, 44);
      g.lineTo(48 + s * 46, 16);
      g.lineTo(48 + s * 38, 44);
      g.lineTo(48 + s * 28, 40);
      g.lineTo(48 + s * 22, 58);
      g.closePath();
      g.fill();
    }
    g.fillStyle = body;
    g.beginPath();
    g.ellipse(48, 50, 11, 24, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(42, 34);
    g.lineTo(48, 12);
    g.lineTo(54, 34);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(44, 70);
    g.lineTo(48, 94);
    g.lineTo(52, 70);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffb03a';
    g.fillRect(45, 18, 2, 2);
    g.fillRect(49, 18, 2, 2);
  });
}

/** 秘景記號：未見係問號星 */
export function vistaIcon(found: boolean): HTMLCanvasElement {
  return sprite(`vista:${found}`, (g) => {
    g.fillStyle = found ? '#f2c14e' : '#fff4dc';
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 16 : 36;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(48 + Math.cos(a) * r, 48 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.stroke();
    if (found) return;
    g.fillStyle = INK;
    g.font = '900 34px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('?', 48, 50);
  });
}

/** 港口：泊住一隻帆船 */
export function portIcon(): HTMLCanvasElement {
  return sprite('port', (g) => {
    g.fillStyle = '#6a4e30';
    g.fillRect(6, 66, 60, 7);
    g.fillRect(14, 66, 5, 20);
    g.fillRect(50, 66, 5, 20);
    g.fillStyle = '#4a3020';
    g.beginPath();
    g.moveTo(26, 60);
    g.lineTo(84, 60);
    g.lineTo(74, 76);
    g.lineTo(34, 76);
    g.closePath();
    g.fill();
    g.fillStyle = '#f4ecd8';
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(54, 12);
    g.lineTo(54, 56);
    g.lineTo(82, 54);
    g.closePath();
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(50, 22);
    g.lineTo(50, 56);
    g.lineTo(32, 54);
    g.closePath();
    g.fill();
    g.stroke();
  });
}
