import * as THREE from 'three';
import { BATTLEFIELD as F, COLORS } from '../data/battlefield';
import { CAMERA, COMBAT, FEEL } from '../data/combat';
import { HORSE_RADIUS, type HorseDef } from '../data/horses';
import { ENEMY_UNITS, PLAYER_UNIT } from '../data/units';
import { WEAPONS } from '../data/weapons';
import { makeAi, updateAi } from './ai';
import { Sfx } from './audio';
import {
  startBlock, startCharge, updateAction, updateCouch, updateRam, type BattleStats, type CombatWorld,
} from './combat';
import { Combatant, Horse, angleDiff, clamp, flatDist, moveToward } from './entities';
import { Fx } from './fx';
import { updateHorse } from './horse';
import { Input } from './input';
import { buildHorse, buildHuman, syncHorse, syncHuman } from './models';
import { buildTerrain, heightAt, type Obstacle } from './terrain';
import type { Hud } from '../ui/hud';

const GRAVITY = 16;
const JUMP_SPEED = 5.5;
const MOUNT_RANGE = 3.2;
const MAX_DISMOUNT_SPEED = 6;
const RESULT_DELAY = 1.6;

export type BattleResult = { win: boolean; stats: BattleStats };

export class Battle implements CombatWorld {
  readonly renderer: THREE.WebGLRenderer;
  readonly sfx = new Sfx();
  readonly input: Input;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(CAMERA.baseFov, 1, 0.1, 500);
  private sun = new THREE.DirectionalLight(0xfff0d6, 2.3);
  private obstacles: Obstacle[];
  fx: Fx;

  units: Combatant[] = [];
  horses: Horse[] = [];
  player!: Combatant;
  stats: BattleStats = { kills: 0, bestHit: 0, topSpeed: 0, time: 0 };

