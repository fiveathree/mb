import { Vector3 } from 'three';
import { MUSOU_RULES, MUSOU_STYLES, musouOf, sigId, type MusouDef } from '../data/crowns';
import { WEAPONS } from '../data/weapons';
import { mirrorDir, musouHit, type CombatWorld } from './combat';
import { flatDist, type Combatant } from './entities';

/** 發緊嘅絕招 */
export interface MusouCast {
  c: Combatant;
  def: MusouDef;
  t: number;
  step: number;
  hits: number;
  damage: number;
}

export interface MusouWorld extends CombatWorld {
  casts: MusouCast[];
  /** 玩家出招時嘅大字 */
  musouCut(name: string, color: number): void;
  /** 呢點係咪仲喺戰場入面 */
  inBounds(x: number, z: number): boolean;
}

const tmp = new Vector3();

const foes = (w: MusouWorld, c: Combatant, x: number, z: number, radius: number) => w.units.filter((t) => (
  t.team !== c.team && !t.dead && Math.hypot(t.pos.x - x, t.pos.z - z) <= radius && !w.wallBlocks(x, z, t.pos.x, t.pos.z, c.pos.y + 1)
));

/** 主角睇住邊就打邊 */
function forward(w: MusouWorld, c: Combatant): [number, number] {
  const yaw = c === w.player ? c.aimYaw : c.yaw;
  return [Math.sin(yaw), Math.cos(yaw)];
}

function hit(w: MusouWorld, cast: MusouCast, t: Combatant, x: number, z: number, scale = 1) {
  const { c, def } = cast;
  const weapon = WEAPONS[sigId({ id: c.def.crown! })];
  const power = weapon.spell ? c.def.spellMult ?? 1 : c.def.damageMult ?? 1;
  const d = Math.max(Math.hypot(t.pos.x - x, t.pos.z - z), 0.01);
  const dealt = musouHit(w, c, t, weapon.baseDamage * power * MUSOU_STYLES[def.style].mult * scale, (t.pos.x - x) / d, (t.pos.z - z) / d);
  if (!dealt) return;
  cast.hits++;
  cast.damage += dealt;
}

/** 近戰招每步揮一下，法系同弓唔使 */
function swing(c: Combatant) {
  if (!c.weapon.swingTime) return;
  c.dir = mirrorDir(c.dir);
  c.phase = 'swing';
  c.phaseT = 0;
}

function moveTo(w: MusouWorld, c: Combatant, x: number, z: number) {
  if (!w.inBounds(x, z) || w.wallBlocks(c.pos.x, c.pos.z, x, z, c.pos.y + 1)) return false;
  const body = c.horse ?? c;
  body.pos.x = x;
  body.pos.z = z;
  c.pos.x = x;
  c.pos.z = z;
  return true;
}

/** 每種招式每一步做嘅嘢 */
function run(w: MusouWorld, cast: MusouCast) {
  const { c, def } = cast;
  const s = MUSOU_STYLES[def.style];
  const [fx, fz] = forward(w, c);
  const at = (x: number, z: number, y = c.pos.y + 0.3) => tmp.set(x, y, z);
  const before = cast.hits;
  if (def.style === 'whirl' || def.style === 'charge' || def.style === 'shadow') swing(c);
  switch (def.style) {
    case 'whirl':
      w.fx.ring(at(c.pos.x, c.pos.z, c.pos.y + 1), s.radius, def.color);
      for (const t of foes(w, c, c.pos.x, c.pos.z, s.radius)) hit(w, cast, t, c.pos.x, c.pos.z);
      break;
    case 'charge':
      moveTo(w, c, c.pos.x + fx * s.reach, c.pos.z + fz * s.reach);
      w.fx.burst(at(c.pos.x, c.pos.z, c.pos.y + 1), def.color, 26, 8);
      for (const t of foes(w, c, c.pos.x, c.pos.z, s.radius)) hit(w, cast, t, c.pos.x, c.pos.z);
      break;
    case 'rain': {
      // 向前方落一片，唔使瞄得好準
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * s.spread;
      const x = c.pos.x + fx * s.reach + Math.cos(a) * r;
      const z = c.pos.z + fz * s.reach + Math.sin(a) * r;
      // 隔牆嗰邊落唔到
      if (w.wallBlocks(c.pos.x, c.pos.z, x, z, c.pos.y + 1)) break;
      w.fx.pillar(at(x, z), def.color, 4);
      for (const t of foes(w, c, x, z, s.radius)) hit(w, cast, t, x, z);
      break;
    }
    case 'nova': {
      const radius = s.radius * (cast.step + 1);
      w.fx.ring(at(c.pos.x, c.pos.z, c.pos.y + 0.6), radius, def.color);
      w.fx.flashAt(at(c.pos.x, c.pos.z, c.pos.y + 6), def.color);
      w.sfx.boom();
      for (const t of foes(w, c, c.pos.x, c.pos.z, radius)) hit(w, cast, t, c.pos.x, c.pos.z);
      break;
    }
    case 'thunder': {
      const list = foes(w, c, c.pos.x, c.pos.z, s.reach);
      const t = list[Math.floor(Math.random() * list.length)];
      const a = cast.step * 2.4;
      const x = t ? t.pos.x : c.pos.x + Math.cos(a) * s.spread;
      const z = t ? t.pos.z : c.pos.z + Math.sin(a) * s.spread;
      w.fx.bolt(at(x, z, t ? t.pos.y : c.pos.y));
      w.sfx.thunder();
      for (const u of foes(w, c, x, z, s.radius)) hit(w, cast, u, x, z);
      break;
    }
    case 'shadow': {
      const list = foes(w, c, c.pos.x, c.pos.z, s.reach);
      const t = list[Math.floor(Math.random() * list.length)];
      if (!t) break;
      w.fx.burst(at(c.pos.x, c.pos.z, c.pos.y + 1), def.color, 18, 5);
      moveTo(w, c, t.pos.x - fx * 1.2, t.pos.z - fz * 1.2);
      for (const u of foes(w, c, t.pos.x, t.pos.z, s.radius)) hit(w, cast, u, c.pos.x, c.pos.z);
      break;
    }
    case 'rally':
      w.fx.ring(at(c.pos.x, c.pos.z), s.radius, def.color);
      for (const u of w.units) {
        if (u.team !== c.team || u.dead || flatDist(u.pos, c.pos) > s.reach) continue;
        u.hp = Math.min(u.def.hp, u.hp + u.def.hp * MUSOU_RULES.rallyHeal);
        u.morale = Math.min(u.def.morale, u.morale + MUSOU_RULES.rallyMorale);
        w.fx.pillar(at(u.pos.x, u.pos.z, u.pos.y), def.color, 1);
      }
      for (const t of foes(w, c, c.pos.x, c.pos.z, s.radius)) hit(w, cast, t, c.pos.x, c.pos.z);
      break;
  }
  // 打中先有反饋，每步一下，唔理中幾多個
  if (cast.hits === before || c !== w.player) return;
  w.sfx.hit(true);
  w.shake(MUSOU_RULES.stepShake);
  w.announce(`${cast.hits} 連擊`, 'hit');
}

