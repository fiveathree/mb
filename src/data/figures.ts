import type { Rarity } from './gacha';
import type { Race } from './races';

/** 生活節奏嘅一步：去邊、做乜、做幾耐 */
export interface RoutineStep {
  /** 喺度做緊乜，大地圖會顯示 */
  job: string;
  go: 'forest' | 'water' | 'mine' | 'home' | 'town';
  wait: number;
  /** 做完實力加深，招請時等級更高、價錢更貴 */
  grow?: boolean;
  /** 收成：魚運返城加糧，礦運返城加鐵 */
  haul?: 'food' | 'iron';
}

export interface FigureDef {
  id: string;
  name: string;
  desc: string;
  rarity: Rarity;
  role: 'infantry' | 'archer' | 'cavalry' | 'mage';
  tier: number;
  hp: number;
  armor: number;
  weapons: string[];
  color: number;
  race?: Race;
  horse?: string;
  /** 士氣光環 */
  aura: number;
  home: string;
  price: number;
  /** 要幾多聲望先肯跟你 */
  renown: number;
  routine: RoutineStep[];
}

const hunt: RoutineStep = { job: '喺森林狩獵', go: 'forest', wait: 8, grow: true };
const sellAtTown: RoutineStep = { job: '入城賣貨飲酒', go: 'town', wait: 6 };
const rest: RoutineStep = { job: '返屋企休息', go: 'home', wait: 6 };

/** 平民工作 */
export const ROUTINES: Record<'fisher' | 'miner', RoutineStep[]> = {
  fisher: [{ job: '落河釣魚', go: 'water', wait: 9 }, { job: '運魚入城賣', go: 'town', wait: 4, haul: 'food' }],
  miner: [{ job: '喺山邊掘礦', go: 'mine', wait: 10 }, { job: '運礦石入城', go: 'town', wait: 4, haul: 'iron' }],
};

