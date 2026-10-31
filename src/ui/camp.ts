import { HORSES, type HorseDef } from '../data/horses';
import { CAMPAIGN, GACHA, LEVEL, RARITY, RARITY_ORDER } from '../data/gacha';
import { ROLE_LABEL, UNITS } from '../data/units';
import { LOADOUT_SIZE, PLAYER_ARSENAL, WEAPONS } from '../data/weapons';
import {
  deployment, draw, enemyLevel, newRoster, rarityOf, roleCounts, saveRoster, sortedSoldiers, xpToNext,
  type DrawResult, type Roster, type Soldier,
} from '../core/roster';
import type { Hud } from './hud';

type Tab = 'deploy' | 'roster' | 'gacha';

const PAGE_SIZE = 12;
const TABS: [Tab, string][] = [['deploy', '出戰'], ['roster', '軍營'], ['gacha', '抽卡']];

export interface CampChoice {
  horse: HorseDef;
  loadout: string[];
}

/** 軍營畫面：揀裝備、睇士兵、抽卡，全部一屏 */
export class Camp {
  private tab: Tab = 'deploy';
  private page = 0;
  private lastDraw: DrawResult[] = [];
  private resetArmed = false;

  constructor(
    private hud: Hud,
    private roster: Roster,
    private choice: CampChoice,
    private onStart: () => void,
    private onReset: (r: Roster) => void,
  ) {}

  show(tab?: Tab) {
    if (tab) this.tab = tab;
    this.hud.hideHud();
    this.render();
  }

  private render() {
    const body = this.tab === 'deploy' ? this.deployHtml() : this.tab === 'roster' ? this.rosterHtml() : this.gachaHtml();
    this.hud.showScreen(`
      <div class="card camp">
        <div class="camp-head">
          <h2>鐵騎風雲</h2>
          <div class="tabs">${TABS.map(([k, v]) => `<button class="tab ${k === this.tab ? 'on' : ''}" data-tab="${k}">${v}</button>`).join('')}</div>
          <div class="gold">${this.roster.gold} 金</div>
        </div>
        ${body}
      </div>`);
    this.bind();
  }

  private $$(sel: string, fn: (el: HTMLElement) => void) {
    document.querySelectorAll<HTMLElement>(`#screen ${sel}`).forEach(fn);
  }

