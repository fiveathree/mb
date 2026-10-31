import { ATTR_DESC, ATTR_NAME, EXPEDITION, EXPEDITION_POST, HERO, SKILLS, SKILL_ORDER, type AttrId, type SkillId } from '../data/economy';
import { HORSES } from '../data/horses';
import { GACHA, LEVEL, POOLS, POOL_ORDER, RARITY, RARITY_ORDER, CAMPAIGN, type TicketPool } from '../data/gacha';
import { RACES } from '../data/races';
import { ROLE_LABEL, UNITS } from '../data/units';
import { LOADOUT_SIZE, WEAPONS } from '../data/weapons';
import { armorValue, heroXpNeed, partyLimit, playerDef, skillOf } from '../core/hero';
import {
  applyCheat, deployment, draw, foodOf, partyFood, partyWage, promote, promotions, raceOf, racePenalty, rarityOf, roleCounts,
  sortedSoldiers, wageOf, xpToNext, type DrawResult, type Roster, type Soldier,
} from '../core/roster';
import { FACTIONS, POLITICS } from '../data/factions';
import { spend } from '../core/roster';
import { JUSTICE_TIERS, LOYALTY_TIERS } from '../data/honor';
import { PLAYER, RANK_NAME } from '../politics/politics';
import type { World } from '../worldmap/world';
import { GearPanel } from './gear';
import type { Hud } from './hud';

type Tab = 'party' | 'gear' | 'hero' | 'roster' | 'gacha' | 'realm';

const PAGE_SIZE = 12;
const TABS: [Tab, string][] = [['party', '部隊'], ['gear', '裝備'], ['hero', '角色'], ['roster', '軍營'], ['gacha', '抽卡'], ['realm', '勢力']];

/** 部隊畫面：裝備、角色、士兵、抽卡，全部一屏 */
export class Camp {
  private tab: Tab = 'party';
  private page = 0;
  private pool: TicketPool = 'human';
  private lastDraw: DrawResult[] = [];
  private notice = '';
  private onBack: () => void = () => {};

  private gear: GearPanel;

  constructor(private hud: Hud, private roster: Roster, private world: World) {
    this.gear = new GearPanel(roster, () => this.render());
  }

  setRoster(r: Roster, world: World) {
    this.roster = r;
    this.world = world;
    this.gear.setRoster(r);
    this.lastDraw = [];
  }

  show(onBack: () => void, tab?: Tab) {
    this.onBack = onBack;
    if (tab) this.tab = tab;
    this.render();
  }

