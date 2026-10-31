import type { Role } from './units';

/** 部隊對戰設定 */
export const BATTLEFIELD = {
  /** 地形邊長（公尺） */
  size: 420,
  segments: 110,
  /** 可活動半徑 */
  arenaRadius: 170,
  hillAmplitude: 2.4,
  treeCount: 240,
  /** 草叢數 */
  grassCount: 16000,
  /** 中央保留空地半徑 */
  clearRadius: 90,
  /** 場內散落樹數 */
  innerTrees: 14,
  rockCount: 60,
  seed: 20261031,
};

export interface ArmyEntry {
  unit: string;
  count: number;
}

/** 戰鼓節奏：每格力度 */
export const DRUMS = { pattern: [1, 0, 0.5, 0, 0.8, 0.4, 0.5, 0], stepMs: 210, freq: 72, gain: 0.16, decay: 0.2 };

/** 大地圖音樂：東方五聲音階、西方小調 */
export const MUSIC = {
  east: [262, 294, 330, 392, 440, 523, 587],
  west: [220, 262, 294, 330, 392, 440, 523],
  stepMs: 720,
  rest: 0.3,
  gain: 0.05,
  decay: 1.6,
};

type BattleThemeId = 'plains' | 'snow' | 'desert' | 'forest' | 'swamp' | 'ash';

/** 入城行街：舖頭圍住廣場 */
export const TOWN = {
  shops: [
    ['market', '市集'], ['supply', '補給'], ['smith', '鐵匠'], ['tavern', '酒館'], ['workshop', '作坊'], ['arena', '競技場'], ['quest', '任務'],
  ] as [string, string][],
  shopRadius: 34,
  doorRadius: 26,
  houses: 18,
  houseRadius: 56,
  gateZ: 44,
  startZ: -36,
  visitDist: 5,
  folk: 16,
  plaza: 22,
  stalls: 6,
  /** 每秒有幾多比例嘅鎮民換位 */
  wander: 0.25,
  villageShops: [['affairs', '村務'], ['market', '市集']] as [string, string][],
};

export type TownStyleId = 'plain' | 'snow' | 'sand' | 'forest' | 'monster' | 'ash';

/** 城鎮外觀跟地域：牆色、屋頂色、屋頂高度、戰場主題、街上嘅人 */
export const TOWN_STYLES: Record<TownStyleId, { wall: number; roof: number; roofH: number; theme: BattleThemeId; folk: string[] }> = {
  plain: { wall: 0xc8b89a, roof: 0x8a4a34, roofH: 3.4, theme: 'plains', folk: ['folk_0', 'folk_1', 'folk_2', 'folk_3'] },
  snow: { wall: 0x8a7a68, roof: 0xe8eef6, roofH: 4.4, theme: 'snow', folk: ['folk_0', 'folk_3', 'huscarl'] },
  sand: { wall: 0xe0c48a, roof: 0xc8a868, roofH: 0.6, theme: 'desert', folk: ['folk_0', 'folk_1', 'folk_3'] },
  forest: { wall: 0x6a5a48, roof: 0x3f7a45, roofH: 4, theme: 'forest', folk: ['folk_1', 'folk_2', 'elf_scout'] },
  monster: { wall: 0x4a4038, roof: 0xd8d0b8, roofH: 6.5, theme: 'swamp', folk: ['slime', 'goblin_spear', 'kobold', 'ogre_brute'] },
  ash: { wall: 0x4a4448, roof: 0x2a2428, roofH: 4, theme: 'ash', folk: ['folk_2', 'skeleton'] },
};

/** 森林戰場：多樹，騎兵衝唔起 */
export const FOREST = { trees: 90, spreadX: 100, spreadZ: 95, cavalryMult: 0.7, treeRadius: 0.9 };

/** 陣形 */
export const FORMATION = {
  /** 我軍步兵中心，敵軍鏡像 */
  startZ: 72,
  tightSpacing: 1.7,
  looseSpacing: 3.6,
  rowsAspect: 3,
  /** 各兵種相對主陣嘅位置：右移、前移（公尺） */
  offset: {
    infantry: { side: 0, forward: 0 },
    archer: { side: 0, forward: -14 },
    cavalry: { side: 34, forward: -6 },
    mage: { side: -14, forward: -18 },
  } as Record<Role, { side: number; forward: number }>,
  /** 跟隨時排喺玩家身後幾遠 */
  followBehind: 9,
  /** 守住此處：陣地喺玩家前方幾遠 */
  holdAhead: 6,
  /** 跟隨陣地更新間隔（秒） */
  followRefresh: 0.5,
};

/** 地形優勢：高度差每公尺傷害加成同上限 */
export const TERRAIN = {
  heightDamagePerMeter: 0.035,
  heightDamageMax: 0.18,
};

/** 主角倒下：即刻離開戰場，餘下戰況用文字結算 */
export const DOWN_RESOLVE = {
  /** 睇完倒地先走（秒） */
  delay: 0.8,
  /** 勝方損失：(敗方戰力 / 勝方戰力)² × 呢個比例 */
  winnerLoss: 0.6,
  /** 敗方有幾多人潰逃，其餘倒下 */
  routShare: 0.5,
};

/** 戰後結算 */
export const REWARDS = {
  /** 倒下嘅士兵有呢個機率只係受傷 */
  woundedChance: 0.45,
  goldPerTier: 26,
  expPerTier: 40,
  renownPerTier: 0.5,
  /** 受傷敵人有呢個機率變俘虜 */
  captureChance: 0.5,
  /** 勝利基本獎勵 */
  winGold: 120,
  winRenown: 8,
};

export const COLORS = {
  sky: 0x9fc4dc,
  fog: 0xbcd3dc,
  grassA: 0x7b9a4c,
  grassB: 0x5f8040,
  dirt: 0x9a8a5e,
  trunk: 0x5c4030,
  leaf: 0x3f6b3a,
  leafAlt: 0x567d38,
  rock: 0x7f8287,
  skin: 0xe0b48c,
  steel: 0xc6ccd3,
  wood: 0x6a4a2e,
  blood: 0x8a1712,
  dust: 0xb5a586,
  spark: 0xffd97a,
  arrow: 0xe7ddc6,
};
