import './style.css';
import { Battle } from './battle/battle';
import { applyBattle, deployment, enemyLevel, loadRoster } from './core/roster';
import { CAMPAIGN } from './data/gacha';
import { HORSES } from './data/horses';
import { DEFAULT_LOADOUT } from './data/weapons';
import { Camp, type CampChoice } from './ui/camp';
import { Hud } from './ui/hud';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const hud = new Hud(document.getElementById('ui')!);
const battle = new Battle(canvas, hud);

let roster = loadRoster();
const choice: CampChoice = { horse: HORSES[0], loadout: DEFAULT_LOADOUT };
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

async function begin() {
  battle.sfx.unlock();
  hud.hideScreen();
  battle.start(choice.horse, choice.loadout, deployment(roster), enemyLevel(roster));
  inBattle = true;
  await lockMouse();
}

function showPause(message = '') {
  hud.showPause(() => void resume(), () => void begin(), () => battle.retreat(), message);
}

function pause() {
  if (!inBattle || !battle.running) return;
  battle.running = false;
  battle.input.clear();
  releaseMouse();
  showPause();
}

async function resume() {
  if (!(await lockMouse())) {
    showPause('瀏覽器仲未放行滑鼠，隔一秒再撳「繼續」。');
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

const camp = new Camp(hud, roster, choice, () => void begin(), (r) => { roster = r; });

battle.onPauseKey = () => pause();
battle.onEnd = (result) => {
  inBattle = false;
  releaseMouse();
  const gold = Math.round(result.gold * (result.win ? 1 : CAMPAIGN.loseGoldRatio));
  const progress = applyBattle(roster, result.outcomes, gold, result.win);
  hud.showResult(result, progress, () => void begin(), () => camp.show());
};

camp.show();

if (import.meta.env.DEV) {
  (window as unknown as { __mb: Battle }).__mb = battle;
}
