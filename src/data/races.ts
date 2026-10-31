export type Race =
  | 'human' | 'elf' | 'dwarf' | 'orc' | 'goblin' | 'undead' | 'lizard' | 'minotaur' | 'dragonkin';

export type RaceLook = 'plain' | 'ears' | 'tusks' | 'skull' | 'bull' | 'snout';

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
}

export const RACES: Record<Race, RaceDef> = {
  human: { name: '人類', skin: 0xe0b48c, scale: 1, look: 'plain', food: 1, wage: 1 },
  elf: { name: '精靈', skin: 0xf0d8b8, scale: 1.02, look: 'ears', food: 0.75, wage: 1.3 },
  dwarf: { name: '矮人', skin: 0xd8a070, scale: 0.86, look: 'plain', food: 1.2, wage: 1.25 },
  orc: { name: '獸人', skin: 0x5f8a45, scale: 1.1, look: 'tusks', food: 1.7, wage: 0.8 },
  goblin: { name: '哥布林', skin: 0x7da04a, scale: 0.76, look: 'ears', food: 0.6, wage: 0.5 },
  undead: { name: '亡靈', skin: 0xdcd8c8, scale: 1, look: 'skull', food: 0, wage: 1.4 },
  lizard: { name: '蜥蜴人', skin: 0x3f8f70, scale: 1.04, look: 'snout', food: 0.9, wage: 0.8 },
  minotaur: { name: '牛頭人', skin: 0x6b4630, scale: 1.34, look: 'bull', food: 2.6, wage: 1.5 },
  dragonkin: { name: '龍人', skin: 0xa8442c, scale: 1.14, look: 'snout', food: 1.9, wage: 1.6 },
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
