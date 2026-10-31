import { BIOMES, MAP, PLACES, TERRAIN_COST } from '../data/world';
import { makeRng } from '../battle/terrain';

export type Tile = 'plain' | 'forest' | 'hill' | 'mountain' | 'water' | 'bridge' | 'snow' | 'sand' | 'swamp' | 'ash';

export const TILE_COLOR: Record<Tile, string> = {
  plain: '#8fae5e', forest: '#4f7a45', hill: '#a69a6a', mountain: '#6e6a68', water: '#4f86b8', bridge: '#b08a58',
  snow: '#e4ecf2', sand: '#dcc484', swamp: '#6a7f58', ash: '#6c646a',
};

const W = MAP.width;
const H = MAP.height;

function smoothNoise(seed: number, cell: number): (x: number, y: number) => number {
  const rng = makeRng(seed);
  const cols = Math.ceil(W / cell) + 2;
  const rows = Math.ceil(H / cell) + 2;
  const grid = Array.from({ length: cols * rows }, () => rng());
  const ease = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / cell;
    const fy = y / cell;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = ease(fx - ix);
    const ty = ease(fy - iy);
    const at = (a: number, b: number) => grid[a + b * cols];
    const top = at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx;
    const bot = at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx;
    return top * (1 - ty) + bot * ty;
  };
}

/** 尋路用嘅二元堆，地圖大咗之後線性搜尋太慢 */
class MinHeap {
  private keys: number[] = [];
  private costs: number[] = [];

  get size() {
    return this.keys.length;
  }

  push(k: number, f: number) {
    const { keys, costs } = this;
    let i = keys.length;
    keys.push(k);
    costs.push(f);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (costs[p] <= f) break;
      keys[i] = keys[p];
      costs[i] = costs[p];
      i = p;
    }
    keys[i] = k;
    costs[i] = f;
  }

  pop(): number {
    const { keys, costs } = this;
    const top = keys[0];
    const k = keys.pop()!;
    const f = costs.pop()!;
    const n = keys.length;
    if (!n) return top;
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= n) break;
      if (c + 1 < n && costs[c + 1] < costs[c]) c++;
      if (costs[c] >= f) break;
      keys[i] = keys[c];
      costs[i] = costs[c];
      i = c;
    }
    keys[i] = k;
    costs[i] = f;
    return top;
  }
}

export class WorldTerrain {
  tiles: Tile[] = new Array(W * H);

