import { CALAMITY } from '../data/tomb';

/** 災厄本體：大尺寸分層繪畫，唔用外部圖檔 */
const S = 384;
const cache = new Map<string, HTMLCanvasElement>();

type G = CanvasRenderingContext2D;

function glow(g: G, color: string, blur: number, fn: () => void) {
  g.save();
  g.shadowColor = color;
  g.shadowBlur = blur;
  fn();
  g.restore();
}

/** 由左上打光嘅漸變 */
function lit(g: G, x0: number, y0: number, x1: number, y1: number, hi: string, mid: string, lo: string) {
  const grad = g.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0, hi);
  grad.addColorStop(0.5, mid);
  grad.addColorStop(1, lo);
  return grad;
}

function shape(g: G, pts: [number, number][], curve = true) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (!curve) {
      g.lineTo(x, y);
      continue;
    }
    const [nx, ny] = pts[(i + 1) % pts.length];
    g.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  g.closePath();
}

/** 粗壯四肢：由 a 到 b，兩頭闊度唔同，帶肌肉隆起 */
function limb(g: G, ax: number, ay: number, bx: number, by: number, wa: number, wb: number, hi: string, mid: string, lo: string) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const bulge = 1.28;
  g.fillStyle = lit(g, ax - nx * wa, ay - ny * wa, ax + nx * wa, ay + ny * wa, hi, mid, lo);
  g.beginPath();
  g.moveTo(ax + nx * wa, ay + ny * wa);
  g.quadraticCurveTo(ax + dx * 0.4 + nx * wa * bulge, ay + dy * 0.4 + ny * wa * bulge, bx + nx * wb, by + ny * wb);
  g.lineTo(bx - nx * wb, by - ny * wb);
  g.quadraticCurveTo(ax + dx * 0.4 - nx * wa * bulge, ay + dy * 0.4 - ny * wa * bulge, ax - nx * wa, ay - ny * wa);
  g.closePath();
  g.fill();
}

interface TitanStyle {
  aura: string;
  skin: [string, string, string];
  iron: [string, string, string];
  glowC: string;
  cape: string;
  sixArms: boolean;
  halo: boolean;
}

const TITANS: Record<string, TitanStyle> = {
  boss_demongod: {
    aura: 'rgba(255,110,40,', skin: ['#7a3a30', '#3a1a1c', '#180a0e'], iron: ['#5a5560', '#26222c', '#0e0c12'], glowC: '#ff8a2a', cape: '#5a1414', sixArms: false, halo: false,
  },
  boss_asura: {
    aura: 'rgba(255,190,70,', skin: ['#d8603a', '#962a24', '#4a1216'], iron: ['#f0d080', '#a8782c', '#4a3210'], glowC: '#ffd86a', cape: '#3a2a70', sixArms: true, halo: true,
  },
};