/** 有名有姓嘅人物：各有生活，喺大地圖行嚟行去，撞到或者喺佢落腳嘅城市可以招請 */
export const FIGURES: FigureDef[] = [
  {
    id: 'fig_hunter', name: '老獵人 鐵箭伯', desc: '一輩子喺林入面過', rarity: 'fine', role: 'archer', tier: 3, hp: 95, armor: 4, weapons: ['elite_bow', 'short_sword'],
    color: 0x7a5a30, aura: 1, home: 'moonleaf', price: 600, renown: 0, routine: [hunt, sellAtTown, hunt, rest],
  },
  {
    id: 'fig_fisher', name: '漁翁 江上客', desc: '釣魚時連龍都唔理', rarity: 'fine', role: 'infantry', tier: 3, hp: 110, armor: 3, weapons: ['spear'],
    color: 0x4a7a9a, aura: 1, home: 'linjiang', price: 500, renown: 0,
    routine: [{ job: '喺江邊釣魚', go: 'water', wait: 12, grow: true }, sellAtTown, rest],
  },
  {
    id: 'fig_miner', name: '礦頭 石老大', desc: '一鎚可以開山', rarity: 'special', role: 'infantry', tier: 4, hp: 170, armor: 10, weapons: ['elite_axe'],
    color: 0x6a6258, race: 'dwarf', aura: 2, home: 'anvilhold', price: 1200, renown: 5,
    routine: [{ job: '落礦坑掘礦', go: 'mine', wait: 12, grow: true }, sellAtTown, rest],
  },
  {
    id: 'fig_healer', name: '行腳醫 素問', desc: '邊度有傷兵就去邊度', rarity: 'special', role: 'mage', tier: 4, hp: 110, armor: 4, weapons: ['troop_bolt', 'short_sword'],
    color: 0xe0e8d8, aura: 3, home: 'wheat', price: 1400, renown: 5,
    routine: [{ job: '入城替人睇症', go: 'town', wait: 10, grow: true }, { job: '上山採藥', go: 'forest', wait: 8 }],
  },
  {
    id: 'fig_knight', name: '遊俠騎士 薇奧拉', desc: '路見不平就拔劍', rarity: 'hero', role: 'cavalry', tier: 5, hp: 210, armor: 14, weapons: ['hero_lance', 'hero_blade'],
    color: 0xd04a6a, horse: 'warhorse', aura: 3, home: 'griffon', price: 3000, renown: 15,
    routine: [{ job: '四處行俠仗義', go: 'town', wait: 7, grow: true }, { job: '喺林邊追捕賊人', go: 'forest', wait: 7 }],
  },
  {
    id: 'fig_master', name: '武學宗師 鐵拳宋', desc: '一拳打通任督，專收窮徒弟', rarity: 'hero', role: 'infantry', tier: 6, hp: 280, armor: 12, weapons: ['hero_blade'],
    color: 0xc8a040, aura: 3, home: 'wuyi', price: 3500, renown: 20,
    routine: [
      { job: '喺武館訓練弟子', go: 'home', wait: 10, grow: true }, { job: '上山閉關冥想', go: 'mine', wait: 12, grow: true }, { job: '落山行俠仗義', go: 'town', wait: 7 },
    ],
  },
  {
    id: 'fig_immortal', name: '玄機真人', desc: '修仙宗師，一劍可斷江', rarity: 'ur', role: 'mage', tier: 6, hp: 320, armor: 14, weapons: ['flying_sword', 'hero_blade'],
    color: 0x8fe0e8, aura: 5, home: 'xuan_city', price: 9000, renown: 50,
    routine: [
      { job: '潛心打坐，吐納修練', go: 'mine', wait: 14, grow: true }, { job: '坐陣宗門，守護山門大陣', go: 'home', wait: 12 },
      { job: '訓練弟子', go: 'home', wait: 10, grow: true }, { job: '下山行俠仗義', go: 'town', wait: 8 },
    ],
  },
  {
    id: 'fig_vampire', name: '夜宴伯爵 瓦雷利', desc: '佢嘅賓客都冇再行出過古堡', rarity: 'hero', role: 'infantry', tier: 6, hp: 300, armor: 12, weapons: ['hero_blade'],
    color: 0x8a1a2c, race: 'vampire', aura: 3, home: 'shadowspire', price: 4000, renown: 25,
    routine: [
      { job: '喺古堡設宴，拉攏貴族', go: 'home', wait: 10, grow: true }, { job: '入城培植眷屬', go: 'town', wait: 9, grow: true }, { job: '喺夜林狩獵', go: 'forest', wait: 8 },
    ],
  },
  {
    id: 'fig_assassin', name: '影語刺客 夜鶯', desc: '佢嘅名只喺死人口中出現', rarity: 'hero', role: 'infantry', tier: 5, hp: 190, armor: 7, weapons: ['hero_blade'],
    color: 0x3a2a5a, race: 'darkelf', aura: 2, home: 'shadowspire', price: 2800, renown: 15,
    routine: [{ job: '潛入城中打探', go: 'town', wait: 8, grow: true }, { job: '喺森林練刀', go: 'forest', wait: 8 }],
  },
  {
    id: 'fig_wolfking', name: '北地狼王 布倫', desc: '雪原上冇人敢攔佢', rarity: 'hero', role: 'infantry', tier: 6, hp: 330, armor: 13, weapons: ['hero_axe'],
    color: 0x9ab8d0, race: 'nord', aura: 3, home: 'frostfang', price: 3600, renown: 20,
    routine: [{ job: '帶族人圍獵', go: 'forest', wait: 9, grow: true }, { job: '返城飲蜜酒', go: 'home', wait: 7 }],
  },
  {
    id: 'fig_slimelord', name: '史萊姆王 噗噗', desc: '萬魔城嘅吉祥物，亦係最強嗰個', rarity: 'ur', role: 'infantry', tier: 6, hp: 420, armor: 8, weapons: ['hero_blade'],
    color: 0x4fb8e8, race: 'slime', aura: 4, home: 'monsterhold', price: 8000, renown: 40,
    routine: [
      { job: '吞食魔物，吸收能力', go: 'water', wait: 12, grow: true }, { job: '喺萬魔城調解糾紛', go: 'home', wait: 10 }, { job: '巡視魔物村落', go: 'town', wait: 8 },
    ],
  },
  {
    id: 'fig_merchant', name: '大商人 金算盤', desc: '識行情多過識字', rarity: 'fine', role: 'archer', tier: 3, hp: 90, armor: 5, weapons: ['troop_crossbow', 'short_sword'],
    color: 0xd9b24a, aura: 1, home: 'linjiang', price: 700, renown: 0,
    routine: [{ job: '去鄰城傾生意', go: 'town', wait: 8, grow: true }, { job: '運貨途中', go: 'town', wait: 6 }],
  },
];

export const figureOf = (id: string) => FIGURES.find((f) => f.id === id);

/** 招請價：愈修練愈貴 */
export const figurePrice = (f: FigureDef, growth: number) => Math.round(f.price * (1 + growth * 0.08));
export const FIGURE_MAX_LEVEL = 9;
/** 每次修練有幾大機會突破、每步逗留倍率 */
export const GROWTH_CHANCE = 0.1;
export const ROUTINE_WAIT = 2;
/** 招請距離：行到呢個範圍內，城市酒館都見到佢 */
export const FIGURE_TOWN_DIST = 8;
