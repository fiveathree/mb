import * as THREE from 'three';
import {
  ATTACK_POSES, BLOCK_POSES, COUCH_POSE, GAIT, IDLE_POSE, LANCE_IDLE_POSE, POSE_RATE,
  RANGED_POSES, THRUST_POSES, WALK_PHASE_PER_METER, type ArmPose,
} from '../data/animation';
import { COLORS } from '../data/battlefield';
import { SADDLE_HEIGHT, type HorseDef } from '../data/horses';
import { RACES, type RaceLook } from '../data/races';
import { TEAM_STYLES, type UnitDef } from '../data/units';
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
  marker: THREE.Group;
  pose: ArmPose;
  parts: Part[];
  dragon?: DragonRig;
}

export interface DragonRig {
  wings: THREE.Group[];
  legs: THREE.Group[];
  neck: THREE.Group;
  tail: THREE.Group;
  /** 拍翼計時 */
  t: number;
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
    case 'staff': {
      const orb = ico(0.09, 0xff9a3c);
      orb.position.z = L - 0.25;
      g.add(box(0.04, 0.04, L, COLORS.wood, 0, 0, L / 2 - 0.3), orb);
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

/** 非人類嘅面部特徵 */
function addRaceFeatures(torso: THREE.Group, look: RaceLook, skin: number) {
  const side = (fn: (s: number) => THREE.Object3D) => torso.add(fn(1), fn(-1));
  switch (look) {
    case 'ears':
      side((s) => {
        const ear = cone(0.04, 0.2, 4, skin);
        ear.position.set(s * 0.17, 0.86, -0.02);
        ear.rotation.z = -s * 1.2;
        return ear;
      });
      break;
    case 'tusks':
      side((s) => box(0.035, 0.09, 0.035, 0xf0ead8, s * 0.07, 0.75, 0.12));
      break;
    case 'skull':
      side((s) => box(0.05, 0.05, 0.02, 0x121018, s * 0.055, 0.84, 0.125));
      break;
    case 'bull':
      torso.add(box(0.16, 0.13, 0.2, skin, 0, 0.77, 0.14));
      side((s) => {
        const horn = cone(0.06, 0.42, 5, 0xe8dcc0);
        horn.position.set(s * 0.26, 0.98, 0);
        horn.rotation.z = -s * 0.85;
        return horn;
      });
      break;
    case 'snout':
      torso.add(box(0.13, 0.1, 0.18, skin, 0, 0.78, 0.15));
      break;
    case 'wings':
      side((s) => {
        const wing = box(0.7, 0.03, 0.34, skin, s * 0.5, 0.58, -0.17);
        wing.rotation.z = s * 0.5;
        return wing;
      });
      break;
    case 'antlers':
      side((s) => {
        const branch = box(0.05, 0.42, 0.05, 0x5a7a3a, s * 0.14, 1.06, 0);
        branch.rotation.z = -s * 0.5;
        return branch;
      });
      break;
    case 'fins':
      side((s) => box(0.03, 0.16, 0.14, 0x2d9aa8, s * 0.15, 0.84, 0));
      break;
    default:
      break;
  }
}

/** 真正嘅四足巨龍：頸、頭、翼、尾、四腳，加落 hips */
function buildDragon(hips: THREE.Group, skin: number): DragonRig {
  const belly = new THREE.Color(skin).lerp(new THREE.Color(0xe8d8a8), 0.45).getHex();
  const dark = new THREE.Color(skin).multiplyScalar(0.55).getHex();
  const body = new THREE.Group();
  body.position.y = 0.1;
  hips.add(body);
  body.add(box(0.74, 0.72, 1.7, skin), box(0.62, 0.62, 0.62, skin, 0, 0.08, 0.95), box(0.56, 0.08, 1.9, belly, 0, -0.36, 0.1));
  for (let i = 0; i < 5; i++) body.add(box(0.05, 0.16, 0.2, dark, 0, 0.44, 0.7 - i * 0.38));

  const neck = new THREE.Group();
  neck.position.set(0, 0.3, 1.2);
  neck.rotation.x = -0.75;
  neck.add(box(0.34, 0.34, 0.5, skin, 0, 0, 0.22), box(0.28, 0.28, 0.5, skin, 0, 0, 0.64));
  const head = new THREE.Group();
  head.position.set(0, 0, 0.92);
  head.rotation.x = 0.8;
  head.add(box(0.4, 0.3, 0.46, skin, 0, 0, 0.14), box(0.28, 0.18, 0.42, skin, 0, -0.04, 0.54), box(0.26, 0.05, 0.38, belly, 0, -0.15, 0.5));
  for (const s of [1, -1]) {
    const horn = cone(0.05, 0.42, 5, 0xe8dcc0);
    horn.position.set(s * 0.14, 0.26, -0.14);
    horn.rotation.x = -0.9;
    head.add(horn, box(0.05, 0.05, 0.05, 0xf2c14e, s * 0.17, 0.08, 0.26));
  }
  neck.add(head);
  body.add(neck);

  const tail = new THREE.Group();
  tail.position.set(0, 0.06, -0.85);
  tail.rotation.x = 0.16;
  tail.add(box(0.42, 0.4, 0.8, skin, 0, 0, -0.38), box(0.28, 0.26, 0.8, skin, 0, -0.02, -1.08), box(0.16, 0.14, 0.7, skin, 0, -0.04, -1.76));
  const tip = cone(0.16, 0.42, 4, dark);
  tip.position.set(0, -0.04, -2.2);
  tip.rotation.x = -Math.PI / 2;
  tail.add(tip);
  body.add(tail);

  const wings = [1, -1].map((s) => {
    const wing = new THREE.Group();
    wing.position.set(s * 0.36, 0.34, 0.35);
    wing.add(box(1.9, 0.05, 0.14, dark, s * 0.95, 0, 0.3), box(1.8, 0.03, 0.95, dark, s * 0.95, 0, -0.2));
    body.add(wing);
    return wing;
  });

  const legs = [[1, 0.72], [-1, 0.72], [1, -0.62], [-1, -0.62]].map(([s, z]) => {
    const leg = new THREE.Group();
    leg.position.set(s * 0.42, -0.2, z);
    leg.add(box(0.26, 0.5, 0.32, skin, 0, -0.22, 0), box(0.2, 0.42, 0.24, skin, 0, -0.6, 0), box(0.28, 0.08, 0.42, dark, 0, -0.82, 0.08));
    body.add(leg);
    return leg;
  });
  return { wings, legs, neck, tail, t: 0 };
}

export function buildHuman(def: UnitDef, team: number, weapons: WeaponDef[], batches: Batches): HumanRig {
  ctx = { batches, parts: [], gate: null };
  const style = TEAM_STYLES[team];
  const bodyColor = def.civilian ? def.trimColor : style.body;
  const race = RACES[def.race ?? 'human'];
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  root.scale.setScalar(race.scale * (def.hero ? 1.14 : 1) * (def.scale ?? 1));
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  root.add(hips);

  const torso = new THREE.Group();
  hips.add(torso);
  torso.add(box(0.46, 0.62, 0.27, bodyColor, 0, 0.32, 0));
  torso.add(box(0.48, 0.08, 0.29, def.trimColor, 0, 0.05, 0));
  torso.add(box(0.52, 0.12, 0.3, def.trimColor, 0, 0.6, 0));

  const skin = def.skin ?? race.skin;
  const head = ico(0.135, skin);
  head.position.y = 0.82;
  torso.add(head);
  addRaceFeatures(torso, race.look, skin);
  if (race.look !== 'bull' && !def.civilian) {
    const helmet = cyl(0.05, 0.16, 0.17, 6, style.helmet);
    helmet.position.y = 0.93;
    torso.add(helmet);
  }

  // 盔飾：我軍羽飾、敵軍牛角
  if (def.civilian) {
    // 平民唔戴盔飾
  } else if (style.crest === 'plume') {
    const plume = box(0.05, 0.2, 0.3, def.plumeColor ?? style.crestColor, 0, 1.08, -0.04);
    plume.rotation.x = -0.25;
    torso.add(plume);
  } else {
    const horn = (side: number) => {
      const h = cone(0.045, 0.3, 4, def.plumeColor ?? style.crestColor);
      h.position.set(side * 0.2, 1.03, 0);
      h.rotation.z = -side * 0.6;
      return h;
    };
    torso.add(horn(1), horn(-1));
  }

  // 背旗：遠處都睇到邊邊
  if (!def.civilian) {
    torso.add(box(0.03, 1.1, 0.03, COLORS.wood, 0.08, 0.95, -0.18));
    torso.add(box(0.03, 0.34, 0.36, def.plumeColor ?? style.body, 0.08, 1.32, -0.38));
  }

  if (def.hero) {
    const cape = box(0.5, 0.95, 0.04, def.trimColor, 0, 0.12, -0.17);
    cape.rotation.x = 0.14;
    torso.add(cape);
  }

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
  const face = cyl(0.42, 0.42, 0.05, 6, style.shield);
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
    upper.add(box(0.17, 0.46, 0.17, style.legs, 0, -0.22, 0));
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    knee.add(box(0.15, 0.46, 0.15, style.legs, 0, -0.22, 0), box(0.16, 0.08, 0.28, 0x2c2622, 0, -0.46, 0.05));
    upper.add(knee);
    hips.add(upper);
    return [upper, knee] as const;
  };
  const [legL, kneeL] = leg(0.13);
  const [legR, kneeR] = leg(-0.13);
  // 半人馬冇人腳；龍同史萊姆連上身都收埋，換成自己嘅身體
  if (def.race === 'centaur' || def.race === 'dragon' || def.race === 'slime') {
    legL.scale.setScalar(0.001);
    legR.scale.setScalar(0.001);
  }
  if (def.race === 'slime') {
    torso.scale.setScalar(0.001);
    const blob = ico(0.62, skin);
    blob.position.y = -0.42;
    blob.scale.y *= 0.82;
    hips.add(blob);
    for (const s of [1, -1]) hips.add(box(0.08, 0.14, 0.04, 0x10202c, s * 0.2, -0.3, 0.56));
  }
  let dragon: DragonRig | undefined;
  if (def.race === 'dragon') {
    torso.scale.setScalar(0.001);
    dragon = buildDragon(hips, def.skin ?? race.skin);
  }

  // 頭頂標記：英雄用金色
  const marker = new THREE.Group();
  ctx.gate = marker;
  const tip = cone(0.15, 0.3, 4, def.hero ? 0xffd34d : style.marker);
  tip.rotation.x = Math.PI;
  tip.position.y = 2.5;
  marker.add(tip);
  ctx.gate = null;
  root.add(marker);

  return {
    root, hips, torso, armR, wrist, armL, gripL, legL, legR, kneeL, kneeR, weaponMeshes, shield, marker,
    pose: { ...IDLE_POSE }, parts: ctx.parts, dragon,
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

export function buildHorse(def: HorseDef, team: number, batches: Batches): HorseRig {
  ctx = { batches, parts: [], gate: null };
  const cloth = TEAM_STYLES[team].cloth;
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
  body.add(box(0.66, 0.1, 0.72, 0x5b2b22, 0, 0.36, -0.04), box(0.7, 0.62, 1.1, cloth, 0, 0.06, -0.05));
  if (def.barded) {
    body.add(box(0.72, 0.68, 1.3, cloth, 0, -0.14, 0.42), box(0.72, 0.68, 0.9, cloth, 0, -0.14, -0.72));
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

  switch (def.look) {
    case 'wings':
      for (const s of [1, -1]) {
        const wing = box(1.5, 0.05, 0.85, c, s * 1, 0.42, 0.1);
        wing.rotation.z = s * 0.35;
        body.add(wing);
      }
      break;
    case 'horn': {
      const horn = cone(0.05, 0.55, 5, 0xf0e0a0);
      horn.position.set(0, 0.28, 0.32);
      horn.rotation.x = 0.8;
      head.add(horn);
      break;
    }
    case 'antlers':
      for (const s of [1, -1]) {
        const antler = box(0.05, 0.6, 0.05, 0xd8c8a0, s * 0.2, 0.36, -0.05);
        antler.rotation.z = -s * 0.5;
        head.add(antler);
      }
      break;
    case 'tusk': {
      const tusk = cone(0.1, 0.4, 5, 0xe8dcc0);
      tusk.position.set(0, 0.18, 0.56);
      tusk.rotation.x = 0.5;
      head.add(tusk);
      break;
    }
    case 'hump':
      body.add(box(0.46, 0.34, 0.5, c, 0, 0.5, 0.48));
      break;
    default:
      break;
  }

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
    if (w.model === 'staff') return { pose: aiming ? RANGED_POSES.staffCast : RANGED_POSES.staffIdle, rate: POSE_RATE.normal };
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

  if (c.fled || c.hiddenBody) {
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

  if (r.dragon) syncDragon(c, r.dragon, dt);

  if (c.dead && r.dragon) {
    // 龍係側身瞓低，唔係好似人咁向後跌
    r.root.rotation.z = (Math.PI / 2) * clamp(c.deadT / 0.9, 0, 1);
  } else if (c.dead) {
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
  const bowUp = w.ranged && c.phase === 'charge' && w.model !== 'javelin' && w.model !== 'staff';
  const armLTarget = shieldUp ? -1.45 : bowUp ? -1.55 : w.hasShield ? -0.75 : -0.5;
  r.armL.rotation.x += (armLTarget - r.armL.rotation.x) * (1 - Math.exp(-POSE_RATE.block * dt));
  r.armL.rotation.y = shieldUp ? -0.75 : bowUp ? 0 : -0.35;

  r.shield.visible = c.hasActiveShield;
  r.marker.visible = !c.dead && !c.def.civilian;
  for (const [id, m] of r.weaponMeshes) m.visible = id === w.id && !c.def.civilian;
  flushParts(r.root, r.parts);
}

function syncDragon(c: Combatant, d: DragonRig, dt: number) {
  if (c.dead) return;
  d.t += dt;
  const speed = Math.hypot(c.vel.x, c.vel.z);
  const flap = 0.3 + Math.sin(d.t * 2.4) * (speed > 1 ? 0.4 : 0.14);
  d.wings[0].rotation.z = flap;
  d.wings[1].rotation.z = -flap;
  d.tail.rotation.y = Math.sin(d.t * 1.6) * 0.3;
  // 蓄力噴息時頸向前伸
  const target = c.phase === 'charge' ? -0.25 : -0.75;
  d.neck.rotation.x += (target - d.neck.rotation.x) * (1 - Math.exp(-5 * dt));
  const amp = clamp(speed / 3, 0, 1) * 0.5;
  d.legs.forEach((leg, i) => {
    leg.rotation.x = Math.sin(c.walkPhase * 0.6 + (i === 0 || i === 3 ? 0 : Math.PI)) * amp;
  });
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
