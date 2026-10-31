import * as THREE from 'three';
import { LOD } from '../data/animation';
import { ARMIES, BATTLEFIELD as F, COLORS, FORMATION, REWARDS } from '../data/battlefield';
import { CAMERA, COMBAT, FEEL } from '../data/combat';
import { HORSES, HORSE_RADIUS, type HorseDef } from '../data/horses';
import {
  ENEMY_COMMAND, PLAYER_UNIT, ROLE_KEYS, ROLE_LABEL, TEAM_COLORS, UNITS, type Role, type UnitDef,
} from '../data/units';
import { WEAPONS } from '../data/weapons';
import { makeAi, updateAi } from './ai';
import { Sfx } from './audio';
import { Batches } from './batch';
import {
  startBlock, startCharge, updateAction, updateCouch, updateRam, type BattleStats, type CombatWorld,
} from './combat';
import { Combatant, Horse, angleDiff, clamp, flatDist, moveToward } from './entities';
import { Fx } from './fx';
import { updateHorse } from './horse';
import { Input } from './input';
import { buildHorse, buildHuman, syncHorse, syncHuman } from './models';
import { onDeath, teamMorale, tickMorale } from './morale';
import { Group, ORDER_LABEL, deployGroup, makeGroups, thinkEnemy, type OrderType } from './orders';
import { Projectiles } from './projectiles';
import { buildTerrain, heightAt, type Obstacle } from './terrain';
import type { Hud } from '../ui/hud';

const JUMP_SPEED = 5.5;
const MOUNT_RANGE = 3.2;
const MAX_DISMOUNT_SPEED = 6;
const RESULT_DELAY = 2;
const SLOT_REFRESH = 2;

export interface ReportRow {
  name: string;
  total: number;
  alive: number;
  dead: number;
  wounded: number;
  fled: number;
}

export interface BattleResult {
  win: boolean;
  retreated: boolean;
  playerDown: boolean;
  stats: BattleStats;
  rows: ReportRow[][];
  gold: number;
  exp: number;
  renown: number;
  captives: number;
}

export class Battle implements CombatWorld {
  readonly renderer: THREE.WebGLRenderer;
  readonly sfx = new Sfx();
  readonly input: Input;
  readonly camera = new THREE.PerspectiveCamera(CAMERA.baseFov, 1, 0.1, 500);
  private scene = new THREE.Scene();
  private sun = new THREE.DirectionalLight(0xfff0d6, 2.3);
  private obstacles: Obstacle[];
  private batches: Batches;
  fx: Fx;
  projectiles: Projectiles;

  units: Combatant[] = [];
  horses: Horse[] = [];
  groups: Group[][] = [];
  selected = new Set<Role>(ROLE_KEYS);
  player!: Combatant;
  /** 玩家最後騎過嘅馬，HUD 用 */
  lastHorse!: Horse;
  stats: BattleStats = { kills: 0, bestHit: 0, topSpeed: 0, time: 0 };

