import * as THREE from 'three';

const MAX = 320;
const GRAVITY = 12;

interface Particle {
  life: number;
  max: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export class Fx {
  private mesh: THREE.InstancedMesh;
  private parts: Particle[] = [];
  private next = 0;
  private m = new THREE.Matrix4();
  private c = new THREE.Color();

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial(), MAX);
    this.mesh.frustumCulled = false;
    this.mesh.count = MAX;
    for (let i = 0; i < MAX; i++) {
      this.parts.push({ life: 0, max: 1, x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0 });
      this.mesh.setColorAt(i, this.c.set(0xffffff));
      this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
    }
    scene.add(this.mesh);
  }

  burst(pos: THREE.Vector3, color: number, count: number, speed: number) {
    this.c.set(color);
    for (let i = 0; i < count; i++) {
      const p = this.parts[this.next];
      p.max = p.life = 0.35 + Math.random() * 0.4;
      p.x = pos.x;
      p.y = pos.y;
      p.z = pos.z;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.65);
      p.vx = Math.cos(a) * s;
      p.vz = Math.sin(a) * s;
      p.vy = speed * Math.random() * 0.9;
      this.mesh.setColorAt(this.next, this.c);
      this.next = (this.next + 1) % MAX;
    }
    this.mesh.instanceColor!.needsUpdate = true;
  }

  update(dt: number) {
    for (let i = 0; i < MAX; i++) {
      const p = this.parts[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy -= GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const s = p.life > 0 ? p.life / p.max : 0;
      this.m.makeScale(s, s, s).setPosition(p.x, p.y, p.z);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
