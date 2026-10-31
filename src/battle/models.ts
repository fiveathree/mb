import * as THREE from 'three';
import {
  ATTACK_POSES, BLOCK_POSES, COUCH_POSE, GAIT, IDLE_POSE, LANCE_IDLE_POSE, POSE_RATE,
  RANGED_POSES, THRUST_POSES, WALK_PHASE_PER_METER, type ArmPose,
} from '../data/animation';
import { COLORS } from '../data/battlefield';
import { SADDLE_HEIGHT, type HorseDef } from '../data/horses';
import type { UnitDef } from '../data/units';
import type { WeaponDef } from '../data/weapons';
import { flushParts, type Batches, type Part } from './batch';
import { clamp, angleDiff, type Combatant, type Horse } from './entities';

/** 建模時嘅目標：部件加入邊個 rig、由邊個節點控制顯示 */
let ctx: { batches: Batches; parts: Part[]; gate: THREE.Object3D | null };

function part(
  key: string, make: () => THREE.BufferGeometry, color: number, sx: number, sy: number, sz: number,
): THREE.Object3D {
  const node = new THREE.Object3D();
  node.scale.set(sx, sy, sz);
  ctx.parts.push(ctx.batches.alloc(key, make, color, node, ctx.gate));
  return node;
}

function box(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0): THREE.Object3D {
  const node = part('box', () => new THREE.BoxGeometry(1, 1, 1), color, w, h, d);
  node.position.set(x, y, z);
  return node;
}

function cyl(rTop: number, rBottom: number, h: number, seg: number, color: number): THREE.Object3D {
  const ratio = Math.round((rTop / rBottom) * 20) / 20;
  return part(`cyl:${seg}:${ratio}`, () => new THREE.CylinderGeometry(ratio, 1, 1, seg), color, rBottom, h, rBottom);
}

function cone(r: number, h: number, seg: number, color: number): THREE.Object3D {
  return part(`cone:${seg}`, () => new THREE.ConeGeometry(1, 1, seg), color, r, h, r);
}

function ico(r: number, color: number): THREE.Object3D {
  return part('ico', () => new THREE.IcosahedronGeometry(1, 0), color, r, r, r);
}

export interface HumanRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  armR: THREE.Group;
  wrist: THREE.Group;
  armL: THREE.Group;
  gripL: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  kneeL: THREE.Group;
  kneeR: THREE.Group;
  weaponMeshes: Map<string, THREE.Group>;
  shield: THREE.Group;
  pose: ArmPose;
  parts: Part[];
}

function buildWeapon(w: WeaponDef): THREE.Group {
  const g = new THREE.Group();
  ctx.gate = g;
  const L = w.length;
  switch (w.model) {
    case 'sword':
      g.add(
        box(0.06, 0.02, L, COLORS.steel, 0, 0, L / 2 + 0.08),
        box(0.22, 0.04, 0.04, 0x8d7a3c, 0, 0, 0.08),
        box(0.035, 0.035, 0.2, COLORS.wood, 0, 0, -0.03),
      );
      break;
    case 'axe':
      g.add(box(0.045, 0.045, L, COLORS.wood, 0, 0, L / 2 - 0.25), box(0.03, 0.34, 0.26, COLORS.steel, 0, 0.14, L - 0.34));
      break;
    case 'mace': {
      const head = ico(0.11, COLORS.steel);
      head.position.z = L - 0.2;
      g.add(box(0.045, 0.045, L, COLORS.wood, 0, 0, L / 2 - 0.2), head);
      break;
    }
    case 'bow': {
      const limb = (sign: number) => {
        const n = box(0.035, 0.05, L * 0.5, COLORS.wood, 0, 0, sign * L * 0.25);
        n.rotation.x = sign * 0.32;
        n.position.y = 0.09;
        return n;
      };
      g.add(limb(1), limb(-1), box(0.008, 0.008, L * 0.92, 0xe8e0cc, 0, -0.03, 0));
      break;
    }
    case 'crossbow':
      g.add(box(0.06, 0.07, L, COLORS.wood, 0, 0, L / 2 - 0.15), box(0.72, 0.03, 0.05, COLORS.steel, 0, 0.03, L - 0.2));
      break;
    default: {
      const color = w.model === 'lance' ? 0xe8dcc0 : COLORS.wood;
      const shaft = cyl(0.025, 0.04, L, 5, color);
      shaft.rotation.x = Math.PI / 2;
      const back = w.model === 'javelin' ? 0.5 : 0.7;
      shaft.position.z = L / 2 - back;
      const tip = cone(0.06, 0.32, 4, COLORS.steel);
      tip.rotation.x = Math.PI / 2;
      tip.position.z = L - back + 0.15;
      g.add(shaft, tip);
      if (w.model === 'lance') {
        const guard = cone(0.11, 0.3, 6, 0xb5362c);
        guard.rotation.x = -Math.PI / 2;
        guard.position.z = 0.26;
        g.add(guard);
      }
    }
  }
  ctx.gate = null;
  return g;
}

