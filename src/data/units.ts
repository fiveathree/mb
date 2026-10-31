import type { PoolId, Rarity } from './gacha';
import type { Race } from './races';

export type Role = 'infantry' | 'archer' | 'cavalry' | 'mage';

export const ROLE_LABEL: Record<Role, string> = { infantry: '步兵', archer: '弓兵', cavalry: '騎兵', mage: '法師' };
/** 指揮用數字鍵對應兵種 */
export const ROLE_KEYS: Role[] = ['infantry', 'archer', 'cavalry', 'mage'];

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
  /** 種族，預設人類 */
  race?: Race;
  /** 抽卡卡池，預設 human */
  pool?: PoolId;
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
  /** 法術傷害倍率 */
  spreadMult?: number;
  spellMult?: number;
  /** 出招速度倍率 */
  actionSpeed?: number;
  /** 酒館同伴，唔喺卡池 */
  companion?: boolean;
  /** 傳說級 Boss */
  boss?: boolean;
  /** 最大法力 */
  mp?: number;
  /** 覆蓋種族膚色，五色龍用 */
  skin?: number;
  /** 額外體型倍率 */
  scale?: number;
  /** 平民：冇盔甲、旗同武器 */
  civilian?: boolean;
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

  // ── 獸人部落 ──
  goblin_spear: {
    id: 'goblin_spear', name: '哥布林矛兵', role: 'infantry', race: 'goblin', pool: 'orc', tier: 1,
    hp: 42, armor: 2, walkSpeed: 2.5, runSpeed: 5, radius: 0.38,
    weapons: ['spear'], morale: 40,
    blockSkill: 0.2, blockChance: 0.15, reaction: 0.35, attackCooldown: [1.2, 2.2], dodgeChance: 0.4,
    trimColor: 0x5a4a2a,
  },
  orc_warrior: {
    id: 'orc_warrior', name: '獸人戰士', role: 'infantry', race: 'orc', pool: 'orc', tier: 2,
    hp: 95, armor: 6, walkSpeed: 2.2, runSpeed: 4.5, radius: 0.5,
    weapons: ['infantry_axe'], morale: 65,
    blockSkill: 0.25, blockChance: 0.2, reaction: 0.3, attackCooldown: [1.3, 2.4], dodgeChance: 0.1,
    trimColor: 0x4a3a28,
  },
  orc_berserker: {
    id: 'orc_berserker', name: '獸人狂戰士', role: 'infantry', race: 'orc', pool: 'orc', tier: 3,
    hp: 120, armor: 5, walkSpeed: 2.4, runSpeed: 5.2, radius: 0.5,
    weapons: ['elite_axe'], morale: 85,
    blockSkill: 0.1, blockChance: 0.05, reaction: 0.3, attackCooldown: [0.8, 1.4], dodgeChance: 0.1,
    trimColor: 0x8a2a20, rarity: 'fine',
  },
  wolf_rider: {
    id: 'wolf_rider', name: '座狼騎兵', role: 'cavalry', race: 'orc', pool: 'orc', tier: 3,
    hp: 90, armor: 6, walkSpeed: 2.3, runSpeed: 4.6, radius: 0.48,
    weapons: ['cavalry_sword'], horse: 'wolf', morale: 70,
    blockSkill: 0.3, blockChance: 0.25, reaction: 0.3, attackCooldown: [1, 1.9], dodgeChance: 0.1,
    trimColor: 0x55504a, rarity: 'fine',
  },
  orc_chief_guard: {
    id: 'orc_chief_guard', name: '黑牙親衛', desc: '酋長親兵，寧死不退', role: 'infantry', race: 'orc', pool: 'orc', tier: 5,
    hp: 150, armor: 13, walkSpeed: 2.2, runSpeed: 4.6, radius: 0.52,
    weapons: ['elite_axe'], morale: 115,
    blockSkill: 0.45, blockChance: 0.3, reaction: 0.22, attackCooldown: [0.9, 1.6], dodgeChance: 0.1,
    trimColor: 0x24242a, rarity: 'special', plumeColor: 0xd04a2a,
  },
  hero_gorak: {
    id: 'hero_gorak', name: '獸人酋長 格拉克', desc: '一聲戰吼，三軍膽寒', role: 'infantry', race: 'orc', pool: 'orc', tier: 6,
    hp: 340, armor: 15, walkSpeed: 2.4, runSpeed: 5, radius: 0.54,
    weapons: ['hero_axe'], morale: 135,
    blockSkill: 0.4, blockChance: 0.3, reaction: 0.18, attackCooldown: [0.7, 1.3], dodgeChance: 0.1,
    trimColor: 0xd04a2a, rarity: 'hero', hero: true, aura: 3.5, plumeColor: 0xd04a2a,
  },

  // ── 亡靈軍團 ──
  skeleton: {
    id: 'skeleton', name: '骷髏兵', role: 'infantry', race: 'undead', pool: 'undead', tier: 1,
    hp: 50, armor: 3, walkSpeed: 2, runSpeed: 3.9, radius: 0.42,
    weapons: ['infantry_sword'], morale: 200,
    blockSkill: 0.25, blockChance: 0.3, reaction: 0.35, attackCooldown: [1.4, 2.6], dodgeChance: 0,
    trimColor: 0x3a3844,
  },
  skeleton_archer: {
    id: 'skeleton_archer', name: '骷髏弓手', role: 'archer', race: 'undead', pool: 'undead', tier: 2,
    hp: 46, armor: 2, walkSpeed: 2, runSpeed: 3.9, radius: 0.42,
    weapons: ['troop_bow', 'short_sword'], morale: 200,
    blockSkill: 0.2, blockChance: 0.1, reaction: 0.4, attackCooldown: [1.5, 2.8], dodgeChance: 0,
    trimColor: 0x3a3844,
  },
  grave_knight: {
    id: 'grave_knight', name: '墓園騎士', role: 'infantry', race: 'undead', pool: 'undead', tier: 3,
    hp: 105, armor: 11, walkSpeed: 2, runSpeed: 4, radius: 0.47,
    weapons: ['elite_sword'], morale: 200,
    blockSkill: 0.45, blockChance: 0.5, reaction: 0.3, attackCooldown: [1.2, 2.2], dodgeChance: 0,
    trimColor: 0x2a2640, rarity: 'fine',
  },
  death_rider: {
    id: 'death_rider', name: '死亡騎士', desc: '不知疲倦嘅黑甲騎士', role: 'cavalry', race: 'undead', pool: 'undead', tier: 5,
    hp: 135, armor: 15, walkSpeed: 2.2, runSpeed: 4.4, radius: 0.48,
    weapons: ['elite_lance', 'cavalry_sword'], horse: 'warhorse', morale: 200,
    blockSkill: 0.5, blockChance: 0.4, reaction: 0.25, attackCooldown: [1, 1.8], dodgeChance: 0,
    trimColor: 0x1c1a26, rarity: 'special', plumeColor: 0x62d0a8,
  },
  hero_morvain: {
    id: 'hero_morvain', name: '骸骨君王 莫凡', desc: '死過一次，唔會再怕', role: 'infantry', race: 'undead', pool: 'undead', tier: 6,
    hp: 300, armor: 20, walkSpeed: 2.2, runSpeed: 4.5, radius: 0.5,
    weapons: ['hero_blade'], morale: 300,
    blockSkill: 0.8, blockChance: 0.7, reaction: 0.16, attackCooldown: [0.7, 1.2], dodgeChance: 0,
    trimColor: 0x62d0a8, rarity: 'hero', hero: true, aura: 3, plumeColor: 0x62d0a8,
  },

  // ── 迷宮異族 ──
  lizard_warrior: {
    id: 'lizard_warrior', name: '蜥蜴戰士', role: 'infantry', race: 'lizard', pool: 'beast', tier: 2,
    hp: 80, armor: 7, walkSpeed: 2.3, runSpeed: 4.7, radius: 0.46,
    weapons: ['infantry_sword'], morale: 60,
    blockSkill: 0.4, blockChance: 0.4, reaction: 0.28, attackCooldown: [1.2, 2.2], dodgeChance: 0.2,
    trimColor: 0x2f6a52,
  },
  lizard_javelin: {
    id: 'lizard_javelin', name: '蜥蜴標槍手', role: 'archer', race: 'lizard', pool: 'beast', tier: 2,
    hp: 62, armor: 4, walkSpeed: 2.4, runSpeed: 4.9, radius: 0.45,
    weapons: ['troop_javelin', 'short_sword'], morale: 55,
    blockSkill: 0.3, blockChance: 0.2, reaction: 0.3, attackCooldown: [1.3, 2.4], dodgeChance: 0.25,
    trimColor: 0x2f6a52,
  },
  kobold_miner: {
    id: 'kobold_miner', name: '狗頭礦工兵', role: 'infantry', race: 'goblin', pool: 'beast', tier: 3,
    hp: 70, armor: 8, walkSpeed: 2.3, runSpeed: 4.6, radius: 0.4,
    weapons: ['elite_axe'], morale: 60,
    blockSkill: 0.3, blockChance: 0.2, reaction: 0.3, attackCooldown: [1.1, 2], dodgeChance: 0.3,
    trimColor: 0x8a6a3a, rarity: 'fine',
  },
  minotaur_guard: {
    id: 'minotaur_guard', name: '牛頭守衛', desc: '迷宮守衛，一撞飛人', role: 'infantry', race: 'minotaur', pool: 'beast', tier: 5,
    hp: 210, armor: 12, walkSpeed: 2.3, runSpeed: 4.9, radius: 0.62,
    weapons: ['elite_axe'], morale: 110,
    blockSkill: 0.2, blockChance: 0.1, reaction: 0.3, attackCooldown: [1, 1.8], dodgeChance: 0,
    trimColor: 0x4a3020, rarity: 'special', plumeColor: 0xc88a3a,
  },
  hero_asterion: {
    id: 'hero_asterion', name: '迷宮之主 阿斯泰', desc: '牛頭人之王，雙斧開路', role: 'infantry', race: 'minotaur', pool: 'beast', tier: 6,
    hp: 420, armor: 16, walkSpeed: 2.4, runSpeed: 5.1, radius: 0.66,
    weapons: ['hero_axe'], morale: 140,
    blockSkill: 0.3, blockChance: 0.2, reaction: 0.2, attackCooldown: [0.8, 1.4], dodgeChance: 0,
    trimColor: 0xc88a3a, rarity: 'hero', hero: true, aura: 2.5, plumeColor: 0xc88a3a,
  },
  hero_ignara: {
    id: 'hero_ignara', name: '龍裔將軍 伊格娜', desc: '身負龍血，刀火同行', role: 'cavalry', race: 'dragonkin', pool: 'beast', tier: 6,
    hp: 290, armor: 19, walkSpeed: 2.4, runSpeed: 5, radius: 0.52,
    weapons: ['hero_lance', 'hero_blade'], horse: 'warhorse', morale: 135,
    blockSkill: 0.75, blockChance: 0.6, reaction: 0.16, attackCooldown: [0.7, 1.2], dodgeChance: 0.1,
    trimColor: 0xe0502c, rarity: 'hero', hero: true, aura: 3, plumeColor: 0xe0502c,
  },

  // ── 精靈與矮人 ──
  elf_scout: {
    id: 'elf_scout', name: '精靈斥候', role: 'archer', race: 'elf', pool: 'fair', tier: 2,
    hp: 56, armor: 3, walkSpeed: 2.6, runSpeed: 5.3, radius: 0.43,
    weapons: ['troop_bow', 'short_sword'], morale: 60,
    blockSkill: 0.35, blockChance: 0.2, reaction: 0.28, attackCooldown: [1.3, 2.4], dodgeChance: 0.4,
    trimColor: 0x5f9a4a,
  },
  dwarf_guard: {
    id: 'dwarf_guard', name: '矮人守衛', role: 'infantry', race: 'dwarf', pool: 'fair', tier: 2,
    hp: 95, armor: 11, walkSpeed: 1.9, runSpeed: 3.9, radius: 0.48,
    weapons: ['infantry_sword'], morale: 75,
    blockSkill: 0.5, blockChance: 0.5, reaction: 0.28, attackCooldown: [1.3, 2.3], dodgeChance: 0.05,
    trimColor: 0x8a5a2c,
  },
  dwarf_crossbow: {
    id: 'dwarf_crossbow', name: '矮人弩手', role: 'archer', race: 'dwarf', pool: 'fair', tier: 3,
    hp: 80, armor: 9, walkSpeed: 1.9, runSpeed: 3.8, radius: 0.48,
    weapons: ['troop_crossbow', 'infantry_sword'], morale: 70,
    blockSkill: 0.4, blockChance: 0.35, reaction: 0.28, attackCooldown: [1.3, 2.4], dodgeChance: 0.05,
    trimColor: 0x8a5a2c, rarity: 'fine',
  },
};

