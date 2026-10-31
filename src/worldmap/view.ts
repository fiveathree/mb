import { MAP, MAP_VIEW, PARTY, PLACES, TIME, type PlaceDef, type PlaceKind } from '../data/world';
import type { Quest } from '../quests/quests';
import { NPC, NPC_RULES } from '../data/economy';
import { factionOf } from '../data/factions';
import { currentScenario } from '../data/scenarios';
import { PLAYER } from '../politics/politics';
import { partyFood, partyWage } from '../core/roster';
import { Sky, type Projected } from './sky';
import { dayOf, hourOf, isNight, isOpen, type World, type WorldEvent } from './world';

const PX = MAP.tilePx;
const PAN_SPEED = 620;
const TILE_FOG = 'rgba(10, 14, 24, 0.82)';
const CLICK_PX = 24;
const NPC_CLICK_PX = 18;
/** 太遠就唔寫字 */
const LABEL_MIN_SCALE = 0.34;
const DEFAULT_SKY = ['bird'];
/** 行咗幾多格就重新計預覽路線 */
const PREVIEW_REPLAN = 3;

const dotRadius = (men: number) => Math.min(PARTY.dotMax, PARTY.dotBase + Math.sqrt(men) * PARTY.dotPerRootMan);

/** 大地圖畫面：斜角透視地面、天空、點擊同平移 */
export class WorldView {
  private g: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  /** 左右鏡像，鋪地圖外嘅遠方陸地 */
  private flipped: HTMLCanvasElement;
  /** 鏡頭焦點（地圖像素） */
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
  private keys = new Set<string>();
  private last = 0;
  private active = false;
  private bar: HTMLElement;
  private raf = 0;
  onEvent: ((e: WorldEvent) => void) | null = null;
  onMenu: (() => void) | null = null;
  onParty: (() => void) | null = null;

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
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
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
    } else if (e.code === 'Escape') {
      this.onMenu?.();
    }
  }

  /** 鏡頭參數：地平線、焦點行、鏡頭距離 */
  private lens() {
    const h = this.canvas.height;
    const horizon = h * MAP_VIEW.horizon;
    return { horizon, reach: h * MAP_VIEW.focus - horizon, depth: h * MAP_VIEW.depth, cx: this.canvas.width / 2 };
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
    return PLACES.filter((p) => !p.hidden || w.discovered.includes(p.id));
  }

  private click(e: MouseEvent) {
    if (!this.active || e.button !== 0) return;
    if (this.picker) {
      this.closePicker();
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
        label: `截住 ${NPC[n.kind].name} ${n.size} 人`,
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
    const path = goal && this.world.terrain.path(w.x, w.y, goal.x, goal.y);
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
      const note = on ? `去${this.preview!.name}，約 ${days} 日。再撳出發` : `第 ${q.deadline} 日前${q.need > 1 ? `　${q.progress}／${q.need}` : ''}`;
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
    this.sky.update(dt, currentScenario().sky ?? DEFAULT_SKY, this.focusX, this.focusY);
  }

  /** 逐行畫透視地面 */
  private drawGround() {
    const g = this.g;
    const { width, height } = this.canvas;
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
    const w = this.world.save;
    const { width, height } = this.canvas;
    const { horizon } = this.lens();
    const hour = hourOf(w);
    g.fillStyle = MAP_VIEW.sea;
    g.fillRect(0, 0, width, height);
    this.sky.drawBack(g, width, horizon, hour, this.focusX);
    this.drawGround();
    this.sky.drawHaze(g, width, horizon, height, hour);

    const at = (x: number, y: number) => this.project(x * PX, y * PX);
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
      g.lineWidth = 3;
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
      g.fillStyle = '#d6352a';
      g.beginPath();
      g.arc(q.x, q.y, radius, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.font = '11px "Microsoft JhengHei", sans-serif';
      if (q.s > LABEL_MIN_SCALE) g.fillText(`山賊 ${b.size} 人`, q.x, q.y - radius - 7);
    }

    g.font = '11px "Microsoft JhengHei", sans-serif';
    for (const n of w.npcs) {
      const dist = Math.hypot(n.x - w.x, n.y - w.y);
      if (dist > this.world.vision) continue;
      const q = at(n.x, n.y);
      if (!q) continue;
      const def = NPC[n.kind];
      g.fillStyle = def.color;
      g.strokeStyle = '#1b2433';
      g.lineWidth = 1.5;
      const radius = dotRadius(n.size) * Math.max(0.5, q.s);
      g.beginPath();
      if (n.size > 3) g.rect(q.x - radius, q.y - radius, radius * 2, radius * 2);
      else g.arc(q.x, q.y, radius, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      if (dist < NPC_RULES.labelDist && q.s > LABEL_MIN_SCALE) {
        const text = `${def.name} ${n.size} 人：${n.job}`;
        g.lineWidth = 3;
        g.strokeStyle = 'rgba(12,15,22,.85)';
        g.strokeText(text, q.x, q.y - radius - 7);
        g.fillStyle = '#fff4dc';
        g.fillText(text, q.x, q.y - radius - 7);
      }
    }

    this.sky.drawFlyers(g, this.project, horizon);

    // 自己部隊：人愈多粒點愈大
    if (!me) return;
    const men = this.world.roster.soldiers.length + 1;
    const radius = dotRadius(men);
    g.fillStyle = '#f2c14e';
    g.strokeStyle = '#1b2433';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(me.x, me.y, radius, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    const label = `你 ${men} 人`;
    g.font = 'bold 13px "Microsoft JhengHei", sans-serif';
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(12,15,22,.9)';
    g.strokeText(label, me.x, me.y - radius - 9);
    g.fillStyle = '#ffe9a8';
    g.fillText(label, me.x, me.y - radius - 9);
  }

  /** 地點：地上有影，標記企起身 */
  private drawPlace(p: PlaceDef, q: Projected) {
    const g = this.g;
    const open = isOpen(this.world.save, p);
    const pol = this.world.politics;
    const owner = pol.ownerOf(p.id);
    const color = owner === PLAYER ? '#f2c14e' : factionOf(owner ?? '')?.color;
    const size = Math.max(0.7, Math.min(1.5, q.s * 1.3));
    const r = (p.kind === 'town' ? 15 : 12) * size;
    const lift = 16 * size;
    const y = q.y - lift;
    g.fillStyle = 'rgba(8,10,16,.35)';
    g.beginPath();
    g.ellipse(q.x, q.y, r, r * 0.35, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#2a2230';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(q.x, q.y);
    g.lineTo(q.x, y);
    g.stroke();
    g.fillStyle = color ?? (open ? '#7a2a2a' : '#555');
    g.strokeStyle = pol.s.threats.some((t) => t.place === p.id) ? '#ff3a2a' : '#fff4dc';
    this.drawBuilding(p.monster ? 'monster' : p.kind, q.x, y, r);
    g.fill();
    g.stroke();
    if (q.s < LABEL_MIN_SCALE) return;
    g.font = '12px "Microsoft JhengHei", sans-serif';
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(12,15,22,.8)';
    g.strokeText(p.name, q.x, y + r + 9);
    g.fillText(p.name, q.x, y + r + 9);
  }

  /** 地點建築輪廓，由中心點畫 */
  private drawBuilding(kind: PlaceKind | 'monster', x: number, y: number, r: number) {
    const g = this.g;
    const poly = (points: [number, number][]) => {
      points.forEach(([a, b], i) => (i ? g.lineTo(x + a * r, y + b * r) : g.moveTo(x + a * r, y + b * r)));
      g.closePath();
    };
    g.beginPath();
    switch (kind) {
      case 'monster':
        // 獠牙寨城：一排尖刺
        poly([[-1.3, 1], [-1.3, -0.3], [-1, -1], [-0.65, -0.2], [-0.3, -1.3], [0, -0.3], [0.3, -1.3], [0.65, -0.2], [1, -1], [1.3, -0.3], [1.3, 1]]);
        break;
      case 'town':
        // 三座塔加城牆
        poly([[-1.2, 1], [-1.2, -0.7], [-0.75, -0.7], [-0.75, -0.2], [-0.3, -0.2], [-0.3, -1.1], [0.3, -1.1], [0.3, -0.2], [0.75, -0.2], [0.75, -0.7], [1.2, -0.7], [1.2, 1]]);
        break;
      case 'castle':
        poly([[-0.8, 1], [-0.8, -1], [-0.45, -1], [-0.45, -0.7], [-0.15, -0.7], [-0.15, -1], [0.15, -1], [0.15, -0.7], [0.45, -0.7], [0.45, -1], [0.8, -1], [0.8, 1]]);
        break;
      case 'village':
        poly([[-1, 1], [-1, 0], [-1.25, 0], [-0.45, -0.8], [0.3, 0], [0.05, 0], [0.05, 1]]);
        poly([[0.15, 1], [0.15, 0.2], [0, 0.2], [0.6, -0.4], [1.2, 0.2], [1.05, 0.2], [1.05, 1]]);
        break;
      case 'lair':
        poly([[-1.1, 1], [0, -1], [1.1, 1], [0.3, 1], [0, 0.3], [-0.3, 1]]);
        break;
      default:
        // 地下城同迷宮：石拱門
        poly([[-1, 1], [-1, -0.2], [-0.6, -0.9], [0.6, -0.9], [1, -0.2], [1, 1], [0.4, 1], [0.4, 0], [-0.4, 0], [-0.4, 1]]);
        break;
    }
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
      `部隊 ${r.soldiers.length + 1} 人${hurt ? `（傷 ${hurt}）` : ''}`,
      `行軍 ${this.world.partySpeed().toFixed(1)}`,
      `士氣 ${Math.round(w.morale)}`,
      `聲望 ${w.pol.renown}`,
      `正義 ${w.pol.justice}`,
      `忠誠 ${w.pol.loyalty}`,
      ...(Object.keys(w.pol.wanted).length ? ['通緝中'] : []),
    ];
    const hint = this.world.paused ? '已暫停，空白鍵繼續' : '左鍵行軍　滾輪縮放　Tab 部隊　空白鍵暫停　M 靜音　Esc 選單';
    this.bar.innerHTML = `<div class="stats-line">${items.map((t) => `<span>${t}</span>`).join('')}</div><div class="hint-line">${hint}</div>`;
  }
}
