import {
  BACKGROUNDS, PLAYABLE, type PlayableRace, type StartOption,
} from '../data/factions';
import { SCENARIOS, applyScenario, type Scenario } from '../data/scenarios';
import { PLACES, type PlaceKind } from '../data/world';
import { BACKGROUND_JOB, JOBS, jobOf } from '../data/jobs';
import { ATTR_NAME, DIFFICULTY, SKILLS, type Difficulty } from '../data/economy';
import { UNITS } from '../data/units';
import { MUSOU_STYLES, crownsIn, musouOf, shortName, sigId, type CrownDef } from '../data/crowns';
import { HORSES } from '../data/horses';
import { WEAPONS } from '../data/weapons';
import { armorValue, createCrownHero, partyLimit, playerDef } from '../core/hero';
import type { Hud } from './hud';

export interface NewGameChoice {
  /** 自己改嘅名，一般本先用 */
  name: string;
  /** 有就係冠位角色本 */
  crown?: CrownDef;
  scenario: Scenario;
  race: PlayableRace;
  /** 出生地：邊座城或者村 */
  birth: string;
  background: StartOption;
  difficulty: Difficulty;
  /** 空字串就跟身世 */
  job: string;
}

const RACE_KEYS = Object.keys(PLAYABLE) as PlayableRace[];
const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

function armyText(b: StartOption): string {
  if (!b.army.length) return '孤身一人';
  return b.army.map((e) => `${UNITS[e.unit].name} ${e.count}`).join('、');
}

const KIND_NAME: Partial<Record<PlaceKind, string>> = { town: '城', castle: '堡', village: '村' };
const birthPlaces = () => PLACES.filter((p) => !p.gone && KIND_NAME[p.kind] && !p.hidden);

const ATTR_MAX = 20;

/** 冠位角色數值板 */
function crownPanel(k: CrownDef): string {
  const h = createCrownHero(k);
  const def = playerDef(h);
  const musou = musouOf(k.id);
  const bars = (['str', 'agi', 'int', 'cha'] as const).map((id) => `
    <div class="crown-bar"><span>${ATTR_NAME[id]}</span><i><b style="width:${(h.attrs[id] / ATTR_MAX) * 100}%"></b></i><em>${h.attrs[id]}</em></div>`).join('');
  const skills = Object.entries(k.skills).map(([id, v]) => `${SKILLS[id as keyof typeof SKILLS].name} ${v}`).join('、');
  const army = k.army.map(([u, n]) => `${UNITS[u].name} ${n}`).join('、');
  return `
    <p class="detail">${k.cls}冠位・${k.name}：${k.desc}</p>
    <div class="crown-panel">
      <div>${bars}</div>
      <div class="crown-info">
        <div>生命 ${def.hp}・法力 ${def.mp}・護甲 ${armorValue(h)}・傷害 ×${(def.damageMult ?? 1).toFixed(2)}・帶兵 ${partyLimit(h, [])}</div>
        <div>專屬：${k.sig[0]}（${WEAPONS[sigId(k)].baseDamage} 傷害）</div>
        <div>戰技：${musou.name}（${MUSOU_STYLES[musou.style].label}：${MUSOU_STYLES[musou.style].desc}）</div>
        <div>技能：${skills}</div>
        <div>坐騎：${HORSES.find((x) => x.id === k.horse)?.name}・${k.gold} 金・${k.food} 糧</div>
        <div>部隊：${army}</div>
      </div>
    </div>`;
}

