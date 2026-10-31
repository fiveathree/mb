import {
  ARENA, ARMORS, CAPTIVE, COMPANIONS, GOODS, GOOD_ORDER, LOCAL, MARKET, NPC, NPC_RULES, SLOT_NAME, TOWN_TRADE, WORKSHOPS,
  type GoodId,
} from '../data/economy';
import { ARTIFACTS, SIEGE } from '../data/factions';
import { HONOR, type StoryHero } from '../data/honor';
import { currentScenario } from '../data/scenarios';
import { GACHA, POOLS, POOL_ORDER } from '../data/gacha';
import { PLAYER } from '../politics/politics';
import { accept, offersAt } from '../quests/quests';
import { applyChoice } from '../quests/events';
import type { StoryEvent } from '../data/quests';
import { HORSES } from '../data/horses';
import { UNITS, type UnitDef } from '../data/units';
import { PLAYER_ARSENAL, WEAPONS } from '../data/weapons';
import { PLACES, SHOP, BANDIT, type PlaceDef } from '../data/world';
import { horsePrice, skillOf, weaponPrice } from '../core/hero';
import {
  addSoldier, armyPower, armySize, canAfford, rosterPower, spend, wageOf, type Roster,
} from '../core/roster';
import { raiderArmy, type Npc } from '../worldmap/npcs';
import { banditArmy, dayOf, isOpen, type BanditParty, type World } from '../worldmap/world';
import type { Hud } from './hud';

type TownTab = 'market' | 'supply' | 'smith' | 'tavern' | 'workshop' | 'arena' | 'quest';
const TOWN_TABS: [TownTab, string][] = [
  ['market', '市集'], ['supply', '補給'], ['smith', '鐵匠'], ['tavern', '酒館'], ['workshop', '作坊'], ['arena', '競技場'], ['quest', '任務'],
];
type VillageTab = 'affairs' | 'market';
const VILLAGE_TABS: [VillageTab, string][] = [['affairs', '村務'], ['market', '市集']];

export interface PlaceActions {
  onLeave: () => void;
  onParty: () => void;
  onAttack: (p: PlaceDef) => void;
  onBandit: (b: BanditParty, auto: boolean) => void;
  onEscaped: () => void;
  onArena: (town: PlaceDef, bet: boolean) => void;
  onRaider: (n: Npc) => void;
  onSiege: (p: PlaceDef, breaches: number) => void;
  onDefend: (p: PlaceDef, by: string) => void;
  onHunter: (n: Npc) => void;
}

function strengthText(mine: number, theirs: number): string {
  const ratio = mine / Math.max(theirs, 0.01);
  if (ratio > 1.6) return '優勢明顯';
  if (ratio > 1.1) return '略佔上風';
  if (ratio > 0.8) return '勢均力敵';
  if (ratio > 0.5) return '形勢不利';
  return '以卵擊石';
}

/** 城鎮、村莊、征服地點、遭遇同 NPC 畫面 */
export class PlaceScreens {
  private notice = '';
  private townTab: TownTab = 'market';
  private villageTab: VillageTab = 'affairs';

  constructor(private hud: Hud, private world: World, private roster: Roster, private act: PlaceActions) {}

  bind(world: World, roster: Roster) {
    this.world = world;
    this.roster = roster;
  }

  /** 下一個畫面顯示一句提示 */
  say(text: string) {
    this.notice = text;
  }

  private goldText(): string {
    return this.roster.infiniteGold ? '∞' : String(this.roster.gold);
  }

  private show(title: string, desc: string, body: string, handlers: Record<string, () => void>) {
    this.hud.showScreen(`
      <div class="card place">
        <h2>${title}</h2>
        <p class="sub">${desc}</p>
        <div class="gold">${this.goldText()} 金・糧 ${Math.floor(this.world.save.food)}・兵 ${this.roster.soldiers.length}</div>
        <p class="notice">${this.notice}</p>
        ${body}
      </div>`);
    this.notice = '';
    for (const [id, fn] of Object.entries(handlers)) {
      const el = document.getElementById(id);
      if (el) el.onclick = fn;
    }
  }

