import { Vector3 } from 'three';
import { COMBAT, FEEL, type AttackDir } from '../data/combat';
import { COLORS, TERRAIN } from '../data/battlefield';
import { SHIELD, SPELL_GLOW, type WeaponDef } from '../data/weapons';
import { HORSE_RADIUS } from '../data/horses';
import { MUSOU_RULES } from '../data/crowns';
import { angleDiff, bearing, clamp, flatDist, rad, type Combatant, type Horse } from './entities';
import type { Fx } from './fx';
import type { Sfx } from './audio';
import type { Projectiles } from './projectiles';
import type { FormationBonus } from '../data/formations';

export interface BattleStats {
  kills: number;
  bestHit: number;
  topSpeed: number;
  time: number;
}

/** combat 需要嘅世界介面 */
/** 近戰出手高度，用嚟判斷隔牆 */
const MELEE_HEIGHT = 1.2;

export interface CombatWorld {
  units: Combatant[];
  player: Combatant;
  fx: Fx;
  sfx: Sfx;
  projectiles: Projectiles;
  stats: BattleStats;
  freeze(seconds: number): void;
  slowMo(seconds?: number): void;
  shake(amount: number): void;
  announce(text: string, kind: 'hit' | 'kill' | 'guard' | 'hurt'): void;
  onUnitDown(t: Combatant, by: Combatant): void;
  /** 玩家瞄準方向（鏡頭準星） */
  playerAim(muzzle: Vector3, out: Vector3): void;
  /** 圍城時將行軍目標改去最近缺口 */
  routeGoal(c: Combatant, gx: number, gz: number): [number, number];
  /** 喺呢點召落雷 */
  strike(owner: Combatant, w: WeaponDef, pos: Vector3, mult: number): void;
  /** 地下城模式 */
  crawling: boolean;
  /** 由 a 去 b 喺高度 y 有冇被牆擋住 */
  wallBlocks(ax: number, az: number, bx: number, bz: number, y: number): boolean;
  /** 陣法加成，按隊形凝聚度打折 */
  formationBonus(team: number, key: keyof FormationBonus): number;
}

const tmp = new Vector3();
const MUSOU_ARMOR = 0.5;
const MUSOU_LAUNCH = 6;

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
  if (c.phase !== 'idle' || c.weapon.ranged) return;
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

const MP_REGEN = 2.5;

function castSelf(c: Combatant, world: CombatWorld) {
  const s = c.weapon.spell!;
  if (c.mp < s.mp) {
    if (c === world.player) world.announce('法力不足', 'guard');
    return;
  }
  c.mp -= s.mp;
  tmp.set(c.pos.x, c.pos.y + 1.5, c.pos.z);
  if (s.self === 'heal') {
    c.hp = Math.min(c.def.hp, c.hp + (s.power ?? 0));
    world.fx.burst(tmp, 0x7fe8a0, 16, 3);
  } else {
    c.wardT = s.power ?? 0;
    world.fx.burst(tmp, 0x8fc4ff, 16, 3);
  }
}

