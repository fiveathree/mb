import type { DamageType } from './combat';

export type WeaponModel = 'sword' | 'axe' | 'lance' | 'spear';

export interface WeaponDef {
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
  /** 持械模型長度（公尺） */
  length: number;
}

const WEAPON_LIST: WeaponDef[] = [
  {
    id: 'sword', name: '長劍＋盾', model: 'sword', damageType: 'cut',
    baseDamage: 30, reach: 2.3, windupMin: 0.16, chargeFull: 0.55,
    swingTime: 0.28, recoverTime: 0.26, arcDeg: 120, cleave: 1, shieldBreak: 1,
    thrustOnly: false, couchable: false, hasShield: true, length: 1,
  },
  {
    id: 'axe', name: '雙手斧', model: 'axe', damageType: 'cut',
    baseDamage: 44, reach: 2.5, windupMin: 0.26, chargeFull: 0.85,
    swingTime: 0.38, recoverTime: 0.42, arcDeg: 130, cleave: 2, shieldBreak: 2.2,
    thrustOnly: false, couchable: false, hasShield: false, length: 1.25,
  },
  {
    id: 'lance', name: '騎槍', model: 'lance', damageType: 'pierce',
    baseDamage: 28, reach: 3.6, windupMin: 0.22, chargeFull: 0.7,
    swingTime: 0.3, recoverTime: 0.38, arcDeg: 30, cleave: 1, shieldBreak: 1,
    thrustOnly: true, couchable: true, hasShield: false, length: 3.4,
  },
  {
    id: 'spear', name: '長矛', model: 'spear', damageType: 'pierce',
    baseDamage: 20, reach: 3, windupMin: 0.4, chargeFull: 0.4,
    swingTime: 0.3, recoverTime: 0.5, arcDeg: 30, cleave: 1, shieldBreak: 1,
    thrustOnly: true, couchable: false, hasShield: false, length: 2.6,
  },
  {
    id: 'infantry_sword', name: '步兵劍', model: 'sword', damageType: 'cut',
    baseDamage: 17, reach: 2, windupMin: 0.45, chargeFull: 0.45,
    swingTime: 0.3, recoverTime: 0.5, arcDeg: 110, cleave: 1, shieldBreak: 1,
    thrustOnly: false, couchable: false, hasShield: true, length: 0.9,
  },
  {
    id: 'infantry_axe', name: '戰斧', model: 'axe', damageType: 'cut',
    baseDamage: 26, reach: 2.2, windupMin: 0.6, chargeFull: 0.6,
    swingTime: 0.36, recoverTime: 0.65, arcDeg: 120, cleave: 1, shieldBreak: 2,
    thrustOnly: false, couchable: false, hasShield: false, length: 1.1,
  },
];

export const WEAPONS: Record<string, WeaponDef> = Object.fromEntries(WEAPON_LIST.map((w) => [w.id, w]));

export const SHIELD = {
  /** 玩家同 AI 嘅盾牌耐久 */
  playerDurability: 220,
  infantryDurability: 110,
  /** 盾牌耐久消耗 = 傷害 × 呢個倍率 × 武器 shieldBreak */
  damageRatio: 1,
};
