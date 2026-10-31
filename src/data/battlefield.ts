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
