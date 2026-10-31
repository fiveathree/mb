import { MAP_VIEW, SKY_FAUNA, type SkyFauna } from '../data/world';

export interface Projected {
  x: number;
  y: number;
  s: number;
}

interface Flyer {
  def: SkyFauna;
  x: number;
  y: number;
  alt: number;
  vx: number;
  vy: number;
  phase: number;
}

const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (i * 0.6180339) % 1, y: (i * 0.3819661 * 7) % 1, r: i % 5 === 0 ? 1.6 : 1 }));
const CLOUDS = Array.from({ length: 7 }, (_, i) => ({ x: (i * 0.2718) % 1, y: 0.2 + ((i * 0.37) % 0.6), w: 70 + (i % 3) * 45 }));

/** 天空：顏色、雲、遠山同飛行生物 */
export class Sky {
  private flyers: Flyer[] = [];
  private t = 0;

  private period(hour: number): 'day' | 'dusk' | 'night' {
    if (hour < 5 || hour >= 20) return 'night';
    return hour < 7 || hour >= 18 ? 'dusk' : 'day';
  }

  private spawn(kinds: string[], fx: number, fy: number) {
    const def = SKY_FAUNA[kinds[Math.floor(Math.random() * kinds.length)]];
    const { skyRange: range } = MAP_VIEW;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const x = fx - dir * range;
    // 大部分喺遠方，咁先會喺天空出現
    const y = fy - 100 - Math.random() * range * 1.2;
    const ang = (Math.random() - 0.5) * 0.5;
    const alt = def.alt[0] + Math.random() * (def.alt[1] - def.alt[0]);
    for (let i = 0; i < def.flock; i++) {
      this.flyers.push({
        def, x: x - dir * i * def.wing * 1.3, y: y + (i % 2 ? 1 : -1) * i * def.wing, alt: alt + i * 4,
        vx: Math.cos(ang) * dir * def.speed, vy: Math.sin(ang) * def.speed, phase: Math.random() * 6,
      });
    }
  }

