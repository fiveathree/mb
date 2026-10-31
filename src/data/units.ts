export type Role = 'infantry' | 'archer' | 'cavalry';

export const ROLE_LABEL: Record<Role, string> = { infantry: '步兵', archer: '弓兵', cavalry: '騎兵' };
/** 指揮用數字鍵對應兵種（4 法師留待魔法階段） */
export const ROLE_KEYS: Role[] = ['infantry', 'archer', 'cavalry'];

export interface UnitDef {
  id: string;
  name: string;
  role: Role;
  /** 兵階，影響經驗同戰利品 */
  tier: number;
  hp: number;
  armor: number;
  /** 行路／走路速度 */
  walkSpeed: number;
  runSpeed: number;
  radius: number;
  /** 武器 id，第一件係預設 */
  weapons: string[];
  /** 騎兵用嘅馬匹 id */
  horse?: string;
  /** 初始士氣 */
  morale: number;
  /** 正確估中格擋方向嘅機率（0–1） */
  blockSkill: number;
  /** 見到敵人出招後，有幾大機率舉防 */
  blockChance: number;
  /** 反應時間（秒） */
  reaction: number;
  /** 出招間隔（秒） */
  attackCooldown: [number, number];
  /** 見到快馬衝埋嚟時閃避嘅機率 */
  dodgeChance: number;
  trimColor: number;
}

/** 陣營配色：0 我軍、1 敵軍 */
export const TEAM_COLORS = [0x2f5d9e, 0x8e2f2a];
export const TEAM_NAMES = ['我軍', '敵軍'];

export const PLAYER_UNIT: UnitDef = {
  id: 'player', name: '傭兵', role: 'cavalry', tier: 5, hp: 130, armor: 9, walkSpeed: 2.6, runSpeed: 5.6, radius: 0.45,
  weapons: [], morale: 100,
  blockSkill: 1, blockChance: 0, reaction: 0, attackCooldown: [0, 0], dodgeChance: 0,
  trimColor: 0xf2c14e,
};

export const UNITS: Record<string, UnitDef> = {
  footman: {
    id: 'footman', name: '步卒', role: 'infantry', tier: 2, hp: 72, armor: 7, walkSpeed: 2.2, runSpeed: 4.4, radius: 0.45,
    weapons: ['infantry_sword'], morale: 60,
    blockSkill: 0.55, blockChance: 0.6, reaction: 0.22, attackCooldown: [1.1, 2.2], dodgeChance: 0.25,
    trimColor: 0x3b2a22,
  },
  pikeman: {
    id: 'pikeman', name: '長矛手', role: 'infantry', tier: 2, hp: 64, armor: 5, walkSpeed: 2.2, runSpeed: 4.2, radius: 0.45,
    weapons: ['spear'], morale: 65,
    blockSkill: 0.4, blockChance: 0.35, reaction: 0.3, attackCooldown: [1.3, 2.4], dodgeChance: 0.05,
    trimColor: 0x6d5a2e,
  },
  axeman: {
    id: 'axeman', name: '斧兵', role: 'infantry', tier: 3, hp: 85, armor: 9, walkSpeed: 2.1, runSpeed: 4.6, radius: 0.48,
    weapons: ['infantry_axe'], morale: 70,
    blockSkill: 0.3, blockChance: 0.25, reaction: 0.3, attackCooldown: [1.5, 2.8], dodgeChance: 0.3,
    trimColor: 0x4a4f55,
  },
  archer: {
    id: 'archer', name: '弓手', role: 'archer', tier: 2, hp: 52, armor: 3, walkSpeed: 2.3, runSpeed: 4.6, radius: 0.43,
    weapons: ['troop_bow', 'short_sword'], morale: 50,
    blockSkill: 0.3, blockChance: 0.2, reaction: 0.35, attackCooldown: [1.4, 2.6], dodgeChance: 0.3,
    trimColor: 0x4e6b3a,
  },
  crossbowman: {
    id: 'crossbowman', name: '弩手', role: 'archer', tier: 3, hp: 60, armor: 6, walkSpeed: 2.1, runSpeed: 4.2, radius: 0.45,
    weapons: ['troop_crossbow', 'short_sword'], morale: 55,
    blockSkill: 0.3, blockChance: 0.2, reaction: 0.35, attackCooldown: [1.4, 2.6], dodgeChance: 0.2,
    trimColor: 0x57504a,
  },
  lancer: {
    id: 'lancer', name: '槍騎兵', role: 'cavalry', tier: 4, hp: 90, armor: 9, walkSpeed: 2.3, runSpeed: 4.6, radius: 0.45,
    weapons: ['troop_lance', 'cavalry_sword'], horse: 'hunter', morale: 75,
    blockSkill: 0.4, blockChance: 0.3, reaction: 0.3, attackCooldown: [1.2, 2.2], dodgeChance: 0.1,
    trimColor: 0xd0c9b8,
  },
  horseman: {
    id: 'horseman', name: '輕騎兵', role: 'cavalry', tier: 3, hp: 72, armor: 6, walkSpeed: 2.3, runSpeed: 4.8, radius: 0.45,
    weapons: ['cavalry_sword'], horse: 'steppe', morale: 60,
    blockSkill: 0.4, blockChance: 0.3, reaction: 0.3, attackCooldown: [1.1, 2], dodgeChance: 0.1,
    trimColor: 0xb98d55,
  },
};

