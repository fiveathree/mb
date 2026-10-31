import * as THREE from 'three';

const MAX = 640;
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

const RING_DENSITY = 7;
const PILLAR_COUNT = 44;
const BOLTS = 6;
const BOLT_SEGMENTS = 8;
const BOLT_TOP = 42;
const BOLT_LIFE = 0.18;

interface Bolt {
  group: THREE.Group;
  life: number;
}

export class Fx {
  private bolts: Bolt[] = [];
  private nextBolt = 0;
  private flash = new THREE.PointLight(0xc8dcff, 0, 70, 1.2);
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
    scene.add(this.flash);
    const geo = new THREE.BoxGeometry(0.28, 1, 0.28);
    const mat = new THREE.MeshBasicMaterial({ color: 0xe8f0ff });
    for (let i = 0; i < BOLTS; i++) {
      const group = new THREE.Group();
      for (let k = 0; k < BOLT_SEGMENTS; k++) group.add(new THREE.Mesh(geo, mat));
      group.visible = false;
      scene.add(group);
      this.bolts.push({ group, life: 0 });
    }
  }

  /** 閃電：由天頂曲折劈到地面 */
  bolt(pos: THREE.Vector3) {
    const b = this.bolts[this.nextBolt];
    this.nextBolt = (this.nextBolt + 1) % BOLTS;
    b.life = BOLT_LIFE;
    b.group.visible = true;
    let x = pos.x + (Math.random() - 0.5) * 8;
    let z = pos.z + (Math.random() - 0.5) * 8;
    let y = pos.y + BOLT_TOP;
    const step = BOLT_TOP / BOLT_SEGMENTS;
    b.group.children.forEach((seg, i) => {
      const left = BOLT_SEGMENTS - i - 1;
      const nx = left ? pos.x + (x - pos.x) * 0.72 + (Math.random() - 0.5) * 3 : pos.x;
      const nz = left ? pos.z + (z - pos.z) * 0.72 + (Math.random() - 0.5) * 3 : pos.z;
      const ny = y - step;
      const from = new THREE.Vector3(x, y, z);
      const to = new THREE.Vector3(nx, ny, nz);
      seg.position.copy(from).add(to).multiplyScalar(0.5);
      seg.scale.set(1, from.distanceTo(to), 1);
      seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
      x = nx;
      y = ny;
      z = nz;
    });
    this.flash.color.set(0xc8dcff);
    this.flash.position.set(pos.x, pos.y + 8, pos.z);
    this.flash.intensity = 260;
  }

  /** 地上一圈向外散 */
  ring(pos: THREE.Vector3, radius: number, color: number) {
    this.c.set(color);
    const count = Math.round(RING_DENSITY * radius);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.spawn(pos.x + Math.cos(a) * radius, pos.y, pos.z + Math.sin(a) * radius, Math.cos(a) * 3, 2 + Math.random() * 3, Math.sin(a) * 3);
    }
    this.mesh.instanceColor!.needsUpdate = true;
  }

  /** 由地面衝上天嘅光柱 */
  pillar(pos: THREE.Vector3, color: number, width: number) {
    this.c.set(color);
    for (let i = 0; i < PILLAR_COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * width;
      this.spawn(pos.x + Math.cos(a) * r, pos.y + Math.random() * 3, pos.z + Math.sin(a) * r, 0, 10 + Math.random() * 16, 0);
    }
    this.mesh.instanceColor!.needsUpdate = true;
  }

  /** 招式嘅強光 */
  flashAt(pos: THREE.Vector3, color: number) {
    this.flash.color.set(color);
    this.flash.position.copy(pos);
    this.flash.intensity = 320;
  }

  private spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number) {
    const p = this.parts[this.next];
    p.max = p.life = 0.4 + Math.random() * 0.4;
    Object.assign(p, { x, y, z, vx, vy, vz });
    this.mesh.setColorAt(this.next, this.c);
    this.next = (this.next + 1) % MAX;
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
    this.flash.intensity *= Math.exp(-14 * dt);
    for (const b of this.bolts) {
      if (b.life <= 0) continue;
      b.life -= dt;
      if (b.life <= 0) b.group.visible = false;
    }
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
