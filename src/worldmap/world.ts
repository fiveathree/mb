import type { ArmyEntry } from '../data/battlefield';
import { BANDIT, MAP, MORALE_PARTY, PARTY, PLACES, SHOP, TIME, type PlaceDef } from '../data/world';
import { UNITS } from '../data/units';
import { CAMPAIGN } from '../data/gacha';
import {
  armyPower, deployment, partyFood, partyWage, rarityOf, rosterPower, type Roster,
} from '../core/roster';
import { WorldTerrain } from './terrain';

export interface BanditParty {
  id: number;
  x: number;
  y: number;
  size: number;
  level: number;
  /** 遊走目標 */
  tx: number;
  ty: number;
}

export interface WorldSave {
  x: number;
  y: number;
  /** 由第 1 日 0 時開始計嘅小時 */
  hours: number;
  food: number;
  morale: number;
  bandits: BanditParty[];
  nextBandit: number;
  /** 地點 → 第幾日可以再打 */
  clearedUntil: Record<string, number>;
  /** 見過嘅隱藏地點 */
  discovered: string[];
  /** 地點 → 第幾日先刷新招募 */
  recruitedUntil: Record<string, number>;
  /** 欠餉週數 */
  unpaid: number;
  log: string[];
}

export function newWorld(): WorldSave {
  const start = PLACES[0];
  return {
    x: start.x + 3, y: start.y + 2, hours: 8, food: CAMPAIGN.startFood, morale: MORALE_PARTY.start, bandits: [], nextBandit: 1,
    clearedUntil: {}, discovered: [], recruitedUntil: {}, unpaid: 0, log: [],
  };
}

export type WorldEvent =
  | { type: 'place'; place: PlaceDef }
  | { type: 'bandit'; bandit: BanditParty };

export function banditArmy(b: BanditParty): ArmyEntry[] {
  return BANDIT.army.map((a) => ({ unit: a.unit, count: Math.max(1, Math.round(b.size * a.share)) }));
}

export function isOpen(w: WorldSave, p: PlaceDef): boolean {
  return (w.clearedUntil[p.id] ?? 0) <= dayOf(w);
}

export function dayOf(w: WorldSave): number {
  return Math.floor(w.hours / 24) + 1;
}

export function hourOf(w: WorldSave): number {
  return w.hours % 24;
}

export function isNight(w: WorldSave): boolean {
  const h = hourOf(w);
  return h >= TIME.nightFrom || h < TIME.nightTo;
}

/** 大地圖模擬：行軍、時間、糧餉、山賊 */
export class World {
  readonly terrain = new WorldTerrain();
  path: { x: number; y: number }[] = [];
  destination: PlaceDef | null = null;
  paused = false;
  private spawnT = 0;
  private graceT = 0;

  constructor(public save: WorldSave, public roster: Roster) {}

  get vision(): number {
    return isNight(this.save) ? TIME.nightVision : TIME.dayVision;
  }

  partySpeed(): number {
    const list = deployment(this.roster);
    const n = list.length || 1;
    const cav = list.filter((s) => UNITS[s.unit].horse).length / n;
    const size = Math.min(PARTY.sizePenaltyMax, n * PARTY.sizePenalty);
    return PARTY.speed * (1 - size) * (1 + cav * PARTY.cavalryBonus);
  }

  goTo(x: number, y: number, place: PlaceDef | null): boolean {
    const route = this.terrain.path(this.save.x, this.save.y, x, y);
    if (!route) return false;
    this.path = route;
    this.destination = place;
    this.paused = false;
    return true;
  }

  get moving(): boolean {
    return this.path.length > 0 && !this.paused;
  }

  /** 推進時間；回傳新事件 */
  update(dt: number): WorldEvent | null {
    if (!this.moving) return null;
    this.advanceTime(dt);
    return this.move(dt) ?? this.updateBandits(dt);
  }

  /** 休息一日（城鎮用） */
  rest() {
    this.advanceTime(TIME.secondsPerDay);
    this.save.morale = Math.min(100, this.save.morale + SHOP.restMorale);
  }

  private advanceTime(dt: number) {
    const w = this.save;
    const before = dayOf(w);
    w.hours += (dt / TIME.secondsPerDay) * 24;
    const after = dayOf(w);
    for (let d = before + 1; d <= after; d++) this.newDay(d);
    this.spawnT -= (dt / TIME.secondsPerDay) * (isNight(w) ? 2 : 1);
    if (this.spawnT <= 0) {
      this.spawnT = BANDIT.spawnEvery;
      this.spawnBandit();
    }
  }

  private note(text: string) {
    this.save.log.unshift(`第 ${dayOf(this.save)} 日：${text}`);
    this.save.log.length = Math.min(this.save.log.length, 6);
  }

  private newDay(day: number) {
    const w = this.save;
    const r = this.roster;
    for (const s of r.soldiers) if (s.hurtDays > 0) s.hurtDays--;

    w.food -= partyFood(r);
    if (w.food <= 0) {
      w.food = 0;
      w.morale -= MORALE_PARTY.starvingLoss;
      this.note('斷糧，士氣大跌');
    } else {
      w.morale = Math.min(100, w.morale + MORALE_PARTY.dailyRegen);
    }

    if ((day - 1) % TIME.daysPerWeek === 0) {
      const wage = partyWage(r);
      if (r.infiniteGold) {
        this.note(`發餉 ${wage} 金`);
      } else if (r.gold >= wage) {
        r.gold -= wage;
        w.unpaid = 0;
        this.note(`發餉 ${wage} 金`);
      } else {
        w.unpaid++;
        w.morale -= MORALE_PARTY.unpaidLoss;
        this.note(`欠餉 ${wage} 金，軍心不穩`);
      }
    }

    w.morale = Math.max(0, w.morale);
    if (w.morale < MORALE_PARTY.desertBelow) this.desert();
  }

