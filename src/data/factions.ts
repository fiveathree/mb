import type { ArmyEntry } from './battlefield';
import type { SkillId } from './economy';

export type Region = 'west' | 'center' | 'south' | 'north';
export const REGION_NAME: Record<Region, string> = { west: '西境', center: '中原', south: '南域', north: '北荒魔域' };

export interface FactionDef {
  id: string;
  name: string;
  region: Region;
  color: string;
  /** 城鎮守軍 */
  garrison: ArmyEntry[];
  level: number;
}

const human = (a: number, b: number, c: number): ArmyEntry[] => [
  { unit: 'footman', count: a }, { unit: 'pikeman', count: b }, { unit: 'archer', count: c },
];

export const FACTIONS: FactionDef[] = [
  { id: 'griffin', name: '獅鷲王國', region: 'west', color: '#3f7fd0', level: 3, garrison: [...human(12, 6, 8), { unit: 'griffin_guard', count: 3 }] },
  { id: 'ironhelm', name: '鐵盔公國', region: 'west', color: '#8a93a0', level: 3, garrison: [...human(10, 10, 6), { unit: 'crossbowman', count: 4 }] },
  { id: 'xuan', name: '玄', region: 'center', color: '#2c2c38', level: 3, garrison: [...human(12, 6, 6), { unit: 'blackmail_rider', count: 3 }] },
  { id: 'bashu', name: '巴蜀', region: 'center', color: '#3f9a58', level: 3, garrison: [...human(10, 6, 8), { unit: 'shu_mountaineer', count: 4 }] },
  { id: 'jiangdong', name: '江東', region: 'center', color: '#2d9aa8', level: 3, garrison: [...human(12, 4, 6), { unit: 'jiangdong_marine', count: 5 }] },
  { id: 'wuyi', name: '烏衣', region: 'south', color: '#7a4fc0', level: 2, garrison: [...human(10, 4, 6), { unit: 'ya_guard', count: 3 }] },
  { id: 'chishui', name: '赤水', region: 'south', color: '#c04a3a', level: 2, garrison: human(12, 6, 6) },
  { id: 'qingcheng', name: '青城', region: 'south', color: '#5fae8a', level: 2, garrison: human(10, 8, 6) },
  {
    id: 'sylvan', name: '精靈林國', region: 'north', color: '#7fd06a', level: 4,
    garrison: [{ unit: 'elf_scout', count: 12 }, { unit: 'elf_mage', count: 4 }, { unit: 'elf_longbow', count: 4 }, { unit: 'dwarf_guard', count: 6 }],
  },
  {
    id: 'dwarves', name: '矮人山城', region: 'north', color: '#c88a3a', level: 4,
    garrison: [{ unit: 'dwarf_guard', count: 14 }, { unit: 'dwarf_crossbow', count: 6 }, { unit: 'dwarf_breaker', count: 3 }],
  },
  {
    id: 'orcs', name: '獸人部落', region: 'north', color: '#6f8a3a', level: 3,
    garrison: [{ unit: 'goblin_spear', count: 10 }, { unit: 'orc_warrior', count: 10 }, { unit: 'orc_berserker', count: 4 }, { unit: 'wolf_rider', count: 4 }],
  },
  {
    id: 'undead', name: '亡靈法師會', region: 'north', color: '#a0a8b8', level: 4,
    garrison: [{ unit: 'skeleton', count: 14 }, { unit: 'skeleton_archer', count: 8 }, { unit: 'grave_knight', count: 4 }, { unit: 'necromancer', count: 3 }],
  },
  {
    id: 'northmen', name: '北境聯盟', region: 'west', color: '#9ab8d0', level: 3,
    garrison: [{ unit: 'huscarl', count: 14 }, { unit: 'archer', count: 8 }, { unit: 'axeman', count: 5 }],
  },
  {
    id: 'darkelves', name: '影語議會', region: 'north', color: '#6a4f9a', level: 4,
    garrison: [{ unit: 'darkelf_blade', count: 12 }, { unit: 'darkelf_witch', count: 4 }, { unit: 'elf_scout', count: 8 }],
  },
  {
    id: 'monsters', name: '魔物聯邦', region: 'south', color: '#3fb8a0', level: 3,
    garrison: [{ unit: 'slime', count: 12 }, { unit: 'goblin_spear', count: 10 }, { unit: 'ogre_brute', count: 5 }, { unit: 'harpy', count: 6 }],
  },
];

