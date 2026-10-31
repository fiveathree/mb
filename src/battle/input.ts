import type { AttackDir } from '../data/combat';

const RECENT_DECAY = 7; // 滑鼠方向記憶每秒衰減率
const DIR_DEADZONE = 2;
const ATTACK_BUFFER = 0.2;

const GAME_KEYS = new Set(['Tab', 'Space', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6']);

export class Input {
  private keys = new Set<string>();
  private pressedKeys = new Set<string>();
  mouseDx = 0;
  mouseDy = 0;
  lmb = false;
  rmb = false;
  attackBuffer = 0;
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
  }

  addMouse(dx: number, dy: number) {
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
  }

  clear() {
    this.keys.clear();
    this.lmb = false;
    this.rmb = false;
    this.attackBuffer = 0;
  }
}
