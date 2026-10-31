export type Rarity = 'common' | 'fine' | 'special' | 'hero' | 'ur';
export type PoolId = 'human' | 'orc' | 'undead' | 'beast' | 'fair' | 'boss' | 'scenario';

export const RARITY_ORDER: Rarity[] = ['common', 'fine', 'special', 'hero', 'ur'];

export const RARITY: Record<Rarity, { name: string; color: string; rate: number }> = {
  common: { name: 'C', color: '#b9b4a8', rate: 0.68 },
  fine: { name: 'R', color: '#6fd08c', rate: 0.23 },
  special: { name: 'SR', color: '#8fb4ff', rate: 0.075 },
  hero: { name: 'SSR', color: '#f2c14e', rate: 0.013 },
  ur: { name: 'UR', color: '#ff6a8a', rate: 0.002 },
};

export type TicketPool = Exclude<PoolId, 'boss' | 'scenario'>;

export const POOLS: Record<TicketPool, { name: string; ticket: string; source: string }> = {
  human: { name: '四方豪傑', ticket: '通用招募令', source: '城鎮購買、清剿賊巢' },
  orc: { name: '獸人部落', ticket: '獸牙令', source: '攻陷黑牙堡' },
  undead: { name: '亡靈軍團', ticket: '骸骨令', source: '攻破枯骨墓穴' },
  beast: { name: '迷宮異族', ticket: '牛角令', source: '闖過牛角迷宮' },
  fair: { name: '精靈與矮人', ticket: '山林令', source: '攻下鐵砧山城' },
};
export const POOL_ORDER: TicketPool[] = ['human', 'orc', 'undead', 'beast', 'fair'];

export const GACHA = {
  /** 十連用幾多張招募令 */
  tenTickets: 9,
  /** 連續幾多抽未出英雄就保底，每個卡池獨立計 */
  pity: 60,
  /** 抽到重複英雄時退還金幣 */
  duplicateHeroRefund: 1500,
  /** 城鎮通用招募令售價 */
  ticketPrice: 1200,
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
  startGold: 1200,
  startFood: 60,
  startTickets: 3,
  /** 開局部隊 */
  startArmy: [
    { unit: 'footman', count: 8 }, { unit: 'archer', count: 4 }, { unit: 'horseman', count: 2 },
  ],
  /** 每場最多出戰人數（玩家另計） */
  deployMax: 39,
  /** 受傷休養日數 */
  hurtDays: 3,
  /** 戰敗或者撤退時，戰利品保留比例 */
  loseGoldRatio: 0.3,
  /** 呢啲稀有度倒下都唔會永久陣亡 */
  protectedRarities: ['special', 'hero', 'ur'] as Rarity[],
  /** 密令 */
  cheatCode: 'ironhorse',
};
