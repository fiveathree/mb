import type { ArmyEntry } from './battlefield';
import type { TicketPool } from './gacha';

export const MAP = {
  width: 160,
  height: 100,
  seed: 77031,
  /** 每格畫幾多像素 */
  tilePx: 13,
  /** 山脈同森林嘅噪聲門檻 */
  forestAt: 0.57,
  mountainAt: 0.76,
  /** 河流橋位（Y 格） */
  bridges: [14, 50, 84],
  riderX: 72,
};

export const TERRAIN_COST = { plain: 1, forest: 1.8, hill: 1.4, bridge: 1 };

export const TIME = {
  /** 現實幾多秒一日（行軍時） */
  secondsPerDay: 22,
  nightFrom: 20,
  nightTo: 6,
  /** 視野（格） */
  dayVision: 30,
  nightVision: 15,
  daysPerWeek: 7,
};

export const PARTY = {
  /** 基本行軍速度（格／秒） */
  speed: 5.4,
  /** 每人減速比例，最多減 sizeMax */
  sizePenalty: 0.006,
  sizePenaltyMax: 0.4,
  /** 全騎兵時加速比例 */
  cavalryBonus: 0.35,
  encounterDist: 1.8,
};

export const MORALE_PARTY = {
  start: 70,
  /** 冇糧每日扣 */
  starvingLoss: 14,
  /** 欠餉一次扣 */
  unpaidLoss: 18,
  winGain: 6,
  loseLoss: 8,
  /** 每日自然回復 */
  dailyRegen: 1,
  /** 低過呢個數每日有人逃走 */
  desertBelow: 25,
  /** 士氣影響戰鬥士氣嘅比例：100 士氣 = 1.1 倍 */
  battleMin: 0.6,
  battleMax: 1.1,
};

export const BANDIT = {
  maxParties: 4,
  /** 日均生成間隔（日），夜晚加快 */
  spawnEvery: 2.4,
  speed: 3.6,
  /** 追擊距離（格） */
  chaseDist: 13,
  /** 遭遇後幾耐唔會再被截（秒） */
  graceSeconds: 8,
  /** 比玩家弱過呢個比例就走 */
  fleeRatio: 0.5,
  /** 人數同日數嘅關係 */
  baseSize: 5,
  sizePerDay: 0.16,
  sizeMax: 22,
  army: [{ unit: 'footman', share: 0.5 }, { unit: 'archer', share: 0.3 }, { unit: 'horseman', share: 0.2 }],
  /** 等級 = 1 + 日數 ÷ 呢個數 */
  daysPerLevel: 14,
  levelMax: 6,
  /** 買路錢：每個敵人幾多金 */
  tollPerEnemy: 12,
  /** 逃跑失敗時先扣人嘅機率 */
  escapeBase: 0.45,
};

export const SHOP = {
  foodPrice: 2,
  foodPack: 20,
  /** 村莊新兵 */
  villageRecruit: { cost: 40, count: 2, refreshDays: 4 },
  /** 酒館傭兵價 = 兵階 × 呢個數 */
  mercPerTier: 70,
  mercOffers: 3,
  mercRefreshDays: 3,
  /** 休息一日士氣回復 */
  restMorale: 4,
};

export type PlaceKind = 'town' | 'village' | 'castle' | 'dungeon' | 'maze' | 'lair';
export type BattleTheme = 'plains' | 'night' | 'fort' | 'crypt' | 'maze';

export interface PlaceDef {
  id: string;
  name: string;
  kind: PlaceKind;
  x: number;
  y: number;
  desc?: string;
  /** 征服點嘅守軍 */
  garrison?: ArmyEntry[];
  garrisonLevel?: number;
  theme?: BattleTheme;
  /** 攻陷獎勵 */
  pool?: TicketPool;
  tickets?: number;
  gold?: number;
  /** 幾多日後守軍重整，可以再打 */
  respawnDays?: number;
  /** 隱藏地點：行近先見到 */
  hidden?: boolean;
  /** 攻破掉落神器 */
  artifact?: string;
}

export const PLACE_ICON: Record<PlaceKind, string> = {
  town: '城', village: '村', castle: '堡', dungeon: '墓', maze: '迷', lair: '賊',
};

