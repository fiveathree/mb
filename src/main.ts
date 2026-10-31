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
import { SLOT_COUNT, deleteSlot, exportCode, importCode, readSlots, writeSlot, type GameSave } from './core/save';
import { ENDINGS } from './data/quests';
import { STORY_HEROES, type StoryHero } from './data/honor';
import { PLAYER } from './politics/politics';
import { onArrive, onBanditBeaten } from './quests/quests';
import { Tutorial } from './ui/tutorial';
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
let tutorial: Tutorial | null = null;
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
  onHunter: (n) => fightHunter(n),
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
  if (world.save.pol.won && !world.save.endingSeen) {
    world.save.endingSeen = true;
    showEnding();
    return;
  }
  view.start();
}

function showEnding() {
  const pol = world.politics;
  hud.showScreen(`
    <div class="card">
      <h1>${ENDINGS.title}</h1>
      <p class="sub">${ENDINGS.text}</p>
      <div class="stats">
        <div><small>國號</small><b>${pol.s.kingdom ?? '無名'}</b></div>
        <div><small>用時</small><b>${dayOf(world.save)} 日</b></div>
        <div><small>勝仗</small><b>${roster.wins}</b></div>
        <div><small>任務</small><b>${world.save.questsDone}</b></div>
      </div>
      <div class="row"><button class="go" id="next">繼續統治</button></div>
    </div>`);
  battle.sfx.fanfare(true);
  document.getElementById('next')!.onclick = backToMap;
}

function reopenPlace() {
  if (!currentPlace) {
    hud.closeScreen();
    view.start();
    return;
  }
  openPlace(currentPlace);
}

function showPlace(p: PlaceDef) {
  if (p.kind === 'town') screens.town(p);
  else if (p.kind === 'village') screens.village(p);
  else screens.site(p);
}

/** 呢度有冇劇場角色等緊你 */
function storyHeroAt(p: PlaceDef): StoryHero | undefined {
  const w = world.save;
  const s = w.pol;
  return STORY_HEROES.find((h) => h.place === p.id
    && !s.storyMet.includes(h.id) && !roster.soldiers.some((x) => x.unit === h.unit)
    && s.justice >= (h.minJustice ?? -101) && s.justice <= (h.maxJustice ?? 101)
    && s.loyalty >= (h.minLoyalty ?? -101) && s.renown >= (h.minRenown ?? 0)
    && w.arenaWins >= (h.arenaWins ?? 0) && (!h.outlaw || s.outlaw)
    && (!h.cleared || (w.clearedUntil[h.cleared] ?? 0) > 0));
}

function openPlace(p: PlaceDef) {
  currentPlace = p;
  view.stop();
  const done = onArrive(world, p);
  if (done.length) screens.say(done.join('　'));
  saveGame();
  const hero = storyHeroAt(p);
  if (hero) screens.storyHero(hero, () => showPlace(p));
  else showPlace(p);
}

function moraleMult(): number {
  const { battleMin, battleMax } = MORALE_PARTY;
  const m = Math.max(0, world.save.morale - racePenalty(roster)) / 100;
  return (battleMin + (battleMax - battleMin) * m) * (1 + skillOf(roster.hero, roster.soldiers, 'tactics') * 0.03)
    * world.politics.honorMorale();
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
      formations, enemyCultures: arenaFight ? [] : currentScenario().cultures,
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
    const reward = placeReward(p);
    if (p.kind === 'lair' && world.save.pol.outlaw) {
      world.save.pol.owners[p.id] = PLAYER;
      return `${reward}、佔咗${p.name}做山寨！`;
    }
    return reward;
  }, party, crawl ? { dismount: true, firstPerson: true } : {});
}

function fightHunter(n: Npc) {
  const pol = world.politics;
  void startBattle(raiderArmy(n), 2, 'plains', (win) => {
    if (!win) return '';
    world.npcs.remove(n);
    pol.deed('killPatrol', pol.ownerOf(n.home));
    return '打散官兵，懸賞更高';
  });
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
    if (res.win) {
      world.removeBandit(b);
      onBanditBeaten(world);
    } else world.escape(b);
    showAutoResult(res.win, progress);
    return;
  }
  void startBattle(army, b.level, isNight(world.save) ? 'night' : 'plains', (win) => {
    if (win) {
      world.removeBandit(b);
      onBanditBeaten(world);
    } else world.escape(b);
    return '';
  });
}

