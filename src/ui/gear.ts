import { ARMORS, SLOT_NAME, type ArmorDef, type ArmorSlot } from '../data/economy';
import { ARTIFACTS } from '../data/factions';
import { HORSES, HORSE_RANK } from '../data/horses';
import { RARITY } from '../data/gacha';
import { RACES } from '../data/races';
import { UNITS } from '../data/units';
import { LOADOUT_SIZE, WEAPONS } from '../data/weapons';
import { applyGear, armorValue, freeArmor, playerDef } from '../core/hero';
import { levelDef, type Roster, type Soldier } from '../core/roster';

const LEFT: ArmorSlot[] = ['head', 'body'];
const RIGHT: ArmorSlot[] = ['hands', 'feet'];
const PLAYER_ID = 0;
const PEOPLE_PER_PAGE = 5;

/** 人形剪影，裝備格圍住佢 */
const FIGURE = `<svg viewBox="0 0 120 200" class="figure" aria-hidden="true">
  <circle cx="60" cy="26" r="16"/>
  <path d="M38 48h44l10 58-14 4-4-34v44l6 72H66l-6-58-6 58H40l6-72V76l-4 34-14-4z"/>
</svg>`;

function armorOf(id?: string): ArmorDef | undefined {
  return ARMORS.find((a) => a.id === id);
}

/** 裝備頁：揀角色，撳格揀部位，再撳背包著裝；再撳已揀嘅格除裝 */
export class GearPanel {
  private who = PLAYER_ID;
  private picked: ArmorSlot = 'body';
  private page = 0;

  constructor(private roster: Roster, private refresh: () => void) {}

  setRoster(r: Roster) {
    this.roster = r;
    this.who = PLAYER_ID;
    this.page = 0;
  }

  private heroes(): Soldier[] {
    return this.roster.soldiers.filter((s) => UNITS[s.unit].hero);
  }

  private soldier(): Soldier | undefined {
    return this.heroes().find((s) => s.id === this.who);
  }

  private wornIn(slot: ArmorSlot): string | undefined {
    const s = this.soldier();
    return s ? s.gear?.armor[slot] : this.roster.hero.equip[slot];
  }

  private setWorn(slot: ArmorSlot, id: string | undefined) {
    const s = this.soldier();
    if (!s) {
      this.roster.hero.equip[slot] = id;
      return;
    }
    s.gear ??= { armor: {} };
    s.gear.armor[slot] = id;
  }

  private slotHtml(slot: ArmorSlot): string {
    const a = armorOf(this.wornIn(slot));
    return `<button class="slot-box ${a ? 'full' : ''} ${slot === this.picked ? 'pick' : ''}" data-slot="${slot}">
      <small>${SLOT_NAME[slot]}</small><b>${a ? a.name : '空'}</b><em>${a ? `+${a.armor}` : ''}</em>
    </button>`;
  }

  private peopleHtml(): string {
    const s = this.soldier();
    const list = this.heroes();
    const pages = Math.max(1, Math.ceil(list.length / PEOPLE_PER_PAGE));
    this.page = Math.min(this.page, pages - 1);
    const shown = list.slice(this.page * PEOPLE_PER_PAGE, (this.page + 1) * PEOPLE_PER_PAGE);
    const cells = [
      `<button class="wp ${s ? '' : 'on'}" data-who="${PLAYER_ID}">主角</button>`,
      ...shown.map((x) => `<button class="wp ${x === s ? 'on' : ''}" data-who="${x.id}">${UNITS[x.unit].name}</button>`),
    ].join('');
    const pager = pages > 1 ? `<button class="mini" data-gp="1">下一組英雄（${this.page + 1}／${pages}）</button>` : '';
    return `<div class="people">${cells}</div><div class="people-pager">${pager}</div>`;
  }

