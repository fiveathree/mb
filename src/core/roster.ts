import type { ArmyEntry } from '../data/battlefield';
import { CAMPAIGN, GACHA, LEVEL, POOL_ORDER, RARITY, RARITY_ORDER, type PoolId, type Rarity } from '../data/gacha';
import { RACES, UPKEEP, type Race } from '../data/races';
import { currentScenario } from '../data/scenarios';
import { PROMOTION, UPGRADES } from '../data/economy';
import { UNITS, type Role, type UnitDef } from '../data/units';
import { migrateHero, newHero, partyLimit, skillOf, type Gear, type Hero } from './hero';

const AUTO_PLAYER_POWER = 8;

/** 一個有自己經驗同等級嘅士兵 */
export interface Soldier {
  id: number;
  unit: string;
  level: number;
  xp: number;
  kills: number;
  /** 留喺候補，唔出戰 */
  benched: boolean;
  /** 派駐緊邊塊領地 */
  post?: string;
  /** 仲要休養幾多日 */
  hurtDays: number;
  /** 英雄自己嘅裝備 */
  gear?: Gear;
}

export interface Roster {
  hero: Hero;
  gold: number;
  /** 密令：無限金幣 */
  infiniteGold: boolean;
  nextId: number;
  soldiers: Soldier[];
  tickets: Record<PoolId, number>;
  /** 每個卡池距離上次英雄嘅抽數 */
  pity: Record<PoolId, number>;
  wins: number;
  battles: number;
}

export interface BattleOutcome {
  soldier: Soldier;
  xp: number;
  kills: number;
  /** 陣亡（受傷同潰逃都唔算） */
  dead: boolean;
  wounded: boolean;
}

export interface LevelUp {
  name: string;
  level: number;
}

export interface BattleProgress {
  gold: number;
  levelUps: LevelUp[];
  lost: string[];
  hurt: number;
}

export interface DrawResult {
  unit: UnitDef;
  rarity: Rarity;
  soldier: Soldier | null;
  refund: number;
}

export const rarityOf = (def: UnitDef): Rarity => def.rarity ?? 'common';
/** SR 或以上，做得守將同帶隊 */
export const isElite = (def: UnitDef) => CAMPAIGN.protectedRarities.includes(rarityOf(def));
/** 名前嘅冠位 */
export const rankTag = (def: UnitDef) => `[${RARITY[rarityOf(def)].name}]`;
export const raceOf = (def: UnitDef): Race => def.race ?? 'human';

export function addSoldier(r: Roster, unit: string): Soldier {
  const s: Soldier = { id: r.nextId++, unit, level: 1, xp: 0, kills: 0, benched: false, hurtDays: 0 };
  r.soldiers.push(s);
  return s;
}

export function newRoster(): Roster {
  const counts = () => Object.fromEntries(POOL_ORDER.map((p) => [p, 0])) as Record<PoolId, number>;
  const r: Roster = {
    hero: newHero(), gold: CAMPAIGN.startGold, infiniteGold: false, nextId: 1, soldiers: [], tickets: counts(), pity: counts(), wins: 0, battles: 0,
  };
  r.tickets.human = CAMPAIGN.startTickets;
  for (const entry of CAMPAIGN.startArmy) for (let i = 0; i < entry.count; i++) addSoldier(r, entry.unit);
  return r;
}

/** 舊存檔補上新欄位 */
export function migrateRoster(r: Roster): Roster {
  r.hero = migrateHero(r.hero ?? newHero());
  return r;
}

export function canAfford(r: Roster, cost: number): boolean {
  return r.infiniteGold || r.gold >= cost;
}

/** 扣金幣；金幣不足回傳 false */
export function spend(r: Roster, cost: number): boolean {
  if (!canAfford(r, cost)) return false;
  if (!r.infiniteGold) r.gold -= cost;
  return true;
}

/** 輸入密令；回傳提示文字，密令唔啱回傳 null */
export function applyCheat(r: Roster, code: string): string | null {
  if (code.trim().toLowerCase() !== CAMPAIGN.cheatCode) return null;
  r.infiniteGold = true;
  return '密令生效：金幣無限';
}

export function xpToNext(level: number): number {
  return Math.round(LEVEL.xpBase * LEVEL.xpGrowth ** (level - 1));
}

/** 按等級計出呢個士兵嘅實際屬性 */
export function levelDef(def: UnitDef, level: number): UnitDef {
  const n = level - 1;
  return {
    ...def,
    hp: Math.round(def.hp * (1 + n * LEVEL.hpPerLevel)),
    armor: def.armor + n * LEVEL.armorPerLevel,
    morale: def.morale + n * LEVEL.moralePerLevel,
    blockSkill: Math.min(0.95, def.blockSkill + n * LEVEL.blockPerLevel),
    damageMult: 1 + n * LEVEL.damagePerLevel,
  };
}

