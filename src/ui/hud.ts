import { HORSES, type HorseDef } from '../data/horses';
import { COMBAT, type AttackDir } from '../data/combat';
import { LOADOUT_SIZE, PLAYER_ARSENAL, WEAPONS } from '../data/weapons';
import { BATTLEFIELD } from '../data/battlefield';
import { ROLE_LABEL, TEAM_NAMES } from '../data/units';
import { mirrorDir } from '../battle/combat';
import { flatDist, rad, type Combatant } from '../battle/entities';
import { ORDER_LABEL } from '../battle/orders';
import { Projectiles } from '../battle/projectiles';
import type { Battle, BattleResult, ReportRow } from '../battle/battle';

const DIRS: AttackDir[] = ['up', 'down', 'left', 'right'];
const INCOMING_WARN_DIST = 5.5;
const TOAST_LIFE = 1200;
const MINIMAP_SIZE = 150;
const MINIMAP_EVERY = 6;

function bar(id: string, label: string): string {
  return `<div class="bar" id="${id}"><span class="bar-label">${label}</span><span class="bar-track"><i></i></span><b></b></div>`;
}

const CONTROLS: [string, string][] = [
  ['W／S', '加速／收韁'],
  ['A／D', '轉彎'],
  ['Shift', '衝刺（耗馬力）'],
  ['滑鼠移動', '望方向＋出招方向'],
  ['左鍵', '撳住蓄力／拉弓，放手出招'],
  ['右鍵', '格擋（弓：取消）'],
  ['E', '放平騎槍'],
  ['滾輪／Q', '切換武器'],
  ['F', '上馬／下馬'],
  ['1 2 3 0', '選步／弓／騎／全軍'],
  ['F1 F2 F3', '跟隨／守住／衝鋒'],
  ['F4 F5 F6', '散開／密集／停射'],
  ['Tab', '戰況表'],
  ['Esc', '暫停／撤退'],
];

export class Hud {
  private root: HTMLElement;
  private screen: HTMLElement;
  private hudEl: HTMLElement;
  private toasts: HTMLElement;
  private dirEls = {} as Record<AttackDir, HTMLElement>;
  private table: HTMLElement;
  private mapCtx: CanvasRenderingContext2D;
  private frame = 0;
  private q = <T extends HTMLElement>(sel: string) => this.root.querySelector(sel) as T;