  /** 買糧掣：1 個同 10 個 */
  private foodButtons(place: string, h: Record<string, () => void>, refresh: () => void): string {
    const w = this.world;
    return SHOP.buyLots.map((n) => {
      const cost = Math.max(1, Math.round(n * w.foodPrice(place)));
      h[`food${n}`] = () => {
        if (w.cargoCount() + n * LOCAL.foodWeight > w.cargoCap()) this.notice = '貨倉滿咗';
        else if (spend(this.roster, cost)) {
          w.save.food += n;
          // 買走咗當地存糧，糧價跟住升
          w.save.townFood[place] = (w.save.townFood[place] ?? 0) - n;
          this.notice = `買咗 ${n} 糧`;
        } else this.notice = '金幣不足';
        refresh();
      };
      return `<button class="alt" id="food${n}" ${canAfford(this.roster, cost) ? '' : 'disabled'}>買糧 ${n}（${cost} 金）</button>`;
    }).join('');
  }

  /** 買招募令掣：1 張同 10 張 */
  private ticketButtons(h: Record<string, () => void>, refresh: () => void): string {
    const r = this.roster;
    return SHOP.buyLots.map((n) => {
      const cost = n * GACHA.ticketPrice;
      h[`ticket${n}`] = () => {
        if (spend(r, cost)) {
          r.tickets.human += n;
          this.notice = `買咗 ${n} 張${POOLS.human.ticket}`;
        } else this.notice = '金幣不足';
        refresh();
      };
      return `<button class="alt" id="ticket${n}" ${canAfford(r, cost) ? '' : 'disabled'}>${POOLS.human.ticket} ${n} 張（${cost} 金）</button>`;
    }).join('');
  }

  town(p: PlaceDef) {
    const owner = this.world.politics.ownerOf(p.id);
    if (owner && this.world.politics.bounty(owner)) {
      this.wantedGate(p);
      return;
    }
    const refresh = () => this.town(p);
    const handlers: Record<string, () => void> = { party: this.act.onParty, leave: this.act.onLeave };
    for (const [k] of TOWN_TABS) {
      handlers[`t_${k}`] = () => {
        this.townTab = k;
        refresh();
      };
    }
    const fief = this.fiefActions(p, handlers);
    const body = {
      market: () => this.marketTab(p, handlers, refresh),
      supply: () => this.supplyTab(p, handlers, refresh),
      smith: () => this.smithTab(handlers, refresh),
      tavern: () => this.tavernTab(p, handlers, refresh),
      workshop: () => this.workshopTab(p, handlers, refresh),
      arena: () => this.arenaTab(p, handlers),
      quest: () => this.questTab(p, handlers, refresh),
    }[this.townTab]();
    this.show(p.name, p.desc ?? '', `
      <div class="tabs center">${TOWN_TABS.map(([k, v]) => `<button class="tab ${k === this.townTab ? 'on' : ''}" id="t_${k}">${v}</button>`).join('')}</div>
      ${fief}${body}
      <div class="row"><button class="alt" id="party">部隊／抽卡</button><button class="go" id="leave">離開</button></div>`, handlers);
  }

  private questTab(p: PlaceDef, h: Record<string, () => void>, refresh: () => void): string {
    const w = this.world.save;
    const rows = offersAt(w, p).map((q, i) => {
      const taken = w.quests.some((x) => x.id === q.id);
      h[`q${i}`] = () => {
        this.notice = accept(this.world, q);
        refresh();
      };
      return `<button class="alt" id="q${i}" ${taken ? 'disabled' : ''}>${q.title}（${q.gold} 金，${q.deadline - dayOf(w)} 日內）${taken ? '　已接' : ''}</button>`;
    }).join('');
    const active = w.quests.map((q) => `<div>${q.title}${q.kind === 'bandits' ? ` ${q.progress}／${q.need}` : ''}・第 ${q.deadline} 日前</div>`).join('');
    return `<div class="pick-title">城中告示</div><div class="row wrap">${rows}</div>
      <div class="pick-title">進行中</div><div class="progress">${active || '<div>冇任務</div>'}</div>`;
  }

  private tradeRatio(): number {
    return skillOf(this.roster.hero, this.roster.soldiers, 'trade') * 0.02
      + this.world.save.pol.justice * HONOR.pricePerJustice;
  }

  /** 被通緝：城門守衛攔住 */
  private wantedGate(p: PlaceDef) {
    const pol = this.world.politics;
    const owner = pol.ownerOf(p.id)!;
    const fine = pol.bounty(owner) * HONOR.fineMult;
    this.show(p.name, `城門守衛認得你：${pol.nameOf(owner)}懸賞 ${pol.bounty(owner)} 金通緝緊你！`, `
      <div class="row wrap">
        <button class="go" id="pay" ${canAfford(this.roster, fine) ? '' : 'disabled'}>交罰款 ${fine} 金</button>
        <button class="alt" id="siege2">攻城</button>
        <button class="alt" id="leave">走人</button>
      </div>`, {
      pay: () => {
        spend(this.roster, fine);
        pol.clearWanted(owner);
        this.notice = '通緝已撤銷';
        this.town(p);
      },
      siege2: () => {
        if (!pol.hostile(owner)) pol.declareWar(owner);
        this.siege(p, 0);
      },
      leave: this.act.onLeave,
    });
  }