function beginSwing(c: Combatant, world: CombatWorld) {
  if (c.weapon.spell?.self) {
    castSelf(c, world);
    c.phase = 'recover';
    c.phaseT = 0;
    return;
  }
  if (c.weapon.ranged) {
    world.projectiles.fire(world, c);
    c.phase = 'recover';
    c.phaseT = 0;
    return;
  }
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
  if (c.musouT > 0 || c.hitThisSwing.size >= w.cleave) return;
  const win = sweepWindow(w, c.dir, p0, p1);
  if (!win) return;
  const padBase = rad(COMBAT.sweepPadDeg + (c.horse ? COMBAT.mountedSweepPadDeg : 0));
  for (const t of world.units) {
    if (t.team === c.team || t.dead || c.hitThisSwing.has(t)) continue;
    const dx = t.pos.x - c.pos.x;
    if (dx > 6 || dx < -6) continue;
    const targetRadius = t.horse ? HORSE_RADIUS : t.def.radius;
    const d = flatDist(c.pos, t.pos) - targetRadius;
    if (d > w.reach) continue;
    const a = angleDiff(bearing(c.pos, t.pos), c.aimYaw);
    const pad = padBase + Math.atan2(targetRadius, Math.max(d, 0.3));
    if (a < win[0] - pad || a > win[1] + pad) continue;
    if (world.wallBlocks(c.pos.x, c.pos.z, t.pos.x, t.pos.z, c.pos.y + MELEE_HEIGHT)) continue;
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

/** 高處打低處有傷害加成 */
function heightMult(att: Combatant, t: Combatant): number {
  const bonus = clamp((att.pos.y - t.pos.y) * TERRAIN.heightDamagePerMeter, -TERRAIN.heightDamageMax, TERRAIN.heightDamageMax);
  return 1 + bonus;
}

/** 計傷害同結算一次近戰命中；回傳 true 代表被擋住 */
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
  const cavMult = t.horse ? w.antiCavalry + world.formationBonus(att.team, 'antiCavalry') : 1;
  const formMult = 1 + world.formationBonus(att.team, 'damage');
  const raw = w.baseDamage * (att.def.damageMult ?? 1) * (1 + relSpeed * coef) * chargeMult * dirMult * cavMult * heightMult(att, t) * formMult;
  const guard = world.formationBonus(t.team, 'armor');
  const armorCut = (armor: number) => Math.max(raw - (armor + guard) * COMBAT.armorEffect[w.damageType], raw * COMBAT.minDamageRatio);

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
      if (isPlayerAtt || isPlayerTgt) {
        world.sfx.clash();
        world.freeze(FEEL.guardHitStop);
      }
      if (isPlayerAtt) world.announce('被擋住', 'guard');
      else if (isPlayerTgt) world.announce('擋得好！', 'guard');
      return true;
    }
    passRatio = COMBAT.guardBreakPassThrough;
    stagger(t, COMBAT.guardBreakStagger);
    if (isPlayerAtt || isPlayerTgt) world.sfx.clash();
    if (isPlayerAtt) world.announce('破防！', 'hit');
  }

  // 打中騎乘目標時，可能打中馬
  if (t.horse && Math.random() < COMBAT.hitHorseChance) {
    damageHorse(world, t.horse, Math.round(armorCut(t.horse.def.armor)), att);
    world.fx.burst(hitPos, COLORS.blood, 8, 4);
    return false;
  }

  const final = Math.round(armorCut(t.def.armor) * passRatio);
  const launch = clamp(raw * COMBAT.launchPerDamage, 0, COMBAT.maxLaunch);
  applyDamage(world, att, t, final, nx, nz, launch, relSpeed > 7 ? (couched ? '騎槍衝鋒' : '衝鋒一擊') : '');
  return false;
}

/** 計遠程命中；hitRatio 係命中高度佔身高比例 */
export function shotHit(
  world: CombatWorld, att: Combatant, t: Combatant, w: WeaponDef, mult: number,
  hitRatio: number, hitHorse: boolean, vx: number, vz: number,
) {
  const R = COMBAT.ranged;
  const speed = Math.max(Math.hypot(vx, vz), 0.01);
  const nx = vx / speed;
  const nz = vz / speed;
  const head = !hitHorse && hitRatio >= R.headHeight;
  const power = w.spell ? (att.def.spellMult ?? 1) * (1 + world.formationBonus(att.team, 'spell')) : att.def.damageMult ?? 1;
  const shield = Math.max(0, 1 - world.formationBonus(t.team, 'arrow'));
  const raw = w.baseDamage * power * mult * (head ? R.headMult : 1) * heightMult(att, t) * shield;
  const guard = world.formationBonus(t.team, 'armor');
  const armorCut = (armor: number) => Math.max(raw - (armor + guard) * COMBAT.armorEffect[w.damageType], raw * COMBAT.minDamageRatio);
  const isPlayerAtt = att === world.player;
  const hitPos = tmp.set(t.pos.x, t.pos.y + 1.2, t.pos.z);

  if (t.wardT > 0) {
    world.fx.burst(hitPos, 0x8fc4ff, 6, 3);
    return;
  }
  const front = Math.abs(angleDiff(Math.atan2(-vx, -vz), t.aimYaw)) < rad(COMBAT.blockArcDeg);
  if (front && t.hasActiveShield && !hitHorse
    && (t.phase === 'block' || Math.random() < R.passiveShieldChance)) {
    t.shieldHp = Math.max(0, t.shieldHp - raw * w.shieldBreak);
    world.fx.burst(hitPos, COLORS.wood, 5, 3);
    if (isPlayerAtt) world.announce('箭被盾擋住', 'guard');
    return;
  }

  if (hitHorse && t.horse) {
    damageHorse(world, t.horse, Math.round(armorCut(t.horse.def.armor)), att);
    world.fx.burst(hitPos, COLORS.blood, 6, 3);
    if (isPlayerAtt) world.announce('射中戰馬', 'hit');
    return;
  }
  const final = Math.round(armorCut(t.def.armor));
  applyDamage(world, att, t, final, nx, nz, clamp(raw * COMBAT.launchPerDamage * 0.35, 0, 4), head ? '爆頭' : '射中');
}

