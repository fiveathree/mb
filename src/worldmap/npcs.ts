import { MARKET, NPC, NPC_RULES, TOWN_TRADE, type NpcKind } from '../data/economy';
import { HONOR } from '../data/honor';
import { PLACES, type PlaceDef } from '../data/world';
import type { ArmyEntry } from '../data/battlefield';
import type { BanditParty, WorldSave } from './world';
import type { WorldTerrain } from './terrain';

export interface Npc {
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
  if (n.kind === 'dragon') return [{ unit: 'boss_dragon', count: 1 }];
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

  constructor(
    private save: WorldSave,
    private terrain: WorldTerrain,
    private note: (t: string) => void,
    private day: () => number,
  ) {}

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
    if (this.day() >= this.save.nextRaid && count('raider') < NPC.raider.max) {
      this.spawn('raider', placeOf('blackfang'));
      this.save.nextRaid = this.day() + NPC_RULES.raidEveryDays;
      this.note('黑牙堡嘅掠奪隊出動！');
    }
    if (this.day() >= this.save.nextDragon && count('dragon') < NPC.dragon.max) {
      this.spawn('dragon', placeOf('dragonlair'));
      this.save.nextDragon = this.day() + NPC_RULES.dragonEveryDays;
      this.note('赤焰巨龍離巢！全大陸震動');
    }
  }

  private setTrip(n: Npc, dest: PlaceDef, job: string) {
    const path = this.terrain.path(n.x, n.y, dest.x, dest.y);
    if (!path) {
      n.wait = 3;
      return;
    }
    n.dest = dest.id;
    n.job = job;
    this.paths.set(n.id, path);
  }

  /** 決定下一份工 */
  private nextJob(n: Npc) {
    const home = placeOf(n.home);
    switch (n.kind) {
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
      case 'patrol': {
        const a = Math.random() * Math.PI * 2;
        const x = Math.round(home.x + Math.cos(a) * 16);
        const y = Math.round(home.y + Math.sin(a) * 12);
        const route = this.terrain.path(n.x, n.y, x, y);
        if (route) {
          this.paths.set(n.id, route);
          n.job = `巡邏${home.name}一帶`;
        } else n.wait = 1;
        break;
      }
      case 'raider':
      case 'dragon':
        if (n.done) {
          this.setTrip(n, home, n.kind === 'dragon' ? '飛返龍巢' : '搶完返黑牙堡');
        } else {
          const to = pick(villages);
          this.setTrip(n, to, `正要洗劫${to.name}`);
        }
        break;
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
        if (place?.kind === 'village' && !n.done) {
          this.save.burnedUntil[place.id] = this.day() + NPC_RULES.burnedDays;
          n.done = true;
          this.note(`${place.name}被${n.kind === 'dragon' ? '巨龍燒毀' : '獸人洗劫'}！`);
          n.wait = 3;
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
    for (const n of [...this.save.npcs]) {
      if (n.wait > 0) {
        n.wait -= dt;
        continue;
      }
      if (n.kind === 'patrol' && (this.pursue(n, dt) || this.hunt(n, bandits, dt))) continue;
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
    const d = Math.hypot(dx, dy) || 1;
    const nx = n.x + (dx / d) * NPC.patrol.speed * dt;
    const ny = n.y + (dy / d) * NPC.patrol.speed * dt;
    if (this.terrain.passable(Math.round(nx), Math.round(ny))) {
      n.x = nx;
      n.y = ny;
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
      if (n.kind === 'patrol' || n.kind === 'raider' || n.kind === 'dragon') continue;
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
