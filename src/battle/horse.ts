import { HORSE_INJURED_MIN_SPEED, HORSE_MIN_TURN_SPEED, HORSE_RADIUS } from '../data/horses';
import { BATTLEFIELD } from '../data/battlefield';
import { heightAt, type Obstacle } from './terrain';
import { clamp, moveToward, type Horse } from './entities';

export interface HorseControl {
  throttle: number;
  turn: number;
  sprint: boolean;
  jump: boolean;
}

const GRAVITY = 16;
/** 低速時嘅最細轉彎半徑（公尺） */
const LOW_SPEED_RADIUS = 2.5;

/** 回傳今幀轉向角度（弧度），鏡頭用嚟跟轉 */
export function updateHorse(h: Horse, ctl: HorseControl, dt: number, obstacles: Obstacle[]): number {
  const d = h.def;
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
  // 馬唔可以原地掉頭：要行起先轉得
  if (ctl.turn !== 0 && ctl.throttle >= 0 && target < HORSE_MIN_TURN_SPEED) target = HORSE_MIN_TURN_SPEED;

  const rate = ctl.throttle < 0 ? d.brake : h.speed < target ? d.accel : d.coast;
  if (h.grounded) h.speed = moveToward(h.speed, target, rate * dt);

  h.stamina = clamp(h.stamina + (sprinting ? -d.staminaDrain : d.staminaRegen) * dt, 0, d.stamina);

  const ratio = clamp(Math.abs(h.speed) / d.gallopSpeed, 0, 1);
  const radius = LOW_SPEED_RADIUS + (d.turnRadius - LOW_SPEED_RADIUS) * ratio;
  const omega = Math.min(d.maxTurnRate, Math.abs(h.speed) / radius);
  const turned = ctl.turn * omega * dt * Math.sign(h.speed || 1) * (h.grounded ? 1 : 0.35);
  h.heading += turned;
  h.turnInput += (ctl.turn - h.turnInput) * (1 - Math.exp(-6 * dt));

  h.vel.set(Math.sin(h.heading) * h.speed, 0, Math.cos(h.heading) * h.speed);
  h.pos.x += h.vel.x * dt;
  h.pos.z += h.vel.z * dt;

  for (const o of obstacles) {
    const dx = h.pos.x - o.x;
    const dz = h.pos.z - o.z;
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
    h.vy -= GRAVITY * dt;
    h.pos.y += h.vy * dt;
    if (h.pos.y <= ground) {
      h.pos.y = ground;
      h.grounded = true;
      h.vy = 0;
    }
  }
  return turned;
}