  camYaw = 0;
  camPitch = 0.16;
  private shakeAmt = 0;
  private freezeT = 0;
  private slowT = 0;
  private endT = -1;
  private win = false;
  private hoofPhase = 0;
  running = false;
  private lastNow = 0;
  private fpsT = 0;
  private fpsN = 0;
  fps = 0;
  onEnd: ((r: BattleResult) => void) | null = null;
  onPauseKey: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, private hud: Hud) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.input = new Input(canvas);

    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(COLORS.fog, 70, 300);
    this.scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x6a6a4a, 1.5));
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = this.sun.shadow.camera;
    s.left = s.bottom = -45;
    s.right = s.top = 45;
    s.far = 200;
    this.sun.shadow.bias = -0.0006;
    this.scene.add(this.sun, this.sun.target);

    this.obstacles = buildTerrain(this.scene);
    this.fx = new Fx(this.scene);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** 開一場新戰鬥 */
  start(horseDef: HorseDef) {
    for (const u of this.units) this.scene.remove(u.rig.root);
    for (const h of this.horses) this.scene.remove(h.rig.root);
    this.units = [];
    this.horses = [];
    this.stats = { kills: 0, bestHit: 0, topSpeed: 0, time: 0 };
    this.endT = -1;
    this.freezeT = this.slowT = this.shakeAmt = 0;
    this.camYaw = 0;
    this.camPitch = 0.16;

    const pdef = PLAYER_UNIT;
    const player = new Combatant(pdef, 0, buildHuman(pdef, pdef.weapons.map((id) => WEAPONS[id]), this.scene));
    const horse = new Horse(horseDef, buildHorse(horseDef, this.scene));
    horse.pos.set(F.playerStart.x, heightAt(F.playerStart.x, F.playerStart.z), F.playerStart.z);
    horse.rider = player;
    player.horse = horse;
    player.pos.copy(horse.pos);
    this.player = player;
    this.units.push(player);
    this.horses.push(horse);

    F.enemies.forEach((id, i) => {
      const def = ENEMY_UNITS[id];
      const e = new Combatant(def, 1, buildHuman(def, def.weapons.map((w) => WEAPONS[w]), this.scene));
      const col = i % 5;
      const row = Math.floor(i / 5);
      const x = F.enemyCenter.x + (col - 2) * F.enemySpacing;
      const z = F.enemyCenter.z + row * F.enemySpacing;
      e.pos.set(x, heightAt(x, z), z);
      e.yaw = e.aimYaw = Math.PI;
      e.ai = makeAi(i, F.enemies.length);
      this.units.push(e);
    });
    this.running = true;
    this.lastNow = 0;
  }

  // ── CombatWorld ──
  freeze(s: number) {
    this.freezeT = Math.max(this.freezeT, s);
  }
  slowMo() {
    this.slowT = FEEL.slowMo.duration;
  }
  shake(a: number) {
    this.shakeAmt = Math.max(this.shakeAmt, a);
  }
  announce(text: string, kind: 'hit' | 'kill' | 'guard' | 'hurt') {
    this.hud.announce(text, kind);
  }
  onPlayerDismounted(h: Horse) {
    this.player.yaw = h.heading;
  }

  private frame(now: number) {
    if (!this.lastNow) this.lastNow = now;
    const real = Math.min((now - this.lastNow) / 1000, 1 / 20);
    this.lastNow = now;

    this.fpsN++;
    this.fpsT += real;
    if (this.fpsT >= 0.5) {
      this.fps = Math.round(this.fpsN / this.fpsT);
      this.fpsN = 0;
      this.fpsT = 0;
    }

    if (this.running && this.player) {
      let dt = real;
      if (this.freezeT > 0) {
        this.freezeT -= real;
        dt = 0;
      } else if (this.slowT > 0) {
        this.slowT -= real;
        dt *= FEEL.slowMo.scale;
      }
      this.simulate(dt, real);
      this.updateCamera(real);
      this.hud.update(this);
    } else if (!this.player) {
      this.idleCamera(now);
    }
    this.input.endFrame(real);
    this.renderer.render(this.scene, this.camera);
  }

  private idleCamera(now: number) {
    const a = now * 0.00004;
    this.camera.position.set(Math.sin(a) * 90, 22, Math.cos(a) * 90);
    this.camera.lookAt(0, 4, 0);
  }

  private simulate(dt: number, real: number) {
    const p = this.player;
    this.handlePlayerInput(dt);
    this.stats.time += dt;

    for (const u of this.units) {
      if (u === p || u.dead) continue;
      updateAi(u, dt, this);
    }
    for (const u of this.units) {
      if (!u.dead) updateAction(u, dt, this);
    }
    if (!p.dead) {
      updateCouch(p, dt, this);
      updateRam(p, this);
    }
    this.updateBodies(dt);
    this.resolveCollisions();
    this.fx.update(dt);

    for (const h of this.horses) syncHorse(h, dt);
    for (const u of this.units) syncHuman(u, dt);

    const horse = p.horse;
    if (horse) {
      this.stats.topSpeed = Math.max(this.stats.topSpeed, horse.speed);
      const ratio = horse.speed / horse.def.gallopSpeed;
      this.hoofPhase += horse.speed * dt * 0.42;
      if (this.hoofPhase >= 1 && horse.grounded) {
        this.hoofPhase -= 1;
        this.sfx.hoof(ratio);
        if (ratio > 0.5) {
          this.fx.burst(new THREE.Vector3(horse.pos.x, horse.pos.y + 0.1, horse.pos.z), COLORS.dust, 3, 1.8);
        }
      }
    }

    if (this.endT < 0) {
      const alive = this.units.some((u) => u.team !== 0 && !u.dead);
      if (p.dead || !alive) {
        this.win = !p.dead;
        this.endT = RESULT_DELAY;
      }
    } else {
      this.endT -= real;
      if (this.endT <= 0) {
        this.running = false;
        this.onEnd?.({ win: this.win, stats: this.stats });
      }
    }
  }

  private handlePlayerInput(dt: number) {
    const p = this.player;
    const i = this.input;
    if (i.pressed('Escape')) this.onPauseKey?.();
    if (i.pressed('KeyM')) this.sfx.muted = !this.sfx.muted;

    this.camYaw -= i.mouseDx * CAMERA.mouseSensitivity;
    this.camPitch = clamp(this.camPitch + i.mouseDy * CAMERA.mouseSensitivity, CAMERA.minPitch, CAMERA.maxPitch);

    if (p.dead) {
      for (const h of this.horses) updateHorse(h, { throttle: 0, turn: 0, sprint: false, jump: false }, dt, this.obstacles);
      return;
    }
    p.aimYaw = this.camYaw;

    if (p.phase === 'idle') {
      const step = i.pressed('KeyQ') ? -1 : i.pressed('KeyE') ? 1 : 0;
      if (step) {
        p.weaponIdx = (p.weaponIdx + step + p.weapons.length) % p.weapons.length;
        p.couched = false;
      }
    }

    const h = p.horse;
    if (i.pressed('KeyF')) this.toggleMount();
    if (i.pressed('KeyX')) this.toggleCouch();

    const throttle = (i.down('KeyW') ? 1 : 0) - (i.down('KeyS') ? 1 : 0);
    const strafe = (i.down('KeyA') ? 1 : 0) - (i.down('KeyD') ? 1 : 0);
    const sprint = i.down('ShiftLeft') || i.down('ShiftRight');
    const jump = i.pressed('Space');

    for (const horse of this.horses) {
      const ctl = horse === h
        ? { throttle, turn: strafe, sprint, jump }
        : { throttle: 0, turn: 0, sprint: false, jump: false };
      const turned = updateHorse(horse, ctl, dt, this.obstacles);
      if (horse === h) this.camYaw += turned * CAMERA.followHorseTurn;
    }

    if (p.horse) {
      p.pos.copy(p.horse.pos);
      p.yaw = p.horse.heading;
    } else if (p.grounded && p.phase !== 'stagger') {
      const fx = Math.sin(this.camYaw);
      const fz = Math.cos(this.camYaw);
      const mx = fx * throttle + fz * strafe;
      const mz = fz * throttle - fx * strafe;
      const len = Math.hypot(mx, mz) || 1;
      let speed = sprint ? p.def.walkSpeed : p.def.runSpeed;
      if (p.phase === 'charge' || p.phase === 'block') speed *= 0.55;
      if (p.phase === 'swing') speed *= 0.4;
      const step = 22 * dt;
      p.vel.x = moveToward(p.vel.x, (mx / len) * speed, step);
      p.vel.z = moveToward(p.vel.z, (mz / len) * speed, step);
      p.yaw += angleDiff(this.camYaw, p.yaw) * (1 - Math.exp(-14 * dt));
      if (jump) {
        p.vy = JUMP_SPEED;
        p.grounded = false;
      }
    }

    // 攻擊同格擋
    if (!p.couched) {
      if (p.phase === 'idle' && i.attackBuffer > 0) {
        i.attackBuffer = 0;
        startCharge(p, i.direction());
      } else if (p.phase === 'charge' && !i.lmb) {
        p.releaseQueued = true;
      }
      if (i.rmb) {
        if (p.phase === 'idle') startBlock(p, i.direction());
        else if (p.phase === 'block') p.blockDir = i.direction();
      } else if (p.phase === 'block') {
        p.phase = 'idle';
      }
    }
  }

  private toggleMount() {
    const p = this.player;
    if (p.horse) {
      const h = p.horse;
      if (h.speed > MAX_DISMOUNT_SPEED) {
        this.hud.announce('馬太快，落唔到', 'guard');
        return;
      }
      p.horse = null;
      h.rider = null;
      p.couched = false;
      p.pos.set(h.pos.x - Math.cos(h.heading) * 1.4, h.pos.y, h.pos.z + Math.sin(h.heading) * 1.4);
      p.vel.set(0, 0, 0);
      p.yaw = this.camYaw;
      return;
    }
    const horse = this.horses.find((h) => !h.dead && !h.rider && flatDist(h.pos, p.pos) < MOUNT_RANGE);
    if (!horse) {
      this.hud.announce('附近冇馬', 'guard');
      return;
    }
    p.horse = horse;
    horse.rider = p;
    p.vel.set(0, 0, 0);
    p.vy = 0;
    p.grounded = true;
  }

  private toggleCouch() {
    const p = this.player;
    if (p.couched) {
      p.couched = false;
      p.couchCooldown = COMBAT.couch.recoverTime;
      return;
    }
    if (!p.weapon.couchable) {
      this.hud.announce('要用騎槍（Q／E 切換）', 'guard');
    } else if (!p.horse || p.horse.speed < COMBAT.couch.minSpeed) {
      this.hud.announce('速度未夠，放唔平騎槍', 'guard');
    } else if (p.phase === 'idle' && p.couchCooldown <= 0) {
      p.couched = true;
    }
  }

  private updateBodies(dt: number) {
    for (const u of this.units) {
      if (u.dead) u.deadT += dt;
      if (u.horse) continue;
      const ground = heightAt(u.pos.x, u.pos.z);
      if (!u.grounded) {
        u.vy -= GRAVITY * dt;
        u.pos.y += u.vy * dt;
        if (u.pos.y <= ground) {
          u.pos.y = ground;
          u.grounded = true;
          u.vy = 0;
        }
      } else {
        u.pos.y = ground;
      }
      if (u.grounded && (u.dead || u.phase === 'stagger')) {
        const k = Math.exp(-(u.dead ? 5 : 7) * dt);
        u.vel.x *= k;
        u.vel.z *= k;
      }
      u.pos.x += u.vel.x * dt;
      u.pos.z += u.vel.z * dt;
    }
  }

  private resolveCollisions() {
    const alive = this.units.filter((u) => !u.dead);
    for (let i = 0; i < alive.length; i++) {
      const a = alive[i];
      for (let j = i + 1; j < alive.length; j++) {
        const b = alive[j];
        if (a.horse || b.horse) continue;
        const min = a.def.radius + b.def.radius;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < min && d > 0.001) {
          const push = (min - d) / 2;
          a.pos.x -= (dx / d) * push;
          a.pos.z -= (dz / d) * push;
          b.pos.x += (dx / d) * push;
          b.pos.z += (dz / d) * push;
        }
      }
      // 騎士同馬嘅低速碰撞
      if (!a.horse) {
        for (const h of this.horses) {
          if (h.dead) continue;
          const min = HORSE_RADIUS + a.def.radius;
          const dx = a.pos.x - h.pos.x;
          const dz = a.pos.z - h.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < min && d > 0.001) {
            a.pos.x = h.pos.x + (dx / d) * min;
            a.pos.z = h.pos.z + (dz / d) * min;
          }
        }
        for (const o of this.obstacles) {
          const min = o.r + a.def.radius;
          const dx = a.pos.x - o.x;
          const dz = a.pos.z - o.z;
          const d = Math.hypot(dx, dz);
          if (d < min && d > 0.001) {
            a.pos.x = o.x + (dx / d) * min;
            a.pos.z = o.z + (dz / d) * min;
          }
        }
        const r = Math.hypot(a.pos.x, a.pos.z);
        if (r > F.arenaRadius) {
          a.pos.x *= F.arenaRadius / r;
          a.pos.z *= F.arenaRadius / r;
        }
      }
    }
  }

  private updateCamera(dt: number) {
    const p = this.player;
    const h = p.horse;
    const pos = h ? h.pos : p.pos;
    const dist = h ? CAMERA.distanceMounted : CAMERA.distanceOnFoot;
    const height = h ? CAMERA.heightMounted : CAMERA.heightOnFoot;
    const yaw = this.camYaw;
    const cp = Math.cos(this.camPitch);
    const sp = Math.sin(this.camPitch);
    const fx = Math.sin(yaw) * cp;
    const fz = Math.cos(yaw) * cp;
    const rx = -Math.cos(yaw);
    const rz = Math.sin(yaw);
    const fy = pos.y + height;

    const camX = pos.x - fx * dist + rx * CAMERA.shoulderOffset;
    const camZ = pos.z - fz * dist + rz * CAMERA.shoulderOffset;
    const camY = Math.max(fy + sp * dist, heightAt(camX, camZ) + 0.4);

    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.6);
    const sh = this.shakeAmt * this.shakeAmt * 2;
    this.camera.position.set(
      camX + (Math.random() - 0.5) * sh,
      camY + (Math.random() - 0.5) * sh,
      camZ + (Math.random() - 0.5) * sh,
    );
    this.camera.lookAt(pos.x + fx * 12 + rx * CAMERA.shoulderOffset, fy - sp * 12 + 0.2, pos.z + fz * 12 + rz * CAMERA.shoulderOffset);

    const speedRatio = h ? clamp(h.speed / h.def.gallopSpeed, 0, 1) : 0;
    const fov = CAMERA.baseFov + CAMERA.speedFovBoost * speedRatio * speedRatio;
    this.camera.fov += (fov - this.camera.fov) * (1 - Math.exp(-5 * dt));
    this.camera.updateProjectionMatrix();

    this.sun.target.position.set(pos.x, pos.y, pos.z);
    this.sun.position.set(pos.x + 50, pos.y + 90, pos.z + 30);
  }
}
