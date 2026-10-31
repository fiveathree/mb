import * as THREE from 'three';
import { BATTLEFIELD as F, COLORS } from '../data/battlefield';

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

export function heightAt(x: number, z: number): number {
  const a = F.hillAmplitude;
  return (
    a * Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017 - 0.6) +
    a * 0.45 * Math.sin(x * 0.053 - z * 0.041) +
    a * 0.16 * Math.cos(x * 0.13 + z * 0.11)
  );
}

function buildGround(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(F.size, F.size, F.segments, F.segments).toNonIndexed();
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const a = new THREE.Color(COLORS.grassA);
  const b = new THREE.Color(COLORS.grassB);
  const dirt = new THREE.Color(COLORS.dirt);
  const c = new THREE.Color();
  const rng = makeRng(F.seed + 1);
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    c.copy(a).lerp(b, rng());
    // 中央一條沙土戰痕，等玩家有方向感
    const track = Math.exp(-Math.pow((cx - 10 * Math.sin(cz * 0.03)) / 9, 2));
    c.lerp(dirt, track * 0.75 * (0.7 + rng() * 0.3));
    for (let j = 0; j < 3; j++) c.toArray(colors, (i + j) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.name = 'ground';
  mesh.receiveShadow = true;
  return mesh;
}

export function placeInstances(
  scene: THREE.Object3D,
  geo: THREE.BufferGeometry,
  color: number,
  items: { x: number; y: number; z: number; s: number; r: number }[],
  castShadow = true,
) {
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color, flatShading: true }), items.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  items.forEach((it, i) => {
    q.setFromAxisAngle(up, it.r);
    m.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(it.s, it.s, it.s));
    mesh.setMatrixAt(i, m);
  });
  mesh.castShadow = castShadow;
  scene.add(mesh);
}

export function placeTrees(parent: THREE.Object3D, trees: { x: number; y: number; z: number; s: number; r: number }[]) {
  const trunk = new THREE.CylinderGeometry(0.2, 0.32, 2.2, 5).translate(0, 1.1, 0);
  const crownA = new THREE.ConeGeometry(1.9, 4.2, 6).translate(0, 4, 0);
  const crownB = new THREE.ConeGeometry(1.4, 3.1, 6).translate(0, 6, 0);
  placeInstances(parent, trunk, COLORS.trunk, trees);
  placeInstances(parent, crownA, COLORS.leaf, trees);
  placeInstances(parent, crownB, COLORS.leafAlt, trees);
}

/** 建立地形同景物，回傳碰撞用障礙物 */
export function buildTerrain(scene: THREE.Scene): Obstacle[] {
  scene.add(buildGround());

  const rng = makeRng(F.seed);
  const obstacles: Obstacle[] = [];
  const trees: { x: number; y: number; z: number; s: number; r: number }[] = [];

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

  const rocks: { x: number; y: number; z: number; s: number; r: number }[] = [];
  for (let i = 0; i < F.rockCount; i++) {
    const ang = rng() * Math.PI * 2;
    const dist = 30 + rng() * (F.arenaRadius - 30);
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist;
    const s = 0.3 + rng() * 0.8;
    rocks.push({ x, y: heightAt(x, z) + s * 0.2, z, s, r: rng() * 6 });
    if (s > 0.75) obstacles.push({ x, z, r: s * 0.7 });
  }
  placeInstances(scene, new THREE.DodecahedronGeometry(1, 0), COLORS.rock, rocks);

  return obstacles;
}
