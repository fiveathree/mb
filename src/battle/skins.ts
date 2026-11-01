import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshoptSimplifier } from 'meshoptimizer';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { Combatant, Horse } from './entities';
import { FAMILY_CLIPS, type SkinFamily, type SkinLook } from '../data/skins';

/** CC0 骨架模型：近鏡每人一隻 SkinnedMesh，遠鏡用預烤姿勢嘅 InstancedMesh */
const HUMAN_HEIGHT = 1.9;
const MOUNT_LENGTH = 2.6;
/** 騎馬時腳部同馬鞍嘅高度修正 */
const RIDER_DROP = -0.42;
const FADE = 0.14;
const CROWD_CAPACITY = 160;
const SKIN_TONE = 0xe0b48c;
const LIFT = 0.7;
const LIFT_GAIN = 1.25;

const BASE = `${import.meta.env.BASE_URL}models/`;
const LOWER = /^(root|hips|upperleg|lowerleg|foot|toes|kneeIK|control-|heelIK|IK-|pelvis|thigh|calf|ball)/;

const flat = new THREE.MeshLambertMaterial({ vertexColors: true });
const ATLAS_SIZE = 1024;
const FAR_TRIS = 1400;
const WHITE = new THREE.Color(0xffffff);
const atlases = new Map<string, THREE.Texture>();
/** 農民服裝冇頭，用基礎人物抽出嚟嘅頭 */
const HEAD_OF: Record<string, string> = { h_MP: 'h_HeadM', h_FP: 'h_HeadF' };

interface Template {
  key: string;
  root: THREE.Object3D;
  scale: number;
  family: SkinFamily;
  clips: Map<string, THREE.AnimationClip>;
  sphere: THREE.Sphere;
}

function plain(a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, Ctor: typeof Float32Array | typeof Uint16Array, size = a.itemSize): THREE.BufferAttribute {
  const out = new Ctor(a.count * size);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < size; k++) out[i * size + k] = a.getComponent(i, k);
  return new THREE.BufferAttribute(out, size);
}

function solid(g: THREE.BufferGeometry, color: THREE.Color) {
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([color.r, color.g, color.b], i * 3);
  return new THREE.BufferAttribute(c, 3);
}

/** 按物料併埋：冇貼圖嘅轉做頂點色，令一個人只係一兩個 draw call */
/** 原檔顏色配強燈，喺呢個場景太暗：提亮；皮膚統一自然膚色 */
function shade(mat: THREE.MeshStandardMaterial, file: string) {
  if (mat.name === 'Skin' && !/Goblin|Zombie/.test(file)) return new THREE.Color(SKIN_TONE);
  const c = mat.color;
  return new THREE.Color(Math.min(1, c.r ** LIFT * LIFT_GAIN), Math.min(1, c.g ** LIFT * LIFT_GAIN), Math.min(1, c.b ** LIFT * LIFT_GAIN));
}

