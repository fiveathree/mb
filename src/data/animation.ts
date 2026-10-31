import type { AttackDir } from './combat';

/** 右臂姿勢：肩膊旋轉（rx, ry, rz）、手腕 w、上身扭動 twist（弧度） */
export interface ArmPose {
  rx: number;
  ry: number;
  rz: number;
  w: number;
  twist: number;
}

export const IDLE_POSE: ArmPose = { rx: -0.65, ry: 0, rz: 0, w: -0.35, twist: 0 };
export const LANCE_IDLE_POSE: ArmPose = { rx: -0.35, ry: 0, rz: 0, w: 0.15, twist: 0 };
export const COUCH_POSE: ArmPose = { rx: -0.42, ry: 0.12, rz: 0, w: 0.42, twist: -0.25 };

export const BLOCK_POSES: Record<AttackDir, ArmPose> = {
  up: { rx: -2.2, ry: 0.2, rz: 0.3, w: 0.9, twist: 0 },
  down: { rx: -1, ry: 0.3, rz: 0.1, w: -0.2, twist: 0 },
  left: { rx: -1.3, ry: 0.75, rz: 0, w: 0, twist: 0.25 },
  right: { rx: -1.3, ry: -0.5, rz: 0, w: 0, twist: -0.25 },
};

export const ATTACK_POSES: Record<AttackDir, { wind: ArmPose; strike: ArmPose }> = {
  up: {
    wind: { rx: -2.9, ry: 0.15, rz: 0, w: -0.6, twist: -0.25 },
    strike: { rx: -0.95, ry: -0.05, rz: 0, w: 0.75, twist: 0.2 },
  },
  down: {
    wind: { rx: -0.55, ry: -0.3, rz: 0, w: 0.55, twist: -0.45 },
    strike: { rx: -1.55, ry: 0.05, rz: 0, w: 1.55, twist: 0.35 },
  },
  left: {
    wind: { rx: -1.65, ry: 1.45, rz: 0, w: 1.45, twist: 0.65 },
    strike: { rx: -1.5, ry: -1, rz: 0, w: 1.45, twist: -0.55 },
  },
  right: {
    wind: { rx: -1.65, ry: -1.6, rz: 0, w: 1.45, twist: -0.75 },
    strike: { rx: -1.5, ry: 0.85, rz: 0, w: 1.45, twist: 0.55 },
  },
};

/** 長槍、長矛等刺擊武器 */
export const THRUST_POSES = {
  wind: { rx: -0.9, ry: -0.2, rz: 0, w: 0.9, twist: -0.5 },
  strike: { rx: -1.55, ry: 0, rz: 0, w: 1.55, twist: 0.4 },
};

/** 遠程武器姿勢 */
export const RANGED_POSES = {
  bowDraw: { rx: -1.5, ry: -0.75, rz: 0, w: 0, twist: -0.45 },
  crossbowAim: { rx: -1.45, ry: 0.15, rz: 0, w: 1.45, twist: 0 },
  crossbowIdle: { rx: -0.8, ry: 0.3, rz: 0, w: 1, twist: 0 },
  javelinWind: { rx: -2.7, ry: 0, rz: 0, w: 1.9, twist: -0.4 },
  javelinIdle: { rx: -0.5, ry: 0, rz: 0, w: 0.4, twist: 0 },
};

/** 姿勢追隨速度（每秒） */
export const POSE_RATE = { normal: 16, swing: 34, block: 22 };
/** 遠處單位每幾幀先更新一次動畫 */
export const LOD = { distance: 55, interval: 3 };
/** 步行擺腿頻率：每公尺幾多弧度 */
export const WALK_PHASE_PER_METER = 3.1;
/** 馬匹步態頻率 */
export const GAIT = { phasePerMeter: 0.95, minPhaseRate: 0, walkSwing: 0.42, gallopSwing: 0.95, gallopFrom: 9 };
