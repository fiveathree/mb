export interface UnitDef {
  id: string;
  name: string;
  hp: number;
  armor: number;
  /** 行路／走路速度 */
  walkSpeed: number;
  runSpeed: number;
  radius: number;
  /** 武器 id，第一件係預設 */
  weapons: string[];
  /** 正確估中格擋方向嘅機率（0–1） */
  blockSkill: number;
  /** 見到玩家出招後，有幾大機率舉防 */
  blockChance: number;
  /** 反應時間（秒） */
  reaction: number;
  /** 出招間隔（秒） */
  attackCooldown: [number, number];
  /** 見到快馬衝埋嚟時閃避嘅機率 */
  dodgeChance: number;
  bodyColor: number;
  trimColor: number;
}

export const PLAYER_UNIT: UnitDef = {
  id: 'player', name: '傭兵', hp: 130, armor: 9, walkSpeed: 2.6, runSpeed: 5.6, radius: 0.45,
  weapons: ['sword', 'lance', 'axe'],
  blockSkill: 1, blockChance: 0, reaction: 0, attackCooldown: [0, 0], dodgeChance: 0,
  bodyColor: 0x2f5d9e, trimColor: 0xf2c14e,
};

export const ENEMY_UNITS: Record<string, UnitDef> = {
  footman: {
    id: 'footman', name: '步卒', hp: 72, armor: 7, walkSpeed: 2.2, runSpeed: 4.4, radius: 0.45,
    weapons: ['infantry_sword'],
    blockSkill: 0.55, blockChance: 0.6, reaction: 0.22, attackCooldown: [1.1, 2.2], dodgeChance: 0.25,
    bodyColor: 0x8e2f2a, trimColor: 0x3b2a22,
  },
  pikeman: {
    id: 'pikeman', name: '長矛手', hp: 64, armor: 5, walkSpeed: 2.2, runSpeed: 4.2, radius: 0.45,
    weapons: ['spear'],
    blockSkill: 0.4, blockChance: 0.35, reaction: 0.3, attackCooldown: [1.3, 2.4], dodgeChance: 0.1,
    bodyColor: 0x6d5a2e, trimColor: 0x8e2f2a,
  },
  axeman: {
    id: 'axeman', name: '斧兵', hp: 85, armor: 9, walkSpeed: 2.1, runSpeed: 4.6, radius: 0.48,
    weapons: ['infantry_axe'],
    blockSkill: 0.3, blockChance: 0.25, reaction: 0.3, attackCooldown: [1.5, 2.8], dodgeChance: 0.35,
    bodyColor: 0x4a4f55, trimColor: 0x8e2f2a,
  },
};

/** AI 行為參數 */
export const AI = {
  turnRate: 5,
  accel: 14,
  /** 同時最多幾多個敵人出招 */
  maxConcurrentAttackers: 3,
  /** 開始包圍嘅距離 */
  surroundRange: 7,
  /** 玩家時速高過呢個（公尺／秒）就當係衝鋒 */
  chargeSpeed: 8,
  chargeAwareDist: 11,
  dodgeSpeedMult: 1.2,
  dodgeTime: 0.7,
  separation: 1.3,
  /** 舉防最長時間 */
  blockHold: 0.9,
  /** 開局幾耐之後先郁（秒） */
  startDelay: 1.2,
};
