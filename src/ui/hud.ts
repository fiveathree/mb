import { HORSES, type HorseDef } from '../data/horses';
import { COMBAT, type AttackDir } from '../data/combat';
import { mirrorDir } from '../battle/combat';
import { flatDist, type Combatant } from '../battle/entities';
import type { Battle, BattleResult } from '../battle/battle';

const DIRS: AttackDir[] = ['up', 'down', 'left', 'right'];
const INCOMING_WARN_DIST = 5.5;
const TOAST_LIFE = 1200;

function bar(id: string, label: string): string {
  return `<div class="bar" id="${id}"><span class="bar-label">${label}</span><span class="bar-track"><i></i></span><b></b></div>`;
}

const CONTROLS: [string, string][] = [
  ['W／S', '加速／收韁'],
  ['A／D', '轉彎（馬有轉彎半徑）'],
  ['Shift', '衝刺（耗馬體力）'],
  ['滑鼠移動', '望方向，亦決定出招方向'],
  ['左鍵', '撳住蓄力，放手出招'],
  ['右鍵', '格擋（移滑鼠揀方向）'],
  ['E', '放平騎槍（全速自動命中）'],
  ['滾輪／Q', '切換武器'],
  ['F', '上馬／下馬'],
  ['空白鍵', '跳躍'],
  ['Tab', '戰況表'],
  ['Esc', '暫停'],
];

export class Hud {
  private root: HTMLElement;
  private screen: HTMLElement;
  private hudEl: HTMLElement;
  private toasts: HTMLElement;
  private dirEls = {} as Record<AttackDir, HTMLElement>;
  private table: HTMLElement;
  private q = <T extends HTMLElement>(sel: string) => this.root.querySelector(sel) as T;

  constructor(root: HTMLElement) {
    this.root = root;
    root.innerHTML = `
      <div id="hud" hidden>
        <div class="top"><span id="foes"></span><span id="timer"></span></div>
        <div class="fps" id="fps"></div>
        <div id="toasts"></div>
        <div id="reticle">
          <i class="dot"></i>
          ${DIRS.map((d) => `<i class="dir ${d}" data-dir="${d}"></i>`).join('')}
          <div class="charge"><i></i></div>
        </div>
        <div class="panel left">
          ${bar('hp', '生命')}${bar('horse', '戰馬')}${bar('stam', '馬力')}${bar('shield', '盾牌')}
        </div>
        <div class="panel right">
          <div id="speed"></div>
          <div id="weapon"></div>
          <div id="hint"></div>
        </div>
        <div id="table" hidden></div>
      </div>
      <div id="screen"></div>`;
    this.hudEl = this.q('#hud');
    this.screen = this.q('#screen');
    this.toasts = this.q('#toasts');
    this.table = this.q('#table');
    for (const d of DIRS) this.dirEls[d] = this.q(`.dir.${d}`);
  }

  private showScreen(html: string) {
    this.screen.innerHTML = html;
    this.screen.classList.add('open');
  }

  hideScreen() {
    this.screen.classList.remove('open');
    this.screen.innerHTML = '';
    this.hudEl.hidden = false;
  }

  private controlsHtml(): string {
    return `<div class="controls">${CONTROLS.map(([k, v]) => `<div><kbd>${k}</kbd><span>${v}</span></div>`).join('')}</div>`;
  }

  showTitle(selected: HorseDef, onStart: (h: HorseDef) => void) {
    this.hudEl.hidden = true;
    const render = (cur: HorseDef) => {
      this.showScreen(`
        <div class="card">
          <h1>鐵騎風雲</h1>
          <p class="sub">戰場原型：騎馬擊破 10 名步兵。全速一刀，先知咩叫馬速傷害。</p>
          <div class="horses">
            ${HORSES.map((h) => `<button class="horse ${h.id === cur.id ? 'on' : ''}" data-id="${h.id}"><b>${h.name}</b><small>${h.desc}</small></button>`).join('')}
          </div>
          ${this.controlsHtml()}
          <button class="go" id="go">開始戰鬥</button>
        </div>`);
      this.screen.querySelectorAll<HTMLElement>('.horse').forEach((el) => {
        el.onclick = () => render(HORSES.find((h) => h.id === el.dataset.id)!);
      });
      this.q('#go').onclick = () => onStart(cur);
    };
    render(selected);
  }

  showPause(onResume: () => void, onRestart: () => void, message = '') {
    this.showScreen(`
      <div class="card">
        <h2>暫停</h2>
        ${message ? `<p class="sub">${message}</p>` : ''}
        ${this.controlsHtml()}
        <div class="row"><button class="go" id="resume">繼續</button><button class="alt" id="restart">重新開始</button></div>
      </div>`);
    this.q('#resume').onclick = onResume;
    this.q('#restart').onclick = onRestart;
  }

