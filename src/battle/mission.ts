import * as THREE from 'three';
import { MISSION_RULES as R, type MissionDef } from '../data/missions';
import { moveVel } from './ai';
import { heightAt } from './terrain';
import type { Combatant } from './entities';
import type { Battle } from './battle';

interface Spot {
  x: number;
  z: number;
  t: number;
  done: boolean;
  beam: THREE.Mesh;
}

const near = (a: Combatant, x: number, z: number) => Math.hypot(a.pos.x - x, a.pos.z - z);

/** 職業工作：打獵、做嘢、避守衛 */
export class Mission {
  spots: Spot[] = [];
  /** 完成度 0–1 */
  score = 0;
  caught = false;
  private t: number;
  private quarry = 0;
  private over = false;
  private turnT = new Map<Combatant, number>();

  constructor(private b: Battle, public def: MissionDef) {
    this.t = def.time;
    const p = b.player;
    const foes = b.units.filter((u) => u.team === 1);
    this.quarry = foes.length;
    for (const u of foes) {
      const a = Math.random() * Math.PI * 2;
      const r = def.task === 'fight' ? 18 + Math.random() * 8 : R.spreadMin + Math.random() * (R.spreadMax - R.spreadMin);
      u.pos.x = p.pos.x + Math.cos(a) * r;
      u.pos.z = p.pos.z + Math.abs(Math.sin(a)) * r;
      u.pos.y = heightAt(u.pos.x, u.pos.z);
      u.calm = def.task !== 'fight';
      if (u.ai) u.ai.group.order = 'charge';
    }
    for (let i = 0; i < (def.spots?.n ?? 0); i++) this.addSpot(i);
    b.hud.announce(def.brief, 'guard');
  }

  private addSpot(i: number) {
    const s = this.def.spots!;
    const p = this.b.player;
    const a = -0.9 + (1.8 * (i + 0.5)) / s.n + Math.random() * 0.3;
    const r = 18 + i * 9 + Math.random() * 6;
    const x = p.pos.x + Math.sin(a) * r;
    const z = p.pos.z + Math.cos(a) * r;
    const y = heightAt(x, z);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 7, 10, 1, true), new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    beam.position.set(x, y + 3.5, z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 1.1), new THREE.MeshLambertMaterial({ color: s.color }));
    base.position.set(x, y + 0.4, z);
    this.b.addProp(beam);
    this.b.addProp(base);
    this.spots.push({ x, z, t: 0, done: false, beam });
  }

  /** 動物、守衛：未發現你就自己行 */
  private creature(u: Combatant, dt: number) {
    const p = this.b.player;
    const dist = near(u, p.pos.x, p.pos.z);
    const hurt = u.hp < u.def.hp;
    const flees = !!u.def.animal?.flee;
    if (flees) {
      if (dist < R.aggro || hurt) {
        const d = Math.max(dist, 0.1);
        const vx = ((u.pos.x - p.pos.x) / d) * u.def.runSpeed;
        const vz = ((u.pos.z - p.pos.z) / d) * u.def.runSpeed;
        moveVel(u, vx, vz, dt);
        u.yaw = Math.atan2(vx, vz);
        if (dist > R.escape) {
          u.fled = true;
          u.dead = true;
        }
        return;
      }
    } else if (dist < (this.def.task === 'stealth' ? R.aggro * 0.7 : R.aggro) || hurt) {
      u.calm = false;
      if (this.def.task === 'stealth' && !this.caught) {
        this.caught = true;
        this.b.hud.announce('畀人發現！快走', 'hurt');
      }
      return;
    }
    const turn = (this.turnT.get(u) ?? 0) - dt;
    this.turnT.set(u, turn <= 0 ? 2 + Math.random() * 3 : turn);
    if (turn <= 0) u.yaw = Math.random() * Math.PI * 2;
    moveVel(u, Math.sin(u.yaw) * u.def.walkSpeed * 0.6, Math.cos(u.yaw) * u.def.walkSpeed * 0.6, dt);
  }

  private work(dt: number) {
    const s = this.def.spots;
    if (!s) return '';
    const p = this.b.player;
    const spot = this.spots.find((o) => !o.done && near(p, o.x, o.z) < R.spotReach);
    if (!spot) {
      for (const o of this.spots) o.t = Math.max(0, o.t - dt);
      return '';
    }
    if (this.b.input.down('KeyE')) spot.t += dt;
    if (spot.t >= s.hold) {
      spot.done = true;
      spot.beam.visible = false;
      this.b.sfx.ui();
      this.b.hud.announce(`${s.verb}完成`, 'guard');
    }
    return `　按住 E ${s.verb} ${Math.round((spot.t / s.hold) * 100)}%`;
  }

  update(dt: number) {
    if (this.over) return;
    this.t -= dt;
    for (const u of this.b.units) if (u.calm && !u.dead) this.creature(u, dt);
    const hint = this.work(dt);
    const foes = this.b.units.filter((u) => u.team === 1);
    const taken = foes.filter((u) => u.dead && !u.fled).length;
    const left = foes.filter((u) => !u.dead).length;
    const done = this.spots.filter((o) => o.done).length;
    const total = this.spots.length;
    let goal: string;
    let finished: boolean;
    if (this.def.task === 'hunt' || this.def.task === 'fight') {
      this.score = this.quarry ? taken / this.quarry : 1;
      goal = `${taken}／${this.quarry}`;
      finished = left === 0;
    } else {
      this.score = total ? done / total : 1;
      goal = `${done}／${total}`;
      finished = done === total;
    }
    this.b.hud.setMission(`${this.def.brief}　${goal}　剩 ${Math.ceil(this.t)} 秒${hint}`);
    if (finished || this.t <= 0 || this.b.player.dead) {
      this.over = true;
      this.b.hud.setMission('');
      this.b.endMission(finished && !this.b.player.dead);
    }
  }
}
