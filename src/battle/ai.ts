import { AI, ARCHER_AI, CAVALRY_AI, MORALE } from '../data/units';
import { BATTLEFIELD } from '../data/battlefield';
import { COMBAT, type AttackDir } from '../data/combat';
import { HORSE_RADIUS } from '../data/horses';
import {
  angleDiff, bearing, clamp, flatDist, moveToward, randRange, type AiState, type Combatant,
} from './entities';
import { mirrorDir, startBlock, startCharge, type CombatWorld } from './combat';
import type { Group } from './orders';

const DIRS: AttackDir[] = ['up', 'down', 'left', 'right'];
const randomDir = () => DIRS[Math.floor(Math.random() * 4)];

export function makeAi(group: Group): AiState {
  return {
    group,
    target: null,
    retarget: 0,
    slotAngle: Math.random() * Math.PI * 2,
    cooldown: AI.startDelay + Math.random(),
    dodgeT: 0,
    dodgeDir: 1,
    dodgeDecided: false,
    seenAttack: 0,
    reactT: -1,
    willBlock: false,
    correctBlock: false,
    commitT: 0,
    releaseAt: 0,
    slotX: 0,
    slotZ: 0,
  };
}

function nearestEnemy(c: Combatant, world: CombatWorld): Combatant | null {
  let best: Combatant | null = null;
  let bestD = Infinity;
  for (const u of world.units) {
    if (u.team === c.team || u.dead) continue;
    // 潰兵優先度低，避免全軍追住走佬嘅人
    const d = Math.abs(u.pos.x - c.pos.x) + Math.abs(u.pos.z - c.pos.z) + (u.routing ? 25 : 0);
    if (d < bestD) {
      bestD = d;
      best = u;
    }
  }
  return best;
}

function attackersOn(t: Combatant, world: CombatWorld): number {
  let n = 0;
  for (const u of world.units) {
    if (u.ai?.target === t && !u.dead && (u.phase === 'charge' || u.phase === 'swing') && !u.weapon.ranged) n++;
  }
  return n;
}

export function updateAi(c: Combatant, dt: number, world: CombatWorld) {
  const ai = c.ai!;
  ai.cooldown -= dt;
  ai.retarget -= dt;
  if (c.routing) {
    flee(c, dt);
    return;
  }
  if (ai.retarget <= 0 || !ai.target || ai.target.dead) {
    ai.target = nearestEnemy(c, world);
    ai.retarget = randRange(AI.retargetEvery[0], AI.retargetEvery[1]);
  }
  if (c.horse) {
    updateCavalry(c, ai, dt);
    return;
  }
  if (c.phase === 'stagger' || !c.grounded) return;
  updateFoot(c, ai, dt, world);
}

/** 向外走佬，出到邊界就算離開戰場 */
function flee(c: Combatant, dt: number) {
  const r = Math.max(Math.hypot(c.pos.x, c.pos.z), 1);
  const edge = BATTLEFIELD.arenaRadius - MORALE.fleeEdgeMargin;
  if (r >= edge) {
    c.fled = true;
    c.dead = true;
    if (c.horse) {
      c.horse.rider = null;
      c.horse.ctl = { throttle: 0, turn: 0, sprint: false, jump: false };
      c.horse = null;
    }
    return;
  }
  // 逃向離自己陣地最近嘅一邊：由中心向外
  const side = c.team === 0 ? -1 : 1;
  const dirX = c.pos.x / r;
  const dirZ = c.pos.z / r + side * 0.6;
  const yaw = Math.atan2(dirX, dirZ);
  if (c.phase === 'charge' || c.phase === 'block') c.phase = 'idle';
  if (c.horse) {
    steer(c, yaw, true);
    return;
  }
  if (c.phase === 'stagger' || !c.grounded) return;
  c.yaw += clamp(angleDiff(yaw, c.yaw), -AI.turnRate * dt, AI.turnRate * dt);
  c.aimYaw = c.yaw;
  moveVel(c, Math.sin(yaw) * c.def.runSpeed, Math.cos(yaw) * c.def.runSpeed, dt);
}

function steer(c: Combatant, yaw: number, sprint: boolean) {
  const h = c.horse!;
  const diff = angleDiff(yaw, h.heading);
  h.ctl.turn = Math.abs(diff) < CAVALRY_AI.steerDeadzone ? 0 : Math.sign(diff);
  h.ctl.throttle = 1;
  h.ctl.sprint = sprint && Math.abs(diff) < CAVALRY_AI.turnFirstAngle;
  h.ctl.jump = false;
}

