import { GACHA, POOLS } from '../data/gacha';
import { UNITS, type UnitDef } from '../data/units';
import { SHOP, BANDIT, type PlaceDef } from '../data/world';
import {
  addSoldier, armyPower, armySize, canAfford, rosterPower, spend, wageOf, type Roster,
} from '../core/roster';
import { banditArmy, dayOf, isOpen, type BanditParty, type World } from '../worldmap/world';
import type { Hud } from './hud';

const MERC_POOL = ['footman', 'pikeman', 'archer', 'axeman', 'crossbowman', 'horseman', 'lancer'];

export interface PlaceActions {
  onLeave: () => void;
  onParty: () => void;
  onAttack: (p: PlaceDef) => void;
  onBandit: (b: BanditParty, auto: boolean) => void;
  onEscaped: () => void;
}

function strengthText(mine: number, theirs: number): string {
  const ratio = mine / Math.max(theirs, 0.01);
  if (ratio > 1.6) return '優勢明顯';
  if (ratio > 1.1) return '略佔上風';
  if (ratio > 0.8) return '勢均力敵';
  if (ratio > 0.5) return '形勢不利';
  return '以卵擊石';
}

/** 城鎮、村莊、征服地點同遭遇畫面 */
export class PlaceScreens {
  private notice = '';

  constructor(private hud: Hud, private world: World, private roster: Roster, private act: PlaceActions) {}

  bind(world: World, roster: Roster) {
    this.world = world;
    this.roster = roster;
  }

  private show(title: string, desc: string, body: string, handlers: Record<string, () => void>) {
    this.hud.showScreen(`
      <div class="card place">
        <h2>${title}</h2>
        <p class="sub">${desc}</p>
        <div class="gold">${this.roster.infiniteGold ? '∞' : this.roster.gold} 金・糧 ${Math.floor(this.world.save.food)}・兵 ${this.roster.soldiers.length}</div>
        ${this.notice ? `<p class="notice">${this.notice}</p>` : ''}
        ${body}
      </div>`);
    this.notice = '';
    for (const [id, fn] of Object.entries(handlers)) {
      const el = document.getElementById(id);
      if (el) el.onclick = fn;
    }
  }

  private buyFood(refresh: () => void) {
    const cost = SHOP.foodPack * SHOP.foodPrice;
    if (spend(this.roster, cost)) {
      this.world.save.food += SHOP.foodPack;
      this.notice = `買咗 ${SHOP.foodPack} 糧`;
    } else this.notice = '金幣不足';
    refresh();
  }

  town(p: PlaceDef) {
    const refresh = () => this.town(p);
    const r = this.roster;
    const offers = this.mercOffers(p);
    const buttons = offers.map((d, i) => {
      const price = d.tier * SHOP.mercPerTier;
      return `<button class="alt" id="merc${i}" ${canAfford(r, price) ? '' : 'disabled'}>${d.name}（${price} 金・週餉 ${wageOf(d)}）</button>`;
    }).join('');
    const handlers: Record<string, () => void> = {
      food: () => this.buyFood(refresh),
      ticket: () => {
        if (spend(r, GACHA.ticketPrice)) {
          r.tickets.human++;
          this.notice = `買咗一張${POOLS.human.ticket}`;
        } else this.notice = '金幣不足';
        refresh();
      },
      rest: () => {
        this.world.rest();
        this.notice = '休息咗一日，傷兵恢復緊';
        refresh();
      },
      party: this.act.onParty,
      leave: this.act.onLeave,
    };
    offers.forEach((d, i) => {
      handlers[`merc${i}`] = () => {
        if (spend(r, d.tier * SHOP.mercPerTier)) {
          addSoldier(r, d.id);
          this.notice = `招咗 ${d.name}`;
        }
        refresh();
      };
    });
    this.show(p.name, p.desc ?? '', `
      <div class="pick-title">市集</div>
      <div class="row wrap">
        <button class="alt" id="food">買糧 ${SHOP.foodPack}（${SHOP.foodPack * SHOP.foodPrice} 金）</button>
        <button class="alt" id="ticket">${POOLS.human.ticket}（${GACHA.ticketPrice} 金）</button>
      </div>
      <div class="pick-title">酒館傭兵</div>
      <div class="row wrap">${buttons}</div>
      <div class="row">
        <button class="alt" id="rest">休息一日</button>
        <button class="alt" id="party">部隊／抽卡</button>
        <button class="go" id="leave">離開</button>
      </div>`, handlers);
  }

  private mercOffers(p: PlaceDef): UnitDef[] {
    const slot = Math.floor(dayOf(this.world.save) / SHOP.mercRefreshDays) + p.x;
    return Array.from({ length: SHOP.mercOffers }, (_, i) => UNITS[MERC_POOL[(slot + i * 2) % MERC_POOL.length]]);
  }

  village(p: PlaceDef) {
    const refresh = () => this.village(p);
    const w = this.world.save;
    const r = this.roster;
    const ready = (w.recruitedUntil[p.id] ?? 0) <= dayOf(w);
    const { cost, count, refreshDays } = SHOP.villageRecruit;
    this.show(p.name, '村民望住你嘅隊伍。', `
      <div class="row wrap">
        <button class="alt" id="food">買糧 ${SHOP.foodPack}（${SHOP.foodPack * SHOP.foodPrice} 金）</button>
        <button class="alt" id="recruit" ${ready && canAfford(r, cost) ? '' : 'disabled'}>招新兵 ${count} 人（${cost} 金）${ready ? '' : `　第 ${w.recruitedUntil[p.id]} 日再嚟`}</button>
      </div>
      <div class="row"><button class="alt" id="party">部隊／抽卡</button><button class="go" id="leave">離開</button></div>`, {
      food: () => this.buyFood(refresh),
      recruit: () => {
        if (spend(r, cost)) {
          for (let i = 0; i < count; i++) addSoldier(r, 'footman');
          w.recruitedUntil[p.id] = dayOf(w) + refreshDays;
          this.notice = `招咗 ${count} 個新兵`;
        }
        refresh();
      },
      party: this.act.onParty,
      leave: this.act.onLeave,
    });
  }

  site(p: PlaceDef) {
    const w = this.world.save;
    const garrison = p.garrison!;
    const level = p.garrisonLevel ?? 1;
    if (!isOpen(w, p)) {
      this.show(p.name, `已經清咗，第 ${w.clearedUntil[p.id]} 日守軍先會重整。`, `
        <div class="row"><button class="go" id="leave">離開</button></div>`, { leave: this.act.onLeave });
      return;
    }
    const pool = p.pool ? POOLS[p.pool] : null;
    this.show(p.name, p.desc ?? '', `
      <div class="pick-title">守軍 ${armySize(garrison)} 人，約 ${level} 級：${garrison.map((g) => `${UNITS[g.unit].name} ${g.count}`).join('、')}</div>
      <div class="pick-title">形勢：${strengthText(rosterPower(this.roster), armyPower(garrison, level))}</div>
      ${pool ? `<div class="pick-title">攻陷獎勵：${pool.ticket} ×${p.tickets}、${p.gold} 金</div>` : ''}
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
}