// 法師同傳說級
const caster = (id: string, name: string, desc: string, race: Race, pool: PoolId, rarity: Rarity, weapon: string, tier: number, trimColor: number): UnitDef => ({
  id, name, desc, role: 'mage', race, pool, rarity, tier, trimColor, hp: 60 + tier * 6, armor: 3, walkSpeed: 2.2, runSpeed: 4.3, radius: 0.44,
  weapons: [weapon, 'short_sword'], morale: 70, blockSkill: 0.3, blockChance: 0.2, reaction: 0.3, attackCooldown: [1.4, 2.4], dodgeChance: 0.2,
  plumeColor: trimColor,
});
UNITS.elf_mage = caster('elf_mage', '精靈法師', '遠程火球', 'elf', 'fair', 'fine', 'troop_fire', 3, 0x8fd0e8);
UNITS.necromancer = caster('necromancer', '死靈法師', '枯骨雷擊', 'undead', 'undead', 'special', 'troop_bolt', 4, 0x7a4fc0);
UNITS.demon_cultist = caster('demon_cultist', '惡魔教徒', '邪火祭司', 'demon', 'beast', 'fine', 'troop_fire', 3, 0xc04a3a);

const boss = (id: string, name: string, race: Race, weapon: string, hp: number, armor: number, radius: number, speed: number): UnitDef => ({
  id, name, role: 'infantry', race, tier: 8, hp, armor, walkSpeed: speed * 0.6, runSpeed: speed, radius, weapons: [weapon], morale: 9999,
  blockSkill: 0, blockChance: 0, reaction: 0.3, attackCooldown: [1.1, 1.9], dodgeChance: 0, trimColor: 0x2a2228, boss: true, hero: true,
  rarity: 'hero', pool: 'boss' as PoolId,
});
UNITS.boss_golem = boss('boss_golem', '遠古魔像', 'golem', 'boss_fist', 380, 16, 1.1, 3.2);
UNITS.boss_giant = boss('boss_giant', '牛角巨人', 'giant', 'boss_club', 480, 10, 1.3, 3.8);
UNITS.boss_demon = boss('boss_demon', '惡魔領主', 'demon', 'boss_club', 1500, 20, 1, 4.6);
const dragon = (id: string, name: string, breath: string, hp: number, armor: number, speed: number, skin: number): UnitDef => ({
  ...boss(id, name, 'dragon', breath, hp, armor, 2.2, speed), weapons: [breath, 'boss_club'], role: 'archer', skin,
});
UNITS.boss_dragon = dragon('boss_dragon', '赤焰巨龍', 'dragon_fire', 1500, 16, 4, 0xb02a1e);
UNITS.boss_dragon_white = dragon('boss_dragon_white', '霜白巨龍', 'dragon_frost', 1300, 14, 4.8, 0xd8e8f0);
UNITS.boss_dragon_blue = dragon('boss_dragon_blue', '雷霆藍龍', 'dragon_bolt', 1400, 15, 4.4, 0x2f6fc8);
UNITS.boss_dragon_green = dragon('boss_dragon_green', '毒霧綠龍', 'dragon_poison', 1600, 13, 3.8, 0x3f8f45);
UNITS.boss_dragon_black = dragon('boss_dragon_black', '蝕骨黑龍', 'dragon_acid', 1700, 18, 3.6, 0x24222c);
UNITS.boss_wyrm = { ...dragon('boss_wyrm', '滅世飛龍', 'wyrm_breath', 4000, 22, 5.5, 0x3a2a5a), scale: 1.5, radius: 3 };
UNITS.boss_lich = {
  ...boss('boss_lich', '骸骨魔導王', 'undead', 'lich_bolt', 2600, 18, 0.9, 4), role: 'mage', weapons: ['lich_bolt', 'lich_fire', 'boss_club'],
  scale: 1.6, trimColor: 0x3a2a6a, plumeColor: 0xc0a0ff, skin: 0xe8e4d4,
};
UNITS.boss_witch = {
  ...boss('boss_witch', '滅國魔女', 'human', 'witch_curse', 2000, 12, 0.7, 5), role: 'mage', weapons: ['witch_curse', 'lich_bolt', 'boss_fist'],
  scale: 1.25, trimColor: 0x6a1a7a, plumeColor: 0xc040e0, skin: 0xf0d8e0,
};
/** 離巢巨龍輪流係五色之一 */
export const DRAGON_BREEDS = ['boss_dragon', 'boss_dragon_white', 'boss_dragon_blue', 'boss_dragon_green', 'boss_dragon_black'];

