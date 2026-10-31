import { MORALE } from '../data/units';
import { flatDist, type Combatant } from './entities';

function rout(c: Combatant, units: Combatant[]) {
  if (c.routing || c.def.id === 'player') return;
  c.routing = true;
  c.morale = 0;
  c.couched = false;
  for (const u of units) {
    if (u.team === c.team && !u.dead && flatDist(u.pos, c.pos) < MORALE.allyDeathRadius) {
      u.morale -= MORALE.allyRoutLoss;
    }
  }
}

/** 有人倒下：附近友軍士氣跌，兇手士氣升 */
export function onDeath(t: Combatant, by: Combatant, units: Combatant[]) {
  const commander = t.def.id === 'player';
  for (const u of units) {
    if (u.team !== t.team || u.dead) continue;
    if (commander) u.morale -= MORALE.commanderLoss;
    else if (flatDist(u.pos, t.pos) < MORALE.allyDeathRadius) u.morale -= MORALE.allyDeathLoss;
  }
  if (by !== t) by.morale += MORALE.killGain;
}

/** 每秒結算一次士氣 */
export function tickMorale(units: Combatant[]) {
  const counts = [0, 0];
  const totals = [0, 0];
  for (const u of units) {
    totals[u.team]++;
    if (!u.dead && !u.routing) counts[u.team]++;
  }
  for (const u of units) {
    if (u.dead || u.routing || u.def.id === 'player') continue;
    let allies = 0;
    let foes = 0;
    for (const o of units) {
      if (o.dead || o.routing) continue;
      if (Math.abs(o.pos.x - u.pos.x) + Math.abs(o.pos.z - u.pos.z) > MORALE.localRadius * 1.4) continue;
      if (o.team === u.team) allies++;
      else foes++;
    }
    if (foes > 0 && allies / foes < MORALE.outnumberedRatio) u.morale -= MORALE.outnumberedLossPerSec;
    if (u.hp / u.def.hp < MORALE.woundedHpRatio) u.morale -= MORALE.woundedLossPerSec;
    if (counts[u.team] / totals[u.team] < MORALE.collapseRatio) u.morale -= MORALE.collapseLossPerSec;
    if (u.morale <= 0) rout(u, units);
  }
}

/** 全軍平均士氣 */
export function teamMorale(units: Combatant[], team: number): number {
  let sum = 0;
  let n = 0;
  for (const u of units) {
    if (u.team !== team || u.dead || u.routing || u.def.id === 'player') continue;
    sum += u.morale / u.def.morale;
    n++;
  }
  return n ? sum / n : 0;
}
