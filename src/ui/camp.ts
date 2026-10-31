import { HORSES, type HorseDef } from '../data/horses';
import { GACHA, LEVEL, POOLS, POOL_ORDER, RARITY, RARITY_ORDER, CAMPAIGN, type PoolId } from '../data/gacha';
import { RACES } from '../data/races';
import { ROLE_LABEL, UNITS } from '../data/units';
import { LOADOUT_SIZE, PLAYER_ARSENAL, WEAPONS } from '../data/weapons';
import {
  applyCheat, deployment, draw, foodOf, partyFood, partyWage, raceOf, racePenalty, rarityOf, roleCounts,
  sortedSoldiers, wageOf, xpToNext, type DrawResult, type Roster, type Soldier,
} from '../core/roster';
import type { Hud } from './hud';

type Tab = 'party' | 'roster' | 'gacha';

const PAGE_SIZE = 12;
const TABS: [Tab, string][] = [['party', '部隊'], ['roster', '軍營'], ['gacha', '抽卡']];

export interface CampChoice {
  horse: HorseDef;
  loadout: string[];
}

/** 部隊畫面：裝備、士兵、抽卡，全部一屏 */
export class Camp {
  private tab: Tab = 'party';
  private page = 0;
  private pool: PoolId = 'human';
  private lastDraw: DrawResult[] = [];
  private notice = '';
  private onBack: () => void = () => {};

  constructor(private hud: Hud, private roster: Roster, private choice: CampChoice) {}

  setRoster(r: Roster) {
    this.roster = r;
    this.lastDraw = [];
  }

  show(onBack: () => void, tab?: Tab) {
    this.onBack = onBack;
    if (tab) this.tab = tab;
    this.render();
  }

  private render() {
    const r = this.roster;
    const body = this.tab === 'party' ? this.partyHtml() : this.tab === 'roster' ? this.rosterHtml() : this.gachaHtml();
    this.hud.showScreen(`
      <div class="card camp">
        <div class="camp-head">
          <button class="alt small" id="back">返回</button>
          <div class="tabs">${TABS.map(([k, v]) => `<button class="tab ${k === this.tab ? 'on' : ''}" data-tab="${k}">${v}</button>`).join('')}</div>
          <div class="gold">${r.infiniteGold ? '∞' : r.gold} 金</div>
        </div>
        ${body}
      </div>`);
    this.bind();
  }

  private $$(sel: string, fn: (el: HTMLElement) => void) {
    document.querySelectorAll<HTMLElement>(`#screen ${sel}`).forEach(fn);
  }

  private bind() {
    this.$$('#back', (el) => { el.onclick = this.onBack; });
    this.$$('.tab', (el) => {
      el.onclick = () => {
        this.tab = el.dataset.tab as Tab;
        this.render();
      };
    });
    this.$$('.horse', (el) => {
      el.onclick = () => {
        this.choice.horse = HORSES.find((h) => h.id === el.dataset.id)!;
        this.render();
      };
    });
    this.$$('.wp', (el) => {
      el.onclick = () => {
        const id = el.dataset.id!;
        const picks = this.choice.loadout;
        const next = picks.includes(id) ? picks.filter((p) => p !== id) : [...picks, id].slice(-LOADOUT_SIZE);
        if (next.length) this.choice.loadout = next;
        this.render();
      };
    });
    this.$$('.sold', (el) => {
      el.onclick = () => {
        const s = this.roster.soldiers.find((x) => x.id === Number(el.dataset.id));
        if (s) s.benched = !s.benched;
        this.render();
      };
    });
    this.$$('.pager', (el) => {
      el.onclick = () => {
        this.page += Number(el.dataset.step);
        this.render();
      };
    });
    this.$$('.pool', (el) => {
      el.onclick = () => {
        this.pool = el.dataset.pool as PoolId;
        this.lastDraw = [];
        this.render();
      };
    });
    this.$$('.draw', (el) => {
      el.onclick = () => {
        const res = draw(this.roster, this.pool, Number(el.dataset.n) as 1 | 10);
        if (res) this.lastDraw = res;
        this.render();
      };
    });
    this.$$('#cheat', (el) => {
      el.onclick = () => {
        const input = document.querySelector<HTMLInputElement>('#screen #code');
        this.notice = applyCheat(this.roster, input?.value ?? '') ?? '密令唔啱';
        this.render();
      };
    });
  }

