import type { DamageType } from './combat';

export type WeaponModel = 'sword' | 'axe' | 'mace' | 'lance' | 'spear' | 'bow' | 'crossbow' | 'javelin' | 'staff';

export interface RangedDef {
  /** 飛行速度（公尺／秒） */
  speed: number;
  /** 拉滿時散布（度） */
  spreadDeg: number;
  /** 未拉滿時額外散布（度） */
  undrawnSpreadDeg: number;
  /** 全速騎射時額外散布（度） */
  mountedSpreadDeg: number;
  ammo: number;
  /** 未拉滿時傷害最低比例 */
  minDamageMult: number;
}

export interface SpellDef {
  mp: number;
  /** 爆炸半徑 */
  aoe?: number;
  /** 直線飛行，唔受重力 */
  flat?: boolean;
  /** 對自己施放 */
  self?: 'heal' | 'ward';
  /** 治療量或者護盾秒數 */
  power?: number;
}

export interface WeaponDef {
  spell?: SpellDef;
  id: string;
  name: string;
  model: WeaponModel;
  damageType: DamageType;
  baseDamage: number;
  /** 由肩膊計起嘅攻擊距離（公尺） */
  reach: number;
  /** 最短蓄力時間（秒），之前放手會排隊 */
  windupMin: number;
  /** 蓄滿所需時間（秒） */
  chargeFull: number;
  /** 揮動時間（秒） */
  swingTime: number;
  /** 出招後收招時間（秒） */
  recoverTime: number;
  /** 水平揮動嘅弧度（度） */
  arcDeg: number;
  /** 一擊最多命中幾多個目標 */
  cleave: number;
  /** 對盾牌耐久嘅倍率 */
  shieldBreak: number;
  /** 所有方向都變成刺擊 */
  thrustOnly: boolean;
  couchable: boolean;
  hasShield: boolean;
  /** 打騎馬目標嘅傷害倍率 */
  antiCavalry: number;
  /** 持械模型長度（公尺） */
  length: number;
  ranged?: RangedDef;
}

const melee = {
  cleave: 1, shieldBreak: 1, thrustOnly: false, couchable: false, hasShield: false, antiCavalry: 1,
};