/** 步兵同弓兵行為參數 */
export const AI = {
  turnRate: 5,
  accel: 14,
  /** 同一目標最多幾多個敵人同時出招 */
  maxAttackersPerTarget: 3,
  /** 開始包圍嘅距離 */
  surroundRange: 7,
  /** 目標時速高過呢個（公尺／秒）就當係衝鋒 */
  chargeSpeed: 8,
  chargeAwareDist: 11,
  dodgeSpeedMult: 1.2,
  dodgeTime: 0.7,
  separation: 1.2,
  /** 舉防最長時間 */
  blockHold: 0.9,
  /** 守住／跟隨時，敵人入到幾近先迎擊 */
  engageDist: 11,
  /** 到位距離 */
  slotTolerance: 0.9,
  /** 開局幾耐之後先郁（秒） */
  startDelay: 1,
  retargetEvery: [0.35, 0.7] as [number, number],
};

/** 遠程 AI */
export const ARCHER_AI = {
  /** 開火距離 */
  range: 72,
  /** 敵人入到呢個距離就換近戰 */
  meleeDist: 6.5,
  /** 拉滿後最多再等幾耐先放箭 */
  releaseJitter: 0.5,
  /** 預判目標移動嘅比例 */
  lead: 0.85,
};

/** 騎兵 AI */
export const CAVALRY_AI = {
  /** 守住／跟隨時，敵人入到幾近先出擊 */
  engageDist: 24,
  /** 衝過目標後跑幾遠先回頭 */
  passDist: 22,
  /** 再次揀目標前最少衝幾耐（秒） */
  commitTime: 2.5,
  /** 對準角度內先加速（弧度） */
  steerDeadzone: 0.07,
  /** 大過呢個角度就唔衝刺，先轉彎 */
  turnFirstAngle: 0.9,
  /** 到位距離 */
  slotTolerance: 3,
  /** 出招提前量（秒） */
  swingLead: 0.3,
};

/** 士氣 */
export const MORALE = {
  /** 附近友軍陣亡：範圍同士氣損失 */
  allyDeathRadius: 12,
  allyDeathLoss: 2.2,
  /** 擊殺士氣獎勵 */
  killGain: 4,
  /** 附近有友軍潰逃嘅損失 */
  allyRoutLoss: 1.5,
  /** 主將倒下全軍損失 */
  commanderLoss: 12,
  /** 每秒檢查：局部兵力比例低過呢個就持續掉士氣 */
  outnumberedRatio: 0.5,
  outnumberedLossPerSec: 1.2,
  localRadius: 20,
  /** 受傷：生命低過比例時每秒損失 */
  woundedHpRatio: 0.3,
  woundedLossPerSec: 1,
  /** 全軍剩返呢個比例時，全體每秒再掉 */
  collapseRatio: 0.3,
  collapseLossPerSec: 3,
  /** 離開戰場嘅邊界緩衝（公尺） */
  fleeEdgeMargin: 4,
};

/** 敵軍指揮官 */
export const ENEMY_COMMAND = {
  /** 步兵前進，直至距離我軍呢個距離就全面衝鋒 */
  infantryChargeDist: 34,
  /** 弓兵保持同我軍嘅距離 */
  archerStandoff: 55,
  /** 開局幾耐後騎兵出擊（秒） */
  cavalryDelay: 7,
  /** 檢查間隔（秒） */
  thinkEvery: 1,
  /** 敵軍前進點離我軍前線嘅距離 */
  advanceStep: 14,
};
