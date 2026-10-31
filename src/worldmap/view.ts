import { MAP, MAP_VIEW, PARTY, PLACES, TIME, type PlaceDef } from '../data/world';
import type { Quest } from '../quests/quests';
import { NPC, NPC_RULES } from '../data/economy';
import { figureOf } from '../data/figures';
import { jobTitle } from '../data/jobs';
import { MOVE_NAME } from '../data/horses';
import { factionOf } from '../data/factions';
import { currentScenario } from '../data/scenarios';
import { PLAYER } from '../politics/politics';
import { partyFood, partyWage } from '../core/roster';
import { calamityIcon, placeIcon, partyIcon, ruinIcon } from './icons';
import { STRIKES } from '../data/colossus';
import { Sky, type Projected } from './sky';
import { dayOf, hourOf, isNight, isOpen, type Blast, type World, type WorldEvent } from './world';

const PX = MAP.tilePx;
const PAN_SPEED = 620;
const TILE_FOG = 'rgba(10, 14, 24, 0.82)';
const CLICK_PX = 24;
const MAX_DPR = 2;
const FONT = '"Noto Sans HK", sans-serif';
const OUTLINE = 'rgba(8,10,16,.92)';
const NPC_CLICK_PX = 18;
/** 太遠就唔寫字 */
const LABEL_MIN_SCALE = 0.34;
const DEFAULT_SKY = ['bird'];
/** 行咗幾多格就重新計預覽路線 */
const PREVIEW_REPLAN = 3;
/** 滅世攻擊：光柱落地要幾耐，整段畫面幾長，城崩塌幾耐 */
const IMPACT = 1;
const BLAST_LIFE = 5;
const COLLAPSE = 1.8;
const CALAMITY_PX = { dragon: 70, witch: 60, wyrm: 104, titan: 170 } as Record<string, number>;

const dotRadius = (men: number) => Math.min(PARTY.dotMax, PARTY.dotBase + Math.sqrt(men) * PARTY.dotPerRootMan);

/** 大地圖畫面：斜角透視地面、天空、點擊同平移 */
export class WorldView {
  private g: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  /** 左右鏡像，鋪地圖外嘅遠方陸地 */
  private flipped: HTMLCanvasElement;
  /** 鏡頭焦點（地圖像素） */
  private W = 0;
  private H = 0;
  private dpr = 1;
  private focusX = 0;
  private focusY = 0;
  private sky = new Sky();
  /** 滾輪縮放：目標同而家數值，順滑過渡 */
  private zoomGoal = 1;
  private zoomNow = 1;
  private questBar: HTMLElement;
  private questKey = '';
  /** 任務欄撳出嚟嘅路線預覽 */
  private preview: { id: number; x: number; y: number; name: string; path: { x: number; y: number }[]; fromX: number; fromY: number } | null = null;
  private picker: HTMLElement | null = null;
  private pickerClose: (() => void) | null = null;
  private follow = true;
  /** 瞄緊滅世魔法 */
  private aiming = false;
  private keys = new Set<string>();
  private last = 0;
  private active = false;
  private bar: HTMLElement;
  private raf = 0;
  onEvent: ((e: WorldEvent) => void) | null = null;
  onMenu: (() => void) | null = null;
  onParty: (() => void) | null = null;
  onJob: (() => void) | null = null;

