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
import { crownOf } from '../data/crowns';
import { hover } from './skills';
import { axeGeo, bladeGeo, bowGeo, leafGeo, limbGeo, loftGeo, torsoGeo, wingGeo, type Ring } from './shapes';

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

/** 發光件：唔受光影，巨神眼同裂紋用 */
const shine = (key: string) => `e|${key}`;

function glowEll(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0): THREE.Object3D {
  const node = part(shine('ell'), () => new THREE.SphereGeometry(0.5, 7, 5), color, w, h, d);
  node.position.set(x, y, z);
  return node;
}

/** 金屬件：反光，由鍵頭決定材質 */
const steel = (key: string) => `m|${key}`;

function ell(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0, metal = false): THREE.Object3D {
  const node = part(metal ? steel('ell') : 'ell', () => new THREE.SphereGeometry(0.5, 7, 5), color, w, h, d);
  node.position.set(x, y, z);
  return node;
}

/** 細粒嘢：眼、鼻、扣，面數最少 */
function dot(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0, metal = false): THREE.Object3D {
  const node = part(metal ? steel('dot') : 'dot', () => new THREE.IcosahedronGeometry(0.5, 0), color, w, h, d);
  node.position.set(x, y, z);
  return node;
}

/** 部件喺 rig 入面位置固定：計一次，之後唔使每幀重算 */
function settle() {
  for (const p of ctx.parts) {
    p.node.updateMatrix();
    p.node.matrixAutoUpdate = false;
  }
}

/** 手腳：頂底粗幼唔同嘅圓柱 */
function limb(rTop: number, rBottom: number, h: number, color: number, x = 0, y = 0, z = 0, metal = false): THREE.Object3D {
  const ratio = Math.round((rBottom / rTop) * 10) / 10;
  const key = `limb:${ratio}`;
  const node = part(metal ? steel(key) : key, () => limbGeo(ratio), color, rTop, h, rTop);
  node.position.set(x, y, z);
  return node;
}

function cyl(rTop: number, rBottom: number, h: number, seg: number, color: number, metal = false): THREE.Object3D {
  const ratio = Math.round((rTop / rBottom) * 20) / 20;
  const key = `cyl:${seg}:${ratio}`;
  return part(metal ? steel(key) : key, () => new THREE.CylinderGeometry(ratio, 1, 1, seg), color, rBottom, h, rBottom);
}

function cone(r: number, h: number, seg: number, color: number, metal = false): THREE.Object3D {
  const key = `cone:${seg}`;
  return part(metal ? steel(key) : key, () => new THREE.ConeGeometry(1, 1, seg), color, r, h, r);
}

function ico(r: number, color: number, metal = false): THREE.Object3D {
  const key = 'ico';
  return part(metal ? steel(key) : key, () => new THREE.IcosahedronGeometry(1, 1), color, r, r, r);
}

/** 半球：頭盔、頭髮 */
function dome(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0, metal = false): THREE.Object3D {
  const key = 'dome';
  const node = part(metal ? steel(key) : key, () => new THREE.SphereGeometry(0.5, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), color, w, h, d);
  node.position.set(x, y, z);
  return node;
}

function torsoPart(w: number, h: number, d: number, color: number, y: number, metal = false): THREE.Object3D {
  const node = part(metal ? steel('torso') : 'torso', torsoGeo, color, w, h, d);
  node.position.y = y;
  return node;
}

/** 長形刃：高度向前（Z） */
function edge(key: string, make: () => THREE.BufferGeometry, w: number, t: number, l: number, color: number, z = 0, y = 0): THREE.Object3D {
  const node = part(steel(key), make, color, w, t, l);
  node.position.set(0, y, z);
  return node;
}

