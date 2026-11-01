import { MUSOU_RULES } from '../data/crowns';
import { SKILL_KEY_NAMES, SKILL_RULES, skillsOf } from '../data/skills';
import { Vector3 } from 'three';
import { COMBAT, type AttackDir } from '../data/combat';
import { BATTLEFIELD } from '../data/battlefield';
import { rankTag, type BattleProgress } from '../core/roster';
import { saveSettings, settings } from '../core/settings';
import { ROLE_LABEL, TEAM_NAMES } from '../data/units';
import { mirrorDir } from '../battle/combat';
import { flatDist, rad, type Combatant } from '../battle/entities';
import { ORDER_LABEL } from '../battle/orders';
import { Projectiles } from '../battle/projectiles';
import type { Battle, BattleResult, ReportRow } from '../battle/battle';

const DIRS: AttackDir[] = ['up', 'down', 'left', 'right'];
const TAG_POS = new Vector3();
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
  ['空白鍵', '跳；飛行坐騎按住爬升'],
  ['V', '戰吼（獸人、牛頭人、狼人）'],
  ['R', '冠位戰技（氣滿）'],
  ['T Z X B N H', '冠位絕技（冷卻）'],
  ['1 2 3 4 0', '選步弓騎法／全軍'],
  ['F1 F2 F3', '跟隨／守住／衝鋒'],
  ['F4 F5 F6', '散開／密集／停射'],
  ['G', '變陣'],
  ['Tab', '戰況表'],
  ['C', '叫出滑鼠游標，撳畫面返回'],
  ['Esc', '暫停／撤退'],
];

const MUSOU_CUT_MS = 1300;

export class Hud {
  private root: HTMLElement;
  private screen: HTMLElement;
  private hudEl: HTMLElement;
  private toasts: HTMLElement;
  private dirEls = {} as Record<AttackDir, HTMLElement>;
  private table: HTMLElement;
  private mapCtx: CanvasRenderingContext2D;
  private frame = 0;
  private lastOrders = '';
  private q = <T extends HTMLElement>(sel: string) => this.root.querySelector(sel) as T;

