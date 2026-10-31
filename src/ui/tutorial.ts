import { COMBAT } from '../data/combat';
import type { Battle } from '../battle/battle';

interface Step {
  text: string;
  done: (b: Battle) => boolean;
}

/** 教學關：逐步教基本操作，做到先去下一步 */
export function tutorialSteps(): Step[] {
  let heading: number | null = null;
  return [
    { text: '撳住 W 再加 Shift，等戰馬跑起身', done: (b) => (b.player.horse?.speed ?? 0) > 7 },
    {
      text: '撳 A 或 D 轉彎，馬要行緊先轉得',
      done: (b) => {
        const h = b.player.horse;
        if (!h) return true;
        heading ??= h.heading;
        return Math.abs(h.heading - heading) > 0.5;
      },
    },
    { text: '移動滑鼠揀方向，撳住左鍵蓄力，放手出招', done: (b) => b.player.phase === 'swing' },
    { text: '撳住右鍵格擋，移滑鼠改方向；紅色箭嘴就係敵人攻擊方向', done: (b) => b.player.phase === 'block' },
    { text: '碌滑鼠滾輪切換去騎槍', done: (b) => b.player.weapon.couchable },
    {
      text: `全速跑到 ${Math.round(COMBAT.couch.minSpeed * 3.6)} km/h 以上撳 E 放平騎槍`,
      done: (b) => b.player.couched,
    },
    { text: '對準敵人衝過去！全部打低就完成教學', done: () => false },
  ];
}

export class Tutorial {
  private steps = tutorialSteps();
  private i = 0;
  private el: HTMLElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'tutorial';
    document.getElementById('ui')!.appendChild(this.el);
    this.show();
  }

  private show() {
    this.el.textContent = `教學 ${this.i + 1}／${this.steps.length}：${this.steps[this.i].text}`;
  }

  tick(b: Battle) {
    // 教學未完，敵人唔會打你
    if (this.i < this.steps.length - 1) {
      for (const u of b.units) if (u.ai) u.ai.cooldown = 3;
    }
    if (this.steps[this.i].done(b)) {
      this.i++;
      b.sfx.ui();
      this.show();
    }
  }

  close() {
    this.el.remove();
  }
}
