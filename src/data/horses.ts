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
}

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
];

/** 受傷馬匹最低速度比例 */
export const HORSE_INJURED_MIN_SPEED = 0.6;
/** 速度低於呢個數值按 A／D，馬會自動向前行先轉得（唔可以原地掉頭） */
export const HORSE_MIN_TURN_SPEED = 1.6;
export const HORSE_RADIUS = 1;
/** 騎手鞍位高度 */
export const SADDLE_HEIGHT = 1.62;