  constructor(root: HTMLElement) {
    this.root = root;
    root.innerHTML = `
      <div id="hud" hidden>
        <div class="top"><span id="foes"></span><span id="timer"></span></div>
        <div class="fps" id="fps"></div>
        <div id="nametags"></div>
        <canvas id="minimap" width="${MINIMAP_SIZE}" height="${MINIMAP_SIZE}"></canvas>
        <div class="panel orders" id="orders"></div>
        <div id="toasts"></div>
        <div id="reticle">
          <i class="dot"></i>
          <svg class="ptr" viewBox="0 0 16 22" aria-hidden="true"><path d="M1 1 L1 18 L5.5 14 L8.5 21 L11.5 20 L8.5 13 L14.5 13 Z" /></svg>
          <i class="spread"></i>
          ${DIRS.map((d) => `<i class="dir ${d}" data-dir="${d}"></i>`).join('')}
          <div class="charge"><i></i></div>
        </div>
        <div id="bossbar" hidden><b id="bossname"></b><span><i id="bossfill"></i></span></div>
        <div class="panel left">
          ${bar('hp', '生命')}${bar('mp', '法力')}${bar('horse', '戰馬')}${bar('stam', '馬力')}${bar('shield', '盾牌')}${bar('musou', '戰技')}
        </div>
        <div class="panel right">
          <div id="speed"></div>
          <div id="weapon"></div>
          <div id="hint"></div>
        </div>
        <div id="skills" hidden></div>
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

  showScreen(html: string) {
    this.screen.innerHTML = html;
    this.screen.classList.add('open');
  }

  /** 游標模式就收起畫面中間嘅箭嘴 */
  setFreeCursor(on: boolean) {
    this.hudEl.classList.toggle('free-cursor', on);
  }

  hideHud() {
    this.hudEl.hidden = true;
  }

  closeScreen() {
    this.screen.classList.remove('open');
    this.screen.innerHTML = '';
  }

  hideScreen() {
    this.screen.classList.remove('open');
    this.screen.innerHTML = '';
    this.hudEl.hidden = false;
  }

  controlsHtml(): string {
    return `<div class="controls">${CONTROLS.map(([k, v]) => `<div><kbd>${k}</kbd><span>${v}</span></div>`).join('')}</div>`;
  }

  /** 設定：改完即時生效 */
  showSettings(onChange: () => void, onBack: () => void) {
    const q = ['低', '中', '高'];
    this.showScreen(`
      <div class="card">
        <h2>設定</h2>
        <label class="set">滑鼠靈敏度 <b id="senV"></b><input type="range" id="sen" min="0.3" max="2.5" step="0.05" value="${settings.sensitivity}" /></label>
        <label class="set">音量 <b id="volV"></b><input type="range" id="vol" min="0" max="1" step="0.05" value="${settings.volume}" /></label>
        <div class="set">畫質 <span class="row">${q.map((t, i) => `<button class="wp ${i === settings.quality ? 'on' : ''}" data-q="${i}">${t}</button>`).join('')}</span></div>
        <label class="set">上下反轉 <input type="checkbox" id="inv" ${settings.invertY ? 'checked' : ''} /></label>
        <p class="sub">幀數唔夠就揀中或者低。靈敏度 1 係預設。</p>
        <div class="row"><button class="go" id="setBack">返回</button></div>
      </div>`);
    const sen = this.q('#sen') as HTMLInputElement;
    const vol = this.q('#vol') as HTMLInputElement;
    const label = () => {
      this.q('#senV').textContent = settings.sensitivity.toFixed(2);
      this.q('#volV').textContent = `${Math.round(settings.volume * 100)}%`;
    };
    const changed = () => {
      saveSettings();
      label();
      onChange();
    };
    label();
    sen.oninput = () => {
      settings.sensitivity = Number(sen.value);
      changed();
    };
    vol.oninput = () => {
      settings.volume = Number(vol.value);
      changed();
    };
    (this.q('#inv') as HTMLInputElement).onchange = (e) => {
      settings.invertY = (e.target as HTMLInputElement).checked;
      changed();
    };
    this.screen.querySelectorAll<HTMLElement>('[data-q]').forEach((el) => {
      el.onclick = () => {
        settings.quality = Number(el.dataset.q);
        this.screen.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === el));
        changed();
      };
    });
    this.q('#setBack').onclick = onBack;
  }

  showPause(onResume: () => void, onRetreat: () => void, message = '', onSettings?: () => void) {
    this.showScreen(`
      <div class="card">
        <h2>暫停</h2>
        ${message ? `<p class="sub">${message}</p>` : ''}
        ${this.controlsHtml()}
        <div class="row">
          <button class="go" id="resume">繼續</button>
          <button class="alt" id="pauseSet">設定</button>
          <button class="alt" id="retreat">撤退</button>
        </div>
      </div>`);
    this.q('#pauseSet').onclick = () => onSettings?.();
    this.q('#resume').onclick = onResume;
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

  private progressHtml(p: BattleProgress, extra: string): string {
    const ups = p.levelUps.slice(0, 8).map((l) => `${l.name} Lv${l.level}`).join('、');
    const more = p.levelUps.length > 8 ? ` 等 ${p.levelUps.length} 項` : '';
    return `<div class="progress">
      ${ups ? `<div><b>升級</b>${ups}${more}</div>` : ''}
      ${p.lost.length ? `<div><b>永久陣亡</b>${p.lost.length} 人</div>` : ''}
      ${p.hurt ? `<div><b>傷兵休養</b>${p.hurt} 人</div>` : ''}
      ${extra ? `<div><b>獎勵</b>${extra}</div>` : ''}
    </div>`;
  }

  showResult(r: BattleResult, p: BattleProgress, extra: string, onContinue: () => void, nextLabel = '返回大地圖') {
    const s = r.stats;
    this.hudEl.hidden = true;
    const title = r.win ? '大獲全勝' : r.retreated ? '撤退' : '戰敗';
    this.showScreen(`
      <div class="card wide">
        <h2 class="${r.win ? 'win' : 'lose'}">${title}</h2>
        ${r.playerDown ? `<p class="sub">${r.aftermath || '你喺戰鬥中倒下。'}</p>` : ''}
        <div class="reports">${this.reportColumn(0, r.rows[0])}${this.reportColumn(1, r.rows[1])}</div>
        <div class="stats">
          <div><small>戰利品</small><b>${p.gold} 金</b></div>
          <div><small>經驗</small><b>${r.exp}</b></div>
          <div><small>聲望</small><b>+${r.renown}</b></div>
          <div><small>俘虜</small><b>${r.captives}</b></div>
          <div><small>親手擊殺</small><b>${s.kills}</b></div>
          <div><small>最高單擊</small><b>${s.bestHit}</b></div>
          <div><small>最高時速</small><b>${Math.round(s.topSpeed * 3.6)} km/h</b></div>
          <div><small>用時</small><b>${Math.round(s.time)} 秒</b></div>
        </div>
        ${this.progressHtml(p, extra)}
        <div class="row"><button class="go" id="next">${nextLabel}</button></div>
      </div>`);
    this.q('#next').onclick = onContinue;
  }

  /** 出絕招嘅大字 */
  /** 底部技能列：換角色先重砌，之後只更新冷卻 */
  private drawSkills(p: Combatant) {
    const box = this.q('#skills');
    const list = skillsOf(p.def.crown);
    box.hidden = !list.length;
    if (box.dataset.owner !== p.def.crown) {
      box.dataset.owner = p.def.crown ?? '';
      box.innerHTML = list.map((s, i) => `<div class="skill" title="${SKILL_RULES[s.kind].desc}"><i></i><kbd>${SKILL_KEY_NAMES[i]}</kbd><span>${s.name}</span></div>`).join('');
    }
    list.forEach((s, i) => {
      const cd = box.children[i]?.firstElementChild as HTMLElement | undefined;
      if (cd) cd.style.height = `${(p.skillCd[i] / SKILL_RULES[s.kind].cd) * 100}%`;
    });
  }

  musouCut(name: string, color: number) {
    const el = document.createElement('div');
    el.className = 'musou-cut';
    el.textContent = name;
    el.style.setProperty('--c', `#${color.toString(16).padStart(6, '0')}`);
    document.body.append(el);
    window.setTimeout(() => el.remove(), MUSOU_CUT_MS);
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
    // 數字冇變就唔寫 DOM，慳排版時間
    const text = String(Math.max(0, Math.ceil(value)));
    const label = el.querySelector('b') as HTMLElement;
    if (label.textContent === text) return;
    label.textContent = text;
    (el.querySelector('i') as HTMLElement).style.transform = `scaleX(${Math.max(0, value / max)})`;
  }