// 各劇本兵種
const troop = (
  id: string, name: string, role: Role, tier: number, hp: number, armor: number, weapons: string[], trimColor: number,
  extra: Partial<UnitDef> = {},
): UnitDef => ({
  id, name, role, tier, hp, armor, weapons, trimColor, walkSpeed: 2.2, runSpeed: 4.4, radius: 0.46, morale: 55 + tier * 8,
  blockSkill: 0.3 + tier * 0.06, blockChance: 0.3 + tier * 0.05, reaction: 0.3, attackCooldown: [1.3, 2.3], dodgeChance: 0.15,
  pool: 'scenario' as PoolId, rarity: tier >= 4 ? 'special' : tier === 3 ? 'fine' : 'common', ...extra,
});
for (const u of [
  troop('legionary', '羅馬軍團兵', 'infantry', 3, 95, 10, ['elite_sword'], 0xb5362c),
  troop('auxilia', '輔助弓手', 'archer', 2, 58, 4, ['troop_bow', 'short_sword'], 0x8a6a3a),
  troop('hoplite', '希臘重裝步兵', 'infantry', 3, 90, 11, ['spear'], 0xc8a04a),
  troop('barbarian', '蠻族戰士', 'infantry', 2, 80, 3, ['infantry_axe'], 0x6a4a2a),
  troop('crusader', '十字軍騎士', 'cavalry', 4, 105, 13, ['elite_lance', 'cavalry_sword'], 0xe8e4d8, { horse: 'warhorse' }),
  troop('sergeant', '軍士', 'infantry', 2, 75, 8, ['infantry_sword'], 0xc8c0a8),
  troop('mamluk', '馬穆魯克', 'cavalry', 4, 92, 9, ['cavalry_sword'], 0x2d9a6a, { horse: 'steppe' }),
  troop('dao_guard', '刀盾手', 'infantry', 2, 78, 7, ['infantry_sword'], 0x4a5a3a),
  troop('sword_cultivator', '劍修', 'mage', 4, 90, 6, ['flying_sword', 'elite_sword'], 0x8fe0e8),
  troop('demon_grunt', '深淵魔卒', 'infantry', 3, 100, 8, ['elite_axe'], 0x7a1a24, { race: 'demon' }),
  troop('awakened', '覺醒者', 'infantry', 4, 120, 9, ['elite_sword'], 0xe8c04a),
  troop('kobold', '狗頭人', 'infantry', 1, 45, 2, ['spear'], 0x8a6a3a, { race: 'goblin' }),
  // 升階樹頂
  troop('vanguard', '鐵甲陷陣', 'infantry', 5, 160, 18, ['elite_sword'], 0x8a93a0, { plumeColor: 0xe0e4ec, desc: '步兵頂點，全身板甲' }),
  troop('sharpshooter', '神射手', 'archer', 5, 95, 8, ['elite_bow', 'infantry_sword'], 0x4e8a3a, { plumeColor: 0x9ae86a, desc: '弓兵頂點，百發百中' }),
  troop('templar', '聖殿騎士', 'cavalry', 5, 150, 17, ['elite_lance', 'cavalry_sword'], 0xf0ece0, { horse: 'warhorse', plumeColor: 0xc0302a, desc: '騎兵頂點，人馬俱甲' }),
  // 異族
  ...[0xa86a3a, 0x5a7a4a, 0x7a5a8a, 0xb0a070].map((color, i) => troop(`folk_${i}`, '鎮民', 'infantry', 1, 40, 0, ['short_sword'], color, { civilian: true, walkSpeed: 1.4, runSpeed: 1.8 })),
  troop('griffin_rider', '獅鷲騎士', 'cavalry', 5, 130, 11, ['elite_lance', 'cavalry_sword'], 0xb08a4a, { pool: 'fair', horse: 'griffin_mount', plumeColor: 0xd9b24a, desc: '由天上撲落嚟' }),
  troop('pegasus_knight', '天馬騎士', 'cavalry', 4, 100, 7, ['cavalry_sword'], 0xe8ecf4, { pool: 'fair', horse: 'pegasus', plumeColor: 0x8fc8ff, desc: '快得留唔低影' }),
  troop('lord_knight', '領主', 'cavalry', 6, 240, 16, ['elite_lance', 'hero_blade'], 0xd9b24a, { horse: 'warhorse', hero: true, aura: 3, plumeColor: 0xf2c14e, morale: 130 }),
  troop('huscarl', '北地親衛', 'infantry', 3, 110, 9, ['infantry_axe'], 0x9ab8d0, { race: 'nord', desc: '雪原上嘅重斧戰士' }),
  troop('darkelf_blade', '影刃', 'infantry', 3, 85, 6, ['elite_sword'], 0x4a3a6a, { race: 'darkelf', pool: 'fair', runSpeed: 5.2, desc: '由樹影入面出手' }),
  troop('slime', '史萊姆', 'infantry', 1, 55, 1, ['short_sword'], 0x4fb8e8, { race: 'slime', pool: 'beast', desc: '軟綿綿，斬極都仲喺度' }),
  troop('ogre_brute', '食人魔', 'infantry', 3, 170, 5, ['infantry_axe'], 0x7a5a2a, { race: 'ogre', pool: 'beast', walkSpeed: 1.9, runSpeed: 3.8, desc: '又大隻又好打' }),
  troop('centaur', '半人馬戰士', 'cavalry', 3, 100, 6, ['cavalry_sword'], 0x8a6a3a, { race: 'centaur', pool: 'beast', horse: 'steppe', desc: '人馬一體，草原之子' }),
  troop('harpy', '哈比', 'archer', 2, 50, 2, ['troop_bow', 'short_sword'], 0xb06a8a, { race: 'harpy', pool: 'beast', desc: '尖叫同利爪' }),
  troop('merfolk', '人魚衛士', 'infantry', 2, 72, 5, ['spear'], 0x2d9aa8, { race: 'merfolk', pool: 'beast', desc: '由河口上岸嘅矛手' }),
  troop('vampire', '吸血鬼伯爵', 'infantry', 5, 150, 10, ['elite_sword'], 0x8a1a2c, { race: 'vampire', pool: 'undead', desc: '永夜貴族' }),
  troop('werewolf', '狼人', 'infantry', 4, 130, 6, ['elite_axe'], 0x5a5650, { race: 'werewolf', pool: 'beast', runSpeed: 5.4, desc: '月圓之下冇人走得甩' }),
  troop('treant', '樹人', 'infantry', 4, 210, 12, ['elite_axe'], 0x4f7a3a, { race: 'treant', pool: 'fair', walkSpeed: 1.6, runSpeed: 3.2, desc: '慢，但斬唔死' }),
]) UNITS[u.id] = u;
UNITS.fairy = caster('fairy', '妖精術士', '細粒，雷擊好痛', 'fairy', 'fair', 'fine', 'troop_bolt', 3, 0xe0a0e8);
UNITS.darkelf_witch = caster('darkelf_witch', '影語女巫', '森林深處嘅咒術', 'darkelf', 'fair', 'special', 'troop_bolt', 4, 0x8a5ac0);
// 劇場英雄：唔喺抽卡池
const storyHero = (id: string, name: string, desc: string, role: Role, weapons: string[], hp: number, trim: number, aura: number, extra: Partial<UnitDef> = {}) =>
  troop(id, name, role, 6, hp, 14, weapons, trim, {
    desc, hero: true, aura, rarity: 'hero', plumeColor: trim, morale: 130, blockSkill: 0.8, blockChance: 0.7, reaction: 0.15,
    attackCooldown: [0.7, 1.3], dodgeChance: 0.3, runSpeed: 5, ...extra,
  });