function bake(scene: THREE.Object3D, look: SkinLook): THREE.Object3D {
  const file = look.file;
  scene.updateMatrixWorld(true);
  const skinned: THREE.SkinnedMesh[] = [];
  const statics: THREE.Mesh[] = [];
  scene.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned.push(o as THREE.SkinnedMesh);
    else if ((o as THREE.Mesh).isMesh) statics.push(o as THREE.Mesh);
  });
  const skeleton = skinned[0].skeleton;
  const groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const add = (m: THREE.Material, g: THREE.BufferGeometry) => groups.set(m, [...(groups.get(m) ?? []), g]);
  for (const s of [...skinned, ...statics]) {
    const src = s.geometry;
    const mat = s.material as THREE.MeshStandardMaterial;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', plain(src.getAttribute('position'), Float32Array));
    g.setAttribute('normal', plain(src.getAttribute('normal'), Float32Array));
    if (mat.map) g.setAttribute('uv', plain(src.getAttribute('uv'), Float32Array));
    else g.setAttribute('color', solid(g, shade(mat, file)));
    g.setIndex(new THREE.BufferAttribute(Uint32Array.from(src.index!.array), 1));
    if ((s as THREE.SkinnedMesh).isSkinnedMesh) {
      g.setAttribute('skinIndex', plain(src.getAttribute('skinIndex'), Uint16Array));
      g.setAttribute('skinWeight', plain(src.getAttribute('skinWeight'), Float32Array));
    } else {
      const bone = skeleton.bones.indexOf(s.parent as THREE.Bone);
      if (bone < 0) continue;
      g.applyMatrix4(new THREE.Matrix4().copy(skeleton.boneInverses[bone]).invert().multiply(s.matrix));
      const n = g.getAttribute('position').count;
      const idx = new Uint16Array(n * 4);
      const wgt = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) {
        idx[i * 4] = bone;
        wgt[i * 4] = 1;
      }
      g.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(wgt, 4));
    }
    mat.vertexColors = false;
    add(mat.map ? mat : flat, g);
  }
  // 頭同頭髮同一副骨架，直接當身體一部分
  const extras = [HEAD_OF[file], look.hair].flatMap((n) => (n && raw.get(n) ? [raw.get(n)!.scene] : []));
  for (const part of extras) part.traverse((o) => {
    const h = o as THREE.SkinnedMesh;
    if (!h.isSkinnedMesh) return;
    (h.material as THREE.MeshStandardMaterial).vertexColors = false;
    const g = new THREE.BufferGeometry();
    for (const [k, C] of [['position', Float32Array], ['normal', Float32Array], ['uv', Float32Array], ['skinIndex', Uint16Array], ['skinWeight', Float32Array]] as const) g.setAttribute(k, plain(h.geometry.getAttribute(k), C));
    g.setIndex(new THREE.BufferAttribute(Uint32Array.from(h.geometry.index!.array), 1));
    add(h.material as THREE.Material, g);
  });
  for (const g of gearGeo(look, skeleton, skinned)) add(flat, g);
  const bindMatrix = skinned[0].bindMatrix.clone();
  const host = skinned[0].parent!;
  [...skinned, ...statics].forEach((s) => s.removeFromParent());
  const textured = [...groups.keys()].filter((m) => m !== flat);
  if (!textured.length) {
    for (const [material, list] of groups) {
      const mesh = new THREE.SkinnedMesh(mergeGeometries(list)!, material);
      mesh.bind(skeleton, bindMatrix);
      mesh.castShadow = true;
      host.add(mesh);
    }
    return scene;
  }
  // 每人一張圖集、一隻物料：一個人一個 draw call
  const atlasKey = `${file}|${look.hair ?? ''}`;
  const n = Math.ceil(Math.sqrt(textured.length + 1));
  const cell = ATLAS_SIZE / n;
  let tex = atlases.get(atlasKey);
  if (!tex) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = ATLAS_SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
    textured.forEach((m, i) => ctx.drawImage((m as THREE.MeshStandardMaterial).map!.image as CanvasImageSource, (i % n) * cell, Math.floor(i / n) * cell, cell, cell));
    tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 2;
    atlases.set(atlasKey, tex);
  }
  const whiteU = ((textured.length % n) + 0.5) / n;
  const whiteV = (Math.floor(textured.length / n) + 0.5) / n;
  const all: THREE.BufferGeometry[] = [];
  for (const [material, list] of groups) {
    const slot = textured.indexOf(material);
    for (const g of list) {
      const count = g.getAttribute('position').count;
      const uv = new Float32Array(count * 2);
      const src = g.getAttribute('uv');
      for (let i = 0; i < count; i++) {
        if (slot < 0) {
          uv[i * 2] = whiteU;
          uv[i * 2 + 1] = whiteV;
        } else {
          const fu = src.getX(i) - Math.floor(src.getX(i));
          const fv = src.getY(i) - Math.floor(src.getY(i));
          uv[i * 2] = ((slot % n) + fu * 0.98 + 0.01) / n;
          uv[i * 2 + 1] = (Math.floor(slot / n) + fv * 0.98 + 0.01) / n;
        }
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      if (!g.getAttribute('color')) g.setAttribute('color', solid(g, WHITE));
      all.push(g.index ? g.toNonIndexed() : g);
    }
  }
  const body = mergeVertices(mergeGeometries(all)!, 1e-4);
  const mesh = new THREE.SkinnedMesh(body, new THREE.MeshLambertMaterial({ map: tex, vertexColors: true, side: THREE.DoubleSide }));
  // 遠鏡用同一堆頂點、面數少好多嘅 index
  const [lo] = MeshoptSimplifier.simplify(Uint32Array.from(body.index!.array), body.getAttribute('position').array as Float32Array, 3, FAR_TRIS * 3, 0.08);
  body.userData.lo = lo;
  mesh.bind(skeleton, bindMatrix);
  mesh.castShadow = true;
  mesh.userData.white = [whiteU, whiteV];
  host.add(mesh);
  return scene;
}

