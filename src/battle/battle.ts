import * as THREE from 'three';
import { LOD } from '../data/animation';
import { BATTLEFIELD as F, COLORS, FOREST, FORMATION, REWARDS, type ArmyEntry } from '../data/battlefield';
import { DUNGEON, SIEGE } from '../data/factions';
import {
  FORMATIONS, FORMATION_RULES, type Culture, type FormationBonus, type FormationDef,
} from '../data/formations';
import { THEMES, type BattleTheme } from '../data/world';
import { RACES } from '../data/races';
import { CAMERA, COMBAT, FEEL } from '../data/combat';
import { HORSES, HORSE_RADIUS, type HorseDef } from '../data/horses';
import {
  ENEMY_COMMAND, ROLE_KEYS, ROLE_LABEL, UNITS, type Role, type UnitDef,
} from '../data/units';
import { LEVEL } from '../data/gacha';
import { WEAPONS } from '../data/weapons';
import { applyGear } from '../core/hero';
import { levelDef, type BattleOutcome, type Soldier } from '../core/roster';
import { makeAi, updateAi } from './ai';
import { Sfx } from './audio';
import { Fliers } from './fliers';
import { Batches } from './batch';
import {
  explode, startBlock, startCharge, updateAction, updateCouch, updateRam, type BattleStats, type CombatWorld,
} from './combat';
import { Combatant, Horse, angleDiff, clamp, flatDist, moveToward } from './entities';
import { Fx } from './fx';
import { updateHorse } from './horse';
import { Input } from './input';
import { buildHorse, buildHuman, syncHorse, syncHuman } from './models';
import { onDeath, teamMorale, tickMorale } from './morale';
import { Group, ORDER_LABEL, deployGroup, makeGroups, thinkEnemy, type OrderType } from './orders';
import { Projectiles } from './projectiles';
import { buildTerrain, heightAt, placeTrees, type Obstacle } from './terrain';
import type { Hud } from '../ui/hud';

const JUMP_SPEED = 5.5;
const MOUNT_RANGE = 3.2;
const MAX_DISMOUNT_SPEED = 6;
const RESULT_DELAY = 2;
/** 自動畫質：連續幾次（每半秒）低過 lowFps 就降一級 */
const QUALITY = { lowFps: 40, patience: 8, maxPixelRatio: 1.5 };
/** 鏡頭跟滑鼠嘅順滑度，愈大愈貼手 */
const CAMERA_SMOOTH = 45;
const SLOT_REFRESH = 2;

export interface ReportRow {
  name: string;
  total: number;
  alive: number;
  dead: number;
  wounded: number;
  fled: number;
}

export interface BattleSetup {
  playerDef: UnitDef;
  horse: HorseDef;
  loadout: string[];
  soldiers: Soldier[];
  enemy: ArmyEntry[];
  enemyLevel: number;
  theme: BattleTheme;
  /** 部隊士氣對戰鬥士氣嘅倍率 */
  moraleMult: number;
  /** 圍城：缺口數 */
  breaches?: number;
  /** 全員步行 */
  dismount?: boolean;
  /** 第一身鏡頭 */
  firstPerson?: boolean;
  /** 守城：我方喺牆後，敵軍攻入嚟 */
  defend?: boolean;
  /** 天上飛嘅生物 */
  sky?: string[];
  /** 可用陣法，第一個係開局用嘅 */
  formations?: { def: FormationDef; efficiency: number }[];
  /** 敵軍用邊啲文化嘅陣法 */
  enemyCultures?: Culture[];
}

export interface BattleResult {
  win: boolean;
  retreated: boolean;
  playerDown: boolean;
  stats: BattleStats;
  rows: ReportRow[][];
  gold: number;
  exp: number;
  renown: number;
  captives: number;
  outcomes: BattleOutcome[];
  playerKills: number;
  /** 俘虜兵種 */
  captiveUnits: string[];
}

export class Battle implements CombatWorld {
  readonly renderer: THREE.WebGLRenderer;
  readonly sfx = new Sfx();
  readonly input: Input;
  readonly camera = new THREE.PerspectiveCamera(CAMERA.baseFov, 1, 0.1, 500);
  private scene = new THREE.Scene();
  private sun = new THREE.DirectionalLight(0xfff0d6, 2.3);
  private hemi = new THREE.HemisphereLight(0xcfe6ff, 0x6a6a4a, 1.5);
  private obstacles: Obstacle[];
  private baseObstacles: Obstacle[];
  private batches: Batches;
  private wall = new THREE.Group();
  /** 牆同門位 */
  private walls: { z: number; gaps: number[]; width: number; ladders?: number[] }[] = [];
  private dungeon = false;
  private firstPerson = false;
  private siege = false;
  /** 陣法：index 0 係用緊嘅 */
  formations: { def: FormationDef; efficiency: number }[] = [];
  enemyFormation: { def: FormationDef; efficiency: number } | null = null;
  /** 兩軍隊形凝聚度 */
  cohesion = [1, 1];
  private formationT = 0;
  private warcryT = 0;
  private forest = false;
  private wallHalf = 0;
  private rockT = 0;
  private traps: { x: number; z: number; cd: number }[] = [];
  private rockSide = 0;
  private defending = false;
  private fliers!: Fliers;
  /** 教學用：每幀回呼 */
  onTick: ((b: Battle) => void) | null = null;
  private slowFrames = 0;
  private quality = 2;
  private shadowTick = false;
  /** 顯示用鏡頭角度，追住 camYaw／camPitch，令滑鼠數據唔均都順 */
  private viewYaw = 0;
  private viewPitch = 0.16;
  fx: Fx;
  projectiles: Projectiles;

  units: Combatant[] = [];
  horses: Horse[] = [];
  groups: Group[][] = [];
  selected = new Set<Role>(ROLE_KEYS);
  player!: Combatant;
  /** 玩家最後騎過嘅馬，HUD 用 */
  lastHorse!: Horse;
  stats: BattleStats = { kills: 0, bestHit: 0, topSpeed: 0, time: 0 };

