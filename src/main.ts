import './style.css';
import { Battle, type BattleResult } from './battle/battle';
import { createHero, gainHeroXp, playerDef, playerHorse, skillOf } from './core/hero';
import { ARTIFACTS, DUNGEON, PLAYABLE, START_REGIONS, factionOf } from './data/factions';
import { showNewGame } from './ui/newgame';
import { showFormationPick } from './ui/formation';
import { formationsFor, type FormationCheck } from './core/formation';
import { applyScenario, currentScenario, scenarioOf } from './data/scenarios';
import {
  addSoldier, applyBattle, autoResolve, deployment, migrateRoster, newRoster, racePenalty, type BattleProgress, type Roster, type Soldier,
} from './core/roster';
import { SLOT_COUNT, deleteSlot, readSlots, writeSlot, type GameSave } from './core/save';
import type { ArmyEntry } from './data/battlefield';
import { ARENA, HERO, NPC_RULES } from './data/economy';
import { CAMPAIGN, POOLS } from './data/gacha';
import { MORALE_PARTY, PLACES, type BattleTheme, type PlaceDef } from './data/world';
import { Camp } from './ui/camp';
import { Hud } from './ui/hud';
import { PlaceScreens } from './ui/place';
import { raiderArmy, type Npc } from './worldmap/npcs';
import { WorldView } from './worldmap/view';
import { World, banditArmy, dayOf, isNight, newWorld, type BanditParty, type WorldSave } from './worldmap/world';

const FORMATION_MIN_TROOPS = 4;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const mapCanvas = document.getElementById('map') as HTMLCanvasElement;
const hud = new Hud(document.getElementById('ui')!);
const battle = new Battle(canvas, hud);

let slot = 0;
let roster: Roster = newRoster();
let world = new World(newWorld(), roster);
const camp = new Camp(hud, roster, world);
let inBattle = false;
let ignoreUnlock = false;
let afterBattle: (win: boolean) => string = () => '';
/** 競技場唔計部隊戰利品 */
let arenaFight = false;
/** 而家喺邊個地點入面，返回用 */
let currentPlace: PlaceDef | null = null;

