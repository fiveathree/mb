import type { ArmyEntry } from './battlefield';
import type { TicketPool } from './gacha';

/** 大地圖斜角鏡頭 */
export const MAP_VIEW = {
  /** 地平線喺畫面幾高（比例） */
  horizon: 0.1,
  /** 焦點（主角）喺畫面幾高 */
  focus: 0.6,
  /** 鏡頭距離（畫面高度倍數）：愈細，主角附近地面愈唔壓扁，似由上向下望 */
  depth: 0.7,
  zoom: 0.8,
  /** 滾輪縮放範圍同每格倍率 */
  zoomMin: 0.5,
  zoomMax: 2.5,
  zoomStep: 1.15,
  /** 地面每幾多像素畫一行 */
  rowStep: 3,
  /** 天空同時有幾多隻飛行生物 */
  skyCount: 12,
  skyRange: 900,
  sea: '#1f4660',
  sky: {
    day: ['#5fa4dc', '#d6ebf4'],
    dusk: ['#3c3f78', '#f0a060'],
    night: ['#080d1e', '#232c48'],
  },
  ridge: { day: '#7f9cb0', dusk: '#5a4a68', night: '#141a2c' },
};

export interface SkyFauna {
  name: string;
  color: string;
  /** 翼展（地圖像素） */
  wing: number;
  speed: number;
  /** 拍翼快慢 */
  flap: number;
  alt: [number, number];
  /** 一群幾多隻 */
  flock: number;
}

export const SKY_FAUNA: Record<string, SkyFauna> = {
  bird: { name: '飛鳥', color: '#2a2e38', wing: 10, speed: 90, flap: 9, alt: [70, 180], flock: 5 },
  crane: { name: '仙鶴', color: '#f0f0f0', wing: 22, speed: 70, flap: 4, alt: [120, 240], flock: 3 },
  immortal: { name: '御劍修士', color: '#8fe0e8', wing: 16, speed: 170, flap: 0, alt: [160, 280], flock: 1 },
  griffin: { name: '獅鷲', color: '#b08a4a', wing: 46, speed: 120, flap: 5, alt: [150, 280], flock: 2 },
  pegasus: { name: '天馬', color: '#eef2fa', wing: 44, speed: 130, flap: 5, alt: [150, 280], flock: 2 },
  harpy: { name: '哈比', color: '#a0607a', wing: 30, speed: 110, flap: 7, alt: [100, 200], flock: 4 },
  wyvern: { name: '雙足飛龍', color: '#3f7a5a', wing: 60, speed: 110, flap: 3.5, alt: [170, 300], flock: 1 },
  demonbat: { name: '魔蝠', color: '#5a1a2c', wing: 34, speed: 130, flap: 10, alt: [90, 190], flock: 5 },
  phoenix: { name: '火鳳凰', color: '#f0702a', wing: 56, speed: 150, flap: 3, alt: [190, 320], flock: 1 },
  dragon: { name: '巨龍', color: '#a82a1e', wing: 96, speed: 95, flap: 2.2, alt: [220, 360], flock: 1 },
};

export const MAP = {
  width: 256,
  height: 160,
  seed: 77031,
  /** 每格畫幾多像素 */
  tilePx: 13,
  /** 山脈同森林嘅噪聲門檻 */
  forestAt: 0.57,
  mountainAt: 0.76,
  /** 河流橋位（Y 格） */
  bridges: [22, 80, 134],
  riderX: 115,
};

/** 舊地圖座標放大倍數，舊存檔同舊地點用 */
export const MAP_SCALE = 1.6;

export type BiomeTile = 'forest' | 'snow' | 'sand' | 'swamp' | 'ash';

/** 地域生態：按勢力同種族分配，半徑內地面換成呢種 */
export const BIOMES: { tile: BiomeTile; x: number; y: number; r: number }[] = [
  { tile: 'forest', x: 232, y: 66, r: 40 }, // 精靈同黑暗精靈嘅大森林
  { tile: 'snow', x: 38, y: 22, r: 44 }, // 北境
  { tile: 'sand', x: 205, y: 130, r: 36 }, // 南域沙地
  { tile: 'swamp', x: 122, y: 136, r: 32 }, // 魔物聯邦同蜥蜴沼澤
  { tile: 'ash', x: 206, y: 24, r: 30 }, // 亡靈焦土
];

