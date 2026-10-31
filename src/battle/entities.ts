import { Vector3 } from 'three';
import type { AttackDir } from '../data/combat';
import type { HorseDef } from '../data/horses';
import type { UnitDef } from '../data/units';
import { SHIELD, WEAPONS, type WeaponDef } from '../data/weapons';
import type { HorseRig, HumanRig } from './models';

export type Phase = 'idle' | 'charge' | 'swing' | 'recover' | 'block' | 'stagger';

export class Horse {
  pos = new Vector3();
  vel = new Vector3();
  heading = 0;
  /** 沿車頭方向嘅速度，負數係後退 */
  speed = 0;
  vy = 0;
  grounded = true;
  stamina: number;
  exhausted = false;
  hp: number;
  dead = false;
  deadT = 0;
  rider: Combatant | null = null;
  gaitPhase = 0;
  turnInput = 0;

  constructor(public def: HorseDef, public rig: HorseRig) {
    this.stamina = def.stamina;
    this.hp = def.hp;
  }
}

export interface AiState {
  slotAngle: number;
  cooldown: number;
  dodgeT: number;
  dodgeDir: number;
  dodgeDecided: boolean;
  /** 上一次回應過嘅玩家攻擊編號 */
  seenAttack: number;
  reactT: number;
  willBlock: boolean;
  correctBlock: boolean;
}

export class Combatant {
  pos = new Vector3();
  vel = new Vector3();
  vy = 0;
  grounded = true;
  yaw = 0;
  aimYaw = 0;
  hp: number;
  dead = false;
  deadT = 0;
  spin = 0;
  weapons: WeaponDef[];
  weaponIdx = 0;
  shieldHp: number;
  shieldMax: number;

  phase: Phase = 'idle';
  phaseT = 0;
  dir: AttackDir = 'right';
  blockDir: AttackDir = 'right';
  charge = 0;
  chargeMult = 1;
  releaseQueued = false;
  staggerTime = 0;
  /** 每次出招累加，AI 用嚟判斷有冇回應過 */
  attackId = 0;
  hitThisSwing = new Set<Combatant>();

  horse: Horse | null = null;
  couched = false;
  couchCooldown = 0;
  /** 目標 → 可再被撞／刺嘅時間 */
  contactCooldown = new Map<Combatant, number>();

  walkPhase = 0;
  ai: AiState | null = null;

  constructor(public def: UnitDef, public team: number, public rig: HumanRig) {
    this.hp = def.hp;
    this.weapons = def.weapons.map((id) => WEAPONS[id]);
    const durability = team === 0 ? SHIELD.playerDurability : SHIELD.infantryDurability;
    this.shieldHp = durability;
    this.shieldMax = durability;
  }

  get weapon(): WeaponDef {
    return this.weapons[this.weaponIdx];
  }

  get hasActiveShield(): boolean {
    return this.weapon.hasShield && this.shieldHp > 0;
  }

  /** 實際世界速度（騎乘時用馬速） */
  get velocity(): Vector3 {
    return this.horse ? this.horse.vel : this.vel;
  }
}

export function angleDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function bearing(from: Vector3, to: Vector3): number {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

export function flatDist(a: Vector3, b: Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function moveToward(v: number, target: number, step: number): number {
  return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const rad = (deg: number) => (deg * Math.PI) / 180;