export const factionOf = (id: string) => FACTIONS.find((f) => f.id === id);

/** 各國領主，同勢力次序對應 */
export const LORDS = [
  '獅盔公 雷昂', '鐵顎伯 霍恩', '玄甲侯 司徒烈', '蜀山君 嚴棠', '江東將軍 陸沉', '烏衣都督 墨淵', '赤水將軍 岳鋒', '青城侯 林霽',
  '月冠女公 希蕾', '岩心領主 杜林', '碎顱酋長 格倫', '蒼白司教 瓦倫', '霜狼領主 布蘭', '影語主母 薇拉', '魔物之長 利姆',
];
export const lordOf = (id: string) => LORDS[FACTIONS.findIndex((f) => f.id === id)] ?? '無名領主';

/** 領主部隊：好感同人數 */
export const LORD_RULES = { visitCost: 200, visitRelation: 3, renown: 6, partyShare: 0.7, level: 3 };

/** 領地初始歸屬 */
export const FIEF_OWNERS: Record<string, string> = {
  griffon: 'griffin', wheat: 'griffin', stonebridge: 'ironhelm', ironhelm_keep: 'ironhelm',
  xuan_city: 'xuan', bamboo: 'xuan', bashu_pass: 'bashu', linjiang: 'jiangdong', southpond: 'jiangdong',
  wuyi: 'wuyi', chishui_fort: 'chishui', qingcheng_pass: 'qingcheng',
  songglade: 'sylvan', anvilhold: 'dwarves', blackfang: 'orcs', spire: 'undead',
  frostfang: 'northmen', iceharbor: 'northmen', shadowspire: 'darkelves', moonleaf: 'sylvan', monsterhold: 'monsters', goblinfen: 'monsters',
};

export const POLITICS = {
  /** 幾多日諗一次 */
  thinkEvery: 5,
  warChance: 0.2,
  peaceChance: 0.25,
  /** 打緊仗時，每次思考有機會奪城 */
  conquestChance: 0.18,
  maxWarsPerFaction: 2,
  /** 敵人圍攻玩家領地嘅機率同死線（日） */
  threatChance: 0.3,
  threatDays: 7,
  /** 契約：每日工資 */
  mercPay: 40,
  mercMinRelation: -20,
  /** 宣誓效忠要幾多聲望 */
  vassalRenown: 40,
  vassalMinRelation: 0,
  /** 封臣得到領地嘅聲望 */
  /** 領地每週收入 */
  incomeTown: 400,
  incomeCastle: 220,
  incomeVillage: 120,
  /** 宣戰扣好感 */
  warRelation: -40,
  /** 議和金：每級戰爭 */
  peaceCost: 800,
  /** 送禮 */
  giftCost: 500,
  giftRelation: 8,
  /** 攻陷領地時俘虜領主機率 */
  lordCaptureChance: 0.6,
  ransomGold: 1200,
  ransomRelation: 2,
  /** 無條件放人 */
  freeRelation: 14,
  freeJustice: 3,
  /** 有守將：解圍機率、收入倍率 */
  governorHold: 0.6,
  governorIncome: 1.25,
  /** 領地失守，守將受傷歸隊日數 */
  governorHurtDays: 5,
  /** 打贏該國部隊加好感 */
  beatEnemyRelation: 3,
  /** 聲望：打贏普通仗、攻陷領地 */
  captureRenown: 12,
  /** 守軍減弱：被奪或者打完之後 */
  /** 稱王要幾多領地 */
  kingFiefs: 3,
  /** 統一大陸要幾多領地 */
  victoryFiefs: 12,
};

