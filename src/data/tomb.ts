import type { ArmyEntry } from './battlefield';
import type { BattleTheme } from './world';

export interface TombFloor {
  name: string;
  desc: string;
  theme: BattleTheme;
  level: number;
  enemy: ArmyEntry[];
}

const e = (unit: string, count: number): ArmyEntry => ({ unit, count });

/** 十層地下大墳墓：一層一層打，進度會保留 */
export const TOMB = {
  id: 'tomb',
  /** 每層獎金 = 層數 × 呢個數 */
  goldPerFloor: 350,
  clearGold: 9000,
  artifact: 'lich_crown',
  floors: [
    { name: '第一層 白骨迴廊', desc: '骷髏排到望唔到盡頭。', theme: 'crypt', level: 3, enemy: [e('skeleton', 6), e('skeleton_archer', 2)] },
    { name: '第二層 蟲噬墓室', desc: '牆壁入面有嘢爬緊。', theme: 'crypt', level: 3, enemy: [e('skeleton', 5), e('kobold_miner', 4)] },
    { name: '第三層 血池之間', desc: '吸血貴族喺度開宴。', theme: 'crypt', level: 4, enemy: [e('vampire', 2), e('skeleton', 5)] },
    { name: '第四層 鐵甲長廊', desc: '盔甲自己企起身。', theme: 'crypt', level: 4, enemy: [e('grave_knight', 5), e('skeleton_archer', 3)] },
    { name: '第五層 守門魔像', desc: '上半座墳墓嘅看門口。', theme: 'maze', level: 5, enemy: [e('grave_knight', 3), e('boss_golem', 1)] },
    { name: '第六層 冰封靈柩', desc: '寒氣由棺木滲出嚟。', theme: 'crypt', level: 5, enemy: [e('necromancer', 3), e('skeleton', 6)] },
    { name: '第七層 惡魔祭壇', desc: '祭壇仲係暖嘅。', theme: 'maze', level: 5, enemy: [e('demon_grunt', 5), e('demon_cultist', 3)] },
    { name: '第八層 影之鏡廳', desc: '鏡入面嘅人唔係你。', theme: 'crypt', level: 6, enemy: [e('darkelf_blade', 5), e('darkelf_witch', 3)] },
    { name: '第九層 王之親衛', desc: '死亡騎士跪喺王座前階。', theme: 'crypt', level: 6, enemy: [e('death_rider', 4), e('necromancer', 3), e('grave_knight', 3)] },
    { name: '第十層 永眠王座', desc: '骸骨魔導王張開眼。', theme: 'crypt', level: 7, enemy: [e('grave_knight', 4), e('boss_lich', 1)] },
  ] as TombFloor[],
};

/** 遊走大地圖嘅災厄 Boss */
export const CALAMITY = {
  witch: { unit: 'boss_witch', level: 7, gold: 6000, artifact: 'witch_ring', home: 'witch_tower', firstDay: 45, everyDays: 40, burnMult: 3, verb: '詛咒' },
  wyrm: { unit: 'boss_wyrm', level: 8, gold: 12000, artifact: 'wyrm_heart', home: 'dragonlair', firstDay: 120, everyDays: 60, burnMult: 5, verb: '焚毀' },
};