  private render() {
    const r = this.roster;
    const body = {
      party: () => this.partyHtml(), gear: () => this.gear.html(), hero: () => this.heroHtml(), roster: () => this.rosterHtml(), gacha: () => this.gachaHtml(), realm: () => this.realmHtml(),
    }[this.tab]();
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
    const hero = this.roster.hero;
    if (this.tab === 'gear') this.gear.bind();
    this.$$('#back', (el) => { el.onclick = this.onBack; });
    this.$$('.tab', (el) => {
      el.onclick = () => {
        this.tab = el.dataset.tab as Tab;
        this.render();
      };
    });
    this.$$('.horse', (el) => {
      el.onclick = () => {
        hero.horse = el.dataset.id!;
        this.render();
      };
    });
    this.$$('.wp[data-id]', (el) => {
      el.onclick = () => {
        const id = el.dataset.id!;
        const picks = hero.loadout;
        const next = picks.includes(id) ? picks.filter((p) => p !== id) : [...picks, id].slice(-LOADOUT_SIZE);
        if (next.length) hero.loadout = next;
        this.render();
      };
    });
    this.$$('.attr', (el) => {
      el.onclick = () => {
        if (hero.attrPoints > 0) {
          hero.attrPoints--;
          hero.attrs[el.dataset.id as AttrId]++;
        }
        this.render();
      };
    });
    this.$$('.skill', (el) => {
      el.onclick = () => {
        const id = el.dataset.id as SkillId;
        if (hero.skillPoints > 0 && hero.skills[id] < HERO.skillMax) {
          hero.skillPoints--;
          hero.skills[id]++;
        }
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
    this.$$('.promo', (el) => {
      el.onclick = (e) => {
        e.stopPropagation();
        const s = this.roster.soldiers.find((x) => x.id === Number(el.dataset.id));
        if (s && !promote(this.roster, s, el.dataset.to!)) this.notice = '金幣不足';
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
        this.pool = el.dataset.pool as TicketPool;
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
    const pol = this.world.politics;
    const act = (sel: string, fn: (f: string) => void) => this.$$(sel, (el) => {
      el.onclick = () => {
        fn(el.dataset.f!);
        this.render();
      };
    });
    act('.contract', (f) => pol.signContract(f));
    act('.swear', (f) => pol.swear(f));
    act('.peace', (f) => {
      if (spend(this.roster, POLITICS.peaceCost)) pol.makePeace(f);
    });
    act('.gift', (f) => {
      if (spend(this.roster, POLITICS.giftCost)) pol.addRelation(f, POLITICS.giftRelation);
    });
    this.$$('#expedition', (el) => {
      el.onclick = () => {
        this.world.startExpedition();
        this.render();
      };
    });
    this.$$('#ransom', (el) => {
      el.onclick = () => {
        pol.releaseLord(true);
        this.roster.gold += POLITICS.ransomGold;
        this.render();
      };
    });
    this.$$('#freeLord', (el) => {
      el.onclick = () => {
        pol.releaseLord(false);
        this.render();
      };
    });
    this.$$('#crown', (el) => {
      el.onclick = () => {
        const name = document.querySelector<HTMLInputElement>('#screen #kname')?.value.trim() || '鐵騎王國';
        pol.crown(name);
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
    const r = this.roster;
    const hero = r.hero;
    const list = deployment(r);
    const c = roleCounts(list);
    const penalty = racePenalty(r);
    const limit = Math.min(CAMPAIGN.deployMax, partyLimit(hero, r.soldiers));
    const notice = this.notice;
    this.notice = '';
    return `
      <div class="pick-title">可出戰 ${list.length}／${limit} 人：${ROLE_LABEL.infantry} ${c.infantry}・${ROLE_LABEL.archer} ${c.archer}・${ROLE_LABEL.cavalry} ${c.cavalry}</div>
      <div class="pick-title">每日食糧 ${partyFood(r).toFixed(1)}・每週工資 ${partyWage(r)} 金${penalty ? `・混種族士氣 −${penalty}` : ''}</div>
      <div class="pick-title">坐騎</div>
      <div class="horses">
        ${HORSES.filter((h) => hero.horses.includes(h.id)).map((h) => `<button class="horse ${h.id === hero.horse ? 'on' : ''}" data-id="${h.id}"><b>${h.name}</b><small>${h.desc}</small></button>`).join('')}
      </div>
      <div class="pick-title">武器（揀 ${LOADOUT_SIZE} 件，已揀 ${hero.loadout.length}；更多武器喺城鎮鐵匠買）</div>
      <div class="weapons">
        ${hero.weapons.map((id) => `<button class="wp ${hero.loadout.includes(id) ? 'on' : ''}" data-id="${id}">${WEAPONS[id].name}</button>`).join('')}
      </div>
      ${this.hud.controlsHtml()}
      <div class="cheat">
        <input id="code" placeholder="密令" maxlength="20" autocomplete="off" />
        <button class="alt small" id="cheat">輸入</button>
        <span>${notice}</span>
      </div>`;
  }

  private heroHtml(): string {
    const r = this.roster;
    const h = r.hero;
    const def = playerDef(h);
    const attrs = (Object.keys(ATTR_NAME) as AttrId[]).map((k) => `
      <button class="attr" data-id="${k}" ${h.attrPoints ? '' : 'disabled'}><b>${ATTR_NAME[k]} ${h.attrs[k]}</b><small>${ATTR_DESC[k]}</small></button>`).join('');
    const skills = SKILL_ORDER.map((k) => {
      const total = skillOf(h, r.soldiers, k);
      const bonus = total - h.skills[k];
      return `<button class="skill" data-id="${k}" ${h.skillPoints && h.skills[k] < HERO.skillMax ? '' : 'disabled'}><b>${SKILLS[k].name} ${h.skills[k]}${bonus ? ` +${bonus}` : ''}</b><small>${SKILLS[k].desc}</small></button>`;
    }).join('');
    return `
      <div class="pick-title">等級 ${h.level}・經驗 ${h.xp}／${heroXpNeed(h.level)}・生命 ${def.hp}・護甲 ${armorValue(h)}・傷害 ×${(def.damageMult ?? 1).toFixed(2)}・帶兵 ${partyLimit(h, r.soldiers)}</div>
      <div class="pick-title">屬性點 ${h.attrPoints}</div>
      <div class="attrs">${attrs}</div>
      <div class="pick-title">技能點 ${h.skillPoints}</div>
      <div class="skills">${skills}</div>`;
  }

  private soldierCard(s: Soldier): string {
    const def = UNITS[s.unit];
    const rarity = RARITY[rarityOf(def)];
    const need = xpToNext(s.level);
    const pct = s.level >= LEVEL.max ? 100 : Math.round((s.xp / need) * 100);
    const state = s.post === EXPEDITION_POST ? '・遠征' : s.post ? '・駐守' : s.hurtDays > 0 ? `・傷 ${s.hurtDays} 日` : s.benched ? '・候補' : '';
    const promos = promotions(s).map((p) => `<span class="promo" data-id="${s.id}" data-to="${p.to.id}">升 ${p.to.name} ${p.cost}</span>`).join('');
    return `<button class="sold ${s.benched || s.post || s.hurtDays > 0 ? 'bench' : ''}" data-id="${s.id}" style="--r:${rarity.color}">
      <b>${def.name}</b>
      <small>Lv${s.level}・${RACES[raceOf(def)].name}・殺 ${s.kills}${state}</small>
      <small>糧 ${foodOf(def).toFixed(2)}・餉 ${wageOf(def)}</small>
      <i class="xp"><u style="width:${pct}%"></u></i>
      ${promos}
    </button>`;
  }

  private rosterHtml(): string {
    const all = sortedSoldiers(this.roster);
    const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    this.page = Math.min(Math.max(0, this.page), pages - 1);
    const items = all.slice(this.page * PAGE_SIZE, (this.page + 1) * PAGE_SIZE);
    return `
      <div class="pick-title">全軍 ${all.length} 人，勝 ${this.roster.wins} 場。撳士兵切換出戰／候補；3 級起可以升階。</div>
      <div class="soldiers">${items.map((s) => this.soldierCard(s)).join('')}</div>
      <div class="row pagerow">
        <button class="alt pager" data-step="-1" ${this.page ? '' : 'disabled'}>上一頁</button>
        <span>${this.page + 1}／${pages}</span>
        <button class="alt pager" data-step="1" ${this.page < pages - 1 ? '' : 'disabled'}>下一頁</button>
      </div>`;
  }

  private realmHtml(): string {
    const pol = this.world.politics;
    const s = pol.s;
    const rows = FACTIONS.map((f) => {
      const fiefs = pol.fiefsOf(f.id).length;
      const btns = [
        pol.hostile(f.id) && pol.atWar(PLAYER, f.id) ? `<button class="mini peace" data-f="${f.id}">議和 ${POLITICS.peaceCost}</button>` : '',
        `<button class="mini gift" data-f="${f.id}">送禮 ${POLITICS.giftCost}</button>`,
        pol.canContract(f.id) ? `<button class="mini contract" data-f="${f.id}">簽約</button>` : '',
        pol.canSwear(f.id) ? `<button class="mini swear" data-f="${f.id}">效忠</button>` : '',
      ].join('');
      return `<tr><td style="color:${f.color === '#2c2c38' ? '#9a9ab0' : f.color}">${f.name}</td><td>${fiefs}</td><td>${pol.relation(f.id)}</td><td>${pol.hostile(f.id) ? '敵對' : s.liege === f.id ? '宗主' : ''}</td><td>${btns}</td></tr>`;
    }).join('');
    const crown = pol.canCrown() ? `<div class="cheat"><input id="kname" placeholder="國號" maxlength="8" /><button class="go small" id="crown">自立為王</button></div>` : '';
    const tier = (list: [number, string, string][], v: number) => list.find(([min]) => v >= min)!;
    const [, jName, jFx] = tier(JUSTICE_TIERS, s.justice);
    const [, lName, lFx] = tier(LOYALTY_TIERS, s.loyalty);
    const wanted = Object.entries(s.wanted).map(([f, n]) => `${pol.nameOf(f)} ${n} 金`).join('、');
    const quests = this.world.save.quests.map((q) => q.title).join('、') || '冇';
    const news = this.world.save.log.slice(0, 3).join('　') || '暫時冇消息';
    return `
      <div class="pick-title">正義 ${s.justice}（${jName}：${jFx}）　忠誠 ${s.loyalty}（${lName}：${lFx}）</div>
      ${wanted ? `<div class="pick-title">通緝：${wanted}</div>` : ''}
      <div class="pick-title">任務：${quests}</div>
      <div class="pick-title">近況：${news}</div>
      <div class="pick-title">身份：${s.outlaw ? '山賊・' : ''}${RANK_NAME[s.rank]}${s.liege ? `（${pol.nameOf(s.liege)}）` : ''}${s.kingdom ? `・${s.kingdom}` : ''}・聲望 ${s.renown}・領地 ${pol.fiefsOf(PLAYER).length}${s.won ? '・已統一大陸！' : ''}</div>
      <table class="report trade"><tr><th>勢力</th><th>領地</th><th>好感</th><th>關係</th><th></th></tr>${rows}</table>
      <div class="pick-title">效忠要 ${POLITICS.vassalRenown} 聲望。有 ${POLITICS.kingFiefs} 塊領地就可以自立為王，${POLITICS.victoryFiefs} 塊統一大陸。</div>
      <div class="pick-title">遠征：${this.world.save.expeditionUntil
        ? `隊伍第 ${this.world.save.expeditionUntil} 日返嚟`
        : `<button class="mini" id="expedition">英雄帶 ${EXPEDITION.size} 人出發（${EXPEDITION.days} 日，帶金幣同經驗返）</button>`}</div>
      ${s.lords.length ? `<div class="pick-title">領主俘虜 ${s.lords.length} 人（${pol.nameOf(s.lords[0])}）：
        <button class="mini" id="ransom">收贖金 ${POLITICS.ransomGold}</button>
        <button class="mini" id="freeLord">無條件放人</button></div>` : ''}
      ${crown}`;
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