function measure(root: THREE.Object3D): THREE.Vector3 {
  const bounds = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry.computeBoundingBox();
      bounds.union(m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld));
    }
  });
  return bounds.getSize(new THREE.Vector3());
}

/* ---------- 程式砌嘅盔甲同種族特徵：跟骨頭郁 ---------- */

function gearGeo(look: SkinLook, skeleton: THREE.Skeleton, skinned: THREE.SkinnedMesh[]): THREE.BufferGeometry[] {
  if (!look.gear?.length) return [];
  const bounds = new THREE.Box3();
  for (const s of skinned) {
    s.geometry.computeBoundingBox();
    bounds.union(s.geometry.boundingBox!);
  }
  const u = (bounds.max.y - bounds.min.y) / 1.8;
  const metal = look.metal ?? 0x8a8a90;
  const trim = look.trim ?? 0x6a4a30;
  const out: THREE.BufferGeometry[] = [];
  const add = (bone: string, g: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0) => {
    const i = skeleton.bones.findIndex((b) => b.name === bone);
    if (i < 0) return;
    const at = new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(skeleton.boneInverses[i]).invert());
    g.scale(u, u, u).translate(at.x + x * u, at.y + y * u, at.z + z * u);
    const flatG = g.index ? g.toNonIndexed() : g;
    flatG.deleteAttribute('uv');
    flatG.setAttribute('color', solid(flatG, new THREE.Color(color)));
    const n = flatG.getAttribute('position').count;
    const idx = new Uint16Array(n * 4);
    const wgt = new Float32Array(n * 4);
    for (let k = 0; k < n; k++) {
      idx[k * 4] = i;
      wgt[k * 4] = 1;
    }
    flatG.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4));
    flatG.setAttribute('skinWeight', new THREE.BufferAttribute(wgt, 4));
    out.push(flatG);
  };
  const sphere = (r: number, sy = 1, sz = 1) => new THREE.SphereGeometry(r, 8, 6).scale(1, sy, sz);
  const dome = (r: number) => new THREE.SphereGeometry(r, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const cone = (r: number, h: number, seg = 8) => new THREE.ConeGeometry(r, h, seg);
  const HEAD_TOP = 0.15;
  const skirtGeo = (top: number, bottom: number, h: number) => new THREE.CylinderGeometry(top, bottom, h, 8, 1, true);
  for (const p of look.gear) {
    switch (p) {
      case 'helm': add('Head', dome(0.135), metal, 0, HEAD_TOP, 0.015); break;
      case 'conical':
        add('Head', dome(0.135), metal, 0, HEAD_TOP, 0.015);
        add('Head', cone(0.06, 0.16, 6), metal, 0, HEAD_TOP + 0.19, 0.015);
        break;
      case 'plume': add('Head', cone(0.035, 0.26, 5).rotateX(-0.5), trim, 0, HEAD_TOP + 0.22, -0.06); break;
      case 'crown': add('Head', new THREE.CylinderGeometry(0.115, 0.1, 0.07, 8, 1, true), metal, 0, HEAD_TOP + 0.07, 0.015); break;
      case 'circlet': add('Head', new THREE.TorusGeometry(0.105, 0.012, 5, 12).rotateX(Math.PI / 2), metal, 0, HEAD_TOP + 0.03, 0.015); break;
      case 'wizardHat':
        add('Head', cone(0.19, 0.05, 10), metal, 0, HEAD_TOP + 0.05, 0);
        add('Head', cone(0.11, 0.32, 8), metal, 0, HEAD_TOP + 0.22, -0.01);
        break;
      case 'cuirass': add('spine_03', sphere(0.2, 1.2, 0.72), metal, 0, -0.03, 0.01); break;
      case 'pauldrons':
        add('upperarm_l', sphere(0.095, 0.8, 1), metal, 0, 0.02, 0);
        add('upperarm_r', sphere(0.095, 0.8, 1), metal, 0, 0.02, 0);
        break;
      case 'skirt': add('pelvis', skirtGeo(0.17, 0.25, 0.3), trim, 0, -0.14, 0); break;
      case 'greaves':
        add('calf_l', new THREE.CylinderGeometry(0.06, 0.05, 0.3, 6), metal, 0, -0.17, 0.01);
        add('calf_r', new THREE.CylinderGeometry(0.06, 0.05, 0.3, 6), metal, 0, -0.17, 0.01);
        break;
      case 'robe':
        add('spine_03', sphere(0.19, 1.25, 0.72), metal, 0, -0.03, 0.01);
        add('pelvis', skirtGeo(0.17, 0.34, 0.95), metal, 0, -0.45, 0);
        add('pelvis', new THREE.TorusGeometry(0.17, 0.02, 5, 10).rotateX(Math.PI / 2), trim, 0, 0.03, 0);
        break;
      case 'horns':
        add('Head', cone(0.03, 0.2, 5).rotateZ(-0.5), 0x2a2420, 0.1, HEAD_TOP + 0.08, 0);
        add('Head', cone(0.03, 0.2, 5).rotateZ(0.5), 0x2a2420, -0.1, HEAD_TOP + 0.08, 0);
        break;
      case 'bigHorns':
        add('Head', cone(0.05, 0.36, 6).rotateZ(-1), 0xd8d0b8, 0.2, HEAD_TOP + 0.04, 0);
        add('Head', cone(0.05, 0.36, 6).rotateZ(1), 0xd8d0b8, -0.2, HEAD_TOP + 0.04, 0);
        break;
      case 'tusks':
        add('Head', cone(0.012, 0.07, 4), 0xe8e0c8, 0.04, 0.0, 0.1);
        add('Head', cone(0.012, 0.07, 4), 0xe8e0c8, -0.04, 0.0, 0.1);
        break;
      case 'ears':
        add('Head', cone(0.025, 0.14, 4).rotateZ(-1.1), look.tint ?? 0xe0b48c, 0.13, 0.08, -0.01);
        add('Head', cone(0.025, 0.14, 4).rotateZ(1.1), look.tint ?? 0xe0b48c, -0.13, 0.08, -0.01);
        break;
      case 'antlers':
        add('Head', cone(0.02, 0.3, 4).rotateZ(-0.6), 0x5a4028, 0.09, HEAD_TOP + 0.12, 0);
        add('Head', cone(0.02, 0.3, 4).rotateZ(0.6), 0x5a4028, -0.09, HEAD_TOP + 0.12, 0);
        break;
      case 'wings':
        add('spine_03', new THREE.ConeGeometry(0.25, 0.7, 3).scale(1, 1, 0.1).rotateZ(-1.1), metal, 0.3, 0.1, -0.14);
        add('spine_03', new THREE.ConeGeometry(0.25, 0.7, 3).scale(1, 1, 0.1).rotateZ(1.1), metal, -0.3, 0.1, -0.14);
        break;
    }
  }
  return out;
}

