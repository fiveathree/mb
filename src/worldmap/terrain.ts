import { BIOMES, DOCKS, DOCK_NAMES, LANDS, MAP, PLACES, SHIP, TERRAIN_COST } from '../data/world';
import { VISTAS, type VistaDef } from '../data/vistas';
import { makeRng } from '../battle/terrain';
import { paintMap } from './paint';

export type MoveMode = 'land' | 'swim' | 'fly';
export type Tile = 'plain' | 'forest' | 'hill' | 'mountain' | 'water' | 'bridge' | 'snow' | 'sand' | 'swamp' | 'ash' | 'sea' | 'lake' | 'stream' | 'farm';

/** 深水：唔搭船過唔到 */
export const isDeep = (t: Tile) => t === 'water' || t === 'sea' || t === 'lake';

/** 渡口船塢：企喺岸邊，w 係旁邊上船嗰格水 */
export interface Dock {
  x: number;
  y: number;
  wx: number;
  wy: number;
  name: string;
  kind: 'river' | 'coast';
}

/** 兩個渡口之間嘅航道 */
export interface Crossing {
  a: number;
  b: number;
  pts: { x: number; y: number }[];
}

/** 一條河嘅河道，畫地圖用 */
export interface RiverLine {
  pts: { x: number; y: number; w: number }[];
  kind: 'jiang' | 'he' | 'chuan';
}

/** 大江河心：幾個波長疊埋，唔會似規則波浪 */
export const jiangX = (y: number) => MAP.riderX + Math.sin(y * 0.045) * 9 + Math.sin(y * 0.017 + 1.2) * 7 + Math.sin(y * 0.11 + 0.5) * 2;

