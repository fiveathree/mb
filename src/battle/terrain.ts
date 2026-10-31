import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BATTLEFIELD as F, COLORS } from '../data/battlefield';
import { RIVER } from '../data/horses';
import { THEME_ART, type BattleTheme } from '../data/world';
import { groundTexture } from './textures';

export interface Obstacle {
  x: number;
  z: number;
  r: number;
}

/** 決定性隨機數，令每次戰場一樣 */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let riverOn = false;
/** 呢場有冇河 */
export const setRiver = (on: boolean) => { riverOn = on; };
export const inRiver = (z: number) => riverOn && Math.abs(z) < RIVER.halfWidth;

export function heightAt(x: number, z: number): number {
  const a = F.hillAmplitude;
  return (
    a * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.6) +
    a * 0.45 * Math.sin(x * 0.053 - z * 0.041) +
    a * 0.16 * Math.cos(x * 0.13 + z * 0.11)
  );
}

/** 地面分色用嘅柔和噪聲 */
function patch(x: number, z: number): number {
  const n = Math.sin(x * 0.043 + Math.sin(z * 0.031) * 1.6) + Math.sin(z * 0.057 + Math.sin(x * 0.027) * 1.9)
    + 0.5 * Math.sin(x * 0.13 + z * 0.09) + 0.35 * Math.sin(x * 0.27 - z * 0.23);
  return Math.min(1, Math.max(0, n * 0.26 + 0.5));
}

/** 每個頂點記低用邊種色，換主題時唔使重算 */
interface GroundCell {
  n: number;
  track: number;
}

let ground: { geo: THREE.BufferGeometry; cells: GroundCell[] } | null = null;
const flora: { grass?: THREE.InstancedMesh; leaf: THREE.Material[]; trunk: THREE.Material[]; rock?: THREE.Material } = { leaf: [], trunk: [] };

function buildGround(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(F.size, F.size, F.segments * 2, F.segments * 2);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  const cells: GroundCell[] = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
    uv.setXY(i, x / 9, z / 9);
    // 中央一條沙土戰痕，等玩家有方向感
    const track = Math.exp(-(((x - 10 * Math.sin(z * 0.03)) / 8) ** 2));
    cells.push({ n: patch(x, z), track });
  }
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
  geo.computeVertexNormals();
  ground = { geo, cells };
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: groundTexture() }));
  mesh.name = 'ground';
  mesh.receiveShadow = true;
  return mesh;
}

/** 換戰場主題：地面、草、樹一齊變色 */
export function paintScenery(theme: BattleTheme) {
  const art = THEME_ART[theme];
  if (ground) {
    const colors = ground.geo.getAttribute('color') as THREE.BufferAttribute;
    const a = new THREE.Color(art.groundA);
    const b = new THREE.Color(art.groundB);
    const dirt = new THREE.Color(art.dirt);
    const c = new THREE.Color();
    ground.cells.forEach((cell, i) => {
      c.copy(a).lerp(b, cell.n).lerp(dirt, Math.min(1, cell.track * (0.45 + cell.n * 0.55)));
      colors.setXYZ(i, c.r, c.g, c.b);
    });
    colors.needsUpdate = true;
  }
  if (flora.grass) {
    flora.grass.visible = art.grass !== null;
    if (art.grass !== null) (flora.grass.material as THREE.MeshLambertMaterial).color.set(art.grass);
  }
  for (const m of flora.leaf) (m as THREE.MeshLambertMaterial).color.set(art.leaf);
  for (const m of flora.trunk) (m as THREE.MeshLambertMaterial).color.set(art.trunk);
  if (flora.rock) (flora.rock as THREE.MeshLambertMaterial).color.set(art.rock);
}

type Item = { x: number; y: number; z: number; s: number; r: number };

export function placeInstances(
  scene: THREE.Object3D,
  geo: THREE.BufferGeometry,
  material: THREE.Material,
  items: Item[],
  castShadow = true,
  tint?: (i: number, c: THREE.Color) => void,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, material, items.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  items.forEach((it, i) => {
    q.setFromAxisAngle(up, it.r);
    m.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(it.s, it.s, it.s));
    mesh.setMatrixAt(i, m);
    if (tint) {
      tint(i, c);
      mesh.setColorAt(i, c);
    }
  });
  mesh.castShadow = castShadow;
  scene.add(mesh);
  return mesh;
}

