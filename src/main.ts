import './style.css';
import { Battle, type BattleResult } from './battle/battle';
import { applyBattle, autoResolve, deployment, newRoster, racePenalty, type BattleProgress, type Roster } from './core/roster';
import { SLOT_COUNT, deleteSlot, readSlots, writeSlot, type GameSave } from './core/save';
import type { ArmyEntry } from './data/battlefield';
import { CAMPAIGN, POOLS } from './data/gacha';
import { HORSES } from './data/horses';
import { DEFAULT_LOADOUT } from './data/weapons';
import { MORALE_PARTY, type BattleTheme, type PlaceDef } from './data/world';
import { Camp, type CampChoice } from './ui/camp';
import { Hud } from './ui/hud';
import { PlaceScreens } from './ui/place';
import { WorldView } from './worldmap/view';
import { World, banditArmy, dayOf, isNight, newWorld, type BanditParty, type WorldSave } from './worldmap/world';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const mapCanvas = document.getElementById('map') as HTMLCanvasElement;
const hud = new Hud(document.getElementById('ui')!);
const battle = new Battle(canvas, hud);
const choice: CampChoice = { horse: HORSES[0], loadout: DEFAULT_LOADOUT };

let slot = 0;
let roster: Roster = newRoster();
let world = new World(newWorld(), roster);
const camp = new Camp(hud, roster, choice);
let inBattle = false;
let ignoreUnlock = false;
let afterBattle: (win: boolean) => string = () => '';
/** 而家喺邊個地點入面，返回用 */
let currentPlace: PlaceDef | null = null;

const screens = new PlaceScreens(hud, world, roster, {
  onLeave: () => backToMap(),
  onParty: () => camp.show(() => reopenPlace()),
  onAttack: (p) => attackPlace(p),
  onBandit: (b, auto) => fightBandit(b, auto),
  onEscaped: () => backToMap(),
});
const view = new WorldView(mapCanvas, world);

function saveGame() {
  const data: GameSave = {
    version: 2, savedAt: Date.now(),
    roster: JSON.parse(JSON.stringify(roster)) as Roster,
    world: JSON.parse(JSON.stringify(world.save)) as WorldSave,
  };
  writeSlot(slot, data).catch(() => hud.announce('存檔失敗', 'hurt'));
}

function useGame(r: Roster, w: WorldSave) {
  roster = r;
  world = new World(w, r);
  view.setWorld(world);
  camp.setRoster(r);
  screens.bind(world, r);
}

function backToMap() {
  currentPlace = null;
  hud.hideHud();
  hud.closeScreen();
  saveGame();
  view.start();
}

function reopenPlace() {
  if (!currentPlace) {
    hud.closeScreen();
    view.start();
    return;
  }
  openPlace(currentPlace);
}

function openPlace(p: PlaceDef) {
  currentPlace = p;
  view.stop();
  saveGame();
  if (p.kind === 'town') screens.town(p);
  else if (p.kind === 'village') screens.village(p);
  else screens.site(p);
}

function moraleMult(): number {
  const { battleMin, battleMax } = MORALE_PARTY;
  const m = Math.max(0, world.save.morale - racePenalty(roster)) / 100;
  return battleMin + (battleMax - battleMin) * m;
}

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

async function startBattle(enemy: ArmyEntry[], enemyLevel: number, theme: BattleTheme, done: (win: boolean) => string) {
  const soldiers = deployment(roster);
  afterBattle = done;
  view.stop();
  battle.sfx.unlock();
  hud.hideScreen();
  battle.start({
    horse: choice.horse, loadout: choice.loadout, soldiers, enemy, enemyLevel, theme, moraleMult: moraleMult(),
  });
  inBattle = true;
  await lockMouse();
}

function attackPlace(p: PlaceDef) {
  void startBattle(p.garrison!, p.garrisonLevel ?? 1, p.theme ?? 'plains', (win) => {
    if (!win) return '';
    world.markCleared(p);
    if (p.gold) roster.gold += p.gold;
    if (p.pool && p.tickets) roster.tickets[p.pool] += p.tickets;
    return p.pool ? `${POOLS[p.pool].ticket} ×${p.tickets}、${p.gold} 金` : '';
  });
}