function titan(g: G, st: TitanStyle) {
  const aura = g.createRadialGradient(192, 150, 20, 192, 170, 190);
  aura.addColorStop(0, `${st.aura}.55)`);
  aura.addColorStop(0.6, `${st.aura}.16)`);
  aura.addColorStop(1, `${st.aura}0)`);
  g.fillStyle = aura;
  g.fillRect(0, 0, S, S);

  if (st.halo) {
    glow(g, st.glowC, 26, () => {
      g.strokeStyle = st.glowC;
      g.lineWidth = 7;
      g.beginPath();
      g.arc(192, 76, 76, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        g.beginPath();
        g.moveTo(192 + Math.cos(a) * 80, 76 + Math.sin(a) * 80);
        g.lineTo(192 + Math.cos(a) * 98, 76 + Math.sin(a) * 98);
        g.stroke();
      }
    });
  }

  // 披風，下擺破爛
  g.fillStyle = lit(g, 60, 80, 330, 370, st.cape, st.cape, '#0a0608');
  shape(g, [[150, 92], [70, 170], [46, 320], [78, 300], [92, 372], [130, 322], [168, 376], [204, 330], [246, 376], [276, 318], [306, 370], [320, 300], [340, 322], [316, 170], [234, 92]], false);
  g.fill();

  // 後手
  if (st.sixArms) {
    limb(g, 128, 130, 44, 86, 20, 13, st.skin[0], st.skin[1], st.skin[2]);
    limb(g, 256, 130, 340, 86, 20, 13, st.skin[0], st.skin[1], st.skin[2]);
    limb(g, 130, 170, 40, 208, 20, 13, st.skin[0], st.skin[1], st.skin[2]);
    limb(g, 254, 170, 344, 208, 20, 13, st.skin[0], st.skin[1], st.skin[2]);
  }

  // 腿
  limb(g, 158, 244, 134, 330, 38, 24, st.skin[0], st.skin[1], st.skin[2]);
  limb(g, 226, 244, 250, 330, 38, 24, st.skin[1], st.skin[1], st.skin[2]);
  limb(g, 134, 326, 126, 376, 24, 30, st.iron[0], st.iron[1], st.iron[2]);
  limb(g, 250, 326, 258, 376, 24, 30, st.iron[1], st.iron[1], st.iron[2]);

  // 身
  g.fillStyle = lit(g, 110, 100, 290, 260, st.skin[0], st.skin[1], st.skin[2]);
  shape(g, [[122, 112], [262, 112], [288, 150], [250, 216], [236, 262], [148, 262], [134, 216], [96, 150]]);
  g.fill();
  // 胸肌同腹肌
  g.strokeStyle = 'rgba(0,0,0,.5)';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(192, 118);
  g.lineTo(192, 256);
  g.moveTo(132, 170);
  g.quadraticCurveTo(164, 192, 192, 172);
  g.quadraticCurveTo(220, 192, 252, 170);
  for (const y of [204, 228]) {
    g.moveTo(160, y);
    g.lineTo(224, y);
  }
  g.stroke();

  // 腰甲
  g.fillStyle = lit(g, 130, 248, 260, 300, st.iron[0], st.iron[1], st.iron[2]);
  shape(g, [[140, 250], [244, 250], [262, 300], [216, 286], [192, 312], [168, 286], [122, 300]], false);
  g.fill();

  // 熔岩裂紋
  glow(g, st.glowC, 16, () => {
    g.strokeStyle = st.glowC;
    g.lineWidth = 3;
    g.beginPath();
    for (const p of [[150, 130, 176, 160, 160, 196], [234, 130, 206, 158, 226, 198], [192, 150, 184, 200, 200, 244], [160, 262, 150, 300, 136, 326], [226, 262, 240, 300, 250, 326]]) {
      g.moveTo(p[0], p[1]);
      g.lineTo(p[2], p[3]);
      g.lineTo(p[4], p[5]);
    }
    g.stroke();
    g.fillStyle = st.glowC;
    g.beginPath();
    g.arc(192, 150, 11, 0, Math.PI * 2);
    g.fill();
  });

  // 前手同肩甲
  limb(g, 112, 132, 62, 214, 32, 22, st.skin[0], st.skin[1], st.skin[2]);
  limb(g, 62, 212, 74, 268, 24, 20, st.iron[0], st.iron[1], st.iron[2]);
  limb(g, 272, 132, 326, 206, 32, 22, st.skin[1], st.skin[1], st.skin[2]);
  limb(g, 326, 204, 322, 262, 24, 20, st.iron[1], st.iron[1], st.iron[2]);
  for (const [x, s] of [[112, -1], [272, 1]] as const) {
    g.fillStyle = lit(g, x - 44, 90, x + 44, 160, st.iron[0], st.iron[1], st.iron[2]);
    shape(g, [[x - 44, 142], [x - 30, 104], [x + s * 56, 92], [x + 40, 106], [x + 46, 146]], false);
    g.fill();
  }

  // 巨劍
  g.fillStyle = lit(g, 330, 0, 356, 0, '#e8eef4', '#7a8494', '#2a2e38');
  shape(g, [[318, 262], [346, 262], [350, 44], [332, 4], [314, 44]], false);
  g.fill();
  glow(g, st.glowC, 14, () => {
    g.strokeStyle = st.glowC;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(332, 30);
    g.lineTo(332, 240);
    g.stroke();
  });
  g.fillStyle = st.iron[1];
  g.fillRect(296, 256, 72, 14);

  // 頭同角
  g.fillStyle = lit(g, 160, 40, 224, 112, st.iron[0], st.iron[1], st.iron[2]);
  shape(g, [[158, 58], [192, 34], [226, 58], [224, 92], [204, 116], [180, 116], [160, 92]], false);
  g.fill();
  for (const s of [1, -1]) {
    g.fillStyle = lit(g, 192, 40, 192 + s * 100, 0, st.iron[0], '#1c1618', '#0a080a');
    shape(g, [[192 + s * 24, 60], [192 + s * 70, 42], [192 + s * 96, 2], [192 + s * 78, 58], [192 + s * 34, 80]]);
    g.fill();
  }
  glow(g, st.glowC, 18, () => {
    g.fillStyle = '#fff0b0';
    g.fillRect(170, 74, 16, 6);
    g.fillRect(198, 74, 16, 6);
  });
}

