import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { Combatant, Horse } from './entities';
import { SKIN_FILES, type SkinLook } from '../data/skins';
import type { HorseDef } from '../data/horses';

/** CC0 骨架模型：一個 model 一隻 SkinnedMesh，令百人同場唔會爆 draw call */
const HUMAN_HEIGHT = 2.1;
const HEAD_SCALE = 0.62;
const HORSE_LENGTH = 2.5;
/** 騎馬時 hips 離馬鞍嘅高度修正 */
const RIDER_DROP = 0.42;
const FADE = 0.14;

interface Template {
  root: THREE.Object3D;
  scale: number;
  clips: Map<string, THREE.AnimationClip>;
  sphere: THREE.Sphere;
}

const LOWER = /^(root|hips|upperleg|lowerleg|foot|toes|kneeIK|control-|heelIK|IK-)/;

function split(clip: THREE.AnimationClip, lower: boolean): THREE.AnimationClip {
  const tracks = clip.tracks.filter((t) => LOWER.test(t.name.split('.')[0]) === lower);
  return new THREE.AnimationClip(`${clip.name}${lower ? '@low' : '@up'}`, clip.duration, tracks);
}

function plain(a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, Ctor: typeof Float32Array | typeof Uint16Array): THREE.BufferAttribute {
  const out = new Ctor(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
  return new THREE.BufferAttribute(out, a.itemSize);
}

/** 將靜態件烘入綁定姿勢，同身體合成一份 geometry */
function bake(scene: THREE.Object3D, items: readonly string[]): THREE.Object3D {
  scene.updateMatrixWorld(true);
  const skinned: THREE.SkinnedMesh[] = [];
  const statics: THREE.Mesh[] = [];
  scene.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned.push(o as THREE.SkinnedMesh);
    else if ((o as THREE.Mesh).isMesh) statics.push(o as THREE.Mesh);
  });
  const skeleton = skinned[0].skeleton;
  const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const add = (m: THREE.Material, g: THREE.BufferGeometry) => byMaterial.set(m, [...(byMaterial.get(m) ?? []), g]);
  const clean = (g: THREE.BufferGeometry) => {
    const out = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'uv']) out.setAttribute(k, plain(g.getAttribute(k) as THREE.BufferAttribute, Float32Array));
    out.setIndex(g.index!.clone());
    return out;
  };
  for (const s of skinned) {
    const g = clean(s.geometry);
    g.setAttribute('skinIndex', plain(s.geometry.getAttribute('skinIndex') as THREE.BufferAttribute, Uint16Array));
    g.setAttribute('skinWeight', plain(s.geometry.getAttribute('skinWeight') as THREE.BufferAttribute, Float32Array));
    add(s.material as THREE.Material, g);
  }
  for (const s of statics) {
    if (!items.includes(s.name)) continue;
    const bone = skeleton.bones.indexOf(s.parent as THREE.Bone);
    if (bone < 0) continue;
    const g = clean(s.geometry);
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
    add(s.material as THREE.Material, g);
  }
  const bindMatrix = skinned[0].bindMatrix.clone();
  const host = skinned[0].parent!;
  [...skinned, ...statics].forEach((s) => s.removeFromParent());
  for (const [material, list] of byMaterial) {
    const mesh = new THREE.SkinnedMesh(mergeGeometries(list)!, material);
    mesh.bind(skeleton, bindMatrix);
    mesh.castShadow = true;
    host.add(mesh);
  }
  return scene;
}

function measure(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry.computeBoundingBox();
      box.union(m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld));
    }
  });
  return box;
}

const templates = new Map<string, Template>();
const raw = new Map<string, THREE.Object3D>();
const clips = new Map<string, THREE.AnimationClip>();
let loading: Promise<void> | null = null;

async function loadAll() {
  const base = `${import.meta.env.BASE_URL}models/`;
  const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  await Promise.all(Object.entries(SKIN_FILES).map(async ([file, cfg]) => {
    const g = await gltf.loadAsync(`${base}${file}.glb`);
    await Promise.all(Object.entries(cfg.extra ?? {}).map(async ([name, slot]) => {
      const item = (await gltf.loadAsync(`${base}items/${name}.gltf`)).scene.getObjectByProperty('isMesh', true)!;
      item.name = name;
      item.position.set(0, 0, 0);
      item.rotation.set(0, 0, 0);
      // GLTFLoader 會食走骨名嘅點
      g.scene.getObjectByName(slot.replace('.', ''))!.add(item);
    }));
    raw.set(file, g.scene);
    // 全部骨架一樣，動作只喺 knight 有一份
    for (const c of g.animations) {
      c.tracks = c.tracks.filter((t) => !t.name.endsWith('.scale'));
      clips.set(c.name, c);
      clips.set(`${c.name}@up`, split(c, false));
      clips.set(`${c.name}@low`, split(c, true));
    }
  }));
  const fbx = await new FBXLoader().loadAsync(`${base}horse.fbx`);
  fbx.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  const horseClips = new Map(fbx.animations.map((c) => [c.name, c]));
  const size = measure(fbx).getSize(new THREE.Vector3());
  templates.set('horse', { root: fbx, scale: HORSE_LENGTH / Math.max(size.x, size.z), clips: horseClips, sphere: new THREE.Sphere(new THREE.Vector3(0, 1, 0), 3.2) });
}

export const loadSkins = () => (loading ??= loadAll().catch((e) => { console.error('[skins] 載入失敗，用返程式模型', e); }));