const WEAPON_LIST: WeaponDef[] = [
  // ── 玩家近戰 ──
  {
    ...melee, id: 'sword', name: '長劍＋盾', model: 'sword', damageType: 'cut',
    baseDamage: 30, reach: 2.3, windupMin: 0.16, chargeFull: 0.55,
    swingTime: 0.28, recoverTime: 0.26, arcDeg: 120, hasShield: true, length: 1,
  },
  {
    ...melee, id: 'hand_axe', name: '單手斧＋盾', model: 'axe', damageType: 'cut',
    baseDamage: 33, reach: 2.05, windupMin: 0.2, chargeFull: 0.6,
    swingTime: 0.3, recoverTime: 0.32, arcDeg: 110, shieldBreak: 1.8, hasShield: true, length: 0.8,
  },
  {
    ...melee, id: 'mace', name: '釘頭錘＋盾', model: 'mace', damageType: 'blunt',
    baseDamage: 27, reach: 2.05, windupMin: 0.2, chargeFull: 0.6,
    swingTime: 0.3, recoverTime: 0.32, arcDeg: 110, hasShield: true, length: 0.85,
  },
  {
    ...melee, id: 'axe', name: '雙手斧', model: 'axe', damageType: 'cut',
    baseDamage: 44, reach: 2.5, windupMin: 0.26, chargeFull: 0.85,
    swingTime: 0.38, recoverTime: 0.42, arcDeg: 130, cleave: 2, shieldBreak: 2.2, length: 1.25,
  },
  {
    ...melee, id: 'greatsword', name: '雙手大劍', model: 'sword', damageType: 'cut',
    baseDamage: 38, reach: 2.9, windupMin: 0.22, chargeFull: 0.75,
    swingTime: 0.34, recoverTime: 0.36, arcDeg: 140, cleave: 2, length: 1.45,
  },
  {
    ...melee, id: 'lance', name: '騎槍', model: 'lance', damageType: 'pierce',
    baseDamage: 28, reach: 3.6, windupMin: 0.22, chargeFull: 0.7,
    swingTime: 0.3, recoverTime: 0.38, arcDeg: 30, thrustOnly: true, couchable: true, length: 3.4,
  },
  {
    ...melee, id: 'pike', name: '長矛', model: 'spear', damageType: 'pierce',
    baseDamage: 30, reach: 3.3, windupMin: 0.2, chargeFull: 0.6,
    swingTime: 0.28, recoverTime: 0.34, arcDeg: 30, thrustOnly: true, antiCavalry: 1.6, length: 2.8,
  },

  // ── 玩家遠程 ──
  {
    ...melee, id: 'longbow', name: '長弓', model: 'bow', damageType: 'pierce',
    baseDamage: 46, reach: 0, windupMin: 0.2, chargeFull: 1.1,
    swingTime: 0, recoverTime: 0.35, arcDeg: 0, length: 1.4,
    ranged: { speed: 62, spreadDeg: 0.35, undrawnSpreadDeg: 5, mountedSpreadDeg: 4, ammo: 30, minDamageMult: 0.35 },
  },
  {
    ...melee, id: 'horsebow', name: '騎弓', model: 'bow', damageType: 'pierce',
    baseDamage: 32, reach: 0, windupMin: 0.15, chargeFull: 0.75,
    swingTime: 0, recoverTime: 0.25, arcDeg: 0, length: 1,
    ranged: { speed: 52, spreadDeg: 0.6, undrawnSpreadDeg: 4, mountedSpreadDeg: 1.4, ammo: 30, minDamageMult: 0.4 },
  },
  {
    ...melee, id: 'crossbow', name: '弩', model: 'crossbow', damageType: 'pierce',
    baseDamage: 64, reach: 0, windupMin: 0.05, chargeFull: 0.05,
    swingTime: 0, recoverTime: 2.1, arcDeg: 0, shieldBreak: 1.5, length: 0.8,
    ranged: { speed: 78, spreadDeg: 0.25, undrawnSpreadDeg: 0, mountedSpreadDeg: 5, ammo: 18, minDamageMult: 1 },
  },
  {
    ...melee, id: 'javelin', name: '標槍', model: 'javelin', damageType: 'pierce',
    baseDamage: 58, reach: 0, windupMin: 0.25, chargeFull: 0.6,
    swingTime: 0, recoverTime: 0.55, arcDeg: 0, shieldBreak: 2, length: 1.5,
    ranged: { speed: 30, spreadDeg: 0.8, undrawnSpreadDeg: 3, mountedSpreadDeg: 1.5, ammo: 6, minDamageMult: 0.5 },
  },

  // ── 部隊裝備 ──
  {
    ...melee, id: 'spear', name: '長矛', model: 'spear', damageType: 'pierce',
    baseDamage: 20, reach: 3, windupMin: 0.4, chargeFull: 0.4,
    swingTime: 0.3, recoverTime: 0.5, arcDeg: 30, thrustOnly: true, antiCavalry: 1.8, length: 2.6,
  },
  {
    ...melee, id: 'infantry_sword', name: '步兵劍', model: 'sword', damageType: 'cut',
    baseDamage: 17, reach: 2, windupMin: 0.45, chargeFull: 0.45,
    swingTime: 0.3, recoverTime: 0.5, arcDeg: 110, hasShield: true, length: 0.9,
  },
  {
    ...melee, id: 'infantry_axe', name: '戰斧', model: 'axe', damageType: 'cut',
    baseDamage: 26, reach: 2.2, windupMin: 0.6, chargeFull: 0.6,
    swingTime: 0.36, recoverTime: 0.65, arcDeg: 120, shieldBreak: 2, length: 1.1,
  },
  {
    ...melee, id: 'short_sword', name: '短劍', model: 'sword', damageType: 'cut',
    baseDamage: 13, reach: 1.8, windupMin: 0.45, chargeFull: 0.45,
    swingTime: 0.28, recoverTime: 0.5, arcDeg: 100, length: 0.65,
  },
  {
    ...melee, id: 'troop_bow', name: '獵弓', model: 'bow', damageType: 'pierce',
    baseDamage: 17, reach: 0, windupMin: 0.3, chargeFull: 1.2,
    swingTime: 0, recoverTime: 0.9, arcDeg: 0, length: 1.2,
    ranged: { speed: 50, spreadDeg: 2.2, undrawnSpreadDeg: 3, mountedSpreadDeg: 3, ammo: 22, minDamageMult: 0.5 },
  },
  {
    ...melee, id: 'troop_crossbow', name: '軍弩', model: 'crossbow', damageType: 'pierce',
    baseDamage: 26, reach: 0, windupMin: 0.4, chargeFull: 0.5,
    swingTime: 0, recoverTime: 2.4, arcDeg: 0, shieldBreak: 1.5, length: 0.8,
    ranged: { speed: 66, spreadDeg: 1.6, undrawnSpreadDeg: 0, mountedSpreadDeg: 4, ammo: 14, minDamageMult: 1 },
  },
  {
    ...melee, id: 'troop_javelin', name: '投槍', model: 'javelin', damageType: 'pierce',
    baseDamage: 30, reach: 0, windupMin: 0.45, chargeFull: 0.6,
    swingTime: 0, recoverTime: 1.2, arcDeg: 0, shieldBreak: 2, length: 1.4,
    ranged: { speed: 28, spreadDeg: 2.4, undrawnSpreadDeg: 2, mountedSpreadDeg: 2, ammo: 8, minDamageMult: 0.6 },
  },
  {
    ...melee, id: 'troop_lance', name: '騎兵槍', model: 'lance', damageType: 'pierce',
    baseDamage: 11, reach: 3.3, windupMin: 0.3, chargeFull: 0.5,
    swingTime: 0.3, recoverTime: 0.5, arcDeg: 30, thrustOnly: true, couchable: true, length: 3.1,
  },
  {
    ...melee, id: 'cavalry_sword', name: '馬刀', model: 'sword', damageType: 'cut',
    baseDamage: 20, reach: 2.2, windupMin: 0.25, chargeFull: 0.4,
    swingTime: 0.28, recoverTime: 0.5, arcDeg: 120, length: 0.95,
  },

  // ── 法術（第五類武器）──
  ...[
    { id: 'fireball', name: '火球術', base: 55, draw: 0.8, recover: 0.5, speed: 32, spell: { mp: 15, aoe: 4.5 } },
    { id: 'lightning', name: '雷擊', base: 70, draw: 0.5, recover: 0.6, speed: 240, spell: { mp: 12, flat: true } },
    { id: 'ward', name: '護盾術', base: 0, draw: 0.3, recover: 0.4, speed: 1, spell: { mp: 20, self: 'ward' as const, power: 8 } },
    { id: 'heal', name: '治療術', base: 0, draw: 0.9, recover: 0.5, speed: 1, spell: { mp: 18, self: 'heal' as const, power: 45 } },
    { id: 'dragon_breath', name: '龍息', base: 40, draw: 0.4, recover: 0.8, speed: 22, spell: { mp: 22, aoe: 7 } },
    { id: 'troop_fire', name: '火球', base: 26, draw: 1.3, recover: 1.4, speed: 30, spell: { mp: 0, aoe: 3.5 } },
    { id: 'troop_bolt', name: '枯骨雷', base: 34, draw: 1, recover: 1.5, speed: 200, spell: { mp: 0, flat: true } },
    { id: 'dragon_fire', name: '龍炎', base: 60, draw: 1.1, recover: 1.2, speed: 34, spell: { mp: 0, aoe: 9 } },
    { id: 'flying_sword', name: '飛劍', base: 38, draw: 0.9, recover: 1.1, speed: 120, spell: { mp: 0, flat: true } },
  ].map((s): WeaponDef => ({
    ...melee, id: s.id, name: s.name, model: 'staff', damageType: 'blunt', baseDamage: s.base, reach: 0,
    windupMin: Math.min(0.3, s.draw), chargeFull: s.draw, swingTime: 0, recoverTime: s.recover, arcDeg: 0, length: 1.3,
    spell: s.spell, ranged: { speed: s.speed, spreadDeg: 0.4, undrawnSpreadDeg: 1, mountedSpreadDeg: 1, ammo: 999, minDamageMult: 0.7 },
  })),
  {
    ...melee, id: 'boss_fist', name: '石拳', model: 'mace', damageType: 'blunt', baseDamage: 46, reach: 4.2, windupMin: 0.55, chargeFull: 0.5,
    swingTime: 0.4, recoverTime: 0.7, arcDeg: 150, cleave: 4, length: 1.2,
  },
  {
    ...melee, id: 'boss_club', name: '巨棒', model: 'mace', damageType: 'blunt', baseDamage: 58, reach: 5, windupMin: 0.6, chargeFull: 0.5,
    swingTime: 0.42, recoverTime: 0.7, arcDeg: 160, cleave: 5, length: 1.8,
  },

  // ── 特殊兵種同英雄 ──
  {
    ...melee, id: 'elite_sword', name: '近衛劍', model: 'sword', damageType: 'cut',
    baseDamage: 24, reach: 2.2, windupMin: 0.35, chargeFull: 0.4,
    swingTime: 0.28, recoverTime: 0.4, arcDeg: 115, hasShield: true, length: 1,
  },
  {
    ...melee, id: 'elite_spear', name: '破騎矛', model: 'spear', damageType: 'pierce',
    baseDamage: 27, reach: 3.2, windupMin: 0.32, chargeFull: 0.35,
    swingTime: 0.28, recoverTime: 0.42, arcDeg: 30, thrustOnly: true, antiCavalry: 2.2, length: 2.8,
  },
  {
    ...melee, id: 'elite_axe', name: '破陣斧', model: 'axe', damageType: 'cut',
    baseDamage: 34, reach: 2.4, windupMin: 0.45, chargeFull: 0.45,
    swingTime: 0.34, recoverTime: 0.5, arcDeg: 125, cleave: 2, shieldBreak: 2.6, length: 1.2,
  },
  {
    ...melee, id: 'elite_lance', name: '鐵騎槍', model: 'lance', damageType: 'pierce',
    baseDamage: 15, reach: 3.5, windupMin: 0.28, chargeFull: 0.45,
    swingTime: 0.3, recoverTime: 0.45, arcDeg: 30, thrustOnly: true, couchable: true, length: 3.3,
  },
  {
    ...melee, id: 'elite_bow', name: '精靈長弓', model: 'bow', damageType: 'pierce',
    baseDamage: 28, reach: 0, windupMin: 0.3, chargeFull: 1,
    swingTime: 0, recoverTime: 0.7, arcDeg: 0, length: 1.45,
    ranged: { speed: 62, spreadDeg: 1.1, undrawnSpreadDeg: 3, mountedSpreadDeg: 3, ammo: 28, minDamageMult: 0.5 },
  },
  {
    ...melee, id: 'elite_crossbow', name: '連環弩', model: 'crossbow', damageType: 'pierce',
    baseDamage: 32, reach: 0, windupMin: 0.35, chargeFull: 0.4,
    swingTime: 0, recoverTime: 1.7, arcDeg: 0, shieldBreak: 1.5, length: 0.85,
    ranged: { speed: 70, spreadDeg: 1.2, undrawnSpreadDeg: 0, mountedSpreadDeg: 4, ammo: 18, minDamageMult: 1 },
  },
  {
    ...melee, id: 'hero_blade', name: '名刃', model: 'sword', damageType: 'cut',
    baseDamage: 40, reach: 2.5, windupMin: 0.2, chargeFull: 0.3,
    swingTime: 0.26, recoverTime: 0.3, arcDeg: 130, cleave: 2, hasShield: true, length: 1.15,
  },
  {
    ...melee, id: 'hero_axe', name: '開山巨斧', model: 'axe', damageType: 'cut',
    baseDamage: 54, reach: 2.7, windupMin: 0.32, chargeFull: 0.35,
    swingTime: 0.34, recoverTime: 0.42, arcDeg: 140, cleave: 3, shieldBreak: 3, length: 1.4,
  },
  {
    ...melee, id: 'hero_lance', name: '獅紋騎槍', model: 'lance', damageType: 'pierce',
    baseDamage: 24, reach: 3.7, windupMin: 0.22, chargeFull: 0.35,
    swingTime: 0.28, recoverTime: 0.36, arcDeg: 30, thrustOnly: true, couchable: true, length: 3.5,
  },
  {
    ...melee, id: 'hero_bow', name: '神射弓', model: 'bow', damageType: 'pierce',
    baseDamage: 42, reach: 0, windupMin: 0.25, chargeFull: 0.75,
    swingTime: 0, recoverTime: 0.45, arcDeg: 0, length: 1.4,
    ranged: { speed: 70, spreadDeg: 0.5, undrawnSpreadDeg: 2, mountedSpreadDeg: 2, ammo: 40, minDamageMult: 0.6 },
  },
];

export const WEAPONS: Record<string, WeaponDef> = Object.fromEntries(WEAPON_LIST.map((w) => [w.id, w]));

/** 玩家開局可揀嘅武器，順序即選擇畫面順序 */
export const PLAYER_ARSENAL = [
  'sword', 'hand_axe', 'mace', 'axe', 'greatsword', 'lance',
  'pike', 'longbow', 'horsebow', 'crossbow', 'javelin',
  'fireball', 'lightning', 'ward', 'heal',
];
export const LOADOUT_SIZE = 4;
export const DEFAULT_LOADOUT = ['sword', 'lance', 'longbow', 'axe'];

export const SHIELD = {
  /** 玩家同部隊嘅盾牌耐久 */
  playerDurability: 220,
  troopDurability: 110,
  /** 盾牌耐久消耗 = 傷害 × 呢個倍率 × 武器 shieldBreak */
  damageRatio: 1,
};