  /** 文字冇變就唔寫 DOM */
  private setText(sel: string, text: string) {
    const el = this.q(sel);
    if (el.textContent !== text) el.textContent = text;
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
    const form = b.formations[0];
    const foeForm = b.enemyFormation ? `<div class="mor">敵陣 ${b.enemyFormation.def.name}</div>` : '';
    const formLine = (form ? `<div class="mor">陣法 ${form.def.name} ${Math.round(form.efficiency * b.cohesion[0] * 100)}%${b.formations.length > 1 ? '　G 變陣' : ''}</div>` : '') + foeForm;
    return `${rows}${formLine}<div class="mor">士氣 ${Math.round(b.moraleOf(0) * 100)}%　敵 ${Math.round(b.moraleOf(1) * 100)}%</div>`;
  }

  /** 英雄名牌跟住頭頂 */
  private drawNametags(b: Battle) {
    const box = this.q('#nametags');
    const heroes = b.units.filter((u) => u.def.hero && !u.dead && !u.def.colossal);
    while (box.children.length < heroes.length) box.appendChild(document.createElement('span'));
    [...box.children].forEach((node, i) => {
      const el = node as HTMLElement;
      const u = heroes[i];
      if (!u) {
        el.hidden = true;
        return;
      }
      TAG_POS.set(u.pos.x, u.pos.y + (u.horse ? 4.1 : 2.9), u.pos.z).project(b.camera);
      el.hidden = TAG_POS.z > 1;
      el.textContent = `${rankTag(u.def)} ${u.def.name}`;
      el.className = u.team === 0 ? 'ally' : 'foe';
      el.style.transform = `translate(calc(${(TAG_POS.x * 0.5 + 0.5) * window.innerWidth}px - 50%), ${(0.5 - TAG_POS.y * 0.5) * window.innerHeight}px)`;
    });
  }