  /** 官兵截住通緝犯 */
  hunted(n: Npc) {
    const pol = this.world.politics;
    const owner = pol.ownerOf(n.home) ?? '';
    const fine = pol.bounty(owner) * HONOR.fineMult;
    this.show('官兵截查', `${pol.nameOf(owner)}嘅巡邏隊（${n.size} 人）捉你歸案，懸賞 ${pol.bounty(owner)} 金。`, `
      <div class="row wrap">
        <button class="go" id="fight">開打</button>
        <button class="alt" id="pay" ${canAfford(this.roster, fine) ? '' : 'disabled'}>交罰款 ${fine} 金</button>
      </div>`, {
      fight: () => this.act.onHunter(n),
      pay: () => {
        spend(this.roster, fine);
        pol.clearWanted(owner);
        this.act.onLeave();
      },
    });
  }

  /** 遇到劇場角色 */
  storyHero(h: StoryHero, then: () => void) {
    const def = UNITS[h.unit];
    this.show(h.title, h.text, `
      <div class="pick-title">${def.name}：${def.desc ?? ''}</div>
      <div class="row"><button class="go" id="join">收入帳下</button><button class="alt" id="no">婉拒</button></div>`, {
      join: () => {
        addSoldier(this.roster, h.unit);
        this.world.save.pol.storyMet.push(h.id);
        this.world.note(`${def.name}加入咗你嘅隊伍`);
        then();
      },
      no: then,
    });
  }

  private marketTab(p: PlaceDef, h: Record<string, () => void>, refresh: () => void): string {
    const w = this.world;
    const r = this.roster;
    const trade = this.tradeRatio();
    const purse = w.save.treasury;
    const rows = GOOD_ORDER.map((g: GoodId) => {
      const price = w.goodPrice(p.id, g);
      const buy = Math.round(price * (1 - trade));
      const sell = Math.round(price * (MARKET.sellRatio + trade));
      const lot = MARKET.lot;
      h[`buy_${g}`] = () => {
        if (w.cargoCount() + lot * GOODS[g].weight > w.cargoCap()) this.notice = '貨倉載唔落';
        else if (w.save.stock[p.id][g] < lot) this.notice = '存貨唔夠';
        else if (spend(r, buy * lot)) {
          w.save.cargo[g] += lot;
          w.save.stock[p.id][g] -= lot;
          purse[p.id] += buy * lot;
        } else this.notice = '金幣不足';
        refresh();
      };
      h[`sell_${g}`] = () => {
        if (purse[p.id] < sell * lot) this.notice = '呢度冇咁多錢買';
        else if (w.save.cargo[g] >= lot) {
          w.save.cargo[g] -= lot;
          w.save.stock[p.id][g] += lot;
          r.gold += sell * lot;
          purse[p.id] -= sell * lot;
        }
        refresh();
      };
      return `<tr><td>${GOODS[g].name}</td><td>${GOODS[g].weight}</td><td>${Math.round(w.save.stock[p.id][g])}</td><td>${buy}</td><td>${sell}</td><td>${w.save.cargo[g]}</td>
        <td><button class="mini" id="buy_${g}">買 ${lot}</button><button class="mini" id="sell_${g}">賣 ${lot}</button></td></tr>`;
    }).join('');
    const t = TOWN_TRADE[p.id];
    return `
      <div class="pick-title">特產：${t.makes.map((g) => GOODS[g].name).join('、')}　短缺：${t.needs.map((g) => GOODS[g].name).join('、')}</div>
      <div class="pick-title">當地金庫 ${Math.round(purse[p.id])} 金　你嘅載重 ${w.cargoCount()}／${w.cargoCap()}</div>
      <table class="report trade"><tr><th>貨物</th><th>重</th><th>存貨</th><th>買</th><th>賣</th><th>你有</th><th></th></tr>${rows}</table>
      ${p.kind === 'town' ? this.captiveRow(p, h, refresh) : ''}`;
  }

