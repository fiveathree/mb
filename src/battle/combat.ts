import { Vector3 } from 'three';
import { COMBAT, FEEL, type AttackDir } from '../data/combat';
import { COLORS } from '../data/battlefield';
import { SHIELD, type WeaponDef } from '../data/weapons';
import { HORSE_RADIUS } from '../data/horses';
import { angleDiff, bearing, clamp, flatDist, rad, type Combatant, type Horse } from './entities';
import type { Fx } from './fx';
import type { Sfx } from './audio';

export interface BattleStats {
  kills: number;
  bestHit: number;
  topSpeed: number;
  time: number;
}

/** combat 需要嘅世界介面 */
export interface CombatWorld {
  units: Combatant[];
  player: Combatant;
  fx: Fx;
  sfx: Sfx;
  stats: BattleStats;
  freeze(seconds: number): void;
  slowMo(): void;
  shake(amount: number): void;
  announce(text: string, kind: 'hit' | 'kill' | 'guard' | 'hurt'): void;
  onPlayerDismounted(horse: Horse): void;
}

const tmp = new Vector3();

export function startCharge(c: Combatant, dir: AttackDir) {
  if (c.phase !== 'idle' && c.phase !== 'block') return;
  c.phase = 'charge';
  c.phaseT = 0;
  c.dir = c.weapon.thrustOnly ? 'down' : dir;
  c.charge = 0;
  c.releaseQueued = false;
  c.attackId++;
  c.hitThisSwing.clear();
}

export function startBlock(c: Combatant, dir: AttackDir) {
  if (c.phase !== 'idle') return;
  c.phase = 'block';
  c.phaseT = 0;
  c.blockDir = dir;
}

export function stagger(c: Combatant, time: number) {
  c.phase = 'stagger';
  c.phaseT = 0;
  c.staggerTime = time;
  c.couched = false;
}

function beginSwing(c: Combatant, world: CombatWorld) {
  c.chargeMult = COMBAT.chargeMinMult + (COMBAT.chargeMaxMult - COMBAT.chargeMinMult) * c.charge;
  c.phase = 'swing';
  c.phaseT = 0;
  if (c === world.player) world.sfx.whoosh();
}

/** 攻擊嚟自對方邊一邊，防守方要向自己鏡像嗰邊格擋 */
export function mirrorDir(d: AttackDir): AttackDir {
  return d === 'left' ? 'right' : d === 'right' ? 'left' : d;
}

function sweepWindow(w: WeaponDef, dir: AttackDir, p0: number, p1: number): [number, number] | null {
  if (w.thrustOnly || dir === 'up' || dir === 'down') {
    if (p1 < 0.3 || p0 > 0.8) return null;
    const half = rad(COMBAT.verticalHitHalfArcDeg);
    return [-half, half];
  }
  // 正角度係攻擊者左手邊
  const half = rad(w.arcDeg) / 2;
  const sign = dir === 'left' ? 1 : -1;
  const a0 = sign * half * (1 - 2 * p0);
  const a1 = sign * half * (1 - 2 * p1);
  return [Math.min(a0, a1), Math.max(a0, a1)];
}

function checkSweep(c: Combatant, world: CombatWorld, p0: number, p1: number) {
  const w = c.weapon;
  if (c.hitThisSwing.size >= w.cleave) return;
  const win = sweepWindow(w, c.dir, p0, p1);
  if (!win) return;
  const padBase = rad(COMBAT.sweepPadDeg + (c.horse ? COMBAT.mountedSweepPadDeg : 0));
  for (const t of world.units) {
    if (t.team === c.team || t.dead || c.hitThisSwing.has(t)) continue;
    const targetRadius = t.horse ? HORSE_RADIUS : t.def.radius;
    const d = flatDist(c.pos, t.pos) - targetRadius;
    if (d > w.reach) continue;
    const a = angleDiff(bearing(c.pos, t.pos), c.aimYaw);
    const pad = padBase + Math.atan2(targetRadius, Math.max(d, 0.3));
    if (a < win[0] - pad || a > win[1] + pad) continue;
    c.hitThisSwing.add(t);
    const blocked = strike(world, c, t, w, c.dir, c.chargeMult, false);
    if (blocked) {
      c.phase = 'recover';
      c.phaseT = -COMBAT.blockedRecoil;
      return;
    }
    if (c.hitThisSwing.size >= w.cleave) return;
  }
}

function canBlock(t: Combatant, att: Combatant, dir: AttackDir): boolean {
  if (t.phase !== 'block') return false;
  const toAtt = angleDiff(bearing(t.pos, att.pos), t.aimYaw);
  if (Math.abs(toAtt) > rad(COMBAT.blockArcDeg)) return false;
  return t.hasActiveShield || t.blockDir === mirrorDir(dir);
}

