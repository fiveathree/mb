import {
  BACKGROUNDS, PLAYABLE, REGION_NAME, START_REGIONS, type PlayableRace, type Region, type StartOption,
} from '../data/factions';
import { SCENARIOS, type Scenario } from '../data/scenarios';
import { UNITS } from '../data/units';
import type { Hud } from './hud';

export interface NewGameChoice {
  scenario: Scenario;
  race: PlayableRace;
  region: Region;
  background: StartOption;
}

const RACE_KEYS = Object.keys(PLAYABLE) as PlayableRace[];
const REGION_KEYS = Object.keys(START_REGIONS) as Region[];
const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

function armyText(b: StartOption): string {
  if (!b.army.length) return '孤身一人';
  return b.army.map((e) => `${UNITS[e.unit].name} ${e.count}`).join('、');
}

/** 開局：揀種族、地域、身世 */
export function showNewGame(hud: Hud, onDone: (c: NewGameChoice) => void, onBack: () => void) {
  const c: NewGameChoice = { scenario: SCENARIOS[0], race: 'human', region: 'west', background: BACKGROUNDS[0] };
  const render = () => {
    const chip = (attr: string, id: string, label: string, on: boolean) => `<button class="wp ${on ? 'on' : ''}" data-${attr}="${id}">${label}</button>`;
    const b = c.background;
    hud.showScreen(`
      <div class="card camp newgame">
        <h2>開局</h2>
        <div class="pick-title">劇本</div>
        <div class="weapons">${SCENARIOS.map((s) => chip('sc', s.id, s.name, s.id === c.scenario.id)).join('')}</div>
        <p class="detail">${c.scenario.desc}</p>
        <div class="pick-title">種族</div>
        <div class="weapons">${RACE_KEYS.map((k) => chip('race', k, PLAYABLE[k].name, k === c.race)).join('')}</div>
        <p class="detail">${PLAYABLE[c.race].desc}</p>
        <div class="pick-title">出身</div>
        <div class="weapons">${BACKGROUNDS.map((x) => chip('bg', x.id, x.name, x.id === b.id)).join('')}</div>
        <p class="detail">${b.desc}。起步 ${b.gold} 金、${b.food} 糧；部隊：${armyText(b)}</p>
        <div class="pick-title">出生地</div>
        <div class="horses">${REGION_KEYS.map((k) => chip('region', k, REGION_NAME[k], k === c.region)).join('')}</div>
        <div class="row">
          <button class="go" id="start">踏上征途</button>
          <button class="alt" id="dice">隨機身世</button>
          <button class="alt" id="back">返回</button>
        </div>
      </div>`);
    const all = (sel: string, fn: (el: HTMLElement) => void) => document.querySelectorAll<HTMLElement>(`#screen ${sel}`).forEach(fn);
    all('[data-sc]', (el) => { el.onclick = () => { c.scenario = SCENARIOS.find((s) => s.id === el.dataset.sc)!; render(); }; });
    all('[data-race]', (el) => { el.onclick = () => { c.race = el.dataset.race as PlayableRace; render(); }; });
    all('[data-region]', (el) => { el.onclick = () => { c.region = el.dataset.region as Region; render(); }; });
    all('[data-bg]', (el) => { el.onclick = () => { c.background = BACKGROUNDS.find((x) => x.id === el.dataset.bg)!; render(); }; });
    document.getElementById('dice')!.onclick = () => {
      c.scenario = pick(SCENARIOS);
      c.race = pick(RACE_KEYS);
      c.region = pick(REGION_KEYS);
      c.background = pick(BACKGROUNDS);
      render();
    };
    document.getElementById('start')!.onclick = () => onDone(c);
    document.getElementById('back')!.onclick = onBack;
  };
  render();
}