/* ---------- 手持武器：程式砌，用頂點色 ---------- */

const piece = (g: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0) => {
  g.translate(x, y, z);
  const out = g.index ? g.toNonIndexed() : g;
  out.deleteAttribute('uv');
  out.setAttribute('color', solid(out, new THREE.Color(color)));
  return out;
};
const brick = (w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0) => piece(new THREE.BoxGeometry(w, h, d), color, x, y, z);
const rod = (r: number, h: number, color: number, y = 0) => piece(new THREE.CylinderGeometry(r, r, h, 6), color, 0, y, 0);

const WEAPON_GEO: Record<string, () => THREE.BufferGeometry> = {
  sword: () => mergeGeometries([rod(0.02, 0.2, 0x5a3a20, 0.1), brick(0.22, 0.03, 0.05, 0xb0a070, 0, 0.21, 0), brick(0.06, 0.9, 0.015, 0xd8dce4, 0, 0.67, 0)])!,
  axe: () => mergeGeometries([rod(0.022, 1, 0x5a3a20, 0.4), brick(0.3, 0.28, 0.02, 0xc0c4cc, 0.14, 0.8, 0)])!,
  mace: () => mergeGeometries([rod(0.022, 0.7, 0x5a3a20, 0.3), piece(new THREE.IcosahedronGeometry(0.1, 0), 0x9aa0a8, 0, 0.68, 0)])!,
  spear: () => mergeGeometries([rod(0.018, 2, 0x6a4a2a, 0.7), piece(new THREE.ConeGeometry(0.05, 0.28, 5), 0xd8dce4, 0, 1.82, 0)])!,
  lance: () => mergeGeometries([rod(0.03, 2.8, 0xb09060, 1), piece(new THREE.ConeGeometry(0.1, 0.5, 6), 0xd8dce4, 0, 2.6, 0)])!,
  staff: () => mergeGeometries([rod(0.02, 1.6, 0x4a3020, 0.5), piece(new THREE.IcosahedronGeometry(0.09, 0), 0x6ad0ff, 0, 1.35, 0)])!,
  javelin: () => mergeGeometries([rod(0.014, 1.3, 0x6a4a2a, 0.4), piece(new THREE.ConeGeometry(0.03, 0.2, 5), 0xd8dce4, 0, 1.15, 0)])!,
  bow: () => mergeGeometries([piece(new THREE.TorusGeometry(0.55, 0.018, 5, 14, Math.PI * 0.9).rotateZ(Math.PI * 0.55).rotateY(Math.PI / 2), 0x6a4020), rod(0.004, 1.05, 0xe8e0d0, 0)])!,
  crossbow: () => mergeGeometries([brick(0.05, 0.05, 0.6, 0x5a3a20, 0, 0, 0.2), brick(0.6, 0.02, 0.04, 0x8a8a90, 0, 0, 0.42)])!,
  shield: () => mergeGeometries([piece(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 10).rotateX(Math.PI / 2), 0x7a3a2a), piece(new THREE.CylinderGeometry(0.07, 0.07, 0.07, 6).rotateX(Math.PI / 2), 0xc0b080)])!,
};
const geoCache = new Map<string, THREE.BufferGeometry>();
const weaponGeo = (k: string) => {
  let g = geoCache.get(k);
  if (!g) geoCache.set(k, (g = WEAPON_GEO[k]()));
  return g;
};