function updateCavalry(c: Combatant, ai: AiState, dt: number) {
  const h = c.horse!;
  const group = ai.group;
  const t = ai.target;
  const dist = t ? flatDist(c.pos, t.pos) : Infinity;
  ai.commitT -= dt;

  const charging = group.order === 'charge' || dist < CAVALRY_AI.engageDist;
  if (!charging || !t) {
    if (c.couched) c.couched = false;
    const dx = ai.slotX - c.pos.x;
    const dz = ai.slotZ - c.pos.z;
    if (Math.hypot(dx, dz) < CAVALRY_AI.slotTolerance) {
      h.ctl.throttle = 0;
      h.ctl.turn = 0;
      h.ctl.sprint = false;
      c.aimYaw = c.yaw = h.heading;
      return;
    }
    steer(c, Math.atan2(dx, dz), Math.hypot(dx, dz) > 30);
    h.ctl.throttle = Math.hypot(dx, dz) > 8 ? 1 : 0;
    c.aimYaw = c.yaw = h.heading;
    return;
  }

  // 衝過目標之後繼續跑一段先回頭，形成一波波衝鋒
  const toT = bearing(c.pos, t.pos);
  const passed = Math.abs(angleDiff(toT, h.heading)) > 1.6 && dist < CAVALRY_AI.passDist;
  if (passed && ai.commitT < 0) ai.commitT = CAVALRY_AI.commitTime * 0.6;
  if (ai.commitT > 0 && dist < CAVALRY_AI.passDist) {
    steer(c, h.heading, true);
  } else {
    steer(c, toT, dist > 12);
  }
  c.yaw = h.heading;
  c.aimYaw = toT;

  const w = c.weapon;
  if (w.couchable) {
    if (!c.couched && h.speed >= COMBAT.couch.minSpeed && c.phase === 'idle' && c.couchCooldown <= 0) c.couched = true;
    if (h.speed < COMBAT.couch.minSpeed * COMBAT.couch.dropRatio && dist < 3.5 && c.weaponIdx === 0 && c.weapons.length > 1) {
      // 陷入混戰就換馬刀
      c.weaponIdx = 1;
      c.couched = false;
    }
    if (c.couched) return;
  }
  if (c.phase === 'charge') {
    if (dist < w.reach + 1 + h.speed * 0.1 || c.charge >= 1) c.releaseQueued = true;
  } else if (c.phase === 'idle' && ai.cooldown <= 0 && dist < w.reach + h.speed * CAVALRY_AI.swingLead) {
    startCharge(c, Math.random() < 0.5 ? 'left' : 'right');
    ai.cooldown = randRange(c.def.attackCooldown[0], c.def.attackCooldown[1]);
  }
}

