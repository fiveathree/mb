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
      g.fillStyle = p === 'dusk' ? 'rgba(255,190,150,.65)' : 'rgba(255,255,255,.75)';
      for (const c of CLOUDS) {
        const x = (((c.x * width + this.t * 6 - fx * 0.1) % (width + 240)) + width + 240) % (width + 240) - 120;
        g.beginPath();
        g.ellipse(x, c.y * horizon, c.w, 9, 0, 0, Math.PI * 2);
        g.ellipse(x + c.w * 0.3, c.y * horizon - 6, c.w * 0.5, 8, 0, 0, Math.PI * 2);
        g.fill();
      }
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
      const size = Math.max(3, f.def.wing * p.s * 1.3);
      // 地面影，近先見
      if (p.y > horizon + 8 && p.s > 0.3) {
        g.fillStyle = 'rgba(8,10,16,.22)';
        g.beginPath();
        g.ellipse(p.x, p.y, size * 0.55, size * 0.16, 0, 0, Math.PI * 2);
        g.fill();
      }
      const x = p.x;
      const y = p.y - f.alt * p.s * 1.8;
      const dir = Math.sign(f.vx) || 1;
      const beat = f.def.flap ? Math.sin(this.t * f.def.flap + f.phase) * size * 0.34 : -size * 0.08;
      g.fillStyle = f.def.color;
      g.beginPath();
      // 雙翼
      g.moveTo(x - size * 0.1, y);
      g.lineTo(x - size * 0.5, y - beat);
      g.lineTo(x - size * 0.16, y + size * 0.08);
      g.lineTo(x + size * 0.16, y + size * 0.08);
      g.lineTo(x + size * 0.5, y - beat);
      g.lineTo(x + size * 0.1, y);
      g.closePath();
      g.fill();
      // 身同頭
      g.beginPath();
      g.ellipse(x, y + size * 0.03, size * 0.26, size * 0.07, 0, 0, Math.PI * 2);
      g.arc(x + dir * size * 0.28, y, size * 0.06, 0, Math.PI * 2);
      g.fill();
    }
  }
}
