import { FACTIONS, FIEF_OWNERS, POLITICS as P, WORLD_EVENTS, factionOf } from '../data/factions';
import { DEEDS, HONOR, type DeedId } from '../data/honor';
import { PLACES, type PlaceDef } from '../data/world';
import type { ArmyEntry } from '../data/battlefield';

export const PLAYER = 'player';
export type Rank = 'free' | 'merc' | 'vassal' | 'king';
export const RANK_NAME: Record<Rank, string> = { free: '自由傭兵', merc: '契約傭兵', vassal: '封臣', king: '國王' };

export interface Threat {
  place: string;
  by: string;
  deadline: number;
}

export interface PoliticsSave {
  owners: Record<string, string>;
  /** 俘虜咗嘅領主（勢力 id） */
  lords: string[];
  /** 領地 → 守將名 */
  governors: Record<string, string>;
  relations: Record<string, number>;
  wars: [string, string][];
  rank: Rank;
  liege: string | null;
  renown: number;
  threats: Threat[];
  kingdom: string | null;
  won: boolean;
  /** 正義 */
  justice: number;
  /** 忠誠 */
  loyalty: number;
  /** 勢力 → 懸賞金 */
  wanted: Record<string, number>;
  /** 已淪為山賊 */
  outlaw: boolean;
  /** 遇過嘅劇場角色 */
  storyMet: string[];
}

export function migratePolitics(s: PoliticsSave): PoliticsSave {
  s.justice ??= 0;
  s.loyalty ??= 0;
  s.wanted ??= {};
  s.outlaw ??= false;
  s.storyMet ??= [];
  s.lords ??= [];
  s.governors ??= {};
  return s;
}

export function newPolitics(): PoliticsSave {
  return {
    lords: [], governors: {},
    owners: { ...FIEF_OWNERS }, relations: Object.fromEntries(FACTIONS.map((f) => [f.id, 0])),
    wars: [['griffin', 'orcs'], ['xuan', 'jiangdong'], ['wuyi', 'chishui'], ['sylvan', 'undead']],
    rank: 'free', liege: null, renown: 0, threats: [], kingdom: null, won: false,
    justice: 0, loyalty: 0, wanted: {}, outlaw: false, storyMet: [],
  };
}

const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const pair = (w: [string, string], a: string, b: string) => (w[0] === a && w[1] === b) || (w[0] === b && w[1] === a);

/** 十二國外交、戰爭同玩家仕途 */
export class Politics {
  constructor(public s: PoliticsSave, private note: (t: string) => void) {}

  nameOf(id: string): string {
    if (id === PLAYER) return this.s.kingdom ?? '你';
    return factionOf(id)?.name ?? '無主';
  }

  ownerOf(placeId: string): string | undefined {
    return this.s.owners[placeId];
  }

  fiefsOf(id: string): PlaceDef[] {
    return PLACES.filter((p) => this.s.owners[p.id] === id);
  }

  atWar(a: string, b: string): boolean {
    return this.s.wars.some((w) => pair(w, a, b));
  }

  /** 玩家（連宗主）同呢個勢力係咪敵對 */
  hostile(f: string): boolean {
    if (f === PLAYER) return false;
    if (this.atWar(PLAYER, f)) return true;
    return !!this.s.liege && this.atWar(this.s.liege, f);
  }

  relation(f: string): number {
    return this.s.relations[f] ?? 0;
  }

  addRelation(f: string, n: number) {
    this.s.relations[f] = Math.max(-100, Math.min(100, this.relation(f) + n));
  }

  declareWar(f: string) {
    if (!this.atWar(PLAYER, f)) this.s.wars.push([PLAYER, f]);
    this.addRelation(f, P.warRelation);
    this.note(`你向${this.nameOf(f)}宣戰`);
  }

  /** 處置第一個領主俘虜：收贖金或者無條件放人 */
  releaseLord(ransom: boolean) {
    const f = this.s.lords.shift();
    if (!f) return;
    this.addRelation(f, ransom ? P.ransomRelation : P.freeRelation);
    if (!ransom) this.s.justice = Math.min(100, this.s.justice + P.freeJustice);
    this.note(`${ransom ? '收贖金放返' : '無條件釋放'}${this.nameOf(f)}領主`);
  }

  makePeace(f: string) {
    this.s.wars = this.s.wars.filter((w) => !pair(w, PLAYER, f));
    this.note(`你同${this.nameOf(f)}議和`);
  }