for (const u of [
  storyHero('story_crow', '俠盜 白鴉', '只劫貪官', 'archer', ['hero_bow', 'hero_blade'], 200, 0xf0f0f0, 2.5),
  storyHero('story_redbeard', '赤鬚寨主', '老山賊，賊中有義', 'infantry', ['hero_axe'], 300, 0xc0402a, 3),
  storyHero('story_ellen', '流亡公主 艾蓮', '王室血脈，一呼百應', 'cavalry', ['hero_lance', 'hero_blade'], 230, 0xe8c0e0, 5, { horse: 'warhorse' }),
  storyHero('story_monk', '苦行僧 玄空', '杖下度人', 'mage', ['troop_bolt', 'hero_blade'], 240, 0xe0b040, 4),
]) UNITS[u.id] = u;
UNITS.boss_cyclops = { ...boss('boss_cyclops', '獨眼巨人', 'giant', 'boss_club', 1100, 14, 1.3, 3.9) };
UNITS.boss_hellking = { ...boss('boss_hellking', '深淵魔王', 'demon', 'boss_club', 1800, 22, 1.1, 4.6) };
UNITS.boss_chimera = { ...boss('boss_chimera', '上古凶獸', 'giant', 'boss_club', 1400, 16, 1.4, 4.4) };
UNITS.boss_heavenly = { ...boss('boss_heavenly', '渡劫老魔', 'demon', 'boss_fist', 1500, 18, 1, 5) };