/** 火球爆炸：範圍內敵人受傷，距離愈遠愈輕 */
export function explode(world: CombatWorld, att: Combatant, w: WeaponDef, pos: Vector3, mult: number) {
  const radius = w.spell!.aoe!;
  const strike = !!w.spell!.strike;
  world.fx.burst(pos, strike ? 0xc8dcff : SPELL_GLOW[w.id] ?? 0xff8a2c, strike ? 18 : 34, 9);
  if (!strike) world.sfx.boom();
  for (const t of world.units) {
    if (t.team === att.team || t.dead) continue;
    const d = flatDist(t.pos, pos);
    if (d > radius) continue;
    if (world.wallBlocks(pos.x, pos.z, t.pos.x, t.pos.z, pos.y + 0.5)) continue;
    const dist = Math.max(d, 0.01);
    const raw = w.baseDamage * (att.def.spellMult ?? 1) * (1 + world.formationBonus(att.team, 'spell')) * mult * (1 - (d / radius) * 0.6);
    const nx = (t.pos.x - pos.x) / dist;
    const nz = (t.pos.z - pos.z) / dist;
    if (t.wardT > 0) continue;
    const armorCut = Math.max(raw - t.def.armor * COMBAT.armorEffect[w.damageType], raw * COMBAT.minDamageRatio);
    applyDamage(world, att, t, Math.round(armorCut), nx, nz, clamp(raw * COMBAT.launchPerDamage, 0, 8), '爆炸');
    if (t.dead) continue;
  }
}

/** 冠位戰技命中：無視格擋，一律飛起 */
export function musouHit(world: CombatWorld, att: Combatant, t: Combatant, raw: number, nx: number, nz: number): number {
  if (t.musouT > 0) return 0;
  const final = Math.round(Math.max(raw - t.def.armor * MUSOU_ARMOR, raw * COMBAT.minDamageRatio));
  applyDamage(world, att, t, final, nx, nz, MUSOU_LAUNCH, '');
  return final;
}

