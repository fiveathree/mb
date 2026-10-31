/** 主選單背景：程式畫嘅黃昏古堡同列陣騎兵 */
const W = 1280;
const H = 720;

function ridge(g: CanvasRenderingContext2D, base: number, amp: number, color: string, seed: number) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) {
    const y = base - Math.abs(Math.sin(x * 0.004 + seed)) * amp - Math.abs(Math.sin(x * 0.013 + seed * 2)) * amp * 0.42 - Math.sin(x * 0.041 + seed) * amp * 0.08;
    g.lineTo(x, y);
  }
  g.lineTo(W, H);
  g.fill();
}

function tower(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, roof: boolean) {
  g.fillRect(x, y, w, h);
  if (roof) {
    g.beginPath();
    g.moveTo(x - 5, y);
    g.lineTo(x + w / 2, y - w * 1.5);
    g.lineTo(x + w + 5, y);
    g.fill();
    g.fillRect(x + w / 2 - 1, y - w * 1.5 - 22, 2, 22);
    g.beginPath();
    g.moveTo(x + w / 2, y - w * 1.5 - 22);
    g.lineTo(x + w / 2 + 22, y - w * 1.5 - 16);
    g.lineTo(x + w / 2, y - w * 1.5 - 10);
    g.fill();
    return;
  }
  for (let i = 0; i < w; i += 8) g.fillRect(x + i, y - 6, 5, 6);
}

function castle(g: CanvasRenderingContext2D) {
  g.fillStyle = '#2a1a22';
  const x = 840;
  const y = 372;
  g.fillRect(x, y, 300, 90);
  for (let i = 0; i < 300; i += 14) g.fillRect(x + i, y - 8, 8, 8);
  tower(g, x - 22, y - 40, 40, 130, true);
  tower(g, x + 80, y - 92, 58, 182, true);
  tower(g, x + 170, y - 50, 44, 140, false);
  tower(g, x + 276, y - 36, 42, 126, true);
  g.fillStyle = 'rgba(255,190,110,.75)';
  for (const [a, b] of [[x + 100, y - 60], [x + 118, y - 60], [x + 108, y - 20], [x + 186, y - 18], [x - 8, y - 6], [x + 290, y - 4]]) g.fillRect(a, b, 5, 11);
}

/** 騎兵剪影加軍旗 */
function rider(g: CanvasRenderingContext2D, x: number, y: number, s: number, flag: string | null) {
  g.fillStyle = '#0f0a0c';
  g.beginPath();
  g.ellipse(x, y - 22 * s, 30 * s, 13 * s, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(x + 22 * s, y - 28 * s);
  g.lineTo(x + 42 * s, y - 54 * s);
  g.lineTo(x + 50 * s, y - 48 * s);
  g.lineTo(x + 36 * s, y - 20 * s);
  g.fill();
  for (const [a, d] of [[-22, -5], [-14, 3], [14, -3], [22, 5]]) {
    g.fillRect(x + a * s, y - 20 * s, 3.4 * s, 20 * s + d * 0.2);
  }
  g.fillRect(x - 8 * s, y - 56 * s, 15 * s, 28 * s);
  g.beginPath();
  g.arc(x, y - 64 * s, 8 * s, 0, Math.PI * 2);
  g.fill();
  g.fillRect(x + 8 * s, y - 118 * s, 2.4 * s, 110 * s);
  if (!flag) return;
  g.fillStyle = flag;
  g.beginPath();
  g.moveTo(x + 10 * s, y - 118 * s);
  g.lineTo(x + 58 * s, y - 108 * s);
  g.lineTo(x + 40 * s, y - 98 * s);
  g.lineTo(x + 58 * s, y - 88 * s);
  g.lineTo(x + 10 * s, y - 84 * s);
  g.fill();
}

export function paintBackdrop() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, H * 0.72);
  sky.addColorStop(0, '#2a2348');
  sky.addColorStop(0.4, '#8a3e4c');
  sky.addColorStop(0.72, '#e8824a');
  sky.addColorStop(1, '#ffd08a');
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(380, 420, 10, 380, 420, 420);
  glow.addColorStop(0, 'rgba(255,240,190,1)');
  glow.addColorStop(0.08, 'rgba(255,226,150,.9)');
  glow.addColorStop(0.3, 'rgba(255,170,90,.32)');
  glow.addColorStop(1, 'rgba(255,140,80,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  // 雲帶
  g.fillStyle = 'rgba(70,40,70,.34)';
  for (let i = 0; i < 16; i++) {
    const x = ((i * 397) % 1400) - 60;
    const y = 90 + ((i * 131) % 300);
    g.beginPath();
    g.ellipse(x, y, 130 + (i % 4) * 60, 7 + (i % 3) * 4, 0, 0, Math.PI * 2);
    g.fill();
  }
  ridge(g, 470, 150, '#7a4a62', 1.2);
  ridge(g, 500, 110, '#55344e', 2.6);
  castle(g);
  ridge(g, 520, 56, '#34202e', 4.1);
  ridge(g, 600, 44, '#1e141c', 5.3);
  for (let i = 0; i < 9; i++) rider(g, 60 + i * 96, 640 - Math.sin(i * 0.8) * 8, 0.62, i % 3 === 0 ? '#a82a22' : null);
  ridge(g, 668, 18, '#0f0a0c', 7.7);
  rider(g, 170, 690, 1.15, '#c8342c');
  rider(g, 1110, 700, 1.05, '#d8a83a');
  const dim = g.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 760);
  dim.addColorStop(0, 'rgba(0,0,0,0)');
  dim.addColorStop(1, 'rgba(0,0,0,.55)');
  g.fillStyle = dim;
  g.fillRect(0, 0, W, H);
  document.documentElement.style.setProperty('--backdrop', `url(${c.toDataURL('image/jpeg', 0.86)})`);
}