/** 呢個兵種每日食幾多 */
export function foodOf(def: UnitDef): number {
  return UPKEEP.foodPerDay * RACES[raceOf(def)].food + (def.horse ? UPKEEP.horseFoodPerDay : 0);
}

/** 呢個兵種每週工資 */
export function wageOf(def: UnitDef): number {
  return Math.round(def.tier * UPKEEP.wagePerTier * RACES[raceOf(def)].wage + (def.horse ? UPKEEP.horseWage : 0));
}

export function partyFood(r: Roster): number {
  return r.soldiers.reduce((sum, s) => sum + foodOf(UNITS[s.unit]), 0);
}

export function partyWage(r: Roster): number {
  const discount = 1 - skillOf(r.hero, r.soldiers, 'leadership') * 0.03;
  return Math.round(r.soldiers.reduce((sum, s) => sum + wageOf(UNITS[s.unit]), 0) * Math.max(0.5, discount));
}

/** 呢個士兵可以升去邊啲兵種 */
export function promotions(s: Soldier): { to: UnitDef; cost: number }[] {
  if (s.level < PROMOTION.needLevel) return [];
  return (UPGRADES[s.unit] ?? []).map((id) => ({ to: UNITS[id], cost: UNITS[id].tier * PROMOTION.costPerTier }));
}

export function promote(r: Roster, s: Soldier, unit: string): boolean {
  const option = promotions(s).find((p) => p.to.id === unit);
  if (!option || !spend(r, option.cost)) return false;
  s.unit = unit;
  s.level = Math.max(1, s.level - PROMOTION.levelLoss);
  s.xp = 0;
  return true;
}

/** 混種族士氣懲罰 */
export function racePenalty(r: Roster): number {
  const races = new Set(r.soldiers.map((s) => raceOf(UNITS[s.unit])));
  return Math.max(0, races.size - 1) * UPKEEP.mixedRacePenalty;
}

/** 按兵力估戰力，自動結算同 AI 判斷都用 */
export function unitPower(def: UnitDef, level: number): number {
  return def.tier * (1 + (level - 1) * 0.18) * (def.hero ? 2.5 : 1);
}

export function rosterPower(r: Roster): number {
  return deployment(r).reduce((s, x) => s + unitPower(UNITS[x.unit], x.level), 0);
}

export function armyPower(army: ArmyEntry[], level: number): number {
  return army.reduce((s, e) => s + e.count * unitPower(UNITS[e.unit], level), 0);
}

export function armySize(army: ArmyEntry[]): number {
  return army.reduce((s, e) => s + e.count, 0);
}

/** 排序：稀有度高、等級高行先 */
function byStrength(a: Soldier, b: Soldier): number {
  const ra = RARITY_ORDER.indexOf(rarityOf(UNITS[a.unit]));
  const rb = RARITY_ORDER.indexOf(rarityOf(UNITS[b.unit]));
  return rb - ra || b.level - a.level || a.id - b.id;
}

export function sortedSoldiers(r: Roster): Soldier[] {
  return [...r.soldiers].sort(byStrength);
}

/** 今場出戰名單（傷兵同候補唔出） */
export function deployment(r: Roster): Soldier[] {
  const limit = Math.min(CAMPAIGN.deployMax, partyLimit(r.hero, r.soldiers));
  return sortedSoldiers(r).filter((s) => !s.benched && !s.post && s.hurtDays <= 0).slice(0, limit);
}

export function roleCounts(list: Soldier[]): Record<Role, number> {
  const c: Record<Role, number> = { infantry: 0, archer: 0, cavalry: 0, mage: 0 };
  for (const s of list) c[UNITS[s.unit].role]++;
  return c;
}

export function poolUnits(pool: PoolId, rarity: Rarity): UnitDef[] {
  const list = Object.values(UNITS).filter((u) => !u.companion && (u.pool ?? 'human') === pool && rarityOf(u) === rarity);
  if (pool !== 'human') return list;
  // 通用卡池跟劇本：羅馬抽到軍團兵，三國抽到刀盾手
  const { levy, mercs } = currentScenario();
  const local = [...new Set([levy, ...mercs])].map((id) => UNITS[id]).filter((u) => u.pool === 'scenario' && rarityOf(u) === rarity);
  return [...list, ...local];
}