function loft(key: string, rings: Ring[], color: number, seg = 9, arc?: [number, number]): THREE.Object3D {
  return part(key, () => loftGeo(rings, seg, arc), color, 1, 1, 1);
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

const GOLD_TRIM = 0x9a7c34;
const LEATHER = 0x4a3324;

function buildWeapon(w: WeaponDef): THREE.Group {
  const g = new THREE.Group();
  ctx.gate = g;
  const L = w.length;
  switch (w.model) {
    case 'sword': {
      const guard = limb(0.022, 0.022, 0.26, GOLD_TRIM, 0, 0, 0.08, true);
      guard.rotation.z = Math.PI / 2;
      const grip = limb(0.02, 0.02, 0.16, LEATHER, 0, 0, -0.03);
      grip.rotation.x = Math.PI / 2;
      g.add(edge('blade', bladeGeo, 0.085, 0.018, L, COLORS.steel, 0.09), guard, grip, ell(0.06, 0.06, 0.06, GOLD_TRIM, 0, 0, -0.13, true));
      break;
    }
    case 'axe': {
      const haft = limb(0.026, 0.03, L, COLORS.wood, 0, 0, L / 2 - 0.25);
      haft.rotation.x = Math.PI / 2;
      const head = edge('axe', axeGeo, 0.36, 0.03, 0.44, COLORS.steel, L - 0.34, 0.06);
      head.rotation.z = Math.PI / 2;
      g.add(haft, head);
      break;
    }
    case 'mace': {
      const haft = limb(0.024, 0.028, L, COLORS.wood, 0, 0, L / 2 - 0.2);
      haft.rotation.x = Math.PI / 2;
      const head = ico(0.1, COLORS.steel, true);
      head.position.z = L - 0.2;
      g.add(haft, head);
      for (const s of [1, -1]) g.add(box(0.03, 0.26, 0.12, COLORS.steel, 0, 0, L - 0.2 + s * 0.04));
      break;
    }
    case 'bow': {
      const arc = part('bow', bowGeo, COLORS.wood, L * 0.5, L * 0.5, L * 0.5);
      arc.position.y = -L * 0.32;
      const string = limb(0.004, 0.004, L * 0.88, 0xe8e0cc, 0, -0.03, 0);
      string.rotation.x = Math.PI / 2;
      g.add(arc, string);
      break;
    }
    case 'staff': {
      const haft = limb(0.022, 0.03, L, COLORS.wood, 0, 0, L / 2 - 0.3);
      haft.rotation.x = Math.PI / 2;
      const orb = ico(0.09, 0xff9a3c);
      orb.position.z = L - 0.25;
      const claw = cone(0.07, 0.16, 5, GOLD_TRIM, true);
      claw.rotation.x = -Math.PI / 2;
      claw.position.z = L - 0.38;
      g.add(haft, orb, claw);
      break;
    }
    case 'crossbow': {
      const stock = limb(0.035, 0.045, L, COLORS.wood, 0, 0, L / 2 - 0.15);
      stock.rotation.x = Math.PI / 2;
      const prod = limb(0.016, 0.03, 0.74, COLORS.steel, 0, 0.03, L - 0.2, true);
      prod.rotation.z = Math.PI / 2;
      g.add(stock, prod);
      break;
    }
    default: {
      const color = w.model === 'lance' ? 0xe8dcc0 : COLORS.wood;
      const shaft = cyl(0.022, 0.034, L, 6, color);
      shaft.rotation.x = Math.PI / 2;
      const back = w.model === 'javelin' ? 0.5 : 0.7;
      shaft.position.z = L / 2 - back;
      g.add(shaft, edge('leaf', leafGeo, 0.11, 0.02, 0.42, COLORS.steel, L - back - 0.05));
      if (w.model === 'lance') {
        const guard = cone(0.1, 0.3, 8, 0xb5362c);
        guard.rotation.x = -Math.PI / 2;
        guard.position.z = 0.26;
        const pennon = box(0.01, 0.2, 0.36, 0xb5362c, 0, -0.1, L - back - 0.55);
        g.add(guard, pennon);
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
        const ear = cone(0.035, 0.2, 5, skin);
        ear.position.set(s * 0.16, 0.86, -0.02);
        ear.rotation.z = -s * 1.2;
        return ear;
      });
      break;
    case 'tusks':
      side((s) => {
        const tusk = cone(0.024, 0.11, 5, 0xf0ead8);
        tusk.position.set(s * 0.065, 0.76, 0.12);
        return tusk;
      });
      break;
    case 'skull':
      side((s) => ell(0.05, 0.055, 0.03, 0x121018, s * 0.05, 0.84, 0.115));
      torso.add(box(0.1, 0.03, 0.02, 0xd8d0b8, 0, 0.75, 0.125));
      break;
    case 'bull':
      torso.add(ell(0.2, 0.15, 0.26, skin, 0, 0.77, 0.13), ell(0.13, 0.08, 0.05, 0x3a2a24, 0, 0.75, 0.26));
      side((s) => {
        const horn = cone(0.055, 0.42, 7, 0xe8dcc0);
        horn.position.set(s * 0.26, 0.98, 0);
        horn.rotation.z = -s * 0.85;
        return horn;
      });
      break;
    case 'snout':
      torso.add(ell(0.15, 0.11, 0.22, skin, 0, 0.78, 0.14), ell(0.06, 0.04, 0.03, 0x241a18, 0, 0.8, 0.25));
      break;
    case 'wings':
      side((s) => {
        const wing = part('wing', wingGeo, skin, s * 0.86, 0.03, 0.7);
        wing.position.set(s * 0.1, 0.62, -0.18);
        wing.rotation.z = s * 0.5;
        return wing;
      });
      break;
    case 'antlers':
      side((s) => {
        const branch = limb(0.018, 0.035, 0.42, 0x5a7a3a, s * 0.14, 1.06, 0);
        branch.rotation.z = -s * 0.5;
        return branch;
      });
      break;
    case 'fins':
      side((s) => ell(0.03, 0.18, 0.16, 0x2d9aa8, s * 0.15, 0.84, 0));
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
  body.add(
    loft('dragonBody', [
      { z: -0.95, y: 0.04, rx: 0.22, ry: 0.22 }, { z: -0.55, y: 0.02, rx: 0.4, ry: 0.4 }, { z: 0.1, y: 0, rx: 0.46, ry: 0.46 },
      { z: 0.75, y: 0.06, rx: 0.42, ry: 0.42 }, { z: 1.2, y: 0.2, rx: 0.22, ry: 0.22 },
    ], skin, 10),
    ell(0.62, 0.2, 1.8, belly, 0, -0.34, 0.1),
  );
  for (let i = 0; i < 6; i++) {
    const spike = cone(0.07, 0.24, 5, dark);
    spike.position.set(0, 0.5 - Math.abs(i - 2) * 0.02, 0.8 - i * 0.34);
    spike.rotation.x = -0.4;
    body.add(spike);
  }

  const neck = new THREE.Group();
  neck.position.set(0, 0.3, 1.1);
  neck.rotation.x = -0.75;
  neck.add(loft('dragonNeck', [{ z: 0, y: 0, rx: 0.24, ry: 0.24 }, { z: 0.5, y: 0.02, rx: 0.18, ry: 0.19 }, { z: 0.95, y: 0.02, rx: 0.15, ry: 0.15 }], skin));
  const head = new THREE.Group();
  head.position.set(0, 0, 0.92);
  head.rotation.x = 0.8;
  head.add(
    loft('dragonHead', [{ z: -0.1, y: 0, rx: 0.17, ry: 0.15 }, { z: 0.2, y: 0.02, rx: 0.2, ry: 0.15 }, { z: 0.5, y: -0.03, rx: 0.13, ry: 0.09 }, { z: 0.78, y: -0.05, rx: 0.07, ry: 0.05 }], skin),
    ell(0.22, 0.05, 0.56, belly, 0, -0.14, 0.42),
  );
  for (const s of [1, -1]) {
    const horn = cone(0.05, 0.46, 7, 0xe8dcc0);
    horn.position.set(s * 0.13, 0.24, -0.18);
    horn.rotation.x = -1;
    head.add(horn, ell(0.06, 0.05, 0.05, 0xf2c14e, s * 0.15, 0.08, 0.22));
  }
  neck.add(head);
  body.add(neck);

  const tail = new THREE.Group();
  tail.position.set(0, 0.06, -0.85);
  tail.rotation.x = 0.16;
  tail.add(loft('dragonTail', [{ z: 0.1, y: 0, rx: 0.24, ry: 0.24 }, { z: -0.7, y: -0.02, rx: 0.16, ry: 0.16 }, { z: -1.5, y: -0.04, rx: 0.09, ry: 0.09 }, { z: -2.1, y: -0.05, rx: 0.03, ry: 0.03 }], skin));
  const tip = cone(0.16, 0.42, 4, dark);
  tip.position.set(0, -0.05, -2.2);
  tip.rotation.x = -Math.PI / 2;
  tail.add(tip);
  body.add(tail);

  const wings = [1, -1].map((s) => {
    const wing = new THREE.Group();
    wing.position.set(s * 0.36, 0.34, 0.35);
    const web = part('wing', wingGeo, dark, s * 2.3, 0.04, 2.1);
    wing.add(web);
    body.add(wing);
    return wing;
  });

  const legs = [[1, 0.72], [-1, 0.72], [1, -0.62], [-1, -0.62]].map(([s, z]) => {
    const leg = new THREE.Group();
    leg.position.set(s * 0.42, -0.2, z);
    leg.add(limb(0.17, 0.12, 0.42, skin, 0, -0.22, 0), limb(0.11, 0.09, 0.34, skin, 0, -0.58, 0), ell(0.26, 0.09, 0.42, dark, 0, -0.82, 0.08));
    body.add(leg);
    return leg;
  });
  return { wings, legs, neck, tail, t: 0 };
}

const crownColor = (def: UnitDef) => crownOf(def.crown)?.color ?? TEAM_STYLES[0].body;
const giantLook2 = (def: UnitDef) => (GIANT_LOOK[def.id] ?? GIANT_DEFAULT).hi;

/** 冠位角色頭飾：跟劇本同冠位類別 */
function crownGear(def: UnitDef): HeadGear | null {
  const c = crownOf(def.crown);
  if (!c) return null;
  if (['threekingdoms', 'fivedynasties', 'xiyou', 'fengshen', 'shenhua', 'jianghu', 'maoshan', 'xianxia', 'tianjie'].includes(c.scenario)) {
    return c.cls === '智略' || c.cls === '魔導' ? 'topknot' : null;
  }
  if (c.scenario === 'rome' || c.scenario === 'greek') return 'crest';
  if (c.scenario === 'biocity') return 'none';
  return null;
}

/** 種族體型同盔甲色：同隊都一眼分到邊族 */
const RACE_BUILD: Partial<Record<string, { wide: number; iron: number }>> = {
  dwarf: { wide: 1.3, iron: 0xb08a4a }, orc: { wide: 1.22, iron: 0x6a5a48 }, ogre: { wide: 1.4, iron: 0x6a5a48 }, goblin: { wide: 0.85, iron: 0x7a7050 },
  elf: { wide: 0.88, iron: 0xc8d8b0 }, darkelf: { wide: 0.88, iron: 0x3a3050 }, undead: { wide: 0.82, iron: 0x4a4650 }, demon: { wide: 1.12, iron: 0x3a2028 },
  vampire: { wide: 0.9, iron: 0x3a1a28 }, nord: { wide: 1.14, iron: 0x9a9080 }, minotaur: { wide: 1.3, iron: 0x5a4a3a }, lizard: { wide: 1.02, iron: 0x4a6a58 },
  giant: { wide: 1.3, iron: 0x5a5048 }, golem: { wide: 1.45, iron: 0x7c7f88 }, psionic: { wide: 0.95, iron: 0xd8b860 }, treant: { wide: 1.3, iron: 0x4a3a24 },
  beastkin: { wide: 1, iron: 0x8a6a48 }, werewolf: { wide: 1.2, iron: 0x4a4038 }, fairy: { wide: 0.8, iron: 0xd8c8f0 }, swarm: { wide: 1.05, iron: 0x4a2a5a },
};

export type HeadGear = 'douli' | 'crest' | 'visor' | 'none' | 'qing' | 'monk' | 'topknot' | 'laurel';

/** 兵種頭飾：東方斗笠、羅馬橫冠、科幻面罩等 */
const HEAD_GEAR: Record<string, HeadGear> = {
  dao_guard: 'douli', ya_guard: 'douli', biao_shi: 'douli', dao_tong: 'topknot', dao_zhang: 'topknot', sword_cultivator: 'topknot', jian_ke: 'topknot', yin_wei: 'douli',
  wu_seng: 'monk', tian_bing: 'crest', tian_jiang: 'crest', jin_jia: 'crest', legionary: 'crest', hoplite: 'crest', auxilia: 'crest',
  marine_trooper: 'visor', flame_trooper: 'visor', zombie: 'none', zombie_runner: 'none', zombie_brute: 'none', jiangshi: 'qing', nv_gui: 'none', wang_hun: 'none',
};

function buildGear(torso: THREE.Group, gear: HeadGear, color: number) {
  switch (gear) {
    case 'douli': {
      const hat = cone(0.3, 0.14, 10, 0xc8a868);
      hat.position.y = 0.97;
      torso.add(hat);
      break;
    }
    case 'crest': {
      torso.add(dome(0.29, 0.25, 0.31, color, 0, 0.885, 0, true));
      const crest = ell(0.42, 0.13, 0.05, 0xc8342c, 0, 1.03, 0);
      torso.add(crest);
      break;
    }
    case 'visor':
      torso.add(dome(0.32, 0.3, 0.34, 0x3a4250, 0, 0.87, 0, true), glowEll(0.2, 0.05, 0.03, 0x6af0ff, 0, 0.84, 0.13));
      break;
    case 'qing': {
      const brim = cyl(0.2, 0.22, 0.05, 10, 0x1c1a2a);
      brim.position.y = 0.94;
      const top = cyl(0.13, 0.15, 0.13, 10, 0x2a2840);
      top.position.y = 1.02;
      torso.add(brim, top, box(0.1, 0.22, 0.01, 0xf0d850, 0, 0.82, 0.135));
      break;
    }
    case 'topknot':
      torso.add(ell(0.11, 0.12, 0.11, 0x1c1a1e, 0, 1.02, -0.02), box(0.16, 0.02, 0.02, 0xd8c048, 0, 1.03, -0.02));
      break;
    case 'monk':
      break;
    default:
      break;
  }
}

/** 巨神造型：分神將、魔神、石巨人、屍王 */
const GIANT_LOOK: Record<string, { hi: number; iron: number; glow: number; halo: boolean }> = {
  boss_lightgod: { hi: 0xf0e8d0, iron: 0xd8b860, glow: 0xfff0a0, halo: true },
  boss_asura: { hi: 0xc8502e, iron: 0xc89a40, glow: 0xffd86a, halo: true },
  boss_tongtian: { hi: 0x8a8ac8, iron: 0x3a3a70, glow: 0x9ae0ff, halo: true },
  boss_gonggong: { hi: 0x2f7a8a, iron: 0x1c3a4a, glow: 0x7af0ff, halo: false },
  boss_kronos: { hi: 0x7a7468, iron: 0x3a3630, glow: 0xff8a2a, halo: false },
  boss_cyclops: { hi: 0x9a7a58, iron: 0x4a3a2a, glow: 0xffc84a, halo: false },
  boss_jiangwang: { hi: 0x5a6a68, iron: 0x1c1a2a, glow: 0x7af0a0, halo: false },
  boss_blood: { hi: 0x7a1a24, iron: 0x2a0e14, glow: 0xff3a2a, halo: false },
};
const GIANT_DEFAULT = { hi: 0x6a2a28, iron: 0x241c24, glow: 0xff7a2a, halo: false };

/** 巨神額外部件：胸核、裂紋、肩刺、光環 */
function addGiantParts(torso: THREE.Group, def: UnitDef) {
  const look = GIANT_LOOK[def.id] ?? GIANT_DEFAULT;
  torso.add(glowEll(0.15, 0.15, 0.08, look.glow, 0, 0.44, 0.15));
  for (const s of [1, -1]) {
    // 胸前裂紋
    const seam = glowEll(0.022, 0.42, 0.02, look.glow, s * 0.1, 0.24, 0.14);
    seam.rotation.z = s * 0.3;
    torso.add(seam);
    // 肩甲
    torso.add(ell(0.34, 0.26, 0.34, look.iron, s * 0.31, 0.6, 0, true));
    for (let i = 0; i < 3; i++) {
      const spike = cone(0.05, 0.3, 6, 0x141014);
      spike.position.set(s * (0.26 + i * 0.08), 0.76 - i * 0.02, -0.06 + i * 0.06);
      spike.rotation.z = -s * (0.2 + i * 0.25);
      torso.add(spike);
    }
    torso.add(glowEll(0.05, 0.035, 0.03, look.glow, s * 0.055, 0.85, 0.125));
    const horn = cone(0.07, 0.62, 7, 0x141014);
    horn.position.set(s * 0.17, 1.14, -0.04);
    horn.rotation.z = -s * 0.45;
    torso.add(horn);
  }
  // 胸甲同破披風
  torso.add(torsoPart(0.6, 0.6, 0.38, look.iron, 0.32, true));
  const cape = limb(0.24, 0.3, 0.95, 0x220e12, 0, 0.2, -0.26);
  cape.scale.z *= 0.1;
  cape.rotation.x = 0.1;
  torso.add(cape);
  if (look.halo) {
    const halo = part(shine('ring'), () => new THREE.TorusGeometry(1, 0.05, 5, 24), look.glow, 0.42, 0.42, 0.42);
    halo.position.set(0, 0.92, -0.26);
    torso.add(halo);
  }
}

/** 由 id 計個固定數，同一兵種外觀一樣，唔同兵種有變化 */
function hashOf(id: string): number {
  let h = 7;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

const HAIR = [0x2a2018, 0x4a3020, 0x6a4a28, 0x1c1a1e, 0x8a6a3a, 0x7a7a78];

/** 頭：面、眼、鼻，再加髮或者鬚 */
function buildHead(torso: THREE.Group, def: UnitDef, skin: number, look: RaceLook) {
  const h = hashOf(def.id);
  torso.add(limb(0.06, 0.07, 0.1, skin, 0, 0.66, 0));
  torso.add(ell(0.235, 0.285, 0.26, skin, 0, 0.82, 0));
  if (look === 'skull' || look === 'bull') return;
  const eye = 0x16130f;
  for (const s of [1, -1]) torso.add(dot(0.032, 0.026, 0.02, eye, s * 0.05, 0.84, 0.118));
  torso.add(dot(0.035, 0.05, 0.05, skin, 0, 0.8, 0.13));
  const hair = HAIR[h % HAIR.length];
  torso.add(dome(0.26, 0.2, 0.28, hair, 0, 0.87, -0.012));
  if (h % 3 === 0) torso.add(ell(0.17, 0.14, 0.12, hair, 0, 0.74, 0.07));
}

/** 頭盔：按兵階分布帽、鐵笠同全盔 */
function buildHelmet(torso: THREE.Group, def: UnitDef, color: number, crest: 'plume' | 'horns', crestColor: number) {
  const tier = def.tier;
  const metal = tier >= 3 || def.role !== 'archer';
  if (def.role === 'mage') {
    torso.add(dome(0.34, 0.26, 0.34, def.trimColor, 0, 0.88, -0.01));
    const tip = cone(0.15, 0.34, 8, def.trimColor);
    tip.position.set(0, 1.08, -0.03);
    tip.rotation.x = -0.18;
    torso.add(tip);
    return;
  }
  torso.add(dome(0.29, 0.25, 0.31, color, 0, 0.885, 0, metal));
  if (tier <= 2) {
    const brim = cyl(0.21, 0.23, 0.02, 12, color, metal);
    brim.position.y = 0.875;
    torso.add(brim);
  } else {
    torso.add(box(0.025, 0.14, 0.02, color, 0, 0.81, 0.135));
    for (const s of [1, -1]) torso.add(ell(0.05, 0.13, 0.1, color, s * 0.125, 0.8, 0.02, true));
  }
  if (tier < 3) return;
  if (crest === 'plume') {
    const plume = ell(0.05, 0.2, 0.34, crestColor, 0, 1.05, -0.05);
    plume.rotation.x = -0.3;
    torso.add(plume);
  } else {
    for (const s of [1, -1]) {
      const h = cone(0.04, 0.28, 7, crestColor);
      h.position.set(s * 0.18, 1.02, 0);
      h.rotation.z = -s * 0.6;
      torso.add(h);
    }
  }
}

export function buildHuman(def: UnitDef, team: number, weapons: WeaponDef[], batches: Batches): HumanRig {
  ctx = { batches, parts: [], gate: null };
  const style = TEAM_STYLES[team];
  const race = RACES[def.race ?? 'human'];
  // 巨神唔著軍服：皮膚當身體，配暗鐵
  const titanSkin = def.skin ?? race.skin;
  const bodyColor = def.colossal ? giantLook2(def) : def.crown ? crownColor(def) : def.civilian ? def.trimColor : style.body;
  const build = RACE_BUILD[def.race ?? 'human'];
  const giantLook = GIANT_LOOK[def.id] ?? GIANT_DEFAULT;
  const iron = def.colossal ? giantLook.iron : build?.iron ?? COLORS.steel;
  const legColor = def.colossal ? titanSkin : style.legs;
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';
  root.scale.setScalar(race.scale * (def.hero ? 1.14 : 1) * (def.scale ?? 1));
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  root.add(hips);
  // 體型：矮人闊、精靈瘦；巨神特別粗壯
  hips.scale.x = (def.colossal ? 1.3 : 1) * (build?.wide ?? 1);
  hips.scale.z = def.colossal ? 1.25 : 1;
  const armored = !def.civilian && def.tier >= 3 && def.role !== 'mage';
  const robed = def.role === 'mage' || !!def.civilian;
  const skin = def.skin ?? race.skin;

  const torso = new THREE.Group();
  hips.add(torso);
  torso.add(torsoPart(0.5, 0.66, 0.31, armored ? iron : bodyColor, 0.3, armored));
  // 罩袍同腰帶：隊色喺呢度
  if (armored) torso.add(torsoPart(0.44, 0.5, 0.33, bodyColor, 0.22));
  const belt = cyl(0.2, 0.2, 0.07, 10, LEATHER);
  belt.position.y = 0.04;
  belt.scale.z *= 0.72;
  torso.add(belt, dot(0.08, 0.07, 0.04, GOLD_TRIM, 0, 0.04, 0.14, true));
  const skirt = cyl(0.2, robed ? 0.34 : 0.28, robed ? 0.86 : 0.36, 10, def.colossal ? giantLook.iron : robed ? bodyColor : def.trimColor);
  skirt.position.y = robed ? -0.42 : -0.16;
  skirt.scale.z *= 0.74;
  torso.add(skirt);
  if (def.race === 'centaur') skirt.scale.setScalar(0.001);
  for (const s of [1, -1]) torso.add(ell(0.19, 0.15, 0.2, armored ? iron : bodyColor, s * 0.27, 0.56, 0, armored));

  buildHead(torso, def, skin, race.look);
  addRaceFeatures(torso, race.look, skin);
  const gear = HEAD_GEAR[def.id] ?? crownGear(def);
  if (def.colossal) addGiantParts(torso, def);
  else if (gear) buildGear(torso, gear, style.helmet);
  else if (race.look !== 'bull' && !def.civilian) buildHelmet(torso, def, style.helmet, style.crest, def.plumeColor ?? style.crestColor);

  // 背旗：只有英雄同精銳，遠處認得出邊個帶隊
  if (!def.civilian && (def.hero || def.tier >= 5)) {
    torso.add(limb(0.014, 0.014, 1.25, COLORS.wood, 0.08, 1, -0.2));
    torso.add(box(0.015, 0.42, 0.42, def.plumeColor ?? style.body, 0.08, 1.38, -0.42));
  }

  if (def.role === 'archer' && !def.civilian) {
    const quiver = limb(0.06, 0.05, 0.5, LEATHER, -0.1, 0.32, -0.19);
    quiver.rotation.z = -0.25;
    torso.add(quiver);
  }

  if (def.hero) {
    const cape = limb(0.2, 0.3, 0.95, def.trimColor, 0, 0.1, -0.19);
    cape.scale.z *= 0.1;
    cape.rotation.x = 0.14;
    torso.add(cape);
  }

  const arm = (x: number) => {
    const a = new THREE.Group();
    a.rotation.order = 'YXZ';
    a.position.set(x, 0.57, 0);
    const fore = armored ? iron : skin;
    a.add(limb(0.072, 0.06, 0.34, bodyColor, 0, -0.14, 0), ell(0.095, 0.095, 0.095, armored ? iron : bodyColor, 0, -0.29, 0, armored));
    a.add(limb(0.056, 0.045, 0.3, fore, 0, -0.41, 0, armored), ell(0.09, 0.1, 0.09, armored ? 0x55504a : skin, 0, -0.55, 0));
    return a;
  };

  const armR = arm(-0.3);
  const wrist = new THREE.Group();
  wrist.position.y = -0.56;
  armR.add(wrist);
  torso.add(armR);

  const armL = arm(0.3);
  const gripL = new THREE.Group();
  gripL.position.y = -0.56;
  armL.add(gripL);
  torso.add(armL);

  const shield = new THREE.Group();
  ctx.gate = shield;
  const face = cyl(0.42, 0.42, 0.04, 14, style.shield);
  face.rotation.z = Math.PI / 2;
  const rim = part('ring', () => new THREE.TorusGeometry(1, 0.05, 5, 16), iron, 0.42, 0.42, 0.42);
  rim.rotation.y = Math.PI / 2;
  const inner = cyl(0.26, 0.26, 0.045, 14, def.trimColor);
  inner.rotation.z = Math.PI / 2;
  const boss = ell(0.08, 0.22, 0.22, iron, 0.03, 0, 0, true);
  shield.add(face, rim, inner, boss);
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
    upper.add(limb(0.1, 0.075, 0.5, legColor, 0, -0.22, 0));
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    const shin = armored ? iron : LEATHER;
    knee.add(ell(0.12, 0.12, 0.13, shin, 0, 0, 0.01, armored), limb(0.07, 0.056, 0.48, shin, 0, -0.22, 0, armored), ell(0.13, 0.09, 0.27, 0x2c2622, 0, -0.45, 0.05));
    upper.add(knee);
    hips.add(upper);
    return [upper, knee] as const;
  };
  const [legL, kneeL] = leg(0.12);
  const [legR, kneeR] = leg(-0.12);
  // 半人馬冇人腳；龍同史萊姆連上身都收埋，換成自己嘅身體
  if (def.race === 'centaur' || def.race === 'dragon' || def.race === 'slime') {
    legL.scale.setScalar(0.001);
    legR.scale.setScalar(0.001);
  }
  if (def.race === 'slime') {
    torso.scale.setScalar(0.001);
    const blob = ell(1.24, 1.02, 1.24, skin, 0, -0.42, 0);
    hips.add(blob);
    for (const s of [1, -1]) hips.add(ell(0.1, 0.15, 0.05, 0x10202c, s * 0.2, -0.3, 0.56));
  }
  let dragon: DragonRig | undefined;
  if (def.race === 'dragon') {
    torso.scale.setScalar(0.001);
    dragon = buildDragon(hips, def.skin ?? race.skin);
  }

  // 頭頂標記：英雄用金色，細細粒唔搶畫面
  const marker = new THREE.Group();
  ctx.gate = marker;
  const tip = cone(0.09, 0.18, 4, def.hero ? 0xffd34d : style.marker);
  tip.rotation.x = Math.PI;
  tip.position.y = 2.45;
  marker.add(tip);
  ctx.gate = null;
  root.add(marker);

  return {
    root, hips, torso, armR, wrist, armL, gripL, legL, legR, kneeL, kneeR, weaponMeshes, shield, marker,
    pose: { ...IDLE_POSE }, parts: (settle(), ctx.parts), dragon,
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

/** 馬身：胸深腰收，後腿肌肉隆起 */
const HORSE_BODY: Ring[] = [
  { z: -1.08, y: 0.06, rx: 0.1, ry: 0.12 }, { z: -0.92, y: 0.06, rx: 0.27, ry: 0.32 }, { z: -0.62, y: 0.05, rx: 0.34, ry: 0.4 },
  { z: -0.2, y: 0.03, rx: 0.3, ry: 0.35 }, { z: 0.25, y: 0, rx: 0.31, ry: 0.37 }, { z: 0.7, y: 0.02, rx: 0.3, ry: 0.4 },
  { z: 1.0, y: 0.1, rx: 0.22, ry: 0.3 }, { z: 1.18, y: 0.2, rx: 0.08, ry: 0.1 },
];
const HORSE_NECK: Ring[] = [{ z: -0.12, y: -0.04, rx: 0.17, ry: 0.28 }, { z: 0.35, y: 0, rx: 0.13, ry: 0.22 }, { z: 0.8, y: 0.02, rx: 0.1, ry: 0.15 }, { z: 1.02, y: 0.02, rx: 0.09, ry: 0.12 }];
const HORSE_HEAD: Ring[] = [{ z: -0.1, y: 0.02, rx: 0.08, ry: 0.11 }, { z: 0.08, y: 0, rx: 0.115, ry: 0.15 }, { z: 0.36, y: -0.03, rx: 0.09, ry: 0.11 }, { z: 0.6, y: -0.05, rx: 0.08, ry: 0.085 }, { z: 0.7, y: -0.05, rx: 0.04, ry: 0.04 }];
const BLANKET: Ring[] = [{ z: -0.62, y: 0.05, rx: 0.36, ry: 0.42 }, { z: -0.2, y: 0.03, rx: 0.325, ry: 0.375 }, { z: 0.3, y: 0, rx: 0.335, ry: 0.395 }];
const BARD: Ring[] = [{ z: -0.95, y: 0.05, rx: 0.33, ry: 0.38 }, { z: -0.62, y: 0.05, rx: 0.37, ry: 0.43 }, { z: -0.2, y: 0.03, rx: 0.33, ry: 0.38 }, { z: 0.25, y: 0, rx: 0.34, ry: 0.4 }, { z: 0.75, y: 0.02, rx: 0.33, ry: 0.43 }, { z: 1.02, y: 0.1, rx: 0.25, ry: 0.33 }];

/** 唔同坐騎身形：闊、高、長、腳長 */
const MOUNT_SHAPE: Record<string, { w: number; h: number; l: number; legs?: number }> = {
  wolf: { w: 0.8, h: 0.8, l: 0.82, legs: 0.72 }, dire_wolf: { w: 0.85, h: 0.82, l: 0.86, legs: 0.74 }, tiger: { w: 0.92, h: 0.78, l: 1, legs: 0.7 },
  rhino: { w: 1.5, h: 1.2, l: 1.08, legs: 0.74 }, buffalo: { w: 1.3, h: 1.05, l: 1, legs: 0.8 }, camel: { w: 0.85, h: 1.05, l: 1.02, legs: 1.2 }, elk: { w: 0.8, h: 0.95, l: 0.92, legs: 1.15 },
  drake: { w: 1.1, h: 0.88, l: 1.18, legs: 0.68 }, griffin_mount: { w: 1.05, h: 1, l: 1, legs: 0.86 }, steppe: { w: 0.9, h: 0.95, l: 0.95 }, warhorse: { w: 1.1, h: 1.08, l: 1.05 }, pack: { w: 1.1, h: 0.92, l: 0.92, legs: 0.86 },
};

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

  const shape = MOUNT_SHAPE[def.id];
  if (shape) body.scale.set(shape.w, shape.h, shape.l);
  body.add(loft('horseBody', HORSE_BODY, c, 11));
  // 鞍具：鞍毯只包上半身
  body.add(loft('blanket', BLANKET, cloth, 10, [-0.45, Math.PI + 0.45]));
  body.add(ell(0.34, 0.14, 0.62, 0x5b2b22, 0, 0.42, -0.1), ell(0.3, 0.16, 0.12, 0x4a2219, 0, 0.47, 0.2), ell(0.3, 0.2, 0.1, 0x4a2219, 0, 0.49, -0.4));
  if (def.barded) body.add(loft('barding', BARD, cloth, 11));

  const neck = new THREE.Group();
  neck.position.set(0, 0.2, 0.95);
  neck.rotation.x = -0.72;
  neck.add(loft('horseNeck', HORSE_NECK, c));
  // 鬃毛
  neck.add(ell(0.07, 0.2, 1.12, dark, 0, 0.21, 0.36));
  const head = new THREE.Group();
  head.position.set(0, 0.05, 0.92);
  head.rotation.x = 1.15;
  head.add(loft('horseHead', HORSE_HEAD, c));
  for (const s of [1, -1]) {
    const ear = cone(0.035, 0.15, 5, c);
    ear.position.set(s * 0.07, 0.19, -0.05);
    head.add(ear, ell(0.03, 0.035, 0.03, 0x0e0c0a, s * 0.105, 0.05, 0.12));
  }
  head.add(ell(0.12, 0.09, 0.05, dark, 0, -0.04, 0.68));
  neck.add(head);
  body.add(neck);

  switch (def.look) {
    case 'wings':
      for (const s of [1, -1]) {
        const wing = part('wing', wingGeo, c, s * 1.9, 0.04, 1.3);
        wing.position.set(s * 0.26, 0.42, 0.2);
        wing.rotation.z = s * 0.35;
        body.add(wing);
      }
      break;
    case 'horn': {
      const horn = cone(0.045, 0.55, 8, 0xf0e0a0);
      horn.position.set(0, 0.28, 0.2);
      horn.rotation.x = 0.8;
      head.add(horn);
      break;
    }
    case 'antlers':
      for (const s of [1, -1]) {
        const antler = limb(0.015, 0.035, 0.6, 0xd8c8a0, s * 0.2, 0.36, -0.05);
        antler.rotation.z = -s * 0.5;
        head.add(antler);
      }
      break;
    case 'tusk': {
      const tusk = cone(0.09, 0.4, 8, 0xe8dcc0);
      tusk.position.set(0, 0.12, 0.5);
      tusk.rotation.x = 0.5;
      head.add(tusk);
      break;
    }
    case 'hump':
      body.add(ell(0.5, 0.42, 0.62, c, 0, 0.46, 0.48));
      break;
    default:
      break;
  }

  const tail = new THREE.Group();
  tail.position.set(0, 0.24, -1.05);
  tail.rotation.x = 0.5;
  tail.add(limb(0.05, 0.1, 0.72, dark, 0, -0.38, 0));
  body.add(tail);

  const legs: HorseRig['legs'] = [];
  const leg = (x: number, z: number, offset: number) => {
    const upper = new THREE.Group();
    upper.position.set(x, -0.2, z);
    upper.add(limb(0.12, 0.07, 0.4, c, 0, -0.24, 0));
    const lower = new THREE.Group();
    lower.position.y = -0.5;
    lower.add(ell(0.13, 0.13, 0.13, c), limb(0.05, 0.05, 0.34, c, 0, -0.21, 0), ell(0.11, 0.09, 0.11, c, 0, -0.4, 0));
    const hoof = cyl(0.06, 0.08, 0.09, 8, dark);
    hoof.position.set(0, -0.47, 0.01);
    lower.add(hoof);
    upper.add(lower);
    body.add(upper);
    legs.push({ upper, lower, offset });
  };
  leg(0.2, 0.8, 0);
  leg(-0.2, 0.8, 0.55);
  leg(0.2, -0.8, 3.0);
  leg(-0.2, -0.8, 3.6);
  // 懸浮載具：收埋頭同腳，加噴射口同機鼻
  if (shape?.legs) for (const l of legs) l.upper.scale.y = shape.legs;
  switch (def.id) {
    case 'dire_wolf':
    case 'wolf':
      tail.scale.set(2.2, 0.9, 2.2);
      head.add(cone(0.12, 0.36, 6, c).translateZ(0.5));
      break;
    case 'tiger':
      for (let i = 0; i < 6; i++) body.add(box(0.66, 0.5, 0.05, 0x241c14, 0, 0.14, -0.8 + i * 0.32));
      break;
    case 'griffin_mount': {
      // 鷹頭：尖喙同羽冠
      const beak = cone(0.09, 0.3, 6, 0xe0b040);
      beak.position.set(0, -0.08, 0.72);
      beak.rotation.x = 1.9;
      head.add(beak, ell(0.3, 0.22, 0.4, 0xf0ece0, 0, 0.02, 0.1));
      break;
    }
    case 'nightmare':
      // 鬃毛同馬尾燒緊
      neck.add(glowEll(0.1, 0.26, 1.16, 0x9a4af0, 0, 0.24, 0.36));
      tail.add(glowEll(0.2, 0.8, 0.2, 0x9a4af0, 0, -0.38, 0));
      break;
    case 'buffalo':
      for (const s of [1, -1]) {
        const horn = cone(0.05, 0.5, 6, 0xd8ccb0);
        horn.position.set(s * 0.26, 0.12, 0);
        horn.rotation.z = -s * 1.3;
        head.add(horn);
      }
      break;
    case 'seahorse':
      for (const s of [1, -1]) body.add(ell(0.05, 0.4, 0.6, 0x2d9aa8, s * 0.3, 0.1, 0.5));
      break;
    default:
      break;
  }
  if (def.look === 'hover') {
    for (const l of legs) l.upper.scale.setScalar(0.001);
    neck.scale.setScalar(0.001);
    tail.scale.setScalar(0.001);
    body.add(box(0.5, 0.3, 0.9, c, 0, -0.06, 1.1), box(0.9, 0.12, 0.3, 0x3a3f48, 0, -0.34, 0.6), box(0.9, 0.12, 0.3, 0x3a3f48, 0, -0.34, -0.7));
    body.add(box(0.26, 0.26, 0.2, 0x8fe0ff, 0.2, 0, -1.18), box(0.26, 0.26, 0.2, 0x8fe0ff, -0.2, 0, -1.18));
  }

  settle();
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
    c.skin?.sync(c, dt);
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
    // 巨神步幅大，腳郁得慢先有重量感
    c.walkPhase += (speed * WALK_PHASE_PER_METER * dt) / (c.def.colossal ? (c.def.scale ?? 1) * 1.6 : 1);
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
    const fall = clamp(c.deadT / (c.def.colossal ? 2.6 : 0.5), 0, 1);
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
  if (c.climbing && !c.dead) {
    // 爬梯：身向前傾，雙手交替
    const s = Math.sin(c.pos.y * 3);
    r.root.rotation.x = 0.35;
    r.armR.rotation.set(-2.5 + s * 0.5, 0, 0);
    r.armL.rotation.set(-2.5 - s * 0.5, 0, 0);
    r.legL.rotation.set(-0.6 + s * 0.5, 0, 0);
    r.legR.rotation.set(-0.6 - s * 0.5, 0, 0);
  }
  r.root.position.y += hover(c);
  r.marker.visible = !c.dead && !c.def.civilian && !c.def.colossal;
  for (const [id, m] of r.weaponMeshes) m.visible = id === w.id && !c.def.civilian;
  // 有骨架模型：舊 rig 繼續計位，只畫頭頂標記
  flushParts(r.root, r.parts, false, c.skin ? r.marker : undefined);
  c.skin?.sync(c, dt);
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
    flushParts(r.root, r.parts, !!h.skin);
    h.skin?.sync(h, dt);
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
  flushParts(r.root, r.parts, !!h.skin);
  h.skin?.sync(h, dt);
}
