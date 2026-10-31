import * as THREE from 'three';
import { TOWN, TOWN_STYLES, type TownStyleId } from '../data/battlefield';
import { heightAt, makeRng, type Obstacle } from './terrain';
import { plasterTexture, stoneTexture, tileTexture, woodTexture } from './textures';

export interface TownSpot {
  id: string;
  label: string;
  x: number;
  z: number;
}

function sign(text: string): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(24,18,12,.85)';
  g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#ffe9a8';
  g.font = '700 36px "Noto Sans HK", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) }));
  sprite.scale.set(7, 1.75, 1);
  return sprite;
}

/** 瓦頂：三角柱，闊 w、深 d、高 h */
function gable(w: number, d: number, h: number): THREE.BufferGeometry {
  const shape = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  return geo.translate(0, 0, -d / 2);
}

function repeat(tex: THREE.Texture, n: number) {
  tex.repeat.set(n, n);
  return tex;
}

/** 城鎮場景：中央廣場，七間舖頭圍住，外面一圈民居 */
export function buildTown(parent: THREE.Object3D, setup: { shops: [string, string][]; style: TownStyleId; seed: number }): { spots: TownSpot[]; obstacles: Obstacle[] } {
  const rng = makeRng(setup.seed);
  const style = TOWN_STYLES[setup.style];
  const wall = new THREE.MeshLambertMaterial({ color: style.wall, map: plasterTexture() });
  const roof = new THREE.MeshLambertMaterial({ color: style.roof, map: repeat(tileTexture(), 0.3) });
  const stone = new THREE.MeshLambertMaterial({ color: 0xc0baa8, map: repeat(stoneTexture(), 1) });
  const wood = new THREE.MeshLambertMaterial({ color: 0x8a6240, map: woodTexture() });
  const glass = new THREE.MeshLambertMaterial({ color: 0x2a3440, emissive: 0x4a3a18 });
  const obstacles: Obstacle[] = [];
  const flatRoof = style.roofH < 1;
  const add = (m: THREE.Mesh, shadow = true) => {
    m.castShadow = shadow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const house = (x: number, z: number, w: number, d: number, h: number, yaw: number) => {
    const y = heightAt(x, z);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = yaw;
    const put = (m: THREE.Mesh) => {
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      return m;
    };
    // 石基
    put(new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.7, d + 0.3), stone)).position.y = 0.3;
    put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall)).position.y = h / 2;
    if (flatRoof) {
      put(new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), roof)).position.y = h + 0.25;
    } else {
      const top = put(new THREE.Mesh(gable(w + 1, d + 1, style.roofH), roof));
      top.position.y = h;
      const chimney = put(new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 0.8), stone));
      chimney.position.set(w * 0.26, h + style.roofH * 0.62, d * 0.2);
    }
    // 窗
    for (const sx of [-1, 1]) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(w * 0.16, 1, 0.1), glass);
      pane.position.set(sx * w * 0.27, h * 0.6, -d / 2 - 0.02);
      g.add(pane);
      const pane2 = pane.clone();
      pane2.position.z = d / 2 + 0.02;
      g.add(pane2);
    }
    parent.add(g);
    obstacles.push({ x, z, r: Math.max(w, d) * 0.62 });
  };

  // 廣場石板同去城門嘅路
  const paved = new THREE.Mesh(new THREE.CircleGeometry(TOWN.plaza + 6, 40), new THREE.MeshLambertMaterial({ color: 0xa8a090, map: repeat(stoneTexture(170), 14) }));
  paved.rotation.x = -Math.PI / 2;
  paved.position.y = heightAt(0, 0) + 0.12;
  paved.receiveShadow = true;
  parent.add(paved);

  // 每個城舖頭位置唔同
  const shops = setup.shops.map((s) => ({ s, k: rng() })).sort((a, b) => a.k - b.k).map((x) => x.s);
  const spots: TownSpot[] = shops.map(([id, label], i) => {
    const a = -Math.PI / 2 + ((i + 1) * Math.PI * 2) / (shops.length + 1);
    const yaw = -a + Math.PI / 2;
    house(Math.cos(a) * TOWN.shopRadius, Math.sin(a) * TOWN.shopRadius, 12, 10, 6, yaw);
    const x = Math.cos(a) * TOWN.doorRadius;
    const z = Math.sin(a) * TOWN.doorRadius;
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3, 0.4), wood);
    door.position.set(Math.cos(a) * (TOWN.shopRadius - 6.3), heightAt(x, z) + 1.5, Math.sin(a) * (TOWN.shopRadius - 6.3));
    door.rotation.y = yaw;
    const board = sign(label);
    board.position.set(x, heightAt(x, z) + 4.6, z);
    parent.add(door, board);
    return { id, label, x, z };
  });

  // 民居：城門方向留路
  for (let i = 0; i < TOWN.houses; i++) {
    const a = (i / TOWN.houses) * Math.PI * 2;
    if (Math.abs(Math.sin(a) + 1) < 0.08 || rng() < 0.15) continue;
    const r = TOWN.houseRadius + (rng() - 0.5) * 14;
    house(Math.cos(a) * r, Math.sin(a) * r, 7 + rng() * 4, 6 + rng() * 4, 3.5 + rng() * 2.5, -a + (rng() - 0.5) * 0.6);
  }

  // 廣場小攤：間條帳篷
  const awnings = [0xb5362c, 0x2f6fb5, 0xd8a83a];
  for (let i = 0; i < TOWN.stalls; i++) {
    const a = rng() * Math.PI * 2;
    const r = 10 + rng() * 8;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = heightAt(x, z);
    const cloth = add(new THREE.Mesh(gable(3.6, 2.8, 0.9), new THREE.MeshLambertMaterial({ color: awnings[i % awnings.length] })));
    cloth.position.set(x, y + 2.3, z);
    const table = add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.6), wood));
    table.position.set(x, y + 0.45, z);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.3, 0.14), wood)).position.set(x + sx * 1.6, y + 1.15, z + sz * 1.2);
    }
    obstacles.push({ x, z, r: 1.5 });
  }

  // 噴水池
  const fy = heightAt(0, 0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.3, 0.9, 20), stone)).position.set(0, fy + 0.45, 0);
  const pool = add(new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 0.1, 20), new THREE.MeshPhongMaterial({ color: 0x3f86b8, specular: 0xffffff, shininess: 90 })), false);
  pool.position.set(0, fy + 0.92, 0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 2.2, 10), stone)).position.set(0, fy + 1.7, 0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.5, 0.3, 14), stone)).position.set(0, fy + 2.9, 0);
  obstacles.push({ x: 0, z: 0, r: 3.2 });

  // 圓形城牆：包住成個城，城門位留空
  const ringR = TOWN.houseRadius + 20;
  const segs = 44;
  const gateA = Math.atan2(-TOWN.gateZ, 0);
  const seg = new THREE.BoxGeometry((ringR * Math.PI * 2) / segs + 0.4, 8, 2.4);
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const off = Math.abs(Math.atan2(Math.sin(a - gateA), Math.cos(a - gateA)));
    if (off < 0.12) continue;
    const x = Math.cos(a) * ringR;
    const z = Math.sin(a) * ringR;
    const piece = add(new THREE.Mesh(seg, stone));
    piece.position.set(x, heightAt(x, z) + 4, z);
    piece.rotation.y = -a + Math.PI / 2;
    if (i % 6 === 0) add(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 12, 10), stone)).position.set(x, heightAt(x, z) + 6, z);
  }

  // 城門：兩座塔加拱樑
  const gz = -TOWN.gateZ;
  for (const s of [-1, 1]) {
    add(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 11, 12), stone)).position.set(s * 6, heightAt(s * 6, gz) + 5.5, gz);
    const cap = add(new THREE.Mesh(new THREE.ConeGeometry(2.8, 3, 12), roof));
    cap.position.set(s * 6, heightAt(s * 6, gz) + 12.5, gz);
    obstacles.push({ x: s * 6, z: gz, r: 2.3 });
  }
  const beam = add(new THREE.Mesh(new THREE.BoxGeometry(10, 3, 2.4), stone));
  beam.position.set(0, heightAt(0, gz) + 8, gz);
  const board = sign('城門');
  board.position.set(0, heightAt(0, gz) + 5.4, gz + 1.4);
  parent.add(board);
  spots.push({ id: 'gate', label: '城門', x: 0, z: gz });
  return { spots, obstacles };
}