/* ---------- 載入 ---------- */

const raw = new Map<string, { scene: THREE.Object3D; clips: THREE.AnimationClip[] }>();
const pending = new Map<string, Promise<void>>();
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

function loadFile(file: string): Promise<void> {
  let p = pending.get(file);
  if (!p) {
    p = (async () => {
      const g = await loader.loadAsync(`${BASE}${file}.glb`);
      for (const c of g.animations) c.tracks = c.tracks.filter((t) => !t.name.endsWith('.scale'));
      raw.set(file, { scene: g.scene, clips: g.animations });
    })().catch((e) => { console.error('[skins] 載入失敗', file, e); });
    pending.set(file, p);
  }
  return p;
}

/** 開戰前等齊要用嘅模型 */
export async function loadSkins(looks: SkinLook[]) {
  await MeshoptSimplifier.ready;
  const files = new Set<string>(['h_anim', 'h_MP', 'h_FP', 'h_HeadM', 'h_HeadF', 'a_Horse', 'a_Horse_White']);
  for (const l of looks) {
    files.add(l.file);
    if (l.hair) files.add(l.hair);
    const src = FAMILY_CLIPS[l.family].source;
    if (src) files.add(src);
  }
  await Promise.all([...files].map(loadFile));
}

const familyClips = new Map<string, Map<string, THREE.AnimationClip>>();
function clipsOf(look: SkinLook) {
  const src = FAMILY_CLIPS[look.family].source ?? look.file;
  let m = familyClips.get(src);
  if (!m) {
    m = new Map();
    for (const c of raw.get(src)?.clips ?? []) {
      m.set(c.name, c);
      m.set(`${c.name}@up`, new THREE.AnimationClip(`${c.name}@up`, c.duration, c.tracks.filter((t) => !LOWER.test(t.name.split('.')[0]))));
      m.set(`${c.name}@low`, new THREE.AnimationClip(`${c.name}@low`, c.duration, c.tracks.filter((t) => LOWER.test(t.name.split('.')[0]))));
    }
    familyClips.set(src, m);
  }
  return m;
}

const templates = new Map<string, Template>();
function templateFor(look: SkinLook): Template | null {
  const key = `${look.file}|${look.tint ?? ''}|${look.gear?.join() ?? ''}|${look.metal ?? ''}|${look.trim ?? ''}|${look.hair ?? ''}`;
  const hit = templates.get(key);
  if (hit) return hit;
  const r = raw.get(look.file);
  if (!r) return null;
  const root = bake(cloneSkinned(r.scene), look);
  const dims = measure(root);
  const beast = look.family === 'beast';
  const scale = beast ? MOUNT_LENGTH / Math.max(dims.x, dims.z) : HUMAN_HEIGHT / dims.y;
  if (look.tint !== undefined) {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.material = (m.material as THREE.MeshLambertMaterial).clone();
        (m.material as THREE.MeshLambertMaterial).color.set(look.tint!);
      }
    });
  }
  const t: Template = { key, root, scale, family: look.family, clips: clipsOf(look), sphere: new THREE.Sphere(new THREE.Vector3(0, 1, 0), 3.2 / scale) };
  templates.set(key, t);
  return t;
}

