import { Vector3 } from 'three';
import { COLOSSI, COLOSSUS, GIANT_MOVES, type GiantMove } from '../data/colossus';
import { COLORS } from '../data/battlefield';
import { musouHit, type CombatWorld } from './combat';
import { angleDiff, flatDist, type Combatant } from './entities';

export interface GiantState {
  /** 下次可以出招嘅倒數 */
  cool: number;
  move: GiantMove | null;
  t: number;
  fired: boolean;
  x: number;
  z: number;
  yaw: number;
  spots: { x: number; z: number }[];
  /** 下一步腳步仲差幾遠 */
  step: number;
}

const tmp = new Vector3();

function hurt(w: CombatWorld, c: Combatant, t: Combatant, damage: number, x: number, z: number) {
  const d = Math.max(Math.hypot(t.pos.x - x, t.pos.z - z), 0.01);
  musouHit(w, c, t, damage, (t.pos.x - x) / d, (t.pos.z - z) / d);
}

const enemies = (w: CombatWorld, c: Combatant) => w.units.filter((t) => t.team !== c.team && !t.dead);

/** 震動跟距離：遠處都感受到 */
function quake(w: CombatWorld, x: number, z: number, power: number) {
  const d = Math.hypot(w.player.pos.x - x, w.player.pos.z - z);
  w.shake(Math.max(0, 1 - d / COLOSSUS.shakeRange) * power);
}

function begin(w: CombatWorld, c: Combatant, s: GiantState, move: GiantMove, target: Combatant) {
  const m = GIANT_MOVES[move];
  s.move = move;
  s.t = 0;
  s.fired = false;
  s.yaw = Math.atan2(target.pos.x - c.pos.x, target.pos.z - c.pos.z);
  c.yaw = s.yaw;
  c.phase = 'charge';
  c.phaseT = 0;
  c.releaseQueued = false;
  c.vel.x = 0;
  c.vel.z = 0;
  const y = c.pos.y;
  const warn = (x: number, z: number, r: number) => w.fx.warn(tmp.set(x, y, z), r, m.wind);
  const [fx, fz] = [Math.sin(s.yaw), Math.cos(s.yaw)];
  switch (move) {
    case 'stomp':
      s.x = c.pos.x;
      s.z = c.pos.z;
      warn(s.x, s.z, m.radius);
      break;
    case 'slam':
      s.x = target.pos.x;
      s.z = target.pos.z;
      warn(s.x, s.z, m.radius);
      break;
    case 'sweep':
      warn(c.pos.x + fx * m.radius * 0.6, c.pos.z + fz * m.radius * 0.6, m.radius * 0.7);
      break;
    case 'breath':
      for (let i = 1; i <= COLOSSUS.breathSteps; i++) {
        const l = (i / COLOSSUS.breathSteps) * m.range;
        warn(c.pos.x + fx * l, c.pos.z + fz * l, m.radius);
      }
      break;
    case 'bolts': {
      const list = enemies(w, c);
      s.spots = Array.from({ length: COLOSSUS.bolts }, () => {
        const t = list[Math.floor(Math.random() * list.length)];
        return { x: t.pos.x + (Math.random() - 0.5) * 6, z: t.pos.z + (Math.random() - 0.5) * 6 };
      });
      for (const p of s.spots) warn(p.x, p.z, m.radius);
      break;
    }
  }
}

