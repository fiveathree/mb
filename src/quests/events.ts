import { EVENTS, EVENT_RULES, type StoryEvent } from '../data/quests';
import { currentScenario, isMagic } from '../data/scenarios';
import { addSoldier, spend } from '../core/roster';
import { gainHeroXp } from '../core/hero';
import type { World } from '../worldmap/world';

/** 每日抽一次突發事件 */
export function rollEvent(world: World, day: number): StoryEvent | null {
  if (day < EVENT_RULES.firstDay || Math.random() > EVENT_RULES.chance) return null;
  const men = world.roster.soldiers.length;
  const list = EVENTS.filter((e) => men >= (e.needMen ?? 0) && (!e.magic || isMagic()) && (!e.scenario || e.scenario === currentScenario().id));
  return list[Math.floor(Math.random() * list.length)] ?? null;
}

const pickOne = <T>(list: T[]): T | undefined => list[Math.floor(Math.random() * list.length)];

/** 套用選擇，回傳結果文字 */
export function applyChoice(world: World, effect: string): string {
  const w = world.save;
  const r = world.roster;
  const morale = (n: number) => { w.morale = Math.max(0, Math.min(100, w.morale + n)); };
  switch (effect) {
    case 'cure':
      if (spend(r, 200)) return '藥到病除，全軍安心。';
      for (const s of r.soldiers.slice(0, 3)) s.hurtDays = 4;
      return '金幣唔夠，幾個士兵病倒。';
    case 'plague':
      for (const s of r.soldiers.slice(0, 5)) s.hurtDays = 5;
      morale(-6);
      return '五個士兵病倒，軍心不穩。';
    case 'food':
      w.food += 30;
      return '得到 30 糧。';
    case 'renown':
      w.pol.renown += 3;
      return '你嘅名聲傳開，聲望 +3。';
    case 'punish':
      morale(-4);
      w.pol.renown += 1;
      return '軍紀嚴明，但人心惶惶。';
    case 'mercy': {
      const s = pickOne(r.soldiers.filter((x) => x.level <= 2));
      if (s) r.soldiers = r.soldiers.filter((x) => x !== s);
      morale(4);
      world.politics.deed('mercy');
      return '走咗一個兵，其他人感激你。';
    }
    case 'settle':
      if (spend(r, 100)) {
        morale(5);
        return '大家都服你。';
      }
      morale(-3);
      return '你拎唔出錢，兩邊都唔滿意。';
    case 'scold':
      morale(-2);
      return '事件平息，但有人仲記恨。';
    case 'ticket':
      if (spend(r, 800)) {
        r.tickets.human++;
        return '得到一張通用招募令。';
      }
      return '金幣唔夠，行商一笑離開。';
    case 'prophecy':
      gainHeroXp(r.hero, 300);
      w.pol.renown += 5;
      return '命運嘅重量落喺你肩上，主角經驗 +300、聲望 +5。';
    case 'gold':
      r.gold += 400;
      return '得到 400 金。';
    case 'monsterfriend':
      world.politics.addRelation('monsters', 20);
      return '魔物聯邦好感 +20。';
    case 'recruit':
      addSoldier(r, currentScenario().levy);
      world.politics.deed('charity');
      return '少年成為你嘅新兵。';
    default:
      return '你繼續上路。';
  }
}
