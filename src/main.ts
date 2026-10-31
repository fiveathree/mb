import './style.css';
import { Battle, type BattleResult } from './battle/battle';
import { cleanName, createCrownHero, createHero, gainHeroXp, playerDef, playerHorse, skillOf } from './core/hero';
import { ARTIFACTS, DUNGEON, LORD_RULES, PLAYABLE, SIEGE, START_REGIONS, factionOf, lordOf } from './data/factions';
import { showNewGame, type NewGameChoice } from './ui/newgame';
import { CROWN_RENOWN } from './data/economy';
import type { CrownDef } from './data/crowns';
import { showFormationPick } from './ui/formation';
import { formationsFor, type FormationCheck } from './core/formation';
import { applyScenario, crownHome, currentScenario, isMagic, scenarioOf } from './data/scenarios';
import { UNITS } from './data/units';
import {
  addSoldier, applyBattle, autoResolve, deployment, migrateRoster, newRoster, racePenalty, type BattleProgress, type Roster, type Soldier,
} from './core/roster';
import { SLOT_COUNT, deleteSlot, exportCode, importCode, readSlots, writeSlot, type GameSave } from './core/save';
import { ENDINGS } from './data/quests';
import { STORY_HEROES, type StoryHero } from './data/honor';
import { PLAYER } from './politics/politics';
import { onArrive, onBanditBeaten, onBossBeaten } from './quests/quests';
import { Tutorial } from './ui/tutorial';
import { TOWN, TOWN_STYLES, type ArmyEntry, type TownStyleId } from './data/battlefield';
import { ARENA, ARMORS, CAPTIVE, DIFFICULTY, GOODS, GOOD_ORDER, HERO, LOOT, NPC, NPC_RULES } from './data/economy';
import { settings } from './core/settings';
import { GUIDE } from './data/story';
import { paintBackdrop } from './ui/backdrop';
import { CALAMITY, TOMB } from './data/tomb';
import { HORSES, HORSE_RANK, MOUNT_REWARD } from './data/horses';
import { CAMPAIGN, POOLS, RARITY } from './data/gacha';
import { RACES } from './data/races';
import { BIOMES, MORALE_PARTY, PLACES, type BattleTheme, type BiomeTile, type PlaceDef } from './data/world';
import { Camp } from './ui/camp';
import { Hud } from './ui/hud';
import { PlaceScreens } from './ui/place';
import { raiderArmy, type Npc } from './worldmap/npcs';
import type { Tile } from './worldmap/terrain';
import { WorldView } from './worldmap/view';
import { World, banditArmy, dayOf, isNight, newWorld, type BanditParty, type WorldSave } from './worldmap/world';

const FORMATION_MIN_TROOPS = 4;
/** 附近幾多格同類地形就用嗰種戰場 */
const BIOME_TILES = 6;
const RIVER_NEAR = 5;
const BIOME_STYLE: Record<BiomeTile, TownStyleId> = { forest: 'forest', snow: 'snow', sand: 'sand', swamp: 'monster', ash: 'ash' };
const TILE_THEME: Partial<Record<Tile, BattleTheme>> = { forest: 'forest', snow: 'snow', sand: 'desert', swamp: 'swamp', ash: 'ash' };

const canvas = document.getElementById('game') as HTMLCanvasElement;
const mapCanvas = document.getElementById('map') as HTMLCanvasElement;
const hud = new Hud(document.getElementById('ui')!);
const battle = new Battle(canvas, hud);
if (settings.quality !== battle.quality) battle.setQuality(settings.quality);

let slot = 0;
let roster: Roster = newRoster();
let world = new World(newWorld(), roster);
const camp = new Camp(hud, roster, world);
let inBattle = false;
let ignoreUnlock = false;
let afterBattle: (win: boolean) => string = () => '';
/** 競技場唔計部隊戰利品 */
let arenaFight = false;
/** 結算畫面之後接住做嘅事（錦標賽下一輪） */
let afterResult: (() => void) | null = null;
let tutorial: Tutorial | null = null;
/** 而家喺邊個地點入面，返回用 */
let currentPlace: PlaceDef | null = null;

/** 行緊街嘅城鎮 */
let walking: PlaceDef | null = null;