  camYaw = 0;
  camPitch = 0.16;
  private shakeAmt = 0;
  private freezeT = 0;
  private slowT = 0;
  private endT = -1;
  private win = false;
  private retreated = false;
  private hoofPhase = 0;
  private frameNo = 0;
  private moraleT = 0;
  private thinkT = 0;
  private slotT = 0;
  private followT = 0;
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
    this.scene.fog = new THREE.Fog(COLORS.fog, 90, 330);
    this.scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x6a6a4a, 1.5));
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = this.sun.shadow.camera;
    s.left = s.bottom = -60;
    s.right = s.top = 60;
    s.far = 220;
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun, this.sun.target);

    this.obstacles = buildTerrain(this.scene);
    this.batches = new Batches(this.scene);
    this.fx = new Fx(this.scene);
    this.projectiles = new Projectiles(this.scene);
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

  private createUnit(def: UnitDef, team: number, weaponIds: string[]): Combatant {
    const weapons = weaponIds.map((id) => WEAPONS[id]);
    const c = new Combatant(def, team, buildHuman(def, TEAM_COLORS[team], weapons, this.batches), weaponIds);
    this.units.push(c);
    return c;
  }

  private createHorse(def: HorseDef, rider: Combatant): Horse {
    const h = new Horse(def, buildHorse(def, this.batches));
    h.pos.copy(rider.pos);
    h.heading = rider.yaw;
    h.rider = rider;
    rider.horse = h;
    this.horses.push(h);
    return h;
  }

  /** 開一場新戰鬥 */
  start(horseDef: HorseDef, loadout: string[]) {
    this.batches.reset();
    this.projectiles.reset();
    this.units = [];
    this.horses = [];
    this.groups = [makeGroups(0), makeGroups(1)];
    this.selected = new Set(ROLE_KEYS);
    this.stats = { kills: 0, bestHit: 0, topSpeed: 0, time: 0 };
    this.endT = -1;
    this.retreated = false;
    this.freezeT = this.slowT = this.shakeAmt = 0;
    this.moraleT = this.thinkT = this.slotT = this.followT = 0;
    this.camYaw = 0;
    this.camPitch = 0.16;

    const pz = -FORMATION.startZ + FORMATION.holdAhead * 2;
    const player = this.createUnit(PLAYER_UNIT, 0, loadout);
    player.pos.set(0, heightAt(0, pz), pz);
    this.player = player;
    this.lastHorse = this.createHorse(horseDef, player);

    ARMIES.forEach((army, team) => {
      for (const entry of army) {
        const def = UNITS[entry.unit];
        const group = this.groups[team].find((g) => g.role === def.role)!;
        for (let i = 0; i < entry.count; i++) {
          const c = this.createUnit(def, team, def.weapons);
          c.ai = makeAi(group);
          group.members.push(c);
        }
      }
      for (const g of this.groups[team]) {
        deployGroup(g);
        for (const c of g.members) {
          const ai = c.ai!;
          c.pos.set(ai.slotX, heightAt(ai.slotX, ai.slotZ), ai.slotZ);
          c.yaw = c.aimYaw = g.facing;
          if (c.def.horse) this.createHorse(HORSES.find((h) => h.id === c.def.horse)!, c);
        }
      }
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
  onUnitDown(t: Combatant, by: Combatant) {
    t.wounded = t !== this.player && Math.random() < REWARDS.woundedChance;
    onDeath(t, by, this.units);
    if (t === this.player) this.hud.announce('你倒下咗，部隊繼續作戰', 'hurt');
  }
  playerAim(muzzle: THREE.Vector3, out: THREE.Vector3) {
    const R = COMBAT.ranged;
    const dir = this.camera.getWorldDirection(new THREE.Vector3());
    const p = this.camera.position.clone();
    let dist: number = R.maxAimDist;
    for (let t = 4; t < R.maxAimDist; t += 2) {
      p.copy(this.camera.position).addScaledVector(dir, t);
      if (p.y <= heightAt(p.x, p.z)) {
        dist = t;
        break;
      }
    }
    // 準星線上有敵人就以佢嘅距離歸零，否則肩膊鏡頭會令箭射偏
    for (const u of this.units) {
      if (u.team === this.player.team || u.dead) continue;
      out.copy(u.pos).sub(this.camera.position);
      out.y += 1.2;
      const t = out.dot(dir);
      if (t < 4 || t > dist) continue;
      if (out.addScaledVector(dir, -t).length() < R.aimAssistRadius) dist = t;
    }
    p.copy(this.camera.position).addScaledVector(dir, dist);
    out.copy(p).sub(muzzle);
    const range = out.length();
    out.normalize();
    // 向上補償到準星歸零距離，再遠就要自己預判
    const speed = this.player.weapon.ranged!.speed;
    const flight = Math.min(range, R.zeroDist) / speed;
    out.y += (0.5 * COMBAT.gravity * flight) / speed;
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
    this.camera.position.set(Math.sin(a) * 110, 26, Math.cos(a) * 110);
    this.camera.lookAt(0, 4, 0);
  }

  private simulate(dt: number, real: number) {
    const p = this.player;
    this.handlePlayerInput(dt);
    if (this.endT < 0) this.stats.time += dt;
    this.tickCommand(dt);

    for (const u of this.units) {
      if (u !== p && !u.dead) updateAi(u, dt, this);
    }
    for (const h of this.horses) {
      const turned = updateHorse(h, dt, this.obstacles);
      if (h === p.horse) this.camYaw += turned * CAMERA.followHorseTurn;
      h.ctl.jump = false;
      if (h.rider) {
        h.rider.pos.copy(h.pos);
        h.rider.yaw = h.heading;
      }
    }
    for (const u of this.units) {
      if (u.dead) continue;
      updateAction(u, dt, this);
      if (u.dead) continue;
      updateCouch(u, dt, this);
      updateRam(u, this);
    }
    this.projectiles.update(this, dt);
    this.updateBodies(dt);
    this.resolveCollisions();
    this.fx.update(dt);
    this.syncModels(dt);
    this.hoofSound(dt);
    this.checkEnd(real);
  }

  private tickCommand(dt: number) {
    this.moraleT -= dt;
    if (this.moraleT <= 0) {
      this.moraleT = 1;
      tickMorale(this.units);
    }
    this.thinkT -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = ENEMY_COMMAND.thinkEvery;
      thinkEnemy(this.groups[1], this.units.filter((u) => u.team === 0), this.stats.time);
    }
    this.followT -= dt;
    if (this.followT <= 0) {
      this.followT = FORMATION.followRefresh;
      for (const g of this.groups[0]) if (g.order === 'follow' && !this.player.dead) this.anchorNearPlayer(g, -FORMATION.followBehind);
    }
    this.slotT -= dt;
    if (this.slotT <= 0) {
      this.slotT = SLOT_REFRESH;
      for (const team of this.groups) for (const g of team) g.assignSlots();
    }
  }

  private anchorNearPlayer(g: Group, ahead: number) {
    const p = this.player;
    const yaw = p.horse ? p.horse.heading : this.camYaw;
    const o = FORMATION.offset[g.role];
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const forward = ahead + o.forward;
    g.setAnchor(p.pos.x + fx * forward + fz * o.side, p.pos.z + fz * forward - fx * o.side, yaw);
  }

  /** 對已選兵種落指令 */
  private command(fn: (g: Group) => void, text: string) {
    for (const g of this.groups[0]) if (this.selected.has(g.role)) fn(g);
    this.hud.announce(`${this.selectedLabel()}：${text}`, 'guard');
    this.sfx.whoosh();
  }

  selectedLabel(): string {
    if (this.selected.size === ROLE_KEYS.length) return '全軍';
    return [...this.selected].map((r) => ROLE_LABEL[r]).join('、');
  }

  private setOrder(order: OrderType) {
    this.command((g) => {
      g.order = order;
      if (order === 'follow') this.anchorNearPlayer(g, -FORMATION.followBehind);
      else if (order === 'hold') this.anchorNearPlayer(g, FORMATION.holdAhead);
    }, ORDER_LABEL[order]);
  }

  private handleCommands() {
    const i = this.input;
    if (i.pressed('Digit0')) this.selected = new Set(ROLE_KEYS);
    ROLE_KEYS.forEach((r, n) => {
      if (i.pressed(`Digit${n + 1}`)) this.selected = new Set([r]);
    });
    if (i.pressed('Digit4')) this.hud.announce('呢場冇法師', 'guard');
    if (i.pressed('F1')) this.setOrder('follow');
    if (i.pressed('F2')) this.setOrder('hold');
    if (i.pressed('F3')) this.setOrder('charge');
    if (i.pressed('F4')) this.command((g) => { g.loose = true; g.assignSlots(); }, '散開');
    if (i.pressed('F5')) this.command((g) => { g.loose = false; g.assignSlots(); }, '密集');
    if (i.pressed('F6')) {
      const hold = !this.groups[0].filter((g) => this.selected.has(g.role)).every((g) => g.holdFire);
      this.command((g) => { g.holdFire = hold; }, hold ? '停止射擊' : '自由射擊');
    }
  }

  private handlePlayerInput(dt: number) {
    const p = this.player;
    const i = this.input;
    if (i.pressed('Escape')) this.onPauseKey?.();
    if (i.pressed('KeyM')) this.sfx.muted = !this.sfx.muted;

    this.camYaw -= i.mouseDx * CAMERA.mouseSensitivity;
    this.camPitch = clamp(this.camPitch + i.mouseDy * CAMERA.mouseSensitivity, CAMERA.minPitch, CAMERA.maxPitch);

    if (p.dead) return;
    this.handleCommands();
    p.aimYaw = this.camYaw;

    if (p.phase === 'idle') {
      const step = i.pressed('KeyQ') ? 1 : i.wheelStep;
      if (step) {
        i.wheelStep = 0;
        p.weaponIdx = (p.weaponIdx + step + p.weapons.length) % p.weapons.length;
        p.couched = false;
      }
    }

    if (i.pressed('KeyF')) this.toggleMount();
    if (i.pressed('KeyE')) this.toggleCouch();

    const throttle = (i.down('KeyW') ? 1 : 0) - (i.down('KeyS') ? 1 : 0);
    const strafe = (i.down('KeyA') ? 1 : 0) - (i.down('KeyD') ? 1 : 0);
    const sprint = i.down('ShiftLeft') || i.down('ShiftRight');
    const jump = i.pressed('Space');

    if (p.horse) {
      Object.assign(p.horse.ctl, { throttle, turn: strafe, sprint, jump });
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

    if (!p.couched) this.handleAttack();
  }

  private handleAttack() {
    const p = this.player;
    const i = this.input;
    const w = p.weapon;
    if (p.phase === 'idle' && i.attackBuffer > 0) {
      i.attackBuffer = 0;
      if (w.ranged && (p.ammo[w.id] ?? 0) <= 0) this.hud.announce('冇箭喇，轉武器', 'guard');
      else startCharge(p, i.direction());
    } else if (p.phase === 'charge' && !i.lmb) {
      p.releaseQueued = true;
    }
    if (w.ranged) {
      // 右鍵取消拉弓
      if (i.rmb && p.phase === 'charge') p.phase = 'idle';
      return;
    }
    if (i.rmb) {
      if (p.phase === 'idle') startBlock(p, i.direction());
      else if (p.phase === 'block') p.blockDir = i.direction();
    } else if (p.phase === 'block') {
      p.phase = 'idle';
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
      h.ctl = { throttle: 0, turn: 0, sprint: false, jump: false };
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
    this.lastHorse = horse;
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
      this.hud.announce('要用騎槍（滾輪切換）', 'guard');
    } else if (!p.horse || p.horse.speed < COMBAT.couch.minSpeed) {
      this.hud.announce('速度未夠，放唔平騎槍', 'guard');
    } else if (p.phase === 'idle' && p.couchCooldown <= 0) {
      p.couched = true;
    }
  }

  private updateBodies(dt: number) {
    for (const u of this.units) {
      if (u.fled) continue;
      if (u.dead) u.deadT += dt;
      if (u.horse) continue;
      const ground = heightAt(u.pos.x, u.pos.z);
      if (!u.grounded) {
        u.vy -= COMBAT.gravity * dt;
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
    const horses = this.horses.filter((h) => !h.dead);
    for (let i = 0; i < alive.length; i++) {
      const a = alive[i];
      if (a.horse) continue;
      for (let j = i + 1; j < alive.length; j++) {
        const b = alive[j];
        if (b.horse) continue;
        const min = a.def.radius + b.def.radius;
        const dx = b.pos.x - a.pos.x;
        if (dx > min || dx < -min) continue;
        const dz = b.pos.z - a.pos.z;
        if (dz > min || dz < -min) continue;
        const d = Math.hypot(dx, dz);
        if (d < min && d > 0.001) {
          const push = (min - d) / 2;
          a.pos.x -= (dx / d) * push;
          a.pos.z -= (dz / d) * push;
          b.pos.x += (dx / d) * push;
          b.pos.z += (dz / d) * push;
        }
      }
      // 人同馬嘅低速碰撞
      for (const h of horses) {
        const min = HORSE_RADIUS + a.def.radius;
        const dx = a.pos.x - h.pos.x;
        if (dx > min || dx < -min) continue;
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
        if (dx > min || dx < -min) continue;
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
    // 馬同馬互推
    for (let i = 0; i < horses.length; i++) {
      for (let j = i + 1; j < horses.length; j++) {
        const a = horses[i];
        const b = horses[j];
        const min = HORSE_RADIUS * 1.7;
        const dx = b.pos.x - a.pos.x;
        if (dx > min || dx < -min) continue;
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
    }
  }

  /** 遠處單位隔幾幀先更新動畫，dt 累積補返 */
  private syncModels(dt: number) {
    this.frameNo++;
    const cam = this.camera.position;
    const far = LOD.distance * LOD.distance;
    const isFar = (x: number, z: number) => (x - cam.x) ** 2 + (z - cam.z) ** 2 > far;
    const offBeat = (i: number) => (i + this.frameNo) % LOD.interval !== 0;
    this.horses.forEach((h, i) => {
      const distant = isFar(h.pos.x, h.pos.z);
      if (!distant || !offBeat(i)) syncHorse(h, distant ? dt * LOD.interval : dt);
    });
    this.units.forEach((u, i) => {
      const distant = isFar(u.pos.x, u.pos.z);
      if (!distant || !offBeat(i)) syncHuman(u, distant ? dt * LOD.interval : dt);
    });
    this.batches.commit();
  }

  private hoofSound(dt: number) {
    const horse = this.player.horse;
    if (!horse) return;
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

  private checkEnd(real: number) {
    if (this.endT < 0) {
      const alive = (team: number) => this.units.some((u) => u.team === team && !u.dead && !u.routing);
      if (!alive(0) || !alive(1)) {
        this.win = alive(0);
        this.endT = RESULT_DELAY;
      }
      return;
    }
    this.endT -= real;
    if (this.endT <= 0) this.finish();
  }

  retreat() {
    this.retreated = true;
    this.win = false;
    this.finish();
  }

  private finish() {
    this.running = false;
    this.onEnd?.(this.report());
  }

  private report(): BattleResult {
    const rows = [0, 1].map((team) => {
      const map = new Map<string, ReportRow>();
      for (const u of this.units) {
        if (u.team !== team || u.def.id === 'player') continue;
        const r = map.get(u.def.id) ?? { name: u.def.name, total: 0, alive: 0, dead: 0, wounded: 0, fled: 0 };
        r.total++;
        if (u.fled || u.routing) r.fled++;
        else if (!u.dead) r.alive++;
        else if (u.wounded) r.wounded++;
        else r.dead++;
        map.set(u.def.id, r);
      }
      return [...map.values()];
    });

    let gold = 0;
    let exp = 0;
    let renown = 0;
    let captives = 0;
    if (this.win) {
      gold = REWARDS.winGold;
      renown = REWARDS.winRenown;
      for (const u of this.units) {
        if (u.team === 0 || !u.dead || u.fled) continue;
        gold += REWARDS.goldPerTier * u.def.tier;
        exp += REWARDS.expPerTier * u.def.tier;
        renown += REWARDS.renownPerTier * u.def.tier;
        if (u.wounded && Math.random() < REWARDS.captureChance) captives++;
      }
    }
    return {
      win: this.win, retreated: this.retreated, playerDown: this.player.dead, stats: this.stats, rows,
      gold, exp, renown: Math.round(renown), captives,
    };
  }

  moraleOf(team: number): number {
    return teamMorale(this.units, team);
  }

  private updateCamera(dt: number) {
    const p = this.player;
    const h = p.horse;
    const pos = h ? h.pos : p.pos;
    const aiming = p.phase === 'charge' && !!p.weapon.ranged;
    const dist = (h ? CAMERA.distanceMounted : CAMERA.distanceOnFoot) * (aiming ? CAMERA.aimDistanceMult : 1);
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
    const fov = CAMERA.baseFov + CAMERA.speedFovBoost * speedRatio * speedRatio - (aiming ? CAMERA.aimFovDrop * p.charge : 0);
    this.camera.fov += (fov - this.camera.fov) * (1 - Math.exp(-5 * dt));
    this.camera.updateProjectionMatrix();

    this.sun.target.position.set(pos.x, pos.y, pos.z);
    this.sun.position.set(pos.x + 50, pos.y + 90, pos.z + 30);
  }
}