export const TILE_COLOR: Record<Tile, string> = {
  plain: '#8fae5e', forest: '#4f7a45', hill: '#a69a6a', mountain: '#6e6a68', water: '#4f86b8', bridge: '#b08a58',
  snow: '#e4ecf2', sand: '#dcc484', swamp: '#6a7f58', ash: '#6c646a', sea: '#2a5f88', lake: '#3f86b0', stream: '#6aa8c8', farm: '#c8b050',
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
  /** 河流未挖之前嘅地面，畫河岸用 */
  under: Tile[] = [];
  rivers: RiverLine[] = [];
  /** 橋位 */
  spans: { x: number; y: number; a: number }[] = [];
  /** 港口地點 id */
  ports: string[] = [];
  docks: Dock[] = [];
  crossings: Crossing[] = [];
  /** 渡口所在格 → 由呢度出發嘅航道 */
  private dockAt = new Map<number, number[]>();
  /** 秘景位置 */
  vistas: { def: VistaDef; x: number; y: number }[] = [];

  /** variant：劇本編號，唔同劇本山林分佈唔同 */
  constructor(variant = 0) {
    const big = smoothNoise(MAP.seed + variant * 97, 16);
    const mid = smoothNoise(MAP.seed + 1 + variant * 97, 7);
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
    this.layFarms(mid);
    this.laySea(mid);
    this.under = this.tiles.slice();
    this.layLakes(mid);
    this.layRivers(mid);
    // 地點一定企喺陸地
    for (const p of PLACES) this.clear(p.x, p.y, 3);
    this.connect();
    this.layDocks();
    this.findPorts();
    this.findVistas();
  }

  private set(x: number, y: number, t: Tile) {
    if (this.inside(x, y) && this.at(x, y) !== 'mountain') this.tiles[x + y * W] = t;
  }

  private layFarms(mid: (x: number, y: number) => number) {
    for (const f of LANDS.farms) {
      for (let y = f.y - f.r - 3; y <= f.y + f.r + 3; y++) {
        for (let x = f.x - f.r - 3; x <= f.x + f.r + 3; x++) {
          if (!this.inside(x, y) || Math.hypot(x - f.x, y - f.y) > f.r * (0.72 + mid(x, y) * 0.5)) continue;
          const t = this.at(x, y);
          if (t === 'plain' || t === 'forest' || t === 'hill') this.tiles[x + y * W] = 'farm';
        }
      }
    }
  }

  /** 南面海岸：彎彎曲曲，有海灣 */
  private laySea(mid: (x: number, y: number) => number) {
    for (let x = 0; x < W; x++) {
      const coast = H - 6 - mid(x, 3) * 14 - Math.max(0, Math.sin(x * 0.03 + 1) * 7);
      for (let y = Math.floor(coast); y < H; y++) this.tiles[x + y * W] = 'sea';
    }
  }

  private layLakes(mid: (x: number, y: number) => number) {
    for (const l of LANDS.lakes) {
      for (let y = l.y - l.r - 3; y <= l.y + l.r + 3; y++) {
        for (let x = l.x - l.r - 4; x <= l.x + l.r + 4; x++) {
          if (this.inside(x, y) && Math.hypot((x - l.x) * 0.8, y - l.y) < l.r * (0.7 + mid(x, y) * 0.6)) this.set(x, y, 'lake');
        }
      }
    }
  }

  /** 挖一條河：沿住點列加闊 */
  private dig(pts: RiverLine['pts'], tile: Tile) {
    for (const p of pts) {
      const r = Math.ceil(p.w);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.hypot(dx, dy) > p.w) continue;
          const x = Math.round(p.x) + dx;
          const y = Math.round(p.y) + dy;
          if (this.inside(x, y) && !isDeep(this.at(x, y))) this.set(x, y, tile);
        }
      }
    }
  }

  /** 由源頭蜿蜒去匯入點 */
  private wander(sx: number, sy: number, joinY: number, width: (k: number) => number, seed: number): RiverLine['pts'] {
    const rng = makeRng(MAP.seed + seed);
    const tx = jiangX(joinY);
    const pts: RiverLine['pts'] = [];
    let x = sx;
    let y = sy;
    let bend = rng() * 6;
    const total = Math.hypot(tx - sx, joinY - sy);
    for (let i = 0; i < 400; i++) {
      const left = Math.hypot(tx - x, joinY - y);
      if (left < 1.5) break;
      bend += (rng() - 0.5) * 0.9;
      const a = Math.atan2(joinY - y, tx - x) + Math.sin(bend) * 0.8 * Math.min(1, left / 18);
      x += Math.cos(a);
      y += Math.sin(a);
      pts.push({ x, y, w: width(1 - left / total) });
    }
    return pts;
  }

  private layRivers(mid: (x: number, y: number) => number) {
    // 大江：由北到南愈流愈闊，出海成河口
    const jiang: RiverLine['pts'] = [];
    for (let y = 0; y < H; y++) {
      const k = y / H;
      jiang.push({ x: jiangX(y) + (mid(y, 9) - 0.5) * 4, y, w: 1.6 + k * k * 4.4 });
    }
    this.dig(jiang, 'water');
    this.rivers.push({ pts: jiang, kind: 'jiang' });
    LANDS.tribs.forEach((t, i) => {
      const pts = this.wander(t.x, t.y, t.joinY, (k) => 0.7 + k * 0.7, 40 + i);
      this.dig(pts, 'water');
      this.rivers.push({ pts, kind: 'he' });
      // 河有橋，大江冇
      for (const k of [0.32, 0.68]) {
        const n = pts[Math.floor(pts.length * k)];
        const m = pts[Math.floor(pts.length * k) + 1] ?? n;
        if (!n) continue;
        this.spans.push({ x: n.x, y: n.y, a: Math.atan2(m.y - n.y, m.x - n.x) + Math.PI / 2 });
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const c = Math.round(n.x) + dx;
            const r = Math.round(n.y) + dy;
            if (this.inside(c, r) && this.at(c, r) === 'water' && Math.hypot(dx, dy) < 2.6) this.tiles[c + r * W] = 'bridge';
          }
        }
      }
    });
    LANDS.streams.forEach((t, i) => {
      const pts = this.wander(t.x, t.y, t.joinY, () => 0.4, 60 + i);
      this.dig(pts, 'stream');
      this.rivers.push({ pts, kind: 'chuan' });
    });
  }

  /** 邊岸：大江兩邊 */
  bank(x: number, y: number): number {
    return x < jiangX(y) ? 0 : 1;
  }

  private findPorts() {
    const reach = (p: { x: number; y: number }) => {
      let best = Infinity;
      for (let dy = -SHIP.portRange; dy <= SHIP.portRange; dy += 2) {
        for (let dx = -SHIP.portRange; dx <= SHIP.portRange; dx += 2) {
          const x = p.x + dx;
          const y = p.y + dy;
          if (!this.inside(x, y)) continue;
          const t = this.at(x, y);
          if (t === 'sea' || t === 'lake' || (t === 'water' && Math.abs(x - jiangX(y)) < 7)) best = Math.min(best, Math.hypot(dx, dy));
        }
      }
      return best;
    };
    const towns = PLACES.filter((p) => p.kind === 'town' || p.kind === 'village');
    for (const side of [0, 1]) {
      const list = towns.filter((p) => this.bank(p.x, p.y) === side).sort((a, b) => reach(a) - reach(b));
      const near = list.filter((p) => reach(p) < Infinity);
      // 每邊至少兩個港，渡江先有得揀
      this.ports.push(...(near.length >= 2 ? near : list.slice(0, 2)).map((p) => p.id));
    }
    for (const id of SHIP.always) {
      if (!this.ports.includes(id)) this.ports.push(id);
    }
  }

  /** 岸邊陸地：由水向外搵第一格行得嘅地 */
  private shore(x: number, y: number, dx: number, dy: number, max: number): { x: number; y: number; wx: number; wy: number } | null {
    let px = x;
    let py = y;
    for (let i = 0; i < max; i++) {
      const nx = px + dx;
      const ny = py + dy;
      if (!this.inside(nx, ny)) return null;
      if (this.passable(nx, ny)) return isDeep(this.at(px, py)) ? { x: nx, y: ny, wx: px, wy: py } : null;
      px = nx;
      py = ny;
    }
    return null;
  }

  private named = { river: 0, coast: 0 };

  /** 渡口有自己嘅名；一對渡口共用一個 */
  private dockName(kind: Dock['kind']): string {
    const list = DOCK_NAMES[kind];
    return list[this.named[kind]++ % list.length];
  }

  private addDock(d: Omit<Dock, 'name'>, name: string): number {
    this.docks.push({ ...d, name });
    return this.docks.length - 1;
  }

  /** 離城鎮太近嘅位唔起渡口 */
  private clearOfPlaces(...pts: { x: number; y: number }[]): boolean {
    return pts.every((p) => PLACES.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= DOCKS.placeGap));
  }

  private link(a: number, b: number) {
    const A = this.docks[a];
    const B = this.docks[b];
    const water = this.waterPath(A.wx, A.wy, B.wx, B.wy);
    if (!water) return;
    const pts = [{ x: A.wx, y: A.wy }, ...water];
    this.crossings.push({ a, b, pts });
    const i = this.crossings.length - 1;
    for (const d of [A, B]) {
      const k = d.x + d.y * W;
      this.dockAt.set(k, [...(this.dockAt.get(k) ?? []), i]);
    }
  }

  /** 大江兩岸每隔一段一對渡口；沿海一串船塢，海路相連 */
  private layDocks() {
    for (let base = 8; base < H - 4; base += DOCKS.riverEvery) {
      // 撞正城鎮就上下移開少少
      for (const off of [0, 4, -4, 8, -8]) {
        const y = base + off;
        if (y < 2 || y >= H - 2) continue;
        let mx = Math.round(jiangX(y));
        for (let i = 0; i < 6 && !isDeep(this.at(mx, y)); i++) mx += i % 2 ? i : -i;
        if (!isDeep(this.at(mx, y)) || this.at(mx, y) === 'sea') continue;
        const west = this.shore(mx, y, -1, 0, DOCKS.riverScan);
        const east = this.shore(mx, y, 1, 0, DOCKS.riverScan);
        if (!west || !east || !this.clearOfPlaces(west, east)) continue;
        const name = this.dockName('river');
        this.link(this.addDock({ ...west, kind: 'river' }, name), this.addDock({ ...east, kind: 'river' }, name));
        break;
      }
    }
    const coast: number[] = [];
    for (let base = 6; base < W - 6; base += DOCKS.coastEvery) {
      for (const off of [0, 5, -5, 10, -10]) {
        const x = base + off;
        if (x < 2 || x >= W - 2) continue;
        let y = H - 1;
        while (y > 0 && this.at(x, y) === 'sea') y--;
        const land = this.shore(x, y + 1, 0, -1, DOCKS.coastScan);
        if (!land || !this.clearOfPlaces(land)) continue;
        coast.push(this.addDock({ ...land, kind: 'coast' }, this.dockName('coast')));
        break;
      }
    }
    for (let i = 1; i < coast.length; i++) this.link(coast[i - 1], coast[i]);
  }

  /** 只行水嘅航道 */
  private waterPath(sx: number, sy: number, tx: number, ty: number): { x: number; y: number }[] | null {
    const key = (x: number, y: number) => x + y * W;
    const g = new Map<number, number>([[key(sx, sy), 0]]);
    const from = new Map<number, number>();
    const open = new MinHeap();
    open.push(key(sx, sy), 0);
    const goal = key(tx, ty);
    let guard = 0;
    while (open.size && guard++ < 60000) {
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
          const nx = cx + dx;
          const ny = cy + dy;
          if ((!dx && !dy) || !this.inside(nx, ny) || !isDeep(this.at(nx, ny))) continue;
          const nk = key(nx, ny);
          const ng = g.get(k)! + (dx && dy ? 1.41 : 1);
          if (ng < (g.get(nk) ?? Infinity)) {
            g.set(nk, ng);
            from.set(nk, k);
            open.push(nk, ng + Math.hypot(nx - tx, ny - ty));
          }
        }
      }
    }
    return null;
  }

  /** 呢格係咪喺船上 */
  onWater(x: number, y: number): boolean {
    const rx = Math.round(x);
    const ry = Math.round(y);
    return this.inside(rx, ry) && isDeep(this.at(rx, ry));
  }

  /** 秘景：按地形自動揀位，鏡像劇本都企得住 */
  private findVistas() {
    const rng = makeRng(MAP.seed + 303);
    const taken: { x: number; y: number }[] = PLACES.map((p) => ({ x: p.x, y: p.y }));
    for (const def of VISTAS) {
      let spot: { x: number; y: number } | null = null;
      for (let i = 0; i < 6000 && !spot; i++) {
        const x = 4 + Math.floor(rng() * (W - 8));
        const y = 4 + Math.floor(rng() * (H - 8));
        if (!this.passable(x, y) || taken.some((p) => Math.hypot(p.x - x, p.y - y) < 12)) continue;
        const near = [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([a, b]) => this.inside(x + a, y + b) && this.at(x + a, y + b) === def.tile);
        if (near) spot = { x, y };
      }
      if (!spot) continue;
      taken.push(spot);
      this.vistas.push({ def, ...spot });
    }
  }

  private clear(cx: number, cy: number, r: number) {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (!this.inside(x, y)) continue;
        const t = this.at(x, y);
        if (t === 'mountain' || t === 'forest' || t === 'hill' || isDeep(t) || t === 'stream') this.tiles[x + y * W] = this.biomeAt(cx, cy);
      }
    }
  }

  /** 開山路：同一邊岸嘅地點一定連通；過大江就要搭船 */
  private connect() {
    for (const side of [0, 1]) {
      const list = PLACES.filter((p) => this.bank(p.x, p.y) === side);
      const hub = list[0];
      if (!hub) continue;
      for (const p of list) {
        if (this.path(hub.x, hub.y, p.x, p.y)) continue;
        let x = p.x;
        let y = p.y;
        while (x !== hub.x || y !== hub.y) {
          if (Math.abs(hub.x - x) > Math.abs(hub.y - y)) x += Math.sign(hub.x - x);
          else y += Math.sign(hub.y - y);
          const t = this.at(x, y);
          if (t === 'mountain') this.tiles[x + y * W] = 'hill';
          else if (isDeep(t)) this.tiles[x + y * W] = 'bridge';
        }
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
    return t !== 'mountain' && !isDeep(t);
  }

  /** 陸行、游水、飛行分別行得過邊度 */
  canCross(x: number, y: number, move: MoveMode): boolean {
    if (!this.inside(x, y)) return false;
    if (move === 'fly') return true;
    return move === 'swim' ? this.at(x, y) !== 'mountain' : this.passable(x, y);
  }

  cost(x: number, y: number): number {
    const t = this.at(x, y);
    return t === 'mountain' || isDeep(t) ? 1 : TERRAIN_COST[t];
  }

  /** A* 尋路，回傳格路徑（唔包起點），行唔到回傳 null */
  path(sx: number, sy: number, tx: number, ty: number, move: MoveMode = 'land'): { x: number; y: number }[] | null {
    sx = Math.round(sx);
    sy = Math.round(sy);
    tx = Math.round(tx);
    ty = Math.round(ty);
    if (!this.canCross(tx, ty, move) || !this.inside(sx, sy)) return null;
    const key = (x: number, y: number) => x + y * W;
    const g = new Map<number, number>([[key(sx, sy), 0]]);
    const from = new Map<number, number>();
    const open = new MinHeap();
    open.push(key(sx, sy), 0);
    const goal = key(tx, ty);
    /** 經航道到達嘅格：記低係邊條、有冇倒轉行 */
    const sailed = new Map<number, { c: number; rev: boolean }>();
    while (open.size) {
      const k = open.pop();
      if (k === goal) {
        const out: { x: number; y: number }[] = [];
        for (let c = goal; c !== key(sx, sy); c = from.get(c)!) {
          out.push({ x: c % W, y: Math.floor(c / W) });
          const s = sailed.get(c);
          if (s && from.get(c) !== undefined) {
            const pts = this.crossings[s.c].pts;
            // 倒序加入水面航點：上船、航行、落船
            const seq = s.rev ? [...pts] : [...pts].reverse();
            out.push(...seq);
          }
        }
        return out.reverse();
      }
      if (move === 'land') {
        for (const ci of this.dockAt.get(k) ?? []) {
          const c = this.crossings[ci];
          const me = this.docks.findIndex((d) => d.x + d.y * W === k);
          const other = this.docks[c.a === me ? c.b : c.a];
          const nk = key(other.x, other.y);
          const ng = g.get(k)! + DOCKS.boardCost + c.pts.length * DOCKS.waterCost;
          if (ng < (g.get(nk) ?? Infinity)) {
            g.set(nk, ng);
            from.set(nk, k);
            sailed.set(nk, { c: ci, rev: c.a !== me });
            open.push(nk, ng + Math.hypot(other.x - tx, other.y - ty));
          }
        }
      }
      const cx = k % W;
      const cy = Math.floor(k / W);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || !this.canCross(cx + dx, cy + dy, move)) continue;
          if (dx && dy && (!this.canCross(cx + dx, cy, move) || !this.canCross(cx, cy + dy, move))) continue;
          const nk = key(cx + dx, cy + dy);
          if (sailed.has(nk) && g.get(nk)! <= g.get(k)! + 1.41) continue;
          const step = move === 'fly' ? 1 : this.cost(cx + dx, cy + dy);
          const ng = g.get(k)! + step * (dx && dy ? 1.41 : 1);
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
    return paintMap(this, px);
  }
}