  showResult(r: BattleResult, onRestart: () => void, onTitle: () => void) {
    const s = r.stats;
    this.hudEl.hidden = true;
    this.showScreen(`
      <div class="card">
        <h2 class="${r.win ? 'win' : 'lose'}">${r.win ? '大獲全勝' : '戰敗'}</h2>
        <div class="stats">
          <div><small>擊殺</small><b>${s.kills}</b></div>
          <div><small>最高單擊</small><b>${s.bestHit}</b></div>
          <div><small>最高時速</small><b>${Math.round(s.topSpeed * 3.6)} km/h</b></div>
          <div><small>用時</small><b>${Math.round(s.time)} 秒</b></div>
        </div>
        <div class="row"><button class="go" id="again">再打一場</button><button class="alt" id="title">換馬</button></div>
      </div>`);
    this.q('#again').onclick = onRestart;
    this.q('#title').onclick = onTitle;
  }

  announce(text: string, kind: 'hit' | 'kill' | 'guard' | 'hurt') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    this.toasts.prepend(el);
    while (this.toasts.children.length > 4) this.toasts.lastChild!.remove();
    window.setTimeout(() => el.remove(), TOAST_LIFE);
  }

  private setBar(id: string, value: number, max: number, show = true) {
    const el = this.q(`#${id}`);
    el.hidden = !show;
    if (!show) return;
    (el.querySelector('i') as HTMLElement).style.transform = `scaleX(${Math.max(0, value / max)})`;
    (el.querySelector('b') as HTMLElement).textContent = String(Math.max(0, Math.ceil(value)));
  }

  private incoming(b: Battle, p: Combatant): AttackDir | null {
    let best: Combatant | null = null;
    let bestD = INCOMING_WARN_DIST;
    for (const u of b.units) {
      if (u.team === 0 || u.dead || (u.phase !== 'charge' && u.phase !== 'swing')) continue;
      const d = flatDist(u.pos, p.pos);
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best ? mirrorDir(best.dir) : null;
  }

  update(b: Battle) {
    const p = b.player;
    const h = p.horse ?? b.horses[0];
    this.setBar('hp', p.hp, p.def.hp);
    this.setBar('horse', h.hp, h.def.hp, !h.dead);
    this.setBar('stam', h.stamina, h.def.stamina, !h.dead);
    this.setBar('shield', p.shieldHp, p.shieldMax, p.weapon.hasShield);
    this.q('#stam').classList.toggle('low', h.exhausted);

    const foes = b.units.filter((u) => u.team !== 0 && !u.dead).length;
    this.q('#foes').textContent = `敵軍 ${foes} ／ 擊殺 ${b.stats.kills}`;
    this.q('#timer').textContent = `${Math.floor(b.stats.time)} 秒`;
    this.q('#fps').textContent = `${b.fps} FPS`;

    const kmh = p.horse ? Math.round(Math.abs(p.horse.speed) * 3.6) : 0;
    this.q('#speed').innerHTML = `${kmh}<small> km/h</small>`;
    this.q('#weapon').textContent = `${p.weapon.name}　滾輪切換`;
    const canCouch = p.weapon.couchable && p.horse && p.horse.speed >= COMBAT.couch.minSpeed;
    this.q('#hint').textContent = p.couched ? '騎槍已放平！瞄準馬頭前方' : canCouch ? '撳 E 放平騎槍' : p.horse ? '' : '撳 F 上馬';

    const inc = this.incoming(b, p);
    for (const d of DIRS) {
      const el = this.dirEls[d];
      const attacking = (p.phase === 'charge' || p.phase === 'swing') && p.dir === d;
      el.classList.toggle('att', attacking);
      el.classList.toggle('blk', p.phase === 'block' && p.blockDir === d);
      el.classList.toggle('inc', inc === d);
    }
    const charge = this.q('.charge');
    charge.classList.toggle('on', p.phase === 'charge');
    (charge.firstElementChild as HTMLElement).style.transform = `scaleX(${p.charge})`;

    const showTable = b.input.down('Tab');
    this.table.hidden = !showTable;
    if (showTable) {
      const rows = new Map<string, [number, number]>();
      for (const u of b.units) {
        if (u.team === 0) continue;
        const r = rows.get(u.def.name) ?? [0, 0];
        r[1]++;
        if (!u.dead) r[0]++;
        rows.set(u.def.name, r);
      }
      this.table.innerHTML = `<h3>戰況</h3>${[...rows].map(([n, [a, t]]) => `<div><span>${n}</span><b>${a} ／ ${t}</b></div>`).join('')}
        <div><span>最高單擊</span><b>${b.stats.bestHit}</b></div>`;
    }
  }
}