const screens = new PlaceScreens(hud, world, roster, {
  onLeave: () => backToMap(),
  onParty: () => camp.show(() => reopenPlace()),
  onAttack: (p) => attackPlace(p),
  onBandit: (b, auto) => fightBandit(b, auto),
  onEscaped: () => backToMap(),
  onArena: (town, bet) => fightArena(town, bet),
  onRaider: (n) => fightRaider(n),
  onSiege: (p, breaches) => assaultFief(p, breaches),
  onDefend: (p, by) => defendFief(p, by),
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
  applyScenario(w.scenario ?? 'chaos');
  roster = migrateRoster(r);
  world = new World(w, roster);
  view.setWorld(world);
  camp.setRoster(roster, world);
  screens.bind(world, roster);
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
  return (battleMin + (battleMax - battleMin) * m) * (1 + skillOf(roster.hero, roster.soldiers, 'tactics') * 0.03);
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

async function startBattle(
  enemy: ArmyEntry[], enemyLevel: number, theme: BattleTheme, done: (win: boolean) => string, soldiers: Soldier[] = deployment(roster),
  extra: { breaches?: number; dismount?: boolean; firstPerson?: boolean } = {},
) {
  afterBattle = done;
  view.stop();
  const h = roster.hero;
  const launch = async (formations: FormationCheck[]) => {
    battle.sfx.unlock();
    hud.hideScreen();
    battle.start({
      playerDef: playerDef(h), horse: playerHorse(h), loadout: h.loadout, soldiers, enemy, enemyLevel, theme, moraleMult: moraleMult(), ...extra,
      formations,
    });
    inBattle = true;
    await lockMouse();
  };
  // 一個人或者地下城唔使佈陣
  if (soldiers.length < FORMATION_MIN_TROOPS || extra.firstPerson) {
    await launch([]);
    return;
  }
  showFormationPick(hud, formationsFor(currentScenario().cultures, h, soldiers), (order) => void launch(order));
}

function placeReward(p: PlaceDef): string {
  const out: string[] = [];
  if (p.gold) {
    roster.gold += p.gold;
    out.push(`${p.gold} 金`);
  }
  if (p.pool && p.tickets) {
    roster.tickets[p.pool] += p.tickets;
    out.push(`${POOLS[p.pool].ticket} ×${p.tickets}`);
  }
  const art = ARTIFACTS.find((a) => a.id === p.artifact);
  if (art && !roster.hero.artifacts.includes(art.id)) {
    roster.hero.artifacts.push(art.id);
    out.push(`神器 ${art.name}`);
  }
  return out.join('、');
}

function attackPlace(p: PlaceDef) {
  const crawl = p.kind === 'dungeon' || p.kind === 'maze';
  const party = crawl ? deployment(roster).slice(0, DUNGEON.partySize) : deployment(roster);
  void startBattle(p.garrison!, p.garrisonLevel ?? 1, p.theme ?? 'plains', (win) => {
    if (!win) return '';
    world.markCleared(p);
    return placeReward(p);
  }, party, crawl ? { dismount: true, firstPerson: true } : {});
}

function assaultFief(p: PlaceDef, breaches: number) {
  const pol = world.politics;
  const g = pol.garrisonOf(p)!;
  void startBattle(g.army, g.level, p.theme ?? 'fort', (win) => {
    if (!win) return '';
    pol.capture(p);
    const reward = placeReward(p);
    return `攻陷${p.name}${reward ? `、${reward}` : ''}`;
  }, deployment(roster), { breaches, dismount: true });
}

function defendFief(p: PlaceDef, by: string) {
  const pol = world.politics;
  const f = factionOf(by)!;
  void startBattle(f.garrison, f.level, 'plains', (win) => {
    if (!win) return '';
    pol.s.threats = pol.s.threats.filter((t) => t.place !== p.id);
    return `成功保衛${p.name}`;
  });
}

function fightBandit(b: BanditParty, auto: boolean) {
  const army = banditArmy(b);
  if (auto) {
    const res = autoResolve(roster, army, b.level);
    const progress = applyBattle(roster, res.outcomes, res.gold, res.win);
    if (res.win) gainHeroXp(roster.hero, HERO.xpBattleWin);
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

function fightRaider(n: Npc) {
  void startBattle(raiderArmy(n), n.kind === 'dragon' ? 6 : NPC_RULES.raiderLevel, n.kind === 'dragon' ? 'night' : 'plains', (win) => {
    if (!win) return '';
    world.npcs.remove(n);
    if (n.kind === 'dragon') {
      if (!roster.hero.artifacts.includes('dragon_bone')) roster.hero.artifacts.push('dragon_bone');
      roster.gold += 3000;
      return '討伐巨龍！神器 龍骨刃、3000 金';
    }
    roster.gold += NPC_RULES.raiderGold;
    return `截擊掠奪隊 ${NPC_RULES.raiderGold} 金`;
  });
}

function fightArena(town: PlaceDef, bet: boolean) {
  const w = world.save;
  const round = ARENA.rounds[Math.min(w.arenaWins, ARENA.rounds.length - 1)];
  if (bet && !roster.infiniteGold) roster.gold -= ARENA.bet;
  arenaFight = true;
  void startBattle(round.enemy, round.level, 'fort', (win) => {
    w.arenaUntil[town.id] = dayOf(w) + ARENA.cooldownDays;
    if (!win) return '';
    w.arenaWins++;
    const prize = round.reward + (bet ? ARENA.bet * ARENA.betMult : 0);
    roster.gold += prize;
    gainHeroXp(roster.hero, ARENA.renownXp);
    return `比武獎金 ${prize} 金`;
  }, []);
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
  const gold = arenaFight ? 0 : Math.round(result.gold * (result.win ? 1 : CAMPAIGN.loseGoldRatio));
  const progress = applyBattle(roster, result.outcomes, gold, result.win);
  if (!arenaFight) {
    world.winMorale(result.win);
    world.politics.s.renown += result.renown;
  }
  arenaFight = false;
  const xp = result.playerKills * HERO.xpPerKill + (result.win ? HERO.xpBattleWin : 0);
  const ups = gainHeroXp(roster.hero, xp);
  const extra = [afterBattle(result.win), `主角經驗 +${xp}`, ups ? `主角升到 ${roster.hero.level} 級！` : ''].filter(Boolean).join('、');
  hud.showResult(result, progress, extra, backToMap);
};

view.onEvent = (e) => {
  if (e.type === 'place') openPlace(e.place);
  else {
    view.stop();
    if (e.type === 'bandit') screens.bandit(e.bandit);
    else screens.npc(e.npc);
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
    const info = s ? `${scenarioOf(s.world.scenario ?? 'chaos').name}・第 ${dayOf(s.world)} 日・兵 ${s.roster.soldiers.length}・勝 ${s.roster.wins}` : '空';
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
      if (s) {
        useGame(s.roster, s.world);
        backToMap();
        return;
      }
      showNewGame(hud, (c) => {
        const r = newRoster();
        const bg = c.background;
        r.hero = createHero({ race: c.race, background: bg });
        r.gold = bg.gold;
        r.soldiers = [];
        for (const e of bg.army) {
          for (let i = 0; i < e.count; i++) addSoldier(r, e.unit === 'footman' ? c.scenario.levy : e.unit);
        }
        r.tickets.human += bg.tickets ?? 0;
        const w = newWorld();
        w.scenario = c.scenario.id;
        w.food = bg.food;
        w.pol.renown = Math.max(0, bg.renown ?? 0);
        const start = START_REGIONS[c.region];
        const place = PLACES.find((p) => p.id === start.place)!;
        w.x = place.x + 3;
        w.y = place.y + 2;
        w.pol.relations[start.relation] = 15;
        const race = PLAYABLE[c.race];
        if (race.friend) w.pol.relations[race.friend] += 20;
        if (race.foe) w.pol.relations[race.foe] -= 20;
        useGame(r, w);
        backToMap();
      }, () => void showMenu());
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
  Object.assign(window, { __mb: { battle, view, screens, get world() { return world; }, get roster() { return roster; } } });
}
