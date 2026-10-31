// 戰鬥手感同傷害係數：調平衡只需要改呢度

export type AttackDir = 'up' | 'down' | 'left' | 'right';
export type DamageType = 'cut' | 'pierce' | 'blunt';

export const DIR_LABEL: Record<AttackDir, string> = { up: '上', down: '下', left: '左', right: '右' };

export const COMBAT = {
  /** 傷害 = 武器基礎傷害 × (1 + 相對速度 × 係數) */
  speedDamageCoef: 0.14,
  /** 騎槍放平時用更高嘅係數 */
  couchSpeedDamageCoef: 0.24,
  /** 擦身而過時，相對速度最少計總相對速度嘅比例（唔係正面迎擊都有馬速加成） */
  passingSpeedRatio: 0.8,
  /** 步兵打騎馬目標時，只計呢個比例嘅相對速度 */
  infantryVsMountedSpeedRatio: 0.35,

  /** 蓄力倍率：未蓄力 → 蓄滿 */
  chargeMinMult: 0.75,
  chargeMaxMult: 1.25,

  dirDamageMult: { up: 1.1, down: 0.95, left: 1, right: 1 } as Record<AttackDir, number>,
  /** 護甲對各傷害類型嘅效力 */
  armorEffect: { cut: 1, pierce: 0.6, blunt: 0.4 } as Record<DamageType, number>,
  /** 護甲最多只可以減到呢個比例 */
  minDamageRatio: 0.15,

  /** 格擋有效嘅正面半角（度） */
  blockArcDeg: 95,
  /** 單一擊超過呢個傷害就破防 */
  guardBreakDamage: 62,
  /** 破防時穿透嘅傷害比例 */
  guardBreakPassThrough: 0.45,
  guardBreakStagger: 0.8,
  /** 攻擊被擋住時攻擊方硬直 */
  blockedRecoil: 0.45,
  hitStagger: 0.32,
  /** 玩家受擊硬直比例，太長會失手感 */
  playerStaggerRatio: 0.5,

  /** 揮動判定嘅角度寬容（度），騎乘時額外放寬 */
  sweepPadDeg: 12,
  mountedSweepPadDeg: 10,
  /** 上／下方向攻擊嘅命中半角（度） */
  verticalHitHalfArcDeg: 24,

  /** 擊退速度 = 原始傷害 × 係數，上限見 maxLaunch */
  launchPerDamage: 0.11,
  maxLaunch: 15,
  launchUpRatio: 0.42,

  ram: {
    /** 高過呢個速度先算撞人（公尺／秒） */
    minSpeed: 6.5,
    damagePerSpeed: 4.2,
    /** 部隊騎兵撞人嘅傷害倍率，玩家先有全傷害 */
    troopMult: 0.4,
    launchPerSpeed: 0.85,
    /** 撞中後馬匹速度倍率 */
    speedKeep: 0.86,
    /** 馬匹承受嘅反傷比例 */
    horseRecoil: 0.08,
    /** 同一目標再次受撞嘅冷卻（秒） */
    cooldown: 1,
    /** 判定：馬頭前方距離同半闊 */
    reach: 2.1,
    halfWidth: 0.95,
  },

  couch: {
    /** 高過呢個速度先放得平騎槍 */
    minSpeed: 8,
    /** 跌到 minSpeed × 呢個比例就自動收槍 */
    dropRatio: 0.72,
    hitConeDeg: 16,
    /** 同一目標再次命中嘅冷卻（秒） */
    cooldown: 1.2,
    /** 收槍後再放平嘅冷卻（秒） */
    recoverTime: 0.5,
  },

  /** 重力（公尺／秒²），箭矢同跳躍共用 */
  gravity: 16,
  ranged: {
    /** 箭矢命中嘅身體半徑寬容（公尺） */
    hitRadius: 0.5,
    /** 命中高度比例高過呢個算爆頭 */
    headHeight: 0.84,
    headMult: 1.5,
    /** 未舉盾但持盾，箭由正面嚟時有呢個機率被盾擋住 */
    passiveShieldChance: 0.4,
    /** 準星歸零距離（公尺） */
    zeroDist: 35,
    /** 準星無目標時嘅瞄準距離 */
    maxAimDist: 120,
    /** 準星線離目標幾近就當係瞄緊佢（只用嚟定距離，唔會自動修正方向） */
    aimAssistRadius: 1.6,
    /** 箭插地面停留秒數 */
    stuckLife: 7,
  },

  /** 打中騎乘目標時，打中馬嘅機率 */
  hitHorseChance: 0.4,
  /** 馬死跌落傷害同倒地時間 */
  fallDamage: 12,
  fallStagger: 1.1,
} as const;

/** 打擊感 */
export const FEEL = {
  hitStop: 0.045,
  killHitStop: 0.08,
  guardHitStop: 0.03,
  /** 重擊慢動作：傷害超過 threshold 時觸發 */
  slowMo: { threshold: 85, scale: 0.28, duration: 0.2 },
  shakeOnHit: 0.09,
  shakeOnKill: 0.24,
  shakeOnHurt: 0.3,
};

/** 第三身鏡頭 */
export const CAMERA = {
  mouseSensitivity: 0.0024,
  minPitch: -0.45,
  maxPitch: 0.9,
  distanceMounted: 6.2,
  distanceOnFoot: 4,
  heightMounted: 2.75,
  heightOnFoot: 1.75,
  shoulderOffset: 0.55,
  baseFov: 68,
  /** 出絕招時鏡頭拉遠、FOV 加闊 */
  musouZoom: 0.32,
  musouFov: 10,
  /** 全速時 FOV 增加量 */
  speedFovBoost: 16,
  /** 騎馬轉彎時鏡頭跟轉嘅比例（0 = 完全獨立，1 = 完全跟馬） */
  followHorseTurn: 0.65,
  /** 拉弓瞄準時 FOV 同鏡頭距離倍率 */
  aimFovDrop: 18,
  aimDistanceMult: 0.72,
};