  /** 記低善惡行為；victim 係受害勢力 */
  deed(id: DeedId, victim?: string) {
    const d = DEEDS[id];
    const s = this.s;
    const clampHonor = (v: number) => Math.max(HONOR.min, Math.min(HONOR.max, v));
    s.justice = clampHonor(s.justice + d.justice);
    s.loyalty = clampHonor(s.loyalty + d.loyalty);
    if (victim && victim !== PLAYER && d.bounty) {
      s.wanted[victim] = (s.wanted[victim] ?? 0) + d.bounty;
      this.addRelation(victim, -15);
      if (victim === s.liege) s.loyalty = clampHonor(s.loyalty - 20);
    }
    if (!s.outlaw && s.justice <= HONOR.outlawAt) {
      s.outlaw = true;
      this.note('惡名遠播，你已淪為山賊！');
      if (s.rank === 'merc' || s.rank === 'vassal') {
        this.note(`${this.nameOf(s.liege ?? '')}同你恩斷義絕`);
        s.rank = 'free';
        s.liege = null;
      }
    }
    if (s.outlaw && s.justice >= HONOR.redeemAt) {
      s.outlaw = false;
      this.note('你洗底做返好人');
    }
  }

  bounty(f: string): number {
    return this.s.wanted[f] ?? 0;
  }

  clearWanted(f: string) {
    delete this.s.wanted[f];
  }

  /** 捐款贖罪 */
  atone() {
    this.s.justice = Math.min(HONOR.max, this.s.justice + HONOR.donate.justice);
    if (this.s.outlaw && this.s.justice >= HONOR.redeemAt) {
      this.s.outlaw = false;
      this.note('你洗底做返好人');
    }
  }

  /** 正義同忠誠對部隊士氣嘅倍率 */
  honorMorale(): number {
    return 1 + this.s.loyalty * HONOR.moralePerLoyalty;
  }

  canContract(f: string): boolean {
    return this.s.rank === 'free' && !this.s.outlaw && !this.bounty(f)
      && this.relation(f) >= P.mercMinRelation && !this.atWar(PLAYER, f);
  }

  signContract(f: string) {
    this.s.rank = 'merc';
    this.s.liege = f;
    this.note(`同${this.nameOf(f)}簽咗傭兵契約`);
  }

  canSwear(f: string): boolean {
    const okRank = this.s.rank === 'free' || (this.s.rank === 'merc' && this.s.liege === f);
    return okRank && !this.s.outlaw && !this.bounty(f) && this.s.renown >= P.vassalRenown && this.relation(f) >= P.vassalMinRelation && !this.atWar(PLAYER, f);
  }

  swear(f: string) {
    this.s.rank = 'vassal';
    this.s.liege = f;
    this.note(`你宣誓效忠${this.nameOf(f)}`);
  }

  canCrown(): boolean {
    return this.s.rank !== 'king' && this.fiefsOf(PLAYER).length >= P.kingFiefs;
  }

  crown(name: string) {
    const old = this.s.liege;
    this.s.rank = 'king';
    this.s.liege = null;
    this.s.kingdom = name;
    if (old) {
      this.addRelation(old, P.warRelation);
      this.s.wars.push([PLAYER, old]);
      this.deed('betray');
    }
    this.note(`${name}建國，你登基為王！`);
  }

  capture(place: PlaceDef) {
    const old = this.s.owners[place.id];
    this.s.owners[place.id] = PLAYER;
    this.s.renown += P.captureRenown;
    this.s.threats = this.s.threats.filter((t) => t.place !== place.id);
    if (this.s.liege) this.addRelation(this.s.liege, 10);
    this.note(`你攻陷${place.name}（原屬${this.nameOf(old)}）`);
    if (old && old !== PLAYER && Math.random() < P.lordCaptureChance) {
      this.s.lords.push(old);
      this.note(`俘虜咗${this.nameOf(old)}嘅領主`);
    }
    if (this.fiefsOf(PLAYER).length >= P.victoryFiefs && this.s.rank === 'king') this.s.won = true;
  }

  /** 領地守軍 */
  garrisonOf(p: PlaceDef): { army: ArmyEntry[]; level: number } | null {
    const f = factionOf(this.s.owners[p.id] ?? '');
    return f ? { army: f.garrison, level: f.level + (p.kind === 'town' ? 1 : 0) } : null;
  }

