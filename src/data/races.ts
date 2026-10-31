export type Race =
  | 'human' | 'elf' | 'dwarf' | 'orc' | 'goblin' | 'undead' | 'lizard' | 'minotaur' | 'dragonkin'
  | 'beastkin' | 'halfling' | 'demon' | 'golem' | 'giant' | 'dragon'
  | 'centaur' | 'harpy' | 'merfolk' | 'vampire' | 'werewolf' | 'treant' | 'fairy';

export type RaceLook = 'plain' | 'ears' | 'tusks' | 'skull' | 'bull' | 'snout' | 'dragon' | 'wings' | 'antlers' | 'fins';

/** 戰吼：主角按 V，附近敵人失士氣、友軍回士氣 */
const WARCRY = { radius: 22, enemyLoss: 18, allyGain: 12, cooldown: 30 };

export interface RaceDef {
  name: string;
  skin: number;
  /** 體型倍率 */
  scale: number;
  look: RaceLook;
  /** 食量倍率，0 代表唔使食 */
  food: number;
  /** 工資倍率 */
  wage: number;
  /** 跳躍倍率 */
  jump?: number;
  /** 夜戰睇得更遠 */
  nightVision?: boolean;
  /** 唔騎得馬 */
  noRide?: boolean;
  warcry?: typeof WARCRY;
}

export const RACES: Record<Race, RaceDef> = {
  human: { name: '人類', skin: 0xe0b48c, scale: 1, look: 'plain', food: 1, wage: 1 },
  elf: { name: '精靈', skin: 0xf0d8b8, scale: 1.02, look: 'ears', food: 0.75, wage: 1.3 },
  dwarf: { name: '矮人', skin: 0xd8a070, scale: 0.86, look: 'plain', food: 1.2, wage: 1.25 },
  orc: { name: '獸人', skin: 0x5f8a45, scale: 1.1, look: 'tusks', food: 1.7, wage: 0.8, warcry: WARCRY },
  goblin: { name: '哥布林', skin: 0x7da04a, scale: 0.76, look: 'ears', food: 0.6, wage: 0.5 },
  undead: { name: '亡靈', skin: 0xdcd8c8, scale: 1, look: 'skull', food: 0, wage: 1.4, nightVision: true },
  lizard: { name: '蜥蜴人', skin: 0x3f8f70, scale: 1.04, look: 'snout', food: 0.9, wage: 0.8 },
  minotaur: { name: '牛頭人', skin: 0x6b4630, scale: 1.34, look: 'bull', food: 2.6, wage: 1.5, noRide: true, warcry: WARCRY },
  dragonkin: { name: '龍人', skin: 0xa8442c, scale: 1.14, look: 'snout', food: 1.9, wage: 1.6 },
  beastkin: { name: '獸人族', skin: 0xb88a58, scale: 0.98, look: 'ears', food: 1, wage: 1, jump: 1.5, nightVision: true },
  halfling: { name: '半身人', skin: 0xe6bc94, scale: 0.72, look: 'plain', food: 1.1, wage: 0.8 },
  demon: { name: '魔族', skin: 0xa03048, scale: 1.05, look: 'bull', food: 1, wage: 1.5 },
  golem: { name: '魔像', skin: 0x7c7f88, scale: 2.4, look: 'plain', food: 0, wage: 1 },
  giant: { name: '巨人', skin: 0x9a7a58, scale: 2.8, look: 'tusks', food: 4, wage: 2, noRide: true },
  dragon: { name: '龍', skin: 0xb02a1e, scale: 3.4, look: 'dragon', food: 6, wage: 3 },
  centaur: { name: '半人馬', skin: 0xc89a70, scale: 1, look: 'plain', food: 1.8, wage: 1.3 },
  harpy: { name: '哈比', skin: 0xd8b48c, scale: 0.9, look: 'wings', food: 0.7, wage: 0.9, jump: 2 },
  merfolk: { name: '人魚', skin: 0x7fc8c0, scale: 1, look: 'fins', food: 0.9, wage: 1.1 },
  vampire: { name: '吸血鬼', skin: 0xe8e0e8, scale: 1.02, look: 'ears', food: 0, wage: 1.6, nightVision: true },
  werewolf: { name: '狼人', skin: 0x6a5a4a, scale: 1.16, look: 'snout', food: 1.8, wage: 1.2, jump: 1.5, nightVision: true, warcry: WARCRY },
  treant: { name: '樹人', skin: 0x6a5230, scale: 1.5, look: 'antlers', food: 0, wage: 1.3, noRide: true },
  fairy: { name: '妖精', skin: 0xf0d8f0, scale: 0.7, look: 'wings', food: 0.4, wage: 1.2, jump: 1.6 },
};

/** 組團消耗 */
export const UPKEEP = {
  /** 每人每日基本食糧 */
  foodPerDay: 0.3,
  /** 每匹馬每日額外草料 */
  horseFoodPerDay: 0.35,
  /** 每週工資 = 兵階 × 呢個數 × 種族倍率 */
  wagePerTier: 5,
  /** 騎兵每週養馬費 */
  horseWage: 6,
  /** 士氣：每多一個種族扣幾多 */
  mixedRacePenalty: 3,
};
