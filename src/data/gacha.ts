export type Rarity = 'common' | 'fine' | 'special' | 'hero';

export const RARITY_ORDER: Rarity[] = ['common', 'fine', 'special', 'hero'];

export const RARITY: Record<Rarity, { name: string; color: string; rate: number }> = {
  common: { name: '普通', color: '#b9b4a8', rate: 0.7 },
  fine: { name: '精良', color: '#6fd08c', rate: 0.22 },
  special: { name: '特殊', color: '#8fb4ff', rate: 0.07 },
  hero: { name: '英雄', color: '#f2c14e', rate: 0.01 },
};

export const GACHA = {
  /** 單抽金幣 */
  cost: 300,
  /** 十連金幣 */
  tenCost: 2700,
  /** 連續幾多抽未出英雄就保底 */
  pity: 60,
  /** 抽到重複英雄時退還金幣 */
  duplicateHeroRefund: 1500,
};

/** 士兵個體成長 */
export const LEVEL = {
  max: 10,
  /** 升到 2 級所需經驗，之後每級乘 growth */
  xpBase: 60,
  xpGrowth: 1.45,
  hpPerLevel: 0.07,
  damagePerLevel: 0.045,
  armorPerLevel: 0.5,
  moralePerLevel: 2.5,
  blockPerLevel: 0.025,
  /** 擊殺經驗 = 對方兵階 × 呢個數 */
  xpPerKillTier: 28,
  /** 打完一場嘅參戰經驗 */
  xpBattle: 25,
  xpWin: 25,
};

export const CAMPAIGN = {
  startGold: 3000,
  /** 每場最多出戰人數（玩家另計） */
  deployMax: 39,
  /** 兵力低過呢個數，戰後自動補新兵 */
  minRoster: 15,
  refillUnit: 'footman',
  /** 戰敗或者撤退時，戰利品保留比例 */
  loseGoldRatio: 0.3,
  /** 敵軍平均等級 = 1 + 勝場 ÷ 呢個數 */
  winsPerEnemyLevel: 2,
  enemyLevelMax: 8,
  /** 呢啲稀有度倒下都唔會永久陣亡 */
  protectedRarities: ['special', 'hero'] as Rarity[],
};