// 酒館同伴
const companion = (id: string, name: string, desc: string, role: Role, weapons: string[], trimColor: number): UnitDef => ({
  id, name, desc, role, weapons, trimColor, tier: 4, hp: 130, armor: 10, walkSpeed: 2.4, runSpeed: 4.8, radius: 0.46, morale: 110,
  blockSkill: 0.6, blockChance: 0.5, reaction: 0.2, attackCooldown: [1, 1.8], dodgeChance: 0.25,
  rarity: 'special', companion: true, plumeColor: trimColor,
});
UNITS.comp_medic = companion('comp_medic', '軍醫 白薇', '傷兵好得快', 'archer', ['troop_bow', 'short_sword'], 0xe8e8f0);
UNITS.comp_trader = companion('comp_trader', '行商 錢滿', '識講價', 'infantry', ['infantry_sword'], 0xd9b24a);
UNITS.comp_veteran = companion('comp_veteran', '老兵 鐵叔', '百戰餘生，部下信服', 'infantry', ['elite_sword'], 0x8a8a92);

// 原有精靈同矮人歸入山林卡池
for (const id of ['elf_longbow', 'hero_sylvia']) Object.assign(UNITS[id], { race: 'elf', pool: 'fair' });
for (const id of ['dwarf_breaker', 'hero_barn']) Object.assign(UNITS[id], { race: 'dwarf', pool: 'fair' });

/** 步兵同弓兵行為參數 */
export const AI = {
  /** 地下城跟隨時，同房幾遠就主動打 */
  roomEngageDist: 30,
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
  /** 噴火 Boss 會逼到呢個距離 */
  bossStandoff: 18,
  /** 開局幾耐後騎兵出擊（秒） */
  cavalryDelay: 7,
  /** 檢查間隔（秒） */
  thinkEvery: 1,
  /** 敵軍前進點離我軍前線嘅距離 */
  advanceStep: 14,
};
