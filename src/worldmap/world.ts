import type { ArmyEntry } from '../data/battlefield';
import { BANDIT, MAP, MAP_SCALE, MORALE_PARTY, PARTY, PLACES, SHOP, TIME, type PlaceDef } from '../data/world';
import { CAPTIVE, COMPANION_FEUD, EXPEDITION, EXPEDITION_POST, GOODS, GOOD_ORDER, LOCAL, MARKET, NPC_RULES, TOWN_TRADE, WORKSHOPS, type GoodId } from '../data/economy';
import { POLITICS, WORLD_EVENTS } from '../data/factions';
import type { StoryEvent } from '../data/quests';
import { rollEvent } from '../quests/events';
import { expireQuests, type Quest } from '../quests/quests';
import { HONOR } from '../data/honor';
import { Politics, migratePolitics, newPolitics, type PoliticsSave } from '../politics/politics';
import { NpcSystem, type Npc } from './npcs';
import { UNITS } from '../data/units';
import { CALAMITY } from '../data/tomb';
import { CAMPAIGN } from '../data/gacha';
import {
  armyPower, partyFood, partyWage, rarityOf, rosterPower, type Roster,
  addXp, sortedSoldiers,
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
  npcs: Npc[];
  /** 城鎮 → 貨物存量 */
  stock: Record<string, Record<GoodId, number>>;
  /** 各地存糧增減：農民運到就加，買走就減 */
  townFood: Record<string, number>;
  /** 各地金庫 */
  treasury: Record<string, number>;
  /** 俘虜（兵種 id） */
  captives: string[];
  cargo: Record<GoodId, number>;
  /** 村莊 → 第幾日先修復 */
  burnedUntil: Record<string, number>;
  nextRaid: number;
  /** 城鎮 → 作坊 id */
  workshops: Record<string, string>;
  /** 城鎮 → 第幾日可以再比武 */
  arenaUntil: Record<string, number>;
  arenaWins: number;
  mapVersion?: number;
  /** 大墳墓打到第幾層 */
  tombFloor: number;
  nextWitch: number;
  nextWyrm: number;
  /** 第幾日先有下一屆錦標賽 */
  tournamentUntil?: number;
  /** 遠征隊幾時返 */
  expeditionUntil?: number;
  pol: PoliticsSave;
  nextDragon: number;
  scenario: string;
  quests: Quest[];
  questsDone: number;
  endingSeen?: boolean;
}

const isVillage = (id: string) => PLACES.find((p) => p.id === id)?.kind === 'village';

function stockTarget(id: string, g: GoodId): number {
  const t = TOWN_TRADE[id];
  const base = t.makes.includes(g) ? MARKET.stockMakes : t.needs.includes(g) ? MARKET.stockNeeds : MARKET.stockNormal;
  return isVillage(id) ? base * LOCAL.villageStock : base;
}

const baseGold = (id: string) => (isVillage(id) ? LOCAL.villageGold : LOCAL.townGold);

/** 舊存檔補上新欄位 */
export function migrateWorld(w: WorldSave): WorldSave {
  // 舊存檔：座標跟新地圖放大，路上嘅隊伍重新生成
  if (w.bandits && !w.mapVersion) {
    w.x = Math.round(w.x * MAP_SCALE);
    w.y = Math.round(w.y * MAP_SCALE);
    w.npcs = [];
    w.bandits = [];
  }
  w.mapVersion = 2;
  w.tombFloor ??= 0;
  w.nextWitch ??= CALAMITY.witch.firstDay;
  w.nextWyrm ??= CALAMITY.wyrm.firstDay;
  w.npcs ??= [];
  w.stock ??= {};
  w.treasury ??= {};
  w.townFood ??= {};
  w.captives ??= [];
  w.cargo ??= {} as Record<GoodId, number>;
  for (const g of GOOD_ORDER) w.cargo[g] ??= 0;
  for (const id of Object.keys(TOWN_TRADE)) {
    w.stock[id] ??= {} as Record<GoodId, number>;
    for (const g of GOOD_ORDER) w.stock[id][g] ??= stockTarget(id, g);
    w.treasury[id] ??= baseGold(id);
  }
  w.burnedUntil ??= {};
  w.nextRaid ??= 4;
  w.workshops ??= {};
  w.arenaUntil ??= {};
  w.arenaWins ??= 0;
  w.pol = migratePolitics(w.pol ?? newPolitics());
  w.nextDragon ??= NPC_RULES.dragonFirstDay;
  w.scenario ??= 'chaos';
  w.quests ??= [];
  w.questsDone ??= 0;
  return w;
}