/* ---------- 遠鏡：預烤姿勢 ---------- */

const v = new THREE.Vector3();

function heldGeo(t: Template, look: SkinLook, model: THREE.Object3D) {
  const bones = FAMILY_CLIPS[t.family].bones;
  const one = (kind: string, bone: string) => {
    const b = model.getObjectByName(bone);
    if (!b) return null;
    const k = 1 / (t.scale * b.getWorldScale(v).x);
    const fam = FAMILY_CLIPS[t.family];
    const m = new THREE.Matrix4().copy(b.matrixWorld).multiply(new THREE.Matrix4().makeScale(k, k, k)).multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...(kind === 'shield' ? fam.guard : fam.grip))));
    const g = weaponGeo(kind).clone().applyMatrix4(m).applyMatrix4(new THREE.Matrix4().makeScale(t.scale, t.scale, t.scale));
    return g;
  };
  return [look.weapon && WEAPON_GEO[look.weapon] ? one(look.weapon, bones.hand) : null, look.shield ? one('shield', bones.off) : null].filter(Boolean) as THREE.BufferGeometry[];
}

/** 將一個動作嘅某時刻烤成靜態 geometry，連手上武器 */
function bakePose(t: Template, look: SkinLook, clip: string, phase: number): THREE.BufferGeometry[] {
  const model = cloneSkinned(t.root);
  const mixer = new THREE.AnimationMixer(model);
  const c = t.clips.get(clip);
  if (c) {
    const a = mixer.clipAction(c);
    a.play();
    a.time = c.duration * phase;
    mixer.update(0);
  }
  model.updateMatrixWorld(true);
  const parts: THREE.BufferGeometry[] = [];
  model.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    m.skeleton.update();
    const src = m.geometry;
    const n = src.getAttribute('position').count;
    const baked = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld).multiplyScalar(t.scale);
      v.toArray(baked, i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(baked, 3));
    for (const k of ['color', 'uv']) if (src.getAttribute(k)) g.setAttribute(k, src.getAttribute(k));
    const lo = src.userData.lo as Uint32Array | undefined;
    if (lo) g.setIndex(new THREE.BufferAttribute(lo, 1));
    else if (src.index) g.setIndex(src.index);
    g.computeVertexNormals();
    g.userData.white = m.userData.white;
    parts.push(g);
  });
  const held = heldGeo(t, look, model);
  if (held.length) {
    const i = parts.findIndex((g) => g.getAttribute('color'));
    const white = parts[i]?.userData.white as [number, number] | undefined;
    if (white) {
      for (const h of held) {
        const n = h.getAttribute('position').count;
        const uv = new Float32Array(n * 2);
        for (let k = 0; k < n; k++) uv.set(white, k * 2);
        h.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      }
    }
    if (i >= 0) parts[i] = mergeGeometries([parts[i].index ? parts[i].toNonIndexed() : parts[i], ...held])!;
    else parts.push(mergeGeometries(held)!);
  }
  mixer.stopAllAction();
  return parts;
}

type PoseId = 'idle' | 'walk0' | 'walk1' | 'walk2' | 'walk3' | 'slash' | 'die' | 'sit';
const POSES: [PoseId, 'idle' | 'walk' | 'slash' | 'die' | 'sit', number][] = [['idle', 'idle', 0], ['walk0', 'walk', 0.1], ['walk1', 'walk', 0.35], ['walk2', 'walk', 0.6], ['walk3', 'walk', 0.85], ['slash', 'slash', 0.45], ['die', 'die', 0.98], ['sit', 'sit', 0.5]];

interface Bucket { mesh: THREE.InstancedMesh; n: number }

class Crowd {
  private sets = new Map<string, Map<PoseId, Bucket[]>>();
  private live = new Set<Bucket>();

  constructor(private scene: THREE.Scene) {}

