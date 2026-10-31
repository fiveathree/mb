import * as THREE from 'three';
import { COLORS } from '../data/battlefield';
import { ARCHER_AI } from '../data/units';
import { COMBAT } from '../data/combat';
import { SADDLE_HEIGHT } from '../data/horses';
import { SPELL_GLOW, type WeaponDef } from '../data/weapons';
import { clamp, flatDist, rad, type Combatant } from './entities';
import { explode, shotHit, type CombatWorld } from './combat';
import { heightAt } from './terrain';

const MAX = 500;
const SUBSTEPS = 3;
const ROCK_SCALE = 25;
const STRIKE_RANGE = 90;
const ORB_MIN = 0.35;
const ORB_PER_AOE = 0.16;
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

const TMP_COLOR = new THREE.Color();
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const FORWARD = new THREE.Vector3(0, 0, 1);

export class Projectiles {
  private mesh: THREE.InstancedMesh;
  private shots: Shot[] = [];
  private next = 0;
  private dummy = new THREE.Object3D();
  /** 法術光球 */
  private orbs: THREE.InstancedMesh;
  private trail = 0;

  constructor(scene: THREE.Scene) {
    this.orbs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial(), MAX);
    this.orbs.frustumCulled = false;
    const white = new THREE.Color(0xffffff);
    for (let i = 0; i < MAX; i++) {
      this.orbs.setMatrixAt(i, ZERO);
      this.orbs.setColorAt(i, white);
    }
    scene.add(this.orbs);
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
      this.orbs.setMatrixAt(i, ZERO);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.orbs.instanceMatrix.needsUpdate = true;
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
    if (w.spell && c.mp < w.spell.mp) {
      if (c === world.player) world.announce('法力不足', 'guard');
      return;
    }
    if (w.spell) c.mp -= w.spell.mp;
    else c.ammo[w.id]--;

    const muzzle = v1.set(c.pos.x, c.pos.y + MUZZLE_HEIGHT + (c.horse ? SADDLE_HEIGHT - 0.8 : 0), c.pos.z);
    const dir = v2;
    if (w.spell?.strike) {
      world.strike(c, w, strikePoint(world, c, muzzle), r.minDamageMult + (1 - r.minDamageMult) * c.charge);
      return;
    }
    if (c === world.player) {
      world.playerAim(muzzle, dir);
      world.sfx.arrow();
    } else {
      aiAim(world, c, muzzle, r.speed, dir);
    }

    const spread = rad(Projectiles.spreadDeg(c));
    dir.x += (Math.random() - 0.5) * 2 * spread;
    dir.y += (Math.random() - 0.5) * 2 * spread;
    dir.z += (Math.random() - 0.5) * 2 * spread;
    dir.normalize();

    const glow = SPELL_GLOW[w.id];
    if (glow) {
      this.orbs.setColorAt(this.next, TMP_COLOR.set(glow));
      this.orbs.instanceColor!.needsUpdate = true;
    }
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