export function newWorld(): WorldSave {
  const start = PLACES[0];
  return migrateWorld({
    x: start.x + 3, y: start.y + 2, hours: 8, food: CAMPAIGN.startFood, morale: MORALE_PARTY.start, bandits: [], nextBandit: 1,
    clearedUntil: {}, discovered: [], recruitedUntil: {}, unpaid: 0, log: [],
  } as unknown as WorldSave);
}

export type WorldEvent =
  | { type: 'place'; place: PlaceDef }
  | { type: 'bandit'; bandit: BanditParty }
  | { type: 'npc'; npc: Npc }
  | { type: 'story'; event: StoryEvent }
  | { type: 'hunted'; npc: Npc };

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
  /** 跟緊邊隊 NPC */
  private chasing: number | null = null;
  private rechase = 0;
  private pendingStory: StoryEvent | null = null;
  private hunterGrace = 0;
  readonly npcs: NpcSystem;
  readonly politics: Politics;

  constructor(public save: WorldSave, public roster: Roster) {
    migrateWorld(save);
    this.politics = new Politics(save.pol, (t) => this.note(t));
    this.npcs = new NpcSystem(save, this.terrain, (t) => this.note(t), () => dayOf(this.save));
    this.npcs.refill();
  }

  /** 行去 NPC 嗰度 */
  chase(n: Npc) {
    this.chasing = n.id;
    this.rechase = 0;
    this.goTo(n.x, n.y, null);
    this.chasing = n.id;
  }

  get vision(): number {
    return isNight(this.save) ? TIME.nightVision : TIME.dayVision;
  }

  partySpeed(): number {
    // 全軍都要行，連候補同傷兵都計
    const list = this.roster.soldiers;
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
    this.chasing = null;
    this.paused = false;
    return true;
  }

  get moving(): boolean {
    return this.path.length > 0 && !this.paused;
  }

  /** 推進時間；回傳新事件 */
  update(dt: number): WorldEvent | null {
    if (!this.moving && this.chasing === null) return null;
    if (this.paused) return null;
    this.advanceTime(dt);
    this.npcs.update(dt, this.save.bandits);
    if (this.pendingStory) {
      const event = this.pendingStory;
      this.pendingStory = null;
      return { type: 'story', event };
    }
    const hunter = this.checkHunters(dt);
    if (hunter) return hunter;
    return this.updateChase(dt) ?? this.move(dt) ?? this.updateBandits(dt);
  }

  /** 通緝：官兵行埋嚟就截住你 */
  private checkHunters(dt: number): WorldEvent | null {
    this.hunterGrace = Math.max(0, this.hunterGrace - dt);
    if (this.hunterGrace > 0) return null;
    const w = this.save;
    for (const n of w.npcs) {
      if (n.kind !== 'patrol' || !this.npcs.isHunting(n)) continue;
      if (Math.hypot(n.x - w.x, n.y - w.y) < NPC_RULES.contactDist * 1.2) {
        this.hunterGrace = BANDIT.graceSeconds;
        return { type: 'hunted', npc: n };
      }
    }
    return null;
  }

  private updateChase(dt: number): WorldEvent | null {
    if (this.chasing === null) return null;
    const n = this.save.npcs.find((x) => x.id === this.chasing);
    if (!n) {
      this.chasing = null;
      return null;
    }
    const w = this.save;
    if (Math.hypot(n.x - w.x, n.y - w.y) < NPC_RULES.contactDist * 1.3) {
      this.chasing = null;
      this.path = [];
      return { type: 'npc', npc: n };
    }
    this.rechase -= dt;
    if (this.rechase <= 0) {
      this.rechase = 0.8;
      const id = this.chasing;
      this.path = this.terrain.path(w.x, w.y, n.x, n.y) ?? this.path;
      this.chasing = id;
    }
    return null;
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

  note(text: string) {
    this.save.log.unshift(`第 ${dayOf(this.save)} 日：${text}`);
    this.save.log.length = Math.min(this.save.log.length, 6);
  }

  private newDay(day: number) {
    const w = this.save;
    const r = this.roster;
    for (const s of r.soldiers) if (s.hurtDays > 0) s.hurtDays--;
    this.driftMarkets();
    if (day % NPC_RULES.refillEvery === 0) this.npcs.refill();
    this.politics.daily(day);
    if (day % POLITICS.thinkEvery === 0) this.politics.think(day);
    if (day % WORLD_EVENTS.everyDays === 0) this.worldEvent();
    expireQuests(this, day);
    this.pendingStory ??= rollEvent(this, day);
    r.gold += this.politics.dailyPay();

    w.food -= partyFood(r);
    if (w.food <= 0) {
      w.food = 0;
      w.morale -= MORALE_PARTY.starvingLoss;
      this.note('斷糧，士氣大跌');
    } else {
      w.morale = Math.min(100, w.morale + MORALE_PARTY.dailyRegen);
    }

    if ((day - 1) % TIME.daysPerWeek === 0) {
      const income = this.workshopIncome() + this.politics.fiefIncome();
      if (income) {
        r.gold += income;
        this.note(`作坊同領地收入 ${income} 金`);
      }
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

    this.companionFeud();
    if (w.expeditionUntil && day >= w.expeditionUntil) this.expeditionBack();
    for (const s of r.soldiers) {
      if (s.post && s.post !== EXPEDITION_POST && !w.pol.governors[s.post]) {
        s.post = undefined;
        s.hurtDays = POLITICS.governorHurtDays;
        this.note(`${UNITS[s.unit].name}失守領地，帶傷歸隊`);
      }
    }
    w.morale = Math.max(0, w.morale);
    if (w.morale < MORALE_PARTY.desertBelow) this.desert();
    else if (w.pol.loyalty < HONOR.desertLoyalty && Math.random() < HONOR.desertChance) this.desert();
  }

  /** 英雄帶隊出發，回傳出發人數 */
  startExpedition(): number {
    const r = this.roster;
    const free = sortedSoldiers(r).filter((s) => !s.post && !s.benched && s.hurtDays <= 0);
    const leader = free.find((s) => ['special', 'hero'].includes(rarityOf(UNITS[s.unit])));
    if (!leader || this.save.expeditionUntil) return 0;
    const team = [leader, ...free.filter((s) => s !== leader).reverse()].slice(0, EXPEDITION.size);
    for (const s of team) s.post = EXPEDITION_POST;
    this.save.expeditionUntil = dayOf(this.save) + EXPEDITION.days;
    this.note(`${UNITS[leader.unit].name}帶 ${team.length} 人出發遠征`);
    return team.length;
  }

  private expeditionBack() {
    const r = this.roster;
    this.save.expeditionUntil = undefined;
    const team = r.soldiers.filter((s) => s.post === EXPEDITION_POST);
    const gold = team.length * EXPEDITION.goldPerMan;
    r.gold += gold;
    let lost = 0;
    for (const s of team) {
      s.post = undefined;
      addXp(s, EXPEDITION.xpEach);
      if (rarityOf(UNITS[s.unit]) === 'common' && Math.random() < EXPEDITION.loseChance) {
        r.soldiers.splice(r.soldiers.indexOf(s), 1);
        lost++;
      } else if (Math.random() < EXPEDITION.hurtChance) {
        s.hurtDays = EXPEDITION.hurtDays;
      }
    }
    this.note(`遠征隊返嚟，帶回 ${gold} 金${lost ? `，折咗 ${lost} 人` : ''}`);
  }

  /** 唔夾嘅同伴嗌交 */
  private companionFeud() {
    const r = this.roster;
    for (const [a, b] of COMPANION_FEUD.pairs) {
      const one = r.soldiers.find((s) => s.unit === a);
      const two = r.soldiers.find((s) => s.unit === b);
      if (!one || !two || Math.random() >= COMPANION_FEUD.chance) continue;
      this.save.morale -= COMPANION_FEUD.morale;
      if (Math.random() < COMPANION_FEUD.leaveChance) {
        r.soldiers.splice(r.soldiers.indexOf(one), 1);
        this.note(`${UNITS[a].name}受唔住${UNITS[b].name}，離隊走咗`);
      } else {
        this.note(`${UNITS[a].name}同${UNITS[b].name}大嗌交，士氣下跌`);
      }
    }
  }

  private worldEvent() {
    if (Math.random() < WORLD_EVENTS.kingDeathChance) this.politics.kingDies();
    if (Math.random() < WORLD_EVENTS.warlordChance) {
      const w = this.save;
      const before = w.bandits.length;
      this.spawnBandit();
      const b = w.bandits[before];
      if (b) {
        b.size = WORLD_EVENTS.warlordSize;
        b.level = WORLD_EVENTS.warlordLevel;
        this.note('大型山賊軍團出現，各地告急！');
      }
    }
  }

  private driftMarkets() {
    const w = this.save;
    for (const [id, stock] of Object.entries(w.stock)) {
      for (const g of GOOD_ORDER) stock[g] += (stockTarget(id, g) - stock[g]) * MARKET.dailyDrift;
      w.townFood[id] = (w.townFood[id] ?? 0) * 0.8;
      w.treasury[id] += (baseGold(id) - w.treasury[id]) * LOCAL.goldDrift;
    }
    this.captivesEscape();
  }

  /** 俘虜夜晚走佬 */
  private captivesEscape() {
    const w = this.save;
    const stay = w.captives.filter(() => Math.random() > CAPTIVE.escapeChance);
    const gone = w.captives.length - stay.length;
    if (gone) this.note(`${gone} 個俘虜走甩咗`);
    w.captives = stay;
  }

  /** 每週作坊收入：當地貨物愈貴賺愈多 */
  workshopIncome(): number {
    const w = this.save;
    let sum = 0;
    for (const [town, id] of Object.entries(w.workshops)) {
      const def = WORKSHOPS.find((x) => x.id === id);
      if (def) sum += Math.round(def.income * (this.goodPrice(town, def.good) / GOODS[def.good].base));
    }
    return sum;
  }

  /** 而家市價 */
  goodPrice(town: string, g: GoodId): number {
    // 以普通存貨做基準，特產地自然平、短缺地自然貴
    const ratio = 1 + ((MARKET.stockNormal - this.save.stock[town][g]) / MARKET.stockNormal) * MARKET.priceSwing;
    return Math.round(GOODS[g].base * Math.min(MARKET.priceMax, Math.max(MARKET.priceMin, ratio)));
  }

  /** 糧價：當地糧多就平，買走咗就貴 */
  foodPrice(place: string): number {
    const base = SHOP.foodPrice * (isVillage(place) ? LOCAL.villageFood : 1);
    const ratio = 1 - (this.save.townFood[place] ?? 0) * LOCAL.foodSwing;
    return base * Math.min(LOCAL.foodPriceMax, Math.max(LOCAL.foodPriceMin, ratio));
  }

  /** 總載重：貨物加糧 */
  cargoCount(): number {
    const goods = GOOD_ORDER.reduce((s, g) => s + this.save.cargo[g] * GOODS[g].weight, 0);
    return Math.round(goods + this.save.food * LOCAL.foodWeight);
  }

  cargoCap(): number {
    return MARKET.cargoBase + this.roster.soldiers.length * MARKET.cargoPerSoldier;
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
      const outlaw = w.pol.outlaw;
      if (dist < PARTY.encounterDist && this.graceT <= 0 && !outlaw) {
        this.graceT = BANDIT.graceSeconds;
        return { type: 'bandit', bandit: b };
      }
      const weak = armyPower(banditArmy(b), b.level) < mine * BANDIT.fleeRatio
        || b.size < this.roster.soldiers.length * BANDIT.fleeSizeRatio;
      let mx = b.tx - b.x;
      let my = b.ty - b.y;
      const prey = this.npcs.preyFor(b);
      const threat = this.nearestThreat(b, weak && !outlaw);
      if (threat) {
        // 細隊山賊避開大軍
        mx = b.x - threat.x;
        my = b.y - threat.y;
      } else if (prey && dist >= BANDIT.chaseDist) {
        // 山賊會去劫商隊同農民，唔係亂行
        mx = prey.x - b.x;
        my = prey.y - b.y;
        if (Math.hypot(mx, my) < NPC_RULES.contactDist) this.npcs.robbed(prey);
      } else if (dist < BANDIT.chaseDist && !outlaw) {
        mx = w.x - b.x;
        my = w.y - b.y;
      } else if (Math.hypot(mx, my) < 1) {
        b.tx = b.x + (Math.random() - 0.5) * 30;
        b.ty = b.y + (Math.random() - 0.5) * 30;
      }
      this.stepBandit(b, mx, my, dt);
    }
    return null;
  }

  /** 最近要避嘅大軍：玩家或者比佢大嘅巡邏隊 */
  private nearestThreat(b: BanditParty, weakToPlayer: boolean): { x: number; y: number } | null {
    const w = this.save;
    let best: { x: number; y: number } | null = null;
    let bestD: number = BANDIT.fleeSight;
    const consider = (x: number, y: number) => {
      const d = Math.hypot(x - b.x, y - b.y);
      if (d < bestD) {
        bestD = d;
        best = { x, y };
      }
    };
    if (weakToPlayer) consider(w.x, w.y);
    for (const n of w.npcs) {
      if ((n.kind === 'patrol' || n.kind === 'raider') && b.size < n.size * BANDIT.fleeSizeRatio) consider(n.x, n.y);
    }
    return best;
  }

  /** 行一步；撞牆就試下斜行，避免逃跑時卡住 */
  private stepBandit(b: BanditParty, mx: number, my: number, dt: number) {
    const speed = BANDIT.speed * Math.max(0.5, 1 - b.size * BANDIT.sizeSlow) * dt;
    const base = Math.atan2(my, mx);
    for (const turn of [0, 0.7, -0.7, 1.4, -1.4]) {
      const nx = b.x + Math.cos(base + turn) * speed;
      const ny = b.y + Math.sin(base + turn) * speed;
      if (this.terrain.passable(Math.round(nx), Math.round(ny))) {
        b.x = nx;
        b.y = ny;
        return;
      }
    }
    b.tx = b.x;
    b.ty = b.y;
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