  private partyHtml(): string {
    const { horse, loadout } = this.choice;
    const r = this.roster;
    const list = deployment(r);
    const c = roleCounts(list);
    const penalty = racePenalty(r);
    return `
      <div class="pick-title">可出戰 ${list.length}／${CAMPAIGN.deployMax} 人：${ROLE_LABEL.infantry} ${c.infantry}・${ROLE_LABEL.archer} ${c.archer}・${ROLE_LABEL.cavalry} ${c.cavalry}</div>
      <div class="pick-title">每日食糧 ${partyFood(r).toFixed(1)}・每週工資 ${partyWage(r)} 金${penalty ? `・混種族士氣 −${penalty}` : ''}</div>
      <div class="pick-title">坐騎</div>
      <div class="horses">
        ${HORSES.filter((h) => !h.troopOnly).map((h) => `<button class="horse ${h.id === horse.id ? 'on' : ''}" data-id="${h.id}"><b>${h.name}</b><small>${h.desc}</small></button>`).join('')}
      </div>
      <div class="pick-title">武器（揀 ${LOADOUT_SIZE} 件，已揀 ${loadout.length}）</div>
      <div class="weapons">
        ${PLAYER_ARSENAL.map((id) => `<button class="wp ${loadout.includes(id) ? 'on' : ''}" data-id="${id}">${WEAPONS[id].name}</button>`).join('')}
      </div>
      ${this.hud.controlsHtml()}
      <div class="cheat">
        <input id="code" placeholder="密令" maxlength="20" autocomplete="off" />
        <button class="alt small" id="cheat">輸入</button>
        <span>${this.notice}</span>
      </div>`;
  }

  private soldierCard(s: Soldier): string {
    const def = UNITS[s.unit];
    const rarity = RARITY[rarityOf(def)];
    const need = xpToNext(s.level);
    const pct = s.level >= LEVEL.max ? 100 : Math.round((s.xp / need) * 100);
    const state = s.hurtDays > 0 ? `・傷 ${s.hurtDays} 日` : s.benched ? '・候補' : '';
    return `<button class="sold ${s.benched || s.hurtDays > 0 ? 'bench' : ''}" data-id="${s.id}" style="--r:${rarity.color}">
      <b>${def.name}</b>
      <small>Lv${s.level}・${RACES[raceOf(def)].name}・殺 ${s.kills}${state}</small>
      <small>糧 ${foodOf(def).toFixed(2)}・餉 ${wageOf(def)}</small>
      <i class="xp"><u style="width:${pct}%"></u></i>
    </button>`;
  }

  private rosterHtml(): string {
    const all = sortedSoldiers(this.roster);
    const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    this.page = Math.min(Math.max(0, this.page), pages - 1);
    const items = all.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE);
    return `
      <div class="pick-title">全軍 ${all.length} 人，勝 ${this.roster.wins} 場。撳士兵切換出戰／候補；每個兵種食量同工資都唔同。</div>
      <div class="soldiers">${items.map((s) => this.soldierCard(s)).join('')}</div>
      <div class="row pagerow">
        <button class="alt pager" data-step="-1" ${this.page ? '' : 'disabled'}>上一頁</button>
        <span>${this.page + 1}／${pages}</span>
        <button class="alt pager" data-step="1" ${this.page < pages - 1 ? '' : 'disabled'}>下一頁</button>
      </div>`;
  }

  private drawCard(d: DrawResult, i: number): string {
    const rarity = RARITY[d.rarity];
    return `<div class="dcard ${d.rarity}" style="--r:${rarity.color};--d:${i * 70}ms">
      <small>${rarity.name}</small>
      <b>${d.unit.name}</b>
      <em>${d.refund ? `重複 +${d.refund} 金` : d.unit.desc ?? RACES[raceOf(d.unit)].name}</em>
    </div>`;
  }

  private gachaHtml(): string {
    const r = this.roster;
    const pool = POOLS[this.pool];
    const rates = RARITY_ORDER.map((k) => `<span style="color:${RARITY[k].color}">${RARITY[k].name} ${(RARITY[k].rate * 100).toFixed(0)}%</span>`).join('');
    const have = r.tickets[this.pool];
    return `
      <div class="pools">${POOL_ORDER.map((p) => `<button class="pool ${p === this.pool ? 'on' : ''}" data-pool="${p}"><b>${POOLS[p].name}</b><small>${POOLS[p].ticket} ${r.tickets[p]}</small></button>`).join('')}</div>
      <div class="rates">${rates}</div>
      <div class="pick-title">${pool.ticket}來源：${pool.source}。距離英雄保底仲有 ${GACHA.pity - r.pity[this.pool]} 抽，十連保底至少一張精良，重複英雄退 ${GACHA.duplicateHeroRefund} 金。</div>
      <div class="draws">${this.lastDraw.length ? this.lastDraw.map((d, i) => this.drawCard(d, i)).join('') : '<p class="sub">攻城、闖地下城同迷宮先攞到招募令。</p>'}</div>
      <div class="row">
        <button class="go draw" data-n="1" ${have < 1 ? 'disabled' : ''}>單抽（1 張）</button>
        <button class="go draw" data-n="10" ${have < GACHA.tenTickets ? 'disabled' : ''}>十連（${GACHA.tenTickets} 張）</button>
      </div>`;
  }
}
