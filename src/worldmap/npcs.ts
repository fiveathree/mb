import { MARKET, NPC, NPC_RULES, TOWN_TRADE, type NpcKind } from '../data/economy';
import { GROWTH_CHANCE, MILESTONES, ROUTINES, ROUTINE_WAIT, figureOf, type RoutineStep } from '../data/figures';
import { currentFigures, currentScenario, isMagic } from '../data/scenarios';
import { PLAYER } from '../politics/politics';
import { HONOR } from '../data/honor';
import { CALAMITY } from '../data/tomb';
import { RAMPAGE, type StrikeKind } from '../data/colossus';
import { DRAGON_BREEDS } from '../data/units';
import { PLACES, type PlaceDef } from '../data/world';
import type { ArmyEntry } from '../data/battlefield';
import type { BanditParty, WorldSave } from './world';
import type { WorldTerrain } from './terrain';

export interface Npc {
  /** 災厄毀咗幾多座城 */
  strikes?: number;
  id: number;
  kind: NpcKind;
  x: number;
  y: number;
  size: number;
  /** 而家做緊乜，畫喺地圖上 */
  job: string;
  /** 目的地點 */
  dest: string | null;
  /** 出發地點 */
  home: string;
  /** 停留計時（秒） */
  wait: number;
  /** 掠奪隊：搶完未 */
  done: boolean;
  /** 人物 id */
  figure?: string;
  /** 生活節奏做到邊一步 */
  step?: number;
  /** 修練累積 */
  growth?: number;
}

const towns = PLACES.filter((p) => p.kind === 'town');
const villages = PLACES.filter((p) => p.kind === 'village');
const placeOf = (id: string) => PLACES.find((p) => p.id === id)!;
const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const rint = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));