  /** 俘虜：賣畀城鎮或者招降 */
  private captiveRow(p: PlaceDef, h: Record<string, () => void>, refresh: () => void): string {
    const w = this.world.save;
    const r = this.roster;
    const list = w.captives;
    if (!list.length) return '<div class="pick-title">俘虜：冇</div>';
    const unit = UNITS[list[0]];
    const price = unit.tier * CAPTIVE.pricePerTier;
    const hire = unit.tier * CAPTIVE.recruitPerTier;
    h.sellCap = () => {
      if (w.treasury[p.id] < price) this.notice = '呢度冇咁多錢買';
      else {
        list.shift();
        r.gold += price;
        w.treasury[p.id] -= price;
        this.notice = `賣咗一個${unit.name}，${price} 金`;
      }
      refresh();
    };
    h.hireCap = () => {
      if (spend(r, hire)) {
        list.shift();
        addSoldier(r, unit.id);
        w.morale = Math.max(0, w.morale + CAPTIVE.recruitMorale);
        this.notice = `${unit.name}歸順咗`;
      } else this.notice = '金幣不足';
      refresh();
    };
    return `<div class="pick-title">俘虜 ${list.length} 人（每日有機會走甩）：
      <button class="mini" id="sellCap">賣 ${unit.name} ${price} 金</button>
      <button class="mini" id="hireCap">招降 ${hire} 金</button></div>`;
  }

  private supplyTab(p: PlaceDef, h: Record<string, () => void>, refresh: () => void): string {
    const w = this.world;
    const r = this.roster;
    h.rest = () => {
      w.rest();
      this.notice = '休息咗一日';
      refresh();
    };
    const owned = POOL_ORDER.map((k) => `${POOLS[k].ticket} ${r.tickets[k]}`).join('・');
    return `
      <div class="pick-title">糧食（當地糧價 ${w.foodPrice(p.id).toFixed(1)} 金，買得多會升）　載重 ${w.cargoCount()}／${w.cargoCap()}</div>
      <div class="row wrap">${this.foodButtons(p.id, h, refresh)}</div>
      <div class="pick-title">現有招募令：${owned}</div>
      <div class="row wrap">${this.ticketButtons(h, refresh)}</div>
      <div class="row wrap"><button class="alt" id="rest">休息一日</button></div>`;
  }

  private smithTab(h: Record<string, () => void>, refresh: () => void): string {
    const r = this.roster;
    const hero = r.hero;
    const buy = (id: string, price: number, fn: () => void) => {
      h[id] = () => {
        if (spend(r, price)) fn();
        else this.notice = '金幣不足';
        refresh();
      };
    };
    const weapons = PLAYER_ARSENAL.map((id) => {
      const owned = hero.weapons.includes(id);
      if (!owned) buy(`w_${id}`, weaponPrice(id), () => hero.weapons.push(id));
      return `<button class="mini" id="w_${id}" ${owned ? 'disabled' : ''}>${WEAPONS[id].name} ${owned ? '已有' : weaponPrice(id)}</button>`;
    }).join('');
    const armors = ARMORS.map((a) => {
      const count = hero.armors.filter((x) => x === a.id).length;
      // 可以買多件畀英雄著
      buy(`a_${a.id}`, a.price, () => hero.armors.push(a.id));
      return `<button class="mini" id="a_${a.id}">${SLOT_NAME[a.slot]}・${a.name} +${a.armor} ${a.price}${count ? `（有 ${count}）` : ''}</button>`;
    }).join('');
    const horses = HORSES.filter((d) => !d.troopOnly).map((d) => {
      const owned = hero.horses.includes(d.id);
      if (!owned) buy(`h_${d.id}`, horsePrice(d.id), () => hero.horses.push(d.id));
      return `<button class="mini" id="h_${d.id}" ${owned ? 'disabled' : ''}>${d.name} ${owned ? '已有' : horsePrice(d.id)}</button>`;
    }).join('');
    return `
      <div class="pick-title">武器</div><div class="shop">${weapons}</div>
      <div class="pick-title">護甲（買完喺 Tab「裝備」頁著）</div><div class="shop">${armors}</div>
      <div class="pick-title">馬匹</div><div class="shop">${horses}</div>`;
  }

  private mercOffers(p: PlaceDef): UnitDef[] {
    const slot = Math.floor(dayOf(this.world.save) / SHOP.mercRefreshDays) + p.x;
    const pool = currentScenario().mercs;
    return Array.from({ length: SHOP.mercOffers }, (_, i) => UNITS[pool[(slot + i * 2) % pool.length]]);
  }

