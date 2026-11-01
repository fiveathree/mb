import { Vector3 } from 'three';
import { crownOf, musouOf } from '../data/crowns';
import { SKILL_RULES, SKILL_TUNE as T, skillsOf, type SkillDef } from '../data/skills';
import { skillHit, startMusou, type MusouWorld } from './musou';
import type { Combatant } from './entities';

export interface SkillWorld extends MusouWorld {
  /** 喺 c 身邊變出幫手 */
  spawnAlly(c: Combatant, unit: string | null, life: number, x: number, z: number): void;
}

const tmp = new Vector3();
const foesNear = (w: SkillWorld, c: Combatant, r: number) => w.units.filter((t) => t.team !== c.team && !t.dead && Math.hypot(t.pos.x - c.pos.x, t.pos.z - c.pos.z) <= r);
const forward = (w: SkillWorld, c: Combatant): [number, number] => {
  const yaw = c === w.player ? c.aimYaw : c.yaw;
  return [Math.sin(yaw), Math.cos(yaw)];
};
const at = (c: Combatant, y = 1) => tmp.set(c.pos.x, c.pos.y + y, c.pos.z);

function grow(c: Combatant, k: number) {
  c.rig.root.scale.multiplyScalar(k);
  c.horse?.rig.root.scale.multiplyScalar(k);
}

function sweepLine(w: SkillWorld, c: Combatant, mult: number) {
  const [fx, fz] = forward(w, c);
  const r = SKILL_RULES.line.radius!;
  for (let d = 4; d <= T.lineReach; d += 6) w.fx.pillar(tmp.set(c.pos.x + fx * d, c.pos.y + 0.3, c.pos.z + fz * d), musouOf(c.def.crown!).color, 2);
  for (const t of w.units) {
    if (t.team === c.team || t.dead) continue;
    const dx = t.pos.x - c.pos.x;
    const dz = t.pos.z - c.pos.z;
    const along = dx * fx + dz * fz;
    if (along > 0 && along < T.lineReach && Math.abs(dx * fz - dz * fx) < r) skillHit(w, c, t, c.pos.x, c.pos.z, mult);
  }
}

/** 放招：回傳有冇放到 */
export function castSkill(w: SkillWorld, c: Combatant, s: SkillDef) {
  const rule = SKILL_RULES[s.kind];
  const color = musouOf(c.def.crown!).color;
  w.fx.ring(at(c, 0.3), 4, color);
  w.fx.flashAt(at(c, 2), color);
  w.sfx.boom();
  if (c === w.player) w.musouCut(s.name, color);
  else w.announce(`${c.def.name}：${s.name}！`, 'guard');
  const time = rule.time ?? 0;
  switch (s.kind) {
    case 'clones':
    case 'summon': {
      const n = rule.power!;
      const unit = s.kind === 'summon' ? crownOf(c.def.crown)?.army[0]?.[0] ?? null : null;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        w.spawnAlly(c, unit, time, c.pos.x + Math.cos(a) * 3, c.pos.z + Math.sin(a) * 3);
      }
      break;
    }
    case 'guard': c.guardT = Math.max(c.guardT, time); break;
    case 'focus': c.focusT = time; break;
    case 'drain': c.drainT = time; break;
    case 'stealth':
      c.stealthT = time;
      for (const u of w.units) if (u.team !== c.team && u.ai?.target === c) u.ai.retarget = 0;
      break;
    case 'giant':
      if (c.giantT <= 0) grow(c, rule.power!);
      c.giantT = time;
      c.stompT = 0;
      break;
    case 'cloud':
      c.cloudT = time;
      c.guardT = Math.max(c.guardT, time);
      break;
    case 'line':
      for (let i = 0; i < T.lineSweeps; i++) c.lineQueue.push(i * 0.22);
      break;
    case 'bind':
      for (const t of foesNear(w, c, rule.radius!)) {
        if (t.def.colossal) continue;
        t.bindT = time;
        w.fx.pillar(at(t, 0), color, 1);
      }
      break;
    case 'fear':
      w.fx.ring(at(c, 0.6), rule.radius!, color);
      for (const t of foesNear(w, c, rule.radius!)) t.morale -= rule.power!;
      break;
    case 'heal':
      w.fx.ring(at(c, 0.3), rule.radius!, color);
      for (const u of w.units) {
        if (u.team !== c.team || u.dead || Math.hypot(u.pos.x - c.pos.x, u.pos.z - c.pos.z) > rule.radius!) continue;
        u.hp = Math.min(u.def.hp, u.hp + u.def.hp * rule.power!);
        w.fx.pillar(at(u, 0), color, 1);
      }
      break;
    default:
      startMusou(w, c, { name: s.name, style: s.kind, color }, rule.power);
  }
}

