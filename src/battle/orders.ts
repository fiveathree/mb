import { BATTLEFIELD, FORMATION } from '../data/battlefield';
import type { FormationShape } from '../data/formations';
import { ENEMY_COMMAND, ROLE_KEYS, type Role } from '../data/units';
import { clamp, type Combatant } from './entities';

export type OrderType = 'hold' | 'follow' | 'charge';

export const ORDER_LABEL: Record<OrderType, string> = { hold: '守住', follow: '跟隨', charge: '衝鋒' };

/** 隊形：回傳（橫向位置，向後排數），單位係一個間距 */
function shapeSlot(shape: FormationShape, i: number, n: number): [number, number] {
  switch (shape) {
    case 'line':
      return [i - (n - 1) / 2, 0];
    case 'wings': {
      // 中央凹入，兩翼前伸
      const side = i % 2 ? 1 : -1;
      const step = Math.ceil(i / 2);
      return [side * step, -step * 0.7 + n * 0.2];
    }
    case 'wedge': {
      // 箭頭向前
      const side = i % 2 ? 1 : -1;
      const step = Math.ceil(i / 2);
      return [side * step, step * 0.9];
    }
    case 'ring': {
      const a = (i / n) * Math.PI * 2;
      const r = Math.max(2, n / 5);
      return [Math.sin(a) * r, Math.cos(a) * r];
    }
    case 'square': {
      const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
      const row = Math.floor(i / cols);
      return [(i % cols) - (cols - 1) / 2, row * 0.8];
    }
    default: {
      const cols = Math.max(1, Math.ceil(Math.sqrt(n * FORMATION.rowsAspect)));
      const row = Math.floor(i / cols);
      const rowCount = Math.min(cols, n - row * cols);
      return [(i % cols) - (rowCount - 1) / 2, row];
    }
  }
}

/** 同一陣營同一兵種嘅編隊 */
export class Group {
  members: Combatant[] = [];
  order: OrderType = 'hold';
  loose = false;
  holdFire = false;
  shape: FormationShape = 'block';
  /** 地下城守衛固定喺自己房 */
  fixedSlots = false;
  anchorX = 0;
  anchorZ = 0;
  facing = 0;

  constructor(public team: number, public role: Role) {}

  get alive(): Combatant[] {
    return this.members.filter((m) => !m.dead && !m.routing);
  }

  setAnchor(x: number, z: number, facing: number) {
    const r = Math.hypot(x, z);
    const max = BATTLEFIELD.arenaRadius - 8;
    if (r > max) {
      x *= max / r;
      z *= max / r;
    }
    this.anchorX = x;
    this.anchorZ = z;
    this.facing = facing;
    this.assignSlots();
  }

  /** 排成多行陣形，將每人個位寫入 AI 狀態 */
  assignSlots() {
    if (this.fixedSlots) return;
    const list = this.alive;
    const spacing = this.loose ? FORMATION.looseSpacing : FORMATION.tightSpacing;
    const size = spacing * (this.role === 'cavalry' ? 1.8 : 1);
    const fx = Math.sin(this.facing);
    const fz = Math.cos(this.facing);
    const rx = -fz;
    const rz = fx;
    list.forEach((m, i) => {
      const [col, row] = shapeSlot(this.shape, i, list.length);
      const ai = m.ai;
      if (!ai) return;
      ai.slotX = this.anchorX + rx * col * size - fx * row * size;
      ai.slotZ = this.anchorZ + rz * col * size - fz * row * size;
    });
  }
}

export function makeGroups(team: number): Group[] {
  return ROLE_KEYS.map((r) => new Group(team, r));
}

/** 開局陣地 */
export function deployGroup(g: Group) {
  const sign = g.team === 0 ? -1 : 1;
  const facing = g.team === 0 ? 0 : Math.PI;
  const o = FORMATION.offset[g.role];
  g.setAnchor(o.side * -sign, sign * (FORMATION.startZ - o.forward), facing);
}

/** 敵軍簡單指揮：弓兵停喺射程，步兵逼近後全面衝鋒，騎兵遲少少出擊 */
export function thinkEnemy(groups: Group[], foes: Combatant[], time: number) {
  const alive = foes.filter((f) => !f.dead && !f.routing);
  if (!alive.length) return;
  let cx = 0;
  let cz = 0;
  for (const f of alive) {
    cx += f.pos.x;
    cz += f.pos.z;
  }
  cx /= alive.length;
  cz /= alive.length;

  const [inf, arc, cav, mage] = groups;
  const infAlive = inf.alive;
  // 冇步兵嘅敵軍，弓兵照樣用自己位置判斷
  let ix = cx;
  let iz = cz + FORMATION.startZ;
  if (infAlive.length) {
    ix = infAlive.reduce((s, m) => s + m.pos.x, 0) / infAlive.length;
    iz = infAlive.reduce((s, m) => s + m.pos.z, 0) / infAlive.length;
  }
  const dist = Math.hypot(cx - ix, cz - iz);
  const facing = Math.atan2(cx - ix, cz - iz);
  const nx = (cx - ix) / Math.max(dist, 0.01);
  const nz = (cz - iz) / Math.max(dist, 0.01);

  if (dist < ENEMY_COMMAND.infantryChargeDist) {
    inf.order = 'charge';
  } else {
    inf.setAnchor(ix + nx * ENEMY_COMMAND.advanceStep, iz + nz * ENEMY_COMMAND.advanceStep, facing);
  }

  // 弓兵行到射程內就停
  const arcAlive = arc.alive;
  if (arcAlive.length) {
    const ax = arcAlive.reduce((s, m) => s + m.pos.x, 0) / arcAlive.length;
    const az = arcAlive.reduce((s, m) => s + m.pos.z, 0) / arcAlive.length;
    const d = Math.hypot(cx - ax, cz - az);
    const standoff = arcAlive.some((m) => m.def.boss) ? ENEMY_COMMAND.bossStandoff : ENEMY_COMMAND.archerStandoff;
    const go = clamp(d - standoff, 0, ENEMY_COMMAND.advanceStep);
    const fa = Math.atan2(cx - ax, cz - az);
    arc.setAnchor(ax + Math.sin(fa) * go, az + Math.cos(fa) * go, fa);
    mage.setAnchor(ax + Math.sin(fa) * go + 8, az + Math.cos(fa) * go - 6, fa);
  }

  if (time >= ENEMY_COMMAND.cavalryDelay) cav.order = 'charge';
}