  private tavernTab(p: PlaceDef, h: Record<string, () => void>, refresh: () => void): string {
    const r = this.roster;
    const offers = this.mercOffers(p).map((d, i) => {
      const price = d.tier * SHOP.mercPerTier;
      h[`merc${i}`] = () => {
        if (spend(r, price)) {
          addSoldier(r, d.id);
          this.notice = `招咗 ${d.name}`;
        }
        refresh();
      };
      return `<button class="alt" id="merc${i}" ${canAfford(r, price) ? '' : 'disabled'}>${d.name}（${price} 金・週餉 ${wageOf(d)}）</button>`;
    }).join('');
    const comps = COMPANIONS.map((c, i) => {
      const def = UNITS[c.unit];
      const have = r.soldiers.some((s) => s.unit === c.unit);
      h[`comp${i}`] = () => {
        if (!have && spend(r, c.price)) {
          addSoldier(r, c.unit);
          this.notice = `${def.name} 加入咗隊伍`;
        }
        refresh();
      };
      return `<button class="alt" id="comp${i}" ${have || !canAfford(r, c.price) ? 'disabled' : ''}>${def.name}：${def.desc}（${have ? '已入隊' : `${c.price} 金`}）</button>`;
    }).join('');
    return `
      <div class="pick-title">傭兵</div><div class="row wrap">${offers}</div>
      <div class="pick-title">同伴（入隊後提供技能加成）</div><div class="row wrap">${comps}</div>`;
  }

  private workshopTab(p: PlaceDef, h: Record<string, () => void>, refresh: () => void): string {
    const w = this.world;
    const mine = w.save.workshops[p.id];
    if (mine) {
      const def = WORKSHOPS.find((x) => x.id === mine)!;
      return `<p class="sub">你喺呢度有${def.name}，貨物 ${GOODS[def.good].name} 愈貴賺愈多。全部作坊每週約收 ${w.workshopIncome()} 金。</p>`;
    }
    const list = WORKSHOPS.map((d) => {
      h[`ws_${d.id}`] = () => {
        if (spend(this.roster, d.cost)) w.save.workshops[p.id] = d.id;
        else this.notice = '金幣不足';
        refresh();
      };
      return `<button class="alt" id="ws_${d.id}">${d.name}（${d.cost} 金，週入約 ${d.income}）</button>`;
    }).join('');
    return `<div class="pick-title">每座城鎮可以開一間作坊</div><div class="row wrap">${list}</div>`;
  }

  private arenaTab(p: PlaceDef, h: Record<string, () => void>): string {
    const w = this.world.save;
    const round = ARENA.rounds[Math.min(w.arenaWins, ARENA.rounds.length - 1)];
    const ready = (w.arenaUntil[p.id] ?? 0) <= dayOf(w);
    h.arena = () => this.act.onArena(p, false);
    h.arenaBet = () => this.act.onArena(p, true);
    return `
      <div class="pick-title">單人比武，部隊唔參加。對手：${round.enemy.map((e) => `${UNITS[e.unit].name} ${e.count}`).join('、')}，約 ${round.level} 級。獎金 ${round.reward} 金。</div>
      <div class="row wrap">
        <button class="go" id="arena" ${ready ? '' : 'disabled'}>報名比武</button>
        <button class="alt" id="arenaBet" ${ready && canAfford(this.roster, ARENA.bet) ? '' : 'disabled'}>下注自己贏 ${ARENA.bet} 金</button>
      </div>
      ${ready ? '' : `<p class="sub">呢度第 ${w.arenaUntil[p.id]} 日先有下一場。</p>`}`;
  }