export const PLACES: PlaceDef[] = [
  { id: 'griffon', name: '獅鷲城', kind: 'town', x: 30, y: 30, desc: '西境王都，糧足兵精。' },
  { id: 'linjiang', name: '臨江城', kind: 'town', x: 92, y: 50, desc: '中原水陸要衝。' },
  { id: 'wuyi', name: '烏衣鎮', kind: 'town', x: 132, y: 76, desc: '南域傭兵聚腳地。' },
  { id: 'wheat', name: '麥田村', kind: 'village', x: 16, y: 54 },
  { id: 'stonebridge', name: '石橋村', kind: 'village', x: 58, y: 18 },
  { id: 'bamboo', name: '竹溪村', kind: 'village', x: 108, y: 28 },
  { id: 'southpond', name: '南塘村', kind: 'village', x: 112, y: 88 },
  { id: 'ironhelm_keep', name: '鐵盔堡', kind: 'castle', x: 46, y: 38, theme: 'fort', desc: '鐵盔公國嘅主堡。' },
  { id: 'xuan_city', name: '玄都', kind: 'castle', x: 96, y: 10, theme: 'fort', desc: '中原北方大城。' },
  { id: 'bashu_pass', name: '巴山關', kind: 'castle', x: 84, y: 34, theme: 'fort', desc: '扼守入蜀山道。' },
  { id: 'chishui_fort', name: '赤水寨', kind: 'castle', x: 150, y: 62, theme: 'fort', desc: '南域水邊軍寨。' },
  { id: 'qingcheng_pass', name: '青城關', kind: 'castle', x: 118, y: 64, theme: 'fort', desc: '青城國門戶。' },
  { id: 'songglade', name: '林歌谷', kind: 'castle', x: 150, y: 40, theme: 'fort', desc: '精靈林國嘅聖地。' },
  { id: 'spire', name: '亡靈尖塔', kind: 'castle', x: 128, y: 8, theme: 'night', desc: '亡靈法師會嘅黑塔。' },
  {
    id: 'blackfang', name: '黑牙堡', kind: 'castle', x: 50, y: 76, theme: 'fort', pool: 'orc', tickets: 5, gold: 900,
    desc: '獸人部落嘅木石大寨。',
  },
  {
    id: 'anvilhold', name: '鐵砧山城', kind: 'castle', x: 14, y: 86, theme: 'fort', pool: 'fair', tickets: 5, gold: 1100,
    desc: '矮人世代鎮守嘅古老山城。',
  },
  {
    id: 'bonecrypt', name: '枯骨墓穴', kind: 'dungeon', x: 142, y: 20, theme: 'crypt', pool: 'undead', tickets: 5, gold: 800,
    desc: '地底傳出刀劍摩擦聲。只可以帶幾個精兵入去。', garrisonLevel: 3, respawnDays: 18, artifact: 'bone_crown',
    garrison: [{ unit: 'skeleton', count: 8 }, { unit: 'skeleton_archer', count: 4 }, { unit: 'boss_golem', count: 1 }],
  },
  {
    id: 'bullmaze', name: '牛角迷宮', kind: 'maze', x: 80, y: 90, theme: 'maze', pool: 'beast', tickets: 5, gold: 1000,
    desc: '入得去，未必出得返。只可以帶幾個精兵入去。', garrisonLevel: 3, respawnDays: 22, artifact: 'horn_axe',
    garrison: [
      { unit: 'lizard_warrior', count: 6 }, { unit: 'lizard_javelin', count: 3 }, { unit: 'minotaur_guard', count: 2 },
      { unit: 'boss_giant', count: 1 },
    ],
  },
  {
    id: 'abyss', name: '深淵裂口', kind: 'dungeon', x: 8, y: 30, theme: 'crypt', tickets: 0, gold: 3000,
    desc: '大陸裂縫最深處，惡魔領主喺度。', garrisonLevel: 6, respawnDays: 40, artifact: 'demon_heart',
    garrison: [{ unit: 'grave_knight', count: 8 }, { unit: 'necromancer', count: 3 }, { unit: 'boss_demon', count: 1 }],
  },
  {
    id: 'dragonlair', name: '龍巢', kind: 'dungeon', x: 148, y: 90, theme: 'night', tickets: 0, gold: 4000,
    desc: '巨龍盤踞之地，定期出巢燒村。', garrisonLevel: 6, respawnDays: 30, artifact: 'dragon_scale', hidden: false,
    garrison: [{ unit: 'boss_dragon', count: 1 }],
  },
  {
    id: 'lair_a', name: '山賊巢穴', kind: 'lair', x: 40, y: 8, theme: 'night', pool: 'human', tickets: 1, gold: 300,
    desc: '隱蔽山谷入面嘅賊窩。', hidden: true, garrisonLevel: 2, respawnDays: 12,
    garrison: [{ unit: 'footman', count: 9 }, { unit: 'archer', count: 5 }],
  },
  {
    id: 'lair_b', name: '水寨', kind: 'lair', x: 124, y: 50, theme: 'night', pool: 'human', tickets: 1, gold: 300,
    desc: '賊船就泊喺蘆葦後面。', hidden: true, garrisonLevel: 2, respawnDays: 12,
    garrison: [{ unit: 'footman', count: 10 }, { unit: 'archer', count: 6 }],
  },
  {
    id: 'lair_c', name: '亂石崗', kind: 'lair', x: 30, y: 64, theme: 'night', pool: 'human', tickets: 2, gold: 400,
    desc: '亂石堆後傳出火光。', hidden: true, garrisonLevel: 3, respawnDays: 14,
    garrison: [{ unit: 'footman', count: 12 }, { unit: 'axeman', count: 4 }, { unit: 'horseman', count: 4 }],
  },
];

/** 戰場主題 */
export const THEMES: Record<BattleTheme, { sky: number; fog: number; near: number; far: number; light: number }> = {
  plains: { sky: 0x9fc4dc, fog: 0xbcd3dc, near: 90, far: 330, light: 1 },
  night: { sky: 0x1b2438, fog: 0x232d44, near: 45, far: 190, light: 0.42 },
  fort: { sky: 0xc7a98a, fog: 0xc7ab8e, near: 70, far: 280, light: 0.85 },
  crypt: { sky: 0x0e0d14, fog: 0x161520, near: 30, far: 130, light: 0.3 },
  maze: { sky: 0x2a2433, fog: 0x362e40, near: 35, far: 150, light: 0.5 },
};
