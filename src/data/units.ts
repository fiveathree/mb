import type { Rarity } from './gacha';

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
  /** 抽卡稀有度，預設普通 */
  rarity?: Rarity;
  /** 出身地域或者一句介紹 */
  desc?: string;
  /** 特殊兵種嘅羽飾顏色 */
  plumeColor?: number;
  /** 冠名英雄 */
  hero?: boolean;
  /** 英雄士氣光環：附近友軍每秒回復 */
  aura?: number;
  /** 由等級計出嚟嘅傷害倍率 */
  damageMult?: number;
}

/** 兩軍外觀：顏色同盔型都要一眼分到 */
export interface TeamStyle {
  body: number;
  legs: number;
  helmet: number;
  shield: number;
  cloth: number;
  /** 頭頂標記 */
  marker: number;
  /** 盔飾：羽飾或者牛角 */
  crest: 'plume' | 'horns';
  crestColor: number;
}

export const TEAM_STYLES: TeamStyle[] = [
  {
    body: 0x2f7be0, legs: 0xdfe6ef, helmet: 0xe4eaf2, shield: 0x2f7be0, cloth: 0x2f7be0,
    marker: 0x62b2ff, crest: 'plume', crestColor: 0xffffff,
  },
  {
    body: 0xc4231c, legs: 0x1c1a1e, helmet: 0x26222a, shield: 0x8c1512, cloth: 0xc4231c,
    marker: 0xff3a2a, crest: 'horns', crestColor: 0xe0d6bc,
  },
];
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
    trimColor: 0x4a4f55, rarity: 'fine',
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
    trimColor: 0x57504a, rarity: 'fine',
  },
  lancer: {
    id: 'lancer', name: '槍騎兵', role: 'cavalry', tier: 4, hp: 90, armor: 9, walkSpeed: 2.3, runSpeed: 4.6, radius: 0.45,
    weapons: ['troop_lance', 'cavalry_sword'], horse: 'hunter', morale: 75,
    blockSkill: 0.4, blockChance: 0.3, reaction: 0.3, attackCooldown: [1.2, 2.2], dodgeChance: 0.1,
    trimColor: 0xd0c9b8, rarity: 'fine',
  },
  horseman: {
    id: 'horseman', name: '輕騎兵', role: 'cavalry', tier: 3, hp: 72, armor: 6, walkSpeed: 2.3, runSpeed: 4.8, radius: 0.45,
    weapons: ['cavalry_sword'], horse: 'steppe', morale: 60,
    blockSkill: 0.4, blockChance: 0.3, reaction: 0.3, attackCooldown: [1.1, 2], dodgeChance: 0.1,
    trimColor: 0xb98d55,
  },

  // ── 特殊兵種 ──
  griffin_guard: {
    id: 'griffin_guard', name: '獅鷲鐵衛', desc: '西境王國近衛，重甲持盾', role: 'infantry', tier: 4,
    hp: 125, armor: 14, walkSpeed: 2.1, runSpeed: 4.3, radius: 0.48,
    weapons: ['elite_sword'], morale: 95,
    blockSkill: 0.75, blockChance: 0.75, reaction: 0.18, attackCooldown: [0.9, 1.8], dodgeChance: 0.1,
    trimColor: 0xd9b24a, rarity: 'special', plumeColor: 0xd9b24a,
  },
  blackmail_rider: {
    id: 'blackmail_rider', name: '玄甲重騎', desc: '中原北方鐵騎，人馬俱甲', role: 'cavalry', tier: 5,
    hp: 130, armor: 15, walkSpeed: 2.2, runSpeed: 4.4, radius: 0.48,
    weapons: ['elite_lance', 'cavalry_sword'], horse: 'warhorse', morale: 100,
    blockSkill: 0.5, blockChance: 0.4, reaction: 0.25, attackCooldown: [1, 1.8], dodgeChance: 0.05,
    trimColor: 0x24242a, rarity: 'special', plumeColor: 0x24242a,
  },
  shu_mountaineer: {
    id: 'shu_mountaineer', name: '巴蜀山卒', desc: '山地長矛兵，專破騎兵', role: 'infantry', tier: 4,
    hp: 95, armor: 8, walkSpeed: 2.4, runSpeed: 4.9, radius: 0.45,
    weapons: ['elite_spear'], morale: 90,
    blockSkill: 0.5, blockChance: 0.4, reaction: 0.22, attackCooldown: [1, 1.9], dodgeChance: 0.25,
    trimColor: 0x3f7a4a, rarity: 'special', plumeColor: 0x3f7a4a,
  },
  jiangdong_marine: {
    id: 'jiangdong_marine', name: '江東水卒', desc: '水軍弩手，近戰都有一手', role: 'archer', tier: 4,
    hp: 85, armor: 8, walkSpeed: 2.3, runSpeed: 4.6, radius: 0.45,
    weapons: ['elite_crossbow', 'infantry_sword'], morale: 85,
    blockSkill: 0.45, blockChance: 0.35, reaction: 0.25, attackCooldown: [1.2, 2.2], dodgeChance: 0.25,
    trimColor: 0x2d8a96, rarity: 'special', plumeColor: 0x2d8a96,
  },
  ya_guard: {
    id: 'ya_guard', name: '烏衣牙兵', desc: '南域親兵，出手又快又狠', role: 'infantry', tier: 4,
    hp: 100, armor: 10, walkSpeed: 2.4, runSpeed: 5, radius: 0.46,
    weapons: ['elite_axe'], morale: 90,
    blockSkill: 0.45, blockChance: 0.3, reaction: 0.2, attackCooldown: [0.8, 1.5], dodgeChance: 0.35,
    trimColor: 0x35303a, rarity: 'special', plumeColor: 0x8a4fd0,
  },
  elf_longbow: {
    id: 'elf_longbow', name: '精靈長弓手', desc: '北荒林國射手，百步穿楊', role: 'archer', tier: 4,
    hp: 72, armor: 5, walkSpeed: 2.6, runSpeed: 5.2, radius: 0.43,
    weapons: ['elite_bow', 'short_sword'], morale: 85,
    blockSkill: 0.4, blockChance: 0.25, reaction: 0.25, attackCooldown: [1.2, 2.2], dodgeChance: 0.4,
    trimColor: 0x7fd06a, rarity: 'special', plumeColor: 0x7fd06a,
  },
  dwarf_breaker: {
    id: 'dwarf_breaker', name: '矮人破陣斧手', desc: '山城重步，專劈盾牌', role: 'infantry', tier: 5,
    hp: 140, armor: 16, walkSpeed: 1.9, runSpeed: 3.9, radius: 0.5,
    weapons: ['elite_axe'], morale: 105,
    blockSkill: 0.4, blockChance: 0.3, reaction: 0.25, attackCooldown: [1.1, 2], dodgeChance: 0.05,
    trimColor: 0xb0682c, rarity: 'special', plumeColor: 0xb0682c,
  },

  // ── 冠名英雄 ──
  hero_reynard: {
    id: 'hero_reynard', name: '鐵獅騎士 雷納德', desc: '西境比武之王，騎槍從未失手', role: 'cavalry', tier: 6,
    hp: 240, armor: 18, walkSpeed: 2.3, runSpeed: 4.8, radius: 0.48,
    weapons: ['hero_lance', 'hero_blade'], horse: 'warhorse', morale: 130,
    blockSkill: 0.85, blockChance: 0.75, reaction: 0.15, attackCooldown: [0.7, 1.3], dodgeChance: 0.2,
    trimColor: 0xf2c14e, rarity: 'hero', hero: true, aura: 2.5, plumeColor: 0xf2c14e,
  },
  hero_hanxiao: {
    id: 'hero_hanxiao', name: '玄鋒將 韓驍', desc: '中原猛將，單騎破陣', role: 'cavalry', tier: 6,
    hp: 260, armor: 16, walkSpeed: 2.4, runSpeed: 5, radius: 0.48,
    weapons: ['hero_blade'], horse: 'steppe', morale: 130,
    blockSkill: 0.8, blockChance: 0.7, reaction: 0.14, attackCooldown: [0.6, 1.1], dodgeChance: 0.25,
    trimColor: 0xe05a2c, rarity: 'hero', hero: true, aura: 2, plumeColor: 0xe05a2c,
  },
  hero_lu: {
    id: 'hero_lu', name: '水師都督 陸明川', desc: '江東儒將，鼓舞全軍', role: 'archer', tier: 6,
    hp: 190, armor: 12, walkSpeed: 2.4, runSpeed: 4.9, radius: 0.46,
    weapons: ['hero_bow', 'hero_blade'], morale: 130,
    blockSkill: 0.75, blockChance: 0.6, reaction: 0.16, attackCooldown: [0.8, 1.4], dodgeChance: 0.3,
    trimColor: 0x38c0cf, rarity: 'hero', hero: true, aura: 4, plumeColor: 0x38c0cf,
  },
  hero_yan: {
    id: 'hero_yan', name: '牙將 燕九郎', desc: '南域亂世第一快刀', role: 'infantry', tier: 6,
    hp: 230, armor: 13, walkSpeed: 2.6, runSpeed: 5.6, radius: 0.46,
    weapons: ['hero_blade'], morale: 125,
    blockSkill: 0.9, blockChance: 0.85, reaction: 0.12, attackCooldown: [0.5, 1], dodgeChance: 0.45,
    trimColor: 0xa85be0, rarity: 'hero', hero: true, aura: 2, plumeColor: 0xa85be0,
  },
  hero_sylvia: {
    id: 'hero_sylvia', name: '精靈遊俠 希爾薇', desc: '林國神射手，一箭定音', role: 'archer', tier: 6,
    hp: 170, armor: 8, walkSpeed: 2.8, runSpeed: 5.8, radius: 0.44,
    weapons: ['hero_bow', 'short_sword'], morale: 120,
    blockSkill: 0.7, blockChance: 0.5, reaction: 0.15, attackCooldown: [0.8, 1.4], dodgeChance: 0.5,
    trimColor: 0x9ae86a, rarity: 'hero', hero: true, aura: 2, plumeColor: 0x9ae86a,
  },
  hero_barn: {
    id: 'hero_barn', name: '矮人戰王 鐵砧巴恩', desc: '山城之主，萬軍難撼', role: 'infantry', tier: 6,
    hp: 320, armor: 22, walkSpeed: 2, runSpeed: 4.2, radius: 0.52,
    weapons: ['hero_axe'], morale: 140,
    blockSkill: 0.6, blockChance: 0.4, reaction: 0.2, attackCooldown: [0.9, 1.6], dodgeChance: 0.05,
    trimColor: 0xd98a2c, rarity: 'hero', hero: true, aura: 3, plumeColor: 0xd98a2c,
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
  /** 英雄光環範圍 */
  auraRadius: 20,
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