function updateFoot(c: Combatant, ai: AiState, dt: number, world: CombatWorld) {
  const group = ai.group;
  const t = ai.target;
  const dist = t ? flatDist(c.pos, t.pos) : Infinity;
  let w = c.weapon;

  // 弓兵：有箭就射，敵人埋身或者冇箭就換近戰
  const shooter = c.weapons[0].ranged !== undefined;
  const hasAmmo = shooter && (c.ammo[c.weapons[0].id] ?? 0) > 0;
  const wantMelee = !hasAmmo || dist < ARCHER_AI.meleeDist;
  if (shooter && c.phase === 'idle') {
    const idx = wantMelee ? c.weapons.length - 1 : 0;
    if (idx !== c.weaponIdx) {
      c.weaponIdx = idx;
      w = c.weapon;
    }
  }
  const shooting = !!w.ranged && !!t && !group.holdFire && dist < ARCHER_AI.range && !t.routing;

  // 地下城跟隨時，同房見到敵人就主動埋身
  const roomFoe = !!t && world.crawling && dist < AI.roomEngageDist && !world.wallBlocks(c.pos.x, c.pos.z, t.pos.x, t.pos.z, c.pos.y + 1);
  const engage = !!t && !w.ranged && (group.order === 'charge' || dist < AI.engageDist || roomFoe);
  const faceTarget = engage || shooting;
  const yawGoal = t && faceTarget ? bearing(c.pos, t.pos) : group.facing;
  if (c.phase !== 'swing') {
    c.yaw += clamp(angleDiff(yawGoal, c.yaw), -AI.turnRate * dt, AI.turnRate * dt);
  }
  c.aimYaw = c.yaw;

  if (t) reactBlock(c, ai, t, dist, dt);
  if (c.phase === 'block' && c.phaseT > AI.blockHold) c.phase = 'idle';
  if (t) dodge(c, ai, t, dist);

  let mx = 0;
  let mz = 0;
  let speed = c.def.runSpeed;
  if (ai.dodgeT > 0 && t) {
    ai.dodgeT -= dt;
    const side = bearing(c.pos, t.pos) + (Math.PI / 2) * ai.dodgeDir;
    mx = Math.sin(side);
    mz = Math.cos(side);
    speed *= AI.dodgeSpeedMult;
  } else {
    let gx = ai.slotX;
    let gz = ai.slotZ;
    let tolerance = AI.slotTolerance;
    if (engage && t) {
      const reach = reachOn(w.reach, t);
      gx = t.pos.x;
      gz = t.pos.z;
      if (dist < AI.surroundRange) {
        gx += Math.sin(ai.slotAngle) * reach * 0.8;
        gz += Math.cos(ai.slotAngle) * reach * 0.8;
      }
      tolerance = 0.4;
    } else if (shooting && Math.hypot(gx - c.pos.x, gz - c.pos.z) < 4) {
      gx = c.pos.x;
      gz = c.pos.z;
    }
    [gx, gz] = world.routeGoal(c, gx, gz);
    const dx = gx - c.pos.x;
    const dz = gz - c.pos.z;
    const len = Math.hypot(dx, dz);
    if (len > tolerance) {
      mx = dx / len;
      mz = dz / len;
    }
    if (len < 2.5) speed = c.def.walkSpeed;
  }

  for (const o of world.units) {
    if (o === c || o.team !== c.team || o.dead || o.horse) continue;
    const ox = c.pos.x - o.pos.x;
    if (ox > AI.separation || ox < -AI.separation) continue;
    const oz = c.pos.z - o.pos.z;
    if (oz > AI.separation || oz < -AI.separation) continue;
    const d = Math.hypot(ox, oz);
    if (d < AI.separation && d > 0.01) {
      const s = (AI.separation - d) / AI.separation;
      mx += (ox / d) * s * 1.5;
      mz += (oz / d) * s * 1.5;
    }
  }
  if (c.phase === 'charge' || c.phase === 'block') speed *= w.ranged ? 0.2 : 0.5;
  if (c.phase === 'swing' || c.phase === 'recover') speed *= 0.25;
  moveVel(c, mx * speed, mz * speed, dt);

  if (!t) return;
  if (w.ranged) {
    if (!shooting) {
      if (c.phase === 'charge') c.phase = 'idle';
    } else if (c.phase === 'charge') {
      if (c.charge >= 1 && c.phaseT >= ai.releaseAt) c.releaseQueued = true;
    } else if (c.phase === 'idle') {
      startCharge(c, 'up');
      ai.releaseAt = w.chargeFull + Math.random() * ARCHER_AI.releaseJitter;
    }
    return;
  }

  // 出招：按目標速度預判，快馬衝埋嚟都有機會迎擊
  if (c.phase === 'charge' && c.phaseT >= ai.releaseAt) c.releaseQueued = true;
  const tv = t.velocity;
  const reach = reachOn(w.reach, t);
  if (
    c.phase === 'idle' && ai.cooldown <= 0 && dist < reach + Math.hypot(tv.x, tv.z) * w.windupMin
    && Math.abs(angleDiff(bearing(c.pos, t.pos), c.yaw)) < 0.5 && attackersOn(t, world) < AI.maxAttackersPerTarget
  ) {
    startCharge(c, randomDir());
    ai.releaseAt = randRange(w.windupMin, w.windupMin + 0.25);
    ai.cooldown = randRange(c.def.attackCooldown[0], c.def.attackCooldown[1]);
    ai.slotAngle += randRange(-0.5, 0.5);
  }
}

function reachOn(reach: number, t: Combatant): number {
  return reach + (t.horse ? HORSE_RADIUS * 0.6 : t.def.radius);
}

function reactBlock(c: Combatant, ai: AiState, t: Combatant, dist: number, dt: number) {
  if (t.attackId !== ai.seenAttack && (t.phase === 'charge' || t.phase === 'swing') && !t.weapon.ranged) {
    ai.seenAttack = t.attackId;
    if (dist < t.weapon.reach + 4) {
      ai.reactT = c.def.reaction;
      ai.willBlock = Math.random() < c.def.blockChance;
      ai.correctBlock = Math.random() < c.def.blockSkill;
    }
  }
  if (ai.reactT >= 0) {
    ai.reactT -= dt;
    if (ai.reactT < 0 && ai.willBlock && c.phase === 'idle') {
      startBlock(c, ai.correctBlock ? mirrorDir(t.dir) : randomDir());
    }
  }
}

function dodge(c: Combatant, ai: AiState, t: Combatant, dist: number) {
  const v = t.velocity;
  const speed = Math.hypot(v.x, v.z);
  const charging = speed > AI.chargeSpeed && dist < AI.chargeAwareDist
    && Math.abs(angleDiff(bearing(t.pos, c.pos), Math.atan2(v.x, v.z))) < 0.5;
  if (charging && !ai.dodgeDecided) {
    ai.dodgeDecided = true;
    if (Math.random() < c.def.dodgeChance) {
      ai.dodgeT = AI.dodgeTime;
      ai.dodgeDir = Math.random() < 0.5 ? -1 : 1;
    }
  }
  if (!charging && dist > AI.chargeAwareDist) ai.dodgeDecided = false;
}

function moveVel(c: Combatant, vx: number, vz: number, dt: number) {
  const step = AI.accel * dt;
  c.vel.x = moveToward(c.vel.x, vx, step);
  c.vel.z = moveToward(c.vel.z, vz, step);
}
