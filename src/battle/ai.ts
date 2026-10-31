import { AI } from '../data/units';
import { HORSE_RADIUS } from '../data/horses';
import { angleDiff, bearing, clamp, flatDist, moveToward, type AiState, type Combatant } from './entities';
import { mirrorDir, startBlock, startCharge, type CombatWorld } from './combat';
import type { AttackDir } from '../data/combat';

const DIRS: AttackDir[] = ['up', 'down', 'left', 'right'];
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export function makeAi(index: number, total: number): AiState {
  return {
    slotAngle: (index / total) * Math.PI * 2,
    cooldown: AI.startDelay + Math.random(),
    dodgeT: 0,
    dodgeDir: 1,
    dodgeDecided: false,
    seenAttack: 0,
    reactT: -1,
    willBlock: false,
    correctBlock: false,
  };
}

function attackersNow(world: CombatWorld): number {
  let n = 0;
  for (const u of world.units) {
    if (u.team !== 0 && !u.dead && (u.phase === 'charge' || u.phase === 'swing')) n++;
  }
  return n;
}

export function updateAi(c: Combatant, dt: number, world: CombatWorld) {
  const ai = c.ai!;
  const player = world.player;
  const w = c.weapon;
  ai.cooldown -= dt;

  if (player.dead) {
    if (c.phase === 'block') c.phase = 'idle';
    moveVel(c, 0, 0, dt);
    return;
  }

  const dist = flatDist(c.pos, player.pos);
  const toPlayer = bearing(c.pos, player.pos);
  const pv = player.velocity;
  const playerSpeed = Math.hypot(pv.x, pv.z);
  const reach = w.reach + (player.horse ? HORSE_RADIUS * 0.6 : player.def.radius);

  // 面向玩家
  const turn = clamp(angleDiff(toPlayer, c.yaw), -AI.turnRate * dt, AI.turnRate * dt);
  if (c.phase !== 'swing' && c.phase !== 'stagger') c.yaw += turn;
  c.aimYaw = c.yaw;

  // 舉防反應
  if (player.attackId !== ai.seenAttack && (player.phase === 'charge' || player.phase === 'swing')) {
    ai.seenAttack = player.attackId;
    if (dist < player.weapon.reach + 4) {
      ai.reactT = c.def.reaction;
      ai.willBlock = Math.random() < c.def.blockChance;
      ai.correctBlock = Math.random() < c.def.blockSkill;
    }
  }
  if (ai.reactT >= 0) {
    ai.reactT -= dt;
    if (ai.reactT < 0 && ai.willBlock && c.phase === 'idle') {
      const right = mirrorDir(player.dir);
      startBlock(c, ai.correctBlock ? right : DIRS[Math.floor(Math.random() * 4)]);
    }
  }
  if (c.phase === 'block' && c.phaseT > AI.blockHold) c.phase = 'idle';

  // 閃避衝鋒
  const charging = playerSpeed > AI.chargeSpeed && dist < AI.chargeAwareDist
    && Math.abs(angleDiff(bearing(player.pos, c.pos), Math.atan2(pv.x, pv.z))) < 0.5;
  if (charging && !ai.dodgeDecided) {
    ai.dodgeDecided = true;
    if (Math.random() < c.def.dodgeChance) {
      ai.dodgeT = AI.dodgeTime;
      ai.dodgeDir = Math.random() < 0.5 ? -1 : 1;
    }
  }
  if (!charging && dist > AI.chargeAwareDist) ai.dodgeDecided = false;

  // 移動
  let mx = 0;
  let mz = 0;
  let speed = c.def.runSpeed;
  if (ai.dodgeT > 0) {
    ai.dodgeT -= dt;
    const side = toPlayer + (Math.PI / 2) * ai.dodgeDir;
    mx = Math.sin(side);
    mz = Math.cos(side);
    speed *= AI.dodgeSpeedMult;
  } else if (ai.cooldown < 3.5 || dist > AI.surroundRange) {
    // 喺玩家周圍搵自己個位，避免全部疊埋一齊
    let gx = player.pos.x;
    let gz = player.pos.z;
    if (dist < AI.surroundRange) {
      const ring = reach * 0.8;
      gx += Math.sin(ai.slotAngle) * ring;
      gz += Math.cos(ai.slotAngle) * ring;
    }
    const dx = gx - c.pos.x;
    const dz = gz - c.pos.z;
    const len = Math.hypot(dx, dz);
    if (len > 0.5) {
      mx = dx / len;
      mz = dz / len;
    }
    if (len < 2) speed = c.def.walkSpeed;
  }
  for (const o of world.units) {
    if (o === c || o.team !== c.team || o.dead) continue;
    const d = flatDist(c.pos, o.pos);
    if (d < AI.separation && d > 0.01) {
      const s = (AI.separation - d) / AI.separation;
      mx += ((c.pos.x - o.pos.x) / d) * s * 1.5;
      mz += ((c.pos.z - o.pos.z) / d) * s * 1.5;
    }
  }
  if (c.phase === 'charge' || c.phase === 'block') speed *= 0.5;
  if (c.phase === 'swing' || c.phase === 'recover') speed *= 0.25;
  if (c.phase === 'stagger' || !c.grounded) return;
  moveVel(c, mx * speed, mz * speed, dt);

  // 出招：按玩家速度預判，快馬衝埋嚟都有機會迎擊
  if (c.phase === 'charge' && c.phaseT >= rand(w.windupMin, w.windupMin + 0.25)) c.releaseQueued = true;
  if (
    c.phase === 'idle' && ai.cooldown <= 0 && dist < reach + playerSpeed * w.windupMin
    && Math.abs(angleDiff(toPlayer, c.yaw)) < 0.5 && attackersNow(world) < AI.maxConcurrentAttackers
  ) {
    startCharge(c, DIRS[Math.floor(Math.random() * 4)]);
    ai.cooldown = rand(c.def.attackCooldown[0], c.def.attackCooldown[1]);
    ai.slotAngle += rand(-0.5, 0.5);
  }
}

function moveVel(c: Combatant, vx: number, vz: number, dt: number) {
  const step = AI.accel * dt;
  c.vel.x = moveToward(c.vel.x, vx, step);
  c.vel.z = moveToward(c.vel.z, vz, step);
}