export const SIEGE = {
  /** 無準備時缺口數 */
  baseBreaches: 1,
  /** 每紮營一日加幾多雲梯 */
  perDay: 1,
  maxBreaches: 4,
  wallZ: 34,
  wallHalfWidth: 95,
  breachWidth: 9,
  /** 守軍喺牆後幾遠 */
  defenderOffset: 10,
  /** 守城時敵軍攻破幾多個缺口 */
  defendBreaches: 2,
  /** 城牆每隔幾遠搭一把雲梯 */
  ladderEvery: 34,
  /** 雲梯闊度、由牆邊幾遠開始爬、爬到幾高 */
  ladderWidth: 3,
  ladderReach: 4,
  wallTop: 6.5,
  /** 牆後走道闊度、斜坡去到幾遠 */
  walkway: 2.5,
  rampEnd: 7,
  /** 守軍弓手企喺走道 */
  archerZ: 1.4,
  archerSpacing: 3,
  /** 攻城塔：起點離牆幾遠、每秒推幾遠、靠牆位 */
  towerStart: 34,
  towerSpeed: 0.9,
  towerStop: 3.6,
  /** 投石機：離牆幾遠、左右位置、敵人埋身幾耐就毀 */
  catapultBack: 24,
  catapultFront: 48,
  catapultX: [-34, 34],
  catapultRadius: 5,
  catapultBreak: 4,
  /** 每部投石機派幾多人去拆 */
  raiders: 3,
  /** 守方埋身幾耐毀攻城塔、幾多嚿石毀塔、掟塔機率 */
  towerBreak: 5,
  towerHits: 3,
  towerRockChance: 0.3,
  towerRadius: 6,
  /** 幾秒掟一嚿石、石飛幾耐 */
  rockEvery: 6,
  rockFlight: 2.2,
};

/** 地下城：只帶幾個精兵 */
export const DUNGEON = {
  partySize: 5,
  /** 房間之間嘅牆（Z），門左右交錯 */
  walls: [-38, -4, 30],
  halfWidth: 24,
  doorWidth: 8,
  zMin: -72,
  zMax: 66,
  startZ: -62,
  ceiling: 9,
  torchRange: 44,
  torchPower: 70,
  /** 門位左右偏移範圍（房闊比例） */
  doorMin: 0.3,
  doorMax: 0.7,
  /** 地板陷阱 */
  traps: 7,
  trapRadius: 1.5,
  trapReset: 6,
};

/** 世界大事：每隔幾日擲一次 */
export const WORLD_EVENTS = {
  everyDays: 12,
  kingDeathChance: 0.3,
  warlordChance: 0.35,
  /** 大型山賊軍團人數 */
  warlordSize: 24,
  warlordLevel: 3,
  /** 爭位期間每場領地易手機率 */
  successionLoss: 0.5,
};

export interface ArtifactDef {
  id: string;
  name: string;
  desc: string;
  damage?: number;
  hp?: number;
  armor?: number;
  mp?: number;
}

export const ARTIFACTS: ArtifactDef[] = [
  { id: 'bone_crown', name: '骸骨王冠', desc: '法力 +40', mp: 40 },
  { id: 'horn_axe', name: '牛王角斧', desc: '傷害 +15%', damage: 0.15 },
  { id: 'dragon_scale', name: '龍鱗甲', desc: '護甲 +8、生命 +40', armor: 8, hp: 40 },
  { id: 'dragon_bone', name: '龍骨刃', desc: '傷害 +25%', damage: 0.25 },
  { id: 'demon_heart', name: '魔王之心', desc: '生命 +80、法力 +60', hp: 80, mp: 60 },
  { id: 'lich_crown', name: '魔導王冠', desc: '法力 +120、生命 +60', mp: 120, hp: 60 },
  { id: 'witch_ring', name: '魔女之戒', desc: '傷害 +15%、法力 +50', damage: 0.15, mp: 50 },
  { id: 'wyrm_heart', name: '滅世龍心', desc: '傷害 +30%、生命 +150', damage: 0.3, hp: 150 },
];

/** 主角開局 */
export type PlayableRace =
  | 'human' | 'elf' | 'dwarf' | 'orc' | 'dragonkin' | 'beastkin' | 'halfling' | 'demon'
  | 'goblin' | 'lizard' | 'minotaur' | 'undead' | 'vampire' | 'werewolf' | 'harpy' | 'merfolk' | 'treant' | 'fairy' | 'centaur' | 'darkelf' | 'ogre' | 'nord';