const screens = new PlaceScreens(hud, world, roster, {
  onLeave: () => (screens.walking ? void backToStreet() : backToMap()),
  onWalk: (p) => (screens.walking ? void backToStreet() : walkTown(p)),
  onParty: () => camp.show(() => reopenPlace()),
  onAttack: (p) => attackPlace(p),
  onBandit: (b, auto) => fightBandit(b, auto),
  onEscaped: () => backToMap(),
  onArena: (town, bet) => fightArena(town, bet),
  onTournament: (town) => fightTournament(town),
  onTomb: (p) => fightTomb(p),
  onLordFight: (n) => fightLord(n),
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
  applyScenario(w.scenario ?? 'chaos', w.crown);
  roster = migrateRoster(r);
  world = new World(w, roster);
  view.setWorld(world);
  camp.setRoster(roster, world);
  screens.bind(world, roster);
}

/** 城鎮外觀跟地域 */
/** 冠位角色本：佢嘅主城一開始就係你 */
function startCrown(r: Roster, crown: CrownDef, c: NewGameChoice) {
  r.hero = createCrownHero(crown);
  r.gold = crown.gold;
  r.soldiers = [];
  for (const [unit, count] of crown.army) {
    for (let i = 0; i < count; i++) addSoldier(r, unit);
  }
  const w = newWorld();
  w.difficulty = c.difficulty;
  w.scenario = c.scenario.id;
  w.crown = crown.id;
  w.food = crown.food;
  w.pol.renown = CROWN_RENOWN;
  // 自己唔會喺大地圖撞到自己
  w.pol.storyMet.push(crown.id);
  const home = PLACES.find((p) => p.id === crownHome(crown, c.scenario.id))!;
  w.pol.owners[home.id] = PLAYER;
  w.x = home.x + 3;
  w.y = home.y + 2;
  useGame(r, w);
  backToMap();
}

function townStyle(p: PlaceDef): TownStyleId {
  if (p.monster) return 'monster';
  const biome = BIOMES.find((b) => Math.hypot(p.x - b.x, p.y - b.y) < b.r);
  return biome ? BIOME_STYLE[biome.tile] : 'plain';
}

/** 入城：同打仗用同一個 3D 場景，但冇敵人 */
function walkTown(p: PlaceDef) {
  walking = p;
  screens.walking = false;
  view.stop();
  const h = roster.hero;
  const style = townStyle(p);
  battle.sfx.unlock();
  hud.hideScreen();
  battle.start({
    playerDef: playerDef(h), horse: playerHorse(h), loadout: h.loadout, soldiers: [], enemy: [], enemyLevel: 1,
    theme: isNight(world.save) ? 'night' : TOWN_STYLES[style].theme, moraleMult: 1, dismount: true,
    town: { shops: p.kind === 'village' ? TOWN.villageShops : TOWN.shops, style, seed: p.x * 257 + p.y },
  });
  inBattle = true;
  void lockMouse();
  hud.announce('WASD 行街，行近招牌撳 E 入舖，Esc 離開', 'guard');
}

/** 由舖頭返出街 */
async function backToStreet() {
  screens.walking = false;
  hud.hideScreen();
  battle.running = true;
  inBattle = true;
  await lockMouse();
}

function leaveTown() {
  const p = walking!;
  walking = null;
  screens.walking = false;
  inBattle = false;
  battle.running = false;
  battle.active = false;
  releaseMouse();
  hud.hideHud();
  showPlace(p);
}

battle.onVisit = (id) => {
  if (id === 'gate') {
    leaveTown();
    return;
  }
  battle.running = false;
  inBattle = false;
  battle.input.clear();
  releaseMouse();
  hud.hideHud();
  screens.visit(walking!, id);
};

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
    && (isMagic() || (UNITS[h.unit].race ?? 'human') === 'human')
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
  battle.input.free = false;
  hud.setFreeCursor(false);
  type Lock = (o?: { unadjustedMovement: boolean }) => Promise<void>;
  const lock = canvas.requestPointerLock.bind(canvas) as unknown as Lock;
  try {
    // 原始滑鼠數據，轉鏡頭更順；唔支援就用返普通模式
    await lock({ unadjustedMovement: true });
    return true;
  } catch {
    try {
      await lock();
      return true;
    } catch {
      return false;
    }
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
  extra: { breaches?: number; dismount?: boolean; firstPerson?: boolean; defend?: boolean; traps?: number; rooms?: number } = {},
) {
  afterBattle = done;
  walking = null;
  screens.walking = false;
  view.stop();
  const h = roster.hero;
  const hard = DIFFICULTY[world.save.difficulty ?? 'normal'];
  const scaled = enemy.map((e) => (UNITS[e.unit].boss || UNITS[e.unit].hero ? e : { ...e, count: Math.max(1, Math.round(e.count * hard.count)) }));
  const launch = async (formations: FormationCheck[]) => {
    battle.sfx.unlock();
    hud.hideScreen();
    battle.start({
      playerDef: playerDef(h), horse: playerHorse(h), loadout: h.loadout, soldiers, enemy: arenaFight ? enemy : scaled,
      enemyLevel: Math.max(1, enemyLevel + (arenaFight ? 0 : hard.level)), theme, moraleMult: moraleMult(), ...extra,
      dismount: extra.dismount || RACES[h.race].noRide, sky: currentScenario().sky, river: !extra.firstPerson && !extra.breaches && nearWater(),
      formations, enemyCultures: arenaFight ? [] : currentScenario().cultures,
    });
    inBattle = true;
    await lockMouse();
    hud.announce('中間箭嘴就係滑鼠，撳 C 叫出游標', 'guard');
  };
  // 一個人或者地下城唔使佈陣
  if (soldiers.length < FORMATION_MIN_TROOPS || extra.firstPerson) {
    await launch([]);
    return;
  }
  showFormationPick(hud, formationsFor(currentScenario().cultures, h, soldiers), (order) => void launch(order));
}

/** 打贏之後掉落：貨物同有機會出品質裝備 */
function rollLoot(): string {
  const w = world.save;
  const out: string[] = [];
  const count = LOOT.goodsMin + Math.floor(Math.random() * (LOOT.goodsMax - LOOT.goodsMin + 1));
  for (let i = 0; i < count; i++) {
    const g = GOOD_ORDER[Math.floor(Math.random() * GOOD_ORDER.length)];
    if (world.cargoCount() + GOODS[g].weight > world.cargoCap()) continue;
    w.cargo[g]++;
    out.push(GOODS[g].name);
  }
  const roll = Math.random();
  const quality = roll < LOOT.legend ? 'legend' : roll < LOOT.legend + LOOT.fine ? 'fine' : roll < LOOT.legend + LOOT.fine + LOOT.worn ? 'worn' : null;
  if (quality) {
    const list = ARMORS.filter((a) => a.quality === quality);
    const piece = list[Math.floor(Math.random() * list.length)];
    roster.hero.armors.push(piece.id);
    out.push(piece.name);
  }
  return out.length ? `戰利品：${out.join('、')}` : '';
}

/** 附近有河就喺河邊開打 */
function nearWater(): boolean {
  const { x, y } = world.save;
  const t = world.terrain;
  for (let dy = -RIVER_NEAR; dy <= RIVER_NEAR; dy++) {
    for (let dx = -RIVER_NEAR; dx <= RIVER_NEAR; dx++) {
      const tx = Math.round(x) + dx;
      const ty = Math.round(y) + dy;
      if (t.inside(tx, ty) && t.at(tx, ty) === 'water') return true;
    }
  }
  return false;
}

/** 野戰場景：夜晚，或者跟大地圖腳下地形 */
function fieldTheme(): BattleTheme {
  if (isNight(world.save)) return 'night';
  const { x, y } = world.save;
  const seen: Partial<Record<BattleTheme, number>> = {};
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const tx = Math.round(x) + dx;
      const ty = Math.round(y) + dy;
      const theme = world.terrain.inside(tx, ty) ? TILE_THEME[world.terrain.at(tx, ty)] : undefined;
      if (theme) seen[theme] = (seen[theme] ?? 0) + 1;
    }
  }
  const best = (Object.entries(seen) as [BattleTheme, number][]).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= BIOME_TILES ? best[0] : 'plains';
}

