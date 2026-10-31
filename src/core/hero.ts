import {
  ARMORS, COMPANIONS, HERO, HORSE_PRICE, SKILL_ORDER, WEAPON_PRICE, type ArmorDef, type ArmorSlot, type AttrId, type SkillId,
} from '../data/economy';
import { HORSES, type HorseDef } from '../data/horses';
import { PLAYER_UNIT, type UnitDef } from '../data/units';
import type { Soldier } from './roster';

export interface Hero {
  level: number;
  xp: number;
  attrPoints: number;
  skillPoints: number;
  attrs: Record<AttrId, number>;
  skills: Record<SkillId, number>;
  weapons: string[];
  horses: string[];
  armors: string[];
  equip: Partial<Record<ArmorSlot, string>>;
  horse: string;
  loadout: string[];
}

export function newHero(): Hero {
  const s = HERO.startAttr;
  const h: Hero = {
    level: 1, xp: 0, attrPoints: 3, skillPoints: 4,
    attrs: { str: s, agi: s, int: s, cha: s },
    skills: Object.fromEntries(SKILL_ORDER.map((k) => [k, 0])) as Record<SkillId, number>,
    weapons: [...HERO.startWeapons], horses: [HERO.startHorse], armors: [...HERO.startArmor],
    equip: {}, horse: HERO.startHorse, loadout: [...HERO.startLoadout],
  };
  h.equip.body = HERO.startArmor[0];
  return h;
}

export const heroXpNeed = (level: number) => Math.round(HERO.xpBase * HERO.xpGrowth ** (level - 1));

/** 加經驗，回傳升咗幾多級 */
export function gainHeroXp(h: Hero, xp: number): number {
  h.xp += xp;
  let ups = 0;
  while (h.xp >= heroXpNeed(h.level)) {
    h.xp -= heroXpNeed(h.level);
    h.level++;
    ups++;
    h.attrPoints += HERO.attrPerLevel;
    h.skillPoints += HERO.skillPerLevel + (Math.random() < h.attrs.int * HERO.intSkillBonus ? 1 : 0);
  }
  return ups;
}

/** 技能連同伴加成 */
export function skillOf(h: Hero, soldiers: Soldier[], id: SkillId): number {
  let bonus = 0;
  for (const c of COMPANIONS) {
    if (c.skill === id && soldiers.some((s) => s.unit === c.unit)) bonus = Math.max(bonus, c.bonus);
  }
  return h.skills[id] + bonus;
}

function worn(h: Hero): ArmorDef[] {
  return Object.values(h.equip).map((id) => ARMORS.find((a) => a.id === id)).filter((a): a is ArmorDef => !!a);
}

export function armorValue(h: Hero): number {
  return HERO.armorBase + worn(h).reduce((s, a) => s + a.armor, 0) + h.skills.ironskin;
}

export function armorWeight(h: Hero): number {
  return worn(h).reduce((s, a) => s + a.weight, 0);
}

/** 主角嘅實際屬性 */
export function playerDef(h: Hero): UnitDef {
  const speed = (1 + h.attrs.agi * HERO.speedPerAgi) * (1 - armorWeight(h));
  return {
    ...PLAYER_UNIT,
    hp: HERO.hpBase + h.attrs.str * HERO.hpPerStr,
    armor: armorValue(h),
    walkSpeed: PLAYER_UNIT.walkSpeed * speed,
    runSpeed: PLAYER_UNIT.runSpeed * speed,
    damageMult: 1 + h.attrs.str * HERO.damagePerStr,
    spreadMult: Math.max(0.3, 1 - h.skills.archery * 0.08),
    actionSpeed: 1 + h.attrs.agi * HERO.speedPerAgi,
  };
}

/** 主角騎術影響嘅馬匹 */
export function playerHorse(h: Hero): HorseDef {
  const def = HORSES.find((x) => x.id === h.horse) ?? HORSES[0];
  const mult = 1 + h.skills.riding * 0.03;
  return { ...def, trotSpeed: def.trotSpeed * mult, gallopSpeed: def.gallopSpeed * mult, accel: def.accel * mult };
}

export function partyLimit(h: Hero, soldiers: Soldier[]): number {
  return HERO.limitBase + h.attrs.cha * HERO.limitPerCha + skillOf(h, soldiers, 'leadership') * HERO.limitPerLeadership;
}

export const weaponPrice = (id: string) => WEAPON_PRICE[id] ?? 0;
export const horsePrice = (id: string) => HORSE_PRICE[id] ?? 0;