  update(b: Battle) {
    this.frame++;
    this.drawNametags(b);
    const p = b.player;
    const h = p.horse ?? b.lastHorse;
    this.setBar('hp', p.hp, p.def.hp);
    this.setBar('mp', p.mp, p.def.mp ?? 1, !!p.def.mp);
    this.setBar('horse', h.hp, h.def.hp, !h.dead);
    this.setBar('stam', h.stamina, h.def.stamina, !h.dead);
    this.setBar('shield', p.shieldHp, p.shieldMax, p.weapon.hasShield);
    this.q('#stam').classList.toggle('low', h.exhausted);
    this.setBar('musou', p.musou, MUSOU_RULES.max, !!p.def.crown);
    this.drawSkills(p);
    const giant = b.units.find((u) => u.def.colossal && !u.dead);
    const gbar = this.q('#bossbar');
    gbar.hidden = !giant;
    if (giant) {
      this.setText('#bossname', giant.def.name);
      this.q('#bossfill').style.transform = `scaleX(${Math.max(0, giant.hp / giant.def.hp)})`;
    }
    this.q('#musou').classList.toggle('ready', p.musou >= MUSOU_RULES.max);

    if (this.frame % MINIMAP_EVERY === 0) {
      const count = (team: number) => b.units.filter((u) => u.team === team && !u.dead && !u.routing).length;
      this.setText('#foes', `我軍 ${count(0)} ／ 敵軍 ${count(1)}　擊殺 ${b.stats.kills}`);
      this.setText('#timer', `${Math.floor(b.stats.time)} 秒`);
      this.setText('#fps', `${b.fps} FPS`);
      this.drawMinimap(b);
      const orders = this.ordersHtml(b);
      if (orders !== this.lastOrders) {
        this.lastOrders = orders;
        this.q('#orders').innerHTML = orders;
      }
    }

    const kmh = p.horse ? Math.round(Math.abs(p.horse.speed) * 3.6) : 0;
    this.q('#speed').innerHTML = `${kmh}<small> km/h</small>`;
    const w = p.weapon;
    this.q('#weapon').textContent = w.spell ? `${w.name}　法力 ${w.spell.mp}` : w.ranged ? `${w.name}　箭 ${p.ammo[w.id]}` : w.name;
    const canCouch = w.couchable && p.horse && p.horse.speed >= COMBAT.couch.minSpeed;
    this.q('#hint').textContent = b.townHint ? b.townHint : p.dead ? '你已倒下' : p.couched ? '騎槍已放平！瞄準馬頭前方'
      : canCouch ? '撳 E 放平騎槍' : p.horse || b.lastHorse.dead ? '' : '撳 F 上馬';

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
        const label = `${rankTag(u.def)} ${u.def.name}`;
        const r = rows.get(label) ?? [0, 0];
        r[1]++;
        if (!u.dead && !u.routing) r[0]++;
        rows.set(label, r);
      }
      return `<div class="col"><h3>${TEAM_NAMES[team]}</h3>${[...rows].map(([n, [a, t]]) => `<div><span>${n}</span><b>${a} ／ ${t}</b></div>`).join('')}</div>`;
    });
    this.table.innerHTML = lines.join('');
  }
}
