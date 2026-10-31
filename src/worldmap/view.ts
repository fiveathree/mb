import { MAP, PARTY, PLACES, PLACE_ICON, type PlaceDef } from '../data/world';
import { NPC, NPC_RULES } from '../data/economy';
import { factionOf } from '../data/factions';
import { PLAYER } from '../politics/politics';
import { partyFood, partyWage } from '../core/roster';
import { dayOf, hourOf, isNight, isOpen, type World, type WorldEvent } from './world';

const PX = MAP.tilePx;
const PAN_SPEED = 620;
const TILE_FOG = 'rgba(10, 14, 24, 0.82)';
const CLICK_RADIUS = 2.6;

const dotRadius = (men: number) => Math.min(PARTY.dotMax, PARTY.dotBase + Math.sqrt(men) * PARTY.dotPerRootMan);

/** 大地圖畫面：畫地圖、處理點擊同平移 */
export class WorldView {
  private g: CanvasRenderingContext2D;
  private base: HTMLCanvasElement;
  private camX = 0;
  private camY = 0;
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
    this.base = world.terrain.render(PX);
    this.bar = document.getElementById('mapbar')!;
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    canvas.addEventListener('mousedown', (e) => this.click(e));
    this.resize();
  }

  setWorld(world: World) {
    this.world = world;
    this.follow = true;
  }

  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private onKey(e: KeyboardEvent) {
    if (!this.active) return;
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

  private toWorld(e: MouseEvent): { x: number; y: number } {
    return { x: (e.clientX + this.camX) / PX, y: (e.clientY + this.camY) / PX };
  }

  private visiblePlaces(): PlaceDef[] {
    const w = this.world.save;
    return PLACES.filter((p) => !p.hidden || w.discovered.includes(p.id));
  }

  private click(e: MouseEvent) {
    if (!this.active || e.button !== 0) return;
    const m = this.toWorld(e);
    const place = this.visiblePlaces().find((p) => Math.hypot(p.x - m.x, p.y - m.y) < CLICK_RADIUS);
    this.follow = true;
    const w = this.world.save;
    const npc = w.npcs.find((n) => Math.hypot(n.x - m.x, n.y - m.y) < 1.8
      && Math.hypot(n.x - w.x, n.y - w.y) < this.world.vision);
    if (npc) {
      this.world.chase(npc);
      return;
    }
    if (place && Math.hypot(place.x - w.x, place.y - w.y) < 1.5) this.onEvent?.({ type: 'place', place });
    else if (place) this.world.goTo(place.x, place.y, place);
    else this.world.goTo(m.x, m.y, null);
  }

  start() {
    this.active = true;
    this.canvas.hidden = false;
    this.bar.hidden = false;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  stop() {
    this.active = false;
    this.canvas.hidden = true;
    this.bar.hidden = true;
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
      this.camX += dx * PAN_SPEED * dt;
      this.camY += dy * PAN_SPEED * dt;
    }
    if (this.follow) {
      this.camX = this.world.save.x * PX - this.canvas.width / 2;
      this.camY = this.world.save.y * PX - this.canvas.height / 2;
    }
    this.camX = Math.max(0, Math.min(this.camX, Math.max(0, this.base.width - this.canvas.width)));
    this.camY = Math.max(0, Math.min(this.camY, Math.max(0, this.base.height - this.canvas.height)));
  }

  private draw() {
    const g = this.g;
    const w = this.world.save;
    const { width, height } = this.canvas;
    g.fillStyle = '#16202f';
    g.fillRect(0, 0, width, height);
    g.drawImage(this.base, -this.camX, -this.camY);

    const sx = (x: number) => x * PX - this.camX;
    const sy = (y: number) => y * PX - this.camY;

    // 行軍路線
    if (this.world.path.length) {
      g.strokeStyle = 'rgba(255,244,220,.75)';
      g.setLineDash([6, 6]);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(sx(w.x), sy(w.y));
      for (const p of this.world.path) g.lineTo(sx(p.x), sy(p.y));
      g.stroke();
      g.setLineDash([]);
    }

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const p of this.visiblePlaces()) this.drawPlace(p, sx(p.x), sy(p.y));

    // 夜晚同視野
    const vision = this.world.vision * PX;
    const grad = g.createRadialGradient(sx(w.x), sy(w.y), vision * 0.55, sx(w.x), sy(w.y), vision);
    const dark = isNight(w) ? TILE_FOG : 'rgba(10,14,24,.32)';
    grad.addColorStop(0, 'rgba(10,14,24,0)');
    grad.addColorStop(1, dark);
    g.fillStyle = grad;
    g.fillRect(0, 0, width, height);

    for (const b of w.bandits) {
      if (Math.hypot(b.x - w.x, b.y - w.y) > this.world.vision) continue;
      const radius = dotRadius(b.size);
      g.fillStyle = '#d6352a';
      g.beginPath();
      g.arc(sx(b.x), sy(b.y), radius, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.font = '11px "Microsoft JhengHei", sans-serif';
      g.fillText(`山賊 ${b.size} 人`, sx(b.x), sy(b.y) - radius - 7);
    }

    g.font = '11px "Microsoft JhengHei", sans-serif';
    for (const n of w.npcs) {
      const dist = Math.hypot(n.x - w.x, n.y - w.y);
      if (dist > this.world.vision) continue;
      const def = NPC[n.kind];
      g.fillStyle = def.color;
      g.strokeStyle = '#1b2433';
      g.lineWidth = 1.5;
      const radius = dotRadius(n.size);
      g.beginPath();
      if (n.size > 3) g.rect(sx(n.x) - radius, sy(n.y) - radius, radius * 2, radius * 2);
      else g.arc(sx(n.x), sy(n.y), radius, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      if (dist < NPC_RULES.labelDist) {
        const text = `${def.name} ${n.size} 人：${n.job}`;
        g.lineWidth = 3;
        g.strokeStyle = 'rgba(12,15,22,.85)';
        g.strokeText(text, sx(n.x), sy(n.y) - radius - 7);
        g.fillStyle = '#fff4dc';
        g.fillText(text, sx(n.x), sy(n.y) - radius - 7);
      }
    }

    // 自己部隊：人愈多粒點愈大
    const men = this.world.roster.soldiers.length + 1;
    const radius = dotRadius(men);
    g.fillStyle = '#f2c14e';
    g.strokeStyle = '#1b2433';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(sx(w.x), sy(w.y), radius, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    const label = `你 ${men} 人`;
    g.font = 'bold 13px "Microsoft JhengHei", sans-serif';
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(12,15,22,.9)';
    g.strokeText(label, sx(w.x), sy(w.y) - radius - 9);
    g.fillStyle = '#ffe9a8';
    g.fillText(label, sx(w.x), sy(w.y) - radius - 9);
  }

  private drawPlace(p: PlaceDef, x: number, y: number) {
    const g = this.g;
    const open = isOpen(this.world.save, p);
    const pol = this.world.politics;
    const owner = pol.ownerOf(p.id);
    const color = owner === PLAYER ? '#f2c14e' : factionOf(owner ?? '')?.color;
    g.fillStyle = color ?? (open ? '#7a2a2a' : '#555');
    g.strokeStyle = pol.s.threats.some((t) => t.place === p.id) ? '#ff3a2a' : '#fff4dc';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, p.kind === 'town' ? 15 : 12, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#fff4dc';
    g.font = 'bold 13px "Microsoft JhengHei", sans-serif';
    g.fillText(PLACE_ICON[p.kind], x, y);
    g.font = '12px "Microsoft JhengHei", sans-serif';
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(12,15,22,.8)';
    g.strokeText(p.name, x, y + 22);
    g.fillText(p.name, x, y + 22);
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
    ];
    const hint = this.world.paused ? '已暫停，空白鍵繼續' : '左鍵行軍　Tab 部隊　空白鍵暫停　Esc 選單';
    this.bar.innerHTML = `<div class="stats-line">${items.map((t) => `<span>${t}</span>`).join('')}</div><div class="hint-line">${hint}</div>`;
  }
}