/** 計傷害同結算一次命中；回傳 true 代表被擋住 */
export function strike(
  world: CombatWorld, att: Combatant, t: Combatant, w: WeaponDef, dir: AttackDir, chargeMult: number, couched: boolean,
): boolean {
  tmp.copy(att.velocity).sub(t.velocity);
  tmp.y = 0;
  const dist = Math.max(flatDist(att.pos, t.pos), 0.01);
  const nx = (t.pos.x - att.pos.x) / dist;
  const nz = (t.pos.z - att.pos.z) / dist;
  const closing = tmp.x * nx + tmp.z * nz;
  const relSpeed = Math.max(0, closing, tmp.length() * COMBAT.passingSpeedRatio)
    * (!att.horse && t.horse ? COMBAT.infantryVsMountedSpeedRatio : 1);

  const coef = couched ? COMBAT.couchSpeedDamageCoef : COMBAT.speedDamageCoef;
  const dirMult = w.thrustOnly ? 1 : COMBAT.dirDamageMult[dir];
  const raw = w.baseDamage * (1 + relSpeed * coef) * chargeMult * dirMult;
  const armorCut = (armor: number) => Math.max(raw - armor * COMBAT.armorEffect[w.damageType], raw * COMBAT.minDamageRatio);

  const isPlayerAtt = att === world.player;
  const isPlayerTgt = t === world.player;
  const hitPos = tmp.set(t.pos.x, t.pos.y + 1.2 + (t.horse ? 0.8 : 0), t.pos.z);

  let passRatio = 1;
  if (canBlock(t, att, dir)) {
    if (t.hasActiveShield) {
      t.shieldHp -= raw * SHIELD.damageRatio * w.shieldBreak;
      if (t.shieldHp <= 0) {
        t.shieldHp = 0;
        world.fx.burst(hitPos, COLORS.wood, 14, 5);
        if (isPlayerTgt) world.announce('盾牌碎咗！', 'hurt');
        else if (isPlayerAtt) world.announce('破盾！', 'hit');
      }
    }
    if (raw < COMBAT.guardBreakDamage) {
      world.fx.burst(hitPos, COLORS.spark, 10, 5);
      world.sfx.clash();
      world.freeze(FEEL.guardHitStop);
      if (isPlayerAtt) world.announce('被擋住', 'guard');
      else if (isPlayerTgt) world.announce('擋得好！', 'guard');
      return true;
    }
    passRatio = COMBAT.guardBreakPassThrough;
    stagger(t, COMBAT.guardBreakStagger);
    world.sfx.clash();
    if (isPlayerAtt) world.announce('破防！', 'hit');
  }

  // 敵人打中騎乘中玩家時，可能打中馬
  if (t.horse && Math.random() < COMBAT.hitHorseChance) {
    damageHorse(world, t.horse, Math.round(armorCut(t.horse.def.armor)));
    world.fx.burst(hitPos, COLORS.blood, 8, 4);
    return false;
  }

  const final = Math.round(armorCut(t.def.armor) * passRatio);
  const launch = clamp(raw * COMBAT.launchPerDamage, 0, COMBAT.maxLaunch);
  applyDamage(world, att, t, final, nx, nz, launch, relSpeed > 7 ? (couched ? '騎槍衝鋒' : '衝鋒一擊') : '');
  return false;
}

function applyDamage(
  world: CombatWorld, att: Combatant, t: Combatant, final: number, nx: number, nz: number, launch: number, label: string,
) {
  const isPlayerAtt = att === world.player;
  t.hp -= final;
  const hitPos = tmp.set(t.pos.x, t.pos.y + 1.2 + (t.horse ? 0.8 : 0), t.pos.z);
  world.fx.burst(hitPos, COLORS.blood, 10 + Math.min(20, final / 4), 3 + launch * 0.5);

  if (isPlayerAtt) world.stats.bestHit = Math.max(world.stats.bestHit, final);
  const killed = t.hp <= 0;

  if (t !== world.player) {
    t.vel.x = nx * launch;
    t.vel.z = nz * launch;
    if (launch > 4) {
      t.vy = launch * COMBAT.launchUpRatio;
      t.grounded = false;
    }
  }

  if (killed) {
    kill(world, t, att);
    world.sfx.hit(true);
    if (isPlayerAtt) {
      world.freeze(FEEL.killHitStop);
      world.shake(FEEL.shakeOnKill);
      if (final >= FEEL.slowMo.threshold) world.slowMo();
      world.announce(`${label ? label + '！' : '擊殺！'} ${final}`, 'kill');
    }
  } else {
    world.sfx.hit(false);
    if (t === world.player) {
      stagger(t, COMBAT.hitStagger * COMBAT.playerStaggerRatio);
      world.shake(FEEL.shakeOnHurt);
      world.announce(`受傷 −${final}`, 'hurt');
    } else {
      stagger(t, COMBAT.hitStagger + launch * 0.06);
      if (isPlayerAtt) {
        world.freeze(FEEL.hitStop);
        world.shake(FEEL.shakeOnHit);
        world.announce(`${label ? label + ' ' : ''}${final}`, 'hit');
      }
    }
  }
}

function kill(world: CombatWorld, t: Combatant, att: Combatant) {
  t.dead = true;
  t.deadT = 0;
  t.phase = 'idle';
  t.couched = false;
  t.spin = -2 - Math.random() * 2;
  if (att === world.player) world.stats.kills++;
  if (t === world.player && t.horse) {
    const h = t.horse;
    h.rider = null;
    t.horse = null;
    world.onPlayerDismounted(h);
  }
}