function witch(g: G) {
  const aura = g.createRadialGradient(192, 190, 10, 192, 190, 190);
  aura.addColorStop(0, 'rgba(210,90,255,.6)');
  aura.addColorStop(1, 'rgba(90,20,170,0)');
  g.fillStyle = aura;
  g.fillRect(0, 0, S, S);
  // 符文圈
  glow(g, '#e08aff', 18, () => {
    g.strokeStyle = '#e8a8ff';
    g.lineWidth = 3;
    for (const r of [150, 118]) {
      g.beginPath();
      g.ellipse(192, 330, r, r * 0.3, 0, 0, Math.PI * 2);
      g.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillStyle = '#f0c8ff';
      g.fillRect(192 + Math.cos(a) * 134 - 3, 330 + Math.sin(a) * 40 - 3, 6, 6);
    }
  });
  // 長袍向下散開
  g.fillStyle = lit(g, 120, 100, 280, 340, '#6a2a90', '#2a1040', '#0c0614');
  shape(g, [[172, 120], [212, 120], [240, 200], [296, 330], [252, 308], [226, 340], [192, 312], [158, 340], [132, 308], [88, 330], [144, 200]]);
  g.fill();
  // 手同杖
  g.strokeStyle = '#1c0e24';
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(282, 44);
  g.lineTo(262, 340);
  g.stroke();
  limb(g, 216, 140, 278, 170, 16, 10, '#5a2a78', '#2a1040', '#100618');
  limb(g, 168, 140, 96, 112, 16, 10, '#5a2a78', '#2a1040', '#100618');
  glow(g, '#ff8aff', 26, () => {
    g.fillStyle = '#ffd8ff';
    g.beginPath();
    g.arc(282, 40, 15, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(92, 106, 11, 0, Math.PI * 2);
    g.fill();
  });
  // 面同長髮
  g.fillStyle = '#e8d8e8';
  g.beginPath();
  g.ellipse(192, 96, 20, 26, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#18081f';
  shape(g, [[168, 80], [216, 80], [226, 150], [206, 124], [178, 124], [158, 150]]);
  g.fill();
  // 闊邊巫帽
  g.fillStyle = lit(g, 110, 60, 280, 80, '#3a1850', '#1c0a28', '#08040c');
  g.beginPath();
  g.ellipse(192, 76, 88, 15, 0, 0, Math.PI * 2);
  g.fill();
  shape(g, [[156, 74], [228, 74], [204, 26], [238, 4], [186, 16]], false);
  g.fill();
  glow(g, '#ff8aff', 12, () => {
    g.fillStyle = '#ffc0ff';
    g.fillRect(180, 94, 9, 3);
    g.fillRect(197, 94, 9, 3);
  });
}

function dragon(g: G, body: [string, string, string], web: [string, string], fire: string, horns: number) {
  // 後翼
  const wing = (dir: number, far: boolean) => {
    const bx = 190;
    const by = 170;
    const tipX = 192 + dir * 188;
    const pts: [number, number][] = [[bx, by], [bx + dir * 70, 60], [tipX - dir * 30, 18], [tipX, 100], [bx + dir * 134, 150], [bx + dir * 118, 214], [bx + dir * 70, 186], [bx + dir * 54, 250], [bx + dir * 16, 214]];
    g.fillStyle = lit(g, bx, 40, tipX, 240, far ? web[1] : web[0], web[1], '#0c0810');
    shape(g, pts, false);
    g.fill();
    g.strokeStyle = body[2];
    g.lineWidth = 5;
    g.beginPath();
    for (const [x, y] of [[tipX, 100], [bx + dir * 134, 150], [bx + dir * 118, 214], [bx + dir * 70, 186], [bx + dir * 54, 250]]) {
      g.moveTo(bx + dir * 70, 60);
      g.lineTo(x, y);
    }
    g.stroke();
    g.strokeStyle = body[1];
    g.lineWidth = 11;
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(bx + dir * 70, 60);
    g.lineTo(tipX - dir * 30, 18);
    g.stroke();
  };
  wing(1, true);
  wing(-1, false);
  // 尾
  g.strokeStyle = body[2];
  g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const k = i / 26;
    g.lineWidth = 40 * (1 - k) + 4;
    g.beginPath();
    g.moveTo(190 + Math.sin(k * 6) * 38 * k, 240 + k * 130);
    g.lineTo(190 + Math.sin((k + 0.05) * 6) * 38 * (k + 0.05), 240 + (k + 0.05) * 130);
    g.stroke();
  }
  // 身：鱗片
  g.fillStyle = lit(g, 140, 130, 250, 280, body[0], body[1], body[2]);
  shape(g, [[160, 150], [224, 150], [242, 210], [222, 270], [166, 270], [146, 210]]);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.08)';
  for (let y = 158; y < 266; y += 10) {
    for (let x = 156 + (y % 20); x < 230; x += 16) {
      g.beginPath();
      g.arc(x, y, 5, 0, Math.PI);
      g.fill();
    }
  }
  // 頸彎成 S
  g.strokeStyle = body[1];
  for (let i = 0; i < 24; i++) {
    const k = i / 24;
    g.lineWidth = 42 - k * 20;
    g.beginPath();
    g.moveTo(192 + Math.sin(k * 3.4) * 34, 160 - k * 120);
    g.lineTo(192 + Math.sin((k + 0.05) * 3.4) * 34, 160 - (k + 0.05) * 120);
    g.stroke();
  }
  // 頭
  const hx = 188;
  const hy = 40;
  for (const s of [1, -1]) {
    for (let i = 0; i < horns; i++) {
      g.fillStyle = '#e8dcc0';
      shape(g, [[hx + s * (12 + i * 8), hy - 2], [hx + s * (44 + i * 10), hy - 40 + i * 12], [hx + s * (22 + i * 8), hy + 8]], false);
      g.fill();
    }
  }
  g.fillStyle = lit(g, hx - 30, hy - 20, hx + 30, hy + 40, body[0], body[1], body[2]);
  shape(g, [[hx - 28, hy - 8], [hx + 28, hy - 8], [hx + 22, hy + 22], [hx + 10, hy + 54], [hx - 10, hy + 54], [hx - 22, hy + 22]], false);
  g.fill();
  glow(g, fire, 14, () => {
    g.fillStyle = '#fff0a0';
    g.fillRect(hx - 18, hy + 6, 11, 5);
    g.fillRect(hx + 7, hy + 6, 11, 5);
  });
  // 龍息
  glow(g, fire, 30, () => {
    const f = g.createLinearGradient(hx, hy + 50, hx, hy + 130);
    f.addColorStop(0, '#fff8c0');
    f.addColorStop(0.4, fire);
    f.addColorStop(1, 'rgba(255,60,20,0)');
    g.fillStyle = f;
    shape(g, [[hx - 8, hy + 52], [hx + 8, hy + 52], [hx + 30, hy + 130], [hx - 30, hy + 130]], false);
    g.fill();
  });
}

export function calamityIcon(kind: string): HTMLCanvasElement {
  const key = kind === 'titan' ? `titan:${CALAMITY.titan.unit}` : kind;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.lineJoin = 'round';
  if (kind === 'titan') titan(g, TITANS[CALAMITY.titan.unit] ?? TITANS.boss_demongod);
  else if (kind === 'witch') witch(g);
  else if (kind === 'wyrm') dragon(g, ['#6a4ab0', '#3a2470', '#160c30'], ['#7a4ae0', '#2a1458'], '#c06aff', 3);
  else dragon(g, ['#e0542a', '#a02a18', '#3a0e0a'], ['#c8402a', '#5a1812'], '#ff8a2a', 2);
  cache.set(key, c);
  return c;
}