  constructor(root: HTMLElement) {
    this.root = root;
    root.innerHTML = `
      <div id="hud" hidden>
        <div class="top"><span id="foes"></span><span id="timer"></span></div>
        <div class="fps" id="fps"></div>
        <canvas id="minimap" width="${MINIMAP_SIZE}" height="${MINIMAP_SIZE}"></canvas>
        <div class="panel orders" id="orders"></div>
        <div id="toasts"></div>
        <div id="reticle">
          <i class="dot"></i>
          <i class="spread"></i>
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
    this.mapCtx = (this.q('#minimap') as HTMLCanvasElement).getContext('2d')!;
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

  showTitle(horse: HorseDef, loadout: string[], onStart: (h: HorseDef, loadout: string[]) => void) {
    this.hudEl.hidden = true;
    const render = (cur: HorseDef, picks: string[]) => {
      const n = picks.length;
      this.showScreen(`
        <div class="card">
          <h1>鐵騎風雲</h1>
          <p class="sub">部隊對戰：敵我各 40 人。指揮步、弓、騎，親自衝陣。</p>
          <div class="pick-title">坐騎</div>
          <div class="horses">
            ${HORSES.map((h) => `<button class="horse ${h.id === cur.id ? 'on' : ''}" data-id="${h.id}"><b>${h.name}</b><small>${h.desc}</small></button>`).join('')}
          </div>
          <div class="pick-title">武器（揀 ${LOADOUT_SIZE} 件，已揀 ${n}）</div>
          <div class="weapons">
            ${PLAYER_ARSENAL.map((id) => `<button class="wp ${picks.includes(id) ? 'on' : ''}" data-id="${id}">${WEAPONS[id].name}</button>`).join('')}
          </div>
          ${this.controlsHtml()}
          <button class="go" id="go" ${n ? '' : 'disabled'}>開始戰鬥</button>
        </div>`);
      this.screen.querySelectorAll<HTMLElement>('.horse').forEach((el) => {
        el.onclick = () => render(HORSES.find((h) => h.id === el.dataset.id)!, picks);
      });
      this.screen.querySelectorAll<HTMLElement>('.wp').forEach((el) => {
        el.onclick = () => {
          const id = el.dataset.id!;
          const next = picks.includes(id) ? picks.filter((p) => p !== id) : [...picks, id].slice(-LOADOUT_SIZE);
          render(cur, next);
        };
      });
      this.q('#go').onclick = () => onStart(cur, picks);
    };
    render(horse, loadout);
  }

  showPause(onResume: () => void, onRestart: () => void, onRetreat: () => void, message = '') {
    this.showScreen(`
      <div class="card">
        <h2>暫停</h2>
        ${message ? `<p class="sub">${message}</p>` : ''}
        ${this.controlsHtml()}
        <div class="row">
          <button class="go" id="resume">繼續</button>
          <button class="alt" id="retreat">撤退</button>
          <button class="alt" id="restart">重新開始</button>
        </div>
      </div>`);
    this.q('#resume').onclick = onResume;
    this.q('#restart').onclick = onRestart;
    this.q('#retreat').onclick = onRetreat;
  }

  private reportColumn(team: number, rows: ReportRow[]): string {
    const sum = (k: keyof ReportRow) => rows.reduce((s, r) => s + (r[k] as number), 0);
    const line = (name: string, alive: number, wounded: number, dead: number, fled: number, cls = '') =>
      `<tr class="${cls}"><td>${name}</td><td>${alive}</td><td>${wounded}</td><td>${dead}</td><td>${fled}</td></tr>`;
    return `
      <table class="report">
        <caption>${TEAM_NAMES[team]}</caption>
        <tr><th></th><th>存活</th><th>傷兵</th><th>陣亡</th><th>潰逃</th></tr>
        ${rows.map((r) => line(r.name, r.alive, r.wounded, r.dead, r.fled)).join('')}
        ${line('合計', sum('alive'), sum('wounded'), sum('dead'), sum('fled'), 'sum')}
      </table>`;
  }

  showResult(r: BattleResult, onRestart: () => void, onTitle: () => void) {
    const s = r.stats;
    this.hudEl.hidden = true;
    const title = r.win ? '大獲全勝' : r.retreated ? '撤退' : '戰敗';
    this.showScreen(`
      <div class="card wide">
        <h2 class="${r.win ? 'win' : 'lose'}">${title}</h2>
        ${r.playerDown ? '<p class="sub">你喺戰鬥中倒下，由部下打完呢場。</p>' : ''}
        <div class="reports">${this.reportColumn(0, r.rows[0])}${this.reportColumn(1, r.rows[1])}</div>
        <div class="stats">
          <div><small>戰利品</small><b>${r.gold} 金</b></div>
          <div><small>經驗</small><b>${r.exp}</b></div>
          <div><small>聲望</small><b>+${r.renown}</b></div>
          <div><small>俘虜</small><b>${r.captives}</b></div>
          <div><small>親手擊殺</small><b>${s.kills}</b></div>
          <div><small>最高單擊</small><b>${s.bestHit}</b></div>
          <div><small>最高時速</small><b>${Math.round(s.topSpeed * 3.6)} km/h</b></div>
          <div><small>用時</small><b>${Math.round(s.time)} 秒</b></div>
        </div>
        <div class="row"><button class="go" id="again">再打一場</button><button class="alt" id="title">換裝備</button></div>
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
      if (u.team === p.team || u.dead || u.weapon.ranged || (u.phase !== 'charge' && u.phase !== 'swing')) continue;
      const d = flatDist(u.pos, p.pos);
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best ? mirrorDir(best.dir) : null;
  }

  private drawMinimap(b: Battle) {
    const g = this.mapCtx;
    const size = MINIMAP_SIZE;
    const scale = size / (BATTLEFIELD.arenaRadius * 2);
    g.clearRect(0, 0, size, size);
    g.fillStyle = 'rgba(18,22,32,.62)';
    g.beginPath();
    g.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    g.fill();
    // 上方係玩家面向嘅方向
    g.save();
    g.translate(size / 2, size / 2);
    g.rotate(b.camYaw + Math.PI);
    for (const u of b.units) {
      if (u.dead) continue;
      g.fillStyle = u === b.player ? '#f2c14e' : u.routing ? '#8a8172' : u.team === 0 ? '#79a7e8' : '#e5533d';
      const s = u === b.player ? 5 : u.horse ? 4 : 3;
      g.fillRect(u.pos.x * scale - s / 2, u.pos.z * scale - s / 2, s, s);
    }
    g.restore();
  }