  village(p: PlaceDef) {
    const refresh = () => this.village(p);
    const w = this.world.save;
    const r = this.roster;
    const burned = (w.burnedUntil[p.id] ?? 0) > dayOf(w);
    const feared = w.pol.justice <= HONOR.noRecruitAt;
    const ready = !burned && !feared && (w.recruitedUntil[p.id] ?? 0) <= dayOf(w);
    const { cost, count, refreshDays } = SHOP.villageRecruit;
    const label = burned ? `村莊被燒，第 ${w.burnedUntil[p.id]} 日先恢復` : feared ? '村民怕你，唔肯入伍' : ready ? '' : `第 ${w.recruitedUntil[p.id]} 日再嚟`;
    const pol = this.world.politics;
    const handlers: Record<string, () => void> = {};
    for (const [k] of VILLAGE_TABS) {
      handlers[`v_${k}`] = () => {
        this.villageTab = k;
        refresh();
      };
    }
    const tabs = `<div class="tabs center">${VILLAGE_TABS.map(([k, v]) => `<button class="tab ${k === this.villageTab ? 'on' : ''}" id="v_${k}">${v}</button>`).join('')}</div>`;
    const footer = '<div class="row"><button class="alt" id="party">部隊／抽卡</button><button class="go" id="leave">離開</button></div>';
    const foodBtns = this.foodButtons(p.id, handlers, refresh);
    const body = this.villageTab === 'market' ? this.marketTab(p, handlers, refresh) : `
      <div class="row wrap">
        ${foodBtns}
        <button class="alt" id="recruit" ${ready && canAfford(r, cost) ? '' : 'disabled'}>招新兵 ${count} 人（${cost} 金）　${label}</button>
        <button class="alt" id="donate" ${burned || !canAfford(r, HONOR.donate.gold) ? 'disabled' : ''}>救濟村民（${HONOR.donate.gold} 金，正義 +${HONOR.donate.justice}）</button>
        <button class="alt danger" id="rob" ${burned ? 'disabled' : ''}>洗劫村莊</button>
      </div>`;
    this.show(p.name, burned ? '頹垣敗瓦，村民驚魂未定。' : '村民望住你嘅隊伍。', `${tabs}${body}${footer}`, {
      ...handlers,
      donate: () => {
        if (spend(r, HONOR.donate.gold)) pol.atone();
        this.notice = '村民感激你';
        refresh();
      },
      rob: () => {
        r.gold += HONOR.robVillage.gold;
        w.food += HONOR.robVillage.food;
        w.burnedUntil[p.id] = dayOf(w) + NPC_RULES.burnedDays;
        pol.deed('robVillage', pol.ownerOf(p.id));
        this.notice = `搶到 ${HONOR.robVillage.gold} 金、${HONOR.robVillage.food} 糧。正義跌到 ${w.pol.justice}${pol.ownerOf(p.id) ? `，${pol.nameOf(pol.ownerOf(p.id)!)}通緝你` : ''}`;
        refresh();
      },
      recruit: () => {
        if (spend(r, cost)) {
          for (let i = 0; i < count; i++) addSoldier(r, currentScenario().levy);
          w.recruitedUntil[p.id] = dayOf(w) + refreshDays;
          this.notice = `招咗 ${count} 個新兵`;
        }
        refresh();
      },
      party: this.act.onParty,
      leave: this.act.onLeave,
    });
  }

  /** 領地：城鎮同城堡共用嘅勢力區 */
  private fiefActions(p: PlaceDef, h: Record<string, () => void>): string {
    const pol = this.world.politics;
    const owner = pol.ownerOf(p.id);
    if (!owner) return '';
    if (owner === PLAYER) {
      const t = pol.s.threats.find((x) => x.place === p.id);
      if (!t && p.kind === 'lair') {
        const { cost, count } = HONOR.banditRecruit;
        h.lairRecruit = () => {
          if (spend(this.roster, cost)) for (let i = 0; i < count; i++) addSoldier(this.roster, 'footman');
          this.notice = `招咗 ${count} 個嘍囉`;
          this.site(p);
        };
        return `<div class="pick-title">呢度係你嘅山寨，佔地為王，每週收保護費。</div>
          <div class="row"><button class="go" id="lairRecruit">招嘍囉 ${count} 人（${cost} 金）</button></div>`;
      }
      if (!t) return '<div class="pick-title">呢度係你嘅領地，每週收稅。</div>';
      h.defend = () => this.act.onDefend(p, t.by);
      return `<div class="pick-title">${pol.nameOf(t.by)}圍攻緊呢度，第 ${t.deadline} 日前要解圍！</div>
        <div class="row"><button class="go" id="defend">保衛領地</button></div>`;
    }
    const g = pol.garrisonOf(p)!;
    const line = `<div class="pick-title">屬於${pol.nameOf(owner)}（好感 ${pol.relation(owner)}）・守軍 ${armySize(g.army)} 人，約 ${g.level} 級・形勢：${strengthText(rosterPower(this.roster), armyPower(g.army, g.level))}</div>`;
    if (pol.hostile(owner)) {
      h.siege = () => this.siege(p, 0);
      return `${line}<div class="row"><button class="go" id="siege">圍城</button></div>`;
    }
    if (pol.s.rank === 'free' || pol.s.rank === 'king') {
      h.war = () => {
        pol.declareWar(owner);
        this.notice = `已向${pol.nameOf(owner)}宣戰`;
        this.site(p);
      };
      return `${line}<div class="row"><button class="alt" id="war">宣戰</button></div>`;
    }
    return line;
  }