  update(dt: number, kinds: string[], fx: number, fy: number) {
    this.t += dt;
    for (const f of this.flyers) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
    }
    const range = MAP_VIEW.skyRange * 1.3;
    this.flyers = this.flyers.filter((f) => Math.abs(f.x - fx) < range && f.y < fy + range);
    if (this.flyers.length < MAP_VIEW.skyCount) this.spawn(kinds, fx, fy);
  }

  drawBack(g: CanvasRenderingContext2D, width: number, horizon: number, hour: number, fx: number) {
    const p = this.period(hour);
    const [top, low] = MAP_VIEW.sky[p];
    const grad = g.createLinearGradient(0, 0, 0, horizon);
    grad.addColorStop(0, top);
    grad.addColorStop(1, low);
    g.fillStyle = grad;
    g.fillRect(0, 0, width, horizon + 2);

    if (p === 'night') {
      g.fillStyle = '#e8ecff';
      for (const s of STARS) g.fillRect(s.x * width, s.y * horizon, s.r, s.r);
      g.fillStyle = '#f0ecd8';
      g.beginPath();
      g.arc(width * 0.78, horizon * 0.34, 15, 0, Math.PI * 2);
      g.fill();
    } else {
      // 日頭由左行到右
      const k = (hour - 5) / 15;
      g.fillStyle = p === 'dusk' ? '#ffb070' : '#fff6cc';
      g.beginPath();
      g.arc(width * (0.1 + k * 0.8), horizon * (0.92 - Math.sin(k * Math.PI) * 0.72), 18, 0, Math.PI * 2);
      g.fill();
      const tone = p === 'dusk' ? '255,196,160' : '255,255,255';
      CLOUDS.forEach((c, i) => {
        const x = (((c.x * width + this.t * 6 - fx * 0.1) % (width + 340)) + width + 340) % (width + 340) - 170;
        const w = c.w * 2.2;
        const h = Math.min(horizon * 0.6, w * 0.35);
        g.drawImage(cloudSprite(tone, i % 3), x - w / 2, c.y * horizon - h / 2, w, h);
      });
    }

    // 遠山，隨鏡頭輕微移動
    g.fillStyle = MAP_VIEW.ridge[p];
    g.beginPath();
    g.moveTo(0, horizon + 3);
    for (let x = 0; x <= width + 12; x += 12) {
      const u = x + fx * 0.08;
      g.lineTo(x, horizon - 9 - 8 * Math.abs(Math.sin(u * 0.009)) - 5 * Math.abs(Math.sin(u * 0.031)));
    }
    g.lineTo(width, horizon + 3);
    g.fill();
  }

  /** 地面霧氣，令遠方融入天空 */
  drawHaze(g: CanvasRenderingContext2D, width: number, horizon: number, height: number, hour: number) {
    const low = MAP_VIEW.sky[this.period(hour)][1];
    const band = height * 0.05;
    const grad = g.createLinearGradient(0, horizon, 0, horizon + band);
    grad.addColorStop(0, low);
    grad.addColorStop(1, `${low}00`);
    g.fillStyle = grad;
    g.fillRect(0, horizon, width, band);
  }

  drawFlyers(g: CanvasRenderingContext2D, project: (x: number, y: number) => Projected | null, horizon: number) {
    const list = this.flyers
      .map((f) => ({ f, p: project(f.x, f.y) }))
      .filter((o): o is { f: Flyer; p: Projected } => !!o.p)
      .sort((a, b) => a.p.s - b.p.s);
    for (const { f, p } of list) {
      const size = Math.max(4, f.def.wing * p.s * 1.5);
      // 地面影，翼形
      if (p.y > horizon + 8 && p.s > 0.3) {
        g.fillStyle = 'rgba(8,10,16,.2)';
        g.beginPath();
        g.ellipse(p.x, p.y, size * 0.5, size * 0.12, 0, 0, Math.PI * 2);
        g.fill();
      }
      const y = p.y - f.alt * p.s * 1.8;
      const dir = Math.sign(f.vx) || 1;
      const beat = f.def.flap ? Math.sin(this.t * f.def.flap + f.phase) : 0.15;
      g.save();
      g.translate(p.x, y);
      g.scale(dir, 1);
      drawCreature(g, f.def, size, beat);
      g.restore();
    }
  }
}

