import type { GoodId, SkillId } from './economy';

export type WorkPlace = 'town' | 'village' | 'forest' | 'water' | 'mine' | 'any';

export const WORK_PLACE: Record<WorkPlace, string> = {
  town: '城鎮', village: '村莊', forest: '森林', water: '河邊', mine: '山腳', any: '任何地方',
};

export interface WorkDef {
  label: string;
  where: WorkPlace;
  /** 要幾多個鐘 */
  hours: number;
  gold?: number;
  food?: number;
  goods?: Partial<Record<GoodId, number>>;
  morale?: number;
  renown?: number;
  heroXp?: number;
  /** 治好傷兵 */
  heal?: boolean;
  /** 要先消耗 */
  needFood?: number;
  needGood?: [GoodId, number];
  /** 失手機率同後果 */
  risk?: { chance: number; justice: number; gold: number };
}

export interface JobDef {
  id: string;
  name: string;
  desc: string;
  /** 職業加成 */
  skill?: [SkillId, number];
  work: WorkDef[];
}

export const JOBS: JobDef[] = [
  {
    id: 'warrior', name: '戰士', desc: '靠打仗食飯，戰術 +2', skill: ['tactics', 2],
    work: [{ label: '操練部隊', where: 'any', hours: 8, heroXp: 40, morale: 2 }, { label: '喺城做保鑣', where: 'town', hours: 10, gold: 120 }],
  },
  {
    id: 'farmer', name: '農夫', desc: '有田就有糧',
    work: [{ label: '落田耕作', where: 'village', hours: 10, food: 12 }, { label: '喺村賣菜', where: 'village', hours: 6, gold: 60, needFood: 4 }],
  },
  {
    id: 'hunter', name: '獵人', desc: '入林打獵，箭術 +2', skill: ['archery', 2],
    work: [{ label: '入林狩獵', where: 'forest', hours: 8, food: 8, goods: { fur: 1 } }, { label: '設陷阱', where: 'forest', hours: 12, goods: { fur: 2 } }],
  },
  {
    id: 'fisher', name: '漁夫', desc: '一支竿一條河',
    work: [{ label: '落河釣魚', where: 'water', hours: 8, food: 10 }, { label: '撈河底寶物', where: 'water', hours: 12, gold: 90, goods: { salt: 1 } }],
  },
  {
    id: 'miner', name: '礦工', desc: '掘得深，賺得多',
    work: [{ label: '喺山腳掘鐵', where: 'mine', hours: 10, goods: { iron: 2 } }, { label: '搵水晶礦', where: 'mine', hours: 14, goods: { crystal: 1 } }],
  },
  {
    id: 'smith', name: '鐵匠', desc: '將鐵打成金',
    work: [{ label: '打鐵接單', where: 'town', hours: 10, gold: 220, needGood: ['iron', 1] }, { label: '替人修甲', where: 'town', hours: 6, gold: 90 }],
  },
  {
    id: 'merchant', name: '行商', desc: '做生意，貿易 +3', skill: ['trade', 3],
    work: [{ label: '喺市集擺檔', where: 'town', hours: 8, gold: 150 }, { label: '落鄉收貨', where: 'village', hours: 8, goods: { wine: 1, cloth: 1 } }],
  },
  {
    id: 'cook', name: '廚師', desc: '一餐飯可以收買全軍',
    work: [{ label: '開飯店', where: 'town', hours: 8, gold: 200, needFood: 8 }, { label: '為部隊加餸', where: 'any', hours: 4, morale: 8, needFood: 6 }],
  },
  {
    id: 'doctor', name: '醫師', desc: '救人為本，醫術 +3', skill: ['medicine', 3],
    work: [{ label: '坐堂行醫', where: 'town', hours: 8, gold: 130, renown: 1 }, { label: '替傷兵療傷', where: 'any', hours: 6, heal: true }],
  },
  {
    id: 'bard', name: '吟遊詩人', desc: '唱到你個名傳遍大陸',
    work: [{ label: '酒館賣唱', where: 'town', hours: 6, gold: 100, renown: 1 }, { label: '喺村講古', where: 'village', hours: 6, gold: 40, renown: 2, morale: 3 }],
  },
  {
    id: 'thief', name: '神偷', desc: '手快過眼，失手就糟',
    work: [
      { label: '喺市集扒竊', where: 'town', hours: 3, gold: 200, risk: { chance: 0.25, justice: -6, gold: 150 } },
      { label: '夜入大宅', where: 'town', hours: 8, gold: 650, risk: { chance: 0.4, justice: -12, gold: 400 } },
    ],
  },
  {
    id: 'hermit', name: '修行者', desc: '唔爭天下，只求突破',
    work: [{ label: '打坐修練', where: 'any', hours: 12, heroXp: 90 }, { label: '上山閉關', where: 'mine', hours: 24, heroXp: 220 }],
  },
];