export function buildHuman(def: UnitDef, bodyColor: number, weapons: WeaponDef[], batches: Batches): HumanRig {
  ctx = { batches, parts: [], gate: null };
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  root.add(hips);

  const torso = new THREE.Group();
  hips.add(torso);
  torso.add(box(0.46, 0.62, 0.27, bodyColor, 0, 0.32, 0));
  torso.add(box(0.48, 0.08, 0.29, def.trimColor, 0, 0.05, 0));
  torso.add(box(0.52, 0.12, 0.3, def.trimColor, 0, 0.6, 0));

  const head = ico(0.135, COLORS.skin);
  head.position.y = 0.82;
  const helmet = cyl(0.05, 0.16, 0.17, 6, COLORS.steel);
  helmet.position.y = 0.93;
  torso.add(head, helmet);

  const armR = new THREE.Group();
  armR.rotation.order = 'YXZ';
  armR.position.set(-0.3, 0.57, 0);
  armR.add(box(0.13, 0.58, 0.13, bodyColor, 0, -0.27, 0));
  const wrist = new THREE.Group();
  wrist.position.y = -0.56;
  armR.add(wrist);
  torso.add(armR);

  const armL = new THREE.Group();
  armL.rotation.order = 'YXZ';
  armL.position.set(0.3, 0.57, 0);
  armL.add(box(0.13, 0.58, 0.13, bodyColor, 0, -0.27, 0));
  const gripL = new THREE.Group();
  gripL.position.y = -0.56;
  armL.add(gripL);
  torso.add(armL);

  const shield = new THREE.Group();
  ctx.gate = shield;
  const face = cyl(0.42, 0.42, 0.05, 6, def.trimColor);
  face.rotation.z = Math.PI / 2;
  const boss = cyl(0.13, 0.13, 0.07, 6, COLORS.steel);
  boss.rotation.z = Math.PI / 2;
  boss.position.x = 0.03;
  shield.add(face, boss);
  ctx.gate = null;
  shield.position.set(0.08, -0.42, 0);
  armL.add(shield);

  const weaponMeshes = new Map<string, THREE.Group>();
  for (const w of weapons) {
    const m = buildWeapon(w);
    m.visible = false;
    (w.model === 'bow' ? gripL : wrist).add(m);
    weaponMeshes.set(w.id, m);
  }

  const leg = (x: number) => {
    const upper = new THREE.Group();
    upper.position.set(x, 0, 0);
    upper.add(box(0.17, 0.46, 0.17, def.trimColor, 0, -0.22, 0));
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    knee.add(box(0.15, 0.46, 0.15, 0x3a3a40, 0, -0.22, 0), box(0.16, 0.08, 0.28, 0x2c2622, 0, -0.46, 0.05));
    upper.add(knee);
    hips.add(upper);
    return [upper, knee] as const;
  };
  const [legL, kneeL] = leg(0.13);
  const [legR, kneeR] = leg(-0.13);

  return {
    root, hips, torso, armR, wrist, armL, gripL, legL, legR, kneeL, kneeR, weaponMeshes, shield,
    pose: { ...IDLE_POSE }, parts: ctx.parts,
  };
}

export interface HorseRig {
  root: THREE.Group;
  body: THREE.Group;
  neck: THREE.Group;
  legs: { upper: THREE.Group; lower: THREE.Group; offset: number }[];
  tail: THREE.Group;
  parts: Part[];
}