  private pose(t: Template, look: SkinLook, id: PoseId): Bucket[] {
    const key = `${t.key}|${look.weapon ?? ''}|${look.shield ? 1 : 0}`;
    let set = this.sets.get(key);
    if (!set) this.sets.set(key, (set = new Map()));
    let b = set.get(id);
    if (!b) {
      const [, state, phase] = POSES.find((p) => p[0] === id)!;
      const k = FAMILY_CLIPS[t.family];
      const mats: THREE.Material[] = [];
      t.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) mats.push(m.material as THREE.Material);
      });
      b = bakePose(t, look, k[state] ?? k.idle, phase).map((g, i) => {
        const mesh = new THREE.InstancedMesh(g, mats[i] ?? flat, CROWD_CAPACITY);
        mesh.frustumCulled = false;
        mesh.count = 0;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.scene.add(mesh);
        return { mesh, n: 0 };
      });
      set.set(id, b);
    }
    return b;
  }

  /** 開戰前烤好，唔好喺打緊嘅時候卡一下 */
  warm(t: Template, look: SkinLook) {
    for (const [id] of POSES) this.pose(t, look, id);
  }

  begin() {
    for (const b of this.live) b.n = 0;
  }

  add(t: Template, look: SkinLook, id: PoseId, m: THREE.Matrix4) {
    for (const b of this.pose(t, look, id)) {
      if (b.n >= CROWD_CAPACITY) continue;
      b.mesh.setMatrixAt(b.n++, m);
      this.live.add(b);
    }
  }

  end() {
    for (const b of this.live) {
      b.mesh.count = b.n;
      if (!b.n) continue;
      b.mesh.instanceMatrix.clearUpdateRanges();
      b.mesh.instanceMatrix.addUpdateRange(0, b.n * 16);
      b.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

/* ---------- 近鏡：完整動畫 ---------- */

class Actor {
  group = new THREE.Group();
  mixer: THREE.AnimationMixer;
  model: THREE.Object3D;
  private slots = new Map<string, THREE.AnimationAction>();
  private held = new Map<string, THREE.Mesh>();

  constructor(public t: Template, private scene: THREE.Scene) {
    this.model = cloneSkinned(t.root);
    this.model.scale.setScalar(t.scale);
    this.model.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (m.isSkinnedMesh) m.boundingSphere = t.sphere.clone();
    });
    this.group.add(this.model);
    this.group.visible = false;
    this.mixer = new THREE.AnimationMixer(this.model);
  }

  /** 唔喺鏡頭近處就唔留喺場景：65 條骨頭每幀重算好貴 */
  show(on: boolean) {
    if (on === !!this.group.parent) return;
    if (on) this.scene.add(this.group);
    else this.group.removeFromParent();
  }

  /** 手上武器：轉武器即換 */
  hold(kind: string | undefined, bone: string, slot: string) {
    for (const [k, m] of this.held) if (k.startsWith(`${slot}:`)) m.visible = k === `${slot}:${kind}`;
    if (!kind || !WEAPON_GEO[kind] || this.held.has(`${slot}:${kind}`)) return;
    const b = this.model.getObjectByName(bone);
    if (!b) return;
    const m = new THREE.Mesh(weaponGeo(kind), flat);
    m.castShadow = true;
    m.scale.setScalar(1 / (this.t.scale * b.getWorldScale(v).x || 1) * this.t.scale);
    const fam = FAMILY_CLIPS[this.t.family];
    m.rotation.set(...(kind === 'shield' ? fam.guard : fam.grip));
    b.add(m);
    this.held.set(`${slot}:${kind}`, m);
  }

  play(slot: string, name: string, once = false, rate = 1) {
    const clip = this.t.clips.get(name);
    if (!clip) return;
    const cur = this.slots.get(slot);
    const next = this.mixer.clipAction(clip);
    next.timeScale = rate;
    if (cur === next) return;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    next.fadeIn(FADE).play();
    cur?.fadeOut(FADE);
    this.slots.set(slot, next);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.group.removeFromParent();
    this.group.traverse((o) => (o as THREE.SkinnedMesh).skeleton?.dispose());
  }
}

const place = new THREE.Matrix4();
const spot = new THREE.Vector3();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();

function matrixOf(root: THREE.Object3D, y: number) {
  spot.copy(root.position);
  spot.y = y;
  euler.set(0, root.rotation.y, root.rotation.z);
  return place.compose(spot, quat.setFromEuler(euler), root.scale);
}

export class HumanSkin {
  private clip: (typeof FAMILY_CLIPS)['h'];

  constructor(private a: Actor, public look: SkinLook) {
    this.clip = FAMILY_CLIPS[a.t.family];
  }