export const TERRAIN_COST = { plain: 1, forest: 1.8, hill: 1.4, bridge: 1, snow: 1.3, sand: 1.2, swamp: 1.6, ash: 1.1 };

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
  sizePenalty: 0.012,
  sizePenaltyMax: 0.6,
  /** 地圖上部隊圓點：半徑 = 基本 + 平方根(人數) × 比例 */
  dotBase: 4,
  dotPerRootMan: 1.3,
  dotMax: 20,
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
  /** 戰力低過對方呢個比例就走 */
  fleeRatio: 0.7,
  /** 人數低過對方呢個比例都會走 */
  fleeSizeRatio: 0.8,
  /** 幾遠見到大軍就開始避（格） */
  fleeSight: 24,
  /** 每人減速比例：賊愈多行愈慢 */
  sizeSlow: 0.012,
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
  /** 每次購買數量選擇 */
  buyLots: [1, 10],
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
export type BattleTheme = 'plains' | 'night' | 'fort' | 'crypt' | 'maze' | 'forest' | 'snow' | 'desert' | 'swamp' | 'ash';

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
  /** 魔物城市：地圖上畫成獠牙寨城 */
  monster?: boolean;
  /** 酒館傭兵，冇就跟劇本 */
  mercs?: string[];
}

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
    garrison: [{ unit: 'skeleton', count: 4 }, { unit: 'skeleton_archer', count: 2 }, { unit: 'boss_golem', count: 1 }],
  },
  {
    id: 'bullmaze', name: '牛角迷宮', kind: 'maze', x: 80, y: 90, theme: 'maze', pool: 'beast', tickets: 5, gold: 1000,
    desc: '入得去，未必出得返。只可以帶幾個精兵入去。', garrisonLevel: 3, respawnDays: 22, artifact: 'horn_axe',
    garrison: [
      { unit: 'lizard_warrior', count: 4 }, { unit: 'lizard_javelin', count: 2 }, { unit: 'boss_giant', count: 1 },
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

// 舊地點跟新地圖放大
for (const p of PLACES) {
  p.x = Math.round(p.x * MAP_SCALE);
  p.y = Math.round(p.y * MAP_SCALE);
}

PLACES.push(
  { id: 'frostfang', name: '霜牙城', kind: 'town', x: 30, y: 18, desc: '北地人世代嘅雪城，戰斧同蜜酒出名。', mercs: ['huscarl', 'archer', 'axeman', 'horseman'] },
  { id: 'iceharbor', name: '冰港村', kind: 'village', x: 58, y: 34 },
  { id: 'shadowspire', name: '影語都', kind: 'town', x: 216, y: 74, desc: '大森林深處嘅黑暗精靈之都，光線都入唔到。', mercs: ['darkelf_blade', 'darkelf_witch', 'elf_scout'] },
  { id: 'moonleaf', name: '月葉村', kind: 'village', x: 246, y: 44 },
  {
    id: 'monsterhold', name: '萬魔城', kind: 'town', x: 134, y: 122, monster: true,
    desc: '史萊姆、哥布林同食人魔一齊起嘅魔物城市，意外地有秩序。', mercs: ['slime', 'goblin_spear', 'ogre_brute', 'kobold_miner', 'harpy'],
  },
  { id: 'tomb', name: '十層地下大墳墓', kind: 'dungeon', x: 196, y: 30, theme: 'crypt', desc: '焦土之下一層又一層，最深處嘅王座等緊挑戰者。' },
  {
    id: 'witch_tower', name: '滅國魔女之塔', kind: 'dungeon', x: 66, y: 148, theme: 'night', gold: 3000, garrisonLevel: 7, respawnDays: 45,
    desc: '佢一個人滅過三個國家。', artifact: 'witch_ring', garrison: [{ unit: 'darkelf_witch', count: 3 }, { unit: 'boss_witch', count: 1 }],
  },
  { id: 'goblinfen', name: '沼鬼村', kind: 'village', x: 96, y: 142, monster: true, mercs: ['slime', 'goblin_spear'] },
);

/** 戰場主題 */
export const THEMES: Record<BattleTheme, { sky: number; fog: number; near: number; far: number; light: number; ground: number }> = {
  plains: { sky: 0x9fc4dc, fog: 0xbcd3dc, near: 90, far: 330, light: 1, ground: 0xffffff },
  night: { sky: 0x1b2438, fog: 0x232d44, near: 45, far: 190, light: 0.42, ground: 0xffffff },
  forest: { sky: 0x8fb4a8, fog: 0x9dbcae, near: 50, far: 200, light: 0.75, ground: 0xc8e0b8 },
  fort: { sky: 0xc7a98a, fog: 0xc7ab8e, near: 70, far: 280, light: 0.85, ground: 0xffffff },
  // 地底：草地染成灰石色
  crypt: { sky: 0x0e0d14, fog: 0x161520, near: 25, far: 90, light: 0.62, ground: 0x6a6470 },
  maze: { sky: 0x2a2433, fog: 0x362e40, near: 30, far: 110, light: 0.7, ground: 0x7a6a58 },
  snow: { sky: 0xc8d8e8, fog: 0xdce6ee, near: 60, far: 240, light: 1.05, ground: 0xe8eef6 },
  desert: { sky: 0xe0c89a, fog: 0xe6d2a8, near: 80, far: 300, light: 1.1, ground: 0xe8cf94 },
  swamp: { sky: 0x7e9078, fog: 0x8a9a80, near: 40, far: 170, light: 0.7, ground: 0x8a9a6a },
  ash: { sky: 0x4a4048, fog: 0x584c50, near: 45, far: 190, light: 0.6, ground: 0x6a6268 },
};