  private desert() {
    const r = this.roster;
    const list = r.soldiers.filter((s) => rarityOf(UNITS[s.unit]) === 'common' || rarityOf(UNITS[s.unit]) === 'fine');
    if (!list.length) return;
    const s = list[Math.floor(Math.random() * list.length)];
    r.soldiers = r.soldiers.filter((x) => x !== s);
    this.note(`${UNITS[s.unit].name} 當咗逃兵`);
  }

  private move(dt: number): WorldEvent | null {
    const w = this.save;
    let budget = this.partySpeed() * dt;
    while (budget > 0 && this.path.length) {
      const next = this.path[0];
      const cost = this.terrain.cost(next.x, next.y);
      const dx = next.x - w.x;
      const dy = next.y - w.y;
      const dist = Math.hypot(dx, dy);
      const step = budget / cost;
      if (dist <= step) {
        w.x = next.x;
        w.y = next.y;
        budget -= dist * cost;
        this.path.shift();
      } else {
        w.x += (dx / dist) * step;
        w.y += (dy / dist) * step;
        budget = 0;
      }
    }
    for (const p of PLACES) {
      if (p.hidden && !w.discovered.includes(p.id) && Math.hypot(p.x - w.x, p.y - w.y) < this.vision * 0.5) {
        w.discovered.push(p.id);
        this.note(`發現隱藏地點：${p.name}`);
      }
    }
    if (!this.path.length && this.destination) {
      const place = this.destination;
      this.destination = null;
      return { type: 'place', place };
    }
    return null;
  }

  private spawnBandit() {
    const w = this.save;
    if (w.bandits.length >= BANDIT.maxParties) return;
    for (let tries = 0; tries < 30; tries++) {
      const x = 4 + Math.floor(Math.random() * (MAP.width - 8));
      const y = 4 + Math.floor(Math.random() * (MAP.height - 8));
      if (!this.terrain.passable(x, y) || Math.hypot(x - w.x, y - w.y) < this.vision) continue;
      if (PLACES.some((p) => p.kind === 'town' && Math.hypot(p.x - x, p.y - y) < 12)) continue;
      const day = dayOf(w);
      w.bandits.push({
        id: w.nextBandit++, x, y, tx: x, ty: y,
        size: Math.min(BANDIT.sizeMax, Math.round(BANDIT.baseSize + day * BANDIT.sizePerDay + Math.random() * 4)),
        level: Math.min(BANDIT.levelMax, 1 + Math.floor(day / BANDIT.daysPerLevel)),
      });
      return;
    }
  }

  private updateBandits(dt: number): WorldEvent | null {
    const w = this.save;
    const mine = rosterPower(this.roster);
    this.graceT = Math.max(0, this.graceT - dt);
    for (const b of w.bandits) {
      const dist = Math.hypot(b.x - w.x, b.y - w.y);
      if (dist < PARTY.encounterDist && this.graceT <= 0) {
        this.graceT = BANDIT.graceSeconds;
        return { type: 'bandit', bandit: b };
      }
      const weak = armyPower(banditArmy(b), b.level) < mine * BANDIT.fleeRatio;
      let mx = b.tx - b.x;
      let my = b.ty - b.y;
      if (dist < BANDIT.chaseDist) {
        const sign = weak ? -1 : 1;
        mx = (w.x - b.x) * sign;
        my = (w.y - b.y) * sign;
      } else if (Math.hypot(mx, my) < 1) {
        b.tx = b.x + (Math.random() - 0.5) * 30;
        b.ty = b.y + (Math.random() - 0.5) * 30;
      }
      const len = Math.hypot(mx, my) || 1;
      const nx = b.x + (mx / len) * BANDIT.speed * dt;
      const ny = b.y + (my / len) * BANDIT.speed * dt;
      if (this.terrain.passable(Math.round(nx), Math.round(ny))) {
        b.x = nx;
        b.y = ny;
      } else {
        b.tx = b.x;
        b.ty = b.y;
      }
    }
    return null;
  }

  removeBandit(b: BanditParty) {
    this.save.bandits = this.save.bandits.filter((x) => x !== b);
  }

  /** 逃跑成功機率：比賊快就穩陣啲 */
  escapeChance(): number {
    return Math.min(0.95, BANDIT.escapeBase + (this.partySpeed() - BANDIT.speed) * 0.25);
  }

  /** 逃跑成功：退開少少，避免即刻再撞 */
  escape(b: BanditParty) {
    const w = this.save;
    const dx = b.x - w.x || 1;
    const dy = b.y - w.y;
    const len = Math.hypot(dx, dy) || 1;
    b.x += (dx / len) * 8;
    b.y += (dy / len) * 8;
    if (!this.terrain.passable(Math.round(b.x), Math.round(b.y))) this.removeBandit(b);
  }

  markCleared(p: PlaceDef) {
    this.save.clearedUntil[p.id] = dayOf(this.save) + (p.respawnDays ?? 15);
  }

  winMorale(win: boolean) {
    const w = this.save;
    w.morale = Math.max(0, Math.min(100, w.morale + (win ? MORALE_PARTY.winGain : -MORALE_PARTY.loseLoss)));
  }
}
