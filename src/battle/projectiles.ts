import * as THREE from 'three';
import { COLORS } from '../data/battlefield';
import { ARCHER_AI } from '../data/units';
import { COMBAT } from '../data/combat';
import { SADDLE_HEIGHT } from '../data/horses';
import type { WeaponDef } from '../data/weapons';
import { clamp, flatDist, rad, type Combatant } from './entities';
import { shotHit, type CombatWorld } from './combat';
import { heightAt } from './terrain';

const MAX = 500;
const SUBSTEPS = 3;
const HUMAN_HEIGHT = 1.8;
const RIDER_HEIGHT = 3;
const RIDER_BODY_FROM = 1.65;
const MUZZLE_HEIGHT = 1.5;
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

interface Shot {
  live: boolean;
  stuck: number;
  owner: Combatant | null;
  weapon: WeaponDef | null;
  mult: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const FORWARD = new THREE.Vector3(0, 0, 1);

export class Projectiles {
  private mesh: THREE.InstancedMesh;
  private shots: Shot[] = [];
  private next = 0;
  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.03, 0.03, 0.9),
      new THREE.MeshBasicMaterial({ color: COLORS.arrow }),
      MAX,
    );
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < MAX; i++) {
      this.shots.push({
        live: false, stuck: 0, owner: null, weapon: null, mult: 1, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      });
      this.mesh.setMatrixAt(i, ZERO);
    }
    scene.add(this.mesh);
  }

  reset() {
    for (let i = 0; i < MAX; i++) {
      this.shots[i].live = false;
      this.shots[i].stuck = 0;
      this.mesh.setMatrixAt(i, ZERO);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** 計散布（度），HUD 準星都用 */
  static spreadDeg(c: Combatant): number {
    const r = c.weapon.ranged;
    if (!r) return 0;
    const speedRatio = c.horse ? clamp(Math.abs(c.horse.speed) / c.horse.def.gallopSpeed, 0, 1) : 0;
    return (r.spreadDeg + (1 - c.charge) * r.undrawnSpreadDeg + speedRatio * r.mountedSpreadDeg) * (c.def.spreadMult ?? 1);
  }

  fire(world: CombatWorld, c: Combatant) {
    const w = c.weapon;
    const r = w.ranged!;
    if ((c.ammo[w.id] ?? 0) <= 0) return;
    c.ammo[w.id]--;

    const muzzle = v1.set(c.pos.x, c.pos.y + MUZZLE_HEIGHT + (c.horse ? SADDLE_HEIGHT - 0.8 : 0), c.pos.z);
    const dir = v2;
    if (c === world.player) {
      world.playerAim(muzzle, dir);
      world.sfx.whoosh();
    } else {
      aiAim(c, muzzle, r.speed, dir);
    }

    const spread = rad(Projectiles.spreadDeg(c));
    dir.x += (Math.random() - 0.5) * 2 * spread;
    dir.y += (Math.random() - 0.5) * 2 * spread;
    dir.z += (Math.random() - 0.5) * 2 * spread;
    dir.normalize();

    const s = this.shots[this.next];
    this.next = (this.next + 1) % MAX;
    s.live = true;
    s.stuck = 0;
    s.owner = c;
    s.weapon = w;
    s.mult = r.minDamageMult + (1 - r.minDamageMult) * c.charge;
    s.pos.copy(muzzle);
    s.vel.copy(dir).multiplyScalar(r.speed).add(c.velocity);
  }

  update(world: CombatWorld, dt: number) {
    const R = COMBAT.ranged;
    for (let i = 0; i < MAX; i++) {
      const s = this.shots[i];
      if (s.stuck > 0) {
        s.stuck -= dt;
        if (s.stuck <= 0) this.mesh.setMatrixAt(i, ZERO);
        continue;
      }
      if (!s.live) continue;

      const step = dt / SUBSTEPS;
      for (let k = 0; k < SUBSTEPS && s.live; k++) {
        s.vel.y -= COMBAT.gravity * step;
        s.pos.addScaledVector(s.vel, step);
        for (const t of world.units) {
          if (t.dead || t.team === s.owner!.team) continue;
          const dx = t.pos.x - s.pos.x;
          if (dx > 3 || dx < -3) continue;
          const dz = t.pos.z - s.pos.z;
          if (dz > 3 || dz < -3) continue;
          const y = s.pos.y - t.pos.y;
          const dist = Math.hypot(dx, dz);
          if (t.horse) {
            const onRider = y >= RIDER_BODY_FROM && y <= RIDER_HEIGHT && dist < R.hitRadius;
            const onHorse = y > 0 && y < RIDER_BODY_FROM && dist < 1;
            if (onRider || onHorse) {
              shotHit(world, s.owner!, t, s.weapon!, s.mult, (y - RIDER_BODY_FROM + 0.4) / (RIDER_HEIGHT - RIDER_BODY_FROM + 0.4), onHorse, s.vel.x, s.vel.z);
              s.live = false;
              break;
            }
          } else if (dist < R.hitRadius && y > 0 && y < HUMAN_HEIGHT) {
            shotHit(world, s.owner!, t, s.weapon!, s.mult, y / HUMAN_HEIGHT, false, s.vel.x, s.vel.z);
            s.live = false;
            break;
          }
        }
        if (s.live && s.pos.y <= heightAt(s.pos.x, s.pos.z)) {
          s.live = false;
          s.stuck = R.stuckLife;
        }
      }

      if (!s.live && s.stuck <= 0) {
        this.mesh.setMatrixAt(i, ZERO);
        continue;
      }
      this.dummy.position.copy(s.pos);
      this.dummy.quaternion.setFromUnitVectors(FORWARD, v1.copy(s.vel).normalize());
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** AI 按飛行時間預判目標，計拋物線 */
function aiAim(c: Combatant, muzzle: THREE.Vector3, speed: number, out: THREE.Vector3) {
  const t = c.ai?.target;
  if (!t) {
    out.set(Math.sin(c.aimYaw), 0.1, Math.cos(c.aimYaw));
    return;
  }
  const flight = flatDist(c.pos, t.pos) / speed;
  const v = t.velocity;
  const tx = t.pos.x + v.x * flight * ARCHER_AI.lead;
  const tz = t.pos.z + v.z * flight * ARCHER_AI.lead;
  const ty = t.pos.y + 1.1 + (t.horse ? 0.6 : 0);
  const dx = tx - muzzle.x;
  const dz = tz - muzzle.z;
  const dist = Math.hypot(dx, dz);
  const time = dist / speed;
  out.set(dx / time, (ty - muzzle.y) / time + 0.5 * COMBAT.gravity * time, dz / time).normalize();
}