export function trySkill(w: SkillWorld, c: Combatant, i: number) {
  const s = skillsOf(c.def.crown)[i];
  if (!s || c.dead || c.musouT > 0) return;
  if (c.skillCd[i] > 0) {
    if (c === w.player) w.announce(`${s.name} 冷卻 ${Math.ceil(c.skillCd[i])} 秒`, 'guard');
    return;
  }
  c.skillCd[i] = SKILL_RULES[s.kind].cd;
  castSkill(w, c, s);
}

function tick(w: SkillWorld, c: Combatant, dt: number) {
  for (let i = 0; i < c.skillCd.length; i++) c.skillCd[i] = Math.max(0, c.skillCd[i] - dt);
  c.guardT = Math.max(0, c.guardT - dt);
  c.focusT = Math.max(0, c.focusT - dt);
  c.drainT = Math.max(0, c.drainT - dt);
  c.stealthT = Math.max(0, c.stealthT - dt);
  for (let i = c.lineQueue.length - 1; i >= 0; i--) {
    c.lineQueue[i] -= dt;
    if (c.lineQueue[i] > 0) continue;
    c.lineQueue.splice(i, 1);
    sweepLine(w, c, SKILL_RULES.line.power!);
    w.shake(0.3);
  }
  if (c.giantT > 0) {
    c.giantT -= dt;
    c.stompT -= dt;
    if (c.stompT <= 0) {
      c.stompT = T.stompEvery;
      const r = SKILL_RULES.giant.radius!;
      w.fx.ring(at(c, 0.3), r, musouOf(c.def.crown!).color);
      w.shake(0.35);
      for (const t of foesNear(w, c, r)) skillHit(w, c, t, c.pos.x, c.pos.z, T.stompMult);
    }
    if (c.giantT <= 0) grow(c, 1 / SKILL_RULES.giant.power!);
  }
  if (c.cloudT > 0) {
    c.cloudT -= dt;
    const [fx, fz] = forward(w, c);
    const v = SKILL_RULES.cloud.power! * dt;
    const x = c.pos.x + fx * v;
    const z = c.pos.z + fz * v;
    if (w.inBounds(x, z)) {
      const body = c.horse ?? c;
      body.pos.x = c.pos.x = x;
      body.pos.z = c.pos.z = z;
    }
    w.fx.burst(at(c, 0.8), 0xf4f0e0, 3, 2);
    c.stompT -= dt;
    if (c.stompT <= 0) {
      c.stompT = T.cloudHitEvery;
      for (const t of foesNear(w, c, SKILL_RULES.cloud.radius!)) skillHit(w, c, t, c.pos.x, c.pos.z, T.cloudMult);
    }
  }
}

export function updateSkills(w: SkillWorld, dt: number) {
  for (const u of [...w.units]) {
    if (u.bindT > 0) {
      u.bindT -= dt;
      u.vel.x = u.vel.z = 0;
    }
    if (u.lifeT > 0) {
      u.lifeT -= dt;
      if (u.lifeT <= 0 && !u.dead) {
        u.fled = true;
        u.dead = true;
        w.fx.burst(at(u), 0xf4f0e0, 12, 3);
      }
    }
    if (!u.def.crown || u.dead) continue;
    tick(w, u, dt);
    if (u === w.player) continue;
    // 部隊入面嘅冠位：有敵埋身就逐招放
    u.skillThink -= dt;
    if (u.skillThink > 0) continue;
    u.skillThink = T.aiEvery;
    if (!foesNear(w, u, T.aiRange).length) continue;
    const ready = skillsOf(u.def.crown).map((_, i) => i).filter((i) => u.skillCd[i] <= 0);
    if (ready.length) trySkill(w, u, ready[Math.floor(Math.random() * ready.length)]);
  }
}

/** 主角飄喺雲上嘅高度 */
export const hover = (c: Combatant) => (c.cloudT > 0 ? 3 : 0);
