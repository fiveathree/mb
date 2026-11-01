import type { BattleTheme } from './world';

/** 職業工作：入 3D 場景實際做嘢 */
export interface MissionDef {
  /** 開場講要做咩 */
  brief: string;
  theme: BattleTheme;
  /** hunt 打獵、spots 去目標點做嘢、fight 打完、stealth 唔被發現咁做嘢 */
  task: 'hunt' | 'spots' | 'fight' | 'stealth';
  /** 場上嘅動物或者敵人 */
  foes?: { unit: string; count: number }[];
  /** 目標點 */
  spots?: { n: number; verb: string; color: number; hold: number };
  /** 時限（秒） */
  time: number;
  /** 森林密度：樹數 */
  trees?: number;
  river?: boolean;
  /** 帶埋呢件工具落場 */
  tool?: string;
}

export const MISSION_RULES = {
  /** 動物或者守衛發現你嘅距離 */
  aggro: 15,
  spotReach: 3,
  /** 走出呢個距離就算走甩 */
  escape: 95,
  spreadMin: 24,
  spreadMax: 72,
  /** 收成倍率 = base + 完成度 */
  yieldBase: 0.4,
};

/** key 係職業 id，次序對應 jobs.ts 嘅 work */
export const MISSIONS: Record<string, MissionDef[]> = {
  warrior: [
    { brief: '同新兵對練：打低全部對手', theme: 'plains', task: 'fight', foes: [{ unit: 'footman', count: 4 }], time: 150 },
    { brief: '護送商隊遇伏：擊退劫匪', theme: 'plains', task: 'fight', foes: [{ unit: 'axeman', count: 3 }, { unit: 'kobold', count: 3 }], time: 180 },
  ],
  farmer: [
    { brief: '收割金黃麥田，順手趕走入田嘅野牛', theme: 'plains', task: 'spots', foes: [{ unit: 'anim_bull', count: 2 }], spots: { n: 6, verb: '收割', color: 0xe8c040, hold: 1.4 }, time: 170 },
    { brief: '逐戶上門賣菜', theme: 'plains', task: 'spots', spots: { n: 5, verb: '賣菜', color: 0x70c060, hold: 1 }, time: 120 },
  ],
  hunter: [
    { brief: '入林打獵（Q 換弓）：鹿同狐會走，狼同野牛會反攻，樹後有掩體', theme: 'forest', task: 'hunt', trees: 230, tool: 'longbow', foes: [{ unit: 'anim_deer', count: 4 }, { unit: 'anim_stag', count: 2 }, { unit: 'anim_fox', count: 2 }, { unit: 'anim_wolf', count: 3 }, { unit: 'anim_bull', count: 1 }], time: 240 },
    { brief: '喺獸徑設陷阱，小心狼群', theme: 'forest', task: 'spots', trees: 200, foes: [{ unit: 'anim_wolf', count: 3 }], spots: { n: 5, verb: '設陷阱', color: 0xa07040, hold: 1.8 }, time: 180 },
  ],
  fisher: [
    { brief: '沿河落網，收齊幾網魚', theme: 'plains', task: 'spots', river: true, spots: { n: 5, verb: '落網', color: 0x60b0e0, hold: 2 }, time: 150 },
    { brief: '撈河底寶物，河邊有野獸出沒', theme: 'plains', task: 'spots', river: true, foes: [{ unit: 'anim_wolf', count: 2 }], spots: { n: 4, verb: '打撈', color: 0x40d0c0, hold: 2.4 }, time: 170 },
  ],
  miner: [
    { brief: '入礦掘鐵，狗頭人想搶礦', theme: 'crypt', task: 'spots', foes: [{ unit: 'kobold_miner', count: 3 }], spots: { n: 5, verb: '掘鐵', color: 0xb0b4c0, hold: 2 }, time: 180 },
    { brief: '深入礦洞搵水晶', theme: 'crypt', task: 'spots', foes: [{ unit: 'kobold_miner', count: 4 }], spots: { n: 3, verb: '採水晶', color: 0x80e0ff, hold: 2.6 }, time: 180 },
  ],
  smith: [
    { brief: '接單打鐵：起爐、落鎚、淬火', theme: 'fort', task: 'spots', spots: { n: 4, verb: '打鐵', color: 0xff8a3a, hold: 2 }, time: 120 },
    { brief: '逐個兵修甲', theme: 'fort', task: 'spots', spots: { n: 4, verb: '修甲', color: 0xc0c8d0, hold: 1.4 }, time: 110 },
  ],
  merchant: [
    { brief: '市集招呼客人，提防小賊', theme: 'plains', task: 'spots', foes: [{ unit: 'kobold', count: 2 }], spots: { n: 5, verb: '做生意', color: 0xe0b84a, hold: 1.2 }, time: 150 },
    { brief: '落鄉逐家收貨', theme: 'plains', task: 'spots', spots: { n: 4, verb: '收貨', color: 0xc09060, hold: 1.2 }, time: 130 },
  ],
  cook: [
    { brief: '開飯店：逐枱上菜', theme: 'fort', task: 'spots', spots: { n: 5, verb: '上菜', color: 0xff9a5a, hold: 1 }, time: 110 },
    { brief: '軍營派飯加餸', theme: 'plains', task: 'spots', spots: { n: 4, verb: '派飯', color: 0xe8d070, hold: 1 }, time: 100 },
  ],
  doctor: [
    { brief: '坐堂診症：逐個病人睇', theme: 'fort', task: 'spots', spots: { n: 4, verb: '診症', color: 0x70e0a0, hold: 1.6 }, time: 120 },
    { brief: '戰場救傷兵', theme: 'plains', task: 'spots', spots: { n: 5, verb: '包紮', color: 0xe05a5a, hold: 1.6 }, time: 130 },
  ],
  bard: [
    { brief: '酒館逐枱賣唱', theme: 'fort', task: 'spots', spots: { n: 4, verb: '開唱', color: 0xc08aff, hold: 1.6 }, time: 110 },
    { brief: '逐條村講古', theme: 'plains', task: 'spots', spots: { n: 3, verb: '講古', color: 0xa0a0ff, hold: 2 }, time: 110 },
  ],
  thief: [
    { brief: '扒竊：避開巡邏守衛，畀人發現就會捉你', theme: 'plains', task: 'stealth', foes: [{ unit: 'footman', count: 3 }], spots: { n: 3, verb: '扒竊', color: 0xd0d0e0, hold: 1 }, time: 120 },
    { brief: '夜入大宅：守衛更多，寶箱更遠', theme: 'night', task: 'stealth', foes: [{ unit: 'footman', count: 5 }], spots: { n: 3, verb: '開鎖', color: 0xffd24a, hold: 2 }, time: 170 },
  ],
  hermit: [
    { brief: '打坐修練：靜坐途中心魔來襲', theme: 'night', task: 'spots', foes: [{ unit: 'skeleton', count: 3 }], spots: { n: 3, verb: '靜坐', color: 0x8ad0ff, hold: 4 }, time: 170 },
    { brief: '上山閉關：斬盡心魔先算功成', theme: 'snow', task: 'fight', foes: [{ unit: 'skeleton', count: 4 }, { unit: 'necromancer', count: 1 }], time: 190 },
  ],
};

export const missionOf = (job: string, index: number) => MISSIONS[job]?.[index];