export const PLAYABLE: Record<PlayableRace, { name: string; desc: string; attrs: Partial<Record<'str' | 'agi' | 'int' | 'cha', number>>; spell?: string; friend?: string; foe?: string }> = {
  human: { name: '人類', desc: '平均，起步多 2 技能點', attrs: { cha: 1 } },
  elf: { name: '精靈', desc: '敏捷 +2，精靈友好', attrs: { agi: 2 }, friend: 'sylvan', foe: 'dwarves' },
  dwarf: { name: '矮人', desc: '力量 +1，矮人友好', attrs: { str: 1 }, friend: 'dwarves', foe: 'sylvan' },
  orc: { name: '半獸人', desc: '力量 +2、魅力 −1', attrs: { str: 2, cha: -1 }, friend: 'orcs', foe: 'griffin' },
  dragonkin: { name: '龍人', desc: '力智 +1，天生龍息', attrs: { str: 1, int: 1 }, spell: 'dragon_breath' },
  beastkin: { name: '獸人族', desc: '敏捷 +1、跳得高', attrs: { agi: 2 }, friend: 'wuyi' },
  halfling: { name: '半身人', desc: '敏捷 +1，交易 +2', attrs: { agi: 1 } },
  demon: { name: '魔族', desc: '智力 +2，起步火球', attrs: { int: 2 }, spell: 'fireball', friend: 'undead', foe: 'griffin' },
  goblin: { name: '哥布林', desc: '細粒快腳，敏捷 +2、力量 −1', attrs: { agi: 2, str: -1 }, friend: 'orcs', foe: 'dwarves' },
  lizard: { name: '蜥蜴人', desc: '力敏各 +1，沼澤戰士', attrs: { str: 1, agi: 1 } },
  minotaur: { name: '牛頭人', desc: '力量 +3、敏捷 −1，又大隻又食得', attrs: { str: 3, agi: -1 }, foe: 'griffin' },
  undead: { name: '亡靈', desc: '智力 +2、魅力 −1，唔使食飯', attrs: { int: 2, cha: -1 }, spell: 'lightning', friend: 'undead', foe: 'sylvan' },
  vampire: { name: '吸血鬼', desc: '力智 +1，唔使食飯，夜視', attrs: { str: 1, int: 1 }, spell: 'heal', friend: 'undead', foe: 'griffin' },
  werewolf: { name: '狼人', desc: '力 +2、敏 +1、魅 −1，會戰吼', attrs: { str: 2, agi: 1, cha: -1 }, foe: 'griffin' },
  harpy: { name: '哈比', desc: '敏捷 +3、力量 −1，一跳好高', attrs: { agi: 3, str: -1 } },
  merfolk: { name: '人魚', desc: '智敏各 +1，江東友好', attrs: { int: 1, agi: 1 }, friend: 'jiangdong' },
  treant: { name: '樹人', desc: '力量 +3、敏捷 −2，唔騎馬唔使食', attrs: { str: 3, agi: -2 }, friend: 'sylvan', foe: 'dwarves' },
  fairy: { name: '妖精', desc: '智力 +3、力量 −2，起步火球', attrs: { int: 3, str: -2 }, spell: 'fireball', friend: 'sylvan' },
  centaur: { name: '半人馬', desc: '力敏各 +1，人馬一體，落唔到馬', attrs: { str: 1, agi: 1 } },
  darkelf: { name: '黑暗精靈', desc: '敏智各 +1，夜視，起步雷擊', attrs: { agi: 1, int: 1 }, spell: 'lightning', friend: 'darkelves', foe: 'sylvan' },
  ogre: { name: '食人魔', desc: '力量 +4、智力 −1，好大食', attrs: { str: 4, int: -1 }, friend: 'monsters', foe: 'griffin' },
  nord: { name: '北地人', desc: '力量 +2，耐寒，會戰吼', attrs: { str: 2 }, friend: 'northmen' },
};

