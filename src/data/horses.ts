export interface HorseDef {
  id: string;
  name: string;
  desc: string;
  /** 加速度（公尺／秒²），決定幾耐先到全速 */
  accel: number;
  /** 收韁減速度 */
  brake: number;
  /** 冇人催時嘅自然減速度 */
  coast: number;
  /** 只按 W 嘅速度 */
  trotSpeed: number;
  /** 按住 Shift 衝刺嘅速度 */
  gallopSpeed: number;
  /** 後退速度 */
  reverseSpeed: number;
  /** 全速時轉彎半徑（公尺） */
  turnRadius: number;
  /** 最大轉向速度（弧度／秒） */
  maxTurnRate: number;
  stamina: number;
  /** 衝刺每秒消耗 */
  staminaDrain: number;
  /** 非衝刺每秒恢復 */
  staminaRegen: number;
  /** 體力用盡後要回到呢個數值先可以再衝刺 */
  staminaResume: number;
  hp: number;
  armor: number;
  jumpSpeed: number;
  /** 撞擊傷害倍率 */
  ramMult: number;
  /** 身體配色 */
  color: number;
  barded: boolean;
  /** 只畀部隊用，玩家開局揀唔到 */
  troopOnly?: boolean;
  /** 只喺有魔法嘅劇本先有得賣 */
  fantasy?: boolean;
  /** 額外外形 */
  look?: 'wings' | 'horn' | 'antlers' | 'tusk' | 'hump';
  /** 識飛：半空按住空白鍵爬升 */
  flight?: boolean;
}

/** 飛行坐騎 */
export const FLIGHT = {
  /** 爬升、滑翔下降（公尺／秒） */
  climb: 7,
  sink: 2.4,
  /** 垂直加速度 */
  accel: 16,
  /** 離地最高幾多公尺 */
  ceiling: 26,
  /** 飛過呢個高度就唔撞牆同樹 */
  clearance: 8,
  /** 爬升每秒耗體力 */
  staminaDrain: 14,
  /** 部隊：離目標幾遠先升空，幾高就滑翔 */
  aiRange: 16,
  aiAltitude: 11,
};

/** 新坐騎：速度、耐打、跳躍、撞擊係主要分別 */
const mount = (
  id: string, name: string, desc: string, trot: number, gallop: number, turn: number, hp: number, armor: number, jump: number, ram: number, color: number,
  extra: Partial<HorseDef> = {},
): HorseDef => ({
  id, name, desc, accel: gallop * 0.28, brake: 9, coast: 2.2, trotSpeed: trot, gallopSpeed: gallop, reverseSpeed: 2.2,
  turnRadius: turn, maxTurnRate: 9 / turn, stamina: 110, staminaDrain: 10, staminaRegen: 7, staminaResume: 24,
  hp, armor, jumpSpeed: jump, ramMult: ram, color, barded: false, ...extra,
});

