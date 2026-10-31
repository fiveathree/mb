import { COMBAT } from '../data/combat';
import { FLIGHT, HORSE_INJURED_MIN_SPEED, HORSE_MIN_TURN_SPEED, HORSE_RADIUS, RIVER } from '../data/horses';
import { BATTLEFIELD } from '../data/battlefield';
import { heightAt, inRiver, type Obstacle } from './terrain';
import { clamp, moveToward, type Horse } from './entities';

/** 低速時嘅最細轉彎半徑（公尺） */
const LOW_SPEED_RADIUS = 2.5;

/** 回傳今幀轉向角度（弧度），鏡頭用嚟跟轉 */
export function updateHorse(h: Horse, dt: number, obstacles: Obstacle[]): number {
  const d = h.def;
  const ctl = h.ctl;
  if (h.dead) {
    h.deadT += dt;
    return 0;
  }

  const health = HORSE_INJURED_MIN_SPEED + (1 - HORSE_INJURED_MIN_SPEED) * (h.hp / d.hp);
  if (h.stamina <= 0) h.exhausted = true;
  if (h.exhausted && h.stamina >= d.staminaResume) h.exhausted = false;
  const sprinting = ctl.sprint && ctl.throttle > 0 && !h.exhausted;

  let target = 0;
  if (ctl.throttle > 0) target = (sprinting ? d.gallopSpeed : d.trotSpeed) * health;
  else if (ctl.throttle < 0 && h.speed < 0.5) target = -d.reverseSpeed;
  // 河：識游水快少少，飛緊就冇影響，其他減速
  if (inRiver(h.pos.z) && h.grounded) target *= d.swim ? RIVER.swimBoost : d.flight ? 1 : RIVER.slow;
  // 馬唔可以原地掉頭：要行起先轉得
  if (ctl.turn !== 0 && ctl.throttle >= 0 && target < HORSE_MIN_TURN_SPEED) target = HORSE_MIN_TURN_SPEED;

  const rate = ctl.throttle < 0 ? d.brake : h.speed < target ? d.accel : d.coast;
  const flying = !!d.flight && !h.grounded;
  if (h.grounded || flying) h.speed = moveToward(h.speed, target, rate * dt);

  const climbing = flying && !!ctl.climb && !h.exhausted;
  const drain = (sprinting ? d.staminaDrain : 0) + (climbing ? FLIGHT.staminaDrain : 0);
  h.stamina = clamp(h.stamina + (drain ? -drain : d.staminaRegen) * dt, 0, d.stamina);

  const ratio = clamp(Math.abs(h.speed) / d.gallopSpeed, 0, 1);
  const radius = LOW_SPEED_RADIUS + (d.turnRadius - LOW_SPEED_RADIUS) * ratio;
  const omega = Math.min(d.maxTurnRate, Math.abs(h.speed) / radius);
  const turned = ctl.turn * omega * dt * Math.sign(h.speed || 1) * (h.grounded || flying ? 1 : 0.35);
  h.heading += turned;
  h.turnInput += (ctl.turn - h.turnInput) * (1 - Math.exp(-6 * dt));

  h.vel.set(Math.sin(h.heading) * h.speed, 0, Math.cos(h.heading) * h.speed);
  h.pos.x += h.vel.x * dt;
  h.pos.z += h.vel.z * dt;

  const above = h.pos.y - heightAt(h.pos.x, h.pos.z) > FLIGHT.clearance;
  for (const o of above ? [] : obstacles) {
    const dx = h.pos.x - o.x;
    const dz = h.pos.z - o.z;
    if (Math.abs(dx) > 4 || Math.abs(dz) > 4) continue;
    const min = o.r + HORSE_RADIUS;
    const dist = Math.hypot(dx, dz);
    if (dist < min && dist > 0.001) {
      h.pos.x = o.x + (dx / dist) * min;
      h.pos.z = o.z + (dz / dist) * min;
      h.speed *= Math.pow(0.05, dt);
    }
  }

  const fromCenter = Math.hypot(h.pos.x, h.pos.z);
  if (fromCenter > BATTLEFIELD.arenaRadius) {
    h.pos.x *= BATTLEFIELD.arenaRadius / fromCenter;
    h.pos.z *= BATTLEFIELD.arenaRadius / fromCenter;
    h.speed *= Math.pow(0.02, dt);
  }

  const ground = heightAt(h.pos.x, h.pos.z);
  if (h.grounded) {
    h.pos.y = ground;
    if (ctl.jump) {
      h.vy = d.jumpSpeed;
      h.grounded = false;
    }
  } else {
    if (flying) {
      const lift = climbing && h.pos.y - ground < FLIGHT.ceiling ? FLIGHT.climb : -FLIGHT.sink;
      h.vy = moveToward(h.vy, lift, FLIGHT.accel * dt);
    } else {
      h.vy -= COMBAT.gravity * dt;
    }
    h.pos.y += h.vy * dt;
    if (h.pos.y <= ground) {
      h.pos.y = ground;
      h.grounded = true;
      h.vy = 0;
    }
  }
  return turned;
}