  constructor() {
    const big = smoothNoise(MAP.seed, 16);
    const mid = smoothNoise(MAP.seed + 1, 7);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const n = big(x, y) * 0.68 + mid(x, y) * 0.32;
        let t: Tile = 'plain';
        if (n > MAP.mountainAt) t = 'mountain';
        else if (n > MAP.forestAt + 0.09) t = 'hill';
        else if (n > MAP.forestAt) t = 'forest';
        this.tiles[x + y * W] = t;
      }
    }
    // 地域生態：邊界用噪聲打亂，唔會係正圓
    for (const b of BIOMES) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (Math.hypot(x - b.x, y - b.y) > b.r * (0.72 + mid(x, y) * 0.56)) continue;
          if (this.tiles[x + y * W] !== 'mountain') this.tiles[x + y * W] = b.tile;
        }
      }
    }
    // 河流由北向南穿過，橋位可以過
    for (let y = 0; y < H; y++) {
      const cx = Math.round(MAP.riderX + Math.sin(y * 0.11) * 7 + Math.sin(y * 0.031) * 5);
      for (let x = cx - 1; x <= cx + 1; x++) {
        const bridge = MAP.bridges.some((b) => Math.abs(b - y) <= 1);
        this.tiles[x + y * W] = bridge ? 'bridge' : 'water';
      }
    }
    // 地點附近同橋頭保證行得到
    for (const p of PLACES) this.clear(p.x, p.y, 3);
    for (const b of MAP.bridges) {
      const cx = Math.round(MAP.riderX + Math.sin(b * 0.11) * 7 + Math.sin(b * 0.031) * 5);
      this.clear(cx - 4, b, 2);
      this.clear(cx + 4, b, 2);
    }
    this.connect();
  }

  private clear(cx: number, cy: number, r: number) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (!this.inside(x, y)) continue;
        const t = this.at(x, y);
        if (t === 'mountain' || t === 'forest' || t === 'hill') this.tiles[x + y * W] = this.biomeAt(cx, cy);
      }
    }
  }

  /** 開山路，確保所有地點連通 */
  private connect() {
    const hub = PLACES[0];
    for (const p of PLACES) {
      if (this.path(hub.x, hub.y, p.x, p.y)) continue;
      let x = p.x;
      let y = p.y;
      const riverCross = MAP.bridges.reduce((best, b) => (Math.abs(b - y) < Math.abs(best - y) ? b : best), MAP.bridges[0]);
      const targetX = Math.round(MAP.riderX + Math.sin(riverCross * 0.11) * 7 + Math.sin(riverCross * 0.031) * 5) + (p.x > MAP.riderX ? 4 : -4);
      while (x !== targetX || y !== riverCross) {
        if (y !== riverCross) y += Math.sign(riverCross - y);
        else x += Math.sign(targetX - x);
        if (this.at(x, y) === 'mountain') this.tiles[x + y * W] = 'hill';
      }
    }
  }

  /** 地點附近清地時用嘅地面，森林入面就留返草地 */
  private biomeAt(x: number, y: number): Tile {
    const b = BIOMES.find((d) => d.tile !== 'forest' && Math.hypot(x - d.x, y - d.y) < d.r * 0.72);
    return b?.tile ?? 'plain';
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < W && y < H;
  }

  at(x: number, y: number): Tile {
    return this.tiles[x + y * W];
  }

  passable(x: number, y: number): boolean {
    if (!this.inside(x, y)) return false;
    const t = this.at(x, y);
    return t !== 'mountain' && t !== 'water';
  }

  cost(x: number, y: number): number {
    const t = this.at(x, y);
    return t === 'water' || t === 'mountain' ? 1 : TERRAIN_COST[t];
  }

  /** A* 尋路，回傳格路徑（唔包起點），行唔到回傳 null */
  path(sx: number, sy: number, tx: number, ty: number): { x: number; y: number }[] | null {
    sx = Math.round(sx);
    sy = Math.round(sy);
    tx = Math.round(tx);
    ty = Math.round(ty);
    if (!this.passable(tx, ty) || !this.inside(sx, sy)) return null;
    const key = (x: number, y: number) => x + y * W;
    const g = new Map<number, number>([[key(sx, sy), 0]]);
    const from = new Map<number, number>();
    const open = new MinHeap();
    open.push(key(sx, sy), 0);
    const goal = key(tx, ty);
    while (open.size) {
      const k = open.pop();
      if (k === goal) {
        const out: { x: number; y: number }[] = [];
        for (let c = goal; c !== key(sx, sy); c = from.get(c)!) out.push({ x: c % W, y: Math.floor(c / W) });
        return out.reverse();
      }
      const cx = k % W;
      const cy = Math.floor(k / W);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || !this.passable(cx + dx, cy + dy)) continue;
          if (dx && dy && (!this.passable(cx + dx, cy) || !this.passable(cx, cy + dy))) continue;
          const nk = key(cx + dx, cy + dy);
          const ng = g.get(k)! + this.cost(cx + dx, cy + dy) * (dx && dy ? 1.41 : 1);
          if (ng < (g.get(nk) ?? Infinity)) {
            g.set(nk, ng);
            from.set(nk, k);
            open.push(nk, ng + Math.hypot(cx + dx - tx, cy + dy - ty));
          }
        }
      }
    }
    return null;
  }

  /** 預先畫好地形圖 */
  render(px: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = W * px;
    c.height = H * px;
    const g = c.getContext('2d')!;
    const rng = makeRng(MAP.seed + 5);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const t = this.at(x, y);
        g.fillStyle = TILE_COLOR[t];
        g.fillRect(x * px, y * px, px + 1, px + 1);
        if (t === 'forest' && rng() < 0.75) {
          g.fillStyle = '#2f5a35';
          g.beginPath();
          g.moveTo(x * px + px / 2, y * px + 1);
          g.lineTo(x * px + px - 2, y * px + px - 1);
          g.lineTo(x * px + 2, y * px + px - 1);
          g.fill();
        } else if (t === 'mountain') {
          g.fillStyle = '#524f50';
          g.beginPath();
          g.moveTo(x * px + px / 2, y * px);
          g.lineTo(x * px + px, y * px + px);
          g.lineTo(x * px, y * px + px);
          g.fill();
        }
      }
    }
    return c;
  }
}