  /** 每週領地收入 */
  fiefIncome(): number {
    return Math.round(this.fiefsOf(PLAYER).reduce((s, p) => {
      const base = p.kind === 'town' ? P.incomeTown : p.kind === 'village' ? P.incomeVillage : P.incomeCastle;
      return s + base * (this.s.governors[p.id] ? P.governorIncome : 1);
    }, 0));
  }

  dailyPay(): number {
    if (this.s.rank !== 'merc') return 0;
    return Math.round(P.mercPay * (this.s.loyalty >= HONOR.payLoyalty ? HONOR.payBonus : 1));
  }

  /** 每日檢查：領地被圍過期就失去 */
  daily(day: number) {
    for (const t of [...this.s.threats]) {
      if (day > t.deadline) {
        const guard = this.s.governors[t.place];
        if (guard && Math.random() < P.governorHold) {
          this.s.threats = this.s.threats.filter((x) => x !== t);
          this.note(`${guard}守住${PLACES.find((x) => x.id === t.place)?.name}，敵軍退兵`);
          continue;
        }
        delete this.s.governors[t.place];
        this.s.owners[t.place] = t.by;
        this.s.threats = this.s.threats.filter((x) => x !== t);
        const place = PLACES.find((x) => x.id === t.place);
        this.note(`${place?.name}失守，落入${this.nameOf(t.by)}手中`);
      }
    }
  }

  /** 國王駕崩：鄰國趁亂奪城，停晒戰 */
  kingDies() {
    const ids = FACTIONS.map((f) => f.id).filter((id) => id !== this.s.liege && this.fiefsOf(id).length > 1);
    if (!ids.length) return;
    const f = pick(ids);
    this.note(`${this.nameOf(f)}國王駕崩，諸子爭位！`);
    this.s.wars = this.s.wars.filter((w) => !w.includes(f) || w.includes(PLAYER));
    if (Math.random() < WORLD_EVENTS.successionLoss) {
      const others = FACTIONS.map((x) => x.id).filter((id) => id !== f);
      const taker = pick(others);
      const p = pick(this.fiefsOf(f));
      this.s.owners[p.id] = taker;
      this.note(`${this.nameOf(taker)}趁亂奪取${p.name}`);
    }
  }

  /** 每隔幾日：各國自己開戰、議和、攻城 */
  think(day: number) {
    const ids = FACTIONS.map((f) => f.id).filter((id) => this.fiefsOf(id).length);
    const warCount = (id: string) => this.s.wars.filter((w) => w.includes(id)).length;

    if (Math.random() < P.warChance) {
      const a = pick(ids);
      const b = pick(ids.filter((x) => x !== a));
      if (b && !this.atWar(a, b) && warCount(a) < P.maxWarsPerFaction && warCount(b) < P.maxWarsPerFaction) {
        this.s.wars.push([a, b]);
        this.note(`${this.nameOf(a)}向${this.nameOf(b)}宣戰`);
      }
    }

    const npcWars = this.s.wars.filter((w) => !w.includes(PLAYER));
    if (npcWars.length && Math.random() < P.peaceChance) {
      const w = pick(npcWars);
      this.s.wars = this.s.wars.filter((x) => x !== w);
      this.note(`${this.nameOf(w[0])}同${this.nameOf(w[1])}議和`);
    }

    for (const [a, b] of npcWars) {
      if (Math.random() > P.conquestChance) continue;
      const [win, lose] = Math.random() < 0.5 ? [a, b] : [b, a];
      const fiefs = this.fiefsOf(lose);
      if (fiefs.length <= 1) continue;
      const p = pick(fiefs);
      this.s.owners[p.id] = win;
      this.note(`${this.nameOf(win)}攻下${this.nameOf(lose)}嘅${p.name}`);
    }

    const mine = this.fiefsOf(PLAYER);
    if (mine.length && Math.random() < P.threatChance) {
      const foes = FACTIONS.filter((f) => this.hostile(f.id) && this.fiefsOf(f.id).length);
      const p = pick(mine);
      if (foes.length && !this.s.threats.some((t) => t.place === p.id)) {
        const by = pick(foes).id;
        this.s.threats.push({ place: p.id, by, deadline: day + P.threatDays });
        this.note(`${this.nameOf(by)}圍攻你嘅${p.name}！第 ${day + P.threatDays} 日前要回防`);
      }
    }
  }
}