/** 喬木：幾嚿樹冠疊埋 */
function leafyCrown(): THREE.BufferGeometry {
  const blobs: [number, number, number, number][] = [[0, 4.4, 0, 2.3], [1.3, 3.6, 0.5, 1.5], [-1.2, 3.8, -0.6, 1.6], [0.2, 3.5, 1.3, 1.4], [-0.3, 5.6, 0.2, 1.5]];
  return mergeGeometries(blobs.map(([x, y, z, r]) => {
    const g = new THREE.IcosahedronGeometry(r, 1);
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const k = 1 + Math.sin(p.getX(i) * 3.1 + p.getY(i) * 2.3) * 0.08;
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
    }
    return g.translate(x, y, z);
  }));
}

/** 松樹：幾層下垂嘅枝葉 */
function pineCrown(): THREE.BufferGeometry {
  const tiers: [number, number, number][] = [[2.3, 2.6, 2.4], [1.9, 2.4, 3.9], [1.4, 2.2, 5.3], [0.9, 2, 6.6]];
  return mergeGeometries(tiers.map(([r, h, y]) => new THREE.ConeGeometry(r, h, 8).translate(0, y, 0)));
}

let crowns: { leafy: THREE.BufferGeometry; pine: THREE.BufferGeometry; trunk: THREE.BufferGeometry } | null = null;

export function placeTrees(parent: THREE.Object3D, trees: Item[]) {
  crowns ??= { leafy: leafyCrown(), pine: pineCrown(), trunk: new THREE.CylinderGeometry(0.16, 0.34, 3, 6).translate(0, 1.5, 0) };
  const rng = makeRng(trees.length * 7 + 3);
  const tone = (i: number, c: THREE.Color) => {
    const v = 0.72 + ((i * 2654435761) >>> 0) / 4294967296 * 0.42;
    c.setRGB(v, v * (0.92 + rng() * 0.14), v * 0.86);
  };
  const leafMat = () => {
    const m = new THREE.MeshLambertMaterial({ color: COLORS.leaf });
    flora.leaf.push(m);
    return m;
  };
  const trunkMat = new THREE.MeshLambertMaterial({ color: COLORS.trunk });
  flora.trunk.push(trunkMat);
  placeInstances(parent, crowns.trunk, trunkMat, trees);
  placeInstances(parent, crowns.leafy, leafMat(), trees.filter((_, i) => i % 2 === 0), true, tone);
  placeInstances(parent, crowns.pine, leafMat(), trees.filter((_, i) => i % 2 === 1), true, tone);
}

/** 草叢：幾條幼葉向外彎；法線向上，兩面光暗一致 */
function tuftGeo(): THREE.BufferGeometry {
  const parts = [0, 1.3, 2.5, 3.7, 5].map((a, i) => {
    const g = new THREE.BufferGeometry();
    const w = 0.035;
    const h = 0.34 + (i % 3) * 0.09;
    const lean = 0.08 + (i % 2) * 0.08;
    g.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0.05, w, 0, 0.05, lean * 0.2, h, lean], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 1]);
    g.rotateY(a);
    return g.translate(Math.sin(a * 3) * 0.14, 0, Math.cos(a * 2) * 0.14);
  });
  return mergeGeometries(parts);
}

function plantGrass(scene: THREE.Scene, rng: () => number) {
  const items: Item[] = [];
  for (let i = 0; i < F.grassCount; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * F.arenaRadius;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    // 成叢咁生，唔係平均撒
    if (patch(x * 1.7, z * 1.7) < 0.42) continue;
    items.push({ x, y: heightAt(x, z), z, s: 0.7 + rng() * 1.1, r: rng() * 6 });
  }
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  flora.grass = placeInstances(scene, tuftGeo(), material, items, false, (_, c) => {
    const v = 0.72 + rng() * 0.5;
    c.setRGB(v, v, v * (0.8 + rng() * 0.2));
  });
  flora.grass.frustumCulled = false;
}