/** 開局：揀種族、地域、身世 */
export function showNewGame(hud: Hud, onDone: (c: NewGameChoice) => void, onBack: () => void) {
  const c: NewGameChoice = { name: '', scenario: SCENARIOS[0], race: 'human', birth: 'griffon', background: BACKGROUNDS[0], difficulty: 'normal', job: '' };
  let crownMode = false;
  const racesOf = () => c.scenario.races ?? RACE_KEYS;
  const render = () => {
    if (!racesOf().includes(c.race)) c.race = 'human';
    const crowns = crownsIn(c.scenario.id);
    // 套用劇本先攞到當地城名
    applyScenario(c.scenario.id);
    const births = birthPlaces();
    if (!births.some((p) => p.id === c.birth)) c.birth = births[0].id;
    c.crown = crownMode ? (crowns.includes(c.crown!) ? c.crown : crowns[0]) : undefined;
    const chip = (attr: string, id: string, label: string, on: boolean) => `<button class="wp ${on ? 'on' : ''}" data-${attr}="${id}">${label}</button>`;
    const b = c.background;
    const diff = `難度 <select id="ngDiff">${(Object.keys(DIFFICULTY) as Difficulty[]).map((k) => `<option value="${k}" ${k === c.difficulty ? 'selected' : ''}>${DIFFICULTY[k].name}</option>`).join('')}</select>`;
    const body = c.crown ? `
        <div class="pick-title ng-picks">冠位角色　${diff}</div>
        <div class="weapons crown-list">${crowns.map((k) => chip('crown', k.id, shortName(k), k === c.crown)).join('')}</div>
        ${crownPanel(c.crown)}` : `
        <div class="pick-title">種族</div>
        <div class="weapons">${racesOf().map((k) => chip('race', k, PLAYABLE[k].name, k === c.race)).join('')}</div>
        <p class="detail">${PLAYABLE[c.race].desc}</p>
        <div class="pick-title">出身</div>
        <div class="weapons">${BACKGROUNDS.map((x) => chip('bg', x.id, x.name, x.id === b.id)).join('')}</div>
        <p class="detail">${b.desc}。職業 ${jobOf(BACKGROUND_JOB[b.id] ?? 'warrior').name}，起步 ${b.gold} 金、${b.food} 糧；部隊：${armyText(b)}</p>
        <div class="pick-title ng-picks">出生地 <select id="ngBirth">${births.map((p) => `<option value="${p.id}" ${p.id === c.birth ? 'selected' : ''}>${KIND_NAME[p.kind]}・${p.name}</option>`).join('')}</select>
          ${diff}
          職業 <select id="ngJob"><option value="">跟身世</option>${JOBS.map((j) => `<option value="${j.id}" ${j.id === c.job ? 'selected' : ''}>${j.name}</option>`).join('')}</select>
        </div>`;
    hud.showScreen(`
      <div class="card camp newgame">
        <div class="ng-head">
          <h2>開局</h2>
          <button class="wp ${crownMode ? '' : 'on'}" data-mode="">一般本</button>
          <button class="wp ${crownMode ? 'on' : ''}" data-mode="1">冠位角色本</button>
          <label ${crownMode ? 'style="visibility:hidden"' : ''}>姓名 <input id="ngName" maxlength="12" placeholder="無名氏" value="${c.name.replace(/"/g, '&quot;')}"></label>
        </div>
        <div class="pick-title">劇本</div>
        <div class="weapons sc-list">${SCENARIOS.map((s) => chip('sc', s.id, s.name, s.id === c.scenario.id)).join('')}</div>
        <p class="detail">${c.scenario.desc}</p>
        ${body}
        <div class="row">
          <button class="go" id="start">踏上征途</button>
          <button class="alt" id="dice">隨機</button>
          <button class="alt" id="back">返回</button>
        </div>
      </div>`);
    const all = (sel: string, fn: (el: HTMLElement) => void) => document.querySelectorAll<HTMLElement>(`#screen ${sel}`).forEach(fn);
    all('[data-sc]', (el) => { el.onclick = () => { c.scenario = SCENARIOS.find((s) => s.id === el.dataset.sc)!; render(); }; });
    all('[data-race]', (el) => { el.onclick = () => { c.race = el.dataset.race as PlayableRace; render(); }; });
    all('[data-bg]', (el) => { el.onclick = () => { c.background = BACKGROUNDS.find((x) => x.id === el.dataset.bg)!; render(); }; });
    all('[data-mode]', (el) => { el.onclick = () => { crownMode = !!el.dataset.mode; render(); }; });
    all('[data-crown]', (el) => { el.onclick = () => { c.crown = crowns.find((k) => k.id === el.dataset.crown); render(); }; });
    document.getElementById('dice')!.onclick = () => {
      c.scenario = pick(SCENARIOS);
      c.race = pick(racesOf());
      c.birth = pick(birthPlaces()).id;
      c.background = pick(BACKGROUNDS);
      c.crown = pick(crownsIn(c.scenario.id));
      render();
    };
    (document.getElementById('ngName') as HTMLInputElement).oninput = (e) => { c.name = (e.target as HTMLInputElement).value; };
    (document.getElementById('ngDiff') as HTMLSelectElement).onchange = (e) => { c.difficulty = (e.target as HTMLSelectElement).value as Difficulty; };
    const birth = document.getElementById('ngBirth') as HTMLSelectElement | null;
    if (birth) birth.onchange = () => { c.birth = birth.value; };
    const job = document.getElementById('ngJob') as HTMLSelectElement | null;
    if (job) job.onchange = () => { c.job = job.value; };
    document.getElementById('start')!.onclick = () => onDone(c);
    document.getElementById('back')!.onclick = onBack;
  };
  render();
}