const shade = (c: string, k: number) => {
  const n = parseInt(c.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

/** 翼：羽翼尖、蝠翼有膜骨；beat 由 -1 到 1 */
function wing(g: CanvasRenderingContext2D, s: number, beat: number, color: string, bat: boolean, back: boolean) {
  const lift = beat * s * 0.42;
  const ox = back ? 0.06 * s : -0.02 * s;
  const tipX = ox - s * 0.34;
  const tipY = -lift - s * 0.06;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(ox + s * 0.1, -s * 0.03);
  g.quadraticCurveTo(ox - s * 0.04, -lift * 0.9 - s * 0.14, tipX, tipY);
  if (bat) {
    // 膜邊一段段向內彎
    const mid = [[0.26, 0.5], [0.16, 0.8], [0.04, 1]];
    let px = tipX;
    let py = tipY;
    for (const [m, k] of mid) {
      const nx = ox - s * m + s * 0.04;
      const ny = -lift * (1 - k) + s * 0.04;
      g.quadraticCurveTo((px + nx) / 2 + s * 0.03, (py + ny) / 2 - s * 0.03, nx, ny);
      px = nx;
      py = ny;
    }
  } else {
    // 羽毛尖
    for (let i = 1; i <= 4; i++) {
      const k = i / 4;
      g.lineTo(tipX + (s * 0.42 * k), tipY * (1 - k) + s * 0.05 + (i % 2 ? s * 0.03 : -s * 0.01));
    }
  }
  g.closePath();
  g.fill();
}

function drawCreature(g: CanvasRenderingContext2D, def: SkyFauna, s: number, beat: number) {
  const c = def.color;
  const dark = shade(c, 0.62);
  const light = shade(c, 1.25);
  if (def.name === '運輸艦') {
    g.fillStyle = dark;
    g.beginPath();
    g.moveTo(s * 0.5, 0);
    g.lineTo(s * 0.2, -s * 0.1);
    g.lineTo(-s * 0.5, -s * 0.08);
    g.lineTo(-s * 0.44, s * 0.08);
    g.lineTo(s * 0.26, s * 0.08);
    g.closePath();
    g.fill();
    g.fillStyle = '#8fe0ff';
    g.fillRect(-s * 0.52, -s * 0.04, s * 0.05, s * 0.08);
    return;
  }
  if (def.name === '御劍修士') {
    g.fillStyle = '#c8e8f0';
    g.fillRect(-s * 0.4, 0, s * 0.8, s * 0.03);
    g.fillStyle = c;
    g.beginPath();
    g.ellipse(0, -s * 0.16, s * 0.08, s * 0.17, 0.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#e0b48c';
    g.beginPath();
    g.arc(s * 0.04, -s * 0.36, s * 0.05, 0, Math.PI * 2);
    g.fill();
    return;
  }
  const bat = ['魔蝠', '雙足飛龍', '巨龍', '哈比', '飛蟲'].includes(def.name);
  const beast = ['獅鷲', '天馬'].includes(def.name);
  const long = bat && def.wing > 50;
  wing(g, s, beat, dark, bat, true);
  // 尾
  g.fillStyle = dark;
  g.beginPath();
  g.moveTo(-s * 0.12, -s * 0.02);
  g.quadraticCurveTo(-s * (long ? 0.5 : 0.3), s * 0.02 - beat * s * 0.04, -s * (long ? 0.62 : 0.34), long ? s * 0.08 : 0);
  g.lineTo(-s * 0.12, s * 0.05);
  g.fill();
  // 身
  g.fillStyle = c;
  g.beginPath();
  g.ellipse(0, 0, s * (beast ? 0.24 : 0.17), s * (beast ? 0.09 : 0.055), -0.08, 0, Math.PI * 2);
  g.fill();
  // 頸同頭
  const neck = long || def.name === '仙鶴' ? 0.36 : 0.22;
  g.strokeStyle = c;
  g.lineWidth = Math.max(1, s * 0.05);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(s * 0.12, -s * 0.01);
  g.quadraticCurveTo(s * (neck - 0.04), -s * 0.03, s * neck, -s * (long ? 0.08 : 0.03));
  g.stroke();
  g.fillStyle = c;
  g.beginPath();
  g.ellipse(s * neck, -s * (long ? 0.09 : 0.04), s * 0.055, s * 0.033, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = long ? '#e8d8a0' : '#d8a040';
  g.beginPath();
  g.moveTo(s * (neck + 0.04), -s * (long ? 0.1 : 0.05));
  g.lineTo(s * (neck + 0.12), -s * (long ? 0.08 : 0.03));
  g.lineTo(s * (neck + 0.04), -s * (long ? 0.07 : 0.02));
  g.fill();
  wing(g, s, beat, light, bat, false);
  if (def.name === '火鳳凰') {
    const glow = g.createRadialGradient(0, 0, 1, 0, 0, s * 0.5);
    glow.addColorStop(0, 'rgba(255,200,90,.5)');
    glow.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = glow;
    g.fillRect(-s * 0.6, -s * 0.6, s * 1.2, s * 1.2);
  }
}

/** 雲：預先畫一團團，每幀貼上去 */
const cloudSprites = new Map<string, HTMLCanvasElement>();
function cloudSprite(tone: string, seed: number): HTMLCanvasElement {
  const key = `${tone}${seed}`;
  let c = cloudSprites.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 260;
  c.height = 90;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 26; i++) {
    const k = ((i * 37 + seed * 71) % 100) / 100;
    const j = ((i * 53 + seed * 19) % 100) / 100;
    const x = 30 + k * 200;
    const r = 16 + j * 26 * (1 - Math.abs(k - 0.5));
    const y = 62 - j * 26;
    const b = g.createRadialGradient(x, y - r * 0.2, 2, x, y, r);
    b.addColorStop(0, `rgba(${tone},.95)`);
    b.addColorStop(1, `rgba(${tone},0)`);
    g.fillStyle = b;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  cloudSprites.set(key, c);
  return c;
}