  private ordersHtml(b: Battle): string {
    const rows = b.groups[0].map((g, i) => {
      const alive = g.alive.length;
      const tags = [ORDER_LABEL[g.order], g.loose ? '散開' : '', g.holdFire ? '停射' : ''].filter(Boolean).join('・');
      return `<div class="${b.selected.has(g.role) ? 'sel' : ''}"><kbd>${i + 1}</kbd><span>${ROLE_LABEL[g.role]} ${alive}</span><em>${tags}</em></div>`;
    }).join('');
    return `${rows}<div class="mor">士氣 ${Math.round(b.moraleOf(0) * 100)}%　敵 ${Math.round(b.moraleOf(1) * 100)}%</div>`;
  }

  update(b: Battle) {
    this.frame++;
    const p = b.player;
    const h = p.horse ?? b.lastHorse;
    this.setBar('hp', p.hp, p.def.hp);
    this.setBar('horse', h.hp, h.def.hp, !h.dead);
    this.setBar('stam', h.stamina, h.def.stamina, !h.dead);
    this.setBar('shield', p.shieldHp, p.shieldMax, p.weapon.hasShield);
    this.q('#stam').classList.toggle('low', h.exhausted);

    const count = (team: number) => b.units.filter((u) => u.team === team && !u.dead && !u.routing).length;
    this.q('#foes').textContent = `我軍 ${count(0)} ／ 敵軍 ${count(1)}　擊殺 ${b.stats.kills}`;
    this.q('#timer').textContent = `${Math.floor(b.stats.time)} 秒`;
    this.q('#fps').textContent = `${b.fps} FPS`;

    if (this.frame % MINIMAP_EVERY === 0) {
      this.drawMinimap(b);
      this.q('#orders').innerHTML = this.ordersHtml(b);
    }

    const kmh = p.horse ? Math.round(Math.abs(p.horse.speed) * 3.6) : 0;
    this.q('#speed').innerHTML = `${kmh}<small> km/h</small>`;
    const w = p.weapon;
    this.q('#weapon').textContent = w.ranged ? `${w.name}　箭 ${p.ammo[w.id]}` : w.name;
    const canCouch = w.couchable && p.horse && p.horse.speed >= COMBAT.couch.minSpeed;
    this.q('#hint').textContent = p.dead ? '你已倒下' : p.couched ? '騎槍已放平！瞄準馬頭前方'
      : canCouch ? '撳 E 放平騎槍' : p.horse ? '' : '撳 F 上馬';

    const inc = p.dead ? null : this.incoming(b, p);
    const melee = !w.ranged;
    for (const d of DIRS) {
      const el = this.dirEls[d];
      const attacking = melee && (p.phase === 'charge' || p.phase === 'swing') && p.dir === d;
      el.classList.toggle('att', attacking);
      el.classList.toggle('blk', p.phase === 'block' && p.blockDir === d);
      el.classList.toggle('inc', inc === d);
    }
    const charge = this.q('.charge');
    charge.classList.toggle('on', p.phase === 'charge');
    (charge.firstElementChild as HTMLElement).style.transform = `scaleX(${p.charge})`;

    const spread = this.q('.spread');
    spread.classList.toggle('on', !melee);
    if (!melee) {
      const px = (Math.tan(rad(Projectiles.spreadDeg(p))) / Math.tan(rad(b.camera.fov / 2))) * (window.innerHeight / 2);
      spread.style.width = spread.style.height = `${Math.max(8, px * 2)}px`;
    }

    const showTable = b.input.down('Tab');
    this.table.hidden = !showTable;
    if (showTable) this.renderTable(b);
  }

  private renderTable(b: Battle) {
    const lines = [0, 1].map((team) => {
      const rows = new Map<string, [number, number]>();
      for (const u of b.units) {
        if (u.team !== team || u.def.id === 'player') continue;
        const r = rows.get(u.def.name) ?? [0, 0];
        r[1]++;
        if (!u.dead && !u.routing) r[0]++;
        rows.set(u.def.name, r);
      }
      return `<div class="col"><h3>${TEAM_NAMES[team]}</h3>${[...rows].map(([n, [a, t]]) => `<div><span>${n}</span><b>${a} ／ ${t}</b></div>`).join('')}</div>`;
    });
    this.table.innerHTML = lines.join('');
  }
}