export function buildHorse(def: HorseDef, batches: Batches): HorseRig {
  ctx = { batches, parts: [], gate: null };
  const c = def.color;
  const dark = 0x2a2220;
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  const body = new THREE.Group();
  body.position.y = 1.18;
  root.add(body);

  body.add(box(0.62, 0.68, 1.75, c));
  body.add(box(0.56, 0.6, 0.5, c, 0, 0.03, 0.85));
  body.add(box(0.58, 0.62, 0.55, c, 0, 0.04, -0.8));
  // 鞍具
  body.add(box(0.66, 0.1, 0.72, 0x5b2b22, 0, 0.36, -0.04), box(0.68, 0.34, 0.5, 0xb5362c, 0, 0.2, -0.05));
  if (def.barded) {
    body.add(box(0.72, 0.68, 1.3, 0x7d858c, 0, -0.14, 0.42), box(0.72, 0.68, 0.9, 0x7d858c, 0, -0.14, -0.72));
  }

  const neck = new THREE.Group();
  neck.position.set(0, 0.2, 1);
  neck.rotation.x = -0.72;
  neck.add(box(0.3, 0.42, 0.95, c, 0, 0, 0.42));
  neck.add(box(0.08, 0.14, 0.92, dark, 0, 0.26, 0.38));
  const head = new THREE.Group();
  head.position.set(0, 0.05, 0.88);
  head.rotation.x = 1.15;
  head.add(box(0.24, 0.27, 0.42, c, 0, 0, 0.14), box(0.19, 0.2, 0.32, c, 0, -0.02, 0.46));
  head.add(box(0.05, 0.14, 0.05, dark, 0.08, 0.17, -0.04), box(0.05, 0.14, 0.05, dark, -0.08, 0.17, -0.04));
  neck.add(head);
  body.add(neck);

  const tail = new THREE.Group();
  tail.position.set(0, 0.24, -1.07);
  tail.rotation.x = 0.5;
  tail.add(box(0.11, 0.8, 0.11, dark, 0, -0.38, 0));
  body.add(tail);

  const legs: HorseRig['legs'] = [];
  const leg = (x: number, z: number, offset: number) => {
    const upper = new THREE.Group();
    upper.position.set(x, -0.2, z);
    upper.add(box(0.17, 0.52, 0.2, c, 0, -0.26, 0));
    const lower = new THREE.Group();
    lower.position.y = -0.5;
    lower.add(box(0.11, 0.46, 0.13, c, 0, -0.22, 0), box(0.14, 0.09, 0.17, dark, 0, -0.46, 0.02));
    upper.add(lower);
    body.add(upper);
    legs.push({ upper, lower, offset });
  };
  leg(0.2, 0.8, 0);
  leg(-0.2, 0.8, 0.55);
  leg(0.2, -0.8, 3.0);
  leg(-0.2, -0.8, 3.6);

  return { root, body, neck, legs, tail, parts: ctx.parts };
}

function lerpPose(p: ArmPose, t: ArmPose, k: number) {
  p.rx += (t.rx - p.rx) * k;
  p.ry += (t.ry - p.ry) * k;
  p.rz += (t.rz - p.rz) * k;
  p.w += (t.w - p.w) * k;
  p.twist += (t.twist - p.twist) * k;
}

function targetPose(c: Combatant): { pose: ArmPose; rate: number } {
  const w = c.weapon;
  if (w.ranged) {
    const aiming = c.phase === 'charge';
    if (w.model === 'bow') return { pose: aiming ? RANGED_POSES.bowDraw : IDLE_POSE, rate: POSE_RATE.normal };
    if (w.model === 'crossbow') {
      return { pose: aiming ? RANGED_POSES.crossbowAim : RANGED_POSES.crossbowIdle, rate: POSE_RATE.normal };
    }
    return { pose: aiming ? RANGED_POSES.javelinWind : RANGED_POSES.javelinIdle, rate: POSE_RATE.normal };
  }
  const idle = w.thrustOnly ? LANCE_IDLE_POSE : IDLE_POSE;
  if (c.couched) return { pose: COUCH_POSE, rate: POSE_RATE.normal };
  const set = w.thrustOnly ? THRUST_POSES : ATTACK_POSES[c.dir];
  switch (c.phase) {
    case 'charge': return { pose: set.wind, rate: POSE_RATE.normal };
    case 'swing': return { pose: set.strike, rate: POSE_RATE.swing };
    case 'block': return { pose: BLOCK_POSES[c.blockDir], rate: POSE_RATE.block };
    default: return { pose: idle, rate: POSE_RATE.normal };
  }
}

