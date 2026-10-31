import { FORMATIONS, FORMATION_RULES as R, type Culture, type FormationBonus, type FormationDef } from '../data/formations';
import { UNITS } from '../data/units';
import { WEAPONS } from '../data/weapons';
import { skillOf, type Hero } from './hero';
import { roleCounts, type Soldier } from './roster';

export interface FormationCheck {
  def: FormationDef;
  /** 效果比例，0 代表佈唔到 */
  efficiency: number;
  /** 點解打折或者佈唔到 */
  note: string;
}

export function checkFormation(def: FormationDef, hero: Hero, soldiers: Soldier[]): FormationCheck {
  const counts = roleCounts(soldiers);
  const missing: string[] = [];
  for (const [role, need] of Object.entries(def.needRole ?? {})) {
    if (counts[role as keyof typeof counts] < need) missing.push(`要 ${need} 個${{ infantry: '步兵', archer: '弓兵', cavalry: '騎兵', mage: '法師' }[role]}`);
  }
  if (def.needSpears) {
    const n = soldiers.filter((s) => WEAPONS[UNITS[s.unit].weapons[0]].model === 'spear').length;
    if (n < def.needSpears) missing.push(`要 ${def.needSpears} 個長矛兵`);
  }
  if (missing.length) return { def, efficiency: 0, note: missing.join('、') };

  const tactics = skillOf(hero, soldiers, 'tactics');
  const ratios = [
    def.needInt ? Math.min(1, hero.attrs.int / def.needInt) : 1,
    def.needTactics ? Math.min(1, (1 + tactics) / (1 + def.needTactics)) : 1,
  ];
  // 智力同戰術各佔一半，唔夠只係打折，差太遠先佈唔到
  let eff = (ratios[0] + ratios[1]) / 2;
  const lacks = [
    ratios[0] < 1 ? `智力 ${hero.attrs.int}／${def.needInt}` : '',
    ratios[1] < 1 ? `戰術 ${tactics}／${def.needTactics}` : '',
  ].filter(Boolean);
  const hero_ = soldiers.some((s) => UNITS[s.unit].hero);
  if (hero_) eff += R.heroBonus;
  eff = Math.min(R.maxEfficiency, eff);
  if (eff < R.minEfficiency) return { def, efficiency: 0, note: lacks.join('、') };
  const parts = [lacks.length ? `不足：${lacks.join('、')}` : '', hero_ ? '英雄帶領' : ''].filter(Boolean);
  return { def, efficiency: eff, note: parts.join('，') };
}

export function formationsFor(cultures: Culture[], hero: Hero, soldiers: Soldier[]): FormationCheck[] {
  return FORMATIONS.filter((f) => f.id === 'plain' || cultures.includes(f.culture)).map((f) => checkFormation(f, hero, soldiers));
}

export function bonusText(b: FormationBonus, eff: number): string {
  const pct = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * eff * 100)}%`;
  const out: string[] = [];
  if (b.damage) out.push(`傷害 ${pct(b.damage)}`);
  if (b.armor) out.push(`護甲 ${b.armor > 0 ? '+' : ''}${(b.armor * eff).toFixed(1)}`);
  if (b.arrow) out.push(`箭傷 −${Math.round(b.arrow * eff * 100)}%`);
  if (b.antiCavalry) out.push(`剋騎 ${pct(b.antiCavalry)}`);
  if (b.spell) out.push(`法術 ${pct(b.spell)}`);
  return out.join('・') || '無加成';
}