/** 同一款外觀共用一份 geometry，第一次見到先砌 */
function templateFor(look: SkinLook): Template | null {
  const key = `${look.file}|${look.items.join()}|${look.tint ?? ''}`;
  const hit = templates.get(key);
  if (hit) return hit;
  const scene = raw.get(look.file);
  if (!scene) return null;
  const root = bake(cloneSkinned(scene), look.items);
  const box = measure(root);
  // 原模型係大頭 Q 版：縮個頭先似正常比例
  root.getObjectByName('head')!.scale.setScalar(HEAD_SCALE);
  if (look.tint !== undefined) {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.material = (m.material as THREE.MeshStandardMaterial).clone();
        (m.material as THREE.MeshStandardMaterial).color.set(look.tint!);
      }
    });
  }
  const t = { root, scale: HUMAN_HEIGHT / (box.max.y - box.min.y), clips, sphere: new THREE.Sphere(new THREE.Vector3(0, 1, 0), 2.4) };
  templates.set(key, t);
  return t;
}

const ANIMAL_MOUNT = /wolf|tiger|rhino|buffalo|camel|elk|drake|griffin/;
export const skinHorse = (def: HorseDef) => !ANIMAL_MOUNT.test(def.id);

class Actor {
  group = new THREE.Group();
  mixer: THREE.AnimationMixer;
  private slots = new Map<string, THREE.AnimationAction>();

  constructor(private t: Template, scene: THREE.Scene) {
    const model = cloneSkinned(t.root);
    model.scale.setScalar(t.scale);
    model.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (m.isSkinnedMesh) m.boundingSphere = t.sphere.clone();
    });
    this.group.add(model);
    this.mixer = new THREE.AnimationMixer(model);
    scene.add(this.group);
  }

  /** 每個 slot 同一時間播一個動作，轉動作時淡入淡出 */
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

const ATTACK = { left: '1H_Melee_Attack_Slice_Horizontal', right: '1H_Melee_Attack_Slice_Horizontal', up: '1H_Melee_Attack_Chop', down: '1H_Melee_Attack_Stab' } as Record<string, string>;

export class HumanSkin {
  constructor(private a: Actor) {}

  sync(c: Combatant, dt: number) {
    const g = this.a.group;
    g.visible = c.skinOn && !c.fled && !c.hiddenBody;
    if (!g.visible) return;
    const r = c.rig.root;
    const h = c.horse;
    g.position.copy(r.position);
    if (c.dead) g.position.y = c.pos.y;
    else if (h) g.position.y -= RIDER_DROP;
    g.rotation.y = r.rotation.y;
    g.rotation.z = r.rotation.z;
    g.scale.copy(r.scale);
    this.a.play('body', ...this.clip(c, !!h));
    if (h && !c.dead) this.a.play('legs', 'Sit_Chair_Pose@low');
    this.a.mixer.update(dt);
  }

  private clip(c: Combatant, mounted: boolean): [string, boolean, number] {
    const up = mounted ? '@up' : '';
    if (c.dead) return ['Death_A', true, 1];
    if (c.phase === 'charge' || c.phase === 'swing') {
      const shot = c.def.role === 'mage' ? 'Spellcast_Shoot' : c.weapon.ranged ? '1H_Ranged_Shoot' : ATTACK[c.dir];
      return [shot + up, true, 1.1];
    }
    if (c.phase === 'block') return ['Blocking' + up, false, 1];
    if (c.phase === 'stagger') return ['Hit_A' + up, true, 1];
    if (mounted) return ['Idle@up', false, 1];
    const v = Math.hypot(c.vel.x, c.vel.z);
    if (v > 3.5) return ['Running_A', false, v / 5];
    if (v > 0.3) return ['Walking_A', false, Math.max(0.6, v / 2.2)];
    return ['Idle', false, 1];
  }
}

export class HorseSkin {
  constructor(private a: Actor) {}

  sync(h: Horse, dt: number, walk: string, run: string, idle: string, death: string) {
    const r = h.rig.root;
    const g = this.a.group;
    g.visible = h.skinOn;
    if (!g.visible) return;
    g.position.copy(h.pos);
    g.rotation.y = r.rotation.y;
    g.rotation.z = h.dead ? 0 : r.rotation.z;
    g.scale.copy(r.scale);
    const v = Math.abs(h.speed);
    if (h.dead) this.a.play('body', death, true);
    else if (v > 6) this.a.play('body', run, false, v / 11);
    else if (v > 0.4) this.a.play('body', walk, false, Math.max(0.6, v / 2.5));
    else this.a.play('body', idle);
    this.a.mixer.update(dt);
  }
}

export const HORSE_CLIPS = { walk: 'Armature|Walk', run: 'Armature|Run', idle: 'Armature|Idle', death: 'Armature|Death' };

/** 一場戰鬥嘅所有骨架模型 */
export class SkinPool {
  private actors: Actor[] = [];

  constructor(private scene: THREE.Scene) {}

  private spawn(t: Template | null | undefined): Actor | null {
    if (!t) return null;
    const a = new Actor(t, this.scene);
    this.actors.push(a);
    return a;
  }

  human(look: SkinLook | null): HumanSkin | undefined {
    const a = look && this.spawn(templateFor(look));
    return a ? new HumanSkin(a) : undefined;
  }

  horse(): HorseSkin | undefined {
    const a = this.spawn(templates.get('horse'));
    return a ? new HorseSkin(a) : undefined;
  }

  reset() {
    for (const a of this.actors) a.dispose();
    this.actors = [];
  }
}