export const HORSES: HorseDef[] = [
  {
    id: 'hunter', name: '獵馬', desc: '速度同耐打都平均',
    accel: 3.8, brake: 9, coast: 2.2, trotSpeed: 8.5, gallopSpeed: 15.5, reverseSpeed: 2.2,
    turnRadius: 8, maxTurnRate: 1.5, stamina: 100, staminaDrain: 11, staminaRegen: 7, staminaResume: 25,
    hp: 150, armor: 4, jumpSpeed: 5.6, ramMult: 1, color: 0x7a4a2b, barded: false,
  },
  {
    id: 'steppe', name: '草原馬', desc: '快同靈活，但唔耐打',
    accel: 5, brake: 10, coast: 2.4, trotSpeed: 9, gallopSpeed: 17, reverseSpeed: 2.6,
    turnRadius: 5.5, maxTurnRate: 2, stamina: 90, staminaDrain: 10, staminaRegen: 8, staminaResume: 22,
    hp: 105, armor: 2, jumpSpeed: 6, ramMult: 0.7, color: 0xb98d55, barded: false,
  },
  {
    id: 'warhorse', name: '披甲戰馬', desc: '慢但耐打，撞擊最痛',
    accel: 2.8, brake: 7, coast: 1.9, trotSpeed: 7.5, gallopSpeed: 13.5, reverseSpeed: 1.8,
    turnRadius: 10.5, maxTurnRate: 1.15, stamina: 110, staminaDrain: 13, staminaRegen: 6, staminaResume: 28,
    hp: 240, armor: 14, jumpSpeed: 4.8, ramMult: 1.6, color: 0x3d3532, barded: true,
  },
  {
    id: 'pack', name: '馱馬', desc: '又慢又鈍，但好耐力',
    accel: 2.4, brake: 7, coast: 2, trotSpeed: 6.5, gallopSpeed: 10.5, reverseSpeed: 2,
    turnRadius: 7, maxTurnRate: 1.25, stamina: 160, staminaDrain: 7, staminaRegen: 9, staminaResume: 20,
    hp: 130, armor: 3, jumpSpeed: 4.2, ramMult: 0.85, color: 0x8c8078, barded: false,
  },
  {
    id: 'wolf', name: '座狼', desc: '獸人坐騎', troopOnly: true,
    accel: 5.2, brake: 11, coast: 2.6, trotSpeed: 8.5, gallopSpeed: 14.5, reverseSpeed: 2.6,
    turnRadius: 4.5, maxTurnRate: 2.2, stamina: 85, staminaDrain: 11, staminaRegen: 8, staminaResume: 22,
    hp: 95, armor: 2, jumpSpeed: 6, ramMult: 0.6, color: 0x5a5650, barded: false,
  },
  mount('camel', '駱駝', '耐力好，嚇馬', 7, 12, 8, 170, 3, 4.4, 0.9, 0xc8a56a, { look: 'hump', stamina: 170, staminaDrain: 7 }),
  mount('elk', '巨角鹿', '跳得高，角有得撞', 8.5, 15, 6, 135, 3, 7.5, 1.1, 0x8a6240, { look: 'antlers' }),
  mount('dire_wolf', '巨狼', '急轉最靈活', 8.5, 15, 3.8, 120, 3, 6.5, 0.7, 0x6a665e, { fantasy: true, accel: 6 }),
  mount('tiger', '白虎', '爆發快，咬人痛', 9, 16, 4.5, 150, 4, 7, 1, 0xe8e4d8, { fantasy: true, accel: 6 }),
  mount('rhino', '戰犀', '最硬最痛，轉彎好慢', 6.5, 12.5, 13, 340, 20, 3.8, 2.2, 0x7c7f88, { fantasy: true, look: 'tusk' }),
  mount('drake', '蜥蜴龍', '厚鱗，鞍下噴火氣勢', 8, 14, 7, 220, 12, 5.4, 1.4, 0x3f8f70, { fantasy: true, look: 'tusk' }),
  mount('unicorn', '獨角獸', '快而聖潔，一角穿甲', 9.5, 18, 5.5, 140, 5, 7, 1.3, 0xf2f0f4, { fantasy: true, look: 'horn' }),
  mount('nightmare', '夢魘', '黑焰之馬，全速最快', 9.5, 19, 7, 150, 6, 6.2, 1.2, 0x18161e, { fantasy: true, look: 'horn' }),
  mount('pegasus', '天馬', '翼拍一下跳到半空', 9, 17, 5.5, 125, 3, 12, 0.8, 0xe8ecf4, { fantasy: true, look: 'wings', flight: true }),
  mount('griffin_mount', '獅鷲', '飛撲最高，撞擊最狠嘅翼獸', 9, 16.5, 6, 210, 9, 13, 1.5, 0xb08a4a, { fantasy: true, look: 'wings', flight: true }),
];

/** 受傷馬匹最低速度比例 */
export const HORSE_INJURED_MIN_SPEED = 0.6;
/** 速度低於呢個數值按 A／D，馬會自動向前行先轉得（唔可以原地掉頭） */
export const HORSE_MIN_TURN_SPEED = 1.6;
export const HORSE_RADIUS = 1;
/** 騎手鞍位高度 */
export const SADDLE_HEIGHT = 1.62;