/** 天穹：地平線融入霧色，有雲同星 */
const SKY_VERT = `varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const SKY_FRAG = `uniform vec3 uTop; uniform vec3 uLow; uniform vec3 uSun; uniform float uCloud; uniform float uStars;
varying vec3 vDir;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash(vec3(i, 1.0)); float b = hash(vec3(i + vec2(1, 0), 1.0));
  float c = hash(vec3(i + vec2(0, 1), 1.0)); float d = hash(vec3(i + vec2(1, 1), 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; } return v; }
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uLow, uTop, pow(h, 0.55));
  float sun = max(dot(d, normalize(vec3(0.42, 0.62, -0.5))), 0.0);
  col += uSun * (pow(sun, 240.0) * 1.2 + pow(sun, 10.0) * 0.18);
  if (d.y > 0.0) {
    vec2 uv = d.xz / (d.y + 0.16) * 1.5;
    float c = smoothstep(0.5, 0.78, fbm(uv + 3.0));
    col = mix(col, mix(uLow, vec3(1.0), 0.72), c * uCloud * smoothstep(0.0, 0.2, d.y));
    float s = step(0.9975, hash(floor(d * 220.0)));
    col += vec3(s) * uStars * smoothstep(0.02, 0.3, d.y);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export class SkyDome {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene) {
    this.material = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      uniforms: {
        uTop: { value: new THREE.Color() },
        uLow: { value: new THREE.Color() },
        uSun: { value: new THREE.Color() },
        uCloud: { value: 0.7 },
        uStars: { value: 0 },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(450, 24, 14), this.material);
    this.mesh.renderOrder = -1;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  set(top: number, low: number, sun: number, cloud: number, stars: number) {
    const u = this.material.uniforms;
    (u.uTop.value as THREE.Color).set(top);
    (u.uLow.value as THREE.Color).set(low);
    (u.uSun.value as THREE.Color).set(sun);
    u.uCloud.value = cloud;
    u.uStars.value = stars;
  }
}

/** 遠山一圈，遮住地形盡頭 */
function buildRidge(scene: THREE.Scene) {
  const rng = makeRng(F.seed + 9);
  const geo = new THREE.CylinderGeometry(F.size * 0.68, F.size * 0.74, 1, 90, 5, true);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const a = Math.atan2(pos.getZ(i), pos.getX(i));
    const peak = 26 + 22 * Math.abs(Math.sin(a * 5.3)) + 16 * Math.abs(Math.sin(a * 13 + 1)) + rng() * 5;
    pos.setY(i, (pos.getY(i) + 0.5) * peak - 3);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x6a7a88, side: THREE.BackSide, flatShading: true }));
  scene.add(mesh);
  flora.rock = undefined;
}

/** 建立地形同景物，回傳碰撞用障礙物 */
export function buildTerrain(scene: THREE.Scene): Obstacle[] {
  scene.add(buildGround());
  buildRidge(scene);

  const rng = makeRng(F.seed);
  const obstacles: Obstacle[] = [];
  const trees: Item[] = [];

  for (let i = 0; i < F.treeCount; i++) {
    const inner = i < F.innerTrees;
    const ang = rng() * Math.PI * 2;
    const dist = inner
      ? F.clearRadius + rng() * (F.arenaRadius - F.clearRadius - 10)
      : F.arenaRadius + 4 + rng() * (F.size / 2 - F.arenaRadius - 8);
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist;
    const s = 0.8 + rng() * 0.9;
    trees.push({ x, y: heightAt(x, z), z, s, r: rng() * 6 });
    if (inner) obstacles.push({ x, z, r: 0.7 * s });
  }

  placeTrees(scene, trees);
  plantGrass(scene, rng);

  const rocks: Item[] = [];
  for (let i = 0; i < F.rockCount; i++) {
    const ang = rng() * Math.PI * 2;
    const dist = 30 + rng() * (F.arenaRadius - 30);
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist;
    const s = 0.3 + rng() * 0.8;
    rocks.push({ x, y: heightAt(x, z) + s * 0.2, z, s, r: rng() * 6 });
    if (s > 0.75) obstacles.push({ x, z, r: s * 0.7 });
  }
  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  const p = rockGeo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const k = 0.78 + 0.34 * Math.abs(Math.sin(p.getX(i) * 4.1 + p.getZ(i) * 3.3 + p.getY(i) * 2.7));
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.72, p.getZ(i) * k);
  }
  rockGeo.computeVertexNormals();
  flora.rock = new THREE.MeshLambertMaterial({ color: COLORS.rock, flatShading: true });
  placeInstances(scene, rockGeo, flora.rock, rocks);

  return obstacles;
}
