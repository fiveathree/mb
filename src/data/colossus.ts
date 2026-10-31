/** 超巨型敵人：主角企喺腳邊，抬頭先見到個頭。height 係公尺 */
export const COLOSSI: Record<string, { height: number; radius: number }> = {
  boss_chaos: { height: 36, radius: 5 },
  boss_cyclops: { height: 22, radius: 3.5 },
  boss_ancient: { height: 28, radius: 4.5 },
  boss_hive: { height: 26, radius: 5 },
  boss_lightgod: { height: 38, radius: 5.5 },
  boss_kronos: { height: 40, radius: 5.5 },
  boss_gonggong: { height: 34, radius: 5 },
  boss_asura: { height: 34, radius: 5 },
  boss_demongod: { height: 42, radius: 6 },
  boss_voidgod: { height: 38, radius: 5.5 },
  boss_hellking: { height: 30, radius: 4.5 },
  boss_tongtian: { height: 26, radius: 4 },
  boss_jiuling: { height: 24, radius: 4 },
  boss_blood: { height: 26, radius: 4 },
  boss_heavenly: { height: 24, radius: 4 },
  boss_jiangwang: { height: 22, radius: 3.5 },
  boss_mutant: { height: 18, radius: 3 },
  boss_dragon: { height: 16, radius: 7 },
  boss_dragon_white: { height: 16, radius: 7 },
  boss_dragon_blue: { height: 16, radius: 7 },
  boss_dragon_green: { height: 16, radius: 7 },
  boss_dragon_black: { height: 16, radius: 7 },
  boss_wyrm: { height: 24, radius: 9 },
};

export type GiantMove = 'stomp' | 'slam' | 'sweep' | 'breath' | 'bolts';

/** 招式：wind 係舉手預兆秒數，夠時間走位；地上有紅圈 */
export const GIANT_MOVES: Record<GiantMove, { wind: number; radius: number; damage: number; range: number }> = {
  stomp: { wind: 1.3, radius: 14, damage: 75, range: 14 },
  slam: { wind: 1.6, radius: 9, damage: 120, range: 34 },
  sweep: { wind: 1.1, radius: 26, damage: 85, range: 24 },
  breath: { wind: 1.4, radius: 7, damage: 70, range: 50 },
  bolts: { wind: 1.8, radius: 6, damage: 80, range: 60 },
};

export const COLOSSUS = {
  /** 出招之間最少隔幾耐 */
  rest: 2.6,
  /** 收招硬直，主角趁呢段時間斬腳 */
  recover: 1,
  walkSpeed: 3.4,
  /** 掃擊弧度 */
  sweepArc: 1.05,
  bolts: 5,
  breathSteps: 7,
  /** 幾遠先感受到腳步震動 */
  shakeRange: 80,
  /** 血量倍率 */
  hpMult: 1.2,
};

/** 大地圖滅世攻擊：radius 係地圖格，城鎮喺範圍內都會崩 */
export const STRIKES = {
  dragon: { radius: 9, color: '#ff7a2a', scar: '#3a1a10', name: '龍息' },
  witch: { radius: 15, color: '#c84af0', scar: '#2a1040', name: '滅國詛咒' },
  wyrm: { radius: 19, color: '#ff5a1a', scar: '#2a1410', name: '滅世龍息' },
  titan: { radius: 24, color: '#ffe08a', scar: '#20140c', name: '神罰' },
  doom: { radius: 20, color: '#a84af0', scar: '#180a28', name: '滅世魔法' },
};
export type StrikeKind = keyof typeof STRIKES;

/** 魔王陣營親手放滅世魔法 */
export const DOOM = { cooldown: 25, justice: -20, renown: 12, relation: -30 };

/** 焦土同廢墟留幾多日 */
export const SCAR_DAYS = 40;
/** 打中範圍內部隊：士氣同傷兵 */
export const STRIKE_MORALE = 18;
export const STRIKE_HURT = 3;
