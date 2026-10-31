import { CULTURE_NAME } from '../data/formations';
import { bonusText, type FormationCheck } from '../core/formation';
import type { Hud } from './hud';

/** 開戰前佈陣 */
export function showFormationPick(hud: Hud, list: FormationCheck[], onPick: (order: FormationCheck[]) => void) {
  const usable = list.filter((f) => f.efficiency > 0);
  const row = (f: FormationCheck) => {
    const locked = f.efficiency <= 0;
    const state = locked ? `佈唔到：${f.note}` : `效果 ${Math.round(f.efficiency * 100)}%${f.note ? `（${f.note}）` : ''}`;
    return `<button class="fm ${locked ? 'off' : ''}" data-id="${f.def.id}" ${locked ? 'disabled' : ''}>
      <b>${f.def.name}<small>${f.def.id === 'plain' ? '通用' : CULTURE_NAME[f.def.culture]}</small></b>
      <small>${f.def.desc}・${bonusText(f.def.bonus, Math.max(f.efficiency, 1))}</small>
      <em>${state}</em>
    </button>`;
  };
  hud.showScreen(`
    <div class="card camp">
      <h2>佈陣</h2>
      <p class="sub">智力同戰術唔夠會打折，兵種唔夠就佈唔到，有英雄帶領有加成。戰鬥中撳 G 可以變陣。</p>
      <div class="fms">${list.map(row).join('')}</div>
    </div>`);
  document.querySelectorAll<HTMLElement>('#screen .fm:not(.off)').forEach((el) => {
    el.onclick = () => {
      const chosen = usable.find((f) => f.def.id === el.dataset.id)!;
      onPick([chosen, ...usable.filter((f) => f !== chosen)]);
    };
  });
}
