import { ARMIES } from '../data/battlefield';
import { CAMPAIGN, GACHA, LEVEL, RARITY, RARITY_ORDER, type Rarity } from '../data/gacha';
import { UNITS, type Role, type UnitDef } from '../data/units';

const SAVE_KEY = 'mb.roster.v1';

/** 一個有自己經驗同等級嘅士兵 */
export interface Soldier {
  id: number;
  unit: string;
  level: number;
  xp: number;
  kills: number;
  /** 留喺候補，唔出戰 */
  benched: boolean;
}

export interface Roster {
  gold: number;
  nextId: number;
  soldiers: Soldier[];
  /** 距離上次抽到英雄嘅抽數 */
  pity: number;
  wins: number;
  battles: number;
}

export interface BattleOutcome {
  soldier: Soldier;
  xp: number;
  kills: number;
  /** 陣亡（受傷同潰逃都唔算） */
  dead: boolean;
}

export interface LevelUp {
  name: string;
  level: number;
}

export interface BattleProgress {
  gold: number;
  levelUps: LevelUp[];
  lost: string[];
  refilled: number;
}

export interface DrawResult {
  unit: UnitDef;
  rarity: Rarity;
  soldier: Soldier | null;
  refund: number;
}

export const rarityOf = (def: UnitDef): Rarity => def.rarity ?? 'common';

function addSoldier(r: Roster, unit: string): Soldier {
  const s: Soldier = { id: r.nextId++, unit, level: 1, xp: 0, kills: 0, benched: false };
  r.soldiers.push(s);
  return s;
}

export function newRoster(): Roster {
  const r: Roster = { gold: CAMPAIGN.startGold, nextId: 1, soldiers: [], pity: 0, wins: 0, battles: 0 };
  for (const entry of ARMIES[0]) for (let i = 0; i < entry.count; i++) addSoldier(r, entry.unit);
  return r;
}

export function loadRoster(): Roster {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const r = JSON.parse(raw) as Roster;
      r.soldiers = r.soldiers.filter((s) => UNITS[s.unit]);
      return r;
    }
  } catch {
    // 私密模式或者存檔壞咗，就由頭開始
  }
  return newRoster();
}

export function saveRoster(r: Roster) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(r));
  } catch {
    // 寫唔到都照玩，只係下次要由頭
  }
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

/** 排序：稀有度高、等級高行先 */
function byStrength(a: Soldier, b: Soldier): number {
  const ra = RARITY_ORDER.indexOf(rarityOf(UNITS[a.unit]));
  const rb = RARITY_ORDER.indexOf(rarityOf(UNITS[b.unit]));
  return rb - ra || b.level - a.level || a.id - b.id;
}

export function sortedSoldiers(r: Roster): Soldier[] {
  return [...r.soldiers].sort(byStrength);
}

/** 今場出戰名單 */
export function deployment(r: Roster): Soldier[] {
  return sortedSoldiers(r).filter((s) => !s.benched).slice(0, CAMPAIGN.deployMax);
}

export function roleCounts(list: Soldier[]): Record<Role, number> {
  const c: Record<Role, number> = { infantry: 0, archer: 0, cavalry: 0 };
  for (const s of list) c[UNITS[s.unit].role]++;
  return c;
}

export function enemyLevel(r: Roster): number {
  return Math.min(CAMPAIGN.enemyLevelMax, 1 + Math.floor(r.wins / CAMPAIGN.winsPerEnemyLevel));
}

function poolOf(rarity: Rarity): UnitDef[] {
  return Object.values(UNITS).filter((u) => rarityOf(u) === rarity);
}

function rollRarity(): Rarity {
  let roll = Math.random();
  for (const k of RARITY_ORDER) {
    roll -= RARITY[k].rate;
    if (roll < 0) return k;
  }
  return 'common';
}

function grant(r: Roster, rarity: Rarity): DrawResult {
  const pool = poolOf(rarity);
  const unit = pool[Math.floor(Math.random() * pool.length)];
  if (unit.hero && r.soldiers.some((s) => s.unit === unit.id)) {
    r.gold += GACHA.duplicateHeroRefund;
    return { unit, rarity, soldier: null, refund: GACHA.duplicateHeroRefund };
  }
  return { unit, rarity, soldier: addSoldier(r, unit.id), refund: 0 };
}

/** 抽卡；十連保底至少一張精良 */
export function draw(r: Roster, count: 1 | 10): DrawResult[] | null {
  const cost = count === 10 ? GACHA.tenCost : GACHA.cost;
  if (r.gold < cost) return null;
  r.gold -= cost;
  const rarities: Rarity[] = [];
  for (let i = 0; i < count; i++) {
    r.pity++;
    const rarity: Rarity = r.pity >= GACHA.pity ? 'hero' : rollRarity();
    if (rarity === 'hero') r.pity = 0;
    rarities.push(rarity);
  }
  if (count === 10 && !rarities.some((x) => x !== 'common')) rarities[9] = 'fine';
  const out = rarities.map((k) => grant(r, k));
  saveRoster(r);
  return out;
}

/** 戰後結算：加經驗、升級、除名、補新兵，再存檔 */
export function applyBattle(r: Roster, outcomes: BattleOutcome[], gold: number, win: boolean): BattleProgress {
  const levelUps: LevelUp[] = [];
  const lost: string[] = [];
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
    s.kills += o.kills;
    s.xp += o.xp + LEVEL.xpBattle + (win ? LEVEL.xpWin : 0);
    const before = s.level;
    while (s.level < LEVEL.max && s.xp >= xpToNext(s.level)) {
      s.xp -= xpToNext(s.level);
      s.level++;
    }
    if (s.level >= LEVEL.max) s.xp = 0;
    if (s.level > before) levelUps.push({ name: def.name, level: s.level });
  }

  let refilled = 0;
  while (r.soldiers.length < CAMPAIGN.minRoster) {
    addSoldier(r, CAMPAIGN.refillUnit);
    refilled++;
  }
  saveRoster(r);
  return { gold, levelUps, lost, refilled };
}
