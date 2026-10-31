import './style.css';
import { Battle } from './battle/battle';
import { HORSES, type HorseDef } from './data/horses';
import { Hud } from './ui/hud';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const hud = new Hud(document.getElementById('ui')!);
const battle = new Battle(canvas, hud);

let horse: HorseDef = HORSES[0];
let inBattle = false;
let ignoreUnlock = false;

/** Esc 之後瀏覽器要隔約一秒先再鎖得滑鼠，失敗就留喺暫停畫面 */
async function lockMouse(): Promise<boolean> {
  try {
    await canvas.requestPointerLock();
    return true;
  } catch {
    return false;
  }
}

function releaseMouse() {
  if (document.pointerLockElement) {
    ignoreUnlock = true;
    document.exitPointerLock();
  }
}

async function begin(h: HorseDef) {
  horse = h;
  battle.sfx.unlock();
  hud.hideScreen();
  battle.start(horse);
  inBattle = true;
  await lockMouse();
}

function pause(message = '') {
  if (!inBattle || !battle.running) return;
  battle.running = false;
  battle.input.clear();
  releaseMouse();
  hud.showPause(() => void resume(), () => void begin(horse), message);
}

async function resume() {
  if (!(await lockMouse())) {
    hud.showPause(() => void resume(), () => void begin(horse), '瀏覽器仲未放行滑鼠，隔一秒再撳「繼續」。');
    return;
  }
  hud.hideScreen();
  battle.running = true;
}

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement) return;
  if (ignoreUnlock) {
    ignoreUnlock = false;
    return;
  }
  pause();
});

battle.onPauseKey = () => pause();
battle.onEnd = (result) => {
  inBattle = false;
  releaseMouse();
  hud.showResult(result, () => void begin(horse), () => hud.showTitle(horse, (h) => void begin(h)));
};

hud.showTitle(horse, (h) => void begin(h));

if (import.meta.env.DEV) {
  (window as unknown as { __mb: Battle }).__mb = battle;
}
