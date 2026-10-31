import type { AttackDir } from '../data/combat';

const RECENT_DECAY = 7; // 滑鼠方向記憶每秒衰減率
const DIR_DEADZONE = 2;
const MAX_MOUSE_STEP = 400;
const ATTACK_BUFFER = 0.2;
const WHEEL_BUFFER = 0.25; // 出招中轉武器，等收招後先生效
const WHEEL_COOLDOWN = 0.12; // 避免觸控板一下滑動轉過晒所有武器

const GAME_KEYS = new Set(['Tab', 'Space', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6']);

export class Input {
  private keys = new Set<string>();
  private pressedKeys = new Set<string>();
  mouseDx = 0;
  mouseDy = 0;
  lmb = false;
  rmb = false;
  attackBuffer = 0;
  /** 滾輪方向：-1 上一件、1 下一件 */
  wheelStep = 0;
  private wheelBuffer = 0;
  private wheelCooldown = 0;
  private rx = 0;
  private ry = 0;
  private lastDir: AttackDir = 'right';

  constructor(el: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pressedKeys.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
    window.addEventListener('mousemove', (e) => this.addMouse(e.movementX, e.movementY));
    el.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.lmb = true;
        this.attackBuffer = ATTACK_BUFFER;
      } else if (e.button === 2) {
        this.rmb = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.lmb = false;
      else if (e.button === 2) this.rmb = false;
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.wheelCooldown > 0 || e.deltaY === 0) return;
      this.wheelStep = Math.sign(e.deltaY);
      this.wheelBuffer = WHEEL_BUFFER;
      this.wheelCooldown = WHEEL_COOLDOWN;
    }, { passive: false });
  }

  addMouse(dx: number, dy: number) {
    // 部分瀏覽器鎖滑鼠時偶然有爆數，會令鏡頭跳
    if (Math.abs(dx) > MAX_MOUSE_STEP || Math.abs(dy) > MAX_MOUSE_STEP) return;
    this.mouseDx += dx;
    this.mouseDy += dy;
    this.rx += dx;
    this.ry += dy;
  }

  down(code: string): boolean {
    return this.keys.has(code);
  }

  pressed(code: string): boolean {
    return this.pressedKeys.has(code);
  }

  /** 最近滑鼠移動方向，用嚟決定攻擊／格擋方向 */
  direction(): AttackDir {
    const ax = Math.abs(this.rx);
    const ay = Math.abs(this.ry);
    if (Math.max(ax, ay) >= DIR_DEADZONE) {
      if (ax >= ay) this.lastDir = this.rx < 0 ? 'left' : 'right';
      else this.lastDir = this.ry < 0 ? 'up' : 'down';
    }
    return this.lastDir;
  }

  /** 每幀尾呼叫 */
  endFrame(dt: number) {
    this.mouseDx = 0;
    this.mouseDy = 0;
    this.pressedKeys.clear();
    const k = Math.exp(-RECENT_DECAY * dt);
    this.rx *= k;
    this.ry *= k;
    this.attackBuffer = Math.max(0, this.attackBuffer - dt);
    this.wheelCooldown = Math.max(0, this.wheelCooldown - dt);
    this.wheelBuffer = Math.max(0, this.wheelBuffer - dt);
    if (this.wheelBuffer === 0) this.wheelStep = 0;
  }

  clear() {
    this.keys.clear();
    this.lmb = false;
    this.rmb = false;
    this.attackBuffer = 0;
    this.wheelStep = 0;
    this.wheelBuffer = 0;
  }
}