  html(): string {
    const r = this.roster;
    const hero = r.hero;
    const s = this.soldier();
    const def = s ? applyGear(levelDef(UNITS[s.unit], s.level), s.gear) : playerDef(hero);
    const stats = s
      ? `${def.name}・Lv${s.level}・生命 ${def.hp}・護甲 ${def.armor.toFixed(1)}`
      : `主角・生命 ${def.hp}・法力 ${def.mp}・護甲 ${armorValue(hero)}`;
    const list = ARMORS.filter((a) => a.slot === this.picked && freeArmor(hero, r.soldiers, a.id) > 0)
      .map((a) => `<button class="inv" data-armor="${a.id}"><b>${a.name}</b><small>護甲 +${a.armor}・餘 ${freeArmor(hero, r.soldiers, a.id)}</small></button>`).join('');
    const weapons = hero.weapons.map((id) => {
      const on = s ? s.gear?.weapon === id : hero.loadout.includes(id);
      return `<button class="mini ${on ? 'on' : ''}" data-weapon="${id}">${WEAPONS[id].name}</button>`;
    }).join('');
    const noRide = RACES[(s ? UNITS[s.unit].race : hero.race) ?? 'human'].noRide;
    const horses = HORSES.filter((h) => !noRide && hero.horses.includes(h.id)).map((h) => {
      const on = s ? s.gear?.horse === h.id : hero.horse === h.id;
      return `<button class="mini ${on ? 'on' : ''}" data-horse="${h.id}">[${RARITY[HORSE_RANK[h.id]].name}] ${h.name}</button>`;
    }).join('');
    const arts = ARTIFACTS.filter((a) => hero.artifacts.includes(a.id)).map((a) => a.name).join('、');

    return `
      ${this.peopleHtml()}
      <div class="pick-title">${stats}</div>
      <div class="doll">
        <div class="slots">${LEFT.map((x) => this.slotHtml(x)).join('')}</div>
        ${FIGURE}
        <div class="slots">${RIGHT.map((x) => this.slotHtml(x)).join('')}</div>
        <div class="bag">
          <div class="pick-title">背包：${SLOT_NAME[this.picked]}（再撳已揀嘅格除裝）</div>
          ${list || '<p class="sub">冇多餘裝備，去城鎮鐵匠買</p>'}
        </div>
      </div>
      <div class="pick-title">武器${s ? '（英雄主武器）' : `（揀 ${LOADOUT_SIZE} 件）`}</div>
      <div class="shop gear-row">${weapons}</div>
      <div class="pick-title">坐騎${arts ? `　神器：${arts}` : ''}</div>
      <div class="shop">${horses}</div>`;
  }

  bind() {
    const hero = this.roster.hero;
    const click = (sel: string, fn: (el: HTMLElement) => void) => {
      document.querySelectorAll<HTMLElement>(`#screen ${sel}`).forEach((el) => {
        el.onclick = () => {
          fn(el);
          this.refresh();
        };
      });
    };
    click('[data-who]', (el) => { this.who = Number(el.dataset.who); });
    click('[data-gp]', () => {
      const pages = Math.max(1, Math.ceil(this.heroes().length / PEOPLE_PER_PAGE));
      this.page = (this.page + 1) % pages;
    });
    click('[data-slot]', (el) => {
      const slot = el.dataset.slot as ArmorSlot;
      if (slot === this.picked) this.setWorn(slot, undefined);
      this.picked = slot;
    });
    click('[data-armor]', (el) => this.setWorn(this.picked, el.dataset.armor));
    click('[data-weapon]', (el) => {
      const id = el.dataset.weapon!;
      const s = this.soldier();
      if (s) {
        s.gear ??= { armor: {} };
        s.gear.weapon = s.gear.weapon === id ? undefined : id;
        return;
      }
      const next = hero.loadout.includes(id) ? hero.loadout.filter((x) => x !== id) : [...hero.loadout, id].slice(-LOADOUT_SIZE);
      if (next.length) hero.loadout = next;
    });
    click('[data-horse]', (el) => {
      const s = this.soldier();
      const id = el.dataset.horse!;
      if (!s) hero.horse = id;
      else {
        s.gear ??= { armor: {} };
        s.gear.horse = s.gear.horse === id ? undefined : id;
      }
    });
  }
}