  /** 投石：指定落點同飛行時間嘅拋物線 */
  lob(owner: Combatant, w: WeaponDef, from: THREE.Vector3, to: THREE.Vector3, flight: number) {
    const s = this.shots[this.next];
    this.next = (this.next + 1) % MAX;
    s.live = true;
    s.stuck = 0;
    s.owner = owner;
    s.weapon = w;
    s.mult = 1;
    s.pos.copy(from);
    s.vel.set((to.x - from.x) / flight, (to.y - from.y) / flight + 0.5 * COMBAT.gravity * flight, (to.z - from.z) / flight);
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
        if (!s.weapon!.spell?.flat) s.vel.y -= COMBAT.gravity * step;
        const px = s.pos.x;
        const pz = s.pos.z;
        s.pos.addScaledVector(s.vel, step);
        if (world.wallBlocks(px, pz, s.pos.x, s.pos.z, s.pos.y)) {
          s.live = false;
          if (s.weapon!.spell?.aoe) explode(world, s.owner!, s.weapon!, s.pos, s.mult);
          else if (!s.weapon!.spell) s.stuck = R.stuckLife;
          break;
        }
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
            if ((onRider || onHorse) && s.weapon!.spell?.aoe) {
              s.live = false;
              explode(world, s.owner!, s.weapon!, s.pos, s.mult);
              break;
            }
            if (onRider || onHorse) {
              shotHit(world, s.owner!, t, s.weapon!, s.mult, (y - RIDER_BODY_FROM + 0.4) / (RIDER_HEIGHT - RIDER_BODY_FROM + 0.4), onHorse, s.vel.x, s.vel.z);
              s.live = false;
              break;
            }
          } else if (dist < Math.max(R.hitRadius, t.def.radius) && y > 0 && y < HUMAN_HEIGHT * (t.def.boss ? 2.5 : 1)) {
            s.live = false;
            if (s.weapon!.spell?.aoe) explode(world, s.owner!, s.weapon!, s.pos, s.mult);
            else shotHit(world, s.owner!, t, s.weapon!, s.mult, y / HUMAN_HEIGHT, false, s.vel.x, s.vel.z);
            s.live = false;
            break;
          }
        }
        if (s.live && s.pos.y <= heightAt(s.pos.x, s.pos.z)) {
          s.live = false;
          if (s.weapon!.spell?.aoe) explode(world, s.owner!, s.weapon!, s.pos, s.mult);
          else if (!s.weapon!.spell) s.stuck = R.stuckLife;
        }
      }

      if (!s.live && s.stuck <= 0) {
        this.mesh.setMatrixAt(i, ZERO);
        this.orbs.setMatrixAt(i, ZERO);
        continue;
      }
      const glow = s.weapon ? SPELL_GLOW[s.weapon.id] : undefined;
      if (glow) {
        // 法術係發光實體，拖一條尾
        const r = ORB_MIN + (s.weapon!.spell?.aoe ?? 0) * ORB_PER_AOE;
        this.dummy.position.copy(s.pos);
        this.dummy.quaternion.identity();
        this.dummy.scale.setScalar(r);
        this.dummy.updateMatrix();
        this.orbs.setMatrixAt(i, this.dummy.matrix);
        this.mesh.setMatrixAt(i, ZERO);
        if (this.trail++ % 2 === 0) world.fx.burst(s.pos, glow, 2, 1.5);
        continue;
      }
      this.dummy.position.copy(s.pos);
      if (s.weapon?.id === 'siege_rock') this.dummy.scale.set(ROCK_SCALE, ROCK_SCALE, ROCK_SCALE * 0.05);
      else this.dummy.scale.set(1, 1, 1);
      this.dummy.quaternion.setFromUnitVectors(FORWARD, v1.copy(s.vel).normalize());
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.orbs.instanceMatrix.needsUpdate = true;
  }
}

/** 落雷落點：主角睇住邊就劈邊，AI 劈目標 */
function strikePoint(world: CombatWorld, c: Combatant, muzzle: THREE.Vector3): THREE.Vector3 {
  const out = new THREE.Vector3();
  if (c !== world.player) {
    const t = c.ai?.target;
    return t ? out.copy(t.pos) : out.set(c.pos.x, c.pos.y, c.pos.z);
  }
  const dir = new THREE.Vector3();
  world.playerAim(muzzle, dir);
  for (let d = 2; d < STRIKE_RANGE; d += 1) {
    out.copy(muzzle).addScaledVector(dir, d);
    const ground = heightAt(out.x, out.z);
    const foe = world.units.some((u) => u.team !== c.team && !u.dead && flatDist(u.pos, out) < 1.6 && out.y - u.pos.y < 3);
    if (out.y <= ground || foe) break;
  }
  out.y = heightAt(out.x, out.z);
  return out;
}

/** AI 按飛行時間預判目標，計拋物線 */
function aiAim(world: CombatWorld, c: Combatant, muzzle: THREE.Vector3, speed: number, out: THREE.Vector3) {
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
  // 隔牆就拋高射過去
  if (c.weapon.spell?.flat || !world.wallBlocks(muzzle.x, muzzle.z, tx, tz, muzzle.y + 1)) return;
  const g = COMBAT.gravity;
  const v2 = speed * speed;
  const disc = v2 * v2 - g * (g * dist * dist + 2 * (ty - muzzle.y) * v2);
  if (disc < 0) return;
  const pitch = Math.atan2(v2 + Math.sqrt(disc), g * dist);
  out.set((dx / dist) * Math.cos(pitch), Math.sin(pitch), (dz / dist) * Math.cos(pitch));
}