  /** 圍城：紮營造雲梯，缺口愈多愈易攻 */
  siege(p: PlaceDef, built: number) {
    const breaches = Math.min(SIEGE.maxBreaches, SIEGE.baseBreaches + built);
    const g = this.world.politics.garrisonOf(p)!;
    this.show(`圍攻 ${p.name}`, '紮營打造攻城器械，每日耗糧；城牆缺口愈多，守軍愈難堵。', `
      <div class="pick-title">守軍 ${armySize(g.army)} 人・已有 ${breaches} 個突破口（最多 ${SIEGE.maxBreaches}）</div>
      <div class="row">
        <button class="alt" id="camp" ${breaches >= SIEGE.maxBreaches ? 'disabled' : ''}>紮營一日</button>
        <button class="go" id="assault">強攻</button>
        <button class="alt" id="leave">解圍</button>
      </div>`, {
      camp: () => {
        this.world.rest();
        this.siege(p, built + SIEGE.perDay);
      },
      assault: () => this.act.onSiege(p, breaches),
      leave: this.act.onLeave,
    });
  }

  site(p: PlaceDef) {
    const w = this.world.save;
    if (this.world.politics.ownerOf(p.id)) {
      const h: Record<string, () => void> = { party: this.act.onParty, leave: this.act.onLeave };
      const body = this.fiefActions(p, h);
      this.show(p.name, p.desc ?? '', `${body}
        <div class="row"><button class="alt" id="party">部隊／抽卡</button><button class="alt" id="leave">離開</button></div>`, h);
      return;
    }
    const garrison = p.garrison!;
    const level = p.garrisonLevel ?? 1;
    if (!isOpen(w, p)) {
      this.show(p.name, `已經清咗，第 ${w.clearedUntil[p.id]} 日守軍先會重整。`, `
        <div class="row"><button class="go" id="leave">離開</button></div>`, { leave: this.act.onLeave });
      return;
    }
    const pool = p.pool ? POOLS[p.pool] : null;
    const art = ARTIFACTS.find((a) => a.id === p.artifact && !this.roster.hero.artifacts.includes(a.id));
    this.show(p.name, p.desc ?? '', `
      <div class="pick-title">守軍 ${armySize(garrison)} 人，約 ${level} 級：${garrison.map((g) => `${UNITS[g.unit].name} ${g.count}`).join('、')}</div>
      <div class="pick-title">形勢：${strengthText(rosterPower(this.roster), armyPower(garrison, level))}</div>
      ${pool ? `<div class="pick-title">攻陷獎勵：${pool.ticket} ×${p.tickets}、${p.gold} 金</div>` : ''}
      ${art ? `<div class="pick-title">神器：${art.name}（${art.desc}）</div>` : ''}
      <div class="row"><button class="go" id="attack">進攻</button><button class="alt" id="party">部隊／抽卡</button><button class="alt" id="leave">撤離</button></div>`, {
      attack: () => this.act.onAttack(p),
      party: this.act.onParty,
      leave: this.act.onLeave,
    });
  }

  bandit(b: BanditParty) {
    const r = this.roster;
    const army = banditArmy(b);
    const toll = armySize(army) * BANDIT.tollPerEnemy;
    const chance = Math.round(this.world.escapeChance() * 100);
    this.show('遭遇山賊', `${b.size} 個山賊攔住去路，約 ${b.level} 級。`, `
      <div class="pick-title">形勢：${strengthText(rosterPower(r), armyPower(army, b.level))}</div>
      <div class="row wrap">
        <button class="go" id="fight">開打</button>
        <button class="alt" id="auto">自動結算</button>
        <button class="alt" id="pay" ${canAfford(r, toll) ? '' : 'disabled'}>買路錢 ${toll} 金</button>
        <button class="alt" id="run">逃跑（${chance}%）</button>
      </div>`, {
      fight: () => this.act.onBandit(b, false),
      auto: () => this.act.onBandit(b, true),
      pay: () => {
        spend(r, toll);
        this.world.removeBandit(b);
        this.act.onEscaped();
      },
      run: () => {
        if (Math.random() * 100 < chance) {
          this.world.escape(b);
          this.act.onEscaped();
        } else {
          this.notice = '走唔甩！';
          this.bandit(b);
          document.getElementById('run')?.setAttribute('disabled', '');
        }
      },
    });
  }

