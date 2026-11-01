import type { GiantState } from './colossus';
import { Vector3 } from 'three';
import type { AttackDir } from '../data/combat';
import type { HorseDef } from '../data/horses';
import type { UnitDef } from '../data/units';
import { SHIELD, WEAPONS, type WeaponDef } from '../data/weapons';
import type { HorseRig, HumanRig } from './models';
import type { Group } from './orders';
import type { Soldier } from '../core/roster';
import type { HorseSkin, HumanSkin } from './skins';

export type Phase = 'idle' | 'charge' | 'swing' | 'recover' | 'block' | 'stagger';

export interface HorseControl {
  throttle: number;
  turn: number;
  sprint: boolean;
  jump: boolean;
  /** 飛行坐騎爬升 */
  climb?: boolean;
}

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
  skin?: HorseSkin;
  skinOn = false;
  gaitPhase = 0;
  turnInput = 0;
  ctl: HorseControl = { throttle: 0, turn: 0, sprint: false, jump: false };

  constructor(public def: HorseDef, public rig: HorseRig) {
    this.stamina = def.stamina;
    this.hp = def.hp;
  }
}

export interface AiState {
  /** 專責拆投石機 */
  raid?: { x: number; z: number } | null;
  group: Group;
  target: Combatant | null;
  retarget: number;
  slotAngle: number;
  cooldown: number;
  dodgeT: number;
  dodgeDir: number;
  dodgeDecided: boolean;
  /** 上一次回應過嘅目標攻擊編號 */
  seenAttack: number;
  reactT: number;
  willBlock: boolean;
  correctBlock: boolean;
  /** 騎兵衝鋒鎖定時間 */
  commitT: number;
  /** 拉滿後放箭嘅延遲 */
  releaseAt: number;
  slotX: number;
  slotZ: number;
}

export class Combatant {
  /** CC0 骨架模型；冇就用程式畫嘅 rig */
  skin?: HumanSkin;
  /** 夠近，呢幀畫骨架模型 */
  skinOn = false;
  /** 職業場景：未發現主角，由 Mission 控制 */
  calm = false;
  /** 按鍵技能冷卻同效果剩餘秒數 */
  skillCd = [0, 0, 0, 0, 0, 0];
  skillThink = 0;
  guardT = 0;
  focusT = 0;
  drainT = 0;
  stealthT = 0;
  giantT = 0;
  cloudT = 0;
  stompT = 0;
  bindT = 0;
  /** 分身、召喚物嘅存在時間 */
  lifeT = 0;
  lineQueue: number[] = [];
  /** 爬緊雲梯或者攻城塔 */
  climbing = false;
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
  /** 已逃離戰場 */
  fled = false;
  /** 第一身時唔畫自己 */
  hiddenBody = false;
  mp = 0;
  /** 魔法護盾剩餘秒數 */
  wardT = 0;
  /** 冠位戰技氣量 */
  musou = 0;
  /** 出緊絕招，呢段時間無敵 */
  musouT = 0;
  /** 超巨型敵人嘅招式狀態 */
  giant: GiantState | null = null;
  /** 已經提示過氣滿 */
  musouReady = false;
  /** 倒下但只係受傷 */
  wounded = false;
  morale: number;
  routing = false;
  weapons: WeaponDef[];
  weaponIdx = 0;
  ammo: Record<string, number> = {};
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
  /** 兵冊入面嘅士兵，敵軍冇 */
  soldier: Soldier | null = null;
  /** 今場累積 */
  xpEarned = 0;
  killCount = 0;

  constructor(public def: UnitDef, public team: number, public rig: HumanRig, weaponIds: string[]) {
    this.hp = def.hp;
    this.mp = def.mp ?? 0;
    this.morale = def.morale;
    this.weapons = weaponIds.map((id) => WEAPONS[id]);
    for (const w of this.weapons) if (w.ranged) this.ammo[w.id] = w.ranged.ammo;
    const durability = def.id === 'player' ? SHIELD.playerDurability : SHIELD.troopDurability;
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
export const randRange = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