export interface StartOption {
  id: string;
  name: string;
  desc: string;
  gold: number;
  attrs: Partial<Record<'str' | 'agi' | 'int' | 'cha', number>>;
  /** 起步部隊 */
  army: ArmyEntry[];
  /** 起步糧食 */
  food: number;
  /** 額外武器 */
  weapons?: string[];
  /** 額外技能 */
  skills?: Partial<Record<SkillId, number>>;
  /** 起步招募令 */
  tickets?: number;
  /** 起步馬匹 */
  horse?: string;
  /** 額外聲望 */
  renown?: number;
}

const footmen = (n: number): ArmyEntry => ({ unit: 'footman', count: n });
const archers = (n: number): ArmyEntry => ({ unit: 'archer', count: n });

export const BACKGROUNDS: StartOption[] = [
  { id: 'farmer', name: '農家子弟', desc: '同鄉跟你出嚟，人多錢少', gold: 500, food: 100, attrs: { str: 2 }, army: [footmen(12), archers(2)] },
  { id: 'noble', name: '落難貴族', desc: '有錢有戰馬，但得幾個親兵', gold: 2500, food: 60, attrs: { cha: 2 }, army: [{ unit: 'lancer', count: 3 }, footmen(3)], horse: 'warhorse', renown: 15, skills: { leadership: 1 } },
  { id: 'merc', name: '傭兵老手', desc: '身手好，帶住老伙記', gold: 1200, food: 60, attrs: { agi: 1, str: 1 }, army: [footmen(6), { unit: 'axeman', count: 3 }, archers(3), { unit: 'horseman', count: 2 }] },
  { id: 'merchant', name: '行商之子', desc: '錢最多，人最少', gold: 3600, food: 80, attrs: { int: 2 }, army: [footmen(3), archers(2)], horse: 'pack', skills: { trade: 3 } },
  { id: 'slave', name: '逃亡奴隸', desc: '一無所有，靠狠勁', gold: 80, food: 15, attrs: { str: 2, agi: 2 }, army: [], skills: { ironskin: 2 } },
  { id: 'gladiator', name: '角鬥士', desc: '雙手斧同一身傷疤', gold: 400, food: 25, attrs: { str: 3 }, army: [footmen(2)], weapons: ['axe'], skills: { ironskin: 1 }, renown: 8 },
  { id: 'hunter', name: '山林獵戶', desc: '長弓在手，帶住獵友', gold: 500, food: 70, attrs: { agi: 2 }, army: [archers(8)], weapons: ['longbow'], skills: { archery: 3 } },
  { id: 'bandit', name: '山賊頭目', desc: '帶住一班兄弟金盆洗手', gold: 900, food: 40, attrs: { str: 1, agi: 1 }, army: [footmen(8), archers(3), { unit: 'horseman', count: 3 }], renown: -5 },
  { id: 'apprentice', name: '法師學徒', desc: '識火球同治療，唔識打', gold: 800, food: 40, attrs: { int: 3, str: -1 }, army: [footmen(3)], weapons: ['fireball', 'heal'], skills: { magic: 3 } },
  { id: 'priest', name: '遊方醫者', desc: '識治傷，人人都想親近', gold: 700, food: 50, attrs: { cha: 1, int: 1 }, army: [footmen(4), archers(2)], weapons: ['heal'], skills: { medicine: 4 } },
  { id: 'knight', name: '被逐騎士', desc: '騎槍同披甲戰馬係最後財產', gold: 300, food: 30, attrs: { str: 1, cha: 1 }, army: [footmen(2)], horse: 'warhorse', skills: { riding: 3 }, renown: 10 },
  { id: 'heir', name: '部落遺孤', desc: '手持招募令，等待復興', gold: 700, food: 40, attrs: { cha: 2 }, army: [footmen(4)], tickets: 6 },
];

export const START_REGIONS: Record<Region, { place: string; relation: string }> = {
  west: { place: 'griffon', relation: 'griffin' },
  center: { place: 'linjiang', relation: 'jiangdong' },
  south: { place: 'wuyi', relation: 'wuyi' },
  north: { place: 'songglade', relation: 'sylvan' },
};