  sync(c: Combatant, dt: number) {
    const g = this.a.group;
    g.visible = c.skinOn && !c.fled && !c.hiddenBody;
    this.a.show(g.visible);
    if (!g.visible) return;
    const r = c.rig.root;
    const h = c.horse;
    g.position.copy(r.position);
    if (c.dead) g.position.y = c.pos.y;
    else if (h) g.position.y -= RIDER_DROP;
    g.rotation.y = r.rotation.y;
    g.rotation.z = r.rotation.z;
    g.scale.copy(r.scale);
    if (this.a.t.family === 'h') {
      this.a.hold(c.weapon.model ?? this.look.weapon, this.clip.bones.hand, 'r');
      this.a.hold(c.hasActiveShield ? 'shield' : undefined, this.clip.bones.off, 'l');
    }
    this.a.play('body', ...this.state(c, !!h));
    if (h && !c.dead && this.clip.sit) this.a.play('legs', `${this.clip.sit}@low`);
    this.a.mixer.update(dt);
  }

  private state(c: Combatant, mounted: boolean): [string, boolean, number] {
    const up = mounted ? '@up' : '';
    const k = this.clip;
    if (c.dead) return [k.die, true, 1];
    if (c.phase === 'charge' || c.phase === 'swing') return [(c.def.role === 'mage' ? k.spell : c.weapon.ranged ? k.shot : k.slash) + up, true, 1.1];
    if (c.phase === 'stagger') return [k.hit + up, true, 1];
    if (mounted) return [`${k.idle}@up`, false, 1];
    const s = Math.hypot(c.vel.x, c.vel.z);
    if (s > 3.5) return [k.run, false, s / 5];
    if (s > 0.3) return [k.walk, false, Math.max(0.6, s / 2.2)];
    return [k.idle, false, 1];
  }

  far(crowd: Crowd, c: Combatant) {
    if (c.skinOn || c.fled || c.hiddenBody) return;
    const r = c.rig.root;
    let id: PoseId = 'idle';
    if (c.dead) id = 'die';
    else if (c.horse) id = this.clip.sit ? 'sit' : 'idle';
    else if (c.phase === 'charge' || c.phase === 'swing') id = 'slash';
    else if (Math.hypot(c.vel.x, c.vel.z) > 0.3) id = `walk${Math.floor(c.walkPhase / (Math.PI / 2)) & 3}` as PoseId;
    const y = c.dead ? c.pos.y : c.horse ? r.position.y - RIDER_DROP : r.position.y;
    crowd.add(this.a.t, this.look, id, matrixOf(r, y));
  }
}

export class HorseSkin {
  constructor(private a: Actor, public look: SkinLook) {}

  sync(h: Horse, dt: number) {
    const r = h.rig.root;
    const g = this.a.group;
    g.visible = h.skinOn && h.pos.y > -30;
    this.a.show(g.visible);
    if (!g.visible) return;
    g.position.copy(h.pos);
    g.rotation.y = r.rotation.y;
    g.rotation.z = h.dead ? 0 : r.rotation.z;
    g.scale.copy(r.scale);
    const k = FAMILY_CLIPS.beast;
    const s = Math.abs(h.speed);
    if (h.dead) this.a.play('body', k.die, true);
    else if (s > 6) this.a.play('body', k.run, false, s / 11);
    else if (s > 0.4) this.a.play('body', k.walk, false, Math.max(0.6, s / 2.5));
    else this.a.play('body', k.idle);
    this.a.mixer.update(dt);
  }

  far(crowd: Crowd, h: Horse) {
    if (h.skinOn || h.pos.y < -30) return;
    const id: PoseId = h.dead ? 'die' : Math.abs(h.speed) > 0.4 ? `walk${Math.floor(h.gaitPhase / (Math.PI / 2)) & 3}` as PoseId : 'idle';
    crowd.add(this.a.t, this.look, id, matrixOf(h.rig.root, h.pos.y));
  }
}

/** 一場戰鬥嘅所有模型 */
export class SkinPool {
  private actors: Actor[] = [];
  crowd: Crowd;

  constructor(private scene: THREE.Scene) {
    this.crowd = new Crowd(scene);
  }

  ready = (look: SkinLook) => !!templateFor(look);

  private spawn(look: SkinLook): Actor | null {
    const t = templateFor(look);
    if (!t) return null;
    const a = new Actor(t, this.scene);
    this.actors.push(a);
    return a;
  }

  human(look: SkinLook): HumanSkin | undefined {
    const a = this.spawn(look);
    if (a) this.crowd.warm(a.t, look);
    return a ? new HumanSkin(a, look) : undefined;
  }

  horse(look: SkinLook): HorseSkin | undefined {
    const a = this.spawn(look);
    if (a) this.crowd.warm(a.t, look);
    return a ? new HorseSkin(a, look) : undefined;
  }

  reset() {
    for (const a of this.actors) a.dispose();
    this.actors = [];
  }
}