  constructor(private canvas: HTMLCanvasElement, private world: World) {
    this.g = canvas.getContext('2d')!;
    this.base = document.createElement('canvas');
    this.flipped = document.createElement('canvas');
    this.renderBase();
    this.bar = document.getElementById('mapbar')!;
    this.questBar = document.getElementById('questbar')!;
    this.questBar.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-q]');
      if (el) this.clickQuest(Number(el.dataset.q));
    });
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    canvas.addEventListener('mousedown', (e) => this.click(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.resize();
  }

  private renderBase() {
    this.base = this.world.terrain.render(PX);
    this.drawCoast();
    this.flipped = document.createElement('canvas');
    this.flipped.width = this.base.width;
    this.flipped.height = this.base.height;
    const flip = this.flipped.getContext('2d')!;
    flip.scale(-1, 1);
    flip.drawImage(this.base, -this.base.width, 0);
  }

  /** 地圖四邊畫成彎曲海岸，唔係死直線 */
  private drawCoast() {
    const g = this.base.getContext('2d')!;
    const { width: bw, height: bh } = this.base;
    const edge = (u: number) => 8 + 16 * Math.abs(Math.sin(u * 0.013)) + 10 * Math.abs(Math.sin(u * 0.047 + 1));
    g.fillStyle = MAP_VIEW.sea;
    const fill = (points: [number, number][]) => {
      g.beginPath();
      points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.fill();
    };
    const xs = Array.from({ length: Math.ceil(bw / 8) + 1 }, (_, i) => i * 8);
    const ys = Array.from({ length: Math.ceil(bh / 8) + 1 }, (_, i) => i * 8);
    fill([[0, 0], ...xs.map((x): [number, number] => [x, edge(x)]), [bw, 0]]);
    fill([[0, bh], ...xs.map((x): [number, number] => [x, bh - edge(x + 400)]), [bw, bh]]);
    fill([[0, 0], ...ys.map((y): [number, number] => [edge(y + 800), y]), [0, bh]]);
    fill([[bw, 0], ...ys.map((y): [number, number] => [bw - edge(y + 1200), y]), [bw, bh]]);
  }

  setWorld(world: World) {
    const redraw = world.terrain !== this.world.terrain;
    this.world = world;
    if (redraw) this.renderBase();
    this.follow = true;
  }

  private resize() {
    // 跟螢幕解像度畫，字先唔會朦
    this.dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = Math.round(this.W * this.dpr);
    this.canvas.height = Math.round(this.H * this.dpr);
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    const { zoomMin, zoomMax, zoomStep } = MAP_VIEW;
    const step = e.deltaY < 0 ? zoomStep : 1 / zoomStep;
    this.zoomGoal = Math.max(zoomMin, Math.min(zoomMax, this.zoomGoal * step));
  }

  private get zoom() {
    return MAP_VIEW.zoom * this.zoomNow;
  }

  private onKey(e: KeyboardEvent) {
    if (!this.active) return;
    if (this.picker) {
      if (e.code === 'Escape') this.closePicker();
      return;
    }
    this.keys.add(e.code);
    if (e.repeat) return;
    if (e.code === 'Space') {
      e.preventDefault();
      this.world.paused = !this.world.paused;
    } else if (e.code === 'Tab') {
      e.preventDefault();
      this.onParty?.();
    } else if (e.code === 'KeyJ') {
      this.onJob?.();
    } else if (e.code === 'KeyX' && this.world.canDoom && !this.world.doomWait) {
      this.aiming = !this.aiming;
    } else if (e.code === 'Escape') {
      this.onMenu?.();
    }
  }

  /** 鏡頭參數：地平線、焦點行、鏡頭距離 */
  private lens() {
    const h = this.H;
    const horizon = h * MAP_VIEW.horizon;
    return { horizon, reach: h * MAP_VIEW.focus - horizon, depth: h * MAP_VIEW.depth, cx: this.W / 2 };
  }

  /** 地圖像素投影到畫面，s 係呢點嘅縮放；喺鏡頭後面就回傳 null */
  private project = (bx: number, by: number): Projected | null => {
    const { horizon, reach, depth, cx } = this.lens();
    const d = depth + this.focusY - by;
    if (d <= 1) return null;
    const s = depth / d;
    return { x: cx + (bx - this.focusX) * s * this.zoom, y: horizon + reach * s, s: s * this.zoom };
  };

  private toWorld(e: MouseEvent): { x: number; y: number } | null {
    const { horizon, reach, depth, cx } = this.lens();
    if (e.clientY <= horizon + 2) return null;
    const s = (e.clientY - horizon) / reach;
    const by = this.focusY - depth * (1 / s - 1);
    const bx = this.focusX + (e.clientX - cx) / (s * this.zoom);
    return {
      x: Math.max(0, Math.min(this.base.width, bx)) / PX,
      y: Math.max(0, Math.min(this.base.height, by)) / PX,
    };
  }

  /** 畫面上夠近嘅目標 */
  private near<T extends { x: number; y: number }>(list: T[], e: MouseEvent, px: number): T[] {
    return list.filter((t) => {
      const p = this.project(t.x * PX, t.y * PX);
      return p && Math.hypot(p.x - e.clientX, p.y - e.clientY) < px;
    });
  }

  private visiblePlaces(): PlaceDef[] {
    const w = this.world.save;
    return PLACES.filter((p) => !p.gone && (!p.hidden || w.discovered.includes(p.id)));
  }

  private click(e: MouseEvent) {
    if (!this.active || e.button !== 0) return;
    if (this.picker) {
      this.closePicker();
      return;
    }
    if (this.aiming) {
      const target = this.near(this.visiblePlaces().filter((p) => p.kind === 'town' || p.kind === 'village' || p.kind === 'castle'), e, CLICK_PX * 1.5)[0];
      if (target) this.world.castDoom(target);
      this.aiming = false;
      return;
    }
    const m = this.toWorld(e);
    if (!m) return;
    this.follow = true;
    const w = this.world.save;
    const seen = <T extends { x: number; y: number }>(list: T[]) => list.filter((n) => Math.hypot(n.x - w.x, n.y - w.y) < this.world.vision);
    const options: { label: string; run: () => void }[] = [
      ...this.near(this.visiblePlaces(), e, CLICK_PX).map((p) => ({
        label: `${Math.hypot(p.x - w.x, p.y - w.y) < 1.5 ? '入去' : '前往'} ${p.name}`,
        run: () => this.visit(p),
      })),
      ...this.near(seen(w.npcs), e, NPC_CLICK_PX).map((n) => ({
        label: n.figure ? `見 ${figureOf(n.figure)!.name}` : `截住 ${NPC[n.kind].name} ${n.size} 人`,
        run: () => this.world.chase(n),
      })),
      ...this.near(seen(w.bandits), e, NPC_CLICK_PX).map((b) => ({
        label: `追擊山賊 ${b.size} 人`,
        run: () => this.world.goTo(b.x, b.y, null),
      })),
    ];
    if (options.length > 1) {
      this.openPicker(e, [...options, { label: '行去呢度', run: () => this.world.goTo(m.x, m.y, null) }]);
      return;
    }
    if (options.length) options[0].run();
    else this.world.goTo(m.x, m.y, null);
  }

  /** 任務去邊：有目的地就去目的地，清賊任務就去最近一夥賊 */
  private questGoal(q: Quest): { x: number; y: number; name: string } | null {
    const w = this.world.save;
    const place = PLACES.find((p) => p.id === q.target);
    if (place) return { x: place.x, y: place.y, name: place.name };
    const near = [...w.bandits].sort((a, b) => Math.hypot(a.x - w.x, a.y - w.y) - Math.hypot(b.x - w.x, b.y - w.y))[0];
    return near ? { x: near.x, y: near.y, name: '最近嘅山賊' } : null;
  }

  private planRoute(q: Quest) {
    const w = this.world.save;
    const goal = this.questGoal(q);
    const path = goal && this.world.terrain.path(w.x, w.y, goal.x, goal.y, this.world.moveMode());
    this.preview = goal && path ? { id: q.id, ...goal, path, fromX: w.x, fromY: w.y } : null;
  }

  /** 撳一下睇路線，再撳就出發 */
  private clickQuest(id: number) {
    const q = this.world.save.quests.find((x) => x.id === id);
    if (!q) return;
    if (this.preview?.id === id) {
      this.world.goTo(this.preview.x, this.preview.y, PLACES.find((p) => p.id === q.target) ?? null);
      this.follow = true;
      this.preview = null;
    } else this.planRoute(q);
    this.questKey = '';
  }

  private drawQuests() {
    const w = this.world.save;
    if (this.preview) {
      const q = w.quests.find((x) => x.id === this.preview!.id);
      if (!q) this.preview = null;
      else if (Math.hypot(w.x - this.preview.fromX, w.y - this.preview.fromY) > PREVIEW_REPLAN) this.planRoute(q);
    }
    const days = this.preview ? Math.ceil(this.preview.path.length / this.world.partySpeed() / TIME.secondsPerDay) : 0;
    const key = `${w.quests.map((q) => `${q.id}:${q.progress}`).join()}|${this.preview?.id}|${days}`;
    if (key === this.questKey) return;
    this.questKey = key;
    this.questBar.hidden = !w.quests.length;
    const line = (q: Quest) => {
      const on = this.preview?.id === q.id;
      const note = on ? `去${this.preview!.name}，約 ${days} 日。再撳出發` : `${q.story !== undefined ? '主線' : `第 ${q.deadline} 日前`}${q.need > 1 ? `　${q.progress}／${q.need}` : ''}`;
      return `<button class="quest ${on ? 'on' : ''}" data-q="${q.id}"><b>${q.title}</b><small>${note}</small></button>`;
    };
    this.questBar.innerHTML = `<div class="pick-title">任務（撳睇路線）</div>${w.quests.map(line).join('')}`;
  }

  private visit(p: PlaceDef) {
    const w = this.world.save;
    if (Math.hypot(p.x - w.x, p.y - w.y) < 1.5) this.onEvent?.({ type: 'place', place: p });
    else this.world.goTo(p.x, p.y, p);
  }

  /** 附近目標太多：彈窗揀，時間暫停 */
  private openPicker(e: MouseEvent, options: { label: string; run: () => void }[]) {
    const wasPaused = this.world.paused;
    this.world.paused = true;
    const box = document.createElement('div');
    box.className = 'map-pick';
    for (const o of options) {
      const b = document.createElement('button');
      b.className = 'mini';
      b.textContent = o.label;
      b.onclick = () => {
        this.closePicker();
        this.world.paused = wasPaused;
        o.run();
      };
      box.append(b);
    }
    this.pickerClose = () => {
      this.world.paused = wasPaused;
    };
    document.body.append(box);
    this.picker = box;
    const { width, height } = box.getBoundingClientRect();
    box.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, e.clientX + 10))}px`;
    box.style.top = `${Math.max(8, Math.min(window.innerHeight - height - 8, e.clientY + 10))}px`;
  }

  private closePicker() {
    this.picker?.remove();
    this.picker = null;
    this.pickerClose?.();
    this.pickerClose = null;
  }

  start() {
    this.active = true;
    this.canvas.hidden = false;
    this.bar.hidden = false;
    this.questKey = '';
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  stop() {
    this.closePicker();
    this.active = false;
    this.canvas.hidden = true;
    this.bar.hidden = true;
    this.questBar.hidden = true;
    this.keys.clear();
    cancelAnimationFrame(this.raf);
  }

  private frame(now: number) {
    if (!this.active) return;
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    const ev = this.world.update(dt);
    this.pan(dt);
    this.draw();
    this.drawBar();
    this.drawQuests();
    if (ev) {
      this.onEvent?.(ev);
      if (!this.active) return;
    }
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  private pan(dt: number) {
    const dx = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const dy = (this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('KeyW') ? 1 : 0);
    if (dx || dy) {
      this.follow = false;
      this.focusX += dx * PAN_SPEED * dt;
      this.focusY += dy * PAN_SPEED * dt;
    }
    if (this.follow) {
      this.focusX = this.world.save.x * PX;
      this.focusY = this.world.save.y * PX;
    }
    this.focusX = Math.max(0, Math.min(this.focusX, this.base.width));
    this.focusY = Math.max(0, Math.min(this.focusY, this.base.height));
    this.zoomNow += (this.zoomGoal - this.zoomNow) * (1 - Math.exp(-12 * dt));
    const { blasts } = this.world;
    for (const b of blasts) b.t += dt;
    this.world.blasts = blasts.filter((b) => b.t < BLAST_LIFE);
    this.sky.update(dt, currentScenario().sky ?? DEFAULT_SKY, this.focusX, this.focusY);
  }

  /** 逐行畫透視地面 */
  private drawGround() {
    const g = this.g;
    const width = this.W;
    const height = this.H;
    const { horizon, reach, depth, cx } = this.lens();
    const { rowStep } = MAP_VIEW;
    const { zoom } = this;
    const bw = this.base.width;
    const bh = this.base.height;
    const rowY = (y: number) => this.focusY - depth * (reach / (y - horizon) - 1);
    const odd = (n: number) => ((n % 2) + 2) % 2 === 1;
    for (let y = Math.ceil(horizon) + 1; y < height; y += rowStep) {
      const top = rowY(y);
      const rows = Math.max(1, rowY(y + rowStep) - top);
      // 地圖外面用鏡像鋪返遠方陸地，隔住海岸似海峽對岸
      const j = Math.floor(top / bh);
      const inTile = top - j * bh;
      const sT = Math.max(0, Math.min(bh - 1, odd(j) ? bh - inTile - rows : inTile));
      const sH = Math.min(rows, bh - sT);
      const s = ((y - horizon) / reach) * zoom;
      const left = this.focusX - cx / s;
      const right = left + width / s;
      for (let i = Math.floor(left / bw); i * bw < right; i++) {
        const tile = i * bw;
        const a = Math.max(left, tile);
        const b = Math.min(right, tile + bw);
        g.drawImage(odd(i) ? this.flipped : this.base, a - tile, sT, b - a, sH, (a - left) * s, y, (b - a) * s, rowStep + 1);
      }
    }
  }

  private draw() {
    const g = this.g;
    // 落地一刻成個畫面震
    const shake = this.world.blasts.reduce((s, b) => Math.max(s, b.t > IMPACT ? Math.max(0, 1 - (b.t - IMPACT) / 1.4) : 0), 0) * 9;
    g.setTransform(this.dpr, 0, 0, this.dpr, (Math.random() - 0.5) * shake * this.dpr, (Math.random() - 0.5) * shake * this.dpr);
    const w = this.world.save;
    const width = this.W;
    const height = this.H;
    const { horizon } = this.lens();
    const hour = hourOf(w);
    g.fillStyle = MAP_VIEW.sea;
    g.fillRect(0, 0, width, height);
    this.sky.drawBack(g, width, horizon, hour, this.focusX);
    this.drawGround();
    this.sky.drawHaze(g, width, horizon, height, hour);

    const at = (x: number, y: number) => this.project(x * PX, y * PX);
    this.drawScars(at);
    const me = at(w.x, w.y);

    // 行軍路線
    if (this.world.path.length && me) {
      g.strokeStyle = 'rgba(255,244,220,.75)';
      g.setLineDash([6, 6]);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(me.x, me.y);
      for (const p of this.world.path) {
        const q = at(p.x, p.y);
        if (q) g.lineTo(q.x, q.y);
      }
      g.stroke();
      g.setLineDash([]);
    }

    // 任務路線預覽
    if (this.preview && me) {
      g.strokeStyle = '#f2c14e';
      g.lineWidth = 5;
        g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(me.x, me.y);
      for (const p of this.preview.path) {
        const q = at(p.x, p.y);
        if (q) g.lineTo(q.x, q.y);
      }
      g.stroke();
      const end = at(this.preview.x, this.preview.y);
      if (end) {
        g.beginPath();
        g.ellipse(end.x, end.y, 20 * end.s + 6, (20 * end.s + 6) * 0.5, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // 由遠畫到近
    const places = this.visiblePlaces()
      .map((p) => ({ p, q: at(p.x, p.y) }))
      .filter((o): o is { p: PlaceDef; q: Projected } => !!o.q && o.q.y > horizon && o.q.y < height + 40)
      .sort((a, b) => a.q.s - b.q.s);
    for (const { p, q } of places) this.drawPlace(p, q);
    for (const b of this.world.blasts) this.drawBlast(b, at);

    // 夜晚同視野：地面上嘅橢圓
    if (me) {
      const vision = this.world.vision * PX * me.s;
      g.save();
      g.beginPath();
      g.rect(0, horizon, width, height - horizon);
      g.clip();
      g.translate(me.x, me.y);
      g.scale(1, 0.62);
      const grad = g.createRadialGradient(0, 0, vision * 0.6, 0, 0, vision * 1.5);
      grad.addColorStop(0, 'rgba(10,14,24,0)');
      grad.addColorStop(1, isNight(w) ? TILE_FOG : 'rgba(10,14,24,.14)');
      g.fillStyle = grad;
      g.fillRect(-width * 2, -height * 3, width * 4, height * 6);
      g.restore();
    }

    for (const b of w.bandits) {
      if (Math.hypot(b.x - w.x, b.y - w.y) > this.world.vision) continue;
      const q = at(b.x, b.y);
      if (!q) continue;
      const radius = dotRadius(b.size) * Math.max(0.5, q.s);
      this.drawParty(q, radius, '#d6352a');
      g.font = `700 14px ${FONT}`;
      if (q.s > LABEL_MIN_SCALE) {
        const text = `山賊 ${b.size} 人`;
        g.lineWidth = 5;
        g.strokeStyle = OUTLINE;
        g.strokeText(text, q.x, q.y - radius * 3.7);
        g.fillStyle = '#ffd0c8';
        g.fillText(text, q.x, q.y - radius * 3.7);
      }
    }

    g.font = `700 14px ${FONT}`;
    for (const n of w.npcs) {
      const dist = Math.hypot(n.x - w.x, n.y - w.y);
      const huge = CALAMITY_PX[n.kind];
      // 災厄大到全大陸都見到，唔受視野限制
      if (dist > this.world.vision && !huge) continue;
      const q = at(n.x, n.y);
      if (!q) continue;
      const def = NPC[n.kind];
      if (huge) {
        this.drawCalamity(n.kind, q, huge, `${def.name}：${n.job}`);
        continue;
      }
      const radius = dotRadius(n.size) * Math.max(0.5, q.s);
      this.drawParty(q, radius, def.color, n.kind === 'caravan');
      if (dist < NPC_RULES.labelDist && q.s > LABEL_MIN_SCALE) {
        const text = n.figure ? `${figureOf(n.figure)!.name}：${n.job}` : `${def.name} ${n.size} 人：${n.job}`;
        g.lineWidth = 5;
        g.lineJoin = 'round';
        g.strokeStyle = OUTLINE;
        g.strokeText(text, q.x, q.y - radius * 3.7);
        g.fillStyle = '#fff4dc';
        g.fillText(text, q.x, q.y - radius * 3.7);
      }
    }

    this.sky.drawFlyers(g, this.project, horizon);

    // 自己部隊：人愈多粒點愈大
    if (!me) return;
    const men = this.world.roster.soldiers.length + 1;
    const radius = dotRadius(men) * 1.25;
    g.strokeStyle = 'rgba(242,193,78,.85)';
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(me.x, me.y, radius * 1.3, radius * 0.6, 0, 0, Math.PI * 2);
    g.stroke();
    this.drawParty(me, radius, '#f2c14e');
    const label = `你 ${men} 人`;
    g.font = `900 16px ${FONT}`;
    g.lineWidth = 5;
        g.lineJoin = 'round';
    g.strokeStyle = OUTLINE;
    g.strokeText(label, me.x, me.y - radius * 3.7);
    g.fillStyle = '#ffe9a8';
    g.fillText(label, me.x, me.y - radius * 3.7);
  }

  /** 焦土：貼住地面，近大遠細 */
  private drawScars(at: (x: number, y: number) => Projected | null) {
    const g = this.g;
    const w = this.world.save;
    const day = dayOf(w);
    w.scars = w.scars.filter((s) => s.until > day);
    for (const s of w.scars) {
      const q = at(s.x, s.y);
      if (!q) continue;
      const rx = s.r * PX * q.s;
      g.save();
      g.translate(q.x, q.y);
      g.scale(1, MAP_VIEW.depth * 0.7);
      const grad = g.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
      const c = STRIKES[s.kind].scar;
      grad.addColorStop(0, `${c}f0`);
      grad.addColorStop(0.7, `${c}a8`);
      grad.addColorStop(1, `${c}00`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, rx, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }

  /** 廢墟冒煙 */
  private drawSmoke(x: number, y: number, r: number) {
    const g = this.g;
    const t = performance.now() / 1000;
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.35 + i * 0.25) % 1;
      g.fillStyle = `rgba(40,36,36,${0.4 * (1 - k)})`;
      g.beginPath();
      g.arc(x + Math.sin(t + i) * r * 0.2 + k * r * 0.5, y - r * 0.5 - k * r * 1.7, r * (0.18 + k * 0.32), 0, Math.PI * 2);
      g.fill();
    }
  }

  /** 滅世攻擊：光柱由天而降，落地後衝擊波擴散到真實波及範圍 */
  private drawBlast(b: Blast, at: (x: number, y: number) => Projected | null) {
    const q = at(b.x, b.y);
    if (!q) return;
    const g = this.g;
    const color = STRIKES[b.kind].color;
    const rx = b.r * PX * q.s;
    const flat = MAP_VIEW.depth * 0.7;
    if (b.t < IMPACT + 0.5) {
      const k = Math.min(1, b.t / IMPACT);
      const width = (10 + rx * 0.16) * (b.t > IMPACT ? 1 - (b.t - IMPACT) / 0.5 : k);
      const grad = g.createLinearGradient(0, 0, 0, q.y);
      grad.addColorStop(0, `${color}00`);
      grad.addColorStop(1, color);
      g.fillStyle = grad;
      g.fillRect(q.x - width / 2, 0, width, q.y * k);
      g.fillStyle = 'rgba(255,255,255,.8)';
      g.fillRect(q.x - width / 6, 0, width / 3, q.y * k);
    }
    // 預告圈：落地前已經見到會波及邊度
    g.save();
    g.translate(q.x, q.y);
    g.scale(1, flat);
    const wave = b.t < IMPACT ? 1 : Math.min(1, (b.t - IMPACT) / 1.1);
    const fade = b.t < IMPACT ? 0.8 : Math.max(0, 1 - (b.t - IMPACT) / (BLAST_LIFE - IMPACT));
    g.globalAlpha = fade;
    g.strokeStyle = color;
    g.lineWidth = b.t < IMPACT ? 2 : 7;
    g.setLineDash(b.t < IMPACT ? [10, 8] : []);
    g.beginPath();
    g.arc(0, 0, rx * (b.t < IMPACT ? 1 : wave), 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    if (b.t >= IMPACT) {
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, rx * wave);
      grad.addColorStop(0, `${color}c0`);
      grad.addColorStop(1, `${color}00`);
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, rx * wave, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  /** 災厄本體：比城鎮仲大，一眼見到 */
  private drawCalamity(kind: string, q: Projected, px: number, label: string) {
    const g = this.g;
    const size = px * Math.max(0.5, Math.min(1.6, q.s * 1.4));
    const air = kind === 'titan' ? 0 : size * 0.3 + Math.sin(performance.now() / 300) * 3;
    g.fillStyle = 'rgba(8,10,16,.45)';
    g.beginPath();
    g.ellipse(q.x, q.y, size * 0.4, size * 0.13, 0, 0, Math.PI * 2);
    g.fill();
    g.drawImage(calamityIcon(kind), q.x - size / 2, q.y - size * 0.95 - air, size, size);
    if (q.s < LABEL_MIN_SCALE) return;
    g.lineWidth = 5;
    g.lineJoin = 'round';
    g.strokeStyle = OUTLINE;
    g.strokeText(label, q.x, q.y - size - air - 6);
    g.fillStyle = '#ffb0a0';
    g.fillText(label, q.x, q.y - size - air - 6);
  }

  /** 部隊圖示：腳踏喺地面位置，有影 */
  private drawParty(q: { x: number; y: number }, radius: number, color: string, wagon = false) {
    const g = this.g;
    const size = radius * 4.6;
    g.fillStyle = 'rgba(8,10,16,.35)';
    g.beginPath();
    g.ellipse(q.x, q.y, radius * 0.95, radius * 0.34, 0, 0, Math.PI * 2);
    g.fill();
    g.drawImage(partyIcon(color, wagon), q.x - size / 2, q.y - size * 0.9, size, size);
  }

  /** 地點：地上有影，標記企起身 */
  private drawPlace(p: PlaceDef, q: Projected) {
    const g = this.g;
    const open = isOpen(this.world.save, p);
    const pol = this.world.politics;
    const owner = pol.ownerOf(p.id);
    const color = owner === PLAYER ? '#f2c14e' : factionOf(owner ?? '')?.color;
    const size = Math.max(0.7, Math.min(1.5, q.s * 1.3));
    const r = (p.kind === 'town' ? 34 : 26) * size;
    const y = q.y;
    g.fillStyle = 'rgba(8,10,16,.35)';
    g.beginPath();
    g.ellipse(q.x, q.y, r * 0.9, r * 0.28, 0, 0, Math.PI * 2);
    g.fill();
    if (pol.s.threats.some((t) => t.place === p.id)) {
      g.strokeStyle = '#ff3a2a';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(q.x, q.y, r * 1.2, r * 0.46, 0, 0, Math.PI * 2);
      g.stroke();
    }
    const tone = color ?? (open ? '#7a2a2a' : '#555555');
    const icon = placeIcon(p.monster ? 'monster' : p.kind, tone);
    const d = r * 2;
    const save = this.world.save;
    const ruined = (save.ruins[p.id] ?? 0) > dayOf(save);
    const blast = this.world.blasts.find((b) => b.places.includes(p.id));
    const fall = blast ? (blast.t - IMPACT) / COLLAPSE : 1;
    g.globalAlpha = open ? 1 : 0.72;
    if (blast && fall < 0) {
      g.drawImage(icon, q.x - d / 2, y - d * 0.88, d, d);
    } else {
      if (ruined) {
        g.drawImage(ruinIcon(tone), q.x - d / 2, y - d * 0.88, d, d);
        this.drawSmoke(q.x, y, r);
      } else g.drawImage(icon, q.x - d / 2, y - d * 0.88, d, d);
      if (blast && fall < 1) {
        // 城塔一路震一路沉落地
        g.save();
        g.beginPath();
        g.rect(q.x - d, y - d * 1.2, d * 2, d * 1.2);
        g.clip();
        g.drawImage(icon, q.x - d / 2 + (Math.random() - 0.5) * 5, y - d * 0.88 + d * fall * fall, d, d);
        g.restore();
      }
    }
    g.globalAlpha = 1;
    if (q.s < LABEL_MIN_SCALE) return;
    g.font = `700 15px ${FONT}`;
    g.lineWidth = 5;
    g.lineJoin = 'round';
    g.strokeStyle = OUTLINE;
    g.fillStyle = tone;
    g.strokeText(p.name, q.x, y + 12);
    g.fillText(p.name, q.x, y + 12);
  }

  private drawBar() {
    const w = this.world.save;
    const r = this.world.roster;
    const hurt = r.soldiers.filter((s) => s.hurtDays > 0).length;
    const hh = String(Math.floor(hourOf(w))).padStart(2, '0');
    const items = [
      `第 ${dayOf(w)} 日 ${hh}:00 ${isNight(w) ? '夜' : '日'}`,
      `金 ${r.infiniteGold ? '∞' : r.gold}`,
      `糧 ${Math.floor(w.food)}（−${partyFood(r).toFixed(1)}／日）`,
      `餉 ${partyWage(r)}／週`,
      `${jobTitle(r.hero.job, r.hero.jobLevel)} ${r.hero.jobLevel} 級`,
      `部隊 ${r.soldiers.length + 1} 人${hurt ? `（傷 ${hurt}）` : ''}`,
      `${MOVE_NAME[this.world.moveMode()]} ${this.world.partySpeed().toFixed(1)}`,
      `士氣 ${Math.round(w.morale)}`,
      `聲望 ${w.pol.renown}`,
      `正義 ${w.pol.justice}`,
      `忠誠 ${w.pol.loyalty}`,
      ...(Object.keys(w.pol.wanted).length ? ['通緝中'] : []),
    ];
    const base = this.world.paused ? '已暫停，空白鍵繼續' : '左鍵行軍　滾輪縮放　Tab 部隊　J 工作　空白鍵暫停　M 靜音　Esc 選單';
    const doom = !this.world.canDoom ? '' : this.aiming ? '撳一座城放滅世魔法，撳空地取消' : this.world.doomWait ? `滅世魔法 ${this.world.doomWait} 日後　` : 'X 滅世魔法　';
    const hint = this.aiming ? doom : doom + base;
    this.bar.innerHTML = `<div class="stats-line">${items.map((t) => `<span>${t}</span>`).join('')}</div><div class="hint-line">${hint}</div>`;
  }
}