function nearestTown(p: PlaceDef): PlaceDef {
  return towns.reduce((best, t) => (Math.hypot(t.x - p.x, t.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? t : best));
}

export function raiderArmy(n: Npc): ArmyEntry[] {
  if (n.kind === 'dragon') return [{ unit: DRAGON_BREEDS[n.id % DRAGON_BREEDS.length], count: 1 }];
  if (n.kind === 'witch' || n.kind === 'wyrm' || n.kind === 'titan') return [{ unit: CALAMITY[n.kind].unit, count: 1 }];
  if (n.kind === 'patrol') {
    return [
      { unit: 'footman', count: Math.ceil(n.size * 0.6) }, { unit: 'archer', count: Math.ceil(n.size * 0.25) },
      { unit: 'horseman', count: Math.floor(n.size * 0.15) },
    ];
  }
  return NPC_RULES.raiderArmy.map((a) => ({ unit: a.unit, count: Math.max(1, Math.round(n.size * a.share)) }));
}

/** 大地圖 NPC：每隊都有工作，做完會影響世界 */
export class NpcSystem {
  private paths = new Map<number, { x: number; y: number }[]>();
  private bandits: BanditParty[] | null = null;
  /** 災厄毀城，由世界交畀政治系統處理 */
  onDoom: ((place: string) => void) | null = null;
  /** 滅世攻擊落地：世界畫面要顯示 */
  onStrike: ((kind: StrikeKind, place: PlaceDef) => void) | null = null;
  /** 遠征隊打到山賊 */
  onRaid: ((b: BanditParty) => void) | null = null;

  constructor(
    private save: WorldSave,
    private terrain: WorldTerrain,
    private note: (t: string) => void,
    private day: () => number,
  ) {}

  /** 遠征隊：由最近嘅城出發，喺大地圖見到 */
  sendExpedition(men: number, x: number, y: number) {
    const from = towns.reduce((b, t) => (Math.hypot(t.x - x, t.y - y) < Math.hypot(b.x - x, b.y - y) ? t : b));
    const n = this.spawn('expedition', from);
    n.x = x;
    n.y = y;
    n.size = men;
  }

  recallExpedition() {
    this.save.npcs = this.save.npcs.filter((n) => n.kind !== 'expedition');
  }

  private spawn(kind: NpcKind, at: PlaceDef): Npc {
    const def = NPC[kind];
    const n: Npc = {
      id: this.save.nextBandit++, kind, x: at.x, y: at.y, size: rint(def.size[0], def.size[1]),
      job: '準備出發', dest: null, home: at.id, wait: 0, done: false,
    };
    this.save.npcs.push(n);
    return n;
  }

  /** 補充死咗或者收工嘅 NPC */
  refill() {
    const list = this.save.npcs;
    const count = (k: NpcKind) => list.filter((n) => n.kind === k).length;
    while (count('caravan') < NPC.caravan.max) this.spawn('caravan', pick(towns));
    while (count('farmer') < NPC.farmer.max) this.spawn('farmer', pick(villages));
    while (count('hunter') < NPC.hunter.max) this.spawn('hunter', pick(villages));
    while (count('messenger') < NPC.messenger.max) this.spawn('messenger', pick(towns));
    while (count('patrol') < NPC.patrol.max) this.spawn('patrol', towns[count('patrol') % towns.length]);
    while (count('fisher') < NPC.fisher.max) this.spawn('fisher', pick(villages));
    while (count('miner') < NPC.miner.max) this.spawn('miner', pick(villages));
    for (const f of currentFigures()) {
      if (this.save.pol.storyMet.includes(f.id) || list.some((n) => n.figure === f.id)) continue;
      const n = this.spawn('figure', placeOf(f.home));
      n.figure = f.id;
      n.step = 0;
      n.growth = 0;
    }
    while (count('lord') < NPC.lord.max) this.spawn('lord', pick(PLACES.filter((p) => p.kind === 'town' || p.kind === 'castle')));
    if (this.day() >= this.save.nextRaid && count('raider') < NPC.raider.max) {
      this.spawn('raider', placeOf('blackfang'));
      this.save.nextRaid = this.day() + NPC_RULES.raidEveryDays;
      this.note(`${placeOf('blackfang').name}嘅掠奪隊出動！`);
    }
    if (isMagic() && this.day() >= this.save.nextDragon && count('dragon') < NPC.dragon.max) {
      this.spawn('dragon', placeOf('dragonlair'));
      this.save.nextDragon = this.day() + NPC_RULES.dragonEveryDays;
      this.note('巨龍離巢！全大陸震動');
    }
    for (const kind of ['witch', 'wyrm', 'titan'] as const) {
      if (!isMagic()) break;
      if (kind === 'titan' && !currentScenario().titan) continue;
      const rule = CALAMITY[kind];
      const key = kind === 'witch' ? 'nextWitch' : kind === 'wyrm' ? 'nextWyrm' : 'nextTitan';
      if (this.day() < this.save[key] || count(kind) >= NPC[kind].max) continue;
      this.spawn(kind, placeOf(rule.home));
      this.save[key] = this.day() + rule.everyDays;
      this.note(`${NPC[kind].name}現身！各國人心惶惶`);
    }
  }

  /** 試玩用：喺玩家附近放一隻災厄 */
  summon(kind: 'titan' | 'wyrm' | 'witch' | 'dragon', x: number, y: number) {
    if (kind === 'titan' && !currentScenario().titan) CALAMITY.titan.unit = 'boss_demongod';
    const home = PLACES.reduce((b, p) => (Math.hypot(p.x - x, p.y - y) < Math.hypot(b.x - x, b.y - y) ? p : b));
    const n = this.spawn(kind, home);
    n.x = x + 9;
    n.y = y - 5;
    n.wait = RAMPAGE.stay;
  }

  private setTrip(n: Npc, dest: PlaceDef, job: string) {
    // 災厄飛過去，山同江都擋唔住
    const doom = n.kind === 'dragon' || n.kind === 'witch' || n.kind === 'wyrm' || n.kind === 'titan';
    const path = this.terrain.path(n.x, n.y, dest.x, dest.y, doom ? 'fly' : 'land');
    if (!path) {
      n.wait = 3;
      return;
    }
    n.dest = dest.id;
    n.job = job;
    this.paths.set(n.id, path);
  }

  private routineOf(n: Npc): RoutineStep[] {
    return n.figure ? figureOf(n.figure)!.routine : ROUTINES[n.kind as 'fisher' | 'miner'];
  }

  /** 搵做嘢地點：森林入面、河邊或者山腳 */
  private workSpot(home: PlaceDef, go: RoutineStep['go']): { x: number; y: number } | null {
    const t = this.terrain;
    const beside = (x: number, y: number, tile: string) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => t.inside(x + a, y + b) && t.at(x + a, y + b) === tile);
    for (let i = 0; i < 400; i++) {
      const r = 6 + (i / 400) * 70;
      const a = Math.random() * Math.PI * 2;
      const x = Math.round(home.x + Math.cos(a) * r);
      const y = Math.round(home.y + Math.sin(a) * r);
      if (!t.passable(x, y)) continue;
      if (go === 'forest' ? t.at(x, y) === 'forest' : beside(x, y, go === 'water' ? 'water' : 'mountain')) return { x, y };
    }
    return null;
  }

  /** 人物同平民：按生活節奏去下一步 */
  private nextRoutine(n: Npc, home: PlaceDef) {
    const list = this.routineOf(n);
    const step = list[(n.step ?? 0) % list.length];
    if (step.go === 'home') {
      this.setTrip(n, home, `返${home.name}：${step.job}`);
      return;
    }
    if (step.go === 'town') {
      const to = pick(towns);
      this.setTrip(n, to, `去${to.name}：${step.job}`);
      return;
    }
    const spot = this.workSpot(home, step.go);
    const path = spot && this.terrain.path(n.x, n.y, spot.x, spot.y);
    if (!path) {
      n.step = (n.step ?? 0) + 1;
      n.wait = 2;
      return;
    }
    n.dest = null;
    n.job = `出發：${step.job}`;
    this.paths.set(n.id, path);
  }

  /** 修練夠深會影響世界，例如伯爵吞併附近村莊 */
  private milestone(n: Npc) {
    const m = n.figure ? MILESTONES[n.figure]?.[n.growth ?? 0] : null;
    if (!m) return;
    this.note(m.text);
    if (!m.seize) return;
    const owners = this.save.pol.owners;
    const mine = owners[n.home];
    const village = villages
      .filter((v) => owners[v.id] && owners[v.id] !== mine && owners[v.id] !== PLAYER)
      .sort((a, b) => Math.hypot(a.x - n.x, a.y - n.y) - Math.hypot(b.x - n.x, b.y - n.y))[0];
    if (mine && village) {
      owners[village.id] = mine;
      this.note(`${village.name}改投新主`);
    }
  }

  private arriveRoutine(n: Npc, place: PlaceDef | null | undefined) {
    const list = this.routineOf(n);
    const step = list[(n.step ?? 0) % list.length];
    n.step = (n.step ?? 0) + 1;
    n.job = step.job;
    n.wait = step.wait * ROUTINE_WAIT;
    if (step.grow && Math.random() < GROWTH_CHANCE) {
      n.growth = (n.growth ?? 0) + 1;
      this.milestone(n);
    }
    if (!place || !this.save.stock[place.id]) return;
    if (step.haul === 'food') this.save.townFood[place.id] = (this.save.townFood[place.id] ?? 0) + NPC_RULES.farmerFood;
    if (step.haul === 'iron') this.save.stock[place.id].iron += 2;
  }

  /** 決定下一份工 */
  private nextJob(n: Npc) {
    const home = placeOf(n.home);
    switch (n.kind) {
      case 'figure':
      case 'fisher':
      case 'miner':
        this.nextRoutine(n, home);
        break;
      case 'caravan': {
        const to = pick(towns.filter((t) => t.id !== n.dest));
        this.setTrip(n, to, `運貨去${to.name}`);
        break;
      }
      case 'messenger': {
        const to = pick(towns.filter((t) => t.id !== n.dest));
        this.setTrip(n, to, `送信去${to.name}`);
        break;
      }
      case 'farmer':
        if (n.dest === nearestTown(home).id) {
          this.setTrip(n, home, `返${home.name}`);
        } else {
          const t = nearestTown(home);
          this.setTrip(n, t, `運糧去${t.name}`);
        }
        break;
      case 'hunter': {
        if (n.job.startsWith('入山')) {
          n.job = '打獵中';
          n.wait = NPC_RULES.huntSeconds;
          n.dest = '';
        } else if (n.job === '打獵中') {
          this.setTrip(n, home, `帶獵物返${home.name}`);
        } else {
          const spot = this.huntingSpot(home);
          this.paths.set(n.id, this.terrain.path(n.x, n.y, spot.x, spot.y) ?? []);
          n.job = '入山打獵';
        }
        break;
      }
      case 'patrol':
      case 'lord': {
        const a = Math.random() * Math.PI * 2;
        const far = n.kind === 'lord' ? 2 : 1;
        const x = Math.round(home.x + Math.cos(a) * 16 * far);
        const y = Math.round(home.y + Math.sin(a) * 12 * far);
        const route = this.terrain.inside(x, y) ? this.terrain.path(n.x, n.y, x, y) : null;
        if (route) {
          this.paths.set(n.id, route);
          n.job = n.kind === 'lord' ? `巡視${home.name}領地` : `巡邏${home.name}一帶`;
        } else n.wait = 1;
        break;
      }
      case 'expedition': {
        const to = pick(PLACES.filter((p) => p.kind === 'lair' || p.kind === 'village'));
        // 有賊就追賊
        const prey = this.bandits?.[0];
        if (prey) {
          const path = this.terrain.path(n.x, n.y, prey.x, prey.y);
          if (path) {
            n.job = '追擊山賊';
            this.paths.set(n.id, path);
            break;
          }
        }
        this.setTrip(n, to, `遠征去${to.name}`);
        break;
      }
      case 'raider':
      case 'dragon':
      case 'witch':
      case 'titan':
      case 'wyrm': {
        if (n.done) {
          this.setTrip(n, home, `返去${home.name}`);
        } else {
          // 災厄連城鎮都會打
          const to = pick(n.kind === 'witch' || n.kind === 'wyrm' || n.kind === 'titan' ? [...villages, ...towns] : villages);
          this.setTrip(n, to, `正要毀滅${to.name}`);
        }
        break;
      }
    }
  }

  private huntingSpot(home: PlaceDef): { x: number; y: number } {
    for (let i = 0; i < 20; i++) {
      const x = Math.round(home.x + (Math.random() - 0.5) * 24);
      const y = Math.round(home.y + (Math.random() - 0.5) * 24);
      if (this.terrain.passable(x, y) && this.terrain.at(x, y) === 'forest') return { x, y };
    }
    return { x: home.x, y: home.y };
  }

  /** 到咗目的地：做實際嘅嘢 */
  private arrive(n: Npc) {
    const place = n.dest ? PLACES.find((p) => p.id === n.dest) : null;
    switch (n.kind) {
      case 'figure':
      case 'fisher':
      case 'miner':
        this.arriveRoutine(n, place);
        break;
      case 'caravan':
        if (place) this.deliver(place, n);
        n.wait = NPC_RULES.restSeconds;
        break;
      case 'farmer':
        if (place?.kind === 'town') {
          this.save.townFood[place.id] = (this.save.townFood[place.id] ?? 0) + NPC_RULES.farmerFood;
          n.job = `喺${place.name}賣糧`;
        } else n.job = '喺田入面做嘢';
        n.wait = NPC_RULES.restSeconds;
        break;
      case 'raider':
      case 'dragon':
      case 'witch':
      case 'titan':
      case 'wyrm':
        if (place && (place.kind === 'village' || place.kind === 'town') && !n.done) {
          const doom = n.kind === 'witch' || n.kind === 'wyrm' || n.kind === 'titan' ? CALAMITY[n.kind] : null;
          this.save.burnedUntil[place.id] = this.day() + NPC_RULES.burnedDays * (doom?.burnMult ?? 1);
          if (doom) {
            this.save.treasury[place.id] = 0;
            this.onDoom?.(place.id);
          }
          if (n.kind !== 'raider') this.onStrike?.(n.kind, place);
          // 災厄連毀幾座城，留低嘅時間就係追上佢嘅機會
          n.strikes = (n.strikes ?? 0) + 1;
          n.done = n.kind === 'raider' || n.strikes >= RAMPAGE.strikes;
          this.note(`${place.name}被${NPC[n.kind].name}${doom?.verb ?? '洗劫'}！`);
          n.wait = n.kind === 'raider' ? 3 : RAMPAGE.stay;
        } else if (n.done) {
          this.save.npcs = this.save.npcs.filter((x) => x !== n);
        }
        break;
      case 'hunter':
        if (n.job.startsWith('帶獵物')) n.job = '休息';
        break;
      default:
        n.wait = 1;
    }
  }

  private deliver(place: PlaceDef, n: Npc) {
    const stock = this.save.stock[place.id];
    const from = TOWN_TRADE[n.home];
    if (!stock || !from) return;
    // 貨由原產地運走，運到目的地
    const origin = this.save.stock[n.home];
    for (const good of from.makes) {
      if (origin) origin[good] = Math.max(0, origin[good] - MARKET.caravanLoad);
      stock[good] += MARKET.caravanLoad;
    }
    n.home = place.id;
  }

  update(dt: number, bandits: BanditParty[]) {
    this.bandits = bandits;
    for (const n of [...this.save.npcs]) {
      if (n.wait > 0) {
        n.wait -= dt;
        continue;
      }
      if (n.kind === 'patrol' && (this.pursue(n, dt) || this.hunt(n, bandits, dt))) continue;
      if (n.kind === 'expedition') {
        const prey = bandits.find((b) => Math.hypot(b.x - n.x, b.y - n.y) < NPC_RULES.contactDist * 2);
        if (prey) this.onRaid?.(prey);
      }
      const path = this.paths.get(n.id);
      if (!path || !path.length) {
        if (path) {
          this.paths.delete(n.id);
          this.arrive(n);
          if (n.wait > 0) continue;
        }
        this.nextJob(n);
        continue;
      }
      this.step(n, path, NPC[n.kind].speed * dt);
    }
  }

  private step(n: Npc, path: { x: number; y: number }[], budget: number) {
    while (budget > 0 && path.length) {
      const next = path[0];
      const dx = next.x - n.x;
      const dy = next.y - n.y;
      const d = Math.hypot(dx, dy);
      if (d <= budget) {
        n.x = next.x;
        n.y = next.y;
        budget -= d;
        path.shift();
      } else {
        n.x += (dx / d) * budget;
        n.y += (dy / d) * budget;
        budget = 0;
      }
    }
  }

  /** 呢隊巡邏隊係咪捉緊你 */
  isHunting(n: Npc): boolean {
    const w = this.save;
    const owner = w.pol.owners[n.home];
    if (!owner || !w.pol.wanted[owner]) return false;
    return Math.hypot(n.x - w.x, n.y - w.y) < HONOR.hunterSight;
  }

  /** 通緝犯喺附近就追 */
  private pursue(n: Npc, dt: number): boolean {
    if (!this.isHunting(n)) return false;
    n.job = '追捕通緝犯';
    this.paths.delete(n.id);
    const w = this.save;
    const dx = w.x - n.x;
    const dy = w.y - n.y;
    const base = Math.atan2(dy, dx);
    // 撞到地形就斜行，唔會卡死喺山邊
    for (const turn of [0, 0.7, -0.7, 1.4, -1.4]) {
      const nx = n.x + Math.cos(base + turn) * NPC.patrol.speed * dt;
      const ny = n.y + Math.sin(base + turn) * NPC.patrol.speed * dt;
      if (this.terrain.passable(Math.round(nx), Math.round(ny))) {
        n.x = nx;
        n.y = ny;
        break;
      }
    }
    return true;
  }

  /** 巡邏隊追剿山賊 */
  private hunt(n: Npc, bandits: BanditParty[], dt: number): boolean {
    const near = bandits.find((b) => Math.hypot(b.x - n.x, b.y - n.y) < NPC_RULES.patrolSight);
    if (!near) return false;
    n.job = '追擊山賊';
    this.paths.delete(n.id);
    const dx = near.x - n.x;
    const dy = near.y - n.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = n.x + (dx / d) * NPC.patrol.speed * dt;
    const ny = n.y + (dy / d) * NPC.patrol.speed * dt;
    if (this.terrain.passable(Math.round(nx), Math.round(ny))) {
      n.x = nx;
      n.y = ny;
    }
    if (d < NPC_RULES.contactDist) {
      this.save.bandits = this.save.bandits.filter((b) => b !== near);
      this.note(`${placeOf(n.home).name}巡邏隊剿滅一夥山賊`);
    }
    return true;
  }

  /** 山賊搵獵物：回傳最近嘅平民 */
  preyFor(b: BanditParty): Npc | null {
    let best: Npc | null = null;
    let bestD: number = NPC_RULES.banditPreySight;
    for (const n of this.save.npcs) {
      if (['patrol', 'raider', 'dragon', 'witch', 'wyrm', 'titan', 'expedition', 'lord', 'figure'].includes(n.kind)) continue;
      const d = Math.hypot(n.x - b.x, n.y - b.y);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  /** 山賊劫到平民 */
  robbed(n: Npc) {
    this.save.npcs = this.save.npcs.filter((x) => x !== n);
    this.paths.delete(n.id);
    const place = n.dest ? PLACES.find((p) => p.id === n.dest) : undefined;
    if (n.kind === 'caravan') this.note(`往${place?.name ?? '城鎮'}嘅商隊被山賊劫咗`);
    else if (n.kind === 'farmer') this.note('有農民喺路上遇害');
  }

  remove(n: Npc) {
    this.save.npcs = this.save.npcs.filter((x) => x !== n);
    this.paths.delete(n.id);
  }
}
