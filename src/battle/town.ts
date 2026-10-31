import * as THREE from 'three';
import { TOWN, TOWN_STYLES, type TownStyleId } from '../data/battlefield';
import { heightAt, type Obstacle } from './terrain';

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
  g.font = 'bold 36px "Microsoft JhengHei", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) }));
  sprite.scale.set(7, 1.75, 1);
  return sprite;
}

/** 城鎮場景：中央廣場，七間舖頭圍住，外面一圈民居 */
export function buildTown(parent: THREE.Object3D, setup: { shops: [string, string][]; style: TownStyleId }): { spots: TownSpot[]; obstacles: Obstacle[] } {
  const style = TOWN_STYLES[setup.style];
  const wall = new THREE.MeshLambertMaterial({ color: style.wall, flatShading: true });
  const roof = new THREE.MeshLambertMaterial({ color: style.roof, flatShading: true });
  const stone = new THREE.MeshLambertMaterial({ color: 0x8a8678, flatShading: true });
  const obstacles: Obstacle[] = [];
  const house = (x: number, z: number, w: number, d: number, h: number, yaw: number) => {
    const y = heightAt(x, z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wall);
    body.position.set(x, y + h / 2, z);
    body.rotation.y = yaw;
    const top = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.6, style.roofH, 4), roof);
    top.position.set(x, y + h + style.roofH / 2, z);
    top.rotation.y = yaw + Math.PI / 4;
    body.castShadow = top.castShadow = true;
    parent.add(body, top);
    obstacles.push({ x, z, r: Math.max(w, d) * 0.62 });
  };

  const spots: TownSpot[] = setup.shops.map(([id, label], i) => {
    const a = -Math.PI / 2 + ((i + 1) * Math.PI * 2) / (setup.shops.length + 1);
    const yaw = -a + Math.PI / 2;
    house(Math.cos(a) * TOWN.shopRadius, Math.sin(a) * TOWN.shopRadius, 12, 10, 6, yaw);
    const x = Math.cos(a) * TOWN.doorRadius;
    const z = Math.sin(a) * TOWN.doorRadius;
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3, 0.4), new THREE.MeshBasicMaterial({ color: 0x3a2412 }));
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
    if (Math.abs(Math.sin(a) + 1) < 0.08) continue;
    house(Math.cos(a) * TOWN.houseRadius, Math.sin(a) * TOWN.houseRadius, 9, 8, 4.5, -a);
  }

  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3, 1, 8), stone);
  fountain.position.set(0, heightAt(0, 0) + 0.5, 0);
  parent.add(fountain);
  obstacles.push({ x: 0, z: 0, r: 3.2 });

  // 城門
  const gz = -TOWN.gateZ;
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(1.6, 8, 1.6), stone);
    post.position.set(s * 5, heightAt(s * 5, gz) + 4, gz);
    parent.add(post);
    obstacles.push({ x: s * 5, z: gz, r: 1.2 });
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(12, 1.4, 1.6), stone);
  beam.position.set(0, heightAt(0, gz) + 7.6, gz);
  const board = sign('城門');
  board.position.set(0, heightAt(0, gz) + 5, gz + 0.9);
  parent.add(beam, board);
  spots.push({ id: 'gate', label: '城門', x: 0, z: gz });
  return { spots, obstacles };
}