/** 收招：有打中人先有重擊感 */
function finish(w: MusouWorld, cast: MusouCast) {
  if (cast.c !== w.player || !cast.hits) return;
  w.slowMo(MUSOU_RULES.finishSlow);
  w.shake(MUSOU_RULES.finishShake);
  w.sfx.boom();
  w.announce(`${cast.def.name}：${cast.hits} 連擊，${cast.damage} 傷害`, 'kill');
}

/** 出招時間：招式打完先解除無敵 */
const castTime = (def: MusouDef) => {
  const s = MUSOU_STYLES[def.style];
  return s.steps * s.every + MUSOU_RULES.windup;
};

export function startMusou(w: MusouWorld, c: Combatant) {
  const def = musouOf(c.def.crown!);
  c.musou = 0;
  c.musouT = castTime(def);
  // 打斷手上動作，專心出招
  c.phase = 'idle';
  c.charge = 0;
  c.releaseQueued = false;
  c.couched = false;
  c.musouReady = false;
  c.vel.x = 0;
  c.vel.z = 0;
  w.casts.push({ c, def, t: -MUSOU_RULES.windup, step: 0, hits: 0, damage: 0 });
  tmp.set(c.pos.x, c.pos.y, c.pos.z);
  w.fx.pillar(tmp, def.color, 5);
  w.fx.ring(tmp, 3, def.color);
  w.fx.flashAt(tmp, def.color);
  w.sfx.boom();
  w.shake(0.5);
  if (c === w.player) {
    w.slowMo(MUSOU_RULES.startSlow);
    w.musouCut(def.name, def.color);
  } else w.announce(`${c.def.name}：${def.name}！`, 'guard');
}

export function updateMusou(w: MusouWorld, dt: number) {
  for (const u of w.units) {
    if (u.dead || !u.def.crown) continue;
    u.musouT = Math.max(0, u.musouT - dt);
    if (u.musouT <= 0) u.musou = Math.min(MUSOU_RULES.max, u.musou + MUSOU_RULES.perSecond * dt);
    if (u === w.player && u.musou >= MUSOU_RULES.max && !u.musouReady) {
      u.musouReady = true;
      w.sfx.ui();
      w.announce('戰技已滿！撳 R', 'kill');
    }
    // 部隊入面嘅冠位：氣滿又有敵人埋身就自己放
    if (u !== w.player && u.musou >= MUSOU_RULES.max && foes(w, u, u.pos.x, u.pos.z, MUSOU_RULES.aiRange).length) startMusou(w, u);
  }
  for (const cast of [...w.casts]) {
    cast.t += dt;
    const s = MUSOU_STYLES[cast.def.style];
    while (cast.step < s.steps && cast.t >= cast.step * s.every && !cast.c.dead) {
      run(w, cast);
      cast.step++;
    }
    if (cast.def.style === 'whirl' && !cast.c.horse) cast.c.yaw += MUSOU_RULES.spin * dt;
    if (cast.step < s.steps && !cast.c.dead) continue;
    w.casts.splice(w.casts.indexOf(cast), 1);
    finish(w, cast);
  }
}
