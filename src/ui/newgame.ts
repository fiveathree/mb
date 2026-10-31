import {
  BACKGROUNDS, PLAYABLE, REGION_NAME, START_REGIONS, type PlayableRace, type Region, type StartOption,
} from '../data/factions';
import type { Hud } from './hud';

export interface NewGameChoice {
  race: PlayableRace;
  region: Region;
  background: StartOption;
}

/** 開局：揀種族、地域、出身 */
export function showNewGame(hud: Hud, onDone: (c: NewGameChoice) => void, onBack: () => void) {
  const c: NewGameChoice = { race: 'human', region: 'west', background: BACKGROUNDS[0] };
  const render = () => {
    const races = (Object.keys(PLAYABLE) as PlayableRace[]).map((k) => `<button class="horse ${k === c.race ? 'on' : ''}" data-race="${k}"><b>${PLAYABLE[k].name}</b><small>${PLAYABLE[k].desc}</small></button>`).join('');
    const regions = (Object.keys(START_REGIONS) as Region[]).map((k) => `<button class="horse ${k === c.region ? 'on' : ''}" data-region="${k}"><b>${REGION_NAME[k]}</b></button>`).join('');
    const bgs = BACKGROUNDS.map((b) => `<button class="horse ${b.id === c.background.id ? 'on' : ''}" data-bg="${b.id}"><b>${b.name}</b><small>${b.desc}・${b.gold} 金</small></button>`).join('');
    hud.showScreen(`
      <div class="card">
        <h2>開局</h2>
        <div class="pick-title">種族</div><div class="horses">${races}</div>
        <div class="pick-title">地域</div><div class="horses">${regions}</div>
        <div class="pick-title">出身</div><div class="horses">${bgs}</div>
        <div class="row"><button class="go" id="start">踏上征途</button><button class="alt" id="back">返回</button></div>
      </div>`);
    const all = (sel: string, fn: (el: HTMLElement) => void) => document.querySelectorAll<HTMLElement>(`#screen ${sel}`).forEach(fn);
    all('[data-race]', (el) => { el.onclick = () => { c.race = el.dataset.race as PlayableRace; render(); }; });
    all('[data-region]', (el) => { el.onclick = () => { c.region = el.dataset.region as Region; render(); }; });
    all('[data-bg]', (el) => { el.onclick = () => { c.background = BACKGROUNDS.find((b) => b.id === el.dataset.bg)!; render(); }; });
    document.getElementById('start')!.onclick = () => onDone(c);
    document.getElementById('back')!.onclick = onBack;
  };
  render();
}