  camYaw = 0;
  camPitch = 0.16;
  private shakeAmt = 0;
  private freezeT = 0;
  private slowT = 0;
  private endT = -1;
  private win = false;
  private retreated = false;
  private hoofPhase = 0;
  private frameNo = 0;
  private moraleT = 0;
  private thinkT = 0;
  private slotT = 0;
  private followT = 0;
  running = false;
  /** 大地圖時唔使渲染 */
  active = false;
  private lastNow = 0;
  private fpsT = 0;
  private fpsN = 0;
  fps = 0;
  onEnd: ((r: BattleResult) => void) | null = null;
  onPauseKey: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, private hud: Hud) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY.maxPixelRatio));
    this.renderer.shadowMap.enabled = true;
    // 影子隔幀先更新，轉鏡頭時留多啲時間畫畫面
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.input = new Input(canvas);

    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(COLORS.fog, 90, 330);
    this.scene.add(this.hemi);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = this.sun.shadow.camera;
    s.left = s.bottom = -60;
    s.right = s.top = 60;
    s.far = 220;
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun, this.sun.target);

    this.baseObstacles = buildTerrain(this.scene);
    this.obstacles = this.baseObstacles;
    this.scene.add(this.wall);
    this.fliers = new Fliers(this.scene);
    this.batches = new Batches(this.scene);
    this.fx = new Fx(this.scene);
    this.projectiles = new Projectiles(this.scene);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** 起牆：圍城一幅，地下城幾幅加兩邊牆；牆段用一個 InstancedMesh */
  private buildWalls(breaches: number, dungeon: boolean) {
    this.wall.clear();
    this.walls = [];
    this.siege = breaches > 0 || dungeon;
    this.dungeon = dungeon;
    this.traps = [];
    this.obstacles = this.baseObstacles;
    if (!this.siege) return;
    const spots: { x: number; z: number }[] = [];
    if (dungeon) {
      const { walls, halfWidth, doorWidth, zMin, zMax } = DUNGEON;
      // 門左右交錯，要行之字
      const start = Math.random() < 0.5 ? 1 : -1;
      walls.forEach((z, i) => {
        const offset = DUNGEON.doorMin + Math.random() * (DUNGEON.doorMax - DUNGEON.doorMin);
        this.walls.push({ z, gaps: [(i % 2 ? start : -start) * halfWidth * offset], width: doorWidth });
      });
      this.layTraps();
      for (const z of [zMin, zMax]) this.walls.push({ z, gaps: [], width: 0 });
      for (let z = zMin; z <= zMax; z += 2) {
        spots.push({ x: -halfWidth, z }, { x: halfWidth, z });
      }
    } else {
      const { wallZ: Z, wallHalfWidth: W, breachWidth } = SIEGE;
      const gaps = Array.from({ length: breaches }, (_, i) => -W * 0.7 + ((i + 0.5) / breaches) * W * 1.4);
      this.walls.push({ z: Z, gaps, width: breachWidth });
    }
    if (!dungeon) this.buildSiegeGear();
    const half = dungeon ? DUNGEON.halfWidth : SIEGE.wallHalfWidth;
    this.wallHalf = half;
    // 雲梯位：牆照畫，但冇碰撞，士兵爬得過
    const solid: { x: number; z: number }[] = spots.slice();
    for (const w of this.walls) {
      for (let x = -half; x < half; x += 2) {
        if (w.gaps.some((g) => Math.abs(g - x) < w.width / 2)) continue;
        spots.push({ x, z: w.z });
        if (!w.ladders?.some((l) => Math.abs(l - x) < SIEGE.ladderWidth / 2)) solid.push({ x, z: w.z });
      }
    }
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2.05, 7, 2.4), new THREE.MeshLambertMaterial({ color: 0x8a8678, flatShading: true }), spots.length,
    );
    const m = new THREE.Matrix4();
    spots.forEach((s, i) => mesh.setMatrixAt(i, m.makeTranslation(s.x, heightAt(s.x, s.z) + 3, s.z)));
    mesh.castShadow = true;
    this.wall.add(mesh);
    this.obstacles = [...this.obstacles, ...solid.map((s) => ({ x: s.x, z: s.z, r: 1.3 }))];
  }

  /** 森林戰場：樹擋路，騎兵慢 */
  private plantForest() {
    const { trees, spreadX, spreadZ, treeRadius } = FOREST;
    const list = Array.from({ length: trees }, () => {
      const x = (Math.random() - 0.5) * spreadX * 2;
      const z = (Math.random() - 0.5) * spreadZ * 2;
      return { x, y: heightAt(x, z), z, s: 0.8 + Math.random() * 0.7, r: Math.random() * 6 };
    });
    placeTrees(this.wall, list);
    this.obstacles = [...this.obstacles, ...list.map((t) => ({ x: t.x, z: t.z, r: treeRadius * t.s }))];
  }

  /** 地下城地板陷阱：稍微睇得出，唔留心就中 */
  private layTraps() {
    const { traps, halfWidth, startZ, zMax } = DUNGEON;
    this.traps = Array.from({ length: traps }, () => {
      const x = (Math.random() - 0.5) * halfWidth * 1.6;
      const z = startZ + 16 + Math.random() * (zMax - startZ - 24);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 2.4), new THREE.MeshLambertMaterial({ color: 0x4a2a24 }));
      plate.position.set(x, heightAt(x, z) + 0.05, z);
      this.wall.add(plate);
      return { x, z, cd: 0 };
    });
  }

  private updateTraps(dt: number) {
    const owner = this.units.find((u) => u.team === 1 && !u.dead);
    if (!owner) return;
    for (const t of this.traps) {
      t.cd -= dt;
      if (t.cd > 0) continue;
      const hit = this.units.some((u) => u.team === 0 && !u.dead && Math.hypot(u.pos.x - t.x, u.pos.z - t.z) < DUNGEON.trapRadius);
      if (!hit) continue;
      t.cd = DUNGEON.trapReset;
      explode(this, owner, WEAPONS.dungeon_trap, new THREE.Vector3(t.x, heightAt(t.x, t.z) + 0.3, t.z), 1);
    }
  }

  /** 攻城器械：缺口兩旁攻城塔，城牆搭雲梯 */
  private buildSiegeGear() {
    const { wallZ: Z, wallHalfWidth: W, ladderEvery } = SIEGE;
    const wood = new THREE.MeshLambertMaterial({ color: 0x6a4a2c, flatShading: true });
    const place = (geo: THREE.BufferGeometry, x: number, z: number, y = 0, tilt = 0) => {
      const mesh = new THREE.Mesh(geo, wood);
      mesh.position.set(x, heightAt(x, z) + y, z);
      mesh.rotation.x = tilt;
      mesh.castShadow = true;
      this.wall.add(mesh);
    };
    const { gaps, width } = this.walls[0];
    const towers = gaps.map((g) => g + width / 2 + 3);
    for (const x of towers) {
      place(new THREE.BoxGeometry(4.4, 11, 4.4), x, Z - 3.6, 5.5);
      place(new THREE.BoxGeometry(5, 0.5, 5), x, Z - 3.6, 11.2);
    }
    this.obstacles = [...this.obstacles, ...towers.map((x) => ({ x, z: Z - 3.6, r: 2.8 }))];
    const ladders: number[] = [];
    for (let x = -W + ladderEvery / 2; x < W; x += ladderEvery) {
      if (gaps.some((g) => Math.abs(g - x) < width * 1.2)) continue;
      ladders.push(x);
      for (const side of [-0.45, 0.45]) place(new THREE.BoxGeometry(0.14, 7.6, 0.14), x + side, Z - 2.6, 3.4, 0.3);
      for (let k = 0; k < 7; k++) place(new THREE.BoxGeometry(0.9, 0.08, 0.08), x, Z - 3.6 + k * 0.32, 0.5 + k, 0);
    }
    this.walls[0].ladders = ladders;
  }

  /** 爬雲梯時離地幾高 */
  private climbLift(x: number, z: number): number {
    const ladders = this.walls[0]?.ladders;
    if (!ladders) return 0;
    const dz = Math.abs(z - SIEGE.wallZ);
    if (dz >= SIEGE.ladderReach) return 0;
    if (!ladders.some((l) => Math.abs(l - x) < SIEGE.ladderWidth / 2)) return 0;
    return SIEGE.wallTop * (1 - dz / SIEGE.ladderReach);
  }

  /** 投石：攻城時守軍掟石，守城時雙方互掟 */
  private throwRock() {
    this.rockSide = this.defending ? 1 - this.rockSide : 1;
    const team = this.rockSide;
    const owners = this.units.filter((u) => u.team === team && !u.dead);
    const targets = this.units.filter((u) => u.team !== team && !u.dead);
    if (!owners.length || !targets.length) return;
    const t = targets[Math.floor(Math.random() * targets.length)];
    const from = new THREE.Vector3(t.pos.x + (Math.random() - 0.5) * 30, 14, SIEGE.wallZ + (team === 1 && !this.defending ? 8 : team === 1 ? -60 : 8));
    this.projectiles.lob(owners[0], WEAPONS.siege_rock, from, t.pos, SIEGE.rockFlight);
  }

  /** 地下城佈置：部下跟主角；敵人分房守住，Boss 喺最後一間 */
  private deployDungeon(g: Group, team: number) {
    if (team === 0) {
      g.order = 'follow';
      g.setAnchor(0, DUNGEON.startZ - FORMATION.followBehind, 0);
      return;
    }
    g.fixedSlots = true;
    const rooms = DUNGEON.walls.length;
    g.members.forEach((c, i) => {
      const ai = c.ai!;
      const room = c.def.boss ? rooms : Math.min(rooms - 1, 1 + (i % (rooms - 1)));
      const z = room >= rooms ? DUNGEON.zMax - 12 : (DUNGEON.walls[room - 1] + DUNGEON.walls[room]) / 2;
      ai.slotX = ((i % 5) - 2) * 4;
      ai.slotZ = z + (i % 3);
    });
  }

  formationBonus(team: number, key: keyof FormationBonus): number {
    const f = team === 0 ? this.formations[0] : this.enemyFormation;
    if (!f) return 0;
    return (f.def.bonus[key] ?? 0) * f.efficiency * this.cohesion[team];
  }

  private applyFormation() {
    const f = this.formations[0];
    if (!f) return;
    for (const g of this.groups[0]) {
      g.shape = f.def.shape;
      g.assignSlots();
    }
  }

  /** 敵軍按編成揀最強嘅可用陣法 */
  private pickEnemyFormation(cultures: Culture[]) {
    const count = (role: Role) => this.groups[1].find((g) => g.role === role)?.members.length ?? 0;
    const spears = this.units.filter((u) => u.team === 1 && WEAPONS[u.def.weapons[0]].model === 'spear').length;
    const options = FORMATIONS.filter((f) => f.id !== 'plain' && cultures.includes(f.culture)
      && Object.entries(f.needRole ?? {}).every(([r, n]) => count(r as Role) >= n)
      && spears >= (f.needSpears ?? 0));
    const def = options[Math.floor(Math.random() * options.length)];
    this.enemyFormation = def ? { def, efficiency: FORMATION_RULES.enemyEfficiency } : null;
    if (def) for (const g of this.groups[1]) g.shape = def.shape;
  }

  /** 隊形凝聚度：幾多人仲喺自己位置附近 */
  private updateCohesion() {
    for (const team of [0, 1]) {
      let inPlace = 0;
      let total = 0;
      for (const g of this.groups[team]) {
        for (const m of g.alive) {
          total++;
          if (m.ai && Math.hypot(m.pos.x - m.ai.slotX, m.pos.z - m.ai.slotZ) < FORMATION_RULES.cohesionDist) inPlace++;
        }
      }
      const ratio = total ? inPlace / total : 0;
      this.cohesion[team] = FORMATION_RULES.minCohesion + (1 - FORMATION_RULES.minCohesion) * ratio;
    }
  }

  /** 戰鬥中轉去下一個陣法 */
  private nextFormation() {
    if (this.formations.length < 2) return;
    if (this.formationT > 0) {
      this.hud.announce(`換陣要等 ${Math.ceil(this.formationT)} 秒`, 'guard');
      return;
    }
    this.formations.push(this.formations.shift()!);
    this.formationT = FORMATION_RULES.switchCooldown;
    this.applyFormation();
    this.hud.announce(`變陣：${this.formations[0].def.name}`, 'guard');
  }

  wallBlocks(ax: number, az: number, bx: number, bz: number, y: number): boolean {
    for (const w of this.walls) {
      if ((az - w.z) * (bz - w.z) > 0) continue;
      const t = az === bz ? 0 : (w.z - az) / (bz - az);
      const x = ax + (bx - ax) * t;
      if (Math.abs(x) > this.wallHalf) continue;
      if (w.gaps.some((g) => Math.abs(g - x) < w.width / 2)) continue;
      if (y < heightAt(x, w.z) + SIEGE.wallTop) return true;
    }
    return false;
  }

  routeGoal(c: Combatant, gx: number, gz: number): [number, number] {
    if (!this.siege) return [gx, gz];
    const dir = gz > c.pos.z ? 1 : -1;
    // 搵去目標路上最近嗰幅有門嘅牆
    const ahead = this.walls
      .filter((w) => w.gaps.length && (w.z - c.pos.z) * dir > -3 && (gz - w.z) * dir > 0)
      .sort((a, b) => (a.z - b.z) * dir)[0];
    if (!ahead) return [gx, gz];
    const near = (list: number[]) => list.reduce((b, g) => (Math.abs(g - c.pos.x) < Math.abs(b - c.pos.x) ? g : b), list[0]);
    let gap = near(ahead.gaps);
    let half = ahead.width / 2 - 1;
    if (ahead.ladders?.length) {
      const ladder = near(ahead.ladders);
      if (Math.abs(ladder - c.pos.x) < Math.abs(gap - c.pos.x)) {
        gap = ladder;
        half = SIEGE.ladderWidth / 2 - 0.4;
      }
    }
    const through = Math.abs(c.pos.x - gap) < half;
    return [gap, through ? ahead.z + dir * 8 : ahead.z - dir * 5];
  }

  private createUnit(def: UnitDef, team: number, weaponIds: string[]): Combatant {
    const weapons = weaponIds.map((id) => WEAPONS[id]);
    const c = new Combatant(def, team, buildHuman(def, team, weapons, this.batches), weaponIds);
    this.units.push(c);
    return c;
  }

  private createHorse(base: HorseDef, rider: Combatant): Horse {
    const mult = this.forest ? FOREST.cavalryMult : 1;
    const def: HorseDef = {
      ...base, trotSpeed: base.trotSpeed * mult, gallopSpeed: base.gallopSpeed * mult,
      // 半人馬：下身同上身同色
      color: rider.def.race === 'centaur' ? RACES.centaur.skin : base.color,
    };
    const h = new Horse(def, buildHorse(def, rider.team, this.batches));
    h.pos.copy(rider.pos);
    h.heading = rider.yaw;
    h.rider = rider;
    rider.horse = h;
    this.horses.push(h);
    return h;
  }

  /** 開一場新戰鬥 */
  start(setup: BattleSetup) {
    const { horse: horseDef, loadout, soldiers, enemy, enemyLevel } = setup;
    const theme = THEMES[setup.theme];
    (this.scene.background as THREE.Color).set(theme.sky);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.set(theme.fog);
    fog.near = theme.near;
    fog.far = theme.far;
    const ground = this.scene.getObjectByName('ground') as THREE.Mesh;
    (ground.material as THREE.MeshLambertMaterial).color.set(theme.ground);
    this.hemi.intensity = 1.5 * theme.light;
    this.sun.intensity = 2.3 * theme.light;
    const race = RACES[setup.playerDef.race ?? 'human'];
    if (setup.theme === 'night' && race.nightVision) {
      fog.near *= 1.7;
      fog.far *= 1.7;
      this.hemi.intensity *= 1.6;
    }
    this.fliers.set(setup.firstPerson ? [] : setup.sky ?? []);
    this.sfx.drums(true, () => this.running);

    this.buildWalls(setup.breaches ?? 0, !!setup.firstPerson);
    this.forest = setup.theme === 'forest';
    if (this.forest) this.plantForest();
    this.firstPerson = !!setup.firstPerson;
    this.batches.reset();
    this.projectiles.reset();
    this.units = [];
    this.horses = [];
    this.groups = [makeGroups(0), makeGroups(1)];
    this.selected = new Set(ROLE_KEYS);
    this.stats = { kills: 0, bestHit: 0, topSpeed: 0, time: 0 };
    this.endT = -1;
    this.retreated = false;
    this.freezeT = this.slowT = this.shakeAmt = 0;
    this.moraleT = this.thinkT = this.slotT = this.followT = 0;
    this.warcryT = 0;
    this.rockT = SIEGE.rockEvery;
    this.defending = !!setup.defend;
    this.camYaw = this.viewYaw = setup.defend ? Math.PI : 0;
    this.camPitch = this.viewPitch = 0.16;

    const behindWall = SIEGE.wallZ + SIEGE.defenderOffset;
    const pz = this.dungeon ? DUNGEON.startZ : setup.defend ? behindWall + 12 : -FORMATION.startZ + FORMATION.holdAhead * 2;
    const player = this.createUnit(setup.playerDef, 0, loadout);
    player.pos.set(0, heightAt(0, pz), pz);
    player.yaw = player.aimYaw = this.camYaw;
    this.player = player;
    player.hiddenBody = this.firstPerson;
    this.lastHorse = this.createHorse(horseDef, player);
    if (setup.dismount) {
      const h = this.lastHorse;
      h.rider = null;
      player.horse = null;
      h.dead = true;
      h.pos.y = -60;
    }

    const recruit = (unit: string, team: number, level: number, soldier: Soldier | null) => {
      const def = applyGear(levelDef(UNITS[unit], level), soldier?.gear);
      const group = this.groups[team].find((g) => g.role === def.role)!;
      const c = this.createUnit(def, team, def.weapons);
      c.ai = makeAi(group);
      c.soldier = soldier;
      if (team === 0) c.morale *= setup.moraleMult;
      group.members.push(c);
    };
    for (const s of soldiers) recruit(s.unit, 0, s.level, s);
    for (const entry of enemy) {
      for (let i = 0; i < entry.count; i++) {
        recruit(entry.unit, 1, Math.max(1, enemyLevel - Math.floor(Math.random() * 2)), null);
      }
    }

    [0, 1].forEach((team) => {
      for (const g of this.groups[team]) {
        deployGroup(g);
        if (this.dungeon) this.deployDungeon(g, team);
        else if (setup.defend) {
          const back = g.role === 'infantry' ? 0 : 6;
          g.setAnchor(g.anchorX, team === 0 ? behindWall + back : -FORMATION.startZ, team === 0 ? Math.PI : 0);
          if (team === 1) g.order = 'charge';
        } else if (this.siege && team === 1) {
          // 守軍喺牆後面
          g.setAnchor(g.anchorX, SIEGE.wallZ + SIEGE.defenderOffset + (g.role === 'infantry' ? 0 : 6), Math.PI);
        }
        for (const c of g.members) {
          const ai = c.ai!;
          c.pos.set(ai.slotX, heightAt(ai.slotX, ai.slotZ), ai.slotZ);
          c.yaw = c.aimYaw = g.facing;
          if (c.def.horse && !setup.dismount) this.createHorse(HORSES.find((h) => h.id === c.def.horse)!, c);
        }
      }
    });

    this.formations = setup.formations ? [...setup.formations] : [];
    this.formationT = 0;
    this.cohesion = [1, 1];
    this.pickEnemyFormation(setup.enemyCultures ?? []);
    this.applyFormation();
    for (const u of this.units) {
      if (u.team === 0 && u.ai) {
        u.pos.x = u.ai.slotX;
        u.pos.z = u.ai.slotZ;
        u.pos.y = heightAt(u.pos.x, u.pos.z);
        if (u.horse) u.horse.pos.copy(u.pos);
      }
    }
    this.running = true;
    this.active = true;
    this.lastNow = 0;
  }

  // ── CombatWorld ──
  freeze(s: number) {
    this.freezeT = Math.max(this.freezeT, s);
  }
  slowMo() {
    this.slowT = FEEL.slowMo.duration;
  }
  shake(a: number) {
    this.shakeAmt = Math.max(this.shakeAmt, a);
  }
  announce(text: string, kind: 'hit' | 'kill' | 'guard' | 'hurt') {
    this.hud.announce(text, kind);
  }
  onUnitDown(t: Combatant, by: Combatant) {
    t.wounded = t !== this.player && Math.random() < REWARDS.woundedChance;
    onDeath(t, by, this.units);
    if (by !== t) {
      by.killCount++;
      by.xpEarned += LEVEL.xpPerKillTier * t.def.tier;
    }
    if (t === this.player) this.hud.announce('你倒下咗，部隊繼續作戰', 'hurt');
  }
  playerAim(muzzle: THREE.Vector3, out: THREE.Vector3) {
    const R = COMBAT.ranged;
    const dir = this.camera.getWorldDirection(new THREE.Vector3());
    const p = this.camera.position.clone();
    let dist: number = R.maxAimDist;
    for (let t = 4; t < R.maxAimDist; t += 2) {
      p.copy(this.camera.position).addScaledVector(dir, t);
      if (p.y <= heightAt(p.x, p.z)) {
        dist = t;
        break;
      }
    }
    // 準星線上有敵人就以佢嘅距離歸零，否則肩膊鏡頭會令箭射偏
    for (const u of this.units) {
      if (u.team === this.player.team || u.dead) continue;
      out.copy(u.pos).sub(this.camera.position);
      out.y += 1.2;
      const t = out.dot(dir);
      if (t < 4 || t > dist) continue;
      if (out.addScaledVector(dir, -t).length() < R.aimAssistRadius) dist = t;
    }
    p.copy(this.camera.position).addScaledVector(dir, dist);
    out.copy(p).sub(muzzle);
    const range = out.length();
    out.normalize();
    // 向上補償到準星歸零距離，再遠就要自己預判
    const speed = this.player.weapon.ranged!.speed;
    const flight = Math.min(range, R.zeroDist) / speed;
    out.y += (0.5 * COMBAT.gravity * flight) / speed;
  }

  private frame(now: number) {
    if (!this.active) return;
    if (!this.lastNow) this.lastNow = now;
    const real = Math.min((now - this.lastNow) / 1000, 1 / 20);
    this.lastNow = now;

    this.fpsN++;
    this.fpsT += real;
    if (this.fpsT >= 0.5) {
      this.fps = Math.round(this.fpsN / this.fpsT);
      this.fpsN = 0;
      this.fpsT = 0;
      if (this.running) this.adaptQuality();
    }

    if (this.running && this.player) {
      let dt = real;
      if (this.freezeT > 0) {
        this.freezeT -= real;
        dt = 0;
      } else if (this.slowT > 0) {
        this.slowT -= real;
        dt *= FEEL.slowMo.scale;
      }
      this.simulate(dt, real);
      this.updateCamera(real);
      this.hud.update(this);
    }
    this.input.endFrame(real);
    this.shadowTick = !this.shadowTick;
    this.renderer.shadowMap.needsUpdate = this.shadowTick;
    this.renderer.render(this.scene, this.camera);
  }

  private simulate(dt: number, real: number) {
    this.fliers.update(real);
    const p = this.player;
    this.handlePlayerInput(dt);
    if (this.endT < 0) this.stats.time += dt;
    this.tickCommand(dt);

    for (const u of this.units) {
      if (u !== p && !u.dead) updateAi(u, dt, this);
    }
    for (const h of this.horses) {
      const turned = updateHorse(h, dt, this.obstacles);
      if (h === p.horse) this.camYaw += turned * CAMERA.followHorseTurn;
      h.ctl.jump = false;
      if (h.rider) {
        h.rider.pos.copy(h.pos);
        h.rider.yaw = h.heading;
      }
    }
    for (const u of this.units) {
      if (u.dead) continue;
      updateAction(u, dt, this);
      if (u.dead) continue;
      updateCouch(u, dt, this);
      updateRam(u, this);
    }
    this.projectiles.update(this, dt);
    this.updateBodies(dt);
    this.resolveCollisions();
    this.fx.update(dt);
    this.syncModels(dt);
    this.hoofSound(dt);
    this.onTick?.(this);
    this.checkEnd(real);
  }

  /** 幀率長期低過標準就降畫質 */
  private adaptQuality() {
    if (this.fps === 0 || this.fps >= QUALITY.lowFps) {
      this.slowFrames = 0;
      return;
    }
    this.slowFrames++;
    if (this.slowFrames < QUALITY.patience || this.quality === 0) return;
    this.slowFrames = 0;
    this.quality--;
    if (this.quality === 1) this.renderer.setPixelRatio(1);
    else {
      this.renderer.shadowMap.enabled = false;
      this.sun.castShadow = false;
      this.scene.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (m) m.needsUpdate = true;
      });
    }
    this.resize();
  }

  private tickCommand(dt: number) {
    this.formationT = Math.max(0, this.formationT - dt);
    this.warcryT = Math.max(0, this.warcryT - dt);
    if (this.dungeon) this.updateTraps(dt);
    if (this.siege && !this.dungeon) {
      this.rockT -= dt;
      if (this.rockT <= 0) {
        this.rockT = SIEGE.rockEvery;
        this.throwRock();
      }
    }
    this.moraleT -= dt;
    if (this.moraleT <= 0) {
      this.moraleT = 1;
      tickMorale(this.units);
      this.updateCohesion();
    }
    this.thinkT -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = ENEMY_COMMAND.thinkEvery;
      if (!this.siege) thinkEnemy(this.groups[1], this.units.filter((u) => u.team === 0), this.stats.time);
    }
    this.followT -= dt;
    if (this.followT <= 0) {
      this.followT = FORMATION.followRefresh;
      for (const g of this.groups[0]) if (g.order === 'follow' && !this.player.dead) this.anchorNearPlayer(g, -FORMATION.followBehind);
    }
    this.slotT -= dt;
    if (this.slotT <= 0) {
      this.slotT = SLOT_REFRESH;
      for (const team of this.groups) for (const g of team) g.assignSlots();
    }
  }

  private anchorNearPlayer(g: Group, ahead: number) {
    const p = this.player;
    const yaw = p.horse ? p.horse.heading : this.camYaw;
    const o = FORMATION.offset[g.role];
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const forward = ahead + o.forward;
    g.setAnchor(p.pos.x + fx * forward + fz * o.side, p.pos.z + fz * forward - fx * o.side, yaw);
  }

  /** 對已選兵種落指令 */
  private command(fn: (g: Group) => void, text: string) {
    for (const g of this.groups[0]) if (this.selected.has(g.role)) fn(g);
    this.hud.announce(`${this.selectedLabel()}：${text}`, 'guard');
    this.sfx.whoosh();
  }

  selectedLabel(): string {
    if (this.selected.size === ROLE_KEYS.length) return '全軍';
    return [...this.selected].map((r) => ROLE_LABEL[r]).join('、');
  }

  private setOrder(order: OrderType) {
    this.command((g) => {
      g.order = order;
      if (order === 'follow') this.anchorNearPlayer(g, -FORMATION.followBehind);
      else if (order === 'hold') this.anchorNearPlayer(g, FORMATION.holdAhead);
    }, ORDER_LABEL[order]);
  }

  private handleCommands() {
    const i = this.input;
    if (i.pressed('Digit0')) this.selected = new Set(ROLE_KEYS);
    ROLE_KEYS.forEach((r, n) => {
      if (i.pressed(`Digit${n + 1}`)) this.selected = new Set([r]);
    });
    if (i.pressed('F1')) this.setOrder('follow');
    if (i.pressed('F2')) this.setOrder('hold');
    if (i.pressed('F3')) this.setOrder('charge');
    if (i.pressed('KeyG')) this.nextFormation();
    if (i.pressed('F4')) this.command((g) => { g.loose = true; g.assignSlots(); }, '散開');
    if (i.pressed('F5')) this.command((g) => { g.loose = false; g.assignSlots(); }, '密集');
    if (i.pressed('F6')) {
      const hold = !this.groups[0].filter((g) => this.selected.has(g.role)).every((g) => g.holdFire);
      this.command((g) => { g.holdFire = hold; }, hold ? '停止射擊' : '自由射擊');
    }
  }

  private handlePlayerInput(dt: number) {
    const p = this.player;
    const i = this.input;
    if (i.pressed('Escape')) this.onPauseKey?.();
    if (i.pressed('KeyM')) this.sfx.muted = !this.sfx.muted;

    this.camYaw -= i.mouseDx * CAMERA.mouseSensitivity;
    this.camPitch = clamp(this.camPitch + i.mouseDy * CAMERA.mouseSensitivity, CAMERA.minPitch, CAMERA.maxPitch);

    if (p.dead) return;
    this.handleCommands();
    p.aimYaw = this.camYaw;

    if (p.phase === 'idle') {
      const step = i.pressed('KeyQ') ? 1 : i.wheelStep;
      if (step) {
        i.wheelStep = 0;
        p.weaponIdx = (p.weaponIdx + step + p.weapons.length) % p.weapons.length;
        p.couched = false;
      }
    }

    if (i.pressed('KeyF')) this.toggleMount();
    if (i.pressed('KeyV')) this.warcry();
    if (i.pressed('KeyE')) this.toggleCouch();

    const throttle = (i.down('KeyW') ? 1 : 0) - (i.down('KeyS') ? 1 : 0);
    const strafe = (i.down('KeyA') ? 1 : 0) - (i.down('KeyD') ? 1 : 0);
    const sprint = i.down('ShiftLeft') || i.down('ShiftRight');
    const jump = i.pressed('Space');

    if (p.horse) {
      Object.assign(p.horse.ctl, { throttle, turn: strafe, sprint, jump, climb: i.down('Space') });
    } else if (p.grounded && p.phase !== 'stagger') {
      const fx = Math.sin(this.camYaw);
      const fz = Math.cos(this.camYaw);
      const mx = fx * throttle + fz * strafe;
      const mz = fz * throttle - fx * strafe;
      const len = Math.hypot(mx, mz) || 1;
      let speed = sprint ? p.def.walkSpeed : p.def.runSpeed;
      if (p.phase === 'charge' || p.phase === 'block') speed *= 0.55;
      if (p.phase === 'swing') speed *= 0.4;
      const step = 22 * dt;
      p.vel.x = moveToward(p.vel.x, (mx / len) * speed, step);
      p.vel.z = moveToward(p.vel.z, (mz / len) * speed, step);
      p.yaw += angleDiff(this.camYaw, p.yaw) * (1 - Math.exp(-14 * dt));
      if (jump) {
        p.vy = JUMP_SPEED * (RACES[p.def.race ?? 'human'].jump ?? 1);
        p.grounded = false;
      }
    }

    if (!p.couched) this.handleAttack();
  }

  /** 種族戰吼 */
  private warcry() {
    const p = this.player;
    const cry = RACES[p.def.race ?? 'human'].warcry;
    if (!cry) return;
    if (this.warcryT > 0) {
      this.hud.announce(`戰吼要等 ${Math.ceil(this.warcryT)} 秒`, 'guard');
      return;
    }
    this.warcryT = cry.cooldown;
    for (const u of this.units) {
      if (u.dead || flatDist(u.pos, p.pos) > cry.radius) continue;
      if (u.team === p.team) u.morale = Math.min(u.def.morale, u.morale + cry.allyGain);
      else u.morale -= cry.enemyLoss;
    }
    this.sfx.boom();
    this.hud.announce('戰吼！', 'guard');
  }

  private handleAttack() {
    const p = this.player;
    const i = this.input;
    const w = p.weapon;
    if (p.phase === 'idle' && i.attackBuffer > 0) {
      i.attackBuffer = 0;
      if (w.ranged && (p.ammo[w.id] ?? 0) <= 0) this.hud.announce('冇箭喇，轉武器', 'guard');
      else startCharge(p, i.direction());
    } else if (p.phase === 'charge' && !i.lmb) {
      p.releaseQueued = true;
    }
    if (w.ranged) {
      // 右鍵取消拉弓
      if (i.rmb && p.phase === 'charge') p.phase = 'idle';
      return;
    }
    if (i.rmb) {
      if (p.phase === 'idle') startBlock(p, i.direction());
      else if (p.phase === 'block') p.blockDir = i.direction();
    } else if (p.phase === 'block') {
      p.phase = 'idle';
    }
  }

  private toggleMount() {
    const p = this.player;
    if (RACES[p.def.race ?? 'human'].alwaysRide) return;
    if (p.horse) {
      const h = p.horse;
      if (h.speed > MAX_DISMOUNT_SPEED) {
        this.hud.announce('馬太快，落唔到', 'guard');
        return;
      }
      h.ctl = { throttle: 0, turn: 0, sprint: false, jump: false };
      p.horse = null;
      h.rider = null;
      p.couched = false;
      p.pos.set(h.pos.x - Math.cos(h.heading) * 1.4, h.pos.y, h.pos.z + Math.sin(h.heading) * 1.4);
      p.vel.set(0, 0, 0);
      p.yaw = this.camYaw;
      return;
    }
    const horse = this.horses.find((h) => !h.dead && !h.rider && flatDist(h.pos, p.pos) < MOUNT_RANGE);
    if (!horse) {
      this.hud.announce('附近冇馬', 'guard');
      return;
    }
    p.horse = horse;
    this.lastHorse = horse;
    horse.rider = p;
    p.vel.set(0, 0, 0);
    p.vy = 0;
    p.grounded = true;
  }

  private toggleCouch() {
    const p = this.player;
    if (p.couched) {
      p.couched = false;
      p.couchCooldown = COMBAT.couch.recoverTime;
      return;
    }
    if (!p.weapon.couchable) {
      this.hud.announce('要用騎槍（滾輪切換）', 'guard');
    } else if (!p.horse || p.horse.speed < COMBAT.couch.minSpeed) {
      this.hud.announce('速度未夠，放唔平騎槍', 'guard');
    } else if (p.phase === 'idle' && p.couchCooldown <= 0) {
      p.couched = true;
    }
  }

  private updateBodies(dt: number) {
    for (const u of this.units) {
      if (u.fled) continue;
      if (u.dead) u.deadT += dt;
      if (u.horse) continue;
      const ground = heightAt(u.pos.x, u.pos.z) + (this.dungeon ? 0 : this.climbLift(u.pos.x, u.pos.z));
      if (!u.grounded) {
        u.vy -= COMBAT.gravity * dt;
        u.pos.y += u.vy * dt;
        if (u.pos.y <= ground) {
          u.pos.y = ground;
          u.grounded = true;
          u.vy = 0;
        }
      } else {
        u.pos.y = ground;
      }
      if (u.grounded && (u.dead || u.phase === 'stagger')) {
        const k = Math.exp(-(u.dead ? 5 : 7) * dt);
        u.vel.x *= k;
        u.vel.z *= k;
      }
      u.pos.x += u.vel.x * dt;
      u.pos.z += u.vel.z * dt;
    }
  }

  private resolveCollisions() {
    const alive = this.units.filter((u) => !u.dead);
    const horses = this.horses.filter((h) => !h.dead);
    for (let i = 0; i < alive.length; i++) {
      const a = alive[i];
      if (a.horse) continue;
      for (let j = i + 1; j < alive.length; j++) {
        const b = alive[j];
        if (b.horse) continue;
        const min = a.def.radius + b.def.radius;
        const dx = b.pos.x - a.pos.x;
        if (dx > min || dx < -min) continue;
        const dz = b.pos.z - a.pos.z;
        if (dz > min || dz < -min) continue;
        const d = Math.hypot(dx, dz);
        if (d < min && d > 0.001) {
          const push = (min - d) / 2;
          a.pos.x -= (dx / d) * push;
          a.pos.z -= (dz / d) * push;
          b.pos.x += (dx / d) * push;
          b.pos.z += (dz / d) * push;
        }
      }
      // 人同馬嘅低速碰撞
      for (const h of horses) {
        const min = HORSE_RADIUS + a.def.radius;
        const dx = a.pos.x - h.pos.x;
        if (dx > min || dx < -min) continue;
        const dz = a.pos.z - h.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < min && d > 0.001) {
          a.pos.x = h.pos.x + (dx / d) * min;
          a.pos.z = h.pos.z + (dz / d) * min;
        }
      }
      for (const o of this.obstacles) {
        const min = o.r + a.def.radius;
        const dx = a.pos.x - o.x;
        if (dx > min || dx < -min) continue;
        const dz = a.pos.z - o.z;
        const d = Math.hypot(dx, dz);
        if (d < min && d > 0.001) {
          a.pos.x = o.x + (dx / d) * min;
          a.pos.z = o.z + (dz / d) * min;
        }
      }
      const r = Math.hypot(a.pos.x, a.pos.z);
      if (r > F.arenaRadius) {
        a.pos.x *= F.arenaRadius / r;
        a.pos.z *= F.arenaRadius / r;
      }
    }
    // 馬同馬互推
    for (let i = 0; i < horses.length; i++) {
      for (let j = i + 1; j < horses.length; j++) {
        const a = horses[i];
        const b = horses[j];
        const min = HORSE_RADIUS * 1.7;
        const dx = b.pos.x - a.pos.x;
        if (dx > min || dx < -min) continue;
        const dz = b.pos.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        if (d < min && d > 0.001) {
          const push = (min - d) / 2;
          a.pos.x -= (dx / d) * push;
          a.pos.z -= (dz / d) * push;
          b.pos.x += (dx / d) * push;
          b.pos.z += (dz / d) * push;
        }
      }
    }
  }

  /** 遠處單位隔幾幀先更新動畫，dt 累積補返 */
  private syncModels(dt: number) {
    this.frameNo++;
    const cam = this.camera.position;
    const far = LOD.distance * LOD.distance;
    const isFar = (x: number, z: number) => (x - cam.x) ** 2 + (z - cam.z) ** 2 > far;
    const offBeat = (i: number) => (i + this.frameNo) % LOD.interval !== 0;
    this.horses.forEach((h, i) => {
      const distant = isFar(h.pos.x, h.pos.z);
      if (!distant || !offBeat(i)) syncHorse(h, distant ? dt * LOD.interval : dt);
    });
    this.units.forEach((u, i) => {
      const distant = isFar(u.pos.x, u.pos.z);
      if (!distant || !offBeat(i)) syncHuman(u, distant ? dt * LOD.interval : dt);
    });
    this.batches.commit();
  }

  private hoofSound(dt: number) {
    const horse = this.player.horse;
    if (!horse) return;
    this.stats.topSpeed = Math.max(this.stats.topSpeed, horse.speed);
    const ratio = horse.speed / horse.def.gallopSpeed;
    this.hoofPhase += horse.speed * dt * 0.42;
    if (this.hoofPhase >= 1 && horse.grounded) {
      this.hoofPhase -= 1;
      this.sfx.hoof(ratio);
      if (ratio > 0.5) {
        this.fx.burst(new THREE.Vector3(horse.pos.x, horse.pos.y + 0.1, horse.pos.z), COLORS.dust, 3, 1.8);
      }
    }
  }

  private checkEnd(real: number) {
    if (this.endT < 0) {
      const alive = (team: number) => this.units.some((u) => u.team === team && !u.dead && !u.routing);
      if (!alive(0) || !alive(1)) {
        this.win = alive(0);
        this.endT = RESULT_DELAY;
      }
      return;
    }
    this.endT -= real;
    if (this.endT <= 0) this.finish();
  }

  retreat() {
    this.retreated = true;
    this.win = false;
    this.finish();
  }

  private finish() {
    this.running = false;
    this.sfx.drums(false);
    this.onEnd?.(this.report());
  }

  private report(): BattleResult {
    const rows = [0, 1].map((team) => {
      const map = new Map<string, ReportRow>();
      for (const u of this.units) {
        if (u.team !== team || u.def.id === 'player') continue;
        const r = map.get(u.def.role) ?? { name: ROLE_LABEL[u.def.role], total: 0, alive: 0, dead: 0, wounded: 0, fled: 0 };
        r.total++;
        if (u.fled || u.routing) r.fled++;
        else if (!u.dead) r.alive++;
        else if (u.wounded) r.wounded++;
        else r.dead++;
        map.set(u.def.role, r);
      }
      return [...map.values()];
    });

    let gold = 0;
    let exp = 0;
    let renown = 0;
    let captives = 0;
    const captiveUnits: string[] = [];
    if (this.win) {
      gold = REWARDS.winGold;
      renown = REWARDS.winRenown;
      for (const u of this.units) {
        if (u.team === 0 || !u.dead || u.fled) continue;
        gold += REWARDS.goldPerTier * u.def.tier;
        exp += REWARDS.expPerTier * u.def.tier;
        renown += REWARDS.renownPerTier * u.def.tier;
        if (u.wounded && !u.def.boss && Math.random() < REWARDS.captureChance) {
          captives++;
          captiveUnits.push(u.def.id);
        }
      }
    }
    // 撤退同戰敗都有部分戰利品
    if (!this.win) {
      for (const u of this.units) {
        if (u.team === 1 && u.dead && !u.fled) gold += REWARDS.goldPerTier * u.def.tier;
      }
    }
    const outcomes: BattleOutcome[] = [];
    for (const u of this.units) {
      if (!u.soldier) continue;
      outcomes.push({
        soldier: u.soldier, xp: u.xpEarned, kills: u.killCount, dead: u.dead && !u.fled && !u.wounded,
        wounded: u.dead && u.wounded,
      });
    }
    return {
      win: this.win, retreated: this.retreated, playerDown: this.player.dead, stats: this.stats, rows,
      gold, exp, renown: Math.round(renown), captives, outcomes, playerKills: this.stats.kills, captiveUnits,
    };
  }

  moraleOf(team: number): number {
    return teamMorale(this.units, team);
  }

  private updateCamera(dt: number) {
    const p = this.player;
    const h = p.horse;
    const pos = h ? h.pos : p.pos;
    const aiming = p.phase === 'charge' && !!p.weapon.ranged;
    const k = 1 - Math.exp(-CAMERA_SMOOTH * dt);
    this.viewYaw += (this.camYaw - this.viewYaw) * k;
    this.viewPitch += (this.camPitch - this.viewPitch) * k;
    if (this.firstPerson && !p.dead) {
      const eye = p.pos.y + 1.62;
      const cp = Math.cos(this.viewPitch);
      this.camera.position.set(p.pos.x, eye, p.pos.z);
      this.camera.lookAt(
        p.pos.x + Math.sin(this.viewYaw) * cp * 10, eye - Math.sin(this.viewPitch) * 10, p.pos.z + Math.cos(this.viewYaw) * cp * 10,
      );
      this.sun.target.position.set(p.pos.x, p.pos.y, p.pos.z);
      this.sun.position.set(p.pos.x + 50, p.pos.y + 90, p.pos.z + 30);
      return;
    }
    const dist = (h ? CAMERA.distanceMounted : CAMERA.distanceOnFoot) * (aiming ? CAMERA.aimDistanceMult : 1);
    const height = h ? CAMERA.heightMounted : CAMERA.heightOnFoot;
    const yaw = this.viewYaw;
    const cp = Math.cos(this.viewPitch);
    const sp = Math.sin(this.viewPitch);
    const fx = Math.sin(yaw) * cp;
    const fz = Math.cos(yaw) * cp;
    const rx = -Math.cos(yaw);
    const rz = Math.sin(yaw);
    const fy = pos.y + height;

    const camX = pos.x - fx * dist + rx * CAMERA.shoulderOffset;
    const camZ = pos.z - fz * dist + rz * CAMERA.shoulderOffset;
    const camY = Math.max(fy + sp * dist, heightAt(camX, camZ) + 0.4);

    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.6);
    const sh = this.shakeAmt * this.shakeAmt * 2;
    this.camera.position.set(
      camX + (Math.random() - 0.5) * sh,
      camY + (Math.random() - 0.5) * sh,
      camZ + (Math.random() - 0.5) * sh,
    );
    this.camera.lookAt(pos.x + fx * 12 + rx * CAMERA.shoulderOffset, fy - sp * 12 + 0.2, pos.z + fz * 12 + rz * CAMERA.shoulderOffset);

    const speedRatio = h ? clamp(h.speed / h.def.gallopSpeed, 0, 1) : 0;
    const fov = CAMERA.baseFov + CAMERA.speedFovBoost * speedRatio * speedRatio - (aiming ? CAMERA.aimFovDrop * p.charge : 0);
    this.camera.fov += (fov - this.camera.fov) * (1 - Math.exp(-5 * dt));
    this.camera.updateProjectionMatrix();

    this.sun.target.position.set(pos.x, pos.y, pos.z);
    this.sun.position.set(pos.x + 50, pos.y + 90, pos.z + 30);
  }
}