export function syncHuman(c: Combatant, dt: number) {
  const r = c.rig;
  const h = c.horse;

  if (c.fled) {
    flushParts(r.root, r.parts, true);
    return;
  }

  if (h) {
    r.root.position.set(h.pos.x, h.pos.y + SADDLE_HEIGHT - 0.95, h.pos.z);
    r.root.rotation.y = h.heading;
    r.root.rotation.z = -h.turnInput * clamp(h.speed / h.def.gallopSpeed, 0, 1) * 0.12;
    r.legL.rotation.set(-1.15, 0, 0.32);
    r.legR.rotation.set(-1.15, 0, -0.32);
    r.kneeL.rotation.x = 1.25;
    r.kneeR.rotation.x = 1.25;
  } else {
    r.root.position.copy(c.pos);
    r.root.rotation.y = c.yaw;
    r.root.rotation.z = 0;
    const speed = Math.hypot(c.vel.x, c.vel.z);
    c.walkPhase += speed * WALK_PHASE_PER_METER * dt;
    const amp = clamp(speed / 3, 0, 1) * 0.7;
    const s = Math.sin(c.walkPhase);
    r.legL.rotation.set(s * amp, 0, 0);
    r.legR.rotation.set(-s * amp, 0, 0);
    r.kneeL.rotation.x = Math.max(0, -s) * amp * 1.2;
    r.kneeR.rotation.x = Math.max(0, s) * amp * 1.2;
  }

  if (c.dead) {
    const fall = clamp(c.deadT / 0.5, 0, 1);
    r.root.rotation.x = c.spin * c.deadT * (c.grounded ? 0 : 1) + (-Math.PI / 2) * fall * fall;
    r.root.position.y = c.pos.y + 0.18 * fall;
  } else if (c.phase === 'stagger') {
    r.root.rotation.x = -0.28 * Math.sin(clamp(c.phaseT / c.staggerTime, 0, 1) * Math.PI);
  } else {
    r.root.rotation.x = 0;
  }

  const { pose, rate } = targetPose(c);
  lerpPose(r.pose, pose, 1 - Math.exp(-rate * dt));
  const p = r.pose;

  const look = h ? clamp(angleDiff(c.aimYaw, h.heading), -1.3, 1.3) : 0;
  r.torso.rotation.y = look + p.twist;
  r.armR.rotation.set(p.rx, p.ry, p.rz);
  r.wrist.rotation.x = p.w;

  const w = c.weapon;
  const shieldUp = c.phase === 'block' && c.hasActiveShield;
  const bowUp = w.ranged && c.phase === 'charge' && w.model !== 'javelin';
  const armLTarget = shieldUp ? -1.45 : bowUp ? -1.55 : w.hasShield ? -0.75 : -0.5;
  r.armL.rotation.x += (armLTarget - r.armL.rotation.x) * (1 - Math.exp(-POSE_RATE.block * dt));
  r.armL.rotation.y = shieldUp ? -0.75 : bowUp ? 0 : -0.35;

  r.shield.visible = c.hasActiveShield;
  for (const [id, m] of r.weaponMeshes) m.visible = id === w.id;
  flushParts(r.root, r.parts);
}

export function syncHorse(h: Horse, dt: number) {
  const r = h.rig;
  r.root.position.copy(h.pos);
  r.root.rotation.y = h.heading;
  const ratio = clamp(Math.abs(h.speed) / h.def.gallopSpeed, 0, 1);

  if (h.dead) {
    const f = clamp(h.deadT / 0.7, 0, 1);
    r.root.rotation.z = (Math.PI / 2) * f * f;
    r.root.position.y = h.pos.y + 0.32 * f;
    flushParts(r.root, r.parts);
    return;
  }

  h.gaitPhase += h.speed * GAIT.phasePerMeter * dt * 2;
  const gallop = clamp(Math.abs(h.speed) / GAIT.gallopFrom, 0, 1);
  const swing = (GAIT.walkSwing + (GAIT.gallopSwing - GAIT.walkSwing) * gallop) * clamp(Math.abs(h.speed) / 1.5, 0, 1);
  for (const leg of r.legs) {
    const ph = h.gaitPhase + leg.offset;
    leg.upper.rotation.x = Math.sin(ph) * swing;
    leg.lower.rotation.x = Math.max(0, Math.cos(ph)) * swing * 1.3;
  }
  const bob = Math.sin(h.gaitPhase * 2) * 0.05 * ratio + Math.sin(h.gaitPhase) * 0.05 * ratio;
  r.body.position.y = 1.18 + bob;
  r.body.rotation.x = Math.sin(h.gaitPhase) * 0.075 * ratio + (h.grounded ? 0 : -h.vy * 0.06);
  r.root.rotation.z = -h.turnInput * ratio * 0.14;
  r.neck.rotation.x = -0.72 + ratio * 0.3 + Math.sin(h.gaitPhase) * 0.1 * ratio;
  r.tail.rotation.x = 0.5 + ratio * 0.75;
  flushParts(r.root, r.parts);
}