/** 強力坐騎只靠攻陷同討伐 */
function grantMount(key: string): string {
  const id = MOUNT_REWARD[key];
  const def = HORSES.find((h) => h.id === id);
  if (!def || roster.hero.horses.includes(id) || (def.fantasy && !isMagic())) return '';
  roster.hero.horses.push(id);
  return `[${RARITY[HORSE_RANK[id]].name}] 坐騎 ${def.name}`;
}

function placeReward(p: PlaceDef): string {
  const out: string[] = [];
  const mount = grantMount(p.id);
  if (mount) out.push(mount);
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
  // 巨神塞唔落地下城，喺外面開闊地打
  const crawl = (p.kind === 'dungeon' || p.kind === 'maze') && !p.garrison!.some((e) => UNITS[e.unit].colossal);
  const party = crawl ? deployment(roster).slice(0, DUNGEON.partySize) : deployment(roster);
  void startBattle(p.garrison!, p.garrisonLevel ?? 1, p.theme ?? 'plains', (win) => {
    if (!win) return '';
    world.markCleared(p);
    onBossBeaten(world, p.id);
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
  void startBattle(raiderArmy(n), 2, fieldTheme(), (win) => {
    if (!win) return '';
    world.npcs.remove(n);
    pol.deed('killPatrol', pol.ownerOf(n.home));
    return '打散官兵，懸賞更高';
  });
}

/** 同領主部隊開戰：打贏就生擒 */
function fightLord(n: Npc) {
  const pol = world.politics;
  const owner = pol.ownerOf(n.home)!;
  const f = factionOf(owner)!;
  const army = f.garrison.map((e) => ({ unit: e.unit, count: Math.ceil(e.count * LORD_RULES.partyShare) }));
  void startBattle([...army, { unit: 'lord_knight', count: 1 }], LORD_RULES.level, fieldTheme(), (win) => {
    if (!win) return '';
    world.npcs.remove(n);
    pol.s.renown += LORD_RULES.renown;
    if (!pol.s.lords.includes(owner)) pol.s.lords.push(owner);
    return `生擒${lordOf(owner)}`;
  });
}

function assaultFief(p: PlaceDef, breaches: number) {
  const pol = world.politics;
  const g = pol.garrisonOf(p)!;
  void startBattle([...g.army, { unit: 'lord_knight', count: 1 }], g.level, p.theme ?? 'fort', (win) => {
    if (!win) return '';
    pol.capture(p);
    const reward = placeReward(p);
    return `攻陷${p.name}${reward ? `、${reward}` : ''}`;
  }, deployment(roster), { breaches, dismount: true });
}

function defendFief(p: PlaceDef, by: string) {
  const pol = world.politics;
  const f = factionOf(by)!;
  void startBattle(f.garrison, f.level, p.theme ?? 'fort', (win) => {
    if (!win) return '';
    pol.s.threats = pol.s.threats.filter((t) => t.place !== p.id);
    return `成功保衛${p.name}`;
  }, [...deployment(roster), ...roster.soldiers.filter((s) => s.post === p.id)], { breaches: SIEGE.defendBreaches, dismount: true, defend: true });
}

function fightBandit(b: BanditParty, auto: boolean) {
  const army = banditArmy(b);
  if (auto) {
    const res = autoResolve(roster, army, b.level);
    const progress = applyBattle(roster, res.outcomes, res.gold, res.win);
    const loot = res.win ? rollLoot() : '';
    if (res.win) gainHeroXp(roster.hero, HERO.xpBattleWin);
    world.winMorale(res.win);
    if (res.win) {
      world.removeBandit(b);
      onBanditBeaten(world);
      const n = Math.floor(Math.random() * (CAPTIVE.autoResolveMax + 1));
      for (let i = 0; i < n; i++) world.save.captives.push(army[0].unit);
    } else world.escape(b);
    showAutoResult(res.win, progress, loot);
    return;
  }
  void startBattle(army, b.level, fieldTheme(), (win) => {
    if (win) {
      world.removeBandit(b);
      onBanditBeaten(world);
    } else world.escape(b);
    return '';
  });
}

function fightCalamity(n: Npc, kind: 'witch' | 'wyrm' | 'titan') {
  const rule = CALAMITY[kind];
  void startBattle(raiderArmy(n), rule.level, 'night', (win) => {
    if (!win) return '';
    world.npcs.remove(n);
    world.politics.deed('beatRaider');
    roster.gold += rule.gold;
    world.politics.s.renown += 25;
    const art = ARTIFACTS.find((a) => a.id === rule.artifact)!;
    if (!roster.hero.artifacts.includes(art.id)) roster.hero.artifacts.push(art.id);
    const mount = grantMount(kind);
    return `討伐${NPC[kind].name}！神器 ${art.name}、${rule.gold} 金${mount ? `、${mount}` : ''}`;
  });
}

function fightRaider(n: Npc) {
  if (n.kind === 'witch' || n.kind === 'wyrm' || n.kind === 'titan') {
    fightCalamity(n, n.kind);
    return;
  }
  void startBattle(raiderArmy(n), n.kind === 'dragon' ? 6 : NPC_RULES.raiderLevel, n.kind === 'dragon' ? 'night' : fieldTheme(), (win) => {
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

/** 十層大墳墓：打贏一層就記低 */
function fightTomb(p: PlaceDef) {
  const w = world.save;
  const floor = w.tombFloor;
  const f = TOMB.floors[floor];
  void startBattle(f.enemy, f.level, f.theme, (win) => {
    if (!win) return '';
    w.tombFloor = floor + 1;
    const gold = (floor + 1) * TOMB.goldPerFloor;
    roster.gold += gold;
    if (w.tombFloor < TOMB.floors.length) return `${f.name}已破，${gold} 金`;
    roster.gold += TOMB.clearGold;
    if (!roster.hero.artifacts.includes(TOMB.artifact)) roster.hero.artifacts.push(TOMB.artifact);
    world.politics.s.renown += 40;
    return `骸骨魔導王倒下！${p.name}攻破，${gold + TOMB.clearGold} 金、神器 魔導王冠、${grantMount(p.id)}`;
  }, deployment(roster).slice(0, DUNGEON.partySize), { dismount: true, firstPerson: true, traps: DUNGEON.traps + floor, rooms: 3 + (floor % 3) });
}

/** 錦標賽：連戰四輪 */
function fightTournament(town: PlaceDef, round = 0) {
  const w = world.save;
  const { rounds, tournament } = ARENA;
  if (round === 0) w.tournamentUntil = dayOf(w) + tournament.everyDays;
  arenaFight = true;
  const r = rounds[round];
  void startBattle(r.enemy, r.level, 'fort', (win) => {
    if (!win) return `錦標賽第 ${round + 1} 輪出局`;
    if (round < rounds.length - 1) {
      afterResult = () => fightTournament(town, round + 1);
      return `贏咗第 ${round + 1} 輪，繼續下一輪`;
    }
    roster.gold += tournament.prize;
    world.politics.s.renown += tournament.renown;
    gainHeroXp(roster.hero, ARENA.renownXp);
    return `${town.name}錦標賽冠軍！${tournament.prize} 金、聲望 +${tournament.renown}`;
  }, []);
}

function showAutoResult(win: boolean, p: BattleProgress, loot: string) {
  hud.showScreen(`
    <div class="card">
      <h2 class="${win ? 'win' : 'lose'}">${win ? '勝利' : '敗退'}</h2>
      <p class="sub">獲得 ${p.gold} 金，陣亡 ${p.lost.length} 人，傷兵 ${p.hurt} 人，升級 ${p.levelUps.length} 人。${loot}</p>
      <div class="row"><button class="go" id="next">返回大地圖</button></div>
    </div>`);
  document.getElementById('next')!.onclick = backToMap;
}

function applySettings() {
  battle.sfx.setVolume(settings.volume);
  if (battle.quality !== settings.quality) battle.setQuality(settings.quality);
}

function showPause(message = '') {
  hud.showPause(() => void resume(), () => battle.retreat(), message, () => hud.showSettings(applySettings, () => showPause()));
}

function pause() {
  if (!inBattle || !battle.running) return;
  if (walking) {
    leaveTown();
    return;
  }
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
// C：叫出真游標，遊戲照行；撳畫面返回控制
battle.onCursorKey = () => {
  if (!document.pointerLockElement) return;
  releaseMouse();
  battle.input.free = true;
  hud.setFreeCursor(true);
  hud.announce('游標模式：撳畫面返回控制', 'guard');
};
canvas.addEventListener('mousedown', () => {
  if (!battle.input.free) return;
  battle.input.lmb = false;
  battle.input.attackBuffer = 0;
  void lockMouse();
});
void document.fonts?.load('700 15px "Noto Sans HK"', '鐵騎風雲');
battle.onEnd = (result: BattleResult) => {
  inBattle = false;
  battle.active = false;
  releaseMouse();
  const loot = !arenaFight && !tutorial && result.win ? rollLoot() : '';
  const gold = arenaFight ? 0 : Math.round(result.gold * (result.win ? 1 : CAMPAIGN.loseGoldRatio) * DIFFICULTY[world.save.difficulty ?? 'normal'].gold);
  const progress = applyBattle(roster, result.outcomes, gold, result.win);
  if (!arenaFight) {
    world.winMorale(result.win);
    world.politics.s.renown += result.renown;
    world.save.captives.push(...result.captiveUnits);
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
  const extra = [afterBattle(result.win), loot, `主角經驗 +${xp}`, ups ? `主角升到 ${roster.hero.level} 級！` : ''].filter(Boolean).join('、');
  hud.showResult(result, progress, extra, () => {
    const next = afterResult;
    afterResult = null;
    if (next) next();
    else backToMap();
  }, afterResult ? '下一輪' : undefined);
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
// 瀏覽器要用戶撳過先出得聲
window.addEventListener('pointerdown', () => {
  battle.sfx.unlock();
  battle.sfx.music(() => (!inBattle || !!walking) && !document.hidden, () => currentScenario().cultures.includes('east'));
}, { once: true });
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && !inBattle) battle.sfx.muted = !battle.sfx.muted;
});

view.onJob = () => {
  view.stop();
  camp.show(() => reopenPlace(), 'job');
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
      <div class="row"><button class="alt" id="tut">教學關</button><button class="alt" id="menuGuide">玩法指南</button><button class="alt" id="menuSet">設定</button></div>
    </div>`);
  document.getElementById('menuGuide')!.onclick = () => {
    hud.showScreen(`
      <div class="card guide">
        <h2>玩法指南</h2>
        <div class="guide-list">${GUIDE.map(([k, v]) => `<div><b>${k}</b><span>${v}</span></div>`).join('')}</div>
        <div class="row"><button class="go" id="guideBack">返回</button></div>
      </div>`);
    document.getElementById('guideBack')!.onclick = () => void showMenu();
  };
  document.getElementById('tut')!.onclick = () => void startTutorial();
  document.getElementById('menuSet')!.onclick = () => hud.showSettings(applySettings, () => void showMenu());
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
        // 起點座標要跟劇本鏡像，所以要先套用
        applyScenario(c.scenario.id, c.crown?.id);
        const r = newRoster();
        if (c.crown) {
          startCrown(r, c.crown, c);
          return;
        }
        const bg = c.background;
        r.hero = createHero({ race: c.race, background: bg });
        r.hero.name = cleanName(c.name) || r.hero.name;
        r.gold = bg.gold;
        r.soldiers = [];
        for (const e of bg.army) {
          for (let i = 0; i < e.count; i++) addSoldier(r, e.unit === 'footman' || c.scenario.scifi ? c.scenario.levy : e.unit);
        }
        r.tickets.human += bg.tickets ?? 0;
        if (c.scenario.scifi) {
          // 星海：起步用槍同懸浮機車
          r.hero.weapons.push('gauss_rifle');
          r.hero.loadout = ['gauss_rifle', ...r.hero.loadout.filter((x) => x === 'sword')];
          r.hero.horses = ['hoverbike'];
          r.hero.horse = 'hoverbike';
        }
        if (c.job) r.hero.job = c.job;
        const w = newWorld();
        w.difficulty = c.difficulty;
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

paintBackdrop();
void showMenu();

if (import.meta.env.DEV) {
  Object.assign(window, { __mb: { battle, view, screens, get world() { return world; }, get roster() { return roster; } } });
}