/** 身世自動對應起步職業 */
export const BACKGROUND_JOB: Record<string, string> = {
  farmer: 'farmer', noble: 'warrior', merc: 'warrior', merchant: 'merchant', slave: 'thief', gladiator: 'warrior', hunter: 'hunter', bandit: 'thief',
  apprentice: 'hermit', priest: 'doctor', knight: 'warrior', heir: 'bard',
};

export const JOB_RULES = {
  /** 轉職要幾多金，職業等級由 1 再嚟 */
  changeCost: 300,
  maxLevel: 10,
  /** 升級要幾多次工 */
  xpPerLevel: 4,
  /** 每級收成多幾多 */
  yieldPerLevel: 0.08,
  /** 工錢倍率：打仗仍然係最賺嘅路 */
  goldScale: 0.45,
  /** 離呢類地方幾格內算到 */
  reach: 3,
};

export const jobOf = (id: string) => JOBS.find((j) => j.id === id) ?? JOBS[0];

/** 職業頭銜：第 1、5、10 級；十級就係呢行嘅終點 */
export const JOB_TITLES: Record<string, [string, string, string]> = {
  warrior: ['新兵', '百夫長', '萬人敵'],
  farmer: ['佃農', '大農戶', '天下糧倉'],
  hunter: ['獵戶', '山林獵王', '百獸之主'],
  fisher: ['漁家子', '江上老手', '一代釣聖'],
  miner: ['礦工', '礦頭', '掘山之王'],
  smith: ['學徒', '大師傅', '神兵匠'],
  merchant: ['小販', '大掌櫃', '天下首富'],
  cook: ['伙頭', '名廚', '食神'],
  doctor: ['郎中', '名醫', '再世華佗'],
  bard: ['街頭歌者', '宮廷樂師', '傳奇詩人'],
  thief: ['小毛賊', '飛天大盜', '盜聖'],
  hermit: ['求道者', '得道高人', '半步飛昇'],
};
export const jobTitle = (id: string, level: number) => JOB_TITLES[id][level >= 10 ? 2 : level >= 5 ? 1 : 0];

/** 成就：由現況判斷，唔使另外存 */
export interface AchieveState {
  wins: number;
  gold: number;
  fiefs: number;
  king: boolean;
  won: boolean;
  tomb: number;
  quests: number;
  careers: number;
  artifacts: number;
  figures: number;
  level: number;
  lords: number;
}

export const ACHIEVEMENTS: { name: string; desc: string; done: (s: AchieveState) => boolean }[] = [
  { name: '初試啼聲', desc: '打贏 10 場', done: (s) => s.wins >= 10 },
  { name: '百戰之師', desc: '打贏 100 場', done: (s) => s.wins >= 100 },
  { name: '腰纏萬貫', desc: '身家 5 萬金', done: (s) => s.gold >= 50000 },
  { name: '割據一方', desc: '佔 3 塊領地', done: (s) => s.fiefs >= 3 },
  { name: '自立為王', desc: '稱王', done: (s) => s.king },
  { name: '天下一統', desc: '統一大陸', done: (s) => s.won },
  { name: '掘墓人', desc: '打穿十層墳墓', done: (s) => s.tomb >= 10 },
  { name: '有求必應', desc: '完成 20 個任務', done: (s) => s.quests >= 20 },
  { name: '一技之長', desc: '一行職業登頂', done: (s) => s.careers >= 1 },
  { name: '三百六十行', desc: '三行職業登頂', done: (s) => s.careers >= 3 },
  { name: '神器收藏家', desc: '收集 3 件神器', done: (s) => s.artifacts >= 3 },
  { name: '群英薈萃', desc: '招請 3 位人物', done: (s) => s.figures >= 3 },
];

/** 做工小遊戲：指針來回，撳中綠區同紅心收成多啲 */
/** 十級職業結局嘅獎勵 */
export const CAREER_REWARD = { gold: 3000, renown: 30 };
export const CAREER_ENDING = '唔靠刀兵，唔爭天下。你由一個無名嘅{job}做起，一朝一日，成為人人傳頌嘅{title}。史書未必有你，但市井街頭，人人都講你嘅故事。';