  /** 突發事件 */
  story(e: StoryEvent) {
    const h: Record<string, () => void> = {};
    const btns = e.choices.map((c, i) => {
      h[`c${i}`] = () => {
        const text = applyChoice(this.world, c.effect);
        this.show(e.title, text, '<div class="row"><button class="go" id="bye">繼續</button></div>', { bye: this.act.onLeave });
      };
      return `<button class="alt" id="c${i}">${c.label}</button>`;
    }).join('');
    this.show(e.title, e.text, `<div class="row wrap">${btns}</div>`, h);
  }

  /** 同 NPC 傾偈：每種都有唔同用處 */
  npc(n: Npc) {
    const refresh = () => this.npc(n);
    const r = this.roster;
    const w = this.world.save;
    const name = NPC[n.kind].name;
    const h: Record<string, () => void> = { bye: this.act.onLeave };
    let body = '';
    const rumor = () => {
      if (!spend(r, NPC_RULES.rumorCost)) {
        this.notice = '金幣不足';
        refresh();
        return;
      }
      const hidden = PLACES.find((p) => p.hidden && !w.discovered.includes(p.id));
      if (hidden) {
        w.discovered.push(hidden.id);
        this.notice = `聽講${hidden.name}就喺地圖上嗰度，已標記。`;
      } else {
        const news = w.log[0];
        this.notice = news ? `最近消息：${news}` : '呢排都幾太平。';
      }
      refresh();
    };
    switch (n.kind) {
      case 'caravan': {
        const cost = NPC_RULES.caravanFood * NPC_RULES.caravanFoodPrice;
        h.deal = () => {
          if (spend(r, cost)) {
            w.food += NPC_RULES.caravanFood;
            this.notice = `向商隊買咗 ${NPC_RULES.caravanFood} 糧`;
          } else this.notice = '金幣不足';
          refresh();
        };
        h.rumor = rumor;
        h.rob = () => {
          r.gold += HONOR.robCaravan.gold;
          this.world.politics.deed('robCaravan', this.world.politics.ownerOf(n.home));
          this.world.npcs.remove(n);
          this.act.onLeave();
        };
        body = `<button class="alt" id="deal">買糧 ${NPC_RULES.caravanFood}（${cost} 金）</button><button class="alt" id="rumor">打聽消息（${NPC_RULES.rumorCost} 金）</button><button class="alt danger" id="rob">打劫</button>`;
        break;
      }
      case 'farmer':
        h.rumor = rumor;
        h.rob = () => {
          r.gold += HONOR.robFarmer.gold;
          w.food += HONOR.robFarmer.food;
          this.world.politics.deed('robFarmer', this.world.politics.ownerOf(n.home));
          this.world.npcs.remove(n);
          this.act.onLeave();
        };
        body = `<button class="alt" id="rumor">打聽消息（${NPC_RULES.rumorCost} 金）</button><button class="alt danger" id="rob">搶農民</button>`;
        break;
      case 'messenger':
        h.rumor = rumor;
        body = `<button class="alt" id="rumor">打聽消息（${NPC_RULES.rumorCost} 金）</button>`;
        break;
      case 'hunter':
        h.deal = () => {
          if (spend(r, NPC_RULES.hunterPrice)) {
            w.food += NPC_RULES.hunterFood;
            this.notice = `買咗 ${NPC_RULES.hunterFood} 份獵物`;
          } else this.notice = '金幣不足';
          refresh();
        };
        body = `<button class="alt" id="deal">買獵物 ${NPC_RULES.hunterFood} 糧（${NPC_RULES.hunterPrice} 金）</button>`;
        break;
      case 'patrol':
        h.rumor = rumor;
        body = `<button class="alt" id="rumor">問隊長消息（${NPC_RULES.rumorCost} 金）</button>`;
        break;
      case 'dragon':
        h.fight = () => this.act.onRaider(n);
        body = `<p class="sub">討伐巨龍可以得到龍骨刃同大量金幣。</p><button class="go" id="fight">討伐</button>`;
        break;
      case 'raider':
        h.fight = () => this.act.onRaider(n);
        body = `<p class="sub">形勢：${strengthText(rosterPower(r), armyPower(raiderArmy(n), NPC_RULES.raiderLevel))}。截住佢哋可以保住村莊，獎金 ${NPC_RULES.raiderGold} 金。</p>
          <button class="go" id="fight">截擊</button>`;
        break;
    }
    this.show(`${name}（${n.size} 人）`, n.job, `<div class="row wrap">${body}<button class="alt" id="bye">離開</button></div>`, h);
  }
}