  private bind() {
    this.$$('.tab', (el) => { el.onclick = () => this.show(el.dataset.tab as Tab); });
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
        this.choice.loadout = picks.includes(id) ? picks.filter((p) => p !== id) : [...picks, id].slice(-LOADOUT_SIZE);
        this.render();
      };
    });
    this.$$('#go', (el) => { el.onclick = this.onStart; });
    this.$$('.sold', (el) => {
      el.onclick = () => {
        const s = this.roster.soldiers.find((x) => x.id === Number(el.dataset.id));
        if (s) s.benched = !s.benched;
        saveRoster(this.roster);
        this.render();
      };
    });
    this.$$('.pager', (el) => {
      el.onclick = () => {
        this.page += Number(el.dataset.step);
        this.render();
      };
    });
    this.$$('.draw', (el) => {
      el.onclick = () => {
        const res = draw(this.roster, Number(el.dataset.n) as 1 | 10);
        if (res) this.lastDraw = res;
        this.render();
      };
    });
    this.$$('#reset', (el) => {
      el.onclick = () => {
        if (!this.resetArmed) {
          this.resetArmed = true;
          this.render();
          return;
        }
        this.resetArmed = false;
        this.roster = newRoster();
        saveRoster(this.roster);
        this.lastDraw = [];
        this.onReset(this.roster);
        this.render();
      };
    });
  }

  private deployHtml(): string {
    const { horse, loadout } = this.choice;
    const list = deployment(this.roster);
    const c = roleCounts(list);
    return `
      <div class="pick-title">出戰 ${list.length}／${CAMPAIGN.deployMax} 人：${ROLE_LABEL.infantry} ${c.infantry}・${ROLE_LABEL.archer} ${c.archer}・${ROLE_LABEL.cavalry} ${c.cavalry}　敵軍約 ${enemyLevel(this.roster)} 級</div>
      <div class="pick-title">坐騎</div>
      <div class="horses">
        ${HORSES.map((h) => `<button class="horse ${h.id === horse.id ? 'on' : ''}" data-id="${h.id}"><b>${h.name}</b><small>${h.desc}</small></button>`).join('')}
      </div>
      <div class="pick-title">武器（揀 ${LOADOUT_SIZE} 件，已揀 ${loadout.length}）</div>
      <div class="weapons">
        ${PLAYER_ARSENAL.map((id) => `<button class="wp ${loadout.includes(id) ? 'on' : ''}" data-id="${id}">${WEAPONS[id].name}</button>`).join('')}
      </div>
      ${this.hud.controlsHtml()}
      <button class="go" id="go" ${loadout.length && list.length ? '' : 'disabled'}>開始戰鬥</button>`;
  }

  private soldierCard(s: Soldier): string {
    const def = UNITS[s.unit];
    const rarity = RARITY[rarityOf(def)];
    const need = xpToNext(s.level);
    const pct = s.level >= LEVEL.max ? 100 : Math.round((s.xp / need) * 100);
    return `<button class="sold ${s.benched ? 'bench' : ''}" data-id="${s.id}" style="--r:${rarity.color}">
      <b>${def.name}</b>
      <small>Lv${s.level}・${ROLE_LABEL[def.role]}・殺 ${s.kills}${s.benched ? '・候補' : ''}</small>
      <i class="xp"><u style="width:${pct}%"></u></i>
    </button>`;
  }

  private rosterHtml(): string {
    const all = sortedSoldiers(this.roster);
    const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    this.page = Math.min(Math.max(0, this.page), pages - 1);
    const items = all.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE);
    return `
      <div class="pick-title">全軍 ${all.length} 人，勝 ${this.roster.wins} 場。撳士兵切換出戰／候補；出戰超過 ${CAMPAIGN.deployMax} 人時，稀有同高等級優先。</div>
      <div class="soldiers">${items.map((s) => this.soldierCard(s)).join('')}</div>
      <div class="row pagerow">
        <button class="alt pager" data-step="-1" ${this.page ? '' : 'disabled'}>上一頁</button>
        <span>${this.page + 1}／${pages}</span>
        <button class="alt pager" data-step="1" ${this.page < pages - 1 ? '' : 'disabled'}>下一頁</button>
        <button class="alt" id="reset">${this.resetArmed ? '再撳一次確認清除' : '清除存檔'}</button>
      </div>`;
  }

  private drawCard(d: DrawResult, i: number): string {
    const rarity = RARITY[d.rarity];
    return `<div class="dcard ${d.rarity}" style="--r:${rarity.color};--d:${i * 70}ms">
      <small>${rarity.name}</small>
      <b>${d.unit.name}</b>
      <em>${d.refund ? `重複 +${d.refund} 金` : d.unit.desc ?? ROLE_LABEL[d.unit.role]}</em>
    </div>`;
  }

  private gachaHtml(): string {
    const r = this.roster;
    const rates = RARITY_ORDER.map((k) => `<span style="color:${RARITY[k].color}">${RARITY[k].name} ${(RARITY[k].rate * 100).toFixed(0)}%</span>`).join('');
    return `
      <div class="rates">${rates}</div>
      <div class="pick-title">距離英雄保底仲有 ${GACHA.pity - r.pity} 抽。十連保底至少一張精良。重複英雄退 ${GACHA.duplicateHeroRefund} 金。金幣只靠打仗賺。</div>
      <div class="draws">${this.lastDraw.length ? this.lastDraw.map((d, i) => this.drawCard(d, i)).join('') : '<p class="sub">招募令已備好，揀單抽或者十連。</p>'}</div>
      <div class="row">
        <button class="go draw" data-n="1" ${r.gold < GACHA.cost ? 'disabled' : ''}>單抽 ${GACHA.cost} 金</button>
        <button class="go draw" data-n="10" ${r.gold < GACHA.tenCost ? 'disabled' : ''}>十連 ${GACHA.tenCost} 金</button>
      </div>`;
  }
}