export function damageHorse(world: CombatWorld, h: Horse, dmg: number) {
  if (h.dead) return;
  h.hp -= dmg;
  if (h.rider === world.player) world.announce(`戰馬受傷 −${dmg}`, 'hurt');
  if (h.hp > 0) return;
  h.hp = 0;
  h.dead = true;
  h.deadT = 0;
  h.speed = 0;
  h.vel.set(0, 0, 0);
  const rider = h.rider;
  if (rider) {
    h.rider = null;
    rider.horse = null;
    rider.couched = false;
    rider.pos.copy(h.pos);
    rider.vel.set(0, 0, 0);
    world.announce('戰馬陣亡，你跌咗落地！', 'hurt');
    rider.hp -= COMBAT.fallDamage;
    if (rider.hp <= 0) kill(world, rider, rider);
    else stagger(rider, COMBAT.fallStagger);
    world.onPlayerDismounted(h);
  }
}

/** 推進出招狀態機 */
export function updateAction(c: Combatant, dt: number, world: CombatWorld) {
  const w = c.weapon;
  c.phaseT += dt;
  switch (c.phase) {
    case 'charge':
      c.charge = clamp(c.phaseT / w.chargeFull, 0, 1);
      if (c.releaseQueued && c.phaseT >= w.windupMin) beginSwing(c, world);
      break;
    case 'swing': {
      const p0 = clamp((c.phaseT - dt) / w.swingTime, 0, 1);
      const p1 = clamp(c.phaseT / w.swingTime, 0, 1);
      checkSweep(c, world, p0, p1);
      if (c.phase === 'swing' && p1 >= 1) {
        c.phase = 'recover';
        c.phaseT = 0;
      }
      break;
    }
    case 'recover':
      if (c.phaseT >= w.recoverTime) c.phase = 'idle';
      break;
    case 'stagger':
      if (c.phaseT >= c.staggerTime) c.phase = 'idle';
      break;
    default:
      break;
  }
}

/** 騎槍放平：自動命中馬頭前方目標 */
export function updateCouch(c: Combatant, dt: number, world: CombatWorld) {
  c.couchCooldown = Math.max(0, c.couchCooldown - dt);
  tickCooldowns(c, dt);
  const h = c.horse;
  if (!c.couched) return;
  if (!h || h.speed < COMBAT.couch.minSpeed * COMBAT.couch.dropRatio || !c.weapon.couchable) {
    c.couched = false;
    c.couchCooldown = COMBAT.couch.recoverTime;
    return;
  }
  const w = c.weapon;
  const cone = rad(COMBAT.couch.hitConeDeg);
  for (const t of world.units) {
    if (t.team === c.team || t.dead || c.contactCooldown.has(t)) continue;
    if (flatDist(h.pos, t.pos) - t.def.radius > w.reach) continue;
    if (Math.abs(angleDiff(bearing(h.pos, t.pos), h.heading)) > cone) continue;
    c.contactCooldown.set(t, COMBAT.couch.cooldown);
    strike(world, c, t, w, 'down', COMBAT.chargeMaxMult, true);
  }
}

function tickCooldowns(c: Combatant, dt: number) {
  for (const [k, v] of c.contactCooldown) {
    if (v - dt <= 0) c.contactCooldown.delete(k);
    else c.contactCooldown.set(k, v - dt);
  }
}

/** 全速撞人 */
export function updateRam(c: Combatant, world: CombatWorld) {
  const h = c.horse;
  if (!h || h.speed < COMBAT.ram.minSpeed) return;
  const fx = Math.sin(h.heading);
  const fz = Math.cos(h.heading);
  const r = COMBAT.ram;
  for (const t of world.units) {
    if (t.team === c.team || t.dead || c.contactCooldown.has(t)) continue;
    const dx = t.pos.x - h.pos.x;
    const dz = t.pos.z - h.pos.z;
    const forward = dx * fx + dz * fz;
    const side = Math.abs(dx * fz - dz * fx);
    if (forward < 0 || forward > r.reach || side > r.halfWidth + t.def.radius) continue;
    c.contactCooldown.set(t, r.cooldown);
    const raw = h.speed * r.damagePerSpeed * h.def.ramMult;
    const final = Math.round(Math.max(raw - t.def.armor, raw * COMBAT.minDamageRatio));
    const launch = clamp(h.speed * r.launchPerSpeed, 0, COMBAT.maxLaunch);
    const len = Math.max(Math.hypot(dx, dz), 0.01);
    // 撞飛方向混合前進方向同側向，等馬唔會一直貼住目標
    const nx = fx * 0.7 + (dx / len) * 0.6;
    const nz = fz * 0.7 + (dz / len) * 0.6;
    applyDamage(world, c, t, final, nx, nz, launch, '撞飛');
    world.sfx.thud();
    h.speed *= r.speedKeep;
    damageHorse(world, h, Math.round(final * r.horseRecoil));
  }
}
