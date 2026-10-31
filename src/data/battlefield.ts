/** 階段 1 戰場設定 */
export const BATTLEFIELD = {
  /** 地形邊長（公尺） */
  size: 420,
  segments: 110,
  /** 可活動半徑 */
  arenaRadius: 150,
  hillAmplitude: 2.4,
  treeCount: 240,
  /** 中央保留空地半徑 */
  clearRadius: 60,
  /** 場內散落樹數 */
  innerTrees: 14,
  rockCount: 60,
  seed: 20261031,
  playerStart: { x: 0, z: -60 },
  enemyCenter: { x: 0, z: 25 },
  /** 敵軍編成 */
  enemies: [
    'footman', 'footman', 'footman', 'footman', 'footman',
    'pikeman', 'pikeman', 'pikeman',
    'axeman', 'axeman',
  ],
  enemySpacing: 3,
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
};