function fightBandit(b: BanditParty, auto: boolean) {
  const army = banditArmy(b);
  if (auto) {
    const res = autoResolve(roster, army, b.level);
    const progress = applyBattle(roster, res.outcomes, res.gold, res.win);
    world.winMorale(res.win);
    if (res.win) world.removeBandit(b);
    else world.escape(b);
    showAutoResult(res.win, progress);
    return;
  }
  void startBattle(army, b.level, isNight(world.save) ? 'night' : 'plains', (win) => {
    if (win) world.removeBandit(b);
    else world.escape(b);
    return '';
  });
}

function showAutoResult(win: boolean, p: BattleProgress) {
  hud.showScreen(`
    <div class="card">
      <h2 class="${win ? 'win' : 'lose'}">${win ? '勝利' : '敗退'}</h2>
      <p class="sub">獲得 ${p.gold} 金，陣亡 ${p.lost.length} 人，傷兵 ${p.hurt} 人，升級 ${p.levelUps.length} 人。</p>
      <div class="row"><button class="go" id="next">返回大地圖</button></div>
    </div>`);
  document.getElementById('next')!.onclick = backToMap;
}

function showPause(message = '') {
  hud.showPause(() => void resume(), () => battle.retreat(), message);
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

battle.onPauseKey = () => pause();
battle.onEnd = (result: BattleResult) => {
  inBattle = false;
  battle.active = false;
  releaseMouse();
  const gold = Math.round(result.gold * (result.win ? 1 : CAMPAIGN.loseGoldRatio));
  const progress = applyBattle(roster, result.outcomes, gold, result.win);
  world.winMorale(result.win);
  const extra = afterBattle(result.win);
  hud.showResult(result, progress, extra, backToMap);
};

view.onEvent = (e) => {
  if (e.type === 'place') openPlace(e.place);
  else {
    view.stop();
    screens.bandit(e.bandit);
  }
};
view.onParty = () => {
  view.stop();
  camp.show(() => reopenPlace());
};
view.onMenu = () => {
  view.stop();
  saveGame();
  void showMenu();
};

async function showMenu() {
  const slots = await readSlots();
  const line = (i: number) => {
    const s = slots[i];
    const info = s ? `第 ${dayOf(s.world)} 日・兵 ${s.roster.soldiers.length}・勝 ${s.roster.wins}` : '空';
    return `<div class="slot"><span>存檔 ${i + 1}：${info}</span>
      <button class="go small" data-load="${i}">${s ? '繼續' : '新遊戲'}</button>
      ${s ? `<button class="alt small" data-del="${i}">刪除</button>` : ''}</div>`;
  };
  hud.hideHud();
  hud.showScreen(`
    <div class="card">
      <h1>鐵騎風雲</h1>
      <p class="sub">由無名傭兵開始，帶隊遊走裂天大陸，攻城闖迷宮，招募四方豪傑。</p>
      ${Array.from({ length: SLOT_COUNT }, (_, i) => line(i)).join('')}
    </div>`);
  document.querySelectorAll<HTMLElement>('#screen [data-load]').forEach((el) => {
    el.onclick = () => {
      slot = Number(el.dataset.load);
      const s = slots[slot];
      if (s) useGame(s.roster, s.world);
      else useGame(newRoster(), newWorld());
      backToMap();
    };
  });
  document.querySelectorAll<HTMLElement>('#screen [data-del]').forEach((el) => {
    el.onclick = () => {
      if (el.dataset.armed) void deleteSlot(Number(el.dataset.del)).then(showMenu);
      else {
        el.dataset.armed = '1';
        el.textContent = '再撳確認';
      }
    };
  });
}

void showMenu();

if (import.meta.env.DEV) {
  Object.assign(window, { __mb: { battle, view, get world() { return world; }, get roster() { return roster; } } });
}