function fire(w: CombatWorld, c: Combatant, s: GiantState) {
  const m = GIANT_MOVES[s.move!];
  const y = c.pos.y;
  const near = (x: number, z: number, r: number) => enemies(w, c).filter((t) => Math.hypot(t.pos.x - x, t.pos.z - z) <= r);
  const blast = (x: number, z: number, r: number) => {
    tmp.set(x, y + 0.4, z);
    w.fx.ring(tmp, r, COLORS.dust);
    w.fx.pillar(tmp, COLORS.dust, r * 0.5);
    for (const t of near(x, z, r)) hurt(w, c, t, m.damage, x, z);
  };
  const [fx, fz] = [Math.sin(s.yaw), Math.cos(s.yaw)];
  switch (s.move) {
    case 'stomp':
    case 'slam':
      blast(s.x, s.z, m.radius);
      w.sfx.boom();
      quake(w, s.x, s.z, 1);
      break;
    case 'sweep':
      for (const t of near(c.pos.x, c.pos.z, m.radius + c.def.radius)) {
        const bearing = Math.atan2(t.pos.x - c.pos.x, t.pos.z - c.pos.z);
        if (Math.abs(angleDiff(bearing, s.yaw)) < COLOSSUS.sweepArc) hurt(w, c, t, m.damage, c.pos.x, c.pos.z);
      }
      tmp.set(c.pos.x + fx * m.radius * 0.6, y + 1, c.pos.z + fz * m.radius * 0.6);
      w.fx.ring(tmp, m.radius * 0.7, COLORS.dust);
      w.sfx.boom();
      quake(w, c.pos.x, c.pos.z, 0.8);
      break;
    case 'breath':
      for (let i = 1; i <= COLOSSUS.breathSteps; i++) {
        const l = (i / COLOSSUS.breathSteps) * m.range;
        const x = c.pos.x + fx * l;
        const z = c.pos.z + fz * l;
        tmp.set(x, y, z);
        w.fx.pillar(tmp, 0xff7a2a, m.radius * 0.7);
        w.fx.flashAt(tmp, 0xff8a3a);
        for (const t of near(x, z, m.radius)) hurt(w, c, t, m.damage / 2, x, z);
      }
      w.sfx.boom();
      quake(w, c.pos.x, c.pos.z, 0.7);
      break;
    case 'bolts':
      for (const p of s.spots) {
        tmp.set(p.x, y, p.z);
        w.fx.bolt(tmp);
        for (const t of near(p.x, p.z, m.radius)) hurt(w, c, t, m.damage, p.x, p.z);
      }
      w.sfx.thunder();
      quake(w, s.spots[0].x, s.spots[0].z, 0.6);
      break;
  }
}

function pick(c: Combatant, dist: number): GiantMove {
  const dragon = c.def.race === 'dragon';
  const list: GiantMove[] = dist < GIANT_MOVES.stomp.range + c.def.radius ? ['stomp', 'sweep'] : dragon ? ['breath', 'sweep'] : ['slam', 'sweep'];
  if (!dragon && Math.random() < 0.3) list.push('bolts');
  if (dragon && Math.random() < 0.5) list.push('breath');
  return list[Math.floor(Math.random() * list.length)];
}

/** 取代普通 AI：行得慢，一步一震，招招有預兆 */
export function updateColossus(c: Combatant, dt: number, w: CombatWorld) {
  const s = (c.giant ??= { cool: COLOSSUS.rest, move: null, t: 0, fired: false, x: 0, z: 0, yaw: 0, spots: [], step: 0 });
  c.mp = c.def.mp ?? 0;
  if (s.move) {
    const m = GIANT_MOVES[s.move];
    s.t += dt;
    c.vel.x = c.vel.z = 0;
    if (!s.fired && s.t >= m.wind) {
      s.fired = true;
      fire(w, c, s);
      c.phase = c.weapon.swingTime ? 'swing' : 'idle';
      c.phaseT = 0;
    }
    if (s.t >= m.wind + COLOSSUS.recover) {
      s.move = null;
      s.cool = COLOSSUS.rest;
      c.phase = 'idle';
    }
    return;
  }
  const list = enemies(w, c);
  if (!list.length) return;
  // 主角喺附近就優先追主角
  const target = list.reduce((b, t) => (flatDist(c.pos, t.pos) * (t === w.player ? 0.6 : 1) < flatDist(c.pos, b.pos) * (b === w.player ? 0.6 : 1) ? t : b));
  const dist = flatDist(c.pos, target.pos);
  s.cool -= dt;
  const move = pick(c, dist);
  if (s.cool <= 0 && dist < GIANT_MOVES[move].range + c.def.radius) {
    begin(w, c, s, move, target);
    return;
  }
  const yaw = Math.atan2(target.pos.x - c.pos.x, target.pos.z - c.pos.z);
  c.yaw += angleDiff(yaw, c.yaw) * (1 - Math.exp(-1.6 * dt));
  const go = dist > c.def.radius + 6 ? COLOSSUS.walkSpeed : 0;
  c.vel.x = Math.sin(c.yaw) * go;
  c.vel.z = Math.cos(c.yaw) * go;
  s.step -= go * dt;
  if (go && s.step <= 0) {
    s.step = COLOSSI[c.def.id].height * 0.32;
    tmp.set(c.pos.x, c.pos.y + 0.3, c.pos.z);
    w.fx.ring(tmp, c.def.radius * 1.4, COLORS.dust);
    quake(w, c.pos.x, c.pos.z, 0.45);
    w.sfx.thud();
  }
}