function fightRaider(n: Npc) {
  void startBattle(raiderArmy(n), n.kind === 'dragon' ? 6 : NPC_RULES.raiderLevel, n.kind === 'dragon' ? 'night' : 'plains', (win) => {
    if (!win) return '';
    world.npcs.remove(n);
    world.politics.deed('beatRaider');
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
    if (result.retreated) world.politics.deed('retreat');
    else if (result.win && world.politics.s.liege) world.politics.deed('serve');
  }
  arenaFight = false;
  battle.sfx.fanfare(result.win);
  if (tutorial) {
    tutorial.close();
    tutorial = null;
    battle.onTick = null;
    hud.showScreen(`
      <div class="card">
        <h2 class="${result.win ? 'win' : 'lose'}">${result.win ? '教學完成' : '再試一次'}</h2>
        <p class="sub">行軍、指揮同經營喺正式遊戲慢慢學，Tab 同 Esc 入面有操作表。</p>
        <div class="row"><button class="go" id="next">返回主選單</button></div>
      </div>`);
    document.getElementById('next')!.onclick = () => void showMenu();
    return;
  }
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
    else if (e.type === 'npc') screens.npc(e.npc);
    else if (e.type === 'hunted') screens.hunted(e.npc);
    else screens.story(e.event);
  }
};

async function startTutorial() {
  const r = newRoster();
  const steps = new Tutorial();
  tutorial = steps;
  battle.onTick = (b) => steps.tick(b);
  battle.sfx.unlock();
  hud.hideScreen();
  afterBattle = () => '';
  battle.start({
    playerDef: playerDef(r.hero), horse: playerHorse(r.hero), loadout: r.hero.loadout, soldiers: [],
    enemy: [{ unit: 'kobold', count: 4 }], enemyLevel: 1, theme: 'plains', moraleMult: 1,
  });
  inBattle = true;
  await lockMouse();
}

function showSaveCode(code: string) {
  hud.showScreen(`
    <div class="card">
      <h2>存檔碼</h2>
      <p class="sub">複製呢段碼，就可以喺另一部機匯入。</p>
      <textarea class="code-box" id="code" readonly>${code}</textarea>
      <div class="row"><button class="alt" id="copy">複製</button><button class="go" id="back">返回</button></div>
    </div>`);
  document.getElementById('copy')!.onclick = () => void navigator.clipboard?.writeText(code);
  document.getElementById('back')!.onclick = () => void showMenu();
}

function showImport(target: number) {
  hud.showScreen(`
    <div class="card">
      <h2>匯入存檔 ${target + 1}</h2>
      <p class="sub" id="msg">貼上存檔碼，會覆蓋呢個存檔槽。</p>
      <textarea class="code-box" id="code"></textarea>
      <div class="row"><button class="go" id="ok">匯入</button><button class="alt" id="back">返回</button></div>
    </div>`);
  document.getElementById('back')!.onclick = () => void showMenu();
  document.getElementById('ok')!.onclick = async () => {
    const text = (document.getElementById('code') as HTMLTextAreaElement).value;
    const save = await importCode(text);
    if (!save) {
      document.getElementById('msg')!.textContent = '存檔碼唔啱，請再檢查。';
      return;
    }
    await writeSlot(target, save);
    await showMenu();
  };
}
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
      ${s ? `<button class="alt small" data-exp="${i}">匯出</button>` : ''}
      <button class="alt small" data-imp="${i}">匯入</button>
      ${s ? `<button class="alt small" data-del="${i}">刪除</button>` : ''}</div>`;
  };
  hud.hideHud();
  hud.showScreen(`
    <div class="card">
      <h1>鐵騎風雲</h1>
      <p class="sub">由無名傭兵開始，帶隊遊走裂天大陸，攻城闖迷宮，招募四方豪傑。</p>
      ${Array.from({ length: SLOT_COUNT }, (_, i) => line(i)).join('')}
      <div class="row"><button class="alt" id="tut">教學關</button></div>
    </div>`);
  document.getElementById('tut')!.onclick = () => void startTutorial();
  document.querySelectorAll<HTMLElement>('#screen [data-exp]').forEach((el) => {
    el.onclick = () => void exportCode(slots[Number(el.dataset.exp)]!).then(showSaveCode);
  });
  document.querySelectorAll<HTMLElement>('#screen [data-imp]').forEach((el) => {
    el.onclick = () => showImport(Number(el.dataset.imp));
  });
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
