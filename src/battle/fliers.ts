import * as THREE from 'three';
import { SKY_FAUNA } from '../data/world';
import { loftGeo, wingGeo } from './shapes';

const COUNT = 6;
const WING_SCALE = 0.09;

interface Flier {
  root: THREE.Group;
  wings: THREE.Mesh[];
  angle: number;
  radius: number;
  speed: number;
  flap: number;
}

/** 奇幻戰場：飛行生物喺頭頂盤旋，只係佈景 */
export class Fliers {
  private list: Flier[] = [];
  private group = new THREE.Group();
  private t = 0;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  private clear() {
    for (const f of this.list) {
      f.root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    }
    this.group.clear();
    this.list = [];
  }

  set(kinds: string[]) {
    this.clear();
    if (!kinds.length) return;
    for (let i = 0; i < COUNT; i++) {
      const def = SKY_FAUNA[kinds[i % kinds.length]];
      const size = def.wing * WING_SCALE;
      const mat = new THREE.MeshLambertMaterial({ color: def.color, side: THREE.DoubleSide });
      const root = new THREE.Group();
      const r = size * 0.13;
      root.add(new THREE.Mesh(loftGeo([
        { z: -size * 0.5, y: 0, rx: r * 0.15, ry: r * 0.15 }, { z: -size * 0.1, y: 0, rx: r, ry: r },
        { z: size * 0.25, y: 0.02 * size, rx: r * 0.8, ry: r * 0.8 }, { z: size * 0.46, y: 0.04 * size, rx: r * 0.1, ry: r * 0.1 },
      ]), mat));
      const wings = [1, -1].map((s) => {
        const wing = new THREE.Mesh(wingGeo().scale(s * size, size * 0.03, size * 0.8), mat);
        root.add(wing);
        return wing;
      });
      root.position.y = 30 + i * 6;
      this.group.add(root);
      this.list.push({
        root, wings, angle: (i / COUNT) * Math.PI * 2, radius: 50 + i * 16, speed: def.speed * 0.002 * (i % 2 ? 1 : -1), flap: def.flap,
      });
    }
  }

  update(dt: number) {
    this.t += dt;
    for (const f of this.list) {
      f.angle += f.speed * dt;
      f.root.position.x = Math.cos(f.angle) * f.radius;
      f.root.position.z = Math.sin(f.angle) * f.radius;
      f.root.rotation.y = -f.angle + (f.speed > 0 ? Math.PI : 0);
      const beat = Math.sin(this.t * f.flap) * 0.5;
      f.wings[0].rotation.z = beat;
      f.wings[1].rotation.z = -beat;
    }
  }
}