function applyDamage(
  world: CombatWorld, att: Combatant, t: Combatant, final: number, nx: number, nz: number, launch: number, label: string,
) {
  const isPlayerAtt = att === world.player;
  const isPlayerTgt = t === world.player;
  if (t.musouT > 0) return;
  // 絕招自己計節奏，唔逐下停頓
  const feel = isPlayerAtt && att.musouT <= 0;
  t.hp -= final;
  if (att.def.crown && att.musouT <= 0) att.musou = Math.min(MUSOU_RULES.max, att.musou + final * MUSOU_RULES.perDamageDealt);
  if (t.def.crown) t.musou = Math.min(MUSOU_RULES.max, t.musou + final * MUSOU_RULES.perDamageTaken);
  const hitPos = tmp.set(t.pos.x, t.pos.y + 1.2 + (t.horse ? 0.8 : 0), t.pos.z);
  world.fx.burst(hitPos, COLORS.blood, 6 + Math.min(16, final / 5), 3 + launch * 0.5);

  if (isPlayerAtt) world.stats.bestHit = Math.max(world.stats.bestHit, final);
  const killed = t.hp <= 0;

  if (!isPlayerTgt && !t.horse) {
    t.vel.x = nx * launch;
    t.vel.z = nz * launch;
    if (launch > 4) {
      t.vy = launch * COMBAT.launchUpRatio;
      t.grounded = false;
    }
  }

  if (killed) {
    kill(world, t, att);
    if (feel) {
      world.sfx.hit(true);
      world.freeze(FEEL.killHitStop);
      world.shake(FEEL.shakeOnKill);
      if (final >= FEEL.slowMo.threshold) world.slowMo();
      world.announce(`${label ? label + '！' : '擊殺！'} ${final}`, 'kill');
    }
  } else {
    if (isPlayerTgt) {
      world.sfx.hit(false);
      stagger(t, COMBAT.hitStagger * COMBAT.playerStaggerRatio);
      world.shake(FEEL.shakeOnHurt);
      world.announce(`受傷 −${final}`, 'hurt');
    } else {
      stagger(t, COMBAT.hitStagger + launch * 0.06);
      if (feel) {
        world.sfx.hit(false);
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
  if (att === world.player && t !== att) world.stats.kills++;
  const h = t.horse;
  if (h) {
    t.pos.copy(h.pos);
    t.vel.copy(h.vel);
    h.rider = null;
    h.ctl = { throttle: 0, turn: 0, sprint: false, jump: false };
    t.horse = null;
    // 半人馬人馬一體，一齊倒
    if (t.def.race === 'centaur') {
      h.hp = 0;
      h.dead = true;
      h.deadT = 0;
      h.speed = 0;
      h.vel.set(0, 0, 0);
    }
  }
  world.onUnitDown(t, att);
}

export function damageHorse(world: CombatWorld, h: Horse, dmg: number, by: Combatant) {
  // 出絕招時連馬都無敵，唔會跌落馬
  if (h.dead || (h.rider && h.rider.musouT > 0)) return;
  h.hp -= dmg;
  const rider = h.rider;
  if (rider === world.player) world.announce(`戰馬受傷 −${dmg}`, 'hurt');
  if (h.hp > 0) return;
  h.hp = 0;
  h.dead = true;
  h.deadT = 0;
  h.speed = 0;
  h.vel.set(0, 0, 0);
  if (rider?.def.race === 'centaur') {
    kill(world, rider, by);
    return;
  }
  if (rider) {
    h.rider = null;
    rider.horse = null;
    rider.couched = false;
    rider.pos.copy(h.pos);
    rider.vel.set(0, 0, 0);
    if (rider === world.player) world.announce('戰馬陣亡，你跌咗落地！', 'hurt');
    rider.hp -= COMBAT.fallDamage;
    if (rider.hp <= 0) kill(world, rider, by);
    else stagger(rider, COMBAT.fallStagger);
  }
}

/** 推進出招狀態機 */
export function updateAction(c: Combatant, dt: number, world: CombatWorld) {
  const w = c.weapon;
  c.phaseT += dt * (c.def.actionSpeed ?? 1);
  if (c.def.mp) c.mp = Math.min(c.def.mp, c.mp + MP_REGEN * dt);
  if (c.wardT > 0) c.wardT -= dt;
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
    if (t.team === c.team || t.dead || t.horse || c.contactCooldown.has(t)) continue;
    const dx = t.pos.x - h.pos.x;
    const dz = t.pos.z - h.pos.z;
    const forward = dx * fx + dz * fz;
    const side = Math.abs(dx * fz - dz * fx);
    if (forward < 0 || forward > r.reach || side > r.halfWidth + t.def.radius) continue;
    c.contactCooldown.set(t, r.cooldown);
    const raw = h.speed * r.damagePerSpeed * h.def.ramMult * (c === world.player ? 1 : r.troopMult);
    const final = Math.round(Math.max(raw - t.def.armor, raw * COMBAT.minDamageRatio));
    const launch = clamp(h.speed * r.launchPerSpeed, 0, COMBAT.maxLaunch);
    const len = Math.max(Math.hypot(dx, dz), 0.01);
    // 撞飛方向混合前進方向同側向，等馬唔會一直貼住目標
    const nx = fx * 0.7 + (dx / len) * 0.6;
    const nz = fz * 0.7 + (dz / len) * 0.6;
    applyDamage(world, c, t, final, nx, nz, launch, '撞飛');
    if (c === world.player) world.sfx.thud();
    h.speed *= r.speedKeep;
    damageHorse(world, h, Math.round(final * r.horseRecoil), t);
    if (!c.horse) return;
  }
}