function rollRarity(): Rarity {
  let roll = Math.random();
  for (const k of RARITY_ORDER) {
    roll -= RARITY[k].rate;
    if (roll < 0) return k;
  }
  return 'common';
}

function grant(r: Roster, pool: PoolId, rarity: Rarity): DrawResult {
  // 呢個卡池冇呢個冠位，就退去最接近嗰級
  const from = RARITY_ORDER.indexOf(rarity);
  const near = [...RARITY_ORDER].sort((a, b) => Math.abs(RARITY_ORDER.indexOf(a) - from) - Math.abs(RARITY_ORDER.indexOf(b) - from));
  const list = near.map((k) => poolUnits(pool, k)).find((x) => x.length)!;
  const unit = list[Math.floor(Math.random() * list.length)];
  if (unit.hero && r.soldiers.some((s) => s.unit === unit.id)) {
    r.gold += GACHA.duplicateHeroRefund;
    return { unit, rarity, soldier: null, refund: GACHA.duplicateHeroRefund };
  }
  return { unit, rarity, soldier: addSoldier(r, unit.id), refund: 0 };
}

/** 用招募令抽卡；十連保底至少一張精良 */
export function draw(r: Roster, pool: PoolId, count: 1 | 10): DrawResult[] | null {
  const cost = count === 10 ? GACHA.tenTickets : 1;
  if (r.tickets[pool] < cost) return null;
  r.tickets[pool] -= cost;
  const rarities: Rarity[] = [];
  for (let i = 0; i < count; i++) {
    r.pity[pool]++;
    const rarity: Rarity = r.pity[pool] >= GACHA.pity ? 'hero' : rollRarity();
    if (rarity === 'hero' || rarity === 'ur') r.pity[pool] = 0;
    rarities.push(rarity);
  }
  if (count === 10 && !rarities.some((x) => x !== 'common')) rarities[9] = 'fine';
  return rarities.map((k) => grant(r, pool, k));
}

/** 加經驗同升級，回傳升咗未 */
export function addXp(s: Soldier, xp: number): boolean {
  const before = s.level;
  s.xp += xp;
  while (s.level < LEVEL.max && s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level);
    s.level++;
  }
  if (s.level >= LEVEL.max) s.xp = 0;
  return s.level > before;
}

/** 戰後結算：加經驗、升級、除名、記傷 */
export function applyBattle(r: Roster, outcomes: BattleOutcome[], gold: number, win: boolean): BattleProgress {
  const levelUps: LevelUp[] = [];
  const lost: string[] = [];
  let hurt = 0;
  r.gold += gold;
  r.battles++;
  if (win) r.wins++;

  for (const o of outcomes) {
    const s = o.soldier;
    const def = UNITS[s.unit];
    if (o.dead && !CAMPAIGN.protectedRarities.includes(rarityOf(def))) {
      lost.push(def.name);
      r.soldiers = r.soldiers.filter((x) => x !== s);
      continue;
    }
    if (o.dead || o.wounded) {
      s.hurtDays = Math.max(1, CAMPAIGN.hurtDays - Math.floor(skillOf(r.hero, r.soldiers, 'medicine') / 2));
      hurt++;
    }
    s.kills += o.kills;
    if (addXp(s, o.xp + LEVEL.xpBattle + (win ? LEVEL.xpWin : 0))) levelUps.push({ name: def.name, level: s.level });
  }
  return { gold, levelUps, lost, hurt };
}

/** 自動結算：按戰力比例分勝負同傷亡 */
export function autoResolve(r: Roster, enemy: ArmyEntry[], enemyLevel: number): { win: boolean; outcomes: BattleOutcome[]; gold: number } {
  // 玩家本人都算一份戰力
  const mine = rosterPower(r) + AUTO_PLAYER_POWER;
  const theirs = armyPower(enemy, enemyLevel);
  const ratio = mine / Math.max(theirs, 0.01);
  const win = Math.random() < (ratio * ratio) / (ratio * ratio + 1);
  const lossRate = win ? Math.min(0.4, 0.14 / ratio) : Math.min(0.7, 0.3 + 0.1 / Math.max(ratio, 0.2));
  const outcomes: BattleOutcome[] = deployment(r).map((soldier) => {
    const fell = Math.random() < lossRate;
    const dead = fell && Math.random() > 0.45;
    const kills = win && Math.random() < 0.3 ? 1 : 0;
    return { soldier, xp: kills * LEVEL.xpPerKillTier * 2, kills, dead, wounded: fell && !dead };
  });
  const gold = win ? Math.round(armySize(enemy) * 36 * enemyLevel ** 0.5) : 0;
  return { win, outcomes, gold };
}
